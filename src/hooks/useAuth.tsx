
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  nome: string;
  role: 'gerente' | 'funcionario';
}

interface AuthContextType {
  user: User | null;
  profile: User | null;
  loading: boolean;
  signInWithName: (nome: string, password: string) => Promise<void>;
  signUpWithName: (nome: string, password: string, role?: 'gerente' | 'funcionario') => Promise<void>;
  signOut: () => Promise<void>;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing logged-in user in localStorage
    const currentUser = localStorage.getItem('current_user');
    if (currentUser) {
      const userData = JSON.parse(currentUser);
      setUser(userData);
      setProfile(userData);
    }
    setLoading(false);
  }, []);

  const signInWithName = async (nome: string, password: string) => {
    // Verificar credenciais no localStorage
    const savedUser = localStorage.getItem(`user_${nome}`);
    
    if (!savedUser) {
      throw new Error('Usuário não encontrado');
    }
    
    const userData = JSON.parse(savedUser);
    
    if (userData.password !== password) {
      throw new Error('Senha incorreta');
    }
    
    // Login bem-sucedido
    const userSession = {
      id: userData.id,
      nome: userData.nome,
      role: userData.role
    };
    
    setUser(userSession);
    setProfile(userSession);
    localStorage.setItem('current_user', JSON.stringify(userSession));
  };

  const signUpWithName = async (nome: string, password: string, role: 'gerente' | 'funcionario' = 'funcionario') => {
    // Verificar se já existe um usuário com esse nome
    const existingUser = localStorage.getItem(`user_${nome}`);
    if (existingUser) {
      throw new Error('Já existe um usuário com esse nome');
    }

    // Criar usuário localmente
    const userId = crypto.randomUUID();
    const newUser = {
      id: userId,
      nome,
      password,
      role
    };

    // Salvar no localStorage
    localStorage.setItem(`user_${nome}`, JSON.stringify(newUser));
    
    // Também salvar na lista de usuários para o dropdown
    const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
    allUsers.push({ id: userId, nome, role });
    localStorage.setItem('all_users', JSON.stringify(allUsers));
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('current_user');
  };

  const isManager = profile?.role === 'gerente';

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signInWithName,
      signUpWithName,
      signOut,
      isManager
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
