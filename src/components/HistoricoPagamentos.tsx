import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { type Pagamento, type Promissoria, type OrdemPagamento, type FiltroPagamento } from '@/types';
import { formatarTipoPagamento } from '@/utils/paymentUtils';

interface HistoricoPagamentosProps {
  promissorias: Promissoria[];
  promissoriaId?: string;
  parcelaId?: string;
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
  subPagamentos?: Pagamento[];
}

/**
 * Componente para exibir o histórico de pagamentos de forma hierárquica
 * Agrupa pagamentos relacionados e melhora a legibilidade
 */
export function HistoricoPagamentos({
  promissorias,
  promissoriaId,
  parcelaId
}: HistoricoPagamentosProps) {
  const [ordem, setOrdem] = useState<OrdemPagamento>('data_desc');
  const [filtro, setFiltro] = useState<FiltroPagamento>('todos');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  // Agrupar pagamentos de forma hierárquica
  const extrairPagamentosAgrupados = (): PagamentoAgrupado[] => {
    let pagamentosAgrupados: PagamentoAgrupado[] = [];

    promissorias.forEach(promissoria => {
      if (promissoriaId && promissoria.id !== promissoriaId) return;

      // Pagamentos diretos da promissória (não de parcelas específicas)
      if (promissoria.pagamentos) {
        const pagamentosPromissoria = promissoria.pagamentos.filter(p => !p.parcelaId);
        
        pagamentosPromissoria.forEach(pagamento => {
          const dataVencimento = new Date(promissoria.dataLimite);
          const pagamentoData = new Date(pagamento.dataHora);
          
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
            subPagamentos: promissoria.parcelas ? 
              promissoria.parcelas
                .filter(parcela => parcela.pagamentos && parcela.pagamentos.length > 0)
                .flatMap(parcela => 
                  parcela.pagamentos!.map(p => ({
                    ...p,
                    descricao: `Parcela ${parcela.numero}/${promissoria.numeroParcelas} - R$ ${parcela.valor.toFixed(2)}`
                  }))
                ) : undefined
          });
        });
      }

      // Pagamentos de parcelas específicas (quando não há pagamento geral)
      if (promissoria.parcelas) {
        promissoria.parcelas.forEach(parcela => {
          if (parcelaId && parcela.id !== parcelaId) return;
          
          if (parcela.pagamentos && parcela.pagamentos.length > 0) {
            // Verificar se estes pagamentos já estão incluídos em algum pagamento de promissória
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
                      <span className="font-semibold">R$ {pagamento.valor.toFixed(2)}</span>
                      <Badge variant="outline">{pagamento.tipo}</Badge>
                      <Badge variant={pagamento.status === 'atrasado' ? 'destructive' : 'default'}>
                        {pagamento.status === 'atrasado' ? 'Pago com Atraso' : 'Pago no Prazo'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div><strong>Data:</strong> {new Date(pagamento.dataHora).toLocaleString('pt-BR')}</div>
                      <div><strong>Descrição:</strong> {pagamento.descricao}</div>
                    </div>
                  </div>
                  
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
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">R$ {subPagamento.valor.toFixed(2)}</span>
                          <Badge variant="outline">
                            {formatarTipoPagamento(subPagamento.tipo)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <div>{subPagamento.descricao}</div>
                          <div>Data: {new Date(subPagamento.dataHora).toLocaleString('pt-BR')}</div>
                          {subPagamento.observacoes && (
                            <div>Obs: {subPagamento.observacoes}</div>
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
