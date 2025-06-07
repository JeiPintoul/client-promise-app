
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { type Pagamento, type Promissoria, type OrdemPagamento, type FiltroPagamento } from '@/types';
import { formatarTipoPagamento } from '@/utils/paymentUtils';

interface HistoricoPagamentosProps {
  promissorias: Promissoria[];
  promissoriaId?: string;
  parcelaId?: string;
}

/**
 * Componente para exibir o histórico de pagamentos
 * Suporta filtros por promissória, parcela e ordenação
 */
export function HistoricoPagamentos({
  promissorias,
  promissoriaId,
  parcelaId
}: HistoricoPagamentosProps) {
  const [ordem, setOrdem] = useState<OrdemPagamento>('data_desc');
  const [filtro, setFiltro] = useState<FiltroPagamento>('todos');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  // Extrair todos os pagamentos relevantes
  const extrairPagamentos = (): Pagamento[] => {
    let pagamentos: Pagamento[] = [];

    promissorias.forEach(promissoria => {
      // Se é para mostrar pagamentos de uma promissória específica
      if (promissoriaId && promissoria.id !== promissoriaId) return;

      // Pagamentos diretos da promissória
      if (promissoria.pagamentos) {
        promissoria.pagamentos.forEach(pagamento => {
          // Se é para mostrar pagamentos de uma parcela específica
          if (parcelaId && pagamento.parcelaId !== parcelaId) return;
          
          pagamentos.push({
            ...pagamento,
            promissoriaInfo: {
              id: promissoria.id,
              valor: promissoria.valor
            }
          } as any);
        });
      }

      // Pagamentos das parcelas
      if (promissoria.parcelas) {
        promissoria.parcelas.forEach(parcela => {
          // Se é para mostrar pagamentos de uma parcela específica
          if (parcelaId && parcela.id !== parcelaId) return;
          
          if (parcela.pagamentos) {
            parcela.pagamentos.forEach(pagamento => {
              pagamentos.push({
                ...pagamento,
                promissoriaInfo: {
                  id: promissoria.id,
                  valor: promissoria.valor
                },
                parcelaInfo: {
                  id: parcela.id,
                  numero: parcela.numero,
                  valor: parcela.valor,
                  dataVencimento: parcela.dataVencimento
                }
              } as any);
            });
          }
        });
      }
    });

    return pagamentos;
  };

  const pagamentos = extrairPagamentos();

  // Aplicar filtros
  const pagamentosFiltrados = pagamentos.filter(pagamento => {
    if (filtro === 'todos') return true;
    
    const dataVencimento = (pagamento as any).parcelaInfo?.dataVencimento || 
                          promissorias.find(p => p.id === pagamento.promissoriaId)?.dataLimite;
    
    if (!dataVencimento) return true;
    
    const vencimento = new Date(dataVencimento);
    const pagamentoData = new Date(pagamento.dataHora);
    
    if (filtro === 'atrasados') {
      return pagamentoData > vencimento;
    } else if (filtro === 'no_tempo') {
      return pagamentoData <= vencimento;
    }
    
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

  const getStatusPagamento = (pagamento: any) => {
    const dataVencimento = pagamento.parcelaInfo?.dataVencimento || 
                          promissorias.find(p => p.id === pagamento.promissoriaId)?.dataLimite;
    
    if (!dataVencimento) return 'no_tempo';
    
    const vencimento = new Date(dataVencimento);
    const pagamentoData = new Date(pagamento.dataHora);
    
    return pagamentoData > vencimento ? 'atrasado' : 'no_tempo';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Pagamentos</CardTitle>
        
        {/* Controles de filtro e ordenação */}
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
            {pagamentosOrdenados.map((pagamento: any) => (
              <div key={pagamento.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold">R$ {pagamento.valor.toFixed(2)}</span>
                      <Badge variant="outline">
                        {formatarTipoPagamento(pagamento.tipo)}
                      </Badge>
                      <Badge variant={getStatusPagamento(pagamento) === 'atrasado' ? 'destructive' : 'default'}>
                        {getStatusPagamento(pagamento) === 'atrasado' ? 'Pago com Atraso' : 'Pago no Prazo'}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <div>Data: {new Date(pagamento.dataHora).toLocaleString('pt-BR')}</div>
                      {pagamento.parcelaInfo && (
                        <div>Parcela {pagamento.parcelaInfo.numero} - Vencimento: {new Date(pagamento.parcelaInfo.dataVencimento).toLocaleDateString('pt-BR')}</div>
                      )}
                    </div>
                  </div>
                  
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
                  </Button>
                </div>
                
                {expandidos.has(pagamento.id) && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div><strong>Promissória:</strong> R$ {pagamento.promissoriaInfo.valor.toFixed(2)}</div>
                      {pagamento.parcelaInfo && (
                        <>
                          <div><strong>Parcela:</strong> {pagamento.parcelaInfo.numero}</div>
                          <div><strong>Valor da Parcela:</strong> R$ {pagamento.parcelaInfo.valor.toFixed(2)}</div>
                        </>
                      )}
                    </div>
                    {pagamento.observacoes && (
                      <div className="text-sm">
                        <strong>Observações:</strong> {pagamento.observacoes}
                      </div>
                    )}
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
