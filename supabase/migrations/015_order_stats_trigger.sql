-- ============================================
-- Migration: Order Stats Trigger
-- Updates user_profiles total_spent and total_orders when orders are placed
-- total_spent = subtotal - discount_amount (excludes shipping, only counts user contribution)
-- ============================================

-- ============================================
-- FUNCTION: Calculate user's amount contributed from an order
-- Formula: subtotal - discount_amount (excludes shipping and tax)
-- ============================================
CREATE OR REPLACE FUNCTION calculate_order_contribution(
  p_subtotal DECIMAL,
  p_discount_amount DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
  -- User contribution = product subtotal minus any discounts applied
  -- This excludes shipping costs as those go to logistics, not business revenue
  RETURN GREATEST(p_subtotal - COALESCE(p_discount_amount, 0), 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FUNCTION: Update user stats when order payment is successful
-- Only counts when status changes to 'processing' (payment confirmed)
-- Reverses if order is cancelled or refunded
-- ============================================
CREATE OR REPLACE FUNCTION update_user_order_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_contribution DECIMAL;
  v_old_contribution DECIMAL;
  v_order_count INTEGER;
  v_old_status order_status;
  v_new_status order_status;
  v_is_paid_status BOOLEAN;
  v_was_paid_status BOOLEAN;
BEGIN
  -- Helper: Check if a status means "paid" (payment was successful)
  -- 'processing', 'shipped', 'delivered' = paid orders
  -- 'pending' = not paid yet, 'cancelled', 'refunded' = not counted
  
  -- For INSERT: Only track if order is created with a paid status (rare, usually starts as pending)
  IF TG_OP = 'INSERT' THEN
    v_is_paid_status := NEW.status IN ('processing', 'shipped', 'delivered');
    
    -- Only count if order starts in a paid status
    IF v_is_paid_status THEN
      v_contribution := calculate_order_contribution(NEW.subtotal, NEW.discount_amount);
      
      -- Update user profile stats
      UPDATE user_profiles SET
        total_orders = total_orders + 1,
        total_spent = total_spent + v_contribution,
        updated_at = NOW()
      WHERE id = NEW.user_id;
      
      -- Award XP for first purchase if this is their first paid order
      SELECT total_orders INTO v_order_count FROM user_profiles WHERE id = NEW.user_id;
      IF v_order_count = 1 THEN
        BEGIN
          PERFORM add_xp(NEW.user_id, 500, 'first_purchase', 'First purchase bonus');
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
      
      -- Award XP based on contribution (1 XP per R10 spent)
      IF v_contribution > 0 THEN
        BEGIN
          PERFORM add_xp(NEW.user_id, FLOOR(v_contribution / 10)::INTEGER, 'purchase', 
            'Order ' || NEW.order_number || ' - R' || ROUND(v_contribution, 2)::TEXT);
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
      
      -- Check achievements after purchase
      BEGIN
        PERFORM check_achievements(NEW.user_id);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- For UPDATE: Track status changes
  IF TG_OP = 'UPDATE' THEN
    v_old_status := OLD.status;
    v_new_status := NEW.status;
    v_was_paid_status := v_old_status IN ('processing', 'shipped', 'delivered');
    v_is_paid_status := v_new_status IN ('processing', 'shipped', 'delivered');
    
    -- CASE 1: Payment just confirmed (pending -> processing)
    -- This is when we count the order!
    IF NOT v_was_paid_status AND v_is_paid_status THEN
      v_contribution := calculate_order_contribution(NEW.subtotal, NEW.discount_amount);
      
      -- Update user profile stats
      UPDATE user_profiles SET
        total_orders = total_orders + 1,
        total_spent = total_spent + v_contribution,
        updated_at = NOW()
      WHERE id = NEW.user_id;
      
      -- Award XP for first purchase
      SELECT total_orders INTO v_order_count FROM user_profiles WHERE id = NEW.user_id;
      IF v_order_count = 1 THEN
        BEGIN
          PERFORM add_xp(NEW.user_id, 500, 'first_purchase', 'First purchase bonus');
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
      
      -- Award XP based on contribution (1 XP per R10 spent)
      IF v_contribution > 0 THEN
        BEGIN
          PERFORM add_xp(NEW.user_id, FLOOR(v_contribution / 10)::INTEGER, 'purchase', 
            'Order ' || NEW.order_number || ' - R' || ROUND(v_contribution, 2)::TEXT);
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
      
      -- Check achievements after purchase
      BEGIN
        PERFORM check_achievements(NEW.user_id);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
      
      RETURN NEW;
    END IF;
    
    -- CASE 2: Order cancelled or refunded (was paid, now not counted)
    IF v_was_paid_status AND NOT v_is_paid_status THEN
      v_contribution := calculate_order_contribution(OLD.subtotal, OLD.discount_amount);
      
      -- Reverse the stats
      UPDATE user_profiles SET
        total_orders = GREATEST(total_orders - 1, 0),
        total_spent = GREATEST(total_spent - v_contribution, 0),
        updated_at = NOW()
      WHERE id = NEW.user_id;
      
      RETURN NEW;
    END IF;
    
    -- CASE 3: Amounts changed on a paid order (rare, but handle it)
    IF v_was_paid_status AND v_is_paid_status AND 
       (OLD.subtotal IS DISTINCT FROM NEW.subtotal OR 
        OLD.discount_amount IS DISTINCT FROM NEW.discount_amount) THEN
      v_old_contribution := calculate_order_contribution(OLD.subtotal, OLD.discount_amount);
      v_contribution := calculate_order_contribution(NEW.subtotal, NEW.discount_amount);
      
      -- Update the difference
      UPDATE user_profiles SET
        total_spent = GREATEST(total_spent + (v_contribution - v_old_contribution), 0),
        updated_at = NOW()
      WHERE id = NEW.user_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Fire on order insert or update
-- ============================================
DROP TRIGGER IF EXISTS update_user_stats_on_order ON orders;
CREATE TRIGGER update_user_stats_on_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_user_order_stats();

-- ============================================
-- FUNCTION: Recalculate all user stats from existing orders
-- Run this once to fix any existing data
-- Only counts PAID orders (processing, shipped, delivered)
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_all_user_stats()
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_stats RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_user IN SELECT DISTINCT user_id FROM orders LOOP
    -- Calculate stats from PAID orders only (processing, shipped, delivered)
    SELECT 
      COUNT(*) as order_count,
      COALESCE(SUM(subtotal - COALESCE(discount_amount, 0)), 0) as total_contribution
    INTO v_stats
    FROM orders 
    WHERE user_id = v_user.user_id 
    AND status IN ('processing', 'shipped', 'delivered');
    
    -- Update user profile
    UPDATE user_profiles SET
      total_orders = v_stats.order_count,
      total_spent = v_stats.total_contribution,
      updated_at = NOW()
    WHERE id = v_user.user_id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'users_updated', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_order_contribution(DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_all_user_stats() TO authenticated;

-- ============================================
-- Add comment explaining the calculation
-- ============================================
COMMENT ON FUNCTION calculate_order_contribution IS 
'Calculates the actual amount a user contributed to the business from an order.
Formula: subtotal - discount_amount
- Excludes shipping_cost (goes to logistics, not business revenue)
- Excludes tax_amount (goes to government)
Example: R1000 order with 15% discount (R150) = R850 contribution';

COMMENT ON TRIGGER update_user_stats_on_order ON orders IS
'Automatically updates user_profiles.total_spent and total_orders when orders are PAID (status changes to processing/shipped/delivered).
- Only counts when payment is successful (status = processing, shipped, or delivered)
- Does NOT count pending orders (not paid yet)
- Reverses stats if order is cancelled or refunded
- total_spent = subtotal - discount (excludes shipping and tax)';

-- ============================================
-- UPDATE: Fix get_user_stats to use correct total_spent calculation
-- Only counts PAID orders (processing, shipped, delivered)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_orders BIGINT,
  processing_orders BIGINT,
  delivered_orders BIGINT,
  total_spent DECIMAL,
  total_reviews BIGINT,
  helpful_votes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total paid orders (processing, shipped, delivered)
    (SELECT COUNT(*) FROM orders WHERE user_id = p_user_id AND status IN ('processing', 'shipped', 'delivered'))::BIGINT,
    (SELECT COUNT(*) FROM orders WHERE user_id = p_user_id AND status = 'processing')::BIGINT,
    (SELECT COUNT(*) FROM orders WHERE user_id = p_user_id AND status = 'delivered')::BIGINT,
    -- Correct calculation: subtotal - discount (excludes shipping and tax)
    -- Only from PAID orders
    COALESCE((
      SELECT SUM(subtotal - COALESCE(discount_amount, 0)) 
      FROM orders 
      WHERE user_id = p_user_id AND status IN ('processing', 'shipped', 'delivered')
    ), 0)::DECIMAL,
    (SELECT COUNT(*) FROM product_reviews WHERE user_id = p_user_id)::BIGINT,
    COALESCE((SELECT SUM(helpful_count) FROM product_reviews WHERE user_id = p_user_id), 0)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;

