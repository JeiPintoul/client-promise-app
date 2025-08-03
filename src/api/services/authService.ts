import { apiClient } from '../apiClient';

export interface LoginRequest {
  nome: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    nome: string;
    role: 'gerente' | 'funcionario';
    ativo: boolean;
  };
}

export interface CreateUserRequest {
  nome: string;
  senha: string;
  role: 'gerente' | 'funcionario';
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', credentials);
  },

  async createUser(userData: CreateUserRequest): Promise<void> {
    return apiClient.post<void>('/usuarios', userData);
  },

  async refreshToken(): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/refresh');
  },

  async logout(): Promise<void> {
    return apiClient.post<void>('/auth/logout');
  },

  // Validar token
  isTokenValid(): boolean {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  // Decodificar token
  decodeToken(): any {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
};