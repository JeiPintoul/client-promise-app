
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useClientes } from '@/hooks/useClientes';
import { validarCPF, validarTelefone, formatarCPF, formatarTelefone } from '@/utils/validations';

export function CadastroCliente() {
  const [formData, setFormData] = useState({
    nome: '',
    apelido: '',
    telefone: '',
    cpf: '',
    endereco: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { createCliente } = useClientes();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    
    // Formatação automática para CPF e telefone
    if (name === 'cpf') {
      processedValue = formatarCPF(value);
    } else if (name === 'telefone') {
      processedValue = formatarTelefone(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const validarFormulario = (): boolean => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro de Validação",
        description: "Nome é obrigatório.",
        variant: "destructive",
      });
      return false;
    }

    if (!validarCPF(formData.cpf)) {
      toast({
        title: "Erro de Validação",
        description: "CPF inválido. Verifique o número digitado.",
        variant: "destructive",
      });
      return false;
    }

    if (!validarTelefone(formData.telefone)) {
      toast({
        title: "Erro de Validação",
        description: "Telefone inválido. Deve conter 10 ou 11 dígitos.",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.endereco.trim()) {
      toast({
        title: "Erro de Validação",
        description: "Endereço é obrigatório.",
        variant: "destructive",
      });
      return false;
    }

    // Verificar se CPF já está cadastrado
    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    const cpfLimpo = formData.cpf.replace(/[^\d]/g, '');
    const cpfExistente = clientes.find((cliente: any) => 
      cliente.cpf.replace(/[^\d]/g, '') === cpfLimpo
    );

    if (cpfExistente) {
      toast({
        title: "Erro de Validação",
        description: "Já existe um cliente cadastrado com este CPF.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }
    
    setLoading(true);

    try {
      const clienteData = {
        nome: formData.nome.trim(),
        apelido: formData.apelido.trim() || undefined,
        telefone: formData.telefone,
        cpf: formData.cpf,
        endereco: formData.endereco.trim(),
        elegibilidade: 'elegivel' as const
      };

      await createCliente(clienteData);

      toast({
        title: "Sucesso",
        description: "Cliente cadastrado com sucesso!",
      });

      // Limpar formulário
      setFormData({
        nome: '',
        apelido: '',
        telefone: '',
        cpf: '',
        endereco: ''
      });

    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao cadastrar cliente: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apelido">Apelido</Label>
              <Input
                id="apelido"
                name="apelido"
                value={formData.apelido}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleInputChange}
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                name="cpf"
                value={formData.cpf}
                onChange={handleInputChange}
                placeholder="000.000.000-00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço *</Label>
            <Textarea
              id="endereco"
              name="endereco"
              value={formData.endereco}
              onChange={handleInputChange}
              required
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar Cliente'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
