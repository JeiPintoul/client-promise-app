import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Package, Check, X, ArrowLeft } from 'lucide-react';
import { Condicional, FinalizarCondicionalRequest } from '@/api/services/condicionalService';
import { useCondicionais } from '@/hooks/useCondicionais';
import { useToast } from '@/hooks/use-toast';

interface FinalizarCondicionalProps {
  condicional: Condicional;
  onBack: () => void;
  onSuccess: () => void;
}

export function FinalizarCondicional({ condicional, onBack, onSuccess }: FinalizarCondicionalProps) {
  const [loading, setLoading] = useState(false);
  const [statusItens, setStatusItens] = useState<Record<string, 'devolvido' | 'vendido'>>(
    condicional.itens.reduce((acc, item) => {
      if (item.id) {
        acc[item.id] = 'devolvido';
      }
      return acc;
    }, {} as Record<string, 'devolvido' | 'vendido'>)
  );

  const { finalizarCondicional } = useCondicionais();
  const { toast } = useToast();

  const handleStatusChange = (itemId: string, status: 'devolvido' | 'vendido') => {
    setStatusItens(prev => ({
      ...prev,
      [itemId]: status
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const itensParaFinalizar = Object.entries(statusItens).map(([id, status]) => ({
        id,
        status
      }));

      const request: FinalizarCondicionalRequest = {
        itens: itensParaFinalizar
      };

      await finalizarCondicional(condicional.id, request);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao finalizar condicional",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularResumo = () => {
    const vendidos = Object.values(statusItens).filter(status => status === 'vendido').length;
    const devolvidos = Object.values(statusItens).filter(status => status === 'devolvido').length;
    const valorVendido = condicional.itens
      .filter(item => item.id && statusItens[item.id] === 'vendido')
      .reduce((total, item) => total + item.valor, 0);

    return { vendidos, devolvidos, valorVendido };
  };

  const resumo = calcularResumo();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Finalizar Condicional</h2>
          <p className="text-muted-foreground">
            Defina o status de cada item da condicional
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{resumo.vendidos}</div>
            <div className="text-sm text-muted-foreground">Itens Vendidos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{resumo.devolvidos}</div>
            <div className="text-sm text-muted-foreground">Itens Devolvidos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              R$ {resumo.valorVendido.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Valor Vendido</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Itens da Condicional</h3>
        
        {condicional.itens.map((item, index) => (
          <Card key={item.id || index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{item.descricao}</h4>
                  <p className="text-sm text-muted-foreground">
                    Valor: R$ {item.valor.toFixed(2)}
                  </p>
                </div>
                
                {item.id && (
                  <div className="flex items-center gap-4">
                    <RadioGroup
                      value={statusItens[item.id]}
                      onValueChange={(value) => handleStatusChange(item.id!, value as 'devolvido' | 'vendido')}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="devolvido" id={`devolvido-${item.id}`} />
                        <Label htmlFor={`devolvido-${item.id}`} className="flex items-center gap-2">
                          <X className="h-4 w-4 text-blue-600" />
                          Devolvido
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="vendido" id={`vendido-${item.id}`} />
                        <Label htmlFor={`vendido-${item.id}`} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          Vendido
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    <Badge 
                      variant={statusItens[item.id] === 'vendido' ? 'default' : 'secondary'}
                      className={statusItens[item.id] === 'vendido' ? 'bg-green-600' : 'bg-blue-600'}
                    >
                      {statusItens[item.id] === 'vendido' ? 'Vendido' : 'Devolvido'}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Finalizando...' : 'Finalizar Condicional'}
        </Button>
      </div>
    </div>
  );
}