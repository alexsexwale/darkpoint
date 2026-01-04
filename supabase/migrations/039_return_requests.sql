-- =====================================================
-- Return Requests System
-- =====================================================
-- This migration creates tables for managing customer return requests

-- Create return_requests table
CREATE TABLE IF NOT EXISTS return_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number TEXT NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_transit', 'received', 'completed', 'cancelled')),
    total_refund_amount NUMERIC(10, 2) DEFAULT 0,
    additional_info TEXT,
    rejection_reason TEXT,
    return_tracking_number TEXT,
    return_label_url TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    shipped_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create return_request_items table
CREATE TABLE IF NOT EXISTS return_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    refund_amount NUMERIC(10, 2) DEFAULT 0,
    condition TEXT CHECK (condition IN ('unopened', 'like_new', 'used', 'damaged')),
    condition_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_return_requests_return_number ON return_requests(return_number);
CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_user_id ON return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_email ON return_requests(email);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);
CREATE INDEX IF NOT EXISTS idx_return_request_items_return_request_id ON return_request_items(return_request_id);
CREATE INDEX IF NOT EXISTS idx_return_request_items_order_item_id ON return_request_items(order_item_id);

-- Enable RLS
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_request_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own return requests" ON return_requests;
DROP POLICY IF EXISTS "Users can create return requests" ON return_requests;
DROP POLICY IF EXISTS "Service role can manage all returns" ON return_requests;
DROP POLICY IF EXISTS "Anyone can view return by return_number and email" ON return_requests;
DROP POLICY IF EXISTS "Users can view their own return items" ON return_request_items;
DROP POLICY IF EXISTS "Users can create return items" ON return_request_items;
DROP POLICY IF EXISTS "Service role can manage all return items" ON return_request_items;

-- RLS Policies for return_requests

-- Authenticated users can view their own returns
CREATE POLICY "Users can view their own return requests"
ON return_requests
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Anyone (guest or authenticated) can create return requests
CREATE POLICY "Anyone can create return requests"
ON return_requests
FOR INSERT
TO public
WITH CHECK (true);

-- Service role can do everything
CREATE POLICY "Service role can manage all returns"
ON return_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS Policies for return_request_items

-- Users can view their own return items
CREATE POLICY "Users can view their own return items"
ON return_request_items
FOR SELECT
TO authenticated
USING (
    return_request_id IN (
        SELECT id FROM return_requests 
        WHERE user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- Anyone can create return items (linked to their return request)
CREATE POLICY "Anyone can create return items"
ON return_request_items
FOR INSERT
TO public
WITH CHECK (true);

-- Service role can do everything
CREATE POLICY "Service role can manage all return items"
ON return_request_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON return_requests TO anon;
GRANT SELECT, INSERT ON return_requests TO authenticated;
GRANT ALL ON return_requests TO service_role;

GRANT SELECT, INSERT ON return_request_items TO anon;
GRANT SELECT, INSERT ON return_request_items TO authenticated;
GRANT ALL ON return_request_items TO service_role;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_return_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS return_requests_updated_at ON return_requests;
CREATE TRIGGER return_requests_updated_at
    BEFORE UPDATE ON return_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_return_request_updated_at();

-- Add columns to orders table if they don't exist (for tracking dates)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_email TEXT;

-- =====================================================
-- Admin functions for managing returns
-- =====================================================

-- Function to approve a return request
CREATE OR REPLACE FUNCTION approve_return_request(
    p_return_id UUID,
    p_admin_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_return return_requests%ROWTYPE;
BEGIN
    -- Get return request
    SELECT * INTO v_return FROM return_requests WHERE id = p_return_id;
    
    IF v_return IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Return request not found');
    END IF;
    
    IF v_return.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Return request is not in pending status');
    END IF;
    
    -- Update status
    UPDATE return_requests
    SET 
        status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = p_admin_id
    WHERE id = p_return_id;
    
    RETURN json_build_object('success', true, 'message', 'Return request approved');
END;
$$;

-- Function to reject a return request
CREATE OR REPLACE FUNCTION reject_return_request(
    p_return_id UUID,
    p_reason TEXT,
    p_admin_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_return return_requests%ROWTYPE;
BEGIN
    -- Get return request
    SELECT * INTO v_return FROM return_requests WHERE id = p_return_id;
    
    IF v_return IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Return request not found');
    END IF;
    
    IF v_return.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Return request is not in pending status');
    END IF;
    
    -- Update status
    UPDATE return_requests
    SET 
        status = 'rejected',
        rejection_reason = p_reason,
        reviewed_at = NOW(),
        reviewed_by = p_admin_id
    WHERE id = p_return_id;
    
    RETURN json_build_object('success', true, 'message', 'Return request rejected');
END;
$$;

-- Function to mark return as received
CREATE OR REPLACE FUNCTION receive_return(
    p_return_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_return return_requests%ROWTYPE;
BEGIN
    SELECT * INTO v_return FROM return_requests WHERE id = p_return_id;
    
    IF v_return IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Return request not found');
    END IF;
    
    IF v_return.status NOT IN ('approved', 'in_transit') THEN
        RETURN json_build_object('success', false, 'error', 'Return must be approved or in transit');
    END IF;
    
    UPDATE return_requests
    SET 
        status = 'received',
        received_at = NOW()
    WHERE id = p_return_id;
    
    RETURN json_build_object('success', true, 'message', 'Return marked as received');
END;
$$;

-- Function to complete return and process refund
CREATE OR REPLACE FUNCTION complete_return(
    p_return_id UUID,
    p_refund_amount NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_return return_requests%ROWTYPE;
    v_final_refund NUMERIC;
BEGIN
    SELECT * INTO v_return FROM return_requests WHERE id = p_return_id;
    
    IF v_return IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Return request not found');
    END IF;
    
    IF v_return.status != 'received' THEN
        RETURN json_build_object('success', false, 'error', 'Return must be received first');
    END IF;
    
    -- Use provided refund amount or the calculated total
    v_final_refund := COALESCE(p_refund_amount, v_return.total_refund_amount);
    
    UPDATE return_requests
    SET 
        status = 'completed',
        total_refund_amount = v_final_refund,
        completed_at = NOW()
    WHERE id = p_return_id;
    
    RETURN json_build_object(
        'success', true, 
        'message', 'Return completed',
        'refund_amount', v_final_refund
    );
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION approve_return_request(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION reject_return_request(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION receive_return(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION complete_return(UUID, NUMERIC) TO service_role;

-- =====================================================
-- Done!
-- =====================================================

