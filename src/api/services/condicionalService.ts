import { apiClient, PageRequest, PageResponse, FilterParams } from '../apiClient';

export interface ItemCondicional {
  id?: string;
  descricao: string;
  valor: number;
  status?: 'em_aberto' | 'devolvido' | 'vendido';
}

export interface Condicional {
  id: string;
  clienteId: string;
  dataSaida: string;
  dataRetornoEsperada: string;
  observacoes?: string;
  status: 'em_aberto' | 'finalizado';
  itens: ItemCondicional[];
  createdAt: string;
  updatedAt: string;
}

export interface CondicionalRequest {
  clienteId: string;
  dataSaida: string;
  dataRetornoEsperada: string;
  observacoes?: string;
  itens: Omit<ItemCondicional, 'id' | 'status'>[];
}

export interface ItemCondicionalRequest {
  descricao: string;
  valor: number;
}

export interface FinalizarCondicionalRequest {
  itens: {
    id: string;
    status: 'devolvido' | 'vendido';
  }[];
}

export interface CondicionalFilters extends FilterParams {
  clienteId?: string;
  status?: 'em_aberto' | 'finalizado' | '';
  dataSaidaInicio?: string;
  dataSaidaFim?: string;
}

export const condicionalService = {
  async getCondicionais(filters?: CondicionalFilters, pagination?: PageRequest): Promise<PageResponse<Condicional>> {
    const params = { ...filters, ...pagination };
    return apiClient.get<PageResponse<Condicional>>('/condicionais', params);
  },

  async getCondicionalById(id: string): Promise<Condicional> {
    return apiClient.get<Condicional>(`/condicionais/${id}`);
  },

  async getCondicionaisByCliente(clienteId: string, pagination?: PageRequest): Promise<PageResponse<Condicional>> {
    const params = { ...pagination };
    return apiClient.get<PageResponse<Condicional>>(`/condicionais/cliente/${clienteId}`, params);
  },

  async createCondicional(condicional: CondicionalRequest): Promise<Condicional> {
    return apiClient.post<Condicional>('/condicionais', condicional);
  },

  async addItens(id: string, itens: ItemCondicionalRequest[]): Promise<Condicional> {
    return apiClient.post<Condicional>(`/condicionais/${id}/itens`, itens);
  },

  async finalizarCondicional(id: string, dados: FinalizarCondicionalRequest): Promise<any> {
    return apiClient.post<any>(`/condicionais/${id}/finalizar`, dados);
  },

  async deleteCondicional(id: string): Promise<void> {
    return apiClient.delete<void>(`/condicionais/${id}`);
  }
};