
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import { ArrowLeft } from 'lucide-react';

interface Parcela {
  numero: number;
  valor: number;
  dataVencimento: string;
  paga: boolean;
}

interface Promissoria {
  id: string;
  valor: number;
  dataEmissao: string;
  dataLimite: string;
  parcelado: boolean;
  numeroParcelas?: number;
  parcelas?: Parcela[];
  observacoes?: string;
}

interface EditarPromissoriaProps {
  promissoria: Promissoria;
  clienteId: string;
  onBack: () => void;
  onUpdate: () => void;
}

export function EditarPromissoria({ promissoria, clienteId, onBack, onUpdate }: EditarPromissoriaProps) {
  const [formData, setFormData] = useState({
    valor: promissoria.valor.toString(),
    dataEmissao: promissoria.dataEmissao.split('T')[0],
    dataLimite: promissoria.dataLimite.split('T')[0],
    parcelado: promissoria.parcelado,
    numeroParcelas: promissoria.numeroParcelas?.toString() || '2',
    observacoes: promissoria.observacoes || ''
  });
  
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { settings } = useSettings();

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

  const gerarParcelas = (valor: number, numeroParcelas: number, dataEmissao: string): Parcela[] => {
    const parcelas: Parcela[] = [];
    const valorParcela = valor / numeroParcelas;
    const dataBase = new Date(dataEmissao);

    for (let i = 1; i <= numeroParcelas; i++) {
      const dataVencimento = new Date(dataBase);
      dataVencimento.setMonth(dataVencimento.getMonth() + i);
      
      // Manter o status de pagamento das parcelas existentes
      const parcelaExistente = promissoria.parcelas?.find(p => p.numero === i);
      
      parcelas.push({
        numero: i,
        valor: valorParcela,
        dataVencimento: dataVencimento.toISOString(),
        paga: parcelaExistente?.paga || false
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

      const promissoriaAtualizada = {
        ...promissoria,
        valor,
        dataEmissao: new Date(formData.dataEmissao).toISOString(),
        dataLimite: new Date(formData.dataLimite).toISOString(),
        parcelado: formData.parcelado,
        numeroParcelas: formData.parcelado ? numeroParcelas : undefined,
        parcelas: formData.parcelado 
          ? gerarParcelas(valor, numeroParcelas, formData.dataEmissao)
          : undefined,
        observacoes: formData.observacoes.trim() || undefined,
        updated_at: new Date().toISOString()
      };

      // Atualizar no localStorage
      const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      const clienteIndex = clientes.findIndex((c: any) => c.id === clienteId);
      
      if (clienteIndex !== -1) {
        const promissoriaIndex = clientes[clienteIndex].promissorias?.findIndex((p: any) => p.id === promissoria.id);
        
        if (promissoriaIndex !== -1) {
          clientes[clienteIndex].promissorias[promissoriaIndex] = promissoriaAtualizada;
          localStorage.setItem('clientes', JSON.stringify(clientes));
        }
      }

      toast({
        title: "Sucesso",
        description: "Promissória atualizada com sucesso!",
      });

      onUpdate();
      onBack();

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar promissória: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const podeAlterarParcelamento = !settings.parcelamento.bloqueado || settings.parcelamento.podeAlterar;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-2xl font-bold">Editar Promissória</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Promissória</CardTitle>
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar Promissória'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
