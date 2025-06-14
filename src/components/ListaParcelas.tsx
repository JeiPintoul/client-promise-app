
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, CreditCard, Eye } from 'lucide-react';
import { type Promissoria, type Parcela } from '@/types';
import { formatarStatus } from '@/utils/paymentUtils';

interface ListaParcelasProps {
  promissoria: Promissoria;
  onPagarParcela: (parcelaId: string, valorSugerido: number) => void;
  onVerPagamentos?: (parcelaId: string) => void;
}

export function ListaParcelas({ promissoria, onPagarParcela, onVerPagamentos }: ListaParcelasProps) {
  const [expanded, setExpanded] = useState(false);

  if (!promissoria.parcelas || promissoria.parcelas.length === 0) {
    return null;
  }

  const getStatusBadge = (parcela: Parcela) => {
    const variants = {
      pendente: 'outline' as const,
      pago: 'default' as const,
      atrasado: 'destructive' as const,
      pago_com_atraso: 'secondary' as const
    };

    return (
      <Badge variant={variants[parcela.status]}>
        {formatarStatus(parcela.status)}
      </Badge>
    );
  };

  const hoje = new Date().toISOString().split('T')[0];

  return (
    <div className="border-t pt-4">
      <Button
        variant="ghost"
        onClick={() => setExpanded(!expanded)}
        className="w-full justify-between p-2"
      >
        <span>
          {expanded ? 'Ocultar' : 'Exibir'} Parcelas ({promissoria.parcelas.length})
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </Button>

      {expanded && (
        <div className="mt-4 space-y-3">
          {promissoria.parcelas.map((parcela) => {
            const valorDevido = parcela.valor - (parcela.valorPago || 0);
            const temPagamentos = parcela.pagamentos && parcela.pagamentos.length > 0;
            const vencimento = new Date(parcela.dataVencimento).toISOString().split('T')[0];
            const atrasada = hoje > vencimento && !parcela.paga;

            return (
              <div key={parcela.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium">Parcela {parcela.numero}</span>
                      {getStatusBadge(parcela)}
                      {atrasada && (
                        <Badge variant="destructive">Atrasada</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-muted-foreground">
                      <div>
                        <strong>Valor:</strong> R$ {parcela.valor.toFixed(2)}
                      </div>
                      <div>
                        <strong>Pago:</strong> <span className="text-green-600 dark:text-green-400">R$ {(parcela.valorPago || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <strong>Restante:</strong> <span className="text-red-600 dark:text-red-400">R$ {valorDevido.toFixed(2)}</span>
                      </div>
                      <div>
                        <strong>Vencimento:</strong> {new Date(parcela.dataVencimento).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {temPagamentos && onVerPagamentos && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onVerPagamentos(parcela.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Pagamentos
                      </Button>
                    )}
                    {valorDevido > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPagarParcela(parcela.id, valorDevido)}
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
