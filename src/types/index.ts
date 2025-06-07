
// Tipos principais do sistema
export interface Cliente {
  id: string;
  nome: string;
  apelido?: string | null;
  telefone: string;
  cpf: string;
  endereco: string;
  elegibilidade: 'elegivel' | 'nao_elegivel';
  created_at: string;
  updated_at: string;
}

export interface Parcela {
  id: string;
  numero: number;
  valor: number;
  valorPago: number; // Valor já pago desta parcela
  dataVencimento: string;
  paga: boolean;
  pagoComAtraso: boolean; // Novo campo para indicar se foi pago com atraso
  status: 'pendente' | 'pago' | 'atrasado' | 'pago_com_atraso';
  pagamentos: Pagamento[]; // Pagamentos específicos desta parcela
}

export interface Promissoria {
  id: string;
  valor: number;
  valorPago: number; // Valor total já pago desta promissória
  dataEmissao: string;
  dataLimite: string;
  parcelado: boolean;
  numeroParcelas?: number;
  parcelas?: Parcela[];
  observacoes?: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'pago_com_atraso';
  pagamentos: Pagamento[]; // Pagamentos da promissória como um todo
  created_at: string;
  updated_at: string;
}

export interface Pagamento {
  id: string;
  valor: number;
  tipo: 'pix' | 'cartao' | 'dinheiro' | 'cheque';
  dataHora: string;
  promissoriaId?: string; // ID da promissória afetada
  parcelaId?: string; // ID da parcela específica (se for pagamento de parcela)
  observacoes?: string;
  created_at: string;
}

export interface EstatisticasCliente {
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
  valorAtrasado: number;
  pagamentosNoTempo: number;
  pagamentosAtrasados: number;
  pagamentosPendentes: number;
}

// Tipos para ordenação e filtros
export type OrdemPagamento = 'data_asc' | 'data_desc' | 'valor_asc' | 'valor_desc';
export type FiltroPagamento = 'todos' | 'no_tempo' | 'atrasados';

// Enums para melhor tipagem
export const TipoPagamento = {
  PIX: 'pix' as const,
  CARTAO: 'cartao' as const,
  DINHEIRO: 'dinheiro' as const,
  CHEQUE: 'cheque' as const
} as const;

export const StatusPagamento = {
  PENDENTE: 'pendente' as const,
  PAGO: 'pago' as const,
  ATRASADO: 'atrasado' as const,
  PAGO_COM_ATRASO: 'pago_com_atraso' as const
} as const;
