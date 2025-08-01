import { apiClient, PageRequest, PageResponse, FilterParams } from '../apiClient';
import { Promissoria } from '@/types';

export interface PromissoriaRequest {
  clienteId: string;
  valor: number;
  dataEmissao: string;
  dataLimite: string;
  parcelado: boolean;
  numeroParcelas?: number;
  observacoes?: string;
}

export interface PromissoriaFilters extends FilterParams {
  clienteId?: string;
  status?: 'pendente' | 'pago' | 'atrasado' | 'pago_com_atraso' | '' | undefined;
  dataEmissaoInicio?: string;
  dataEmissaoFim?: string;
  dataLimiteInicio?: string;
  dataLimiteFim?: string;
  valorMinimo?: number;
  valorMaximo?: number;
}

export const promissoriaService = {
  async getPromissorias(filters?: PromissoriaFilters, pagination?: PageRequest): Promise<PageResponse<Promissoria>> {
    const params = { ...filters, ...pagination };
    return apiClient.get<PageResponse<Promissoria>>('/promissorias', params);
  },

  async getPromissoriaById(id: string): Promise<Promissoria> {
    return apiClient.get<Promissoria>(`/promissorias/${id}`);
  },

  async getPromissoriasByCliente(clienteId: string, pagination?: PageRequest): Promise<PageResponse<Promissoria>> {
    const params = { ...pagination };
    return apiClient.get<PageResponse<Promissoria>>(`/promissorias/cliente/${clienteId}`, params);
  },

  async createPromissoria(promissoria: PromissoriaRequest): Promise<Promissoria> {
    return apiClient.post<Promissoria>('/promissorias', promissoria);
  },

  async updatePromissoria(id: string, promissoria: Partial<PromissoriaRequest>): Promise<Promissoria> {
    return apiClient.put<Promissoria>(`/promissorias/${id}`, promissoria);
  },

  async deletePromissoria(id: string): Promise<void> {
    return apiClient.delete<void>(`/promissorias/${id}`);
  },

  async getPromissoriasPendentes(clienteId?: string): Promise<Promissoria[]> {
    const params = clienteId ? { clienteId } : {};
    return apiClient.get<Promissoria[]>('/promissorias/pendentes', params);
  }
};