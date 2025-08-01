import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { toast } from '@/hooks/use-toast';

interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
  success: boolean;
}

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Adiciona token de autenticação automaticamente
    this.instance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        
        // Não adicionar token para o endpoint de login
        if (token && !config.url?.includes('/auth/login')) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Trata erros centralizadamente
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError<ApiError>) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError<ApiError>) {
    let message = 'Erro desconhecido';

    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          message = data?.message || 'Dados inválidos enviados';
          break;
        case 401:
          message = 'Sessão expirada. Faça login novamente';
          // Redirect to login or clear auth state
          localStorage.removeItem('auth_token');
          localStorage.removeItem('current_user');
          window.location.href = '/';
          break;
        case 403:
          message = 'Você não tem permissão para realizar esta ação';
          break;
        case 404:
          message = data?.message || 'Recurso não encontrado';
          break;
        case 422:
          message = data?.message || 'Dados fornecidos são inválidos';
          break;
        case 500:
          message = 'Erro interno do servidor. Tente novamente mais tarde';
          break;
        default:
          message = data?.message || `Erro HTTP ${status}`;
      }
    } else if (error.request) {
      message = 'Não foi possível conectar ao servidor. Verifique sua conexão';
    } else {
      message = error.message || 'Erro de configuração da requisição';
    }

    // Exibir toast de erro
    toast({
      title: 'Erro',
      description: message,
      variant: 'destructive',
    });
  }

  // Métodos genéricos para requisições
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.instance.get<ApiResponse<T>>(url, { params });
    return response.data.data || response.data as T;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.instance.post<ApiResponse<T>>(url, data);
    return response.data.data || response.data as T;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.instance.put<ApiResponse<T>>(url, data);
    return response.data.data || response.data as T;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.instance.patch<ApiResponse<T>>(url, data);
    return response.data.data || response.data as T;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.instance.delete<ApiResponse<T>>(url);
    return response.data.data || response.data as T;
  }

  // Método para upload de arquivos
  async upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.instance.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.data || response.data as T;
  }
}

// Instância singleton do cliente API
export const apiClient = new ApiClient();

// Tipos para paginação
export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'ASC' | 'DESC';
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

// Tipos para filtros
export interface FilterParams {
  [key: string]: string | number | boolean | Date | undefined;
}