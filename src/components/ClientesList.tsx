
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useClientes } from '@/hooks/useClientes';
import { Search, Eye, Trash2 } from 'lucide-react';
import { ClienteDetail } from './ClienteDetail';
import { Cliente } from '@/types';

export function ClientesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const { isManager } = useAuth();
  const { toast } = useToast();
  
  const filters = {
    nome: searchTerm,
    elegibilidade: statusFilter !== 'todos' ? statusFilter as any : undefined
  };
  
  const { data: clientes, loading, error, deleteCliente, toggleElegibilidade, refetch } = useClientes(filters);

  const handleToggleElegibilidade = async (cliente: Cliente) => {
    if (!isManager) {
      toast({
        title: "Acesso Negado",
        description: "Apenas gerentes podem alterar a elegibilidade.",
        variant: "destructive",
      });
      return;
    }

    try {
      await toggleElegibilidade(cliente.id);
      toast({
        title: "Sucesso",
        description: "Elegibilidade atualizada com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar elegibilidade: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleExcluirCliente = async (cliente: Cliente) => {
    if (!isManager) {
      toast({
        title: "Acesso Negado",
        description: "Apenas gerentes podem excluir clientes.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteCliente(cliente.id);
      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao excluir cliente: " + error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (elegibilidade: string) => {
    switch (elegibilidade) {
      case 'elegivel':
        return 'bg-green-500';
      case 'nao_elegivel':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (selectedCliente) {
    return (
      <ClienteDetail
        cliente={selectedCliente}
        onBack={() => setSelectedCliente(null)}
        onUpdate={refetch}
      />
    );
  }

  if (loading) {
    return <div className="text-center py-4">Carregando clientes...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nome, apelido, telefone ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Filtrar por elegibilidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os clientes</SelectItem>
            <SelectItem value="elegivel">Clientes elegíveis</SelectItem>
            <SelectItem value="nao_elegivel">Clientes não elegíveis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de clientes */}
      <div className="grid gap-4">
        {!clientes || (Array.isArray(clientes) ? clientes.length === 0 : true) ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || statusFilter !== 'todos'
              ? 'Nenhum cliente encontrado com os filtros aplicados.'
              : 'Nenhum cliente cadastrado.'}
          </div>
        ) : (
          (Array.isArray(clientes) ? clientes : []).map((cliente) => (
            <Card key={cliente.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(cliente.elegibilidade)}`}
                      />
                      <h3 className="font-semibold text-lg">{cliente.nome}</h3>
                      {cliente.apelido && (
                        <span className="text-gray-500 text-sm">({cliente.apelido})</span>
                      )}
                      <Badge variant={cliente.elegibilidade === 'elegivel' ? 'default' : 'destructive'}>
                        {cliente.elegibilidade === 'elegivel' ? 'Elegível' : 'Não Elegível'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                      <div>
                        <strong>Telefone:</strong> {cliente.telefone}
                      </div>
                      <div>
                        <strong>CPF:</strong> {cliente.cpf}
                      </div>
                      <div>
                        <strong>Endereço:</strong> {cliente.endereco}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCliente(cliente)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Detalhes
                    </Button>
                    {isManager && (
                      <>
                        <Button
                          variant={cliente.elegibilidade === 'elegivel' ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => handleToggleElegibilidade(cliente)}
                        >
                          {cliente.elegibilidade === 'elegivel' ? 'Bloquear' : 'Desbloquear'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o cliente "{cliente.nome}"? 
                                Esta ação não pode ser desfeita e só é possível se o cliente não possuir promissórias.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleExcluirCliente(cliente)}>
                              Excluir
                            </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
