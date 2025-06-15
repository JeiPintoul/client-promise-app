
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface Parcela {
  id: string;
  numero: number;
  valor: number;
  valorPago: number;
  dataVencimento: string;
  paga: boolean;
  pagoComAtraso?: boolean;
  status: 'pendente' | 'pago' | 'atrasado' | 'pago_com_atraso';
  pagamentos: Array<{
    id: string;
    valor: number;
    tipo: string;
    dataHora: string;
    descricao?: string;
    observacoes?: string;
  }>;
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

interface ParcelasPromissoriaProps {
  promissoria: Promissoria;
  onBack: () => void;
  onVerPagamentosParcela?: (parcela: Parcela, promissoria: Promissoria) => void;
}

export function ParcelasPromissoria({ promissoria, onBack, onVerPagamentosParcela }: ParcelasPromissoriaProps) {
  const [showParcelas, setShowParcelas] = useState(false);

  const getStatusColor = (parcela: Parcela) => {
    if (parcela.paga) return 'bg-green-500';
    
    const hoje = new Date();
    const vencimento = new Date(parcela.dataVencimento);
    
    if (vencimento < hoje) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStatusText = (parcela: Parcela) => {
    if (parcela.paga) return 'Pago';
    
    const hoje = new Date();
    const vencimento = new Date(parcela.dataVencimento);
    
    if (vencimento < hoje) return 'Atrasado';
    return 'Pendente';
  };

  const getBadgeVariant = (parcela: Parcela) => {
    if (parcela.paga) return 'default' as const;
    
    const hoje = new Date();
    const vencimento = new Date(parcela.dataVencimento);
    
    if (vencimento < hoje) return 'destructive' as const;
    return 'secondary' as const;
  };

  // Para parcela única, sempre mostrar por padrão
  const isParcelas = promissoria.parcelado && promissoria.numeroParcelas && promissoria.numeroParcelas > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-2xl font-bold">
          Promissória - R$ {promissoria.valor.toFixed(2)}
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Promissória</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <strong>Valor Total:</strong> R$ {promissoria.valor.toFixed(2)}
            </div>
            <div>
              <strong>Data de Emissão:</strong> {new Date(promissoria.dataEmissao).toLocaleDateString('pt-BR')}
            </div>
            <div>
              <strong>Data Limite:</strong> {new Date(promissoria.dataLimite).toLocaleDateString('pt-BR')}
            </div>
          </div>
          
          <div>
            <strong>Tipo:</strong> {isParcelas
              ? `Parcelado em ${promissoria.numeroParcelas}x de R$ ${(promissoria.valor / (promissoria.numeroParcelas || 1)).toFixed(2)}`
              : 'Pagamento único'
            }
          </div>
          
          {promissoria.observacoes && (
            <div>
              <strong>Observações:</strong> {promissoria.observacoes}
            </div>
          )}
        </CardContent>
      </Card>

      {promissoria.parcelas && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {isParcelas ? 'Parcelas' : 'Detalhes do Pagamento'}
              </CardTitle>
              {isParcelas && (
                <Button
                  variant="outline"
                  onClick={() => setShowParcelas(!showParcelas)}
                >
                  {showParcelas ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Ocultar Parcelas
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Exibir Parcelas
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          
          {(showParcelas || !isParcelas) && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isParcelas ? 'Parcela' : 'Item'}</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promissoria.parcelas.map((parcela) => (
                    <TableRow key={parcela.id}>
                      <TableCell>
                        {isParcelas ? parcela.numero : 'Pagamento único'}
                      </TableCell>
                      <TableCell>R$ {parcela.valor.toFixed(2)}</TableCell>
                      <TableCell>
                        {new Date(parcela.dataVencimento).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(parcela)}>
                          {getStatusText(parcela)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {parcela.pagamentos && parcela.pagamentos.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (onVerPagamentosParcela) {
                                onVerPagamentosParcela(parcela, promissoria);
                              } else {
                                console.log('Navegar para pagamentos da parcela:', parcela.id);
                              }
                            }}
                          >
                            Ver Pagamentos ({parcela.pagamentos.length})
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
