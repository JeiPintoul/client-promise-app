import { apiClient, PageRequest, PageResponse, FilterParams } from '../apiClient';
import { Cliente } from '@/types';

export interface ClienteRequest {
  nome: string;
  apelido?: string;
  telefone: string;
  cpf: string;
  endereco: string;
  elegibilidade?: 'elegivel' | 'nao_elegivel';
}

export interface ClienteFilters extends FilterParams {
  nome?: string;
  cpf?: string;
  telefone?: string;
  elegibilidade?: 'elegivel' | 'nao_elegivel' | '' | undefined;
}

export const clienteService = {
  async getClientes(filters?: ClienteFilters, pagination?: PageRequest): Promise<PageResponse<Cliente>> {
    const params = { ...filters, ...pagination };
    return apiClient.get<PageResponse<Cliente>>('/clientes', params);
  },

  async getClienteById(id: string): Promise<Cliente> {
    return apiClient.get<Cliente>(`/clientes/${id}`);
  },

  async createCliente(cliente: ClienteRequest): Promise<Cliente> {
    return apiClient.post<Cliente>('/clientes', cliente);
  },

  async updateCliente(id: string, cliente: Partial<ClienteRequest>): Promise<Cliente> {
    return apiClient.put<Cliente>(`/clientes/${id}`, cliente);
  },

  async deleteCliente(id: string): Promise<void> {
    return apiClient.delete<void>(`/clientes/${id}`);
  },

  async toggleElegibilidade(id: string): Promise<Cliente> {
    return apiClient.patch<Cliente>(`/clientes/${id}/elegibilidade`);
  },

  async getClienteEstatisticas(id: string): Promise<any> {
    return apiClient.get<any>(`/clientes/${id}/estatisticas`);
  }
};