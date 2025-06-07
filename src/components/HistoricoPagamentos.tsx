
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, ExternalLink, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

interface PagamentoAgrupado {
  id: string;
  valor: number;
  tipo: string;
  dataHora: string;
  observacoes?: string;
  descricao: string;
  status: 'no_tempo' | 'atrasado';
  promissoriaInfo: {
    id: string;
    valor: number;
  };
  parcelaInfo?: {
    id: string;
    numero: number;
  };
  subPagamentos?: (Pagamento & { parcelaInfo?: { id: string; numero: number } })[];
  editado?: boolean;
  historicoEdicoes?: Array<{
    data: string;
    alteracao: string;
    valorAnterior?: number;
    valorNovo?: number;
  }>;
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
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [editandoPagamento, setEditandoPagamento] = useState<string | null>(null);
  const [valorEdicao, setValorEdicao] = useState('');
  
  const { toast } = useToast();

  const extrairPagamentosAgrupados = (): PagamentoAgrupado[] => {
    let pagamentosAgrupados: PagamentoAgrupado[] = [];

    promissorias.forEach(promissoria => {
      if (promissoriaId && promissoria.id !== promissoriaId) return;

      // Pagamentos diretos da promissória
      if (promissoria.pagamentos) {
        const pagamentosPromissoria = promissoria.pagamentos.filter(p => !p.parcelaId);
        
        pagamentosPromissoria.forEach(pagamento => {
          const dataVencimento = new Date(promissoria.dataLimite);
          const pagamentoData = new Date(pagamento.dataHora);
          
          // Buscar sub-pagamentos (pagamentos de parcelas relacionados)
          const subPagamentos = promissoria.parcelas ? 
            promissoria.parcelas
              .filter(parcela => parcela.pagamentos && parcela.pagamentos.length > 0)
              .flatMap(parcela => 
                parcela.pagamentos!
                  .filter(p => new Date(p.dataHora).getTime() === pagamentoData.getTime())
                  .map(p => ({
                    ...p,
                    parcelaInfo: { id: parcela.id, numero: parcela.numero }
                  }))
              ) : undefined;
          
          pagamentosAgrupados.push({
            id: pagamento.id,
            valor: pagamento.valor,
            tipo: formatarTipoPagamento(pagamento.tipo),
            dataHora: pagamento.dataHora,
            observacoes: pagamento.observacoes,
            descricao: pagamento.descricao || `Pagamento de promissória completa - R$ ${promissoria.valor.toFixed(2)}`,
            status: pagamentoData > dataVencimento ? 'atrasado' : 'no_tempo',
            promissoriaInfo: {
              id: promissoria.id,
              valor: promissoria.valor
            },
            subPagamentos: subPagamentos && subPagamentos.length > 0 ? subPagamentos : undefined
          });
        });
      }

      // Pagamentos de parcelas específicas (não incluídos em pagamentos gerais)
      if (promissoria.parcelas) {
        promissoria.parcelas.forEach(parcela => {
          if (parcelaId && parcela.id !== parcelaId) return;
          
          if (parcela.pagamentos && parcela.pagamentos.length > 0) {
            const pagamentosNaoIncluidos = parcela.pagamentos.filter(pagamentoParcela => 
              !pagamentosAgrupados.some(grupo => 
                grupo.subPagamentos?.some(sub => sub.id === pagamentoParcela.id)
              )
            );

            pagamentosNaoIncluidos.forEach(pagamento => {
              const dataVencimento = new Date(parcela.dataVencimento);
              const pagamentoData = new Date(pagamento.dataHora);
              
              pagamentosAgrupados.push({
                id: pagamento.id,
                valor: pagamento.valor,
                tipo: formatarTipoPagamento(pagamento.tipo),
                dataHora: pagamento.dataHora,
                observacoes: pagamento.observacoes,
                descricao: pagamento.descricao || `Pagamento da parcela ${parcela.numero}/${promissoria.numeroParcelas} - R$ ${parcela.valor.toFixed(2)}`,
                status: pagamentoData > dataVencimento ? 'atrasado' : 'no_tempo',
                promissoriaInfo: {
                  id: promissoria.id,
                  valor: promissoria.valor
                },
                parcelaInfo: {
                  id: parcela.id,
                  numero: parcela.numero
                }
              });
            });
          }
        });
      }
    });

    return pagamentosAgrupados;
  };

  const pagamentosAgrupados = extrairPagamentosAgrupados();

  // Aplicar filtros
  const pagamentosFiltrados = pagamentosAgrupados.filter(pagamento => {
    if (filtro === 'todos') return true;
    if (filtro === 'atrasados') return pagamento.status === 'atrasado';
    if (filtro === 'no_tempo') return pagamento.status === 'no_tempo';
    return true;
  });

  // Aplicar ordenação
  const pagamentosOrdenados = [...pagamentosFiltrados].sort((a, b) => {
    switch (ordem) {
      case 'data_asc':
        return new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime();
      case 'data_desc':
        return new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime();
      case 'valor_asc':
        return a.valor - b.valor;
      case 'valor_desc':
        return b.valor - a.valor;
      default:
        return 0;
    }
  });

