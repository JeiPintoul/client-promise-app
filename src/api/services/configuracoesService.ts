import { apiClient } from '../apiClient';

export interface Configuracoes {
  id: string;
  creditoPadraoNovosClientes: number;
  numeroParcelasPadrao: number;
  travarOpcoesFuncionarios: boolean;
  bloqueioAutomatico: {
    ativado: boolean;
    tipo: 'promissorias' | 'parcelas';
    quantidade: number;
  };
  notificacoes: {
    whatsapp: {
      ativado: boolean;
      apiKey?: string;
      telefoneRemetente?: string;
    };
    email: {
      ativado: boolean;
      servidor?: string;
      usuario?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface ConfiguracoesRequest {
  creditoPadraoNovosClientes?: number;
  numeroParcelasPadrao?: number;
  travarOpcoesFuncionarios?: boolean;
  bloqueioAutomatico?: {
    ativado: boolean;
    tipo: 'promissorias' | 'parcelas';
    quantidade: number;
  };
  notificacoes?: {
    whatsapp?: {
      ativado: boolean;
      apiKey?: string;
      telefoneRemetente?: string;
    };
    email?: {
      ativado: boolean;
      servidor?: string;
      usuario?: string;
    };
  };
}

export const configuracoesService = {
  async getConfiguracoes(): Promise<Configuracoes> {
    return apiClient.get<Configuracoes>('/configuracoes');
  },

  async updateConfiguracoes(configuracoes: ConfiguracoesRequest): Promise<Configuracoes> {
    return apiClient.put<Configuracoes>('/configuracoes', configuracoes);
  },

  async resetConfiguracoes(): Promise<Configuracoes> {
    return apiClient.post<Configuracoes>('/configuracoes/reset');
  }
};