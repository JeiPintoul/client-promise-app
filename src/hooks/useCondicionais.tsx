import { useState, useEffect } from 'react';
import { condicionalService, Condicional, CondicionalRequest, CondicionalFilters, ItemCondicionalRequest, FinalizarCondicionalRequest } from '@/api/services/condicionalService';
import { PageRequest, PageResponse } from '@/api/apiClient';
import { useToast } from '@/hooks/use-toast';

export function useCondicionais(filters?: CondicionalFilters, pagination?: PageRequest) {
  const [data, setData] = useState<PageResponse<Condicional> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchCondicionais = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await condicionalService.getCondicionais(filters, pagination);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar condicionais');
      toast({
        title: "Erro",
        description: "Erro ao carregar condicionais",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCondicionais();
  }, [JSON.stringify(filters), JSON.stringify(pagination)]);

  const createCondicional = async (condicionalData: CondicionalRequest): Promise<Condicional> => {
    try {
      const novoCondicional = await condicionalService.createCondicional(condicionalData);
      
      toast({
        title: "Sucesso",
        description: "Condicional criado com sucesso!"
      });
      
      await fetchCondicionais();
      return novoCondicional;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao criar condicional",
        variant: "destructive"
      });
      throw error;
    }
  };

  const addItens = async (id: string, itens: ItemCondicionalRequest[]): Promise<Condicional> => {
    try {
      const condicionalAtualizado = await condicionalService.addItens(id, itens);
      
      toast({
        title: "Sucesso",
        description: "Itens adicionados com sucesso!"
      });
      
      await fetchCondicionais();
      return condicionalAtualizado;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar itens",
        variant: "destructive"
      });
      throw error;
    }
  };

  const finalizarCondicional = async (id: string, dados: FinalizarCondicionalRequest): Promise<any> => {
    try {
      const resultado = await condicionalService.finalizarCondicional(id, dados);
      
      toast({
        title: "Sucesso",
        description: "Condicional finalizado com sucesso!"
      });
      
      await fetchCondicionais();
      return resultado;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao finalizar condicional",
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteCondicional = async (id: string): Promise<void> => {
    try {
      await condicionalService.deleteCondicional(id);
      
      toast({
        title: "Sucesso",
        description: "Condicional excluído com sucesso!"
      });
      
      await fetchCondicionais();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao excluir condicional",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    data,
    loading,
    error,
    refetch: fetchCondicionais,
    createCondicional,
    addItens,
    finalizarCondicional,
    deleteCondicional
  };
}

export function useCondicionalByCliente(clienteId: string, pagination?: PageRequest) {
  const [data, setData] = useState<PageResponse<Condicional> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCondicionais = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await condicionalService.getCondicionaisByCliente(clienteId, pagination);
        setData(response);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar condicionais');
      } finally {
        setLoading(false);
      }
    };

    if (clienteId) {
      fetchCondicionais();
    }
  }, [clienteId, JSON.stringify(pagination)]);

  return { data, loading, error };
}