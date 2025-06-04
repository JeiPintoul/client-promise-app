export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          apelido: string | null
          cpf: string
          created_at: string | null
          elegibilidade: Database["public"]["Enums"]["eligibility_status"]
          endereco: string
          id: string
          nome: string
          telefone: string
          updated_at: string | null
        }
        Insert: {
          apelido?: string | null
          cpf: string
          created_at?: string | null
          elegibilidade?: Database["public"]["Enums"]["eligibility_status"]
          endereco: string
          id?: string
          nome: string
          telefone: string
          updated_at?: string | null
        }
        Update: {
          apelido?: string | null
          cpf?: string
          created_at?: string | null
          elegibilidade?: Database["public"]["Enums"]["eligibility_status"]
          endereco?: string
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          id: string
          nome: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      promissorias: {
        Row: {
          cliente_id: string
          created_at: string | null
          created_by: string
          data_emissao: string
          data_limite: string
          data_pagamento: string | null
          dias_atraso: number | null
          id: string
          numero_parcelas: number | null
          parcelado: boolean
          status: Database["public"]["Enums"]["payment_status"]
          valor: number
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          created_by: string
          data_emissao: string
          data_limite: string
          data_pagamento?: string | null
          dias_atraso?: number | null
          id?: string
          numero_parcelas?: number | null
          parcelado?: boolean
          status?: Database["public"]["Enums"]["payment_status"]
          valor: number
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          created_by?: string
          data_emissao?: string
          data_limite?: string
          data_pagamento?: string | null
          dias_atraso?: number | null
          id?: string
          numero_parcelas?: number | null
          parcelado?: boolean
          status?: Database["public"]["Enums"]["payment_status"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "promissorias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_overdue_payments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      is_manager: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      eligibility_status: "elegivel" | "nao_elegivel"
      payment_status: "em_aberto" | "pago" | "atrasado"
      user_role: "gerente" | "funcionario"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      eligibility_status: ["elegivel", "nao_elegivel"],
      payment_status: ["em_aberto", "pago", "atrasado"],
      user_role: ["gerente", "funcionario"],
    },
  },
} as const
