import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Plus, Edit, Trash2, CreditCard, Save, X, History, Search, Filter } from 'lucide-react';
import { ListaParcelas } from './ListaParcelas';
import { EditarPromissoria } from './EditarPromissoria';
import { CadastroPromissoria } from './CadastroPromissoria';
import { RegistroPagamento } from './RegistroPagamento';
import { HistoricoPagamentos } from './HistoricoPagamentos';
import { DetalhePagamentoParcela } from './DetalhePagamentoParcela';
import { type Cliente, type Promissoria } from '@/types';
import { calcularEstatisticasCliente, calcularStatusPromissoria, formatarStatus } from '@/utils/paymentUtils';

type ViewState = 'detail' | 'editar-promissoria' | 'registrar-pagamento' | 'historico-pagamentos' | 'detalhe-pagamento-parcela';
type StatusFiltro = 'todos' | 'pendente' | 'atrasado' | 'pago';
type OrdemFiltro = 'data_emissao_desc' | 'data_emissao_asc' | 'valor_desc' | 'valor_asc' | 'data_limite_asc';

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
  const [promissoriasFiltratas, setPromissoriasFiltratas] = useState<Promissoria[]>([]);
  const [selectedPromissoria, setSelectedPromissoria] = useState<Promissoria | null>(null);
  const [selectedParcela, setSelectedParcela] = useState<any>(null);
  const [viewState, setViewState] = useState<ViewState>('detail');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [clienteEditado, setClienteEditado] = useState(cliente);
  const [pagamentoConfig, setPagamentoConfig] = useState({
    tipo: 'geral' as 'geral' | 'promissoria' | 'parcela',
    promissoriaId: '',
    parcelaId: '',
    valorSugerido: 0
  });

  // Estados dos filtros
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('todos');
  const [ordemFiltro, setOrdemFiltro] = useState<OrdemFiltro>('data_limite_asc');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  const { isManager } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchPromissorias();
  }, []);

  // Aplicar filtros automaticamente sempre que algum filtro mudar
  useEffect(() => {
    aplicarFiltros();
  }, [busca, statusFiltro, ordemFiltro, dataInicio, dataFim, promissorias]);

  const aplicarFiltros = () => {
    let resultado = [...promissorias];

    // Filtro de busca (por valor ou observações)
    if (busca.trim()) {
      const termoBusca = busca.toLowerCase().trim();
      resultado = resultado.filter(promissoria => 
        promissoria.valor.toString().includes(termoBusca) ||
        promissoria.observacoes?.toLowerCase().includes(termoBusca) ||
        promissoria.id.toLowerCase().includes(termoBusca)
      );
    }

    // Filtro por status
    if (statusFiltro !== 'todos') {
      resultado = resultado.filter(promissoria => promissoria.status === statusFiltro);
    }

    // Filtro por data
    if (dataInicio) {
      resultado = resultado.filter(promissoria => 
        new Date(promissoria.dataEmissao) >= new Date(dataInicio)
      );
    }
    if (dataFim) {
      resultado = resultado.filter(promissoria => 
        new Date(promissoria.dataEmissao) <= new Date(dataFim)
      );
    }

    // Ordenação
    resultado.sort((a, b) => {
      switch (ordemFiltro) {
        case 'data_emissao_desc':
          return new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime();
        case 'data_emissao_asc':
          return new Date(a.dataEmissao).getTime() - new Date(b.dataEmissao).getTime();
        case 'valor_desc':
          return b.valor - a.valor;
        case 'valor_asc':
          return a.valor - b.valor;
        case 'data_limite_asc':
          return new Date(a.dataLimite).getTime() - new Date(b.dataLimite).getTime();
        default:
          return 0;
      }
    });

    // Priorizar atrasadas primeiro quando status é 'todos'
    if (statusFiltro === 'todos') {
      const atrasadas = resultado.filter(p => p.status === 'atrasado');
      const pendentes = resultado.filter(p => p.status === 'pendente');
      const pagas = resultado.filter(p => p.status === 'pago');
      resultado = [...atrasadas, ...pendentes, ...pagas];
    }

    setPromissoriasFiltratas(resultado);
  };

  const limparFiltros = () => {
    setBusca('');
    setStatusFiltro('todos');
    setOrdemFiltro('data_limite_asc');
    setDataInicio('');
    setDataFim('');
  };

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

  const salvarEdicaoCliente = () => {
    try {
      const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      const clienteIndex = clientes.findIndex((c: any) => c.id === cliente.id);

      if (clienteIndex !== -1) {
        clientes[clienteIndex] = {
          ...clientes[clienteIndex],
          ...clienteEditado,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem('clientes', JSON.stringify(clientes));
        
        setEditandoCliente(false);
        onUpdate();
        
        toast({
          title: "Sucesso",
          description: "Informações do cliente atualizadas com sucesso!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao salvar informações: " + error.message,
        variant: "destructive",
      });
    }
  };

  const toggleElegibilidade = () => {
    if (!isManager) {
      toast({
        title: "Acesso Negado",
        description: "Apenas gerentes podem alterar a elegibilidade do cliente.",
        variant: "destructive",
      });
      return;
    }

    const novaElegibilidade = clienteEditado.elegibilidade === 'elegivel' ? 'nao_elegivel' : 'elegivel';
    setClienteEditado(prev => ({ ...prev, elegibilidade: novaElegibilidade }));
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

  const handleVerPagamentosParcela = (parcelaId: string) => {
    // Encontrar a promissória e parcela
    let promissoriaEncontrada: Promissoria | null = null;
    let parcelaEncontrada: any = null;

    for (const promissoria of promissorias) {
      if (promissoria.parcelas) {
        const parcela = promissoria.parcelas.find(p => p.id === parcelaId);
        if (parcela) {
          promissoriaEncontrada = promissoria;
          parcelaEncontrada = parcela;
          break;
        }
      }
    }

    if (promissoriaEncontrada && parcelaEncontrada) {
      setSelectedPromissoria(promissoriaEncontrada);
      setSelectedParcela(parcelaEncontrada);
      setViewState('detalhe-pagamento-parcela');
    }
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
    setSelectedParcela(null);
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

  if (viewState === 'historico-pagamentos') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBackToDetail}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Histórico de Pagamentos - {cliente.nome}</h1>
        </div>
        <HistoricoPagamentos promissorias={promissorias} />
      </div>
    );
  }

  if (viewState === 'detalhe-pagamento-parcela' && selectedPromissoria && selectedParcela) {
    return (
      <DetalhePagamentoParcela
        parcela={selectedParcela}
        promissoria={selectedPromissoria}
        onBack={handleBackToDetail}
        onPagamentoAtualizado={handlePagamentoRegistrado}
      />
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
            <h1 className="text-3xl font-bold">{clienteEditado.nome}</h1>
            {clienteEditado.apelido && (
              <p className="text-lg text-muted-foreground">({clienteEditado.apelido})</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setViewState('historico-pagamentos')}
          >
            <History className="w-4 h-4 mr-2" />
            Histórico
          </Button>
          <Badge 
            variant={clienteEditado.elegibilidade === 'elegivel' ? 'default' : 'destructive'}
            className="cursor-pointer"
            onClick={toggleElegibilidade}
          >
            {clienteEditado.elegibilidade === 'elegivel' ? 'Elegível' : 'Não Elegível'}
          </Badge>
        </div>
      </div>

      {/* Informações do Cliente */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Informações do Cliente</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => editandoCliente ? salvarEdicaoCliente() : setEditandoCliente(true)}
            >
              {editandoCliente ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </>
              )}
            </Button>
            {editandoCliente && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditandoCliente(false);
                  setClienteEditado(cliente);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editandoCliente ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Nome:</label>
                <Input
                  value={clienteEditado.nome}
                  onChange={(e) => setClienteEditado(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Apelido:</label>
                <Input
                  value={clienteEditado.apelido || ''}
                  onChange={(e) => setClienteEditado(prev => ({ ...prev, apelido: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefone:</label>
                <Input
                  value={clienteEditado.telefone}
                  onChange={(e) => setClienteEditado(prev => ({ ...prev, telefone: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">CPF:</label>
                <Input
                  value={clienteEditado.cpf}
                  onChange={(e) => setClienteEditado(prev => ({ ...prev, cpf: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Endereço:</label>
                <Textarea
                  value={clienteEditado.endereco}
                  onChange={(e) => setClienteEditado(prev => ({ ...prev, endereco: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <strong>Telefone:</strong> {clienteEditado.telefone}
              </div>
              <div>
                <strong>CPF:</strong> {clienteEditado.cpf}
              </div>
              <div>
                <strong>Endereço:</strong> {clienteEditado.endereco}
              </div>
            </div>
          )}
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
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                R$ {estatisticas.valorTotal.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Valor Total</div>
            </div>
            <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                R$ {estatisticas.valorPago.toFixed(2)}
              </div>
              <div className="text-sm text-green-800 dark:text-green-300">Valor Pago</div>
            </div>
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                R$ {estatisticas.valorPendente.toFixed(2)}
              </div>
              <div className="text-sm text-yellow-800 dark:text-yellow-300">Valor Pendente</div>
            </div>
            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                R$ {estatisticas.valorAtrasado.toFixed(2)}
              </div>
              <div className="text-sm text-red-800 dark:text-red-300">Valor Atrasado</div>
            </div>
          </div>
          
          {/* Estatísticas de Pagamentos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {estatisticas.pagamentosNoTempo}
              </div>
              <div className="text-sm text-emerald-800 dark:text-emerald-300">Pagamentos no Prazo</div>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {estatisticas.pagamentosAtrasados}
              </div>
              <div className="text-sm text-orange-800 dark:text-orange-300">Pagamentos Atrasados</div>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <div className="text-xl font-bold text-slate-600 dark:text-slate-300">
                {estatisticas.pagamentosPendentes}
              </div>
              <div className="text-sm text-slate-800 dark:text-slate-400">Pagamentos Pendentes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Promissórias com Filtros */}
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
          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-4 h-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="busca-cliente">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="busca-cliente"
                      placeholder="Valor, ID ou observações..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status-cliente">Status</Label>
                  <Select value={statusFiltro} onValueChange={(value: StatusFiltro) => setStatusFiltro(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="atrasado">Atrasadas</SelectItem>
                      <SelectItem value="pendente">Pendentes</SelectItem>
                      <SelectItem value="pago">Pagas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ordem-cliente">Ordenar por</Label>
                  <Select value={ordemFiltro} onValueChange={(value: OrdemFiltro) => setOrdemFiltro(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="data_limite_asc">Vencimento (mais próximo)</SelectItem>
                      <SelectItem value="data_emissao_desc">Data de emissão (mais recente)</SelectItem>
                      <SelectItem value="data_emissao_asc">Data de emissão (mais antiga)</SelectItem>
                      <SelectItem value="valor_desc">Valor (maior)</SelectItem>
                      <SelectItem value="valor_asc">Valor (menor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataInicio-cliente">Data início</Label>
                  <Input
                    id="dataInicio-cliente"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataFim-cliente">Data fim</Label>
                  <Input
                    id="dataFim-cliente"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={limparFiltros} className="flex-1">
                  <X className="w-4 h-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

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
            {promissoriasFiltratas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {promissorias.length === 0
                  ? 'Nenhuma promissória encontrada para este cliente.'
                  : 'Nenhuma promissória encontrada com os filtros aplicados.'}
              </p>
            ) : (
              promissoriasFiltratas.map((promissoria) => (
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <strong>Emissão:</strong> {new Date(promissoria.dataEmissao).toLocaleDateString('pt-BR')}
                        </div>
                        <div>
                          <strong>Vencimento:</strong> {new Date(promissoria.dataLimite).toLocaleDateString('pt-BR')}
                        </div>
                        <div>
                          <strong>Valor Pago:</strong> <span className="text-green-600 dark:text-green-400">R$ {(promissoria.valorPago || 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <strong>Restante:</strong> <span className="text-red-600 dark:text-red-400">R$ {(promissoria.valor - (promissoria.valorPago || 0)).toFixed(2)}</span>
                        </div>
                      </div>
                      {promissoria.observacoes && (
                        <div className="text-sm text-muted-foreground mt-2">
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
                      onVerPagamentos={handleVerPagamentosParcela}
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
