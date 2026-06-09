/**
 * TypeScript types for the daily_logs table in Supabase.
 */

export interface DailyLog {
  id: string;
  created_at: string;
  log_date: string;
  raw_input: string;
  is_skp: boolean;
  skp_category: string | null;
  short_description: string;
}

export interface DailyLogInsert {
  log_date: string;
  raw_input: string;
  is_skp: boolean;
  skp_category: string | null;
  short_description: string;
}

/**
 * The expected JSON output from Gemini API classification.
 */
export interface GeminiClassificationResult {
  is_skp: boolean;
  skp_category: string | null;
  short_description: string;
}
