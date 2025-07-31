import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Settings, 
  Save, 
  DollarSign, 
  Calculator,
  Lock,
  AlertTriangle
} from "lucide-react";

interface ConfiguracoesSistema {
  creditoPadraoNovosClientes: number;
  numeroParcelasPadrao: number;
  travarParcelamentoFuncionarios: boolean;
  jurosAtraso: number;
  multaAtraso: number;
  diasToleranciaAtraso: number;
}

const configuracoesPadrao: ConfiguracoesSistema = {
  creditoPadraoNovosClientes: 1000,
  numeroParcelasPadrao: 3,
  travarParcelamentoFuncionarios: false,
  jurosAtraso: 0,
  multaAtraso: 0,
  diasToleranciaAtraso: 0
};

export function ConfiguracoesSistema() {
  const { isManager, user } = useAuth();
  const { toast } = useToast();
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesSistema>(configuracoesPadrao);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = () => {
    try {
      const configSalvas = localStorage.getItem('configuracoes_sistema');
      if (configSalvas) {
        setConfiguracoes({ ...configuracoesPadrao, ...JSON.parse(configSalvas) });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações do sistema",
        variant: "destructive",
      });
    }
  };

  const salvarConfiguracoes = async () => {
    if (!isManager) {
      toast({
        title: "Acesso Negado",
        description: "Apenas gerentes podem alterar as configurações do sistema",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Validações
      if (configuracoes.creditoPadraoNovosClientes < 0) {
        toast({
          title: "Valor Inválido",
          description: "O crédito padrão não pode ser negativo",
          variant: "destructive",
        });
        return;
      }

      if (configuracoes.numeroParcelasPadrao < 1 || configuracoes.numeroParcelasPadrao > 60) {
        toast({
          title: "Valor Inválido",
          description: "O número de parcelas deve estar entre 1 e 60",
          variant: "destructive",
        });
        return;
      }

      if (configuracoes.jurosAtraso < 0 || configuracoes.jurosAtraso > 100) {
        toast({
          title: "Valor Inválido",
          description: "Os juros de atraso devem estar entre 0% e 100%",
          variant: "destructive",
        });
        return;
      }

      if (configuracoes.multaAtraso < 0 || configuracoes.multaAtraso > 100) {
        toast({
          title: "Valor Inválido",
          description: "A multa de atraso deve estar entre 0% e 100%",
          variant: "destructive",
        });
        return;
      }

      localStorage.setItem('configuracoes_sistema', JSON.stringify(configuracoes));

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ConfiguracoesSistema, value: any) => {
    if (!isManager && field === 'travarParcelamentoFuncionarios') {
      return; // Funcionários não podem alterar esta configuração
    }

    setConfiguracoes(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const podeEditar = (campo: keyof ConfiguracoesSistema): boolean => {
    if (!isManager) return false;
    if (campo === 'travarParcelamentoFuncionarios' && !isManager) return false;
    return true;
  };

  const campoEstaBloqueado = (campo: keyof ConfiguracoesSistema): boolean => {
    if (configuracoes.travarParcelamentoFuncionarios && !isManager) {
      return ['numeroParcelasPadrao'].includes(campo);
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
            <p className="text-muted-foreground">Configurar valores padrão e políticas da aplicação</p>
          </div>
        </div>
        {isManager && (
          <Button onClick={salvarConfiguracoes} disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        )}
      </div>

      {!isManager && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-800 dark:text-amber-200">
              Apenas gerentes podem alterar as configurações do sistema. Visualização apenas.
            </p>
          </CardContent>
        </Card>
      )}

      {configuracoes.travarParcelamentoFuncionarios && !isManager && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
          <CardContent className="flex items-center gap-3 p-4">
            <Lock className="h-5 w-5 text-red-600" />
            <p className="text-red-800 dark:text-red-200">
              As opções de parcelamento foram travadas para funcionários pelo gerente.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configurações de Crédito */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Configurações de Crédito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="creditoPadrao">Crédito Padrão para Novos Clientes</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="creditoPadrao"
                  type="number"
                  min="0"
                  step="0.01"
                  value={configuracoes.creditoPadraoNovosClientes}
                  onChange={(e) => handleInputChange('creditoPadraoNovosClientes', parseFloat(e.target.value) || 0)}
                  disabled={!podeEditar('creditoPadraoNovosClientes')}
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Valor padrão de crédito para clientes recém-cadastrados
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jurosAtraso">Juros de Atraso (%)</Label>
              <Input
                id="jurosAtraso"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={configuracoes.jurosAtraso}
                onChange={(e) => handleInputChange('jurosAtraso', parseFloat(e.target.value) || 0)}
                disabled={!podeEditar('jurosAtraso')}
              />
              <p className="text-sm text-muted-foreground">
                Percentual de juros aplicado sobre o valor em atraso
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="multaAtraso">Multa de Atraso (%)</Label>
              <Input
                id="multaAtraso"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={configuracoes.multaAtraso}
                onChange={(e) => handleInputChange('multaAtraso', parseFloat(e.target.value) || 0)}
                disabled={!podeEditar('multaAtraso')}
              />
              <p className="text-sm text-muted-foreground">
                Percentual de multa aplicado sobre o valor em atraso
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Parcelamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Configurações de Parcelamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="parcelasPadrao">Número de Parcelas Padrão</Label>
              <Input
                id="parcelasPadrao"
                type="number"
                min="1"
                max="60"
                value={configuracoes.numeroParcelasPadrao}
                onChange={(e) => handleInputChange('numeroParcelasPadrao', parseInt(e.target.value) || 1)}
                disabled={!podeEditar('numeroParcelasPadrao') || campoEstaBloqueado('numeroParcelasPadrao')}
              />
              <p className="text-sm text-muted-foreground">
                Número padrão de parcelas sugerido em novas promissórias
              </p>
              {campoEstaBloqueado('numeroParcelasPadrao') && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Campo travado pelo gerente
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="diasTolerancia">Dias de Tolerância para Atraso</Label>
              <Input
                id="diasTolerancia"
                type="number"
                min="0"
                max="30"
                value={configuracoes.diasToleranciaAtraso}
                onChange={(e) => handleInputChange('diasToleranciaAtraso', parseInt(e.target.value) || 0)}
                disabled={!podeEditar('diasToleranciaAtraso')}
              />
              <p className="text-sm text-muted-foreground">
                Dias de carência antes de considerar um pagamento em atraso
              </p>
            </div>

            {isManager && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="travarParcelamento">Travar Opções de Parcelamento</Label>
                    <p className="text-sm text-muted-foreground">
                      Impede funcionários de alterar configurações de parcelamento
                    </p>
                  </div>
                  <Switch
                    id="travarParcelamento"
                    checked={configuracoes.travarParcelamentoFuncionarios}
                    onCheckedChange={(checked) => handleInputChange('travarParcelamentoFuncionarios', checked)}
                  />
                </div>
                {configuracoes.travarParcelamentoFuncionarios && (
                  <div className="text-sm text-amber-600 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Funcionários não poderão alterar o número de parcelas padrão
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo das Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo das Configurações Atuais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Crédito Padrão</p>
              <p className="text-lg font-bold">{formatCurrency(configuracoes.creditoPadraoNovosClientes)}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Parcelas Padrão</p>
              <p className="text-lg font-bold">{configuracoes.numeroParcelasPadrao}x</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Juros de Atraso</p>
              <p className="text-lg font-bold">{configuracoes.jurosAtraso}%</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground">Tolerância</p>
              <p className="text-lg font-bold">{configuracoes.diasToleranciaAtraso} dias</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}