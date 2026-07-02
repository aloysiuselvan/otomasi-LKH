import type { GeminiClassificationResult } from "@/lib/supabase/types";
export async function classifyWorkLog(rawInput: string) {
  console.log("BYPASS AI: Menerima pesan dari Telegram ->", rawInput);

  // Kita paksa sistem memberikan output JSON yang sempurna
  // langsung ke Supabase tanpa melewati Google API
  const mockResult: GeminiClassificationResult = {
    is_skp: true,
    skp_category: "Perawatan Infrastruktur Layanan Manajemen", 
    short_description: rawInput
  };

  return mockResult;
}
