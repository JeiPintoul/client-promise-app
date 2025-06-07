import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { ParcelasPromissoria } from './ParcelasPromissoria';
import { EditarPromissoria } from './EditarPromissoria';
import { CadastroPromissoria } from './CadastroPromissoria';

interface Cliente {
  id: string;
  nome: string;
  apelido?: string | null;
  telefone: string;
  cpf: string;
  endereco: string;
  elegibilidade: 'elegivel' | 'nao_elegivel';
  created_at: string;
  updated_at: string;
}

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

type ViewState = 'detail' | 'parcelas' | 'editar-promissoria';

interface ClienteDetailProps {
  cliente: Cliente;
  onBack: () => void;
  onUpdate: () => void;
}

export function ClienteDetail({ cliente, onBack, onUpdate }: ClienteDetailProps) {
  const [promissorias, setPromissorias] = useState<Promissoria[]>([]);
  const [selectedPromissoria, setSelectedPromissoria] = useState<Promissoria | null>(null);
  const [viewState, setViewState] = useState<ViewState>('detail');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [estatisticas, setEstatisticas] = useState({
    valorTotal: 0,
    valorPendente: 0,
    valorAtrasado: 0,
    valorPago: 0
  });
  const { isManager } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPromissorias();
  }, []);

  useEffect(() => {
    calcularEstatisticas(promissorias);
  }, [promissorias]);

  const fetchPromissorias = () => {
    try {
      const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      const clienteEncontrado = clientes.find((c: Cliente) => c.id === cliente.id);
      const promissoriasData = clienteEncontrado?.promissorias || [];
      setPromissorias(promissoriasData);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar promissórias: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePromissoria = (promissoriaId: string) => {
    if (!isManager) {
      toast({
        title: "Acesso Negado",
        description: "Apenas gerentes podem excluir promissórias.",
        variant: "destructive",
      });
      return;
    }

    try {
      const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      const clienteIndex = clientes.findIndex((c: any) => c.id === cliente.id);

      if (clienteIndex !== -1) {
        clientes[clienteIndex].promissorias = clientes[clienteIndex].promissorias?.filter(
          (p: any) => p.id !== promissoriaId
        );
        localStorage.setItem('clientes', JSON.stringify(clientes));
        fetchPromissorias();

        toast({
          title: "Sucesso",
          description: "Promissória excluída com sucesso!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao excluir promissória: " + error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (promissoria: Promissoria) => {
    const hoje = new Date();
    const limite = new Date(promissoria.dataLimite);

    if (limite < hoje) {
      return <Badge variant="destructive">Atrasada</Badge>;
    } else {
      return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const calcularEstatisticas = (promissorias: Promissoria[]) => {
    let valorTotal = 0;
    let valorPendente = 0;
    let valorAtrasado = 0;
    let valorPago = 0;

    const hoje = new Date();

    promissorias.forEach(promissoria => {
      valorTotal += promissoria.valor;

      if (promissoria.parcelado && promissoria.parcelas) {
        promissoria.parcelas.forEach(parcela => {
          const vencimento = new Date(parcela.dataVencimento);
          
          if (parcela.paga) {
            valorPago += parcela.valor;
          } else if (vencimento < hoje) {
            valorAtrasado += parcela.valor;
          } else {
            valorPendente += parcela.valor;
          }
        });
      } else {
        const limite = new Date(promissoria.dataLimite);
        if (limite < hoje) {
          valorAtrasado += promissoria.valor;
        } else {
          valorPendente += promissoria.valor;
        }
      }
    });

    setEstatisticas({
      valorTotal,
      valorPendente,
      valorAtrasado,
      valorPago
    });
  };

  const handleViewParcelas = (promissoria: Promissoria) => {
    setSelectedPromissoria(promissoria);
    setViewState('parcelas');
  };

  const handleEditPromissoria = (promissoria: Promissoria) => {
    setSelectedPromissoria(promissoria);
    setViewState('editar-promissoria');
  };

  const handleBackToDetail = () => {
    setViewState('detail');
    setSelectedPromissoria(null);
    fetchPromissorias();
  };

  if (viewState === 'parcelas' && selectedPromissoria) {
    return (
      <ParcelasPromissoria
        promissoria={selectedPromissoria}
        onBack={handleBackToDetail}
      />
    );
  }

  if (viewState === 'editar-promissoria' && selectedPromissoria) {
    return (
      <EditarPromissoria
        promissoria={selectedPromissoria}
        clienteId={cliente.id}
        onBack={handleBackToDetail}
        onUpdate={fetchPromissorias}
      />
    );
  }

  if (loading) {
    return <div className="text-center py-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{cliente.nome}</h1>
            {cliente.apelido && (
              <p className="text-lg text-muted-foreground">({cliente.apelido})</p>
            )}
          </div>
        </div>
        <Badge variant={cliente.elegibilidade === 'elegivel' ? 'default' : 'destructive'}>
          {cliente.elegibilidade === 'elegivel' ? 'Elegível' : 'Não Elegível'}
        </Badge>
      </div>

      {/* Informações do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <strong>Telefone:</strong> {cliente.telefone}
            </div>
            <div>
              <strong>CPF:</strong> {cliente.cpf}
            </div>
            <div>
              <strong>Endereço:</strong> {cliente.endereco}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Financeiras */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Financeiro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                R$ {estatisticas.valorTotal.toFixed(2)}
              </div>
              <div className="text-sm text-blue-800">Valor Total</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                R$ {estatisticas.valorPago.toFixed(2)}
              </div>
              <div className="text-sm text-green-800">Valor Pago</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                R$ {estatisticas.valorPendente.toFixed(2)}
              </div>
              <div className="text-sm text-yellow-800">Valor Pendente</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                R$ {estatisticas.valorAtrasado.toFixed(2)}
              </div>
              <div className="text-sm text-red-800">Valor Atrasado</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promissórias */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Promissórias</CardTitle>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Promissória
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <CadastroPromissoria
              clienteId={cliente.id}
              onSuccess={() => {
                setShowForm(false);
                fetchPromissorias();
              }}
              onCancel={() => setShowForm(false)}
            />
          )}

          <div className="space-y-4">
            {promissorias.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Nenhuma promissória encontrada para este cliente.
              </p>
            ) : (
              promissorias.map((promissoria) => (
                <div key={promissoria.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">R$ {promissoria.valor.toFixed(2)}</h3>
                        {getStatusBadge(promissoria)}
                        {promissoria.parcelado && (
                          <Badge variant="outline">
                            {promissoria.numeroParcelas}x parcelas
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <strong>Emissão:</strong> {new Date(promissoria.dataEmissao).toLocaleDateString('pt-BR')}
                        </div>
                        <div>
                          <strong>Limite:</strong> {new Date(promissoria.dataLimite).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      {promissoria.observacoes && (
                        <div className="text-sm text-gray-600 mt-2">
                          <strong>Observações:</strong> {promissoria.observacoes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {promissoria.parcelado && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewParcelas(promissoria)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Parcelas
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPromissoria(promissoria)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      {isManager && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePromissoria(promissoria.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
