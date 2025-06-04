
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientesList } from './ClientesList';
import { CadastroCliente } from './CadastroCliente';
import { GerenciarUsuarios } from './GerenciarUsuarios';
import { LogOut, Users, UserPlus, CreditCard } from 'lucide-react';

export function Dashboard() {
  const { user, profile, signOut, isManager } = useAuth();
  const [activeTab, setActiveTab] = useState('clientes');

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sistema de Gestão</h1>
              <p className="text-sm text-gray-600">
                Bem-vindo, {profile?.nome} ({profile?.role})
              </p>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="cadastro" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Cadastrar Cliente
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="usuarios" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Gerenciar Usuários
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="clientes" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <ClientesList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cadastro" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Cadastrar Novo Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <CadastroCliente />
              </CardContent>
            </Card>
          </TabsContent>

          {isManager && (
            <TabsContent value="usuarios" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciar Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <GerenciarUsuarios />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
