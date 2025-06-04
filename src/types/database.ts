
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string;
          role: 'gerente' | 'funcionario';
          created_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          role?: 'gerente' | 'funcionario';
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          role?: 'gerente' | 'funcionario';
          created_at?: string;
        };
      };
      clientes: {
        Row: {
          id: string;
          nome: string;
          apelido: string | null;
          telefone: string;
          cpf: string;
          endereco: string;
          elegibilidade: 'elegivel' | 'nao_elegivel';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          apelido?: string | null;
          telefone: string;
          cpf: string;
          endereco: string;
          elegibilidade?: 'elegivel' | 'nao_elegivel';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          apelido?: string | null;
          telefone?: string;
          cpf?: string;
          endereco?: string;
          elegibilidade?: 'elegivel' | 'nao_elegivel';
          created_at?: string;
          updated_at?: string;
        };
      };
      promissorias: {
        Row: {
          id: string;
          cliente_id: string;
          valor: number;
          parcelado: boolean;
          numero_parcelas: number | null;
          data_emissao: string;
          data_limite: string;
          data_pagamento: string | null;
          status: 'em_aberto' | 'pago' | 'atrasado';
          dias_atraso: number;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          valor: number;
          parcelado?: boolean;
          numero_parcelas?: number | null;
          data_emissao: string;
          data_limite: string;
          data_pagamento?: string | null;
          status?: 'em_aberto' | 'pago' | 'atrasado';
          dias_atraso?: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          valor?: number;
          parcelado?: boolean;
          numero_parcelas?: number | null;
          data_emissao?: string;
          data_limite?: string;
          data_pagamento?: string | null;
          status?: 'em_aberto' | 'pago' | 'atrasado';
          dias_atraso?: number;
          created_by?: string;
          created_at?: string;
        };
      };
    };
  };
}
