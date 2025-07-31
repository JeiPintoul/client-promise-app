import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataPagination } from "@/components/ui/data-pagination";
import { DataFilters, FilterField } from "@/components/ui/data-filters";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, 
  UserPlus, 
  Edit, 
  UserX, 
  UserCheck,
  Shield,
  User
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EditarUsuario } from "./EditarUsuario";

interface LocalUser {
  id: string;
  nome: string;
  role: 'gerente' | 'funcionario';
  ativo: boolean;
  created_at: string;
}

export function GestaoUsuarios() {
  const { user: currentUser, isManager } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<LocalUser[]>([]);
  const [editingUser, setEditingUser] = useState<LocalUser | null>(null);
  const [showCadastro, setShowCadastro] = useState(false);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Filtros
  const [filters, setFilters] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filters]);

  const fetchUsers = () => {
    try {
      const allUsers = JSON.parse(localStorage.getItem('all_users') || '[]');
      const usersWithStatus = allUsers.map((user: any) => ({
        ...user,
        ativo: user.ativo !== false // Por padrão, usuários são ativos
      }));
      setUsers(usersWithStatus);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar a lista de usuários",
        variant: "destructive",
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Filtro por nome
    if (filters.nome) {
      filtered = filtered.filter(user => 
        user.nome.toLowerCase().includes(filters.nome.toLowerCase())
      );
    }

    // Filtro por status
    if (filters.status) {
      filtered = filtered.filter(user => {
        if (filters.status === 'ativo') return user.ativo;
        if (filters.status === 'inativo') return !user.ativo;
        return true; // 'todos'
      });
    }

    // Filtro por role
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset para primeira página quando filtros mudam
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleDesativarUsuario = (userId: string) => {
    try {
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, ativo: false } : user
      );
      setUsers(updatedUsers);
      
      // Atualizar localStorage
      localStorage.setItem('all_users', JSON.stringify(updatedUsers));
      
      toast({
        title: "Sucesso",
        description: "Usuário desativado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao desativar usuário",
        variant: "destructive",
      });
    }
  };

  const handleReativarUsuario = (userId: string) => {
    try {
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, ativo: true } : user
      );
      setUsers(updatedUsers);
      
      // Atualizar localStorage
      localStorage.setItem('all_users', JSON.stringify(updatedUsers));
      
      toast({
        title: "Sucesso",
        description: "Usuário reativado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao reativar usuário",
        variant: "destructive",
      });
    }
  };

  const isPrimeiroGerente = (userId: string): boolean => {
    const sortedUsers = [...users]
      .filter(u => u.role === 'gerente')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return sortedUsers[0]?.id === userId;
  };

  const podeAlterarUsuario = (targetUser: LocalUser): boolean => {
    if (!isManager) return false;
    if (targetUser.id === currentUser?.id) return true;
    return !isPrimeiroGerente(targetUser.id);
  };

  // Filtros disponíveis
  const filterFields: FilterField[] = [
    {
      key: 'nome',
      label: 'Nome',
      type: 'text',
      placeholder: 'Pesquisar por nome...',
      value: filters.nome
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'Selecionar status',
      options: [
        { value: 'ativo', label: 'Apenas Ativos' },
        { value: 'inativo', label: 'Apenas Inativos' }
      ],
      value: filters.status
    },
    {
      key: 'role',
      label: 'Tipo',
      type: 'select',
      placeholder: 'Selecionar tipo',
      options: [
        { value: 'gerente', label: 'Gerente' },
        { value: 'funcionario', label: 'Funcionário' }
      ],
      value: filters.role
    }
  ];

  // Paginação
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  if (editingUser) {
    return (
      <EditarUsuario 
        usuario={editingUser} 
        onBack={() => {
          setEditingUser(null);
          fetchUsers();
        }}
        onUpdate={() => {
          fetchUsers();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Gestão de Utilizadores</h1>
            <p className="text-muted-foreground">Gerir utilizadores do sistema</p>
          </div>
        </div>
        {isManager && (
          <Button onClick={() => setShowCadastro(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Novo Utilizador
          </Button>
        )}
      </div>

      {showCadastro && (
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar Novo Utilizador</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Aqui poderia integrar o formulário de cadastro existente */}
            <div className="text-center py-8">
              <p className="text-muted-foreground">Formulário de cadastro será integrado aqui</p>
              <Button 
                variant="outline" 
                onClick={() => setShowCadastro(false)}
                className="mt-4"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <DataFilters
            fields={filterFields}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Utilizadores ({totalItems})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {user.role === 'gerente' ? (
                    <Shield className="h-8 w-8 text-amber-600" />
                  ) : (
                    <User className="h-8 w-8 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{user.nome}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={user.role === 'gerente' ? 'default' : 'secondary'}>
                      {user.role === 'gerente' ? 'Gerente' : 'Funcionário'}
                    </Badge>
                    <Badge variant={user.ativo ? 'default' : 'destructive'}>
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {isPrimeiroGerente(user.id) && (
                      <Badge variant="outline">Primeiro Gerente</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {podeAlterarUsuario(user) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingUser(user)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                )}

                {isManager && !isPrimeiroGerente(user.id) && user.id !== currentUser?.id && (
                  <>
                    {user.ativo ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <UserX className="w-4 h-4 mr-2" />
                            Desativar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Desativar Utilizador</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja desativar o utilizador {user.nome}? 
                              Esta ação impedirá o acesso ao sistema, mas pode ser revertida.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDesativarUsuario(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Desativar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReativarUsuario(user.id)}
                        className="border-green-600 text-green-600 hover:bg-green-50"
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Reativar
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {currentUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum utilizador encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <DataPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}