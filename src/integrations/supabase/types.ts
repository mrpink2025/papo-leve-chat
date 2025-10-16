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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      call_notifications: {
        Row: {
          call_type: string
          caller_id: string
          conversation_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          ringtone: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          call_type: string
          caller_id: string
          conversation_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          ringtone?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          call_type?: string
          caller_id?: string
          conversation_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          ringtone?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          added_at: string | null
          blocked: boolean | null
          contact_id: string
          favorite: boolean | null
          id: string
          nickname: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          blocked?: boolean | null
          contact_id: string
          favorite?: boolean | null
          id?: string
          nickname?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          blocked?: boolean | null
          contact_id?: string
          favorite?: boolean | null
          id?: string
          nickname?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_notification_settings: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          mode: string
          muted_until: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          mode?: string
          muted_until?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          mode?: string
          muted_until?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_notification_settings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          archived: boolean | null
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          muted: boolean | null
          role: string | null
          user_id: string
        }
        Insert: {
          archived?: boolean | null
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          muted?: boolean | null
          role?: string | null
          user_id: string
        }
        Update: {
          archived?: boolean | null
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          muted?: boolean | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      group_call_participants: {
        Row: {
          created_at: string | null
          id: string
          is_host: boolean | null
          joined_at: string | null
          left_at: string | null
          session_id: string
          status: string
          stream_config: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          session_id: string
          status?: string
          stream_config?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_host?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          session_id?: string
          status?: string
          stream_config?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_call_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_call_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_call_sessions: {
        Row: {
          call_type: string
          conversation_id: string
          created_at: string | null
          created_by: string
          ended_at: string | null
          id: string
          started_at: string
          state: string
          updated_at: string | null
        }
        Insert: {
          call_type: string
          conversation_id: string
          created_at?: string | null
          created_by: string
          ended_at?: string | null
          id?: string
          started_at?: string
          state?: string
          updated_at?: string | null
        }
        Update: {
          call_type?: string
          conversation_id?: string
          created_at?: string | null
          created_by?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          state?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_call_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_call_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_status: {
        Row: {
          id: string
          message_id: string
          status: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          status: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          status?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          deleted: boolean | null
          edited: boolean | null
          id: string
          metadata: Json | null
          reply_to: string | null
          sender_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          deleted?: boolean | null
          edited?: boolean | null
          id?: string
          metadata?: Json | null
          reply_to?: string | null
          sender_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          deleted?: boolean | null
          edited?: boolean | null
          id?: string
          metadata?: Json | null
          reply_to?: string | null
          sender_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_category_preferences: {
        Row: {
          category: Database["public"]["Enums"]["notification_category"]
          created_at: string | null
          enabled: boolean | null
          group_similar: boolean | null
          id: string
          priority: Database["public"]["Enums"]["notification_priority"] | null
          sound_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["notification_category"]
          created_at?: string | null
          enabled?: boolean | null
          group_similar?: boolean | null
          id?: string
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["notification_category"]
          created_at?: string | null
          enabled?: boolean | null
          group_similar?: boolean | null
          id?: string
          priority?: Database["public"]["Enums"]["notification_priority"] | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_category_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_history: {
        Row: {
          body: string
          category: Database["public"]["Enums"]["notification_category"]
          conversation_id: string
          created_at: string | null
          expires_at: string | null
          grouped_count: number | null
          id: string
          priority: Database["public"]["Enums"]["notification_priority"]
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          category: Database["public"]["Enums"]["notification_category"]
          conversation_id: string
          created_at?: string | null
          expires_at?: string | null
          grouped_count?: number | null
          id?: string
          priority: Database["public"]["Enums"]["notification_priority"]
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: Database["public"]["Enums"]["notification_category"]
          conversation_id?: string
          created_at?: string | null
          expires_at?: string | null
          grouped_count?: number | null
          id?: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          badge_enabled: boolean | null
          created_at: string | null
          enabled: boolean | null
          id: string
          quiet_hours_days: number[] | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          show_preview: boolean | null
          sound_enabled: boolean | null
          updated_at: string | null
          user_id: string
          vibration_enabled: boolean | null
        }
        Insert: {
          badge_enabled?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          quiet_hours_days?: number[] | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          show_preview?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          vibration_enabled?: boolean | null
        }
        Update: {
          badge_enabled?: boolean | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          quiet_hours_days?: number[] | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          show_preview?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          vibration_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rate_limit: {
        Row: {
          category: Database["public"]["Enums"]["notification_category"]
          conversation_id: string | null
          count: number | null
          created_at: string | null
          id: string
          user_id: string
          window_start: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["notification_category"]
          conversation_id?: string | null
          count?: number | null
          created_at?: string | null
          id?: string
          user_id: string
          window_start?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["notification_category"]
          conversation_id?: string | null
          count?: number | null
          created_at?: string | null
          id?: string
          user_id?: string
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_rate_limit_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_rate_limit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_settings: {
        Row: {
          created_at: string | null
          id: string
          read_receipts: boolean | null
          show_last_seen: boolean | null
          updated_at: string | null
          user_id: string
          who_can_add_me: string | null
          who_can_call_me: string | null
          who_can_see_avatar: string | null
          who_can_see_bio: string | null
          who_can_see_status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          read_receipts?: boolean | null
          show_last_seen?: boolean | null
          updated_at?: string | null
          user_id: string
          who_can_add_me?: string | null
          who_can_call_me?: string | null
          who_can_see_avatar?: string | null
          who_can_see_bio?: string | null
          who_can_see_status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          read_receipts?: boolean | null
          show_last_seen?: boolean | null
          updated_at?: string | null
          user_id?: string
          who_can_add_me?: string | null
          who_can_call_me?: string | null
          who_can_see_avatar?: string | null
          who_can_see_bio?: string | null
          who_can_see_status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          last_seen: string | null
          phone: string | null
          status: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          last_seen?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          last_seen?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          device_name: string | null
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          device_name?: string | null
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          device_name?: string | null
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type: string
          media_url: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          is_typing: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_typing?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          language: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ringtones: {
        Row: {
          contact_ringtones: Json | null
          created_at: string
          default_ringtone: string
          flash_enabled: boolean | null
          id: string
          updated_at: string
          user_id: string
          vibration_enabled: boolean | null
        }
        Insert: {
          contact_ringtones?: Json | null
          created_at?: string
          default_ringtone?: string
          flash_enabled?: boolean | null
          id?: string
          updated_at?: string
          user_id: string
          vibration_enabled?: boolean | null
        }
        Update: {
          contact_ringtones?: Json | null
          created_at?: string
          default_ringtone?: string
          flash_enabled?: boolean | null
          id?: string
          updated_at?: string
          user_id?: string
          vibration_enabled?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      notification_stats: {
        Row: {
          avg_latency_ms: number | null
          blocked_count: number | null
          date: string | null
          delivered_count: number | null
          failed_count: number | null
          opened_count: number | null
          sent_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_interact_with_user: {
        Args: { interaction_type: string; target_user_id: string }
        Returns: boolean
      }
      cleanup_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_calls: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_telemetry: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_typing_indicators: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_total_unread_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_conversations: {
        Args: { p_include_archived?: boolean; p_user_id: string }
        Returns: {
          archived: boolean
          conversation_avatar_url: string
          conversation_id: string
          conversation_name: string
          conversation_type: string
          conversation_updated_at: string
          last_message_content: string
          last_message_created_at: string
          member_count: number
          other_avatar_url: string
          other_bio: string
          other_full_name: string
          other_status: string
          other_user_id: string
          other_username: string
          unread_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of_conversation: {
        Args: { _user_id: string; conv_id: string }
        Returns: boolean
      }
      is_participant_of_session: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      notification_category:
        | "messages"
        | "mentions"
        | "calls"
        | "reactions"
        | "system"
      notification_priority: "low" | "normal" | "high" | "urgent"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      notification_category: [
        "messages",
        "mentions",
        "calls",
        "reactions",
        "system",
      ],
      notification_priority: ["low", "normal", "high", "urgent"],
    },
  },
} as const
