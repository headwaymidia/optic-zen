export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contatos: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contatos_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          created_at: string
          description: string
          id: string
          lead_id: string
          store_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          lead_id: string
          store_id: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          lead_id?: string
          store_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          exam_date: string | null
          follow_up_count: number
          follow_up_date: string | null
          id: string
          interest_tag: string | null
          lab_name: string | null
          lab_order_number: string | null
          lab_status: string | null
          last_exam_date: string | null
          last_follow_up_at: string | null
          last_inbound_at: string | null
          last_interaction: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_source: string | null
          name: string
          next_return_date: string | null
          notes: string | null
          phone: string | null
          priority: string | null
          responsible_id: string | null
          rua: string | null
          sale_value: number | null
          status: string
          store_id: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          exam_date?: string | null
          follow_up_count?: number
          follow_up_date?: string | null
          id?: string
          interest_tag?: string | null
          lab_name?: string | null
          lab_order_number?: string | null
          lab_status?: string | null
          last_exam_date?: string | null
          last_follow_up_at?: string | null
          last_inbound_at?: string | null
          last_interaction?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_source?: string | null
          name: string
          next_return_date?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          responsible_id?: string | null
          rua?: string | null
          sale_value?: number | null
          status?: string
          store_id: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          exam_date?: string | null
          follow_up_count?: number
          follow_up_date?: string | null
          id?: string
          interest_tag?: string | null
          lab_name?: string | null
          lab_order_number?: string | null
          lab_status?: string | null
          last_exam_date?: string | null
          last_follow_up_at?: string | null
          last_inbound_at?: string | null
          last_interaction?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_source?: string | null
          name?: string
          next_return_date?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          responsible_id?: string | null
          rua?: string | null
          sale_value?: number | null
          status?: string
          store_id?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          lead_id: string | null
          read: boolean
          store_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          read?: boolean
          store_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          read?: boolean
          store_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_requests: {
        Row: {
          created_at: string
          email: string
          how: string
          id: string
          name: string
          status: string
          store_id: string | null
          user_id: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email: string
          how: string
          id?: string
          name: string
          status?: string
          store_id?: string | null
          user_id?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          email?: string
          how?: string
          id?: string
          name?: string
          status?: string
          store_id?: string | null
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          adicao: string | null
          av_od: string | null
          av_oe: string | null
          created_at: string
          created_by: string | null
          data_receita: string | null
          dnp: string | null
          id: string
          lead_id: string
          medico_crm: string | null
          medico_nome: string | null
          observacoes_medico: string | null
          od_altura: number | null
          od_base: string | null
          od_cilindrico: string | null
          od_dnp: number | null
          od_eixo: string | null
          od_esferico: string | null
          od_prisma: number | null
          oe_altura: number | null
          oe_base: string | null
          oe_cilindrico: string | null
          oe_dnp: number | null
          oe_eixo: string | null
          oe_esferico: string | null
          oe_prisma: number | null
          store_id: string
          tipo_lente: string | null
        }
        Insert: {
          adicao?: string | null
          av_od?: string | null
          av_oe?: string | null
          created_at?: string
          created_by?: string | null
          data_receita?: string | null
          dnp?: string | null
          id?: string
          lead_id: string
          medico_crm?: string | null
          medico_nome?: string | null
          observacoes_medico?: string | null
          od_altura?: number | null
          od_base?: string | null
          od_cilindrico?: string | null
          od_dnp?: number | null
          od_eixo?: string | null
          od_esferico?: string | null
          od_prisma?: number | null
          oe_altura?: number | null
          oe_base?: string | null
          oe_cilindrico?: string | null
          oe_dnp?: number | null
          oe_eixo?: string | null
          oe_esferico?: string | null
          oe_prisma?: number | null
          store_id: string
          tipo_lente?: string | null
        }
        Update: {
          adicao?: string | null
          av_od?: string | null
          av_oe?: string | null
          created_at?: string
          created_by?: string | null
          data_receita?: string | null
          dnp?: string | null
          id?: string
          lead_id?: string
          medico_crm?: string | null
          medico_nome?: string | null
          observacoes_medico?: string | null
          od_altura?: number | null
          od_base?: string | null
          od_cilindrico?: string | null
          od_dnp?: number | null
          od_eixo?: string | null
          od_esferico?: string | null
          od_prisma?: number | null
          oe_altura?: number | null
          oe_base?: string | null
          oe_cilindrico?: string | null
          oe_dnp?: number | null
          oe_eixo?: string | null
          oe_esferico?: string | null
          oe_prisma?: number | null
          store_id?: string
          tipo_lente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      store_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          store_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: string
          status?: string
          store_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          store_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          id: string
          role: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          city: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          state: string | null
          team_size: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          state?: string | null
          team_size?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          state?: string | null
          team_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_cycle: string
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          status: string
          store_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          store_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          store_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tarefas: {
        Row: {
          assigned_to: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          connected_at: string | null
          created_at: string
          evolution_api_key: string | null
          evolution_api_url: string | null
          evolution_instance_name: string | null
          id: string
          meta_access_token: string | null
          meta_phone_number_id: string | null
          meta_webhook_verify_token: string | null
          phone_number: string | null
          provider: string
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          evolution_instance_name?: string | null
          id?: string
          meta_access_token?: string | null
          meta_phone_number_id?: string | null
          meta_webhook_verify_token?: string | null
          phone_number?: string | null
          provider?: string
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          evolution_api_key?: string | null
          evolution_api_url?: string | null
          evolution_instance_name?: string | null
          id?: string
          meta_access_token?: string | null
          meta_phone_number_id?: string | null
          meta_webhook_verify_token?: string | null
          phone_number?: string | null
          provider?: string
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          created_at: string
          from_me: boolean
          id: string
          instance_name: string | null
          lead_id: string | null
          media_type: string | null
          media_url: string | null
          message_id: string | null
          remote_jid: string | null
          status: string | null
          store_id: string
          timestamp: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          from_me?: boolean
          id?: string
          instance_name?: string | null
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          message_id?: string | null
          remote_jid?: string | null
          status?: string | null
          store_id: string
          timestamp?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          from_me?: boolean
          id?: string
          instance_name?: string | null
          lead_id?: string | null
          media_type?: string | null
          media_url?: string | null
          message_id?: string | null
          remote_jid?: string | null
          status?: string | null
          store_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _actor_name: { Args: never; Returns: string }
      accept_store_invite: { Args: { _token: string }; Returns: string }
      auto_move_due_returns: { Args: never; Returns: number }
      generate_cooling_notifications: { Args: never; Returns: number }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          role: string
          status: string
          store_id: string
          store_name: string
        }[]
      }
      has_store_role: {
        Args: { _roles: string[]; _store_id: string; _user_id: string }
        Returns: boolean
      }
      increment_lead_unread: { Args: { _lead_id: string }; Returns: undefined }
      is_store_member: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      recalc_lead_next_return: {
        Args: { _lead_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
