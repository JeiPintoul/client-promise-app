import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

interface LocalUser {
  id: string;
  nome: string;
  role: 'gerente' | 'funcionario';
  ativo: boolean;
  created_at: string;
}

interface EditarUsuarioProps {
  usuario: LocalUser;
  onBack: () => void;
  onUpdate: () => void;
}

export function EditarUsuario({ usuario, onBack, onUpdate }: EditarUsuarioProps) {
  const [formData, setFormData] = useState({
    nome: usuario.nome,
    role: usuario.role,
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (!formData.nome.trim()) {
        toast({
          title: "Erro",
          description: "Nome é obrigatório",
          variant: "destructive",
        });
        return;
      }

      if (formData.password && formData.password !== formData.confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem",
          variant: "destructive",
        });
        return;
      }

      // Atualizar dados no localStorage
      const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
      const updatedUsers = allUsers.map((user: LocalUser) => 
        user.id === usuario.id 
          ? { ...user, nome: formData.nome.trim(), role: formData.role }
          : user
      );
      
      localStorage.setItem('all_users', JSON.stringify(updatedUsers));

      // Se houver nova senha, atualizar dados específicos do usuário
      if (formData.password) {
        const userData = JSON.parse(localStorage.getItem(`user_${usuario.nome}`) || '{}');
        userData.password = formData.password;
        localStorage.setItem(`user_${formData.nome.trim()}`, JSON.stringify(userData));
        
        // Se o nome mudou, remover dados antigos
        if (formData.nome.trim() !== usuario.nome) {
          localStorage.removeItem(`user_${usuario.nome}`);
        }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">Editar Usuário</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Usuário</CardTitle>
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
              <Label htmlFor="role">Tipo de Usuário</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as 'gerente' | 'funcionario' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="funcionario">Funcionário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha (opcional)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Deixe em branco para não alterar"
              />
            </div>

            {formData.password && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button type="button" variant="outline" onClick={onBack}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}