  const toggleExpansao = (pagamentoId: string) => {
    const novosExpandidos = new Set(expandidos);
    if (novosExpandidos.has(pagamentoId)) {
      novosExpandidos.delete(pagamentoId);
    } else {
      novosExpandidos.add(pagamentoId);
    }
    setExpandidos(novosExpandidos);
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

    // Encontrar e atualizar o pagamento
    const novasPromissorias = [...promissorias];
    let pagamentoEncontrado = false;
    let valorAnterior = 0;

    novasPromissorias.forEach(promissoria => {
      // Verificar pagamentos da promissória
      if (promissoria.pagamentos) {
        const pagamentoIndex = promissoria.pagamentos.findIndex(p => p.id === pagamentoId);
        if (pagamentoIndex !== -1) {
          valorAnterior = promissoria.pagamentos[pagamentoIndex].valor;
          const diferenca = novoValor - valorAnterior;
          
          promissoria.pagamentos[pagamentoIndex].valor = novoValor;
          promissoria.pagamentos[pagamentoIndex].descricao = 
            (promissoria.pagamentos[pagamentoIndex].descricao || '') + ` [EDITADO: R$ ${valorAnterior.toFixed(2)} → R$ ${novoValor.toFixed(2)}]`;
          
          promissoria.valorPago = (promissoria.valorPago || 0) + diferenca;
          promissoria.updated_at = new Date().toISOString();
          pagamentoEncontrado = true;
        }
      }

      // Verificar pagamentos das parcelas
      if (promissoria.parcelas) {
        promissoria.parcelas.forEach(parcela => {
          if (parcela.pagamentos) {
            const pagamentoIndex = parcela.pagamentos.findIndex(p => p.id === pagamentoId);
            if (pagamentoIndex !== -1) {
              valorAnterior = parcela.pagamentos[pagamentoIndex].valor;
              const diferenca = novoValor - valorAnterior;
              
              parcela.pagamentos[pagamentoIndex].valor = novoValor;
              parcela.pagamentos[pagamentoIndex].descricao = 
                (parcela.pagamentos[pagamentoIndex].descricao || '') + ` [EDITADO: R$ ${valorAnterior.toFixed(2)} → R$ ${novoValor.toFixed(2)}]`;
              
              parcela.valorPago = (parcela.valorPago || 0) + diferenca;
              promissoria.valorPago = (promissoria.valorPago || 0) + diferenca;
              promissoria.updated_at = new Date().toISOString();
              pagamentoEncontrado = true;
            }
          }
        });
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

  const handleExcluirPagamento = (pagamentoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) {
      return;
    }

    const novasPromissorias = [...promissorias];
    let pagamentoEncontrado = false;
    let valorExcluido = 0;

    novasPromissorias.forEach(promissoria => {
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
        {pagamentosOrdenados.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Nenhum pagamento encontrado.
          </p>
        ) : (
          <div className="space-y-3">
            {pagamentosOrdenados.map((pagamento) => (
              <div key={pagamento.id} className="border rounded-lg p-4">
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
                        <span className="font-semibold">R$ {pagamento.valor.toFixed(2)}</span>
                      )}
                      <Badge variant="outline">{pagamento.tipo}</Badge>
                      <Badge variant={pagamento.status === 'atrasado' ? 'destructive' : 'default'}>
                        {pagamento.status === 'atrasado' ? 'Pago com Atraso' : 'Pago no Prazo'}
                      </Badge>
                      {pagamento.editado && (
                        <Badge variant="secondary">Editado</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div><strong>Data:</strong> {new Date(pagamento.dataHora).toLocaleString('pt-BR')}</div>
                      <div><strong>Descrição:</strong> {pagamento.descricao}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Botões de ação */}
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
                      onClick={() => handleExcluirPagamento(pagamento.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    
                    {/* Botão de navegação */}
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
                    
                    {/* Botão de expansão */}
                    {pagamento.subPagamentos && pagamento.subPagamentos.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpansao(pagamento.id)}
                      >
                        {expandidos.has(pagamento.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        <span className="ml-1">
                          {pagamento.subPagamentos.length} parcela(s)
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
                
                {pagamento.observacoes && (
                  <div className="mt-2 text-sm">
                    <strong>Observações:</strong> {pagamento.observacoes}
                  </div>
                )}

                {/* Sub-pagamentos (parcelas) */}
                {expandidos.has(pagamento.id) && pagamento.subPagamentos && (
                  <div className="mt-4 pt-3 border-t space-y-3">
                    <h5 className="font-medium text-sm">Detalhes por Parcela:</h5>
                    {pagamento.subPagamentos.map((subPagamento) => (
                      <div key={subPagamento.id} className="ml-4 p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">R$ {subPagamento.valor.toFixed(2)}</span>
                              <Badge variant="outline">
                                {formatarTipoPagamento(subPagamento.tipo)}
                              </Badge>
                              {subPagamento.parcelaInfo && (
                                <Badge variant="secondary">
                                  Parcela {subPagamento.parcelaInfo.numero}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <div>{subPagamento.descricao}</div>
                              <div>Data: {new Date(subPagamento.dataHora).toLocaleString('pt-BR')}</div>
                              {subPagamento.observacoes && (
                                <div>Obs: {subPagamento.observacoes}</div>
                              )}
                            </div>
                          </div>
                          
                          {subPagamento.parcelaInfo && onNavigateToParcela && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onNavigateToParcela!(pagamento.promissoriaInfo.id, subPagamento.parcelaInfo!.id)}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
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
  );
}
