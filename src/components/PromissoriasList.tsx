
import { PromissoriaCard } from './PromissoriaCard';
import { type Promissoria } from '@/types';

type PromissoriaComCliente = Promissoria & { clienteNome: string };

interface PromissoriasListProps {
  promissorias: PromissoriaComCliente[];
  onVerDetalhes: (promissoria: Promissoria) => void;
}

export function PromissoriasList({ promissorias, onVerDetalhes }: PromissoriasListProps) {
  if (promissorias.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Nenhuma promissória encontrada com os filtros aplicados.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {promissorias.map((promissoria) => (
        <PromissoriaCard
          key={promissoria.id}
          promissoria={promissoria}
          onVerDetalhes={onVerDetalhes}
        />
      ))}
    </div>
  );
}
