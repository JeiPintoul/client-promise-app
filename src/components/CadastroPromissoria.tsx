
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import { type Parcela, StatusPagamento } from '@/types';

interface CadastroPromissoriaProps {
  clienteId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Componente para cadastrar novas promissórias
 * Inclui configurações de parcelamento e validações automáticas
 */
export function CadastroPromissoria({ clienteId, onSuccess, onCancel }: CadastroPromissoriaProps) {
  const [formData, setFormData] = useState({
    valor: '',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataLimite: '',
    parcelado: false,
    numeroParcelas: '2',
    observacoes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { settings } = useSettings();

  // Configurar parcelamento padrão se ativo
  useEffect(() => {
    if (settings.parcelamento.ativo) {
      setFormData(prev => ({
        ...prev,
        parcelado: true,
        numeroParcelas: settings.parcelamento.numeroPadrao.toString()
      }));
    }
  }, [settings.parcelamento]);

  // Calcular data limite automaticamente
  useEffect(() => {
    if (formData.dataEmissao) {
      const dataEmissao = new Date(formData.dataEmissao);
      dataEmissao.setDate(dataEmissao.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        dataLimite: dataEmissao.toISOString().split('T')[0]
      }));
    }
  }, [formData.dataEmissao]);

  /**
   * Gera parcelas para uma promissória parcelada
   */
  const gerarParcelas = (valor: number, numeroParcelas: number, dataEmissao: string): Parcela[] => {
    const parcelas: Parcela[] = [];
    const valorParcela = valor / numeroParcelas;
    const dataBase = new Date(dataEmissao);

    for (let i = 1; i <= numeroParcelas; i++) {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);
      
      parcelas.push({
        id: `${Date.now()}-${i}`,
        numero: i,
        valor: valorParcela,
        valorPago: 0,
        dataVencimento: dataVencimento.toISOString(),
        paga: false,
        pagoComAtraso: false,
        status: StatusPagamento.PENDENTE,
        pagamentos: []
      });
    }

    return parcelas;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const valor = parseFloat(formData.valor);
      const numeroParcelas = parseInt(formData.numeroParcelas);

      // Validações
      if (valor <= 0) {
        toast({
          title: "Erro de Validação",
          description: "O valor deve ser maior que zero.",
          variant: "destructive",
        });
        return;
      }

      if (new Date(formData.dataLimite) <= new Date(formData.dataEmissao)) {
        toast({
          title: "Erro de Validação",
          description: "A data limite deve ser posterior à data de emissão.",
          variant: "destructive",
        });
        return;
      }

      if (formData.parcelado && (numeroParcelas < 2 || numeroParcelas > 60)) {
        toast({
          title: "Erro de Validação",
          description: "O número de parcelas deve estar entre 2 e 60.",
          variant: "destructive",
        });
        return;
      }

      // Criar nova promissória
      const novaPromissoria = {
        id: Date.now().toString(),
        valor,
        valorPago: 0,
        dataEmissao: new Date(formData.dataEmissao).toISOString(),
        dataLimite: new Date(formData.dataLimite).toISOString(),
        parcelado: formData.parcelado,
        numeroParcelas: formData.parcelado ? numeroParcelas : undefined,
        parcelas: formData.parcelado 
          ? gerarParcelas(valor, numeroParcelas, formData.dataEmissao)
          : undefined,
        observacoes: formData.observacoes.trim() || undefined,
        status: StatusPagamento.PENDENTE,
        pagamentos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Salvar no localStorage
      const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      const clienteIndex = clientes.findIndex((c: any) => c.id === clienteId);
      
      if (clienteIndex !== -1) {
        if (!clientes[clienteIndex].promissorias) {
          clientes[clienteIndex].promissorias = [];
        }
        clientes[clienteIndex].promissorias.push(novaPromissoria);
        localStorage.setItem('clientes', JSON.stringify(clientes));
      }

      toast({
        title: "Sucesso",
        description: "Promissória cadastrada com sucesso!",
      });

      onSuccess();

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar promissória: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const podeAlterarParcelamento = !settings.parcelamento.bloqueado || settings.parcelamento.podeAlterar;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Nova Promissória</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="dataEmissao">Data de Emissão *</Label>
              <Input
                id="dataEmissao"
                type="date"
                value={formData.dataEmissao}
                onChange={(e) => setFormData(prev => ({ ...prev, dataEmissao: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataLimite">Data Limite *</Label>
              <Input
                id="dataLimite"
                type="date"
                value={formData.dataLimite}
                onChange={(e) => setFormData(prev => ({ ...prev, dataLimite: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="parcelado"
              checked={formData.parcelado}
              onCheckedChange={(checked) => setFormData(prev => ({ 
                ...prev, 
                parcelado: checked as boolean 
              }))}
              disabled={!podeAlterarParcelamento}
            />
            <Label htmlFor="parcelado">Parcelado</Label>
            {!podeAlterarParcelamento && (
              <span className="text-sm text-muted-foreground">(Bloqueado pelo gerente)</span>
            )}
          </div>

          {formData.parcelado && (
            <div className="space-y-2">
              <Label htmlFor="numeroParcelas">Número de Parcelas</Label>
              <Input
                id="numeroParcelas"
                type="number"
                min="2"
                max="60"
                value={formData.numeroParcelas}
                onChange={(e) => setFormData(prev => ({ ...prev, numeroParcelas: e.target.value }))}
                disabled={!podeAlterarParcelamento}
              />
            </div>
          )}

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
            <Button type="submit" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar Promissória'}
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
