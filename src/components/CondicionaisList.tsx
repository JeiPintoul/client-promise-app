import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Package, MapPin, Clock } from 'lucide-react';
import { useCondicionais } from '@/hooks/useCondicionais';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Condicional } from '@/api/services/condicionalService';

interface CondicionaisListProps {
  clienteId?: string;
  onSelectCondicional?: (condicional: Condicional) => void;
}

export function CondicionaisList({ clienteId, onSelectCondicional }: CondicionaisListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filters = clienteId ? { clienteId } : {};
  const pagination = { page: currentPage, size: pageSize };

  const { data, loading, error } = useCondicionais(filters, pagination);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'em_aberto':
        return <Badge variant="default">Em Aberto</Badge>;
      case 'finalizado':
        return <Badge variant="secondary">Finalizado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const calcularValorTotal = (condicional: Condicional) => {
    return condicional.itens.reduce((total, item) => total + item.valor, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p>Carregando condicionais...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Erro ao carregar condicionais: {error}</p>
      </div>
    );
  }

  if (!data?.content.length) {
    return (
      <div className="text-center py-8">
        <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhuma condicional encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.content.map((condicional) => (
        <Card key={condicional.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  Condicional #{condicional.id.substring(0, 8)}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Saída: {format(new Date(condicional.dataSaida), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Retorno: {format(new Date(condicional.dataRetornoEsperada), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                </div>
              </div>
              {getStatusBadge(condicional.status)}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Itens ({condicional.itens.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {condicional.itens.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="truncate flex-1">{item.descricao}</span>
                      <span className="font-medium ml-2">
                        R$ {item.valor.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Valor Total:</span>
                  <span className="font-bold">
                    R$ {calcularValorTotal(condicional).toFixed(2)}
                  </span>
                </div>
                
                {condicional.observacoes && (
                  <div>
                    <span className="font-medium text-sm">Observações:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {condicional.observacoes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {onSelectCondicional && (
              <div className="flex justify-end pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => onSelectCondicional(condicional)}
                >
                  Ver Detalhes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {data.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          
          <span className="px-4 py-2 text-sm">
            Página {currentPage} de {data.totalPages}
          </span>
          
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.min(data.totalPages, prev + 1))}
            disabled={currentPage === data.totalPages}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}