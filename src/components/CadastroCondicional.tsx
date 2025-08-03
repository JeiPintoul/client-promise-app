import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useCondicionais } from '@/hooks/useCondicionais';
import { useToast } from '@/hooks/use-toast';

interface CadastroCondicionalProps {
  clienteId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ItemCondicional {
  descricao: string;
  valor: number;
}

export function CadastroCondicional({ clienteId, onSuccess, onCancel }: CadastroCondicionalProps) {
  const [loading, setLoading] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [dataRetornoEsperada, setDataRetornoEsperada] = useState('');
  const [itens, setItens] = useState<ItemCondicional[]>([
    { descricao: '', valor: 0 }
  ]);

  const { createCondicional } = useCondicionais();
  const { toast } = useToast();

  const adicionarItem = () => {
    setItens([...itens, { descricao: '', valor: 0 }]);
  };

  const removerItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const atualizarItem = (index: number, campo: keyof ItemCondicional, valor: string | number) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    setItens(novosItens);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (!dataRetornoEsperada) {
        toast({
          title: "Erro",
          description: "A data de retorno esperada é obrigatória",
          variant: "destructive"
        });
        return;
      }

      const itensValidos = itens.filter(item => item.descricao.trim() && item.valor > 0);
      if (itensValidos.length === 0) {
        toast({
          title: "Erro",
          description: "É necessário adicionar pelo menos um item válido",
          variant: "destructive"
        });
        return;
      }

      const novoCondicional = {
        clienteId,
        dataSaida: new Date().toISOString().split('T')[0],
        dataRetornoEsperada,
        observacoes: observacoes.trim() || undefined,
        itens: itensValidos
      };

      await createCondicional(novoCondicional);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar condicional",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova Condicional</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataRetorno">Data de Retorno Esperada</Label>
            <Input
              id="dataRetorno"
              type="date"
              value={dataRetornoEsperada}
              onChange={(e) => setDataRetornoEsperada(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={adicionarItem}
              >
                <Plus className="h-4 w-4" />
                Adicionar Item
              </Button>
            </div>

            {itens.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={item.descricao}
                      onChange={(e) => atualizarItem(index, 'descricao', e.target.value)}
                      placeholder="Descrição do produto"
                      required
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      value={item.valor || ''}
                      onChange={(e) => atualizarItem(index, 'valor', parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  {itens.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removerItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Criando...' : 'Criar Condicional'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}