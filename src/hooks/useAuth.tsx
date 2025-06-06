
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  signInWithName: (nome: string, password: string) => Promise<void>;
  signUpWithName: (nome: string, password: string, role?: 'gerente' | 'funcionario') => Promise<void>;
  signOut: () => Promise<void>;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing logged-in user in localStorage
    const currentUser = localStorage.getItem('current_user');
    if (currentUser) {
      const userData = JSON.parse(currentUser);
      setUser(userData);
      fetchProfile(userData.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

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
    
    // Buscar perfil no banco
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('nome', nome)
      .single();
      
    if (error || !profile) {
      throw new Error('Perfil não encontrado');
    }
    
    // Simular login bem-sucedido
    const userSession = {
      id: profile.id,
      nome: profile.nome,
      role: profile.role
    };
    
    setUser(userSession);
    setProfile(profile);
    localStorage.setItem('current_user', JSON.stringify(userSession));
  };

  const signUpWithName = async (nome: string, password: string, role: 'gerente' | 'funcionario' = 'funcionario') => {
    // Verificar se já existe um usuário com esse nome
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('nome', nome)
      .single();

    if (existingProfile) {
      throw new Error('Já existe um usuário com esse nome');
    }

    // Verificar se já existe no localStorage
    const existingUser = localStorage.getItem(`user_${nome}`);
    if (existingUser) {
      throw new Error('Já existe um usuário com esse nome');
    }

    // Criar usuário diretamente na tabela profiles
    const userId = crypto.randomUUID();
    
    const { error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          nome,
          role
        }
      ]);
    
    if (error) {
      throw error;
    }

    // Salvar credenciais no localStorage
    localStorage.setItem(`user_${nome}`, JSON.stringify({ 
      id: userId, 
      nome, 
      password, 
      role 
    }));
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
