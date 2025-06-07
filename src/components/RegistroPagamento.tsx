
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PaymentConfirmDialog } from './PaymentConfirmDialog';
import { TipoPagamento, type Promissoria, type Cliente, type Pagamento } from '@/types';
import { distribuirPagamentoAutomatico, calcularStatusPromissoria, calcularStatusParcela } from '@/utils/paymentUtils';

interface RegistroPagamentoProps {
  cliente: Cliente;
  promissorias: Promissoria[];
  onPagamentoRegistrado: (promissoriasAtualizadas: Promissoria[]) => void;
  onCancel: () => void;
  tipo?: 'geral' | 'promissoria' | 'parcela';
  promissoriaId?: string;
  parcelaId?: string;
  valorSugerido?: number;
}

export function RegistroPagamento({
  cliente,
  promissorias,
  onPagamentoRegistrado,
  onCancel,
  tipo = 'geral',
  promissoriaId,
  parcelaId,
  valorSugerido = 0
}: RegistroPagamentoProps) {
  const [formData, setFormData] = useState({
    valor: valorSugerido.toString(),
    tipo: '' as Pagamento['tipo'],
    dataHora: new Date().toISOString().slice(0, 16),
    observacoes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    valorInformado: number;
    valorDevido: number;
    onConfirm: (action: 'continue' | 'adjust' | 'cancel', novoValor?: number) => void;
  } | null>(null);
  
  const { toast } = useToast();

  const validarFormulario = (): boolean => {
    const valor = parseFloat(formData.valor);
    
    if (valor <= 0) {
      toast({
        title: "Erro de Validação",
        description: "O valor deve ser maior que zero.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.tipo) {
      toast({
        title: "Erro de Validação",
        description: "Selecione o tipo de pagamento.",
        variant: "destructive",
      });
      return false;
    }

    if (tipo === 'geral') {
      const totalDevido = promissorias.reduce((acc, p) => acc + (p.valor - (p.valorPago || 0)), 0);
      
      if (totalDevido <= 0) {
        toast({
          title: "Aviso",
          description: "Este cliente não possui valores pendentes para pagamento.",
          variant: "destructive",
        });
        return false;
      }

      if (valor > totalDevido) {
        toast({
          title: "Valor Excedente",
          description: `O valor informado (R$ ${valor.toFixed(2)}) é maior que o total devido (R$ ${totalDevido.toFixed(2)}).`,
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) return;
    
    const valor = parseFloat(formData.valor);

    try {
      if (tipo === 'geral') {
        await processarPagamentoGeral(valor);
      } else if (tipo === 'promissoria' && promissoriaId) {
        await processarPagamentoPromissoria(valor, promissoriaId);
      } else if (tipo === 'parcela' && parcelaId && promissoriaId) {
        await processarPagamentoParcela(valor, promissoriaId, parcelaId);
      }
    } catch (error: any) {
      if (error.message !== 'Pagamento cancelado pelo usuário') {
        toast({
          title: "Erro",
          description: "Erro ao registrar pagamento: " + error.message,
          variant: "destructive",
        });
      }
    }
  };

  const processarPagamentoGeral = async (valor: number): Promise<void> => {
    setLoading(true);
    
    try {
      const pagamentoBase = {
        valor,
        tipo: formData.tipo,
        dataHora: formData.dataHora,
        observacoes: formData.observacoes
      };

      const { promissoriasAtualizadas } = distribuirPagamentoAutomatico(
        valor,
        promissorias,
        pagamentoBase
      );

      onPagamentoRegistrado(promissoriasAtualizadas);

      toast({
        title: "Sucesso",
        description: "Pagamento distribuído automaticamente com sucesso!",
      });
    } finally {
      setLoading(false);
    }
  };

  const processarPagamentoPromissoria = async (valor: number, promissoriaId: string): Promise<void> => {
    const promissoriaIndex = promissorias.findIndex(p => p.id === promissoriaId);
    if (promissoriaIndex === -1) {
      throw new Error('Promissória não encontrada');
    }

    const promissoria = { ...promissorias[promissoriaIndex] };
    const valorDevido = promissoria.valor - (promissoria.valorPago || 0);

    if (valor > valorDevido) {
      setConfirmDialog({
        open: true,
        title: "Valor Excedente Detectado",
        description: "O valor informado é maior que o valor devido desta promissória.",
        valorInformado: valor,
        valorDevido,
        onConfirm: async (action, novoValor) => {
          setConfirmDialog(null);
          
          if (action === 'cancel') {
            throw new Error('Pagamento cancelado pelo usuário');
          }
          
          const valorFinal = action === 'adjust' ? (novoValor || valorDevido) : Math.min(valor, valorDevido);
          await executarPagamentoPromissoria(valorFinal, promissoriaIndex, promissoria);
        }
      });
      return;
    }

    await executarPagamentoPromissoria(valor, promissoriaIndex, promissoria);
  };

  const executarPagamentoPromissoria = async (valor: number, promissoriaIndex: number, promissoria: Promissoria): Promise<void> => {
    setLoading(true);
    
    try {
      const novoPagamento: Pagamento = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        valor,
        tipo: formData.tipo,
        dataHora: formData.dataHora,
        promissoriaId: promissoria.id,
        observacoes: formData.observacoes,
        descricao: `Pagamento de promissória completa - R$ ${promissoria.valor.toFixed(2)}`,
        created_at: new Date().toISOString()
      };

      // Distribuir o valor entre as parcelas se for parcelada
      if (promissoria.parcelado && promissoria.parcelas) {
        let valorRestante = valor;
        const valorAnteriorPromissoria = promissoria.valorPago || 0;
        
        // Ordenar parcelas por vencimento
        const parcelasOrdenadas = [...promissoria.parcelas].sort((a, b) => 
          new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
        );
        
        parcelasOrdenadas.forEach(parcela => {
          if (valorRestante <= 0) return;
          
          const valorDevidoParcela = parcela.valor - (parcela.valorPago || 0);
          if (valorDevidoParcela <= 0) return;
          
          const valorParaParcela = Math.min(valorRestante, valorDevidoParcela);
          const valorAnteriorParcela = parcela.valorPago || 0;
          
          // Criar pagamento específico da parcela
          const pagamentoParcela: Pagamento = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + '-parcela',
            valor: valorParaParcela,
            tipo: formData.tipo,
            dataHora: formData.dataHora,
            promissoriaId: promissoria.id,
            parcelaId: parcela.id,
            observacoes: formData.observacoes,
            descricao: `Pagamento automático parcela ${parcela.numero}/${promissoria.numeroParcelas} | Anterior: R$ ${valorAnteriorParcela.toFixed(2)} → Atual: R$ ${(valorAnteriorParcela + valorParaParcela).toFixed(2)} | Restante: R$ ${(parcela.valor - valorAnteriorParcela - valorParaParcela).toFixed(2)}`,
            created_at: new Date().toISOString()
          };
          
          // Atualizar parcela
          parcela.valorPago = valorAnteriorParcela + valorParaParcela;
          parcela.pagamentos = [...(parcela.pagamentos || []), pagamentoParcela];
          
          // Verificar se foi pago com atraso
          const hoje = new Date();
          const vencimento = new Date(parcela.dataVencimento);
          if (parcela.valorPago >= parcela.valor) {
            parcela.paga = true;
            parcela.pagoComAtraso = vencimento < hoje;
          }
          parcela.status = calcularStatusParcela(parcela);
          
          valorRestante -= valorParaParcela;
        });
        
        // Atualizar descrição do pagamento principal
        novoPagamento.descricao = `Pagamento de promissória (distribuído entre parcelas) | Anterior: R$ ${valorAnteriorPromissoria.toFixed(2)} → Atual: R$ ${(valorAnteriorPromissoria + valor).toFixed(2)} | Restante: R$ ${(promissoria.valor - valorAnteriorPromissoria - valor).toFixed(2)}`;
      } else {
        const valorAnterior = promissoria.valorPago || 0;
        novoPagamento.descricao = `Pagamento de promissória completa | Anterior: R$ ${valorAnterior.toFixed(2)} → Atual: R$ ${(valorAnterior + valor).toFixed(2)} | Restante: R$ ${(promissoria.valor - valorAnterior - valor).toFixed(2)}`;
      }

      // Atualizar promissória
      promissoria.valorPago = (promissoria.valorPago || 0) + valor;
      promissoria.pagamentos = [...(promissoria.pagamentos || []), novoPagamento];
      promissoria.updated_at = new Date().toISOString();

      // Verificar se foi pago com atraso
      const hoje = new Date();
      const limite = new Date(promissoria.dataLimite);
      if (promissoria.valorPago >= promissoria.valor && limite < hoje) {
        promissoria.status = 'pago_com_atraso';
      } else {
        promissoria.status = calcularStatusPromissoria(promissoria);
      }

      const novasPromissorias = [...promissorias];
      novasPromissorias[promissoriaIndex] = promissoria;

      onPagamentoRegistrado(novasPromissorias);

      toast({
        title: "Sucesso",
        description: "Pagamento de promissória registrado com sucesso!",
      });
    } finally {
      setLoading(false);
    }
  };

  const processarPagamentoParcela = async (valor: number, promissoriaId: string, parcelaId: string): Promise<void> => {
    const promissoriaIndex = promissorias.findIndex(p => p.id === promissoriaId);
    if (promissoriaIndex === -1) {
      throw new Error('Promissória não encontrada');
    }

    const promissoria = { ...promissorias[promissoriaIndex] };
    if (!promissoria.parcelas) {
      throw new Error('Promissória não é parcelada');
    }

    const parcelaIndex = promissoria.parcelas.findIndex(p => p.id === parcelaId);
    if (parcelaIndex === -1) {
      throw new Error('Parcela não encontrada');
    }

    const parcela = { ...promissoria.parcelas[parcelaIndex] };
    const valorDevido = parcela.valor - (parcela.valorPago || 0);

    if (valor > valorDevido) {
      setConfirmDialog({
        open: true,
        title: "Valor Excedente Detectado",
        description: "O valor informado é maior que o valor devido desta parcela.",
        valorInformado: valor,
        valorDevido,
        onConfirm: async (action, novoValor) => {
          setConfirmDialog(null);
          
          if (action === 'cancel') {
            throw new Error('Pagamento cancelado pelo usuário');
          }
          
          const valorFinal = action === 'adjust' ? (novoValor || valorDevido) : Math.min(valor, valorDevido);
          await executarPagamentoParcela(valorFinal, promissoriaIndex, promissoria, parcelaIndex, parcela);
        }
      });
      return;
    }

    await executarPagamentoParcela(valor, promissoriaIndex, promissoria, parcelaIndex, parcela);
  };

  const executarPagamentoParcela = async (valor: number, promissoriaIndex: number, promissoria: Promissoria, parcelaIndex: number, parcela: any): Promise<void> => {
    setLoading(true);
    
    try {
      const valorAnteriorParcela = parcela.valorPago || 0;
      const valorAnteriorPromissoria = promissoria.valorPago || 0;
      
      const novoPagamento: Pagamento = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        valor,
        tipo: formData.tipo,
        dataHora: formData.dataHora,
        promissoriaId: promissoria.id,
        parcelaId: parcela.id,
        observacoes: formData.observacoes,
        descricao: `Pagamento parcela ${parcela.numero}/${promissoria.numeroParcelas} | Anterior: R$ ${valorAnteriorParcela.toFixed(2)} → Atual: R$ ${(valorAnteriorParcela + valor).toFixed(2)} | Restante: R$ ${(parcela.valor - valorAnteriorParcela - valor).toFixed(2)}`,
        created_at: new Date().toISOString()
      };

      // Atualizar parcela
      parcela.valorPago = valorAnteriorParcela + valor;
      parcela.pagamentos = [...(parcela.pagamentos || []), novoPagamento];

      // Verificar se foi pago com atraso
      const hoje = new Date();
      const vencimento = new Date(parcela.dataVencimento);
      if (parcela.valorPago >= parcela.valor) {
        parcela.paga = true;
        parcela.pagoComAtraso = vencimento < hoje;
      }
      parcela.status = calcularStatusParcela(parcela);

      // Atualizar promissória
      promissoria.parcelas[parcelaIndex] = parcela;
      promissoria.valorPago = promissoria.parcelas.reduce((acc, p) => acc + (p.valorPago || 0), 0);
      promissoria.pagamentos = [...(promissoria.pagamentos || []), novoPagamento];
      promissoria.updated_at = new Date().toISOString();
      promissoria.status = calcularStatusPromissoria(promissoria);

      const novasPromissorias = [...promissorias];
      novasPromissorias[promissoriaIndex] = promissoria;

      onPagamentoRegistrado(novasPromissorias);

      toast({
        title: "Sucesso",
        description: "Pagamento de parcela registrado com sucesso!",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitulo = () => {
    switch (tipo) {
      case 'geral':
        return 'Registrar Pagamento Geral';
      case 'promissoria':
        return 'Pagar Promissória';
      case 'parcela':
        return 'Pagar Parcela';
      default:
        return 'Registrar Pagamento';
    }
  };

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{getTitulo()}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.valor}
                onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Pagamento *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value: Pagamento['tipo']) => 
                  setFormData(prev => ({ ...prev, tipo: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TipoPagamento.PIX}>PIX</SelectItem>
                  <SelectItem value={TipoPagamento.CARTAO}>Cartão</SelectItem>
                  <SelectItem value={TipoPagamento.DINHEIRO}>Dinheiro</SelectItem>
                  <SelectItem value={TipoPagamento.CHEQUE}>Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataHora">Data e Hora *</Label>
              <Input
                id="dataHora"
                type="datetime-local"
                value={formData.dataHora}
                onChange={(e) => setFormData(prev => ({ ...prev, dataHora: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Registrando...' : 'Registrar Pagamento'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {confirmDialog && (
        <PaymentConfirmDialog
          isOpen={confirmDialog.open}
          onClose={() => setConfirmDialog(null)}
          title={confirmDialog.title}
          description={confirmDialog.description}
          valorInformado={confirmDialog.valorInformado}
          valorDevido={confirmDialog.valorDevido}
          onConfirm={confirmDialog.onConfirm}
        />
      )}
    </>
  );
}
