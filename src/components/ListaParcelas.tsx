
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import { type Parcela, type Promissoria } from '@/types';
import { formatarStatus, calcularStatusParcela } from '@/utils/paymentUtils';

interface ListaParcelasProps {
  promissoria: Promissoria;
  onPagarParcela: (parcelaId: string, valorSugerido: number) => void;
}

/**
 * Componente que exibe as parcelas de uma promissória de forma expansível
 * Permite visualizar status, valores e registrar pagamentos individuais
 */
export function ListaParcelas({ promissoria, onPagarParcela }: ListaParcelasProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!promissoria.parcelado || !promissoria.parcelas) {
    return null;
  }

  const getBadgeVariant = (parcela: Parcela) => {
    const status = calcularStatusParcela(parcela);
    
    switch (status) {
      case 'pago':
        return 'default' as const;
      case 'pago_com_atraso':
        return 'secondary' as const;
      case 'atrasado':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  const getStatusColor = (parcela: Parcela) => {
    const status = calcularStatusParcela(parcela);
    
    switch (status) {
      case 'pago':
        return 'text-green-600';
      case 'pago_com_atraso':
        return 'text-orange-600';
      case 'atrasado':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span>
            {isOpen ? 'Ocultar' : 'Exibir'} Parcelas ({promissoria.parcelas.length})
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-4">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parcela</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Valor Pago</TableHead>
                <TableHead>Restante</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promissoria.parcelas.map((parcela) => {
                const valorRestante = parcela.valor - (parcela.valorPago || 0);
                const status = calcularStatusParcela(parcela);
                
                return (
                  <TableRow key={parcela.id}>
                    <TableCell className="font-medium">{parcela.numero}</TableCell>
                    <TableCell>R$ {parcela.valor.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">
                      R$ {(parcela.valorPago || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className={valorRestante > 0 ? 'text-red-600' : 'text-green-600'}>
                      R$ {valorRestante.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {new Date(parcela.dataVencimento).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(parcela)}>
                        {formatarStatus(status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!parcela.paga && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPagarParcela(parcela.id, valorRestante)}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Resumo das parcelas */}
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Resumo das Parcelas</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total:</span>
              <div className="font-medium">
                {promissoria.parcelas.filter(p => p.paga).length} / {promissoria.parcelas.length}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Pendentes:</span>
              <div className="font-medium text-yellow-600">
                {promissoria.parcelas.filter(p => !p.paga && new Date(p.dataVencimento) >= new Date()).length}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Atrasadas:</span>
              <div className="font-medium text-red-600">
                {promissoria.parcelas.filter(p => !p.paga && new Date(p.dataVencimento) < new Date()).length}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Pagas:</span>
              <div className="font-medium text-green-600">
                {promissoria.parcelas.filter(p => p.paga).length}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
