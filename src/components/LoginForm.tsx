
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function LoginForm() {
  const [nome, setNome] = useState('');
  const [password, setPassword] = useState('');
  const [nomeNovoUsuario, setNomeNovoUsuario] = useState('');
  const [senhaNovoUsuario, setSenhaNovoUsuario] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [users, setUsers] = useState<Array<{ nome: string; id: string }>>([]);
  const { signInWithName, signUpWithName, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('nome, id');
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isSignUp) {
        await signUpWithName(nomeNovoUsuario, senhaNovoUsuario, 'funcionario');
        
        toast({
          title: "Sucesso",
          description: "Usuário criado com sucesso!",
        });
        
        setIsSignUp(false);
        fetchUsers();
        setNomeNovoUsuario('');
        setSenhaNovoUsuario('');
      } else {
        await signInWithName(nome, password);
        
        toast({
          title: "Sucesso",
          description: "Login realizado com sucesso!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUserSelect = (userName: string) => {
    setSelectedUser(userName);
    setNome(userName);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isSignUp ? 'Criar Usuário' : 'Sistema de Gestão'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isSignUp && users.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="user-select">Selecionar Usuário</Label>
                <Select onValueChange={handleUserSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um usuário..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.nome}>
                        {user.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isSignUp ? (
              <div className="space-y-2">
                <Label htmlFor="nome-novo">Nome do Usuário</Label>
                <Input
                  id="nome-novo"
                  type="text"
                  value={nomeNovoUsuario}
                  onChange={(e) => setNomeNovoUsuario(e.target.value)}
                  placeholder="Digite o nome do usuário"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Usuário</Label>
                <Input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Digite seu nome"
                  required
                  disabled={selectedUser !== ''}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={isSignUp ? senhaNovoUsuario : password}
                onChange={(e) => isSignUp ? setSenhaNovoUsuario(e.target.value) : setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {isSignUp ? 'Criar Usuário' : 'Entrar'}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setNome('');
                  setPassword('');
                  setNomeNovoUsuario('');
                  setSenhaNovoUsuario('');
                  setSelectedUser('');
                }}
                className="text-sm"
              >
                {isSignUp ? 'Voltar ao Login' : 'Primeiro acesso? Criar conta'}
              </Button>
            </div>

            {!isSignUp && users.length === 0 && (
              <div className="text-center text-sm text-gray-600">
                <p>Nenhum usuário encontrado.</p>
                <p>Use "Primeiro acesso" para criar o primeiro usuário.</p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
