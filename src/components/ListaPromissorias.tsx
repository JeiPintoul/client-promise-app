
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FiltrosPromissorias } from './FiltrosPromissorias';
import { PromissoriasList } from './PromissoriasList';
import { ParcelasPromissoria } from './ParcelasPromissoria';
import { DetalhePagamentoParcela } from './DetalhePagamentoParcela';
import { type Promissoria, type Parcela, type Cliente } from '@/types';

type PromissoriaComCliente = Promissoria & { clienteNome: string };

export function ListaPromissorias() {
  const [todasPromissorias, setTodasPromissorias] = useState<PromissoriaComCliente[]>([]);
  const [promissoriasFiltratas, setPromissoriasFiltratas] = useState<PromissoriaComCliente[]>([]);
  const [promissoriaSelecionada, setPromissoriaSelecionada] = useState<Promissoria | null>(null);
  const [parcelaSelecionada, setParcelaSelecionada] = useState<{
    parcela: Parcela;
    promissoria: Promissoria;
  } | null>(null);

  useEffect(() => {
    carregarPromissorias();
  }, []);

  const carregarPromissorias = () => {
    try {
      const clientes = JSON.parse(localStorage.getItem('clientes') || '[]') as Cliente[];
      const promissoriasComCliente: PromissoriaComCliente[] = [];
      
      clientes.forEach(cliente => {
        if (cliente.promissorias && cliente.promissorias.length > 0) {
          cliente.promissorias.forEach(promissoria => {
            promissoriasComCliente.push({
              ...promissoria,
              clienteNome: cliente.nome
            });
          });
        }
      });

      setTodasPromissorias(promissoriasComCliente);
      setPromissoriasFiltratas(promissoriasComCliente);
    } catch (error) {
      console.error('Erro ao carregar promissórias:', error);
      setTodasPromissorias([]);
      setPromissoriasFiltratas([]);
    }
  };

  const handleFiltrosChange = (promissoriasFiltradasRecebidas: Promissoria[]) => {
    // Converter as promissórias filtradas de volta para o tipo com clienteNome
    const promissoriasComCliente = promissoriasFiltradasRecebidas.map(promissoria => {
      const promissoriaExistente = todasPromissorias.find(p => p.id === promissoria.id);
      return promissoriaExistente || { ...promissoria, clienteNome: '' };
    });
    setPromissoriasFiltratas(promissoriasComCliente);
  };

  const handleVerPagamentosParcela = (parcela: Parcela, promissoria: Promissoria) => {
    setParcelaSelecionada({ parcela, promissoria });
  };

  const handleVerDetalhes = (promissoria: Promissoria) => {
    setPromissoriaSelecionada(promissoria);
  };

  if (parcelaSelecionada) {
    return (
      <DetalhePagamentoParcela
        parcela={parcelaSelecionada.parcela}
        promissoria={parcelaSelecionada.promissoria}
        onBack={() => setParcelaSelecionada(null)}
        onPagamentoAtualizado={carregarPromissorias}
      />
    );
  }

  if (promissoriaSelecionada) {
    return (
      <ParcelasPromissoria
        promissoria={promissoriaSelecionada}
        onBack={() => setPromissoriaSelecionada(null)}
        onVerPagamentosParcela={handleVerPagamentosParcela}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Promissórias</h1>
        <Button>
          Nova Promissória
        </Button>
      </div>

      <FiltrosPromissorias
        promissorias={todasPromissorias}
        onPromissoriasFiltradasChange={handleFiltrosChange}
      />

      <PromissoriasList
        promissorias={promissoriasFiltratas}
        onVerDetalhes={handleVerDetalhes}
      />
    </div>
  );
}
