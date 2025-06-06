
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, DollarSign } from 'lucide-react';

type Cliente = {
  id: string;
  nome: string;
  apelido?: string | null;
  telefone: string;
  cpf: string;
  endereco: string;
  elegibilidade: 'elegivel' | 'nao_elegivel';
  created_at: string;
  updated_at: string;
};

type Promissoria = {
  id: string;
  cliente_id: string;
  valor: number;
  parcelado: boolean;
  numero_parcelas: number | null;
  data_emissao: string;
  data_limite: string;
  data_pagamento?: string | null;
  status: 'em_aberto' | 'pago' | 'atrasado';
  dias_atraso: number;
  created_by: string;
  created_at: string;
};

interface ClienteDetailProps {
  cliente: Cliente;
  onBack: () => void;
  onUpdate: () => void;
}

export function ClienteDetail({ cliente, onBack, onUpdate }: ClienteDetailProps) {
  const [promissorias, setPromissorias] = useState<Promissoria[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, isManager } = useAuth();
  const { settings } = useSettings();
  const { toast } = useToast();

  // Calcular datas padrão
  const hoje = new Date().toISOString().split('T')[0];
  const dataLimitePadrao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    valor: '',
    parcelado: settings.parcelamento.ativo,
    numero_parcelas: settings.parcelamento.numeroPadrao.toString(),
    data_emissao: hoje,
    data_limite: dataLimitePadrao
  });

  useEffect(() => {
    fetchPromissorias();
  }, [cliente.id]);

  useEffect(() => {
    // Atualizar parcelamento quando configurações mudarem
    if (!settings.parcelamento.bloqueado || isManager) {
      setFormData(prev => ({
        ...prev,
        parcelado: settings.parcelamento.ativo,
        numero_parcelas: settings.parcelamento.numeroPadrao.toString()
      }));
    }
  }, [settings.parcelamento, isManager]);

  useEffect(() => {
    // Atualizar data limite quando data de emissão mudar
    if (formData.data_emissao) {
      const dataEmissao = new Date(formData.data_emissao);
      const novaDataLimite = new Date(dataEmissao.getTime() + 30 * 24 * 60 * 60 * 1000);
      setFormData(prev => ({
        ...prev,
        data_limite: novaDataLimite.toISOString().split('T')[0]
      }));
    }
  }, [formData.data_emissao]);

  const fetchPromissorias = () => {
    try {
      const promissoriasData = JSON.parse(localStorage.getItem('promissorias') || '[]');
      const promissoriasCliente = promissoriasData
        .filter((p: Promissoria) => p.cliente_id === cliente.id)
        .map((p: Promissoria) => {
          // Calcular status e dias de atraso
          const hoje = new Date();
          const dataLimite = new Date(p.data_limite);
          let status = p.status;
          let diasAtraso = 0;

          if (p.data_pagamento) {
            status = 'pago';
          } else if (hoje > dataLimite) {
            status = 'atrasado';
            diasAtraso = Math.floor((hoje.getTime() - dataLimite.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            status = 'em_aberto';
          }

          return { ...p, status, dias_atraso: diasAtraso };
        })
        .sort((a: Promissoria, b: Promissoria) => 
          new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime()
        );

      setPromissorias(promissoriasCliente);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar promissórias: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isManager && cliente.elegibilidade === 'nao_elegivel') {
      toast({
        title: "Acesso Negado",
        description: "Cliente não elegível para novas promissórias. Apenas gerentes podem burlar esta regra.",
        variant: "destructive",
      });
      return;
    }

    // Validar datas
    if (formData.data_limite < formData.data_emissao) {
      toast({
        title: "Erro de Validação",
        description: "A data limite não pode ser anterior à data de emissão.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const novaPromissoria: Promissoria = {
        id: crypto.randomUUID(),
        cliente_id: cliente.id,
        valor: parseFloat(formData.valor),
        parcelado: formData.parcelado,
        numero_parcelas: formData.parcelado ? parseInt(formData.numero_parcelas) : null,
        data_emissao: formData.data_emissao,
        data_limite: formData.data_limite,
        status: 'em_aberto',
        dias_atraso: 0,
        created_by: user!.id,
        created_at: new Date().toISOString()
      };

      const promissoriasData = JSON.parse(localStorage.getItem('promissorias') || '[]');
      promissoriasData.push(novaPromissoria);
      localStorage.setItem('promissorias', JSON.stringify(promissoriasData));

      toast({
        title: "Sucesso",
        description: "Promissória criada com sucesso!",
      });

      // Reset form
      const novoHoje = new Date().toISOString().split('T')[0];
      const novaDataLimite = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      setFormData({
        valor: '',
        parcelado: settings.parcelamento.ativo,
        numero_parcelas: settings.parcelamento.numeroPadrao.toString(),
        data_emissao: novoHoje,
        data_limite: novaDataLimite
      });
      setShowForm(false);
      fetchPromissorias();
      onUpdate();

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao criar promissória: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const marcarComoPago = (promissoriaId: string) => {
    try {
      const dataAtual = new Date().toISOString().split('T')[0];
      
      const promissoriasData = JSON.parse(localStorage.getItem('promissorias') || '[]');
      const promissoriasAtualizadas = promissoriasData.map((p: Promissoria) =>
        p.id === promissoriaId
          ? { ...p, status: 'pago', data_pagamento: dataAtual }
          : p
      );
      
      localStorage.setItem('promissorias', JSON.stringify(promissoriasAtualizadas));

      toast({
        title: "Sucesso",
        description: "Promissória marcada como paga!",
      });

      fetchPromissorias();
      onUpdate();

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar promissória: " + error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'em_aberto':
        return 'bg-green-500';
      case 'pago':
        return 'bg-gray-500';
      case 'atrasado':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'em_aberto':
        return 'Em Aberto';
      case 'pago':
        return 'Pago';
      case 'atrasado':
        return 'Atrasado';
      default:
        return status;
    }
  };

  const canChangeParcelamento = !settings.parcelamento.bloqueado || isManager;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{cliente.nome}</h2>
          {cliente.apelido && <p className="text-gray-600">({cliente.apelido})</p>}
        </div>
        <Badge variant={cliente.elegibilidade === 'elegivel' ? 'default' : 'destructive'}>
          {cliente.elegibilidade === 'elegivel' ? 'Elegível' : 'Não Elegível'}
        </Badge>
      </div>

      {/* Informações do cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <strong>Telefone:</strong> {cliente.telefone}
          </div>
          <div>
            <strong>CPF:</strong> {cliente.cpf}
          </div>
          <div className="md:col-span-2">
            <strong>Endereço:</strong> {cliente.endereco}
          </div>
        </CardContent>
      </Card>

      {/* Nova promissória */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Promissórias</CardTitle>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Promissória
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 border rounded-lg">
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

                <div className="space-y-2 flex items-center gap-2">
                  <Checkbox
                    id="parcelado"
                    checked={formData.parcelado}
                    onCheckedChange={(checked) =>
                      canChangeParcelamento && setFormData(prev => ({ ...prev, parcelado: checked as boolean }))
                    }
                    disabled={!canChangeParcelamento}
                  />
                  <Label htmlFor="parcelado">Parcelado</Label>
                  {settings.parcelamento.bloqueado && !isManager && (
                    <span className="text-xs text-gray-500">(bloqueado por gerente)</span>
                  )}
                </div>

                {formData.parcelado && (
                  <div className="space-y-2">
                    <Label htmlFor="numero_parcelas">Número de Parcelas</Label>
                    <Input
                      id="numero_parcelas"
                      type="number"
                      value={formData.numero_parcelas}
                      onChange={(e) => canChangeParcelamento && setFormData(prev => ({ ...prev, numero_parcelas: e.target.value }))}
                      disabled={!canChangeParcelamento}
                      required={formData.parcelado}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="data_emissao">Data de Emissão *</Label>
                  <Input
                    id="data_emissao"
                    type="date"
                    value={formData.data_emissao}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_emissao: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_limite">Data Limite *</Label>
                  <Input
                    id="data_limite"
                    type="date"
                    value={formData.data_limite}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_limite: e.target.value }))}
                    min={formData.data_emissao}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Promissória'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {/* Lista de promissórias */}
          <div className="space-y-4">
            {promissorias.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma promissória encontrada.
              </div>
            ) : (
              promissorias.map((promissoria) => (
                <Card key={promissoria.id} className="border-l-4" style={{
                  borderLeftColor: promissoria.status === 'em_aberto' ? '#22c55e' :
                                   promissoria.status === 'pago' ? '#6b7280' : '#ef4444'
                }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="font-semibold text-lg">
                            R$ {promissoria.valor.toFixed(2)}
                          </span>
                          <Badge variant={promissoria.status === 'pago' ? 'default' : 
                                        promissoria.status === 'atrasado' ? 'destructive' : 'secondary'}>
                            {getStatusLabel(promissoria.status)}
                          </Badge>
                          {promissoria.parcelado && (
                            <Badge variant="outline">
                              {promissoria.numero_parcelas}x
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div>
                            <strong>Emissão:</strong> {new Date(promissoria.data_emissao).toLocaleDateString()}
                          </div>
                          <div>
                            <strong>Vencimento:</strong> {new Date(promissoria.data_limite).toLocaleDateString()}
                          </div>
                          {promissoria.data_pagamento && (
                            <div>
                              <strong>Pagamento:</strong> {new Date(promissoria.data_pagamento).toLocaleDateString()}
                            </div>
                          )}
                          {promissoria.status === 'atrasado' && promissoria.dias_atraso > 0 && (
                            <div className="text-red-600">
                              <strong>Atraso:</strong> {promissoria.dias_atraso} dias
                            </div>
                          )}
                        </div>
                      </div>
                      {promissoria.status === 'em_aberto' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => marcarComoPago(promissoria.id)}
                        >
                          Marcar como Pago
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
