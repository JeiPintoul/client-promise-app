import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataPagination } from "@/components/ui/data-pagination";
import { DataFilters, FilterField } from "@/components/ui/data-filters";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Receipt, 
  Undo, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Banknote,
  Smartphone,
  FileText
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Cliente, Pagamento } from "@/types";

interface TransacaoComCliente extends Pagamento {
  cliente?: Cliente;
  estornado?: boolean;
}

export function HistoricoTransacoes() {
  const { toast } = useToast();
  const [transacoes, setTransacoes] = useState<TransacaoComCliente[]>([]);
  const [filteredTransacoes, setFilteredTransacoes] = useState<TransacaoComCliente[]>([]);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Filtros
  const [filters, setFilters] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchTransacoes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transacoes, filters]);

  const fetchTransacoes = () => {
    try {
      const clientes: Cliente[] = JSON.parse(localStorage.getItem('clientes') || '[]');
      const todasTransacoes: TransacaoComCliente[] = [];

      clientes.forEach(cliente => {
        if (cliente.promissorias) {
          cliente.promissorias.forEach(promissoria => {
            // Pagamentos da promissória
            promissoria.pagamentos.forEach(pagamento => {
              todasTransacoes.push({
                ...pagamento,
                cliente,
                estornado: false
              });
            });

            // Pagamentos das parcelas
            if (promissoria.parcelas) {
              promissoria.parcelas.forEach(parcela => {
                parcela.pagamentos.forEach(pagamento => {
                  todasTransacoes.push({
                    ...pagamento,
                    cliente,
                    estornado: false
                  });
                });
              });
            }
          });
        }
      });

      // Ordenar por data (mais recente primeiro)
      todasTransacoes.sort((a, b) => 
        new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
      );

      setTransacoes(todasTransacoes);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico de transações",
        variant: "destructive",
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...transacoes];

    // Filtro por cliente
    if (filters.cliente) {
      filtered = filtered.filter(transacao => 
        transacao.cliente?.nome.toLowerCase().includes(filters.cliente.toLowerCase()) ||
        transacao.cliente?.cpf.includes(filters.cliente)
      );
    }

    // Filtro por tipo de pagamento
    if (filters.tipo) {
      filtered = filtered.filter(transacao => transacao.tipo === filters.tipo);
    }

    // Filtro por intervalo de datas
    if (filters.dataRange?.from) {
      filtered = filtered.filter(transacao => 
        new Date(transacao.dataHora) >= filters.dataRange.from
      );
    }
    if (filters.dataRange?.to) {
      filtered = filtered.filter(transacao => 
        new Date(transacao.dataHora) <= filters.dataRange.to
      );
    }

    // Filtro por status (estornado/ativo)
    if (filters.status) {
      filtered = filtered.filter(transacao => {
        if (filters.status === 'ativo') return !transacao.estornado;
        if (filters.status === 'estornado') return transacao.estornado;
        return true;
      });
    }

    setFilteredTransacoes(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleEstornarPagamento = (transacao: TransacaoComCliente) => {
    try {
      // Simular estorno - na implementação real seria uma chamada à API
      const updatedTransacoes = transacoes.map(t => 
        t.id === transacao.id ? { ...t, estornado: true } : t
      );
      setTransacoes(updatedTransacoes);

      toast({
        title: "Pagamento Estornado",
        description: `Pagamento de ${formatCurrency(transacao.valor)} foi estornado com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao estornar pagamento",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPaymentIcon = (tipo: string) => {
    switch (tipo) {
      case 'pix': return <Smartphone className="h-4 w-4" />;
      case 'cartao': return <CreditCard className="h-4 w-4" />;
      case 'dinheiro': return <Banknote className="h-4 w-4" />;
      case 'cheque': return <FileText className="h-4 w-4" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  const getPaymentLabel = (tipo: string) => {
    switch (tipo) {
      case 'pix': return 'PIX';
      case 'cartao': return 'Cartão';
      case 'dinheiro': return 'Dinheiro';
      case 'cheque': return 'Cheque';
      default: return tipo;
    }
  };

  // Filtros disponíveis
  const filterFields: FilterField[] = [
    {
      key: 'cliente',
      label: 'Cliente',
      type: 'text',
      placeholder: 'Nome ou CPF do cliente...',
      value: filters.cliente
    },
    {
      key: 'tipo',
      label: 'Tipo de Pagamento',
      type: 'select',
      placeholder: 'Selecionar tipo',
      options: [
        { value: 'pix', label: 'PIX' },
        { value: 'cartao', label: 'Cartão' },
        { value: 'dinheiro', label: 'Dinheiro' },
        { value: 'cheque', label: 'Cheque' }
      ],
      value: filters.tipo
    },
    {
      key: 'dataRange',
      label: 'Período',
      type: 'dateRange',
      value: filters.dataRange
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'Selecionar status',
      options: [
        { value: 'ativo', label: 'Ativos' },
        { value: 'estornado', label: 'Estornados' }
      ],
      value: filters.status
    }
  ];

  // Paginação
  const totalItems = filteredTransacoes.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentTransacoes = filteredTransacoes.slice(startIndex, endIndex);

  // Estatísticas
  const totalReceitas = filteredTransacoes
    .filter(t => !t.estornado)
    .reduce((sum, t) => sum + t.valor, 0);
  const totalEstornos = filteredTransacoes
    .filter(t => t.estornado)
    .reduce((sum, t) => sum + t.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Histórico de Transações</h1>
            <p className="text-muted-foreground">Registos de pagamentos e estornos</p>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Receitas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Estornos</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalEstornos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
                <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Transações</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <DataFilters
            fields={filterFields}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transações ({totalItems})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentTransacoes.map((transacao) => (
            <div
              key={transacao.id}
              className={`flex items-center justify-between p-4 border rounded-lg ${
                transacao.estornado ? 'bg-destructive/5 border-destructive/20' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {getPaymentIcon(transacao.tipo)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{transacao.cliente?.nome}</h3>
                    <Badge variant="outline">
                      {getPaymentLabel(transacao.tipo)}
                    </Badge>
                    {transacao.estornado && (
                      <Badge variant="destructive">Estornado</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(transacao.dataHora), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {transacao.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">{transacao.descricao}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    transacao.estornado ? 'text-destructive line-through' : 'text-primary'
                  }`}>
                    {formatCurrency(transacao.valor)}
                  </p>
                </div>

                {!transacao.estornado && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Undo className="w-4 h-4 mr-2" />
                        Estornar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Estornar Pagamento</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja estornar este pagamento de {formatCurrency(transacao.valor)}? 
                          Esta ação irá reverter o pagamento e ajustar o saldo do cliente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleEstornarPagamento(transacao)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Estornar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}

          {currentTransacoes.length === 0 && (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma transação encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <DataPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}