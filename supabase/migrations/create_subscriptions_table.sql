-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'basic', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  monthly_generation_limit INTEGER NOT NULL DEFAULT 1,
  monthly_generation_used INTEGER NOT NULL DEFAULT 0,
  toss_billing_key TEXT,
  toss_order_id TEXT,
  current_period_start DATE,
  current_period_end DATE,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own subscription
CREATE POLICY subscriptions_select ON subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policy: Users can only update their own subscription
CREATE POLICY subscriptions_update ON subscriptions
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policy: Users can only delete their own subscription
CREATE POLICY subscriptions_delete ON subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Create a trigger to update updated_at
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at();
