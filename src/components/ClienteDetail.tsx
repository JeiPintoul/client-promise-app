
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Plus, Edit, Trash2, CreditCard } from 'lucide-react';
import { ListaParcelas } from './ListaParcelas';
import { EditarPromissoria } from './EditarPromissoria';
import { CadastroPromissoria } from './CadastroPromissoria';
import { RegistroPagamento } from './RegistroPagamento';
import { type Cliente, type Promissoria } from '@/types';
import { calcularEstatisticasCliente, calcularStatusPromissoria, formatarStatus } from '@/utils/paymentUtils';

type ViewState = 'detail' | 'editar-promissoria' | 'registrar-pagamento';

interface ClienteDetailProps {
  cliente: Cliente;
  onBack: () => void;
  onUpdate: () => void;
}

/**
 * Componente principal para exibir detalhes de um cliente
 * Inclui informações pessoais, resumo financeiro e gestão de promissórias
 */
export function ClienteDetail({ cliente, onBack, onUpdate }: ClienteDetailProps) {
  const [promissorias, setPromissorias] = useState<Promissoria[]>([]);
  const [selectedPromissoria, setSelectedPromissoria] = useState<Promissoria | null>(null);
  const [viewState, setViewState] = useState<ViewState>('detail');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagamentoConfig, setPagamentoConfig] = useState({
    tipo: 'geral' as 'geral' | 'promissoria' | 'parcela',
    promissoriaId: '',
    parcelaId: '',
    valorSugerido: 0
  });
  
  const { isManager } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPromissorias();
  }, []);

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

  const handleEditPromissoria = (promissoria: Promissoria) => {
    setSelectedPromissoria(promissoria);
    setViewState('editar-promissoria');
  };

  const handleRegistrarPagamento = (tipo: 'geral' | 'promissoria' | 'parcela', promissoriaId?: string, parcelaId?: string, valorSugerido?: number) => {
    setPagamentoConfig({
      tipo,
      promissoriaId: promissoriaId || '',
      parcelaId: parcelaId || '',
      valorSugerido: valorSugerido || 0
    });
    setViewState('registrar-pagamento');
  };

  const handlePagamentoRegistrado = (promissoriasAtualizadas: Promissoria[]) => {
    // Atualizar no localStorage
    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    const clienteIndex = clientes.findIndex((c: any) => c.id === cliente.id);
    
    if (clienteIndex !== -1) {
      clientes[clienteIndex].promissorias = promissoriasAtualizadas;
      localStorage.setItem('clientes', JSON.stringify(clientes));
      fetchPromissorias();
    }
    
    setViewState('detail');
  };

  const handleBackToDetail = () => {
    setViewState('detail');
    setSelectedPromissoria(null);
    fetchPromissorias();
  };

  const getStatusBadge = (promissoria: Promissoria) => {
    const status = calcularStatusPromissoria(promissoria);
    
    const variants = {
      pendente: 'outline' as const,
      pago: 'default' as const,
      atrasado: 'destructive' as const,
      pago_com_atraso: 'secondary' as const
    };

    return (
      <Badge variant={variants[status]}>
        {formatarStatus(status)}
      </Badge>
    );
  };

  // Renderizar estados específicos
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

  if (viewState === 'registrar-pagamento') {
    return (
      <div className="flex justify-center p-4">
        <RegistroPagamento
          cliente={cliente}
          promissorias={promissorias}
          onPagamentoRegistrado={handlePagamentoRegistrado}
          onCancel={handleBackToDetail}
          tipo={pagamentoConfig.tipo}
          promissoriaId={pagamentoConfig.promissoriaId}
          parcelaId={pagamentoConfig.parcelaId}
          valorSugerido={pagamentoConfig.valorSugerido}
        />
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-4">Carregando...</div>;
  }

  const estatisticas = calcularEstatisticasCliente(promissorias);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
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

      {/* Resumo Financeiro Atualizado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Resumo Financeiro</CardTitle>
            <Button onClick={() => handleRegistrarPagamento('geral')}>
              <CreditCard className="w-4 h-4 mr-2" />
              Registrar Pagamento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
          
          {/* Estatísticas de Pagamentos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <div className="text-xl font-bold text-emerald-600">
                {estatisticas.pagamentosNoTempo}
              </div>
              <div className="text-sm text-emerald-800">Pagamentos no Prazo</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">
                {estatisticas.pagamentosAtrasados}
              </div>
              <div className="text-sm text-orange-800">Pagamentos Atrasados</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xl font-bold text-slate-600">
                {estatisticas.pagamentosPendentes}
              </div>
              <div className="text-sm text-slate-800">Pagamentos Pendentes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Promissórias */}
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

          <div className="space-y-6">
            {promissorias.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Nenhuma promissória encontrada para este cliente.
              </p>
            ) : (
              promissorias.map((promissoria) => (
                <div key={promissoria.id} className="border rounded-lg p-4 space-y-4">
                  {/* Cabeçalho da Promissória */}
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
                        <div>
                          <strong>Valor Pago:</strong> <span className="text-green-600">R$ {(promissoria.valorPago || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <strong>Restante:</strong> <span className="text-red-600">R$ {(promissoria.valor - (promissoria.valorPago || 0)).toFixed(2)}</span>
                        </div>
                      </div>
                      {promissoria.observacoes && (
                        <div className="text-sm text-gray-600 mt-2">
                          <strong>Observações:</strong> {promissoria.observacoes}
                        </div>
                      )}
                    </div>
                    
                    {/* Ações da Promissória */}
                    <div className="flex gap-2">
                      {promissoria.status !== 'pago' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegistrarPagamento(
                            'promissoria', 
                            promissoria.id, 
                            undefined, 
                            promissoria.valor - (promissoria.valorPago || 0)
                          )}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Pagar
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

                  {/* Lista de Parcelas Expansível */}
                  {promissoria.parcelado && (
                    <ListaParcelas
                      promissoria={promissoria}
                      onPagarParcela={(parcelaId, valorSugerido) => 
                        handleRegistrarPagamento('parcela', promissoria.id, parcelaId, valorSugerido)
                      }
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
