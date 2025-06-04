
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function GerenciarUsuarios() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role: 'funcionario' as 'gerente' | 'funcionario'
  });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signUp(formData.email, formData.password, formData.nome, formData.role);
      
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });

      // Limpar formulário
      setFormData({
        nome: '',
        email: '',
        password: '',
        role: 'funcionario'
      });

      // Recarregar lista
      fetchProfiles();

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao criar usuário: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, newRole: 'gerente' | 'funcionario') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setProfiles(prev =>
        prev.map(profile =>
          profile.id === userId
            ? { ...profile, role: newRole }
            : profile
        )
      );

      toast({
        title: "Sucesso",
        description: "Permissão atualizada com sucesso!",
      });

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissão: " + error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário para criar novo usuário */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Permissão</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'gerente' | 'funcionario') =>
                    setFormData(prev => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="funcionario">Funcionário</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de usuários existentes */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{profile.nome}</h3>
                  <Badge variant={profile.role === 'gerente' ? 'default' : 'secondary'}>
                    {profile.role === 'gerente' ? 'Gerente' : 'Funcionário'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={profile.role}
                    onValueChange={(value: 'gerente' | 'funcionario') =>
                      updateRole(profile.id, value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="funcionario">Funcionário</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
