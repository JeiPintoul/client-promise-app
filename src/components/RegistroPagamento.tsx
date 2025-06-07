
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
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

/**
 * Componente para registrar pagamentos de forma manual
 * Suporta pagamento geral (distribuição automática), por promissória ou por parcela
 */
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
    dataHora: new Date().toISOString().slice(0, 16), // formato datetime-local
    observacoes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const valor = parseFloat(formData.valor);
      
      if (valor <= 0) {
        toast({
          title: "Erro de Validação",
          description: "O valor deve ser maior que zero.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.tipo) {
        toast({
          title: "Erro de Validação",
          description: "Selecione o tipo de pagamento.",
          variant: "destructive",
        });
        return;
      }

      // Processar pagamento baseado no tipo
      let promissoriasAtualizadas: Promissoria[] = [];

      if (tipo === 'geral') {
        // Distribuição automática entre todas as promissórias
        promissoriasAtualizadas = await processarPagamentoGeral(valor);
      } else if (tipo === 'promissoria' && promissoriaId) {
        // Pagamento específico de uma promissória
        promissoriasAtualizadas = await processarPagamentoPromissoria(valor, promissoriaId);
      } else if (tipo === 'parcela' && parcelaId && promissoriaId) {
        // Pagamento específico de uma parcela
        promissoriasAtualizadas = await processarPagamentoParcela(valor, promissoriaId, parcelaId);
      }

      onPagamentoRegistrado(promissoriasAtualizadas);

      toast({
        title: "Sucesso",
        description: "Pagamento registrado com sucesso!",
      });

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao registrar pagamento: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processarPagamentoGeral = async (valor: number): Promise<Promissoria[]> => {
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

    return promissoriasAtualizadas;
  };

  const processarPagamentoPromissoria = async (valor: number, promissoriaId: string): Promise<Promissoria[]> => {
    const promissoriaIndex = promissorias.findIndex(p => p.id === promissoriaId);
    if (promissoriaIndex === -1) {
      throw new Error('Promissória não encontrada');
    }

    const promissoria = { ...promissorias[promissoriaIndex] };
    const valorDevido = promissoria.valor - (promissoria.valorPago || 0);

    if (valor > valorDevido) {
      const confirmar = window.confirm(
        `O valor informado (R$ ${valor.toFixed(2)}) é maior que o valor devido (R$ ${valorDevido.toFixed(2)}). Deseja continuar?`
      );
      if (!confirmar) {
        throw new Error('Pagamento cancelado pelo usuário');
      }
    }

    // Criar pagamento
    const novoPagamento: Pagamento = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      valor: Math.min(valor, valorDevido),
      tipo: formData.tipo,
      dataHora: formData.dataHora,
      promissoriaId: promissoria.id,
      observacoes: formData.observacoes,
      created_at: new Date().toISOString()
    };

    // Atualizar promissória
    promissoria.valorPago = (promissoria.valorPago || 0) + novoPagamento.valor;
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

    return novasPromissorias;
  };

  const processarPagamentoParcela = async (valor: number, promissoriaId: string, parcelaId: string): Promise<Promissoria[]> => {
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
      const confirmar = window.confirm(
        `O valor informado (R$ ${valor.toFixed(2)}) é maior que o valor devido da parcela (R$ ${valorDevido.toFixed(2)}). Deseja continuar?`
      );
      if (!confirmar) {
        throw new Error('Pagamento cancelado pelo usuário');
      }
    }

    // Criar pagamento
    const novoPagamento: Pagamento = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      valor: Math.min(valor, valorDevido),
      tipo: formData.tipo,
      dataHora: formData.dataHora,
      promissoriaId: promissoria.id,
      parcelaId: parcela.id,
      observacoes: formData.observacoes,
      created_at: new Date().toISOString()
    };

    // Atualizar parcela
    parcela.valorPago = (parcela.valorPago || 0) + novoPagamento.valor;
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

    return novasPromissorias;
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
  );
}
