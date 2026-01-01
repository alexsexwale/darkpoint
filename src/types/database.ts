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
export type PrizeType = "discount" | "xp" | "shipping" | "credit" | "spin" | "mystery" | "xp_multiplier";
export type ReferralStatus = "pending" | "signed_up" | "converted";
export type RewardCategory = "discount" | "shipping" | "xp_booster" | "cosmetic" | "exclusive" | "spin";
export type DiscountType = "percent" | "fixed" | "shipping";
export type CouponSource = "spin" | "reward" | "referral" | "achievement" | "promotion" | "manual";
export type XPAction = "signup" | "daily_login" | "first_purchase" | "purchase" | "review" | "photo_review" | "share" | "referral" | "quest" | "achievement" | "spin_reward" | "bonus" | "admin" | "read_article" | "add_wishlist";

// E-commerce Enums
export type AddressType = "billing" | "shipping";
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
export type ReviewStatus = "pending" | "published" | "rejected";
export type ReportStatus = "pending" | "reviewed" | "action_taken" | "dismissed";

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string; // UUID
          email: string | null; // VARCHAR(255) - for username login lookup
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
          total_shares: number; // INTEGER - for share achievements
          categories_viewed: number; // INTEGER - for explorer achievement
          wishlist_purchases: number; // INTEGER - for wishlist to cart conversion
          single_order_max_value: number; // DECIMAL(10,2) - max order value for big spender
          single_order_max_items: number; // INTEGER - max items in single order
          created_at: string; // TIMESTAMPTZ
          updated_at: string; // TIMESTAMPTZ
        };
        Insert: {
          id: string;
          email?: string | null;
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
          total_shares?: number;
          categories_viewed?: number;
          wishlist_purchases?: number;
          single_order_max_value?: number;
          single_order_max_items?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
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
          total_shares?: number;
          categories_viewed?: number;
          wishlist_purchases?: number;
          single_order_max_value?: number;
          single_order_max_items?: number;
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
      user_addresses: {
        Row: {
          id: string;
          user_id: string;
          type: AddressType;
          is_default: boolean;
          name: string;
          company: string | null;
          address_line1: string;
          address_line2: string | null;
          city: string;
          province: string;
          postal_code: string;
          country: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: AddressType;
          is_default?: boolean;
          name: string;
          company?: string | null;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          province: string;
          postal_code: string;
          country?: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: AddressType;
          is_default?: boolean;
          name?: string;
          company?: string | null;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          province?: string;
          postal_code?: string;
          country?: string;
          phone?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          order_number: string;
          status: OrderStatus;
          subtotal: number;
          shipping_cost: number;
          discount_amount: number;
          tax_amount: number;
          total: number;
          currency: string;
          shipping_name: string | null;
          shipping_address_line1: string | null;
          shipping_address_line2: string | null;
          shipping_city: string | null;
          shipping_province: string | null;
          shipping_postal_code: string | null;
          shipping_country: string | null;
          shipping_phone: string | null;
          billing_name: string | null;
          billing_address_line1: string | null;
          billing_address_line2: string | null;
          billing_city: string | null;
          billing_province: string | null;
          billing_postal_code: string | null;
          billing_country: string | null;
          billing_phone: string | null;
          tracking_number: string | null;
          tracking_url: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          customer_notes: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_number: string;
          status?: OrderStatus;
          subtotal?: number;
          shipping_cost?: number;
          discount_amount?: number;
          tax_amount?: number;
          total?: number;
          currency?: string;
        };
        Update: {
          status?: OrderStatus;
          tracking_number?: string | null;
          tracking_url?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          admin_notes?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_slug: string | null;
          product_image: string | null;
          variant_id: string | null;
          variant_name: string | null;
          sku: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
          is_digital: boolean;
          download_url: string | null;
          download_limit: number;
          download_count: number;
          download_expires_at: string | null;
          has_reviewed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_slug?: string | null;
          product_image?: string | null;
          quantity?: number;
          unit_price: number;
          total_price: number;
          is_digital?: boolean;
        };
        Update: {
          has_reviewed?: boolean;
          download_count?: number;
        };
      };
      product_reviews: {
        Row: {
          id: string;
          user_id: string;
          order_item_id: string | null;
          product_id: string;
          product_name: string;
          product_slug: string | null;
          product_image: string | null;
          rating: number;
          title: string;
          content: string;
          pros: string | null;
          cons: string | null;
          status: ReviewStatus;
          helpful_count: number;
          not_helpful_count: number;
          verified_purchase: boolean;
          admin_response: string | null;
          admin_responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_item_id?: string | null;
          product_id: string;
          product_name: string;
          product_slug?: string | null;
          product_image?: string | null;
          rating: number;
          title: string;
          content: string;
          pros?: string | null;
          cons?: string | null;
          status?: ReviewStatus;
          verified_purchase?: boolean;
        };
        Update: {
          rating?: number;
          title?: string;
          content?: string;
          pros?: string | null;
          cons?: string | null;
          status?: ReviewStatus;
        };
      };
      review_reports: {
        Row: {
          id: string;
          user_id: string;
          review_id: string;
          reason: string;
          description: string | null;
          status: ReportStatus;
          admin_notes: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          review_id: string;
          reason: string;
          description?: string | null;
        };
        Update: {
          status?: ReportStatus;
          admin_notes?: string | null;
          resolved_at?: string | null;
        };
      };
      user_downloads: {
        Row: {
          id: string;
          user_id: string;
          order_id: string;
          order_item_id: string;
          product_id: string;
          product_name: string;
          file_name: string;
          file_size: number | null;
          file_type: string | null;
          download_url: string | null;
          download_limit: number;
          download_count: number;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_id: string;
          order_item_id: string;
          product_id: string;
          product_name: string;
          file_name: string;
          file_size?: number | null;
          file_type?: string | null;
          download_url?: string | null;
          download_limit?: number;
          expires_at?: string | null;
        };
        Update: {
          download_count?: number;
        };
      };
      user_wishlist: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          product_name: string;
          product_slug: string | null;
          product_image: string | null;
          product_price: number;
          product_original_price: number | null;
          product_category: string | null;
          added_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          product_name: string;
          product_slug?: string | null;
          product_image?: string | null;
          product_price: number;
          product_original_price?: number | null;
          product_category?: string | null;
        };
        Update: {
          product_price?: number;
          product_original_price?: number | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_referral_code: {
        Args: { username: string };
        Returns: string;
      };
      get_email_by_username: {
        Args: { lookup_username: string };
        Returns: string | null;
      };
      get_user_email_by_id: {
        Args: { user_id: string };
        Returns: string | null;
      };
      get_user_stats: {
        Args: { p_user_id: string };
        Returns: {
          total_orders: number;
          processing_orders: number;
          delivered_orders: number;
          total_spent: number;
          total_reviews: number;
          helpful_votes: number;
        }[];
      };
      get_reviewable_products: {
        Args: { p_user_id: string };
        Returns: {
          order_item_id: string;
          product_id: string;
          product_name: string;
          product_slug: string | null;
          product_image: string | null;
          order_date: string;
        }[];
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
      address_type: AddressType;
      order_status: OrderStatus;
      review_status: ReviewStatus;
      report_status: ReportStatus;
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
