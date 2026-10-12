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
      client_admin_actions: {
        Row: {
          action: string
          client_id: string
          client_name: string
          hours_moved: number
          id: string
          merged_into_client_id: string | null
          merged_into_client_name: string | null
          performed_at: string
          performed_by: string | null
          region: string | null
          sprints_deleted: number
          time_entries_moved: number
        }
        Insert: {
          action: string
          client_id: string
          client_name: string
          hours_moved?: number
          id?: string
          merged_into_client_id?: string | null
          merged_into_client_name?: string | null
          performed_at?: string
          performed_by?: string | null
          region?: string | null
          sprints_deleted?: number
          time_entries_moved?: number
        }
        Update: {
          action?: string
          client_id?: string
          client_name?: string
          hours_moved?: number
          id?: string
          merged_into_client_id?: string | null
          merged_into_client_name?: string | null
          performed_at?: string
          performed_by?: string | null
          region?: string | null
          sprints_deleted?: number
          time_entries_moved?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_admin_actions_merged_into_client_id_fkey"
            columns: ["merged_into_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_admin_actions_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active_sprints: number | null
          agency_value: number | null
          at_risk_sprint_count: number | null
          avg_billable_rate: number | null
          behind_sprint_count: number | null
          billable_contract_value: number | null
          campaign_start_date: string | null
          campaign_type: string | null
          client_priority: string | null
          completed_sprints: number | null
          contract_length: string | null
          created_at: string | null
          dpr_lead_id: string | null
          dpr_support_ids: string[] | null
          group_name: string | null
          has_incomplete_tracking: boolean | null
          id: string
          is_active: boolean | null
          is_quarterly_rate: boolean | null
          last_invoice_date: string | null
          last_report_date: string | null
          metrics_last_calculated_at: string | null
          monday_item_id: number
          monday_last_seen_at: string | null
          monday_removed_at: string | null
          monthly_hours: number | null
          monthly_rate: number | null
          name: string
          niche: string | null
          overall_utilization_percent: number | null
          region: string | null
          removal_decision: string | null
          removal_notified_at: string | null
          removal_reviewed_at: string | null
          removal_reviewed_by: string | null
          report_status: string | null
          seo_lead_name: string | null
          total_contract_revenue: number | null
          total_hours_allocated: number | null
          total_hours_used: number | null
          total_link_kpi: number | null
          total_links_achieved: number | null
          total_sprints: number | null
          updated_at: string | null
        }
        Insert: {
          active_sprints?: number | null
          agency_value?: number | null
          at_risk_sprint_count?: number | null
          avg_billable_rate?: number | null
          behind_sprint_count?: number | null
          billable_contract_value?: number | null
          campaign_start_date?: string | null
          campaign_type?: string | null
          client_priority?: string | null
          completed_sprints?: number | null
          contract_length?: string | null
          created_at?: string | null
          dpr_lead_id?: string | null
          dpr_support_ids?: string[] | null
          group_name?: string | null
          has_incomplete_tracking?: boolean | null
          id?: string
          is_active?: boolean | null
          is_quarterly_rate?: boolean | null
          last_invoice_date?: string | null
          last_report_date?: string | null
          metrics_last_calculated_at?: string | null
          monday_item_id: number
          monday_last_seen_at?: string | null
          monday_removed_at?: string | null
          monthly_hours?: number | null
          monthly_rate?: number | null
          name: string
          niche?: string | null
          overall_utilization_percent?: number | null
          region?: string | null
          removal_decision?: string | null
          removal_notified_at?: string | null
          removal_reviewed_at?: string | null
          removal_reviewed_by?: string | null
          report_status?: string | null
          seo_lead_name?: string | null
          total_contract_revenue?: number | null
          total_hours_allocated?: number | null
          total_hours_used?: number | null
          total_link_kpi?: number | null
          total_links_achieved?: number | null
          total_sprints?: number | null
          updated_at?: string | null
        }
        Update: {
          active_sprints?: number | null
          agency_value?: number | null
          at_risk_sprint_count?: number | null
          avg_billable_rate?: number | null
          behind_sprint_count?: number | null
          billable_contract_value?: number | null
          campaign_start_date?: string | null
          campaign_type?: string | null
          client_priority?: string | null
          completed_sprints?: number | null
          contract_length?: string | null
          created_at?: string | null
          dpr_lead_id?: string | null
          dpr_support_ids?: string[] | null
          group_name?: string | null
          has_incomplete_tracking?: boolean | null
          id?: string
          is_active?: boolean | null
          is_quarterly_rate?: boolean | null
          last_invoice_date?: string | null
          last_report_date?: string | null
          metrics_last_calculated_at?: string | null
          monday_item_id?: number
          monday_last_seen_at?: string | null
          monday_removed_at?: string | null
          monthly_hours?: number | null
          monthly_rate?: number | null
          name?: string
          niche?: string | null
          overall_utilization_percent?: number | null
          region?: string | null
          removal_decision?: string | null
          removal_notified_at?: string | null
          removal_reviewed_at?: string | null
          removal_reviewed_by?: string | null
          report_status?: string | null
          seo_lead_name?: string | null
          total_contract_revenue?: number | null
          total_hours_allocated?: number | null
          total_hours_used?: number | null
          total_link_kpi?: number | null
          total_links_achieved?: number | null
          total_sprints?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_dpr_lead_id_fkey"
            columns: ["dpr_lead_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_removal_reviewed_by_fkey"
            columns: ["removal_reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_clients_dpr_lead"
            columns: ["dpr_lead_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          billable_rate: number | null
          client_id: string
          created_at: string | null
          days_remaining: number | null
          end_date: string
          health_status: string | null
          hours_allocated: number | null
          hours_used: number | null
          hours_utilization_percent: number | null
          id: string
          kpi_achieved: number | null
          kpi_efficiency: number | null
          kpi_progress_percent: number | null
          kpi_target: number
          metrics_last_calculated_at: string | null
          monday_subitem_id: number
          monthly_rate: number | null
          name: string
          sprint_label: string | null
          sprint_number: number | null
          sprint_revenue: number | null
          start_date: string
          status: string | null
          time_elapsed_percent: number | null
          tracking_status:
            | Database["public"]["Enums"]["tracking_status_type"]
            | null
          updated_at: string | null
        }
        Insert: {
          billable_rate?: number | null
          client_id: string
          created_at?: string | null
          days_remaining?: number | null
          end_date: string
          health_status?: string | null
          hours_allocated?: number | null
          hours_used?: number | null
          hours_utilization_percent?: number | null
          id?: string
          kpi_achieved?: number | null
          kpi_efficiency?: number | null
          kpi_progress_percent?: number | null
          kpi_target: number
          metrics_last_calculated_at?: string | null
          monday_subitem_id: number
          monthly_rate?: number | null
          name: string
          sprint_label?: string | null
          sprint_number?: number | null
          sprint_revenue?: number | null
          start_date: string
          status?: string | null
          time_elapsed_percent?: number | null
          tracking_status?:
            | Database["public"]["Enums"]["tracking_status_type"]
            | null
          updated_at?: string | null
        }
        Update: {
          billable_rate?: number | null
          client_id?: string
          created_at?: string | null
          days_remaining?: number | null
          end_date?: string
          health_status?: string | null
          hours_allocated?: number | null
          hours_used?: number | null
          hours_utilization_percent?: number | null
          id?: string
          kpi_achieved?: number | null
          kpi_efficiency?: number | null
          kpi_progress_percent?: number | null
          kpi_target?: number
          metrics_last_calculated_at?: string | null
          monday_subitem_id?: number
          monthly_rate?: number | null
          name?: string
          sprint_label?: string | null
          sprint_number?: number | null
          sprint_revenue?: number | null
          start_date?: string
          status?: string | null
          time_elapsed_percent?: number | null
          tracking_status?:
            | Database["public"]["Enums"]["tracking_status_type"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprints_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          records_synced: number | null
          source: string
          status: string
          sync_end: string | null
          sync_start: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          records_synced?: number | null
          source: string
          status: string
          sync_end?: string | null
          sync_start: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          records_synced?: number | null
          source?: string
          status?: string
          sync_end?: string | null
          sync_start?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          client_id: string | null
          clockify_id: string
          created_at: string | null
          description: string | null
          entry_date: string
          hours: number
          id: string
          project_id: string | null
          project_name: string | null
          sprint_id: string | null
          tags: string[] | null
          task_category: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          clockify_id: string
          created_at?: string | null
          description?: string | null
          entry_date: string
          hours: number
          id?: string
          project_id?: string | null
          project_name?: string | null
          sprint_id?: string | null
          tags?: string[] | null
          task_category?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          clockify_id?: string
          created_at?: string | null
          description?: string | null
          entry_date?: string
          hours?: number
          id?: string
          project_id?: string | null
          project_name?: string | null
          sprint_id?: string | null
          tags?: string[] | null
          task_category?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          clockify_user_id: string | null
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          is_admin: boolean | null
          is_dpr_lead: boolean | null
          monday_person_id: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          clockify_user_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          is_dpr_lead?: boolean | null
          monday_person_id?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          clockify_user_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          is_dpr_lead?: boolean | null
          monday_person_id?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_email: { Args: never; Returns: string }
      calculate_billable_rate: {
        Args: { p_sprint_id: string }
        Returns: number
      }
      calculate_hours_utilization: {
        Args: { p_sprint_id: string }
        Returns: number
      }
      calculate_sprint_health: {
        Args: { p_sprint_id: string }
        Returns: string
      }
      delete_removed_client: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      get_removed_clients: {
        Args: never
        Returns: {
          dpr_lead_name: string
          group_name: string
          has_kpi_results: boolean
          hours_last_30_days: number
          hours_total: number
          id: string
          is_active: boolean
          last_time_entry: string
          monday_removed_at: string
          name: string
          region: string
          removal_decision: string
          removal_reviewed_at: string
          replacement_client_id: string
          replacement_client_name: string
          sprint_count: number
          time_entry_count: number
        }[]
      }
      get_sprint_hours: {
        Args: { sprint_ids: string[] }
        Returns: {
          sprint_id: string
          total_hours: number
        }[]
      }
      get_time_tracking_analytics: {
        Args: never
        Returns: {
          avg_hours: number
          dpr_lead_id: string
          sprint_count: number
          task_category: string
          total_hours: number
        }[]
      }
      get_time_tracking_by_person: {
        Args: never
        Returns: {
          avg_hours: number
          sprint_count: number
          task_category: string
          total_hours: number
          user_id: string
        }[]
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      merge_removed_client: {
        Args: { p_client_id: string; p_into_client_id: string }
        Returns: number
      }
      review_removed_client: {
        Args: { p_client_id: string; p_decision: string }
        Returns: undefined
      }
      sprint_for_entry: {
        Args: { p_client_id: string; p_entry_date: string }
        Returns: string
      }
    }
    Enums: {
      tracking_status_type:
        | "fully_tracked"
        | "kpi_only"
        | "hours_only"
        | "untracked"
        | "legacy"
        | "pending"
        | "partial"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      tracking_status_type: [
        "fully_tracked",
        "kpi_only",
        "hours_only",
        "untracked",
        "legacy",
        "pending",
        "partial",
      ],
    },
  },
} as const
