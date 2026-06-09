-- Supabase Migration: Create daily_logs table
-- This table stores classified daily work log entries received from the Telegram bot.

CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  log_date DATE NOT NULL,
  raw_input TEXT NOT NULL,
  is_skp BOOLEAN NOT NULL DEFAULT false,
  skp_category TEXT,
  short_description TEXT NOT NULL
);

-- Index on log_date for efficient monthly queries (used by cron export)
CREATE INDEX IF NOT EXISTS idx_daily_logs_log_date ON daily_logs (log_date);

-- Enable Row Level Security (optional: adjust policies as needed)
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by Next.js API routes)
CREATE POLICY "Service role has full access"
  ON daily_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
