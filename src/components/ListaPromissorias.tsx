
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FiltrosPromissorias } from './FiltrosPromissorias';
import { ParcelasPromissoria } from './ParcelasPromissoria';
import { DetalhePagamentoParcela } from './DetalhePagamentoParcela';
import { Edit, Trash2, CreditCard } from 'lucide-react';
import { type Promissoria, type Parcela, type Cliente } from '@/types';

export function ListaPromissorias() {
  const [todasPromissorias, setTodasPromissorias] = useState<(Promissoria & { clienteNome: string })[]>([]);
  const [promissoriasFiltratas, setPromissoriasFiltratas] = useState<(Promissoria & { clienteNome: string })[]>([]);
  const [promissoriaSelecionada, setPromissoriaSelecionada] = useState<Promissoria | null>(null);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<{
    parcela: Parcela;
    promissoria: Promissoria;
  } | null>(null);

  useEffect(() => {
    carregarPromissorias();
  }, []);

  const carregarPromissorias = () => {
    try {
      const clientes = JSON.parse(localStorage.getItem('clientes') || '[]') as Cliente[];
      const promissoriasComCliente: (Promissoria & { clienteNome: string })[] = [];
      
      clientes.forEach(cliente => {
        if (cliente.promissorias && cliente.promissorias.length > 0) {
          cliente.promissorias.forEach(promissoria => {
            promissoriasComCliente.push({
              ...promissoria,
              clienteNome: cliente.nome
            });
          });
        }
      });

      setTodasPromissorias(promissoriasComCliente);
      setPromissoriasFiltratas(promissoriasComCliente);
    } catch (error) {
      console.error('Erro ao carregar promissórias:', error);
      setTodasPromissorias([]);
      setPromissoriasFiltratas([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
      case 'pago_com_atraso':
        return 'bg-green-500';
      case 'atrasado':
        return 'bg-red-500';
      case 'pendente':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pago':
        return 'Pago';
      case 'pago_com_atraso':
        return 'Pago com Atraso';
      case 'atrasado':
        return 'Atrasado';
      case 'pendente':
        return 'Pendente';
      default:
        return status;
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'pago':
      case 'pago_com_atraso':
        return 'default' as const;
      case 'atrasado':
        return 'destructive' as const;
      case 'pendente':
        return 'secondary' as const;
      default:
        return 'secondary' as const;
    }
  };

  const handleVerPagamentosParcela = (parcela: Parcela, promissoria: Promissoria) => {
    setParcelaSelecionada({ parcela, promissoria });
  };

  if (parcelaSelecionada) {
    return (
      <DetalhePagamentoParcela
        parcela={parcelaSelecionada.parcela}
        promissoria={parcelaSelecionada.promissoria}
        onBack={() => setParcelaSelecionada(null)}
        onPagamentoAtualizado={carregarPromissorias}
      />
    );
  }

  if (promissoriaSelecionada) {
    return (
      <ParcelasPromissoria
        promissoria={promissoriaSelecionada}
        onBack={() => setPromissoriaSelecionada(null)}
        onVerPagamentosParcela={handleVerPagamentosParcela}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Promissórias</h1>
        <Button>
          Nova Promissória
        </Button>
      </div>

      <FiltrosPromissorias
        promissorias={todasPromissorias}
        onPromissoriasFiltradasChange={setPromissoriasFiltratas}
      />

      <div className="grid gap-4">
        {promissoriasFiltratas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {todasPromissorias.length === 0
              ? 'Nenhuma promissória cadastrada.'
              : 'Nenhuma promissória encontrada com os filtros aplicados.'}
          </div>
        ) : (
          promissoriasFiltratas.map((promissoria) => (
            <Card key={promissoria.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(promissoria.status)}`}
                      />
                      <h3 className="font-semibold text-lg">R$ {promissoria.valor.toFixed(2)}</h3>
                      <Badge variant={getBadgeVariant(promissoria.status)}>
                        {getStatusText(promissoria.status)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">({promissoria.clienteNome})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                      <div>
                        <strong>Emissão:</strong> {new Date(promissoria.dataEmissao).toLocaleDateString('pt-BR')}
                      </div>
                      <div>
                        <strong>Vencimento:</strong> {new Date(promissoria.dataLimite).toLocaleDateString('pt-BR')}
                      </div>
                      <div>
                        <strong>Valor Pago:</strong> R$ {(promissoria.valorPago || 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      <strong>Restante:</strong> R$ {(promissoria.valor - (promissoria.valorPago || 0)).toFixed(2)}
                    </div>
                    {promissoria.observacoes && (
                      <div className="text-sm text-gray-600 mt-1">
                        <strong>Observações:</strong> {promissoria.observacoes}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPromissoriaSelecionada(promissoria)}
                    >
                      <CreditCard className="w-4 h-4 mr-1" />
                      Ver Detalhes
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
