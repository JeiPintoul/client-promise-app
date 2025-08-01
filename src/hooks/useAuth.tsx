
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/api/apiClient';

interface User {
  id: string;
  nome: string;
  role: 'gerente' | 'funcionario';
  ativo?: boolean;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
  signInWithName: (nome: string, password: string) => Promise<void>;
  signUpWithName: (nome: string, password: string, role?: 'gerente' | 'funcionario') => Promise<void>;
  signOut: () => Promise<void>;
  isManager: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      try {
        // Verificar token JWT primeiro
        const token = localStorage.getItem('auth_token');
        const currentUser = localStorage.getItem('current_user');
        
        if (token && currentUser) {
          // Verificar se o token ainda é válido
          const payload = JSON.parse(atob(token.split('.')[1]));
          const isExpired = payload.exp * 1000 <= Date.now();
          
          if (!isExpired) {
            const userData = JSON.parse(currentUser);
            setUser(userData);
            setProfile(userData);
          } else {
            // Token expirado, limpar dados
            localStorage.removeItem('auth_token');
            localStorage.removeItem('current_user');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const signInWithName = async (nome: string, password: string) => {
    try {
      // Tentar login via API primeiro
      const response = await apiClient.post<LoginResponse>('/auth/login', { nome, password });
      
      // Salvar token JWT e dados do usuário
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('current_user', JSON.stringify(response.user));
      
      setUser(response.user);
      setProfile(response.user);
    } catch (error: any) {
      // Fallback para localStorage (modo offline)
      const savedUser = localStorage.getItem(`user_${nome}`);
      
      if (!savedUser) {
        throw new Error('Usuário não encontrado');
      }
      
      const userData = JSON.parse(savedUser);
      
      if (userData.password === '' && password === '') {
        // Login sem senha permitido para funcionários
      } else if (userData.password !== password) {
        throw new Error('Senha incorreta');
      }
      
      const userSession = {
        id: userData.id,
        nome: userData.nome,
        role: userData.role
      };
      
      setUser(userSession);
      setProfile(userSession);
      localStorage.setItem('current_user', JSON.stringify(userSession));
    }
  };

  const signUpWithName = async (nome: string, password: string, role: 'gerente' | 'funcionario' = 'funcionario') => {
    try {
      // Tentar criar via API primeiro
      await apiClient.post('/auth/register', { nome, password, role });
    } catch (error: any) {
      // Fallback para localStorage (modo offline)
      const existingUser = localStorage.getItem(`user_${nome}`);
      if (existingUser) {
        throw new Error('Já existe um usuário com esse nome');
      }

      const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
      const finalRole = allUsers.length === 0 ? 'gerente' : role;

      const userId = crypto.randomUUID();
      const newUser = {
        id: userId,
        nome,
        password: password || '',
        role: finalRole
      };

      localStorage.setItem(`user_${nome}`, JSON.stringify(newUser));
      allUsers.push({ id: userId, nome, role: finalRole });
      localStorage.setItem('all_users', JSON.stringify(allUsers));
    }
  };

  const signOut = async () => {
    try {
      // Tentar logout via API
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Ignorar erros de logout da API
    } finally {
      // Sempre limpar dados locais
      setUser(null);
      setProfile(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    }
  };

  const isManager = profile?.role === 'gerente';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signInWithName,
      signUpWithName,
      signOut,
      isManager,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
