
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Trash2 } from 'lucide-react';

interface LocalUser {
  id: string;
  nome: string;
  role: 'gerente' | 'funcionario';
}

interface EditarUsuarioProps {
  usuario: LocalUser;
  onBack: () => void;
  onUpdate: () => void;
}

export function EditarUsuario({ usuario, onBack, onUpdate }: EditarUsuarioProps) {
  const [formData, setFormData] = useState({
    nome: usuario.nome,
    novaSenha: '',
    role: usuario.role
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  // Verificar se é o primeiro gerente (usuário com ID mais antigo e role gerente)
  const isPrimeiroGerente = () => {
    const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
    const gerentes = allUsers.filter((u: LocalUser) => u.role === 'gerente');
    return gerentes.length > 0 && gerentes[0].id === usuario.id;
  };

  // Verificar se o usuário atual pode editar este usuário
  const podeEditarRole = () => {
    if (user?.id === usuario.id) return false; // Não pode alterar próprio cargo
    if (isPrimeiroGerente()) return false; // Primeiro gerente não pode ter cargo alterado
    
    const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
    const gerentes = allUsers.filter((u: LocalUser) => u.role === 'gerente');
    const primeiroGerente = gerentes.length > 0 ? gerentes[0] : null;
    
    // Só o primeiro gerente pode alterar cargo de outros gerentes
    if (usuario.role === 'gerente' && user?.id !== primeiroGerente?.id) return false;
    
    return user?.role === 'gerente';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.nome.trim()) {
        toast({
          title: "Erro de Validação",
          description: "Nome é obrigatório.",
          variant: "destructive",
        });
        return;
      }

      // Verificar se já existe outro usuário com esse nome
      const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
      const nomeExistente = allUsers.find((u: LocalUser) => 
        u.nome.toLowerCase() === formData.nome.toLowerCase() && u.id !== usuario.id
      );

      if (nomeExistente) {
        toast({
          title: "Erro de Validação",
          description: "Já existe um usuário com esse nome.",
          variant: "destructive",
        });
        return;
      }

      // Atualizar dados do usuário
      const updatedUsers = allUsers.map((u: LocalUser) =>
        u.id === usuario.id ? { ...u, nome: formData.nome, role: formData.role } : u
      );
      localStorage.setItem('all_users', JSON.stringify(updatedUsers));

      // Atualizar dados individuais do usuário
      const userData = JSON.parse(localStorage.getItem(`user_${usuario.nome}`) || '{}');
      
      // Se o nome mudou, remover o registro antigo e criar novo
      if (formData.nome !== usuario.nome) {
        localStorage.removeItem(`user_${usuario.nome}`);
      }
      
      const updatedUserData = {
        ...userData,
        nome: formData.nome,
        role: formData.role,
        password: formData.novaSenha || userData.password
      };
      
      localStorage.setItem(`user_${formData.nome}`, JSON.stringify(updatedUserData));

      // Se for o usuário atual e mudou o nome, atualizar sessão
      if (user?.id === usuario.id) {
        const currentUser = {
          id: usuario.id,
          nome: formData.nome,
          role: formData.role
        };
        localStorage.setItem('current_user', JSON.stringify(currentUser));
      }

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      });

      onUpdate();
      onBack();

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // Não permitir exclusão do primeiro gerente
      if (isPrimeiroGerente()) {
        toast({
          title: "Erro",
          description: "O primeiro gerente não pode ser excluído.",
          variant: "destructive",
        });
        return;
      }

      // Remover usuário da lista
      const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
      const updatedUsers = allUsers.filter((u: LocalUser) => u.id !== usuario.id);
      localStorage.setItem('all_users', JSON.stringify(updatedUsers));

      // Remover dados individuais do usuário
      localStorage.removeItem(`user_${usuario.nome}`);

      // Se for o usuário atual, fazer logout
      if (user?.id === usuario.id) {
        await signOut();
        return;
      }

      toast({
        title: "Sucesso",
        description: "Conta excluída com sucesso!",
      });

      onUpdate();
      onBack();

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao excluir conta: " + error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-2xl font-bold">Editar Usuário</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="novaSenha">Nova Senha (deixe em branco para manter a atual)</Label>
              <Input
                id="novaSenha"
                type="password"
                value={formData.novaSenha}
                onChange={(e) => setFormData(prev => ({ ...prev, novaSenha: e.target.value }))}
              />
            </div>

            {podeEditarRole() && (
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
            )}

            {isPrimeiroGerente() && (
              <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                Este é o primeiro gerente do sistema e não pode ter seu cargo alterado.
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Atualizando...' : 'Atualizar Usuário'}
              </Button>

              {!isPrimeiroGerente() && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" type="button">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Conta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
                        {user?.id === usuario.id && " Você será desconectado do sistema."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
