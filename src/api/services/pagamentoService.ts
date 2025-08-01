import { apiClient, PageRequest, PageResponse, FilterParams } from '../apiClient';
import { Pagamento } from '@/types';

export interface PagamentoRequest {
  valor: number;
  tipo: 'pix' | 'cartao' | 'dinheiro' | 'cheque';
  promissoriaId?: string;
  parcelaId?: string;
  observacoes?: string;
}

export interface PagamentoDistribuirRequest {
  clienteId: string;
  valor: number;
  tipo: 'pix' | 'cartao' | 'dinheiro' | 'cheque';
  observacoes?: string;
}

export interface PagamentoFilters extends FilterParams {
  clienteId?: string;
  promissoriaId?: string;
  tipo?: 'pix' | 'cartao' | 'dinheiro' | 'cheque' | '';
  dataInicio?: string;
  dataFim?: string;
  valorMinimo?: number;
  valorMaximo?: number;
}

export interface EstornoResponse {
  success: boolean;
  message: string;
  pagamentoEstornado: Pagamento;
}

export const pagamentoService = {
  async getPagamentos(filters?: PagamentoFilters, pagination?: PageRequest): Promise<PageResponse<Pagamento>> {
    const params = { ...filters, ...pagination };
    return apiClient.get<PageResponse<Pagamento>>('/pagamentos', params);
  },

  async getPagamentoById(id: string): Promise<Pagamento> {
    return apiClient.get<Pagamento>(`/pagamentos/${id}`);
  },

  async createPagamento(pagamento: PagamentoRequest): Promise<Pagamento> {
    return apiClient.post<Pagamento>('/pagamentos', pagamento);
  },

  async updatePagamento(id: string, pagamento: Partial<PagamentoRequest>): Promise<Pagamento> {
    return apiClient.put<Pagamento>(`/pagamentos/${id}`, pagamento);
  },

  async deletePagamento(id: string): Promise<void> {
    return apiClient.delete<void>(`/pagamentos/${id}`);
  },

  async distribuirPorCliente(dados: PagamentoDistribuirRequest): Promise<any> {
    return apiClient.post<any>('/pagamentos/distribuir-por-cliente', dados);
  },

  async estornarPagamento(id: string): Promise<EstornoResponse> {
    return apiClient.post<EstornoResponse>(`/pagamentos/${id}/estornar`);
  },

  async getPagamentosByCliente(clienteId: string, pagination?: PageRequest): Promise<PageResponse<Pagamento>> {
    const params = { ...pagination };
    return apiClient.get<PageResponse<Pagamento>>(`/pagamentos/cliente/${clienteId}`, params);
  },

  async getPagamentosByPromissoria(promissoriaId: string): Promise<Pagamento[]> {
    return apiClient.get<Pagamento[]>(`/pagamentos/promissoria/${promissoriaId}`);
  }
};