
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, X } from 'lucide-react';
import { type Promissoria } from '@/types';

interface FiltrosPromissoriasProps {
  promissorias: Promissoria[];
  onPromissoriasFiltradasChange: (promissoriasAtualizadas: Promissoria[]) => void;
}

type StatusFiltro = 'todos' | 'pendente' | 'atrasado' | 'pago';
type OrdemFiltro = 'data_emissao_desc' | 'data_emissao_asc' | 'valor_desc' | 'valor_asc' | 'data_limite_asc';

export function FiltrosPromissorias({ promissorias, onPromissoriasFiltradasChange }: FiltrosPromissoriasProps) {
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('todos');
  const [ordemFiltro, setOrdemFiltro] = useState<OrdemFiltro>('data_limite_asc');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const aplicarFiltros = () => {
    let resultado = [...promissorias];

    // Filtro de busca (por valor ou observações)
    if (busca.trim()) {
      const termoBusca = busca.toLowerCase().trim();
      resultado = resultado.filter(promissoria => 
        promissoria.valor.toString().includes(termoBusca) ||
        promissoria.observacoes?.toLowerCase().includes(termoBusca) ||
        promissoria.id.toLowerCase().includes(termoBusca)
      );
    }

    // Filtro por status
    if (statusFiltro !== 'todos') {
      resultado = resultado.filter(promissoria => promissoria.status === statusFiltro);
    }

    // Filtro por data
    if (dataInicio) {
      resultado = resultado.filter(promissoria => 
        new Date(promissoria.dataEmissao) >= new Date(dataInicio)
      );
    }
    if (dataFim) {
      resultado = resultado.filter(promissoria => 
        new Date(promissoria.dataEmissao) <= new Date(dataFim)
      );
    }

    // Ordenação
    resultado.sort((a, b) => {
      switch (ordemFiltro) {
        case 'data_emissao_desc':
          return new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime();
        case 'data_emissao_asc':
          return new Date(a.dataEmissao).getTime() - new Date(b.dataEmissao).getTime();
        case 'valor_desc':
          return b.valor - a.valor;
        case 'valor_asc':
          return a.valor - b.valor;
        case 'data_limite_asc':
          return new Date(a.dataLimite).getTime() - new Date(b.dataLimite).getTime();
        default:
          return 0;
      }
    });

    // Priorizar atrasadas primeiro quando status é 'todos'
    if (statusFiltro === 'todos') {
      const atrasadas = resultado.filter(p => p.status === 'atrasado');
      const pendentes = resultado.filter(p => p.status === 'pendente');
      const pagas = resultado.filter(p => p.status === 'pago');
      resultado = [...atrasadas, ...pendentes, ...pagas];
    }

    onPromissoriasFiltradasChange(resultado);
  };

  const limparFiltros = () => {
    setBusca('');
    setStatusFiltro('todos');
    setOrdemFiltro('data_limite_asc');
    setDataInicio('');
    setDataFim('');
    onPromissoriasFiltradasChange(promissorias);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtros e Busca
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="busca">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="busca"
                placeholder="Valor, ID ou observações..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={statusFiltro} onValueChange={(value: StatusFiltro) => setStatusFiltro(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="atrasado">Atrasadas</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="pago">Pagas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ordem">Ordenar por</Label>
            <Select value={ordemFiltro} onValueChange={(value: OrdemFiltro) => setOrdemFiltro(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="data_limite_asc">Vencimento (mais próximo)</SelectItem>
                <SelectItem value="data_emissao_desc">Data de emissão (mais recente)</SelectItem>
                <SelectItem value="data_emissao_asc">Data de emissão (mais antiga)</SelectItem>
                <SelectItem value="valor_desc">Valor (maior)</SelectItem>
                <SelectItem value="valor_asc">Valor (menor)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataInicio">Data início</Label>
            <Input
              id="dataInicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataFim">Data fim</Label>
            <Input
              id="dataFim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={aplicarFiltros} className="flex-1">
            <Search className="w-4 h-4 mr-2" />
            Aplicar Filtros
          </Button>
          <Button variant="outline" onClick={limparFiltros}>
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
