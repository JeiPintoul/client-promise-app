import { useState, useEffect } from 'react';
import { promissoriaService, PromissoriaFilters } from '@/api/services/promissoriaService';
import { PageRequest, PageResponse } from '@/api/apiClient';
import { Promissoria } from '@/types';
import { useToast } from '@/hooks/use-toast';

export function usePromissorias(filters?: PromissoriaFilters, pagination?: PageRequest) {
  const [data, setData] = useState<PageResponse<Promissoria> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPromissorias = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await promissoriaService.getPromissorias(filters, pagination);
      setData(result);
    } catch (apiError) {
      console.warn('Falha na API, usando localStorage:', apiError);
      
      // Fallback para localStorage
      try {
        const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
        let allPromissorias: Promissoria[] = [];
        
        // Extrair todas as promissórias de todos os clientes
        localClientes.forEach((cliente: any) => {
          if (cliente.promissorias) {
            allPromissorias = allPromissorias.concat(cliente.promissorias);
          }
        });

        let filteredPromissorias = [...allPromissorias];

        // Aplicar filtros localmente
        if (filters?.clienteId) {
          filteredPromissorias = filteredPromissorias.filter(p => 
            localClientes.find((c: any) => c.id === filters.clienteId && c.promissorias?.some((pr: any) => pr.id === p.id))
          );
        }

        if (filters?.status && (filters.status === 'pendente' || filters.status === 'pago' || filters.status === 'atrasado' || filters.status === 'pago_com_atraso')) {
          filteredPromissorias = filteredPromissorias.filter(p => p.status === filters.status);
        }

        // Aplicar paginação local
        const page = pagination?.page || 0;
        const size = pagination?.size || 10;
        const startIndex = page * size;
        const endIndex = startIndex + size;
        const paginatedPromissorias = filteredPromissorias.slice(startIndex, endIndex);

        const localResult: PageResponse<Promissoria> = {
          content: paginatedPromissorias,
          totalPages: Math.ceil(filteredPromissorias.length / size),
          totalElements: filteredPromissorias.length,
          number: page,
          size: size,
          first: page === 0,
          last: endIndex >= filteredPromissorias.length,
          numberOfElements: paginatedPromissorias.length
        };

        setData(localResult);
      } catch (localError) {
        console.error('Erro ao buscar promissórias no localStorage:', localError);
        setError('Erro ao carregar promissórias');
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a lista de promissórias',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromissorias();
  }, [JSON.stringify(filters), JSON.stringify(pagination)]);

  const createPromissoria = async (promissoriaData: any) => {
    try {
      const newPromissoria = await promissoriaService.createPromissoria(promissoriaData);
      await fetchPromissorias();
      return newPromissoria;
    } catch (apiError) {
      // Fallback para localStorage
      const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      const clienteIndex = localClientes.findIndex((c: any) => c.id === promissoriaData.clienteId);
      
      if (clienteIndex === -1) {
        throw new Error('Cliente não encontrado');
      }

      const newPromissoria: Promissoria = {
        id: crypto.randomUUID(),
        ...promissoriaData,
        valorPago: 0,
        status: 'pendente' as const,
        pagamentos: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (!localClientes[clienteIndex].promissorias) {
        localClientes[clienteIndex].promissorias = [];
      }
      
      localClientes[clienteIndex].promissorias.push(newPromissoria);
      localStorage.setItem('clientes', JSON.stringify(localClientes));
      await fetchPromissorias();
      return newPromissoria;
    }
  };

  const updatePromissoria = async (id: string, promissoriaData: any) => {
    try {
      const updatedPromissoria = await promissoriaService.updatePromissoria(id, promissoriaData);
      await fetchPromissorias();
      return updatedPromissoria;
    } catch (apiError) {
      // Fallback para localStorage
      const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      
      for (let cliente of localClientes) {
        if (cliente.promissorias) {
          const promissoriaIndex = cliente.promissorias.findIndex((p: any) => p.id === id);
          if (promissoriaIndex !== -1) {
            cliente.promissorias[promissoriaIndex] = {
              ...cliente.promissorias[promissoriaIndex],
              ...promissoriaData,
              updated_at: new Date().toISOString()
            };
            localStorage.setItem('clientes', JSON.stringify(localClientes));
            await fetchPromissorias();
            return cliente.promissorias[promissoriaIndex];
          }
        }
      }
      throw new Error('Promissória não encontrada');
    }
  };

  const deletePromissoria = async (id: string) => {
    try {
      await promissoriaService.deletePromissoria(id);
      await fetchPromissorias();
    } catch (apiError) {
      // Fallback para localStorage
      const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
      
      for (let cliente of localClientes) {
        if (cliente.promissorias) {
          cliente.promissorias = cliente.promissorias.filter((p: any) => p.id !== id);
        }
      }
      
      localStorage.setItem('clientes', JSON.stringify(localClientes));
      await fetchPromissorias();
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchPromissorias,
    createPromissoria,
    updatePromissoria,
    deletePromissoria
  };
}

export function usePromissoriasByCliente(clienteId: string, pagination?: PageRequest) {
  const [data, setData] = useState<PageResponse<Promissoria> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPromissorias = async () => {
      if (!clienteId) return;
      
      try {
        setLoading(true);
        const result = await promissoriaService.getPromissoriasByCliente(clienteId, pagination);
        setData(result);
      } catch (apiError) {
        // Fallback para localStorage
        const localClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
        const cliente = localClientes.find((c: any) => c.id === clienteId);
        
        if (cliente && cliente.promissorias) {
          const page = pagination?.page || 0;
          const size = pagination?.size || 10;
          const startIndex = page * size;
          const endIndex = startIndex + size;
          const paginatedPromissorias = cliente.promissorias.slice(startIndex, endIndex);

          const localResult: PageResponse<Promissoria> = {
            content: paginatedPromissorias,
            totalPages: Math.ceil(cliente.promissorias.length / size),
            totalElements: cliente.promissorias.length,
            number: page,
            size: size,
            first: page === 0,
            last: endIndex >= cliente.promissorias.length,
            numberOfElements: paginatedPromissorias.length
          };

          setData(localResult);
        } else {
          setData({
            content: [],
            totalPages: 0,
            totalElements: 0,
            number: 0,
            size: pagination?.size || 10,
            first: true,
            last: true,
            numberOfElements: 0
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPromissorias();
  }, [clienteId, JSON.stringify(pagination)]);

  return { data, loading, error };
}