import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Cliente, Promissoria, Parcela, Pagamento } from "@/types";
import { TipoPagamento } from "@/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Zap, 
  Calculator, 
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";

interface PagamentoInteligenteProps {
  cliente: Cliente;
  onPagamentoRegistrado: () => void;
}

interface DevidaItem {
  tipo: 'promissoria' | 'parcela';
  id: string;
  promissoriaId: string;
  parcelaId?: string;
  valor: number;
  valorPendente: number;
  dataVencimento: string;
  diasAtraso: number;
  descricao: string;
}

export function PagamentoInteligente({ cliente, onPagamentoRegistrado }: PagamentoInteligenteProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [tipoPagamento, setTipoPagamento] = useState<keyof typeof TipoPagamento>("PIX");
  const [simulacao, setSimulacao] = useState<DevidaItem[]>([]);
  const [valorSimulacao, setValorSimulacao] = useState(0);

  const calcularDividasOrdenadas = (): DevidaItem[] => {
    const dividas: DevidaItem[] = [];
    
    if (!cliente.promissorias) return dividas;

    cliente.promissorias.forEach(promissoria => {
      const hoje = new Date();
      
      if (promissoria.parcelado && promissoria.parcelas) {
        // Adicionar parcelas pendentes
        promissoria.parcelas.forEach(parcela => {
          if (parcela.valorPago < parcela.valor) {
            const dataVencimento = new Date(parcela.dataVencimento);
            const diasAtraso = Math.max(0, Math.floor((hoje.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24)));
            
            dividas.push({
              tipo: 'parcela',
              id: parcela.id,
              promissoriaId: promissoria.id,
              parcelaId: parcela.id,
              valor: parcela.valor,
              valorPendente: parcela.valor - parcela.valorPago,
              dataVencimento: parcela.dataVencimento,
              diasAtraso,
              descricao: `Parcela ${parcela.numero}/${promissoria.numeroParcelas}`
            });
          }
        });
      } else {
        // Promissória não parcelada
        if (promissoria.valorPago < promissoria.valor) {
          const dataVencimento = new Date(promissoria.dataLimite);
          const diasAtraso = Math.max(0, Math.floor((hoje.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24)));
          
          dividas.push({
            tipo: 'promissoria',
            id: promissoria.id,
            promissoriaId: promissoria.id,
            valor: promissoria.valor,
            valorPendente: promissoria.valor - promissoria.valorPago,
            dataVencimento: promissoria.dataLimite,
            diasAtraso,
            descricao: 'Promissória'
          });
        }
      }
    });

    // Ordenar por dias de atraso (mais atrasados primeiro), depois por data de vencimento
    return dividas.sort((a, b) => {
      if (a.diasAtraso !== b.diasAtraso) {
        return b.diasAtraso - a.diasAtraso;
      }
      return new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime();
    });
  };

  const simularDistribuicao = (valorPagamento: number) => {
    const dividasOrdenadas = calcularDividasOrdenadas();
    const simulacao: DevidaItem[] = [];
    let valorRestante = valorPagamento;

    for (const divida of dividasOrdenadas) {
      if (valorRestante <= 0) break;

      const valorAplicado = Math.min(valorRestante, divida.valorPendente);
      if (valorAplicado > 0) {
        simulacao.push({
          ...divida,
          valorPendente: valorAplicado
        });
        valorRestante -= valorAplicado;
      }
    }

    return simulacao;
  };

  const handleSimular = () => {
    const valorPagamento = parseFloat(valor.replace(",", "."));
    if (isNaN(valorPagamento) || valorPagamento <= 0) {
      toast({
        title: "Valor Inválido",
        description: "Por favor, insira um valor válido para o pagamento",
        variant: "destructive",
      });
      return;
    }

    setValorSimulacao(valorPagamento);
    setSimulacao(simularDistribuicao(valorPagamento));
  };

  const handleConfirmarPagamento = () => {
    try {
      const valorPagamento = parseFloat(valor.replace(",", "."));
      const agora = new Date().toISOString();
      
      // Aplicar pagamentos conforme simulação
      const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      const clienteIndex = clientes.findIndex((c: Cliente) => c.id === cliente.id);
      
      if (clienteIndex === -1) {
        throw new Error('Cliente não encontrado');
      }

      simulacao.forEach(item => {
        const novoPagamento: Pagamento = {
          id: crypto.randomUUID(),
          valor: item.valorPendente,
          tipo: TipoPagamento[tipoPagamento],
          dataHora: agora,
          promissoriaId: item.promissoriaId,
          parcelaId: item.parcelaId,
          created_at: agora,
          descricao: `Pagamento inteligente - ${item.descricao}`
        };

        const promissoriaIndex = clientes[clienteIndex].promissorias?.findIndex(
          (p: Promissoria) => p.id === item.promissoriaId
        );

        if (promissoriaIndex !== -1) {
          if (item.tipo === 'parcela' && item.parcelaId) {
            // Pagamento de parcela
            const parcelaIndex = clientes[clienteIndex].promissorias[promissoriaIndex].parcelas?.findIndex(
              (p: Parcela) => p.id === item.parcelaId
            );
            
            if (parcelaIndex !== -1) {
              clientes[clienteIndex].promissorias[promissoriaIndex].parcelas[parcelaIndex].valorPago += item.valorPendente;
              clientes[clienteIndex].promissorias[promissoriaIndex].parcelas[parcelaIndex].pagamentos.push(novoPagamento);
            }
          } else {
            // Pagamento de promissória
            clientes[clienteIndex].promissorias[promissoriaIndex].valorPago += item.valorPendente;
            clientes[clienteIndex].promissorias[promissoriaIndex].pagamentos.push(novoPagamento);
          }
        }
      });

      localStorage.setItem('clientes', JSON.stringify(clientes));

      toast({
        title: "Pagamento Registrado",
        description: `Pagamento inteligente de ${formatCurrency(valorPagamento)} distribuído com sucesso`,
      });

      setIsOpen(false);
      setValor("");
      setSimulacao([]);
      setValorSimulacao(0);
      onPagamentoRegistrado();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao registrar pagamento",
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

  const totalDividas = calcularDividasOrdenadas().reduce((sum, item) => sum + item.valorPendente, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Pagamento Inteligente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Pagamento Inteligente - {cliente.nome}
          </DialogTitle>
          <DialogDescription>
            Insira o valor do pagamento e veja como ele será distribuído automaticamente 
            pelas dívidas mais antigas e atrasadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor do Pagamento</Label>
              <Input
                id="valor"
                type="text"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Pagamento</Label>
              <Select value={tipoPagamento} onValueChange={(value) => setTipoPagamento(value as keyof typeof TipoPagamento)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CARTAO">Cartão</SelectItem>
                  <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Button onClick={handleSimular} variant="outline">
              <Calculator className="w-4 h-4 mr-2" />
              Simular Distribuição
            </Button>
            <div className="text-sm text-muted-foreground">
              Total em dívida: <span className="font-semibold text-destructive">{formatCurrency(totalDividas)}</span>
            </div>
          </div>

          {simulacao.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Simulação da Distribuição - {formatCurrency(valorSimulacao)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {simulacao.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {item.diasAtraso > 0 ? (
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{item.descricao}</p>
                        <p className="text-sm text-muted-foreground">
                          Vencimento: {format(parseISO(item.dataVencimento), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        {item.diasAtraso > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {item.diasAtraso} dia(s) em atraso
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(item.valorPendente)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        de {formatCurrency(item.valor)}
                      </p>
                    </div>
                  </div>
                ))}
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total aplicado:</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(simulacao.reduce((sum, item) => sum + item.valorPendente, 0))}
                    </span>
                  </div>
                  {valorSimulacao > simulacao.reduce((sum, item) => sum + item.valorPendente, 0) && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Valor restante:</span>
                      <span>
                        {formatCurrency(valorSimulacao - simulacao.reduce((sum, item) => sum + item.valorPendente, 0))}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmarPagamento} 
            disabled={simulacao.length === 0}
            className="flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}