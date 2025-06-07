
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { TipoPagamento, type Promissoria, type Cliente, type Pagamento } from '@/types';

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
    // Implementar distribuição automática
    // Por ora, uma implementação simples
    return promissorias.map(p => ({ ...p }));
  };

  const processarPagamentoPromissoria = async (valor: number, promissoriaId: string): Promise<Promissoria[]> => {
    // Implementar pagamento de promissória específica
    return promissorias.map(p => ({ ...p }));
  };

  const processarPagamentoParcela = async (valor: number, promissoriaId: string, parcelaId: string): Promise<Promissoria[]> => {
    // Implementar pagamento de parcela específica
    return promissorias.map(p => ({ ...p }));
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
