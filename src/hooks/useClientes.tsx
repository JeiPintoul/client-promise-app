import { useState, useEffect, useMemo } from 'react';
import { clienteService, ClienteFilters } from '@/api/services/clienteService';
import { PageRequest, PageResponse } from '@/api/apiClient';
import { Cliente } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function useClientes(filters?: ClienteFilters, pagination?: PageRequest) {
  const [data, setData] = useState<PageResponse<Cliente> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchClientes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Tentar buscar via API primeiro
      const result = await clienteService.getClientes(filters, pagination);
      setData(result);
    } catch (apiError) {
      console.warn('Falha na API, usando localStorage:', apiError);
      
      // Fallback para localStorage
      try {
        const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]') as Cliente[];
        let filteredClientes = [...localClientes];

        // Aplicar filtros localmente
        if (filters?.nome) {
          filteredClientes = filteredClientes.filter(cliente =>
            cliente.nome.toLowerCase().includes(filters.nome!.toLowerCase()) ||
            (cliente.apelido && cliente.apelido.toLowerCase().includes(filters.nome!.toLowerCase()))
          );
        }

        if (filters?.cpf) {
          filteredClientes = filteredClientes.filter(cliente =>
            cliente.cpf.includes(filters.cpf!)
          );
        }

        if (filters?.telefone) {
          filteredClientes = filteredClientes.filter(cliente =>
            cliente.telefone.includes(filters.telefone!)
          );
        }

        if (filters?.elegibilidade && (filters.elegibilidade === 'elegivel' || filters.elegibilidade === 'nao_elegivel')) {
          filteredClientes = filteredClientes.filter(cliente =>
            cliente.elegibilidade === filters.elegibilidade
          );
        }

        // Aplicar paginação local
        const page = pagination?.page || 0;
        const size = pagination?.size || 10;
        const startIndex = page * size;
        const endIndex = startIndex + size;
        const paginatedClientes = filteredClientes.slice(startIndex, endIndex);

        const localResult: PageResponse<Cliente> = {
          content: paginatedClientes,
          totalPages: Math.ceil(filteredClientes.length / size),
          totalElements: filteredClientes.length,
          number: page,
          size: size,
          first: page === 0,
          last: endIndex >= filteredClientes.length,
          numberOfElements: paginatedClientes.length
        };

        setData(localResult);
      } catch (localError) {
        console.error('Erro ao buscar clientes no localStorage:', localError);
        setError('Erro ao carregar clientes');
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a lista de clientes',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, [JSON.stringify(filters), JSON.stringify(pagination)]);

  const createCliente = async (clienteData: any) => {
    try {
      const newCliente = await clienteService.createCliente(clienteData);
      await fetchClientes(); // Recarregar lista
      return newCliente;
    } catch (apiError) {
      // Fallback para localStorage
      const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      const newCliente: Cliente = {
        id: crypto.randomUUID(),
        ...clienteData,
        elegibilidade: clienteData.elegibilidade || 'elegivel',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      localClientes.push(newCliente);
      localStorage.setItem('clientes', JSON.stringify(localClientes));
      await fetchClientes();
      return newCliente;
    }
  };

  const updateCliente = async (id: string, clienteData: any) => {
    try {
      const updatedCliente = await clienteService.updateCliente(id, clienteData);
      await fetchClientes();
      return updatedCliente;
    } catch (apiError) {
      // Fallback para localStorage
      const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      const index = localClientes.findIndex((c: Cliente) => c.id === id);
      
      if (index !== -1) {
        localClientes[index] = {
          ...localClientes[index],
          ...clienteData,
          updated_at: new Date().toISOString()
        };
        localStorage.setItem('clientes', JSON.stringify(localClientes));
        await fetchClientes();
        return localClientes[index];
      }
      throw new Error('Cliente não encontrado');
    }
  };

  const deleteCliente = async (id: string) => {
    try {
      await clienteService.deleteCliente(id);
      await fetchClientes();
    } catch (apiError) {
      // Fallback para localStorage
      const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      const filteredClientes = localClientes.filter((c: Cliente) => c.id !== id);
      localStorage.setItem('clientes', JSON.stringify(filteredClientes));
      await fetchClientes();
    }
  };

  const toggleElegibilidade = async (id: string) => {
    try {
      const updatedCliente = await clienteService.toggleElegibilidade(id);
      await fetchClientes();
      return updatedCliente;
    } catch (apiError) {
      // Fallback para localStorage
      const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      const index = localClientes.findIndex((c: Cliente) => c.id === id);
      
      if (index !== -1) {
        localClientes[index].elegibilidade = 
          localClientes[index].elegibilidade === 'elegivel' ? 'nao_elegivel' : 'elegivel';
        localClientes[index].updated_at = new Date().toISOString();
        localStorage.setItem('clientes', JSON.stringify(localClientes));
        await fetchClientes();
        return localClientes[index];
      }
      throw new Error('Cliente não encontrado');
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    toggleElegibilidade
  };
}

export function useCliente(id: string) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCliente = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const result = await clienteService.getClienteById(id);
        setCliente(result);
      } catch (apiError) {
        // Fallback para localStorage
        const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]') as Cliente[];
        const found = localClientes.find(c => c.id === id);
        if (found) {
          setCliente(found);
        } else {
          setError('Cliente não encontrado');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCliente();
  }, [id]);

  return { cliente, loading, error };
}