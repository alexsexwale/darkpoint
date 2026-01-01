-- ============================================
-- Migration: Award Bonus Spin for R1000+ Orders
-- Only counts the actual contribution to the business:
-- subtotal - discount_amount (excludes delivery fees)
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
  v_bonus_spin_threshold DECIMAL := 1000; -- R1000 minimum for bonus spin
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
      
      -- Award BONUS SPIN for R1000+ contribution (excludes discounts and delivery)
      IF v_contribution >= v_bonus_spin_threshold THEN
        UPDATE user_profiles SET
          available_spins = available_spins + 1,
          updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Log it as an XP transaction for visibility (0 XP, just for record)
        INSERT INTO xp_transactions (user_id, amount, action, description)
        VALUES (NEW.user_id, 0, 'bonus_spin', 
          'Bonus spin for spending R' || ROUND(v_contribution, 2)::TEXT || ' on order ' || NEW.order_number);
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
    -- This is when we count the order and award bonuses!
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
      
      -- Award BONUS SPIN for R1000+ contribution (excludes discounts and delivery)
      IF v_contribution >= v_bonus_spin_threshold THEN
        UPDATE user_profiles SET
          available_spins = available_spins + 1,
          updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Log it for visibility in XP history
        INSERT INTO xp_transactions (user_id, amount, action, description)
        VALUES (NEW.user_id, 0, 'bonus_spin', 
          '🎡 Bonus spin earned! Spent R' || ROUND(v_contribution, 2)::TEXT || ' on order ' || NEW.order_number);
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
    -- Note: We do NOT remove the bonus spin - it was already used/earned
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
      
      -- Check if the NEW contribution now qualifies for bonus spin
      -- but the OLD one didn't (edge case: order amount increased to R1000+)
      IF v_contribution >= v_bonus_spin_threshold AND v_old_contribution < v_bonus_spin_threshold THEN
        UPDATE user_profiles SET
          available_spins = available_spins + 1,
          updated_at = NOW()
        WHERE id = NEW.user_id;
        
        INSERT INTO xp_transactions (user_id, amount, action, description)
        VALUES (NEW.user_id, 0, 'bonus_spin', 
          '🎡 Bonus spin earned! Order ' || NEW.order_number || ' updated to R' || ROUND(v_contribution, 2)::TEXT);
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists (recreate if needed)
DROP TRIGGER IF EXISTS update_order_stats_trigger ON orders;
CREATE TRIGGER update_order_stats_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_user_order_stats();

-- Add 'bonus_spin' to xp_action enum if it doesn't exist
DO $$
BEGIN
  ALTER TYPE xp_action ADD VALUE IF NOT EXISTS 'bonus_spin';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

