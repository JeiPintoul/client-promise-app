
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
              const dataVencimento = new Date(parcela.dataVencimento);
              const pagamentoData = new Date(pagamento.dataHora);
              
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
            const dataLimite = new Date(promissoria.dataLimite);
            const pagamentoData = new Date(pagamento.dataHora);
            
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

  const handleExcluirPagamento = (pagamentoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pagamento?')) {
      return;
    }

    const novasPromissorias = [...promissorias];
    let pagamentoEncontrado = false;
    let valorExcluido = 0;

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
                      <Badge variant="outline">{formatarTipoPagamento(pagamento.tipo)}</Badge>
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
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div><strong>Data:</strong> {new Date(pagamento.dataHora).toLocaleString('pt-BR')}</div>
                      <div><strong>Descrição:</strong> {pagamento.descricao}</div>
                      {pagamento.observacoes && (
                        <div><strong>Observações:</strong> {pagamento.observacoes}</div>
                      )}
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
      </CardContent>
    </Card>
  );
}
