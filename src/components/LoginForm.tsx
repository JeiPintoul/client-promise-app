
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from './ThemeToggle';

interface Usuario {
  id: string;
  nome: string;
  role: 'gerente' | 'funcionario';
}

export function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState<Usuario[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  
  const { signInWithName, signUpWithName } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Carregar lista de usuários do localStorage
    const todosUsuarios = JSON.parse(localStorage.getItem('all_users') || '[]');
    setUsuarios(todosUsuarios);
    setUsuariosFiltrados(todosUsuarios);
  }, []);

  useEffect(() => {
    // Filtrar usuários conforme o usuário digita
    if (formData.nome && isLogin) {
      const filtrados = usuarios.filter(user => 
        user.nome.toLowerCase().includes(formData.nome.toLowerCase())
      );
      setUsuariosFiltrados(filtrados);
    } else {
      setUsuariosFiltrados(usuarios);
    }
  }, [formData.nome, usuarios, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithName(formData.nome, formData.password);
        toast({
          title: "Sucesso",
          description: "Login realizado com sucesso!",
        });
      } else {
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Erro",
            description: "As senhas não coincidem.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        await signUpWithName(formData.nome, formData.password);
        toast({
          title: "Sucesso",
          description: "Usuário cadastrado com sucesso!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selecionarUsuario = (nomeUsuario: string) => {
    setFormData(prev => ({ ...prev, nome: nomeUsuario }));
    setMostrarSugestoes(false);
  };

  const handleFocusNome = () => {
    if (isLogin && usuarios.length > 0) {
      setMostrarSugestoes(true);
    }
  };

  const handleBlurNome = () => {
    // Delay para permitir clique nas sugestões
    setTimeout(() => setMostrarSugestoes(false), 150);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <ThemeToggle />
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {isLogin ? 'Entrar' : 'Cadastrar'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 relative">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                onFocus={handleFocusNome}
                onBlur={handleBlurNome}
                required
              />
              
              {/* Lista de sugestões de usuários */}
              {mostrarSugestoes && usuariosFiltrados.length > 0 && (
                <div className="absolute z-10 w-full bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {usuariosFiltrados.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center justify-between"
                      onClick={() => selecionarUsuario(usuario.nome)}
                    >
                      <span>{usuario.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {usuario.role === 'gerente' ? 'Gerente' : 'Funcionário'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required={!isLogin || formData.nome === '' || !usuarios.find(u => u.nome === formData.nome && u.role === 'funcionario')}
              />
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
