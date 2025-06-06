
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Moon, Sun, CreditCard, Settings } from 'lucide-react';

export function Configuracoes() {
  const { settings, updateSettings, updateParcelamentoConfig } = useSettings();
  const { isManager } = useAuth();
  const { toast } = useToast();
  const [numeroParcelas, setNumeroParcelas] = useState(settings.parcelamento.numeroPadrao.toString());

  const handleTemaChange = (tema: 'light' | 'dark') => {
    updateSettings({ tema });
    toast({
      title: "Tema alterado",
      description: `Tema ${tema === 'dark' ? 'escuro' : 'claro'} aplicado com sucesso!`,
    });
  };

  const handleParcelamentoToggle = (ativo: boolean) => {
    updateParcelamentoConfig({ ativo });
    toast({
      title: "Configuração atualizada",
      description: `Parcelamento padrão ${ativo ? 'ativado' : 'desativado'}.`,
    });
  };

  const handleParcelasPadraoChange = () => {
    const numero = parseInt(numeroParcelas);
    if (numero >= 1 && numero <= 12) {
      updateParcelamentoConfig({ numeroPadrao: numero });
      toast({
        title: "Configuração atualizada",
        description: `Número padrão de parcelas definido para ${numero}.`,
      });
    } else {
      toast({
        title: "Erro",
        description: "Número de parcelas deve estar entre 1 e 12.",
        variant: "destructive",
      });
    }
  };

  const handleForcadoToggle = (forcado: boolean) => {
    if (!isManager) {
      toast({
        title: "Acesso Negado",
        description: "Apenas gerentes podem forçar configurações.",
        variant: "destructive",
      });
      return;
    }
    
    updateParcelamentoConfig({ forcado });
    toast({
      title: "Configuração atualizada",
      description: `Parcelamento ${forcado ? 'forçado' : 'não forçado'} para todos os usuários.`,
    });
  };

  const handleBloqueadoToggle = (bloqueado: boolean) => {
    if (!isManager) {
      toast({
        title: "Acesso Negado",
        description: "Apenas gerentes podem bloquear alterações.",
        variant: "destructive",
      });
      return;
    }
    
    updateParcelamentoConfig({ bloqueado });
    toast({
      title: "Configuração atualizada",
      description: `Alteração de parcelamento ${bloqueado ? 'bloqueada' : 'liberada'} para usuários comuns.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Configurações de Tema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings.tema === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            Tema do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="tema-switch">Tema Escuro</Label>
            <Switch
              id="tema-switch"
              checked={settings.tema === 'dark'}
              onCheckedChange={(checked) => handleTemaChange(checked ? 'dark' : 'light')}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Alterne entre o tema claro e escuro do sistema.
          </p>
        </CardContent>
      </Card>

      {/* Configurações de Parcelamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Configurações de Parcelamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Parcelamento Padrão */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="parcelamento-switch">Parcelamento Padrão Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Quando ativo, novas vendas já virão com parcelamento configurado.
                </p>
              </div>
              <Switch
                id="parcelamento-switch"
                checked={settings.parcelamento.ativo}
                onCheckedChange={handleParcelamentoToggle}
                disabled={settings.parcelamento.forcado && !isManager}
              />
            </div>

            {settings.parcelamento.ativo && (
              <div className="space-y-2">
                <Label htmlFor="numero-parcelas">Número Padrão de Parcelas</Label>
                <div className="flex gap-2">
                  <Input
                    id="numero-parcelas"
                    type="number"
                    min="1"
                    max="12"
                    value={numeroParcelas}
                    onChange={(e) => setNumeroParcelas(e.target.value)}
                    className="w-24"
                    disabled={settings.parcelamento.forcado && !isManager}
                  />
                  <Button 
                    onClick={handleParcelasPadraoChange}
                    disabled={settings.parcelamento.forcado && !isManager}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Configurações de Gerente */}
          {isManager && (
            <div className="border-t pt-6 space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Configurações de Gerente
              </h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="forcado-switch">Forçar Parcelamento para Todos</Label>
                    <p className="text-sm text-muted-foreground">
                      Força a configuração de parcelamento para todos os usuários do sistema.
                    </p>
                  </div>
                  <Switch
                    id="forcado-switch"
                    checked={settings.parcelamento.forcado}
                    onCheckedChange={handleForcadoToggle}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="bloqueado-switch">Bloquear Alteração por Usuários</Label>
                    <p className="text-sm text-muted-foreground">
                      Impede que usuários comuns alterem as configurações de parcelamento.
                    </p>
                  </div>
                  <Switch
                    id="bloqueado-switch"
                    checked={settings.parcelamento.bloqueado}
                    onCheckedChange={handleBloqueadoToggle}
                  />
                </div>
              </div>
            </div>
          )}

          {settings.parcelamento.forcado && !isManager && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Atenção:</strong> As configurações de parcelamento foram definidas pelo gerente e não podem ser alteradas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
