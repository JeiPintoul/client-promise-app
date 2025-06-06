
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Search, Eye } from 'lucide-react';
import { ClienteDetail } from './ClienteDetail';

type Cliente = {
  id: string;
  nome: string;
  apelido?: string | null;
  telefone: string;
  cpf: string;
  endereco: string;
  elegibilidade: 'elegivel' | 'nao_elegivel';
  created_at: string;
  updated_at: string;
};

export function ClientesList() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const { isManager } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    filterClientes();
  }, [clientes, searchTerm, statusFilter]);

  const fetchClientes = () => {
    try {
      const clientesData = JSON.parse(localStorage.getItem('clientes') || '[]');
      setClientes(clientesData);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterClientes = () => {
    let filtered = clientes;

    // Filtro por status de elegibilidade
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(cliente => cliente.elegibilidade === statusFilter);
    }

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(cliente =>
        cliente.nome.toLowerCase().includes(term) ||
        cliente.apelido?.toLowerCase().includes(term) ||
        cliente.telefone.includes(term) ||
        cliente.cpf.includes(term)
      );
    }

    setFilteredClientes(filtered);
  };

  const toggleElegibilidade = (cliente: Cliente) => {
    if (!isManager) {
      toast({
        title: "Acesso Negado",
        description: "Apenas gerentes podem alterar a elegibilidade.",
        variant: "destructive",
      });
      return;
    }

    try {
      const novaElegibilidade = cliente.elegibilidade === 'elegivel' ? 'nao_elegivel' : 'elegivel';
      
      const clientesData = JSON.parse(localStorage.getItem('clientes') || '[]');
      const clientesAtualizados = clientesData.map((c: Cliente) =>
        c.id === cliente.id
          ? { ...c, elegibilidade: novaElegibilidade, updated_at: new Date().toISOString() }
          : c
      );
      
      localStorage.setItem('clientes', JSON.stringify(clientesAtualizados));
      setClientes(clientesAtualizados);

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
        onUpdate={fetchClientes}
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
        {filteredClientes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || statusFilter !== 'todos'
              ? 'Nenhum cliente encontrado com os filtros aplicados.'
              : 'Nenhum cliente cadastrado.'}
          </div>
        ) : (
          filteredClientes.map((cliente) => (
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
                      <Button
                        variant={cliente.elegibilidade === 'elegivel' ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => toggleElegibilidade(cliente)}
                      >
                        {cliente.elegibilidade === 'elegivel' ? 'Bloquear' : 'Desbloquear'}
                      </Button>
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
