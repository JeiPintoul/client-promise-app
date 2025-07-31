
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  FileText, 
  DollarSign, 
  Settings, 
  LogOut,
  UserPlus,
  Plus
} from 'lucide-react';
import { ClientesList } from './ClientesList';
import { CadastroCliente } from './CadastroCliente';
import { ListaPromissorias } from './ListaPromissorias';
import { GerenciarUsuarios } from './GerenciarUsuarios';
import { GestaoUsuarios } from './GestaoUsuarios';
import { HistoricoTransacoes } from './HistoricoTransacoes';
import { ConfiguracoesSistema } from './ConfiguracoesSistema';
import { Configuracoes } from './Configuracoes';

export function Dashboard() {
  const { user, signOut, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState('clientes');
  const [showCadastroCliente, setShowCadastroCliente] = useState(false);

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Sistema de Promissórias</h1>
              <span className="text-sm text-muted-foreground">
                Olá, {user?.nome} ({isManager ? 'Gerente' : 'Funcionário'})
              </span>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="promissorias" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Promissórias
            </TabsTrigger>
            <TabsTrigger value="transacoes" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Transações
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="usuarios" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Usuários
              </TabsTrigger>
            )}
            {isManager && (
              <TabsTrigger value="gestao-usuarios" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Gestão
              </TabsTrigger>
            )}
            <TabsTrigger value="configuracoes" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clientes">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Clientes</h2>
                <Button onClick={() => setShowCadastroCliente(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cliente
                </Button>
              </div>
              {showCadastroCliente ? (
                <CadastroCliente />
              ) : (
                <ClientesList />
              )}
            </div>
          </TabsContent>

          <TabsContent value="promissorias">
            <ListaPromissorias />
          </TabsContent>

          <TabsContent value="transacoes">
            <HistoricoTransacoes />
          </TabsContent>

          {isManager && (
            <TabsContent value="usuarios">
              <GerenciarUsuarios />
            </TabsContent>
          )}

          {isManager && (
            <TabsContent value="gestao-usuarios">
              <GestaoUsuarios />
            </TabsContent>
          )}

          <TabsContent value="configuracoes">
            <div className="space-y-6">
              <ConfiguracoesSistema />
              <Configuracoes />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
