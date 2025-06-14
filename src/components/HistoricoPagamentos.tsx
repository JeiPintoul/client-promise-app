import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from './ConfirmDialog';
import { type Pagamento, type Promissoria, type OrdemPagamento, type FiltroPagamento } from '@/types';
import { formatarTipoPagamento } from '@/utils/paymentUtils';

interface HistoricoPagamentosProps {
  promissorias: Promissoria[];
  promissoriaId?: string;
  parcelaId?: string;
  onNavigateToPromissoria?: (promissoriaId: string) => void;
  onNavigateToParcela?: (promissoriaId: string, parcelaId: string) => void;
  onPagamentoAtualizado?: (promissoriasAtualizadas: Promissoria[]) => void;
}

interface PagamentoDetalhado extends Pagamento {
  origemTipo: 'promissoria' | 'parcela';
  promissoriaInfo: {
    id: string;
    valor: number;
    numeroParcelas?: number;
  };
  parcelaInfo?: {
    id: string;
    numero: number;
    valorParcela: number;
  };
}

interface AcaoAgrupada {
  id: string;
  dataHora: string;
  tipo: Pagamento['tipo'];
  valorTotal: number;
  observacoes?: string;
  pagamentos: PagamentoDetalhado[];
  descricao: string;
}

export function HistoricoPagamentos({
  promissorias,
  promissoriaId,
  parcelaId,
  onNavigateToPromissoria,
  onNavigateToParcela,
  onPagamentoAtualizado
}: HistoricoPagamentosProps) {
  const [ordem, setOrdem] = useState<OrdemPagamento>('data_desc');
  const [filtro, setFiltro] = useState<FiltroPagamento>('todos');
  const [editandoPagamento, setEditandoPagamento] = useState<string | null>(null);
  const [valorEdicao, setValorEdicao] = useState('');
  const [expandedAcoes, setExpandedAcoes] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    pagamentoId: string;
    valor: number;
  }>({ isOpen: false, pagamentoId: '', valor: 0 });
  
  const { toast } = useToast();

  /**
   * Extrai todos os pagamentos de parcelas de forma centralizada
   */
  const extrairPagamentosDetalhados = (): PagamentoDetalhado[] => {
    const pagamentos: PagamentoDetalhado[] = [];

    promissorias.forEach(promissoria => {
      if (promissoriaId && promissoria.id !== promissoriaId) return;

      // Pagamentos de parcelas (fonte principal da verdade)
      if (promissoria.parcelas) {
        promissoria.parcelas.forEach(parcela => {
          if (parcelaId && parcela.id !== parcelaId) return;
          
          if (parcela.pagamentos && parcela.pagamentos.length > 0) {
            parcela.pagamentos.forEach(pagamento => {
              pagamentos.push({
                ...pagamento,
                origemTipo: 'parcela',
                promissoriaInfo: {
                  id: promissoria.id,
                  valor: promissoria.valor,
                  numeroParcelas: promissoria.numeroParcelas
                },
                parcelaInfo: {
                  id: parcela.id,
                  numero: parcela.numero,
                  valorParcela: parcela.valor
                }
              });
            });
          }
        });
      }

      // Pagamentos principais da promissória (apenas para referência)
      if (promissoria.pagamentos) {
        promissoria.pagamentos
          .filter(p => !p.parcelaId) // Apenas pagamentos não associados a parcelas específicas
          .forEach(pagamento => {
            pagamentos.push({
              ...pagamento,
              origemTipo: 'promissoria',
              promissoriaInfo: {
                id: promissoria.id,
                valor: promissoria.valor,
                numeroParcelas: promissoria.numeroParcelas
              }
            });
          });
      }
    });

    return pagamentos;
  };

  /**
   * Agrupa pagamentos por ação (mesmo tipo, data/hora e observações)
   */
  const agruparPagamentosPorAcao = (pagamentos: PagamentoDetalhado[]): AcaoAgrupada[] => {
    const acoesMap = new Map<string, AcaoAgrupada>();

    pagamentos.forEach(pagamento => {
      // Chave para agrupamento: tipo + data/hora + observações
      const chave = `${pagamento.tipo}_${pagamento.dataHora}_${pagamento.observacoes || ''}`;
      
      if (acoesMap.has(chave)) {
        const acao = acoesMap.get(chave)!;
        acao.pagamentos.push(pagamento);
        acao.valorTotal += pagamento.valor;
      } else {
        // Determinar descrição da ação
        let descricaoAcao = '';
        if (pagamento.descricao?.includes('Pagamento geral')) {
          descricaoAcao = 'Pagamento Geral Distribuído';
        } else if (pagamento.descricao?.includes('Pagamento da promissória')) {
          descricaoAcao = 'Pagamento de Promissória';
        } else {
          descricaoAcao = 'Pagamento de Parcela Individual';
        }

        acoesMap.set(chave, {
          id: chave,
          dataHora: pagamento.dataHora,
          tipo: pagamento.tipo,
          valorTotal: pagamento.valor,
          observacoes: pagamento.observacoes,
          pagamentos: [pagamento],
          descricao: descricaoAcao
        });
      }
    });

    return Array.from(acoesMap.values());
  };

  const pagamentosDetalhados = extrairPagamentosDetalhados();

  // Aplicar filtros
  const pagamentosFiltrados = pagamentosDetalhados.filter(pagamento => {
    if (filtro === 'todos') return true;
    
    const isAtrasado = pagamento.origemTipo === 'parcela' 
      ? new Date(pagamento.dataHora) > new Date(pagamento.parcelaInfo!.valorParcela) // Aproximação
      : pagamento.descricao?.includes('atraso');
    
    if (filtro === 'atrasados') return isAtrasado;
    if (filtro === 'no_tempo') return !isAtrasado;
    return true;
  });

  // Agrupar por ações
  const acoesAgrupadas = agruparPagamentosPorAcao(pagamentosFiltrados);

  // Aplicar ordenação
  const acoesOrdenadas = [...acoesAgrupadas].sort((a, b) => {
    switch (ordem) {
      case 'data_asc':
        return new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime();
      case 'data_desc':
        return new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime();
      case 'valor_asc':
        return a.valorTotal - b.valorTotal;
      case 'valor_desc':
        return b.valorTotal - a.valorTotal;
      default:
        return 0;
    }
  });

  const toggleExpandedAcao = (acaoId: string) => {
    const newExpanded = new Set(expandedAcoes);
    if (newExpanded.has(acaoId)) {
      newExpanded.delete(acaoId);
    } else {
      newExpanded.add(acaoId);
    }
    setExpandedAcoes(newExpanded);
  };

  const handleEditarPagamento = (pagamentoId: string, valorAtual: number) => {
    setEditandoPagamento(pagamentoId);
    setValorEdicao(valorAtual.toString());
  };

  const handleSalvarEdicao = (pagamentoId: string) => {
    const novoValor = parseFloat(valorEdicao);
    
    if (novoValor <= 0) {
      toast({
        title: "Erro",
        description: "O valor deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    const novasPromissorias = [...promissorias];
    let pagamentoEncontrado = false;
    let valorAnterior = 0;

    novasPromissorias.forEach(promissoria => {
      // Verificar pagamentos das parcelas
      if (promissoria.parcelas) {
        promissoria.parcelas.forEach(parcela => {
          if (parcela.pagamentos) {
            const pagamentoIndex = parcela.pagamentos.findIndex(p => p.id === pagamentoId);
            if (pagamentoIndex !== -1) {
              valorAnterior = parcela.pagamentos[pagamentoIndex].valor;
              const diferenca = novoValor - valorAnterior;
              
              parcela.pagamentos[pagamentoIndex].valor = novoValor;
              parcela.pagamentos[pagamentoIndex].editado = true;
              
              if (!parcela.pagamentos[pagamentoIndex].historicoEdicoes) {
                parcela.pagamentos[pagamentoIndex].historicoEdicoes = [];
              }
              
              parcela.pagamentos[pagamentoIndex].historicoEdicoes!.push({
                data: new Date().toISOString(),
                alteracao: `Valor alterado de R$ ${valorAnterior.toFixed(2)} para R$ ${novoValor.toFixed(2)}`,
                valorAnterior,
                valorNovo: novoValor
              });
              
              parcela.valorPago = (parcela.valorPago || 0) + diferenca;
              promissoria.valorPago = (promissoria.valorPago || 0) + diferenca;
              promissoria.updated_at = new Date().toISOString();
              pagamentoEncontrado = true;
            }
          }
        });
      }

      // Verificar pagamentos da promissória
      if (promissoria.pagamentos) {
        const pagamentoIndex = promissoria.pagamentos.findIndex(p => p.id === pagamentoId);
        if (pagamentoIndex !== -1) {
          valorAnterior = promissoria.pagamentos[pagamentoIndex].valor;
          const diferenca = novoValor - valorAnterior;
          
          promissoria.pagamentos[pagamentoIndex].valor = novoValor;
          promissoria.pagamentos[pagamentoIndex].editado = true;
          
          if (!promissoria.pagamentos[pagamentoIndex].historicoEdicoes) {
            promissoria.pagamentos[pagamentoIndex].historicoEdicoes = [];
          }
          
          promissoria.pagamentos[pagamentoIndex].historicoEdicoes!.push({
            data: new Date().toISOString(),
            alteracao: `Valor alterado de R$ ${valorAnterior.toFixed(2)} para R$ ${novoValor.toFixed(2)}`,
            valorAnterior,
            valorNovo: novoValor
          });
          
          promissoria.valorPago = (promissoria.valorPago || 0) + diferenca;
          promissoria.updated_at = new Date().toISOString();
          pagamentoEncontrado = true;
        }
      }
    });

    if (pagamentoEncontrado && onPagamentoAtualizado) {
      onPagamentoAtualizado(novasPromissorias);
      toast({
        title: "Sucesso",
        description: `Pagamento editado: R$ ${valorAnterior.toFixed(2)} → R$ ${novoValor.toFixed(2)}`,
      });
    }

    setEditandoPagamento(null);
    setValorEdicao('');
  };

  const confirmarExclusao = (pagamentoId: string, valor: number) => {
    setConfirmDialog({
      isOpen: true,
      pagamentoId,
      valor
    });
  };

  const handleExcluirPagamento = () => {
    const { pagamentoId } = confirmDialog;
    const novasPromissorias = [...promissorias];
    let pagamentoEncontrado = false;
    let valorExcluido = confirmDialog.valor;

    novasPromissorias.forEach(promissoria => {
      // Verificar pagamentos das parcelas
      if (promissoria.parcelas) {
        promissoria.parcelas.forEach(parcela => {
          if (parcela.pagamentos) {
            const pagamentoIndex = parcela.pagamentos.findIndex(p => p.id === pagamentoId);
            if (pagamentoIndex !== -1) {
              valorExcluido = parcela.pagamentos[pagamentoIndex].valor;
              parcela.pagamentos.splice(pagamentoIndex, 1);
              parcela.valorPago = (parcela.valorPago || 0) - valorExcluido;
              parcela.paga = parcela.valorPago >= parcela.valor;
              promissoria.valorPago = (promissoria.valorPago || 0) - valorExcluido;
              promissoria.updated_at = new Date().toISOString();
              pagamentoEncontrado = true;
            }
          }
        });
      }

      // Verificar pagamentos da promissória
      if (promissoria.pagamentos) {
        const pagamentoIndex = promissoria.pagamentos.findIndex(p => p.id === pagamentoId);
        if (pagamentoIndex !== -1) {
          valorExcluido = promissoria.pagamentos[pagamentoIndex].valor;
          promissoria.pagamentos.splice(pagamentoIndex, 1);
          promissoria.valorPago = (promissoria.valorPago || 0) - valorExcluido;
          promissoria.updated_at = new Date().toISOString();
          pagamentoEncontrado = true;
        }
      }
    });

    if (pagamentoEncontrado && onPagamentoAtualizado) {
      onPagamentoAtualizado(novasPromissorias);
      toast({
        title: "Sucesso",
        description: `Pagamento de R$ ${valorExcluido.toFixed(2)} excluído com sucesso.`,
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={ordem} onValueChange={(value: OrdemPagamento) => setOrdem(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data_desc">Data (Mais recente)</SelectItem>
                  <SelectItem value="data_asc">Data (Mais antigo)</SelectItem>
                  <SelectItem value="valor_desc">Valor (Maior)</SelectItem>
                  <SelectItem value="valor_asc">Valor (Menor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Select value={filtro} onValueChange={(value: FiltroPagamento) => setFiltro(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="no_tempo">No Prazo</SelectItem>
                  <SelectItem value="atrasados">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {acoesOrdenadas.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum pagamento encontrado.
            </p>
          ) : (
            <div className="space-y-3">
              {acoesOrdenadas.map((acao) => (
                <div key={acao.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold">R$ {acao.valorTotal.toFixed(2)}</span>
                        <Badge variant="outline">{formatarTipoPagamento(acao.tipo)}</Badge>
                        <Badge variant="secondary">
                          {acao.pagamentos.length} item{acao.pagamentos.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div><strong>Data:</strong> {new Date(acao.dataHora).toLocaleString('pt-BR')}</div>
                        <div><strong>Tipo:</strong> {acao.descricao}</div>
                        {acao.observacoes && (
                          <div><strong>Observações:</strong> {acao.observacoes}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpandedAcao(acao.id)}
                      >
                        {expandedAcoes.has(acao.id) ? (
                          <>
                            <ChevronUp className="w-4 h-4 mr-1" />
                            Ocultar Ações
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-1" />
                            Exibir Ações
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Detalhes expandidos da ação */}
                  {expandedAcoes.has(acao.id) && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {acao.pagamentos.map((pagamento) => (
                        <div key={pagamento.id} className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {editandoPagamento === pagamento.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={valorEdicao}
                                      onChange={(e) => setValorEdicao(e.target.value)}
                                      className="w-24 px-2 py-1 border rounded"
                                    />
                                    <Button size="sm" onClick={() => handleSalvarEdicao(pagamento.id)}>
                                      Salvar
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditandoPagamento(null)}>
                                      Cancelar
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="font-medium">R$ {pagamento.valor.toFixed(2)}</span>
                                )}
                                <Badge variant={pagamento.origemTipo === 'parcela' ? 'default' : 'secondary'}>
                                  {pagamento.origemTipo === 'parcela' 
                                    ? `Parcela ${pagamento.parcelaInfo?.numero}` 
                                    : 'Promissória'
                                  }
                                </Badge>
                                {pagamento.editado && (
                                  <Badge variant="destructive">
                                    Editado {pagamento.historicoEdicoes?.length || 1}x
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-sm text-muted-foreground">
                                <div><strong>Descrição:</strong> {pagamento.descricao}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditarPagamento(pagamento.id, pagamento.valor)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => confirmarExclusao(pagamento.id, pagamento.valor)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              
                              {onNavigateToPromissoria && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (pagamento.parcelaInfo && onNavigateToParcela) {
                                      onNavigateToParcela(pagamento.promissoriaInfo.id, pagamento.parcelaInfo.id);
                                    } else {
                                      onNavigateToPromissoria(pagamento.promissoriaInfo.id);
                                    }
                                  }}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Histórico de edições */}
                          {pagamento.historicoEdicoes && pagamento.historicoEdicoes.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <h5 className="font-medium text-sm mb-2">Histórico de Edições:</h5>
                              <div className="space-y-1">
                                {pagamento.historicoEdicoes.map((edicao, index) => (
                                  <div key={index} className="text-xs text-muted-foreground">
                                    <span className="font-medium">{new Date(edicao.data).toLocaleString('pt-BR')}:</span> {edicao.alteracao}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, pagamentoId: '', valor: 0 })}
        onConfirm={handleExcluirPagamento}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir este pagamento de R$ ${confirmDialog.valor.toFixed(2)}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
}
