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
import { ParcelaPaymentSystem } from '@/utils/parcelaPaymentSystem';

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
    tipo: 'dinheiro' as Pagamento['tipo'], // Padrão como dinheiro
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

    return true;
  };

  // Função para lidar com entrada do teclado numérico
  const handleNumericInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isNumeric = /^[0-9]$/.test(e.key);
    const isDecimal = e.key === '.' || e.key === ',';
    const isBackspace = e.key === 'Backspace';
    const isDelete = e.key === 'Delete';
    const isArrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
    const isTab = e.key === 'Tab';

    if (!(isNumeric || isDecimal || isBackspace || isDelete || isArrow || isTab)) {
      e.preventDefault();
    }

    // Converter vírgula em ponto
    if (e.key === ',') {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const value = target.value;
      const newValue = value.slice(0, start) + '.' + value.slice(end);
      setFormData(prev => ({ ...prev, valor: newValue }));
    }
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
      const dadosPagamento = {
        tipo: formData.tipo,
        dataHora: formData.dataHora,
        observacoes: formData.observacoes
      };

      const { promissoriasAtualizadas } = ParcelaPaymentSystem.distribuirPagamentoAutomatico(
        valor,
        promissorias,
        dadosPagamento
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
    const promissoria = promissorias.find(p => p.id === promissoriaId);
    if (!promissoria) {
      throw new Error('Promissória não encontrada');
    }

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
          await executarPagamentoPromissoria(valorFinal, promissoria);
        }
      });
      return;
    }

    await executarPagamentoPromissoria(valor, promissoria);
  };

  const executarPagamentoPromissoria = async (valor: number, promissoria: Promissoria): Promise<void> => {
    setLoading(true);
    
    try {
      const dadosPagamento = {
        tipo: formData.tipo,
        dataHora: formData.dataHora,
        observacoes: formData.observacoes
      };

      const { promissoriaAtualizada } = ParcelaPaymentSystem.pagarPromissoria(
        promissoria,
        valor,
        dadosPagamento
      );

      const novasPromissorias = promissorias.map(p => 
        p.id === promissoria.id ? promissoriaAtualizada : p
      );

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
    const promissoria = promissorias.find(p => p.id === promissoriaId);
    if (!promissoria) {
      throw new Error('Promissória não encontrada');
    }

    if (!promissoria.parcelas) {
      throw new Error('Promissória não é parcelada');
    }

    const parcela = promissoria.parcelas.find(p => p.id === parcelaId);
    if (!parcela) {
      throw new Error('Parcela não encontrada');
    }

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
          await executarPagamentoParcela(valorFinal, promissoria, parcela);
        }
      });
      return;
    }

    await executarPagamentoParcela(valor, promissoria, parcela);
  };

  const executarPagamentoParcela = async (valor: number, promissoria: Promissoria, parcela: any): Promise<void> => {
    setLoading(true);
    
    try {
      const dadosPagamento = {
        tipo: formData.tipo,
        dataHora: formData.dataHora,
        observacoes: formData.observacoes,
        promissoriaId: promissoria.id
      };

      const { parcelaAtualizada } = ParcelaPaymentSystem.pagarParcela(
        parcela,
        valor,
        dadosPagamento
      );

      // Atualizar a promissória com a parcela paga
      const parcelasAtualizadas = promissoria.parcelas!.map(p => 
        p.id === parcela.id ? parcelaAtualizada : p
      );

      const promissoriaAtualizada = {
        ...promissoria,
        parcelas: parcelasAtualizadas,
        valorPago: parcelasAtualizadas.reduce((acc, p) => acc + (p.valorPago || 0), 0),
        updated_at: new Date().toISOString()
      };

      const novasPromissorias = promissorias.map(p => 
        p.id === promissoria.id ? promissoriaAtualizada : p
      );

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
                type="text"
                inputMode="decimal"
                value={formData.valor}
                onChange={(e) => setFormData(prev => ({ ...prev, valor: e.target.value }))}
                onKeyDown={handleNumericInput}
                placeholder="0,00"
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
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
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
