import { apiClient, PageRequest, PageResponse, FilterParams } from '../apiClient';

export interface Usuario {
  id: string;
  nome: string;
  role: 'gerente' | 'funcionario';
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioRequest {
  nome: string;
  senha: string;
  role: 'gerente' | 'funcionario';
}

export interface AlterarSenhaRequest {
  senhaAtual: string;
  novaSenha: string;
}

export interface UsuarioFilters extends FilterParams {
  nome?: string;
  role?: 'gerente' | 'funcionario' | '';
  ativo?: boolean;
}

export const usuarioService = {
  async getUsuarios(filters?: UsuarioFilters, pagination?: PageRequest): Promise<PageResponse<Usuario>> {
    const params = { ...filters, ...pagination };
    return apiClient.get<PageResponse<Usuario>>('/usuarios/gerenciamento', params);
  },

  async getUsuarioById(id: string): Promise<Usuario> {
    return apiClient.get<Usuario>(`/usuarios/${id}`);
  },

  async createUsuario(usuario: UsuarioRequest): Promise<Usuario> {
    return apiClient.post<Usuario>('/usuarios', usuario);
  },

  async updateUsuario(id: string, usuario: Partial<UsuarioRequest>): Promise<Usuario> {
    return apiClient.put<Usuario>(`/usuarios/${id}`, usuario);
  },

  async desativarUsuario(id: string): Promise<void> {
    return apiClient.delete<void>(`/usuarios/${id}`);
  },

  async reativarUsuario(id: string): Promise<Usuario> {
    return apiClient.post<Usuario>(`/usuarios/${id}/reativar`);
  },

  async resetarSenha(id: string, novaSenha: string): Promise<void> {
    return apiClient.post<void>(`/usuarios/${id}/resetar-senha`, { novaSenha });
  },

  async alterarSenha(dados: AlterarSenhaRequest): Promise<void> {
    return apiClient.post<void>('/usuarios/alterar-senha', dados);
  }
};