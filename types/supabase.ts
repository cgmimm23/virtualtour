// Hand-written Supabase types matching db/migrations/0001_init.sql.
//
// Long-term we'll generate these with `supabase gen types typescript`, but the
// Supabase CLI doesn't run cleanly on Windows in this env, so we maintain by
// hand. The risk is drift between SQL and TS — keep them in lockstep when
// editing migrations. Both files live in `db/` and `types/` respectively;
// changing one without the other is a code-review red flag.

export type Plan = "trial" | "solo" | "team" | "brokerage";
export type TeamRole = "owner" | "admin" | "agent";
export type TourStatus = "draft" | "published";
export type SceneProcessingStatus = "pending" | "processing" | "ready" | "failed";
export type HotspotType = "scene_link" | "info" | "url" | "image" | "video" | "contact";
export type LeadSource =
  | "gate"
  | "contact_button"
  | "in_scene_contact"
  | "schedule";

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: Plan;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_status: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          trial_ends_at: string | null;
          branding_config: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          plan?: Plan;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_status?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          trial_ends_at?: string | null;
          branding_config?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      billing_events: {
        Row: {
          id: string;
          team_id: string;
          type: string;
          source: "webhook" | "admin" | "system" | "self_serve";
          actor_user_id: string | null;
          from_plan: Plan | null;
          to_plan: Plan | null;
          amount_cents: number | null;
          currency: string | null;
          stripe_event_id: string | null;
          stripe_object_id: string | null;
          metadata: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          type: string;
          source: "webhook" | "admin" | "system" | "self_serve";
          actor_user_id?: string | null;
          from_plan?: Plan | null;
          to_plan?: Plan | null;
          amount_cents?: number | null;
          currency?: string | null;
          stripe_event_id?: string | null;
          stripe_object_id?: string | null;
          metadata?: unknown | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["billing_events"]["Insert"]>;
        Relationships: [];
      };
      pricing_tiers: {
        Row: {
          plan: Plan;
          display_name: string;
          price_cents: number;
          currency: string;
          blurb: string;
          features: Array<{ label: string; included: boolean }>;
          cta_label: string;
          highlight: boolean;
          active: boolean;
          sort_order: number;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          plan: Plan;
          display_name: string;
          price_cents: number;
          currency?: string;
          blurb?: string;
          features?: Array<{ label: string; included: boolean }>;
          cta_label?: string;
          highlight?: boolean;
          active?: boolean;
          sort_order?: number;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pricing_tiers"]["Insert"]>;
        Relationships: [];
      };
      app_secrets: {
        Row: {
          key: string;
          value: string;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: string;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["app_secrets"]["Insert"]>;
        Relationships: [];
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          role: TeamRole;
          created_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role?: TeamRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
        Relationships: [];
      };
      tours: {
        Row: {
          id: string;
          team_id: string;
          slug: string;
          title: string;
          property_address: string | null;
          status: TourStatus;
          cover_scene_id: string | null;
          view_count: number;
          branding: unknown | null;
          lead_gate: unknown | null;
          floor_plan: unknown | null;
          highlights: string[] | null;
          details: unknown | null;
          expires_at: string | null;
          webhook_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          slug: string;
          title: string;
          property_address?: string | null;
          status?: TourStatus;
          cover_scene_id?: string | null;
          view_count?: number;
          branding?: unknown | null;
          lead_gate?: unknown | null;
          floor_plan?: unknown | null;
          highlights?: string[] | null;
          details?: unknown | null;
          expires_at?: string | null;
          webhook_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tours"]["Insert"]>;
        Relationships: [];
      };
      scenes: {
        Row: {
          id: string;
          tour_id: string;
          name: string;
          source_image_url: string;
          tiles_base_url: string | null;
          initial_yaw: number;
          initial_pitch: number;
          initial_fov: number;
          initial_roll: number;
          floor: string | null;
          floor_plan_position: unknown | null;
          order_index: number;
          processing_status: SceneProcessingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tour_id: string;
          name: string;
          source_image_url: string;
          tiles_base_url?: string | null;
          initial_yaw?: number;
          initial_pitch?: number;
          initial_fov?: number;
          initial_roll?: number;
          floor?: string | null;
          floor_plan_position?: unknown | null;
          order_index?: number;
          processing_status?: SceneProcessingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scenes"]["Insert"]>;
        Relationships: [];
      };
      hotspots: {
        Row: {
          id: string;
          scene_id: string;
          type: HotspotType;
          yaw: number;
          pitch: number;
          label: string;
          payload: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          scene_id: string;
          type: HotspotType;
          yaw: number;
          pitch: number;
          label?: string;
          payload?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["hotspots"]["Insert"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          tour_id: string;
          email: string;
          name: string | null;
          phone: string | null;
          message: string | null;
          preferred_time: string | null;
          source: LeadSource;
          scenes_viewed: number;
          duration_ms: number;
          captured_at: string;
          agent_notified_at: string | null;
        };
        Insert: {
          id?: string;
          tour_id: string;
          email: string;
          name?: string | null;
          phone?: string | null;
          message?: string | null;
          preferred_time?: string | null;
          source?: LeadSource;
          scenes_viewed?: number;
          duration_ms?: number;
          captured_at?: string;
          agent_notified_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [];
      };
      tour_views: {
        Row: {
          id: string;
          tour_id: string;
          scene_id: string | null;
          viewer_session_id: string;
          duration_ms: number;
          referrer: string | null;
          country: string | null;
          device: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tour_id: string;
          scene_id?: string | null;
          viewer_session_id: string;
          duration_ms?: number;
          referrer?: string | null;
          country?: string | null;
          device?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tour_views"]["Insert"]>;
        Relationships: [];
      };
      platform_admins: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["platform_admins"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      public_tour_by_slug: {
        Args: { p_slug: string };
        Returns: unknown;
      };
      is_platform_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      submit_public_lead: {
        Args: {
          p_tour_slug: string;
          p_email: string;
          p_name: string | null;
          p_phone: string | null;
          p_preferred_time: string | null;
          p_source: LeadSource;
          p_scenes_viewed: number;
          p_duration_ms: number;
        };
        Returns: string;
      };
    };
    Enums: {
      plan: Plan;
      team_role: TeamRole;
      tour_status: TourStatus;
      scene_processing_status: SceneProcessingStatus;
      hotspot_type: HotspotType;
      lead_source: LeadSource;
    };
  };
}
