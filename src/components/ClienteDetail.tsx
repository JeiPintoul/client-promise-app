
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, DollarSign } from 'lucide-react';
import { Database } from '@/types/database';

type Cliente = Database['public']['Tables']['clientes']['Row'];
type Promissoria = Database['public']['Tables']['promissorias']['Row'];

interface ClienteDetailProps {
  cliente: Cliente;
  onBack: () => void;
  onUpdate: () => void;
}

export function ClienteDetail({ cliente, onBack, onUpdate }: ClienteDetailProps) {
  const [promissorias, setPromissorias] = useState<Promissoria[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    valor: '',
    parcelado: false,
    numero_parcelas: '',
    data_emissao: '',
    data_limite: ''
  });
  const [loading, setLoading] = useState(false);
  const { user, isManager } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPromissorias();
  }, [cliente.id]);

  const fetchPromissorias = async () => {
    try {
      const { data, error } = await supabase
        .from('promissorias')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('data_emissao', { ascending: false });

      if (error) throw error;
      setPromissorias(data || []);
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

    setLoading(true);

    try {
      const { error } = await supabase
        .from('promissorias')
        .insert({
          cliente_id: cliente.id,
          valor: parseFloat(formData.valor),
          parcelado: formData.parcelado,
          numero_parcelas: formData.parcelado ? parseInt(formData.numero_parcelas) : null,
          data_emissao: formData.data_emissao,
          data_limite: formData.data_limite,
          created_by: user!.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Promissória criada com sucesso!",
      });

      setFormData({
        valor: '',
        parcelado: false,
        numero_parcelas: '',
        data_emissao: '',
        data_limite: ''
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

  const marcarComoPago = async (promissoriaId: string) => {
    try {
      const dataAtual = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('promissorias')
        .update({
          status: 'pago',
          data_pagamento: dataAtual
        })
        .eq('id', promissoriaId);

      if (error) throw error;

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
                      setFormData(prev => ({ ...prev, parcelado: checked as boolean }))
                    }
                  />
                  <Label htmlFor="parcelado">Parcelado</Label>
                </div>

                {formData.parcelado && (
                  <div className="space-y-2">
                    <Label htmlFor="numero_parcelas">Número de Parcelas</Label>
                    <Input
                      id="numero_parcelas"
                      type="number"
                      value={formData.numero_parcelas}
                      onChange={(e) => setFormData(prev => ({ ...prev, numero_parcelas: e.target.value }))}
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
