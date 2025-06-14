
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { EditarUsuario } from './EditarUsuario';
import { Edit, UserPlus } from 'lucide-react';

interface LocalUser {
  id: string;
  nome: string;
  role: 'gerente' | 'funcionario';
}

export function GerenciarUsuarios() {
  const [profiles, setProfiles] = useState<LocalUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<LocalUser | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    password: '',
    role: 'funcionario' as 'gerente' | 'funcionario',
    semSenha: false
  });
  const [loading, setLoading] = useState(false);
  const { signUpWithName, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = () => {
    try {
      const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
      setProfiles(allUsers);
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
      // Se é funcionário sem senha, usar senha vazia
      const senha = formData.role === 'funcionario' && formData.semSenha ? '' : formData.password;
      
      // Para funcionários sem senha, não exigir senha
      if (formData.role === 'gerente' && !formData.password) {
        toast({
          title: "Erro de Validação",
          description: "Gerentes devem ter uma senha.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.semSenha && !formData.password && formData.role === 'funcionario') {
        toast({
          title: "Erro de Validação",
          description: "Digite uma senha ou marque a opção 'Funcionário sem senha'.",
          variant: "destructive",
        });
        return;
      }

      await signUpWithName(formData.nome, senha, formData.role);
      
      toast({
        title: "Sucesso",
        description: formData.semSenha 
          ? "Funcionário criado sem senha com sucesso!" 
          : "Usuário criado com sucesso!",
      });

      // Limpar formulário
      setFormData({
        nome: '',
        password: '',
        role: 'funcionario',
        semSenha: false
      });

      setShowCreateForm(false);
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

  const updateRole = (userId: string, newRole: 'gerente' | 'funcionario') => {
    try {
      // Verificar se é o primeiro gerente
      const gerentes = profiles.filter(p => p.role === 'gerente');
      const primeiroGerente = gerentes.length > 0 ? gerentes[0] : null;
      
      if (primeiroGerente?.id === userId) {
        toast({
          title: "Erro",
          description: "O primeiro gerente não pode ter seu cargo alterado.",
          variant: "destructive",
        });
        return;
      }

      // Verificar se o usuário atual pode alterar este cargo
      const targetUser = profiles.find(p => p.id === userId);
      if (targetUser?.role === 'gerente' && user?.id !== primeiroGerente?.id) {
        toast({
          title: "Erro",
          description: "Apenas o primeiro gerente pode alterar o cargo de outros gerentes.",
          variant: "destructive",
        });
        return;
      }

      const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
      const updatedUsers = allUsers.map((user: LocalUser) =>
        user.id === userId ? { ...user, role: newRole } : user
      );
      
      localStorage.setItem('all_users', JSON.stringify(updatedUsers));
      
      // Atualizar também nos dados do usuário individual
      const userToUpdate = updatedUsers.find((user: LocalUser) => user.id === userId);
      if (userToUpdate) {
        const userData = JSON.parse(localStorage.getItem(`user_${userToUpdate.nome}`) || '{}');
        userData.role = newRole;
        localStorage.setItem(`user_${userToUpdate.nome}`, JSON.stringify(userData));
      }

      setProfiles(updatedUsers);

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

  const isPrimeiroGerente = (userId: string) => {
    const gerentes = profiles.filter(p => p.role === 'gerente');
    return gerentes.length > 0 && gerentes[0].id === userId;
  };

  const podeAlterarRole = (targetUser: LocalUser) => {
    if (isPrimeiroGerente(targetUser.id)) return false;
    
    const gerentes = profiles.filter(p => p.role === 'gerente');
    const primeiroGerente = gerentes.length > 0 ? gerentes[0] : null;
    
    if (targetUser.role === 'gerente' && user?.id !== primeiroGerente?.id) return false;
    
    return user?.role === 'gerente';
  };

  const temSenha = (nomeUsuario: string) => {
    try {
      const userData = JSON.parse(localStorage.getItem(`user_${nomeUsuario}`) || '{}');
      return userData.password && userData.password !== '';
    } catch {
      return false;
    }
  };

  if (selectedUser) {
    return (
      <EditarUsuario
        usuario={selectedUser}
        onBack={() => setSelectedUser(null)}
        onUpdate={fetchProfiles}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Botão para criar novo usuário */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
        <Button onClick={() => setShowCreateForm(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Criar Novo Usuário
        </Button>
      </div>

      {/* Formulário para criar novo usuário */}
      {showCreateForm && (
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
                  <Label htmlFor="role">Permissão</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'gerente' | 'funcionario') =>
                      setFormData(prev => ({ ...prev, role: value, semSenha: value === 'gerente' ? false : prev.semSenha }))
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

                {formData.role === 'funcionario' && (
                  <div className="flex items-center space-x-2 md:col-span-2">
                    <Checkbox
                      id="semSenha"
                      checked={formData.semSenha}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ 
                          ...prev, 
                          semSenha: !!checked,
                          password: checked ? '' : prev.password
                        }))
                      }
                    />
                    <Label htmlFor="semSenha" className="text-sm">
                      Funcionário sem senha (apenas para acesso limitado)
                    </Label>
                  </div>
                )}

                {!formData.semSenha && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="password">
                      Senha {formData.role === 'gerente' ? '(obrigatória)' : '(opcional se marcado "sem senha")'}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required={formData.role === 'gerente' || !formData.semSenha}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Criando...' : 'Criar Usuário'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de usuários existentes */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-semibold">{profile.nome}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={profile.role === 'gerente' ? 'default' : 'secondary'}>
                        {profile.role === 'gerente' ? 'Gerente' : 'Funcionário'}
                      </Badge>
                      {!temSenha(profile.nome) && profile.role === 'funcionario' && (
                        <Badge variant="outline">
                          Sem Senha
                        </Badge>
                      )}
                      {isPrimeiroGerente(profile.id) && (
                        <Badge variant="outline">
                          Primeiro Gerente
                        </Badge>
                      )}
                      {user?.id === profile.id && (
                        <Badge variant="outline">
                          Você
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUser(profile)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  {podeAlterarRole(profile) && (
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
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
