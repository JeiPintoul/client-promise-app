
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from './ConfirmDialog';
import { type Parcela, type Promissoria, type Pagamento } from '@/types';
import { formatarTipoPagamento } from '@/utils/paymentUtils';

interface DetalhePagamentoParcelaProps {
  parcela: Parcela;
  promissoria: Promissoria;
  onBack: () => void;
  onPagamentoAtualizado?: (promissoriasAtualizadas: Promissoria[]) => void;
}

export function DetalhePagamentoParcela({
  parcela,
  promissoria,
  onBack,
  onPagamentoAtualizado
}: DetalhePagamentoParcelaProps) {
  const [editandoPagamento, setEditandoPagamento] = useState<string | null>(null);
  const [valorEdicao, setValorEdicao] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    pagamentoId: string;
    valor: number;
  }>({ isOpen: false, pagamentoId: '', valor: 0 });
  
  const { toast } = useToast();

  const handleEditarPagamento = (pagamentoId: string, valorAtual: number) => {
    setEditandoPagamento(pagamentoId);
    setValorEdicao(valorAtual.toString());
  };

  const handleSalvarEdicao = (pagamentoId: string) => {
    const novoValor = parseFloat(valorEdicao);
    
    if (novoValor <= 0) {
      toast({
        title: "Erro",
        description: "O valor deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    // Atualizar o pagamento na parcela
    const pagamentosAtualizados = parcela.pagamentos.map(pagamento => {
      if (pagamento.id === pagamentoId) {
        const valorAnterior = pagamento.valor;
        return {
          ...pagamento,
          valor: novoValor,
          editado: true,
          historicoEdicoes: [
            ...(pagamento.historicoEdicoes || []),
            {
              data: new Date().toISOString(),
              alteracao: `Valor alterado de R$ ${valorAnterior.toFixed(2)} para R$ ${novoValor.toFixed(2)}`,
              valorAnterior,
              valorNovo: novoValor
            }
          ]
        };
      }
      return pagamento;
    });

    // Recalcular valor pago da parcela
    const novoValorPagoParcela = pagamentosAtualizados.reduce((acc, p) => acc + p.valor, 0);
    const parcelaAtualizada = {
      ...parcela,
      valorPago: novoValorPagoParcela,
      paga: novoValorPagoParcela >= parcela.valor,
      pagamentos: pagamentosAtualizados
    };

    if (onPagamentoAtualizado) {
      // Simular atualização da promissória
      const promissoriaAtualizada = {
        ...promissoria,
        parcelas: promissoria.parcelas?.map(p => 
          p.id === parcela.id ? parcelaAtualizada : p
        )
      };
      
      onPagamentoAtualizado([promissoriaAtualizada]);
    }

    toast({
      title: "Sucesso",
      description: "Pagamento editado com sucesso!",
    });

    setEditandoPagamento(null);
    setValorEdicao('');
  };

  const confirmarExclusao = (pagamentoId: string, valor: number) => {
    setConfirmDialog({
      isOpen: true,
      pagamentoId,
      valor
    });
  };

  const handleExcluirPagamento = () => {
    const { pagamentoId } = confirmDialog;
    const pagamentosAtualizados = parcela.pagamentos.filter(p => p.id !== pagamentoId);
    const novoValorPagoParcela = pagamentosAtualizados.reduce((acc, p) => acc + p.valor, 0);
    
    const parcelaAtualizada = {
      ...parcela,
      valorPago: novoValorPagoParcela,
      paga: novoValorPagoParcela >= parcela.valor,
      pagamentos: pagamentosAtualizados
    };

    if (onPagamentoAtualizado) {
      const promissoriaAtualizada = {
        ...promissoria,
        parcelas: promissoria.parcelas?.map(p => 
          p.id === parcela.id ? parcelaAtualizada : p
        )
      };
      
      onPagamentoAtualizado([promissoriaAtualizada]);
    }

    toast({
      title: "Sucesso",
      description: `Pagamento de R$ ${confirmDialog.valor.toFixed(2)} excluído com sucesso!`,
    });

    setConfirmDialog({ isOpen: false, pagamentoId: '', valor: 0 });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Pagamentos - {parcela.numero === 1 && !promissoria.parcelado ? 'Parcela Única' : `Parcela ${parcela.numero}`}
            </h1>
            <p className="text-muted-foreground">
              Valor da parcela: R$ {parcela.valor.toFixed(2)} | 
              Pago: R$ {parcela.valorPago.toFixed(2)} | 
              Restante: R$ {(parcela.valor - parcela.valorPago).toFixed(2)}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {parcela.pagamentos.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum pagamento registrado para esta parcela.
              </p>
            ) : (
              <div className="space-y-3">
                {parcela.pagamentos.map((pagamento) => (
                  <div key={pagamento.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {editandoPagamento === pagamento.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={valorEdicao}
                                onChange={(e) => setValorEdicao(e.target.value)}
                                className="w-32"
                                autoFocus
                              />
                              <Button size="sm" onClick={() => handleSalvarEdicao(pagamento.id)}>
                                Salvar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditandoPagamento(null)}>
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <span className="font-semibold">R$ {pagamento.valor.toFixed(2)}</span>
                          )}
                          <Badge variant="outline">{formatarTipoPagamento(pagamento.tipo)}</Badge>
                          {pagamento.editado && (
                            <Badge variant="destructive">
                              Editado {pagamento.historicoEdicoes?.length || 1}x
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div><strong>Data:</strong> {new Date(pagamento.dataHora).toLocaleString('pt-BR')}</div>
                          <div><strong>Descrição:</strong> {pagamento.descricao}</div>
                          {pagamento.observacoes && (
                            <div><strong>Observações:</strong> {pagamento.observacoes}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditarPagamento(pagamento.id, pagamento.valor)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmarExclusao(pagamento.id, pagamento.valor)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Histórico de edições */}
                    {pagamento.historicoEdicoes && pagamento.historicoEdicoes.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <h5 className="font-medium text-sm mb-2">Histórico de Edições:</h5>
                        <div className="space-y-1">
                          {pagamento.historicoEdicoes.map((edicao, index) => (
                            <div key={index} className="text-xs text-muted-foreground">
                              <span className="font-medium">{new Date(edicao.data).toLocaleString('pt-BR')}:</span> {edicao.alteracao}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, pagamentoId: '', valor: 0 })}
        onConfirm={handleExcluirPagamento}
        title="Confirmar Exclusão"
        description={`Tem certeza que deseja excluir este pagamento de R$ ${confirmDialog.valor.toFixed(2)}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
      />
    </>
  );
}
