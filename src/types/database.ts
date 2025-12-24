// Auto-generated types for Supabase database
// Run `npx supabase gen types typescript` to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          total_xp: number;
          current_level: number;
          current_streak: number;
          longest_streak: number;
          last_login_date: string | null;
          total_spent: number;
          total_orders: number;
          total_reviews: number;
          referral_code: string | null;
          referred_by: string | null;
          referral_count: number;
          available_spins: number;
          store_credit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          total_xp?: number;
          current_level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_login_date?: string | null;
          total_spent?: number;
          total_orders?: number;
          total_reviews?: number;
          referral_code?: string | null;
          referred_by?: string | null;
          referral_count?: number;
          available_spins?: number;
          store_credit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          total_xp?: number;
          current_level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_login_date?: string | null;
          total_spent?: number;
          total_orders?: number;
          total_reviews?: number;
          referral_code?: string | null;
          referred_by?: string | null;
          referral_count?: number;
          available_spins?: number;
          store_credit?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      levels: {
        Row: {
          level: number;
          title: string;
          xp_required: number;
          perks: Json;
          discount_percent: number;
          badge_color: string;
        };
        Insert: {
          level: number;
          title: string;
          xp_required: number;
          perks?: Json;
          discount_percent?: number;
          badge_color?: string;
        };
        Update: {
          level?: number;
          title?: string;
          xp_required?: number;
          perks?: Json;
          discount_percent?: number;
          badge_color?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          name: string;
          description: string;
          category: "shopping" | "social" | "engagement" | "collector" | "special";
          icon: string;
          xp_reward: number;
          rarity: "common" | "rare" | "epic" | "legendary";
          requirement_type: string;
          requirement_value: number;
          is_hidden: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          category: "shopping" | "social" | "engagement" | "collector" | "special";
          icon: string;
          xp_reward?: number;
          rarity?: "common" | "rare" | "epic" | "legendary";
          requirement_type: string;
          requirement_value?: number;
          is_hidden?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          category?: "shopping" | "social" | "engagement" | "collector" | "special";
          icon?: string;
          xp_reward?: number;
          rarity?: "common" | "rare" | "epic" | "legendary";
          requirement_type?: string;
          requirement_value?: number;
          is_hidden?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
          progress: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          unlocked_at?: string;
          progress?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          unlocked_at?: string;
          progress?: number;
        };
      };
      daily_logins: {
        Row: {
          id: string;
          user_id: string;
          login_date: string;
          day_of_streak: number;
          xp_earned: number;
          bonus_reward: string | null;
          claimed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          login_date?: string;
          day_of_streak: number;
          xp_earned: number;
          bonus_reward?: string | null;
          claimed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          login_date?: string;
          day_of_streak?: number;
          xp_earned?: number;
          bonus_reward?: string | null;
          claimed_at?: string;
        };
      };
      spin_prizes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          prize_type: "discount" | "xp" | "shipping" | "credit" | "spin" | "mystery";
          prize_value: string;
          probability: number;
          color: string;
          is_active: boolean;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          prize_type: "discount" | "xp" | "shipping" | "credit" | "spin" | "mystery";
          prize_value: string;
          probability: number;
          color: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          prize_type?: "discount" | "xp" | "shipping" | "credit" | "spin" | "mystery";
          prize_value?: string;
          probability?: number;
          color?: string;
          is_active?: boolean;
        };
      };
      spin_history: {
        Row: {
          id: string;
          user_id: string;
          prize_id: string;
          spun_at: string;
          claimed: boolean;
          claimed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          prize_id: string;
          spun_at?: string;
          claimed?: boolean;
          claimed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          prize_id?: string;
          spun_at?: string;
          claimed?: boolean;
          claimed_at?: string | null;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string | null;
          referral_code: string;
          status: "pending" | "signed_up" | "converted";
          reward_claimed: boolean;
          reward_amount: number | null;
          click_count: number;
          created_at: string;
          converted_at: string | null;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id?: string | null;
          referral_code: string;
          status?: "pending" | "signed_up" | "converted";
          reward_claimed?: boolean;
          reward_amount?: number | null;
          click_count?: number;
          created_at?: string;
          converted_at?: string | null;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string | null;
          referral_code?: string;
          status?: "pending" | "signed_up" | "converted";
          reward_claimed?: boolean;
          reward_amount?: number | null;
          click_count?: number;
          created_at?: string;
          converted_at?: string | null;
        };
      };
      rewards: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: "discount" | "shipping" | "xp_booster" | "cosmetic" | "exclusive" | "spin";
          xp_cost: number;
          value: string;
          image_url: string | null;
          stock: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          category: "discount" | "shipping" | "xp_booster" | "cosmetic" | "exclusive" | "spin";
          xp_cost: number;
          value: string;
          image_url?: string | null;
          stock?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: "discount" | "shipping" | "xp_booster" | "cosmetic" | "exclusive" | "spin";
          xp_cost?: number;
          value?: string;
          image_url?: string | null;
          stock?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      user_rewards: {
        Row: {
          id: string;
          user_id: string;
          reward_id: string;
          claimed_at: string;
          used: boolean;
          used_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          reward_id: string;
          claimed_at?: string;
          used?: boolean;
          used_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          reward_id?: string;
          claimed_at?: string;
          used?: boolean;
          used_at?: string | null;
          expires_at?: string | null;
        };
      };
      mystery_boxes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          min_value: number;
          max_value: number;
          image_url: string | null;
          rarity_weights: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          price: number;
          min_value: number;
          max_value: number;
          image_url?: string | null;
          rarity_weights: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          min_value?: number;
          max_value?: number;
          image_url?: string | null;
          rarity_weights?: Json;
          is_active?: boolean;
          created_at?: string;
        };
      };
      mystery_box_purchases: {
        Row: {
          id: string;
          user_id: string;
          box_id: string;
          rarity_rolled: string;
          product_id: string | null;
          product_name: string | null;
          product_value: number | null;
          purchased_at: string;
          opened: boolean;
          opened_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          box_id: string;
          rarity_rolled: string;
          product_id?: string | null;
          product_name?: string | null;
          product_value?: number | null;
          purchased_at?: string;
          opened?: boolean;
          opened_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          box_id?: string;
          rarity_rolled?: string;
          product_id?: string | null;
          product_name?: string | null;
          product_value?: number | null;
          purchased_at?: string;
          opened?: boolean;
          opened_at?: string | null;
        };
      };
      xp_transactions: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          action: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          action: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          action?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      user_coupons: {
        Row: {
          id: string;
          user_id: string;
          code: string;
          discount_type: "percent" | "fixed" | "shipping";
          discount_value: number;
          min_order_value: number;
          source: string;
          used: boolean;
          used_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code: string;
          discount_type: "percent" | "fixed" | "shipping";
          discount_value: number;
          min_order_value?: number;
          source: string;
          used?: boolean;
          used_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          code?: string;
          discount_type?: "percent" | "fixed" | "shipping";
          discount_value?: number;
          min_order_value?: number;
          source?: string;
          used?: boolean;
          used_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_referral_code: {
        Args: { username: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

