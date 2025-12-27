// Auto-generated types for Supabase database
// Run `npx supabase gen types typescript` to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================
// ENUM TYPES (matching PostgreSQL enums)
// ============================================

export type AchievementCategory = "shopping" | "social" | "engagement" | "collector" | "special";
export type RarityType = "common" | "rare" | "epic" | "legendary" | "mythic";
export type PrizeType = "discount" | "xp" | "shipping" | "credit" | "spin" | "mystery";
export type ReferralStatus = "pending" | "signed_up" | "converted";
export type RewardCategory = "discount" | "shipping" | "xp_booster" | "cosmetic" | "exclusive" | "spin";
export type DiscountType = "percent" | "fixed" | "shipping";
export type CouponSource = "spin" | "reward" | "referral" | "achievement" | "promotion" | "manual";
export type XPAction = "signup" | "daily_login" | "first_purchase" | "purchase" | "review" | "photo_review" | "share" | "referral" | "quest" | "achievement" | "spin_reward" | "bonus" | "admin";

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string; // UUID
          username: string | null; // VARCHAR(30)
          display_name: string | null; // VARCHAR(50)
          avatar_url: string | null; // VARCHAR(512)
          total_xp: number; // INTEGER
          current_level: number; // INTEGER
          current_streak: number; // INTEGER
          longest_streak: number; // INTEGER
          last_login_date: string | null; // DATE
          total_spent: number; // DECIMAL(12,2)
          total_orders: number; // INTEGER
          total_reviews: number; // INTEGER
          referral_code: string | null; // VARCHAR(20)
          referred_by: string | null; // UUID
          referral_count: number; // INTEGER
          available_spins: number; // INTEGER
          store_credit: number; // DECIMAL(10,2)
          created_at: string; // TIMESTAMPTZ
          updated_at: string; // TIMESTAMPTZ
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
          level: number; // INTEGER PK
          title: string; // VARCHAR(30)
          xp_required: number; // INTEGER
          perks: Json; // JSONB
          discount_percent: number; // INTEGER
          badge_color: string; // VARCHAR(10)
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
          id: string; // VARCHAR(50) PK
          name: string; // VARCHAR(100)
          description: string; // VARCHAR(255)
          category: AchievementCategory; // ENUM
          icon: string; // VARCHAR(10)
          xp_reward: number; // INTEGER
          rarity: RarityType; // ENUM
          requirement_type: string; // VARCHAR(30)
          requirement_value: number; // INTEGER
          is_hidden: boolean; // BOOLEAN
          is_active: boolean; // BOOLEAN
          created_at: string; // TIMESTAMPTZ
        };
        Insert: {
          id: string;
          name: string;
          description: string;
          category: AchievementCategory;
          icon: string;
          xp_reward?: number;
          rarity?: RarityType;
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
          category?: AchievementCategory;
          icon?: string;
          xp_reward?: number;
          rarity?: RarityType;
          requirement_type?: string;
          requirement_value?: number;
          is_hidden?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string; // UUID
          user_id: string; // UUID FK
          achievement_id: string; // VARCHAR(50) FK
          unlocked_at: string; // TIMESTAMPTZ
          progress: number; // INTEGER
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
          id: string; // UUID
          user_id: string; // UUID FK
          login_date: string; // DATE
          day_of_streak: number; // INTEGER
          xp_earned: number; // INTEGER
          bonus_reward: string | null; // VARCHAR(255)
          claimed_at: string; // TIMESTAMPTZ
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
          id: string; // VARCHAR(30) PK
          name: string; // VARCHAR(50)
          description: string | null; // VARCHAR(255)
          prize_type: PrizeType; // ENUM
          prize_value: string; // VARCHAR(20)
          probability: number; // DECIMAL(5,2)
          color: string; // VARCHAR(10)
          is_active: boolean; // BOOLEAN
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          prize_type: PrizeType;
          prize_value: string;
          probability: number;
          color: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          prize_type?: PrizeType;
          prize_value?: string;
          probability?: number;
          color?: string;
          is_active?: boolean;
        };
      };
      spin_history: {
        Row: {
          id: string; // UUID
          user_id: string; // UUID FK
          prize_id: string; // VARCHAR(30) FK
          spun_at: string; // TIMESTAMPTZ
          claimed: boolean; // BOOLEAN
          claimed_at: string | null; // TIMESTAMPTZ
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
          id: string; // UUID
          referrer_id: string; // UUID FK
          referred_id: string | null; // UUID FK
          referral_code: string; // VARCHAR(20)
          status: ReferralStatus; // ENUM
          reward_claimed: boolean; // BOOLEAN
          reward_amount: number | null; // DECIMAL(10,2)
          click_count: number; // INTEGER
          created_at: string; // TIMESTAMPTZ
          converted_at: string | null; // TIMESTAMPTZ
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id?: string | null;
          referral_code: string;
          status?: ReferralStatus;
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
          status?: ReferralStatus;
          reward_claimed?: boolean;
          reward_amount?: number | null;
          click_count?: number;
          created_at?: string;
          converted_at?: string | null;
        };
      };
      rewards: {
        Row: {
          id: string; // VARCHAR(30) PK
          name: string; // VARCHAR(100)
          description: string | null; // VARCHAR(255)
          category: RewardCategory; // ENUM
          xp_cost: number; // INTEGER
          value: string; // VARCHAR(30)
          image_url: string | null; // VARCHAR(512)
          stock: number | null; // INTEGER (NULL = unlimited)
          is_active: boolean; // BOOLEAN
          created_at: string; // TIMESTAMPTZ
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          category: RewardCategory;
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
          category?: RewardCategory;
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
          id: string; // UUID
          user_id: string; // UUID FK
          reward_id: string; // VARCHAR(30) FK
          claimed_at: string; // TIMESTAMPTZ
          used: boolean; // BOOLEAN
          used_at: string | null; // TIMESTAMPTZ
          expires_at: string | null; // TIMESTAMPTZ
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
          id: string; // VARCHAR(30) PK
          name: string; // VARCHAR(50)
          description: string | null; // VARCHAR(255)
          price: number; // DECIMAL(10,2)
          min_value: number; // DECIMAL(10,2)
          max_value: number; // DECIMAL(10,2)
          image_url: string | null; // VARCHAR(512)
          rarity_weights: Json; // JSONB
          is_active: boolean; // BOOLEAN
          created_at: string; // TIMESTAMPTZ
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
          id: string; // UUID
          user_id: string; // UUID FK
          box_id: string; // VARCHAR(30) FK
          rarity_rolled: RarityType; // ENUM
          product_id: string | null; // VARCHAR(100)
          product_name: string | null; // VARCHAR(255)
          product_value: number | null; // DECIMAL(10,2)
          purchased_at: string; // TIMESTAMPTZ
          opened: boolean; // BOOLEAN
          opened_at: string | null; // TIMESTAMPTZ
        };
        Insert: {
          id?: string;
          user_id: string;
          box_id: string;
          rarity_rolled: RarityType;
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
          rarity_rolled?: RarityType;
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
          id: string; // UUID
          user_id: string; // UUID FK
          amount: number; // INTEGER
          action: XPAction; // ENUM
          description: string | null; // VARCHAR(255)
          created_at: string; // TIMESTAMPTZ
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          action: XPAction;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          action?: XPAction;
          description?: string | null;
          created_at?: string;
        };
      };
      user_coupons: {
        Row: {
          id: string; // UUID
          user_id: string; // UUID FK
          code: string; // VARCHAR(30) UNIQUE
          discount_type: DiscountType; // ENUM
          discount_value: number; // DECIMAL(10,2)
          min_order_value: number; // DECIMAL(10,2)
          source: CouponSource; // ENUM
          used: boolean; // BOOLEAN
          used_at: string | null; // TIMESTAMPTZ
          expires_at: string | null; // TIMESTAMPTZ
          created_at: string; // TIMESTAMPTZ
        };
        Insert: {
          id?: string;
          user_id: string;
          code: string;
          discount_type: DiscountType;
          discount_value: number;
          min_order_value?: number;
          source: CouponSource;
          used?: boolean;
          used_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          code?: string;
          discount_type?: DiscountType;
          discount_value?: number;
          min_order_value?: number;
          source?: CouponSource;
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
    Enums: {
      achievement_category: AchievementCategory;
      rarity_type: RarityType;
      prize_type: PrizeType;
      referral_status: ReferralStatus;
      reward_category: RewardCategory;
      discount_type: DiscountType;
      coupon_source: CouponSource;
      xp_action: XPAction;
    };
  };
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
