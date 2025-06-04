
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithName: (nome: string, password: string) => Promise<void>;
  signUpWithName: (nome: string, password: string, role?: 'gerente' | 'funcionario') => Promise<void>;
  signOut: () => Promise<void>;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
    // Primeiro, buscar o usuário pelo nome para obter o ID
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('nome', nome)
      .single();

    if (profileError || !profileData) {
      throw new Error('Usuário não encontrado');
    }

    // Fazer login direto pelo ID do usuário usando a função admin
    const { data, error } = await supabase.auth.admin.getUserById(profileData.id);
    
    if (error || !data.user) {
      throw new Error('Erro ao autenticar usuário');
    }

    // Simular login bem-sucedido
    setUser(data.user);
    await fetchProfile(data.user.id);
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

    // Criar entrada de autenticação customizada (simulada)
    // Em um ambiente real, você salvaria a senha hasheada
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
