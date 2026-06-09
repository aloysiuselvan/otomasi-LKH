import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GeminiClassificationResult } from "@/lib/supabase/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * System prompt that instructs Gemini to classify daily work logs
 * according to the 9 SKP (Rencana Hasil Kerja) categories for 2026.
 */
const SYSTEM_PROMPT = `Kamu adalah asisten klasifikasi log kerja harian untuk seorang PNS (Pegawai Negeri Sipil).
Tugasmu adalah menganalisis pesan teks yang berisi laporan kegiatan harian, lalu mengklasifikasikan apakah kegiatan tersebut termasuk dalam Rencana Hasil Kerja (SKP) 2026 atau tidak.

Berikut adalah 9 kategori Rencana Hasil Kerja (SKP) 2026:
1. Perawatan dan Pengembangan Aplikasi Layanan
2. Dokumen Pengajuan Clearance TIK
3. Dokumen Katalog Sistem Informasi
4. Dokumen Hasil Analisis Spesifikasi Teknis Pengembangan Aplikasi Web Prioritas
5. Perawatan Infrastruktur Layanan Manajemen
6. Terlaksananya Migrasi Aplikasi ke PDN dan Integrasi ke Pusaka
7. Dokumen Implementasi dan Pengujian Keamanan Sistem
8. Dokumen Penetapan Konteks Risiko & Keamanan SPBE
9. Obyek Multimedia Kompleks

ATURAN:
- Jika kegiatan COCOK dengan salah satu kategori SKP di atas, set "is_skp" = true dan isi "skp_category" dengan nama kategori yang sesuai.
- Jika kegiatan TIDAK COCOK dengan kategori manapun, set "is_skp" = false dan "skp_category" = null.
- "short_description" adalah ringkasan kegiatan dalam MAKSIMAL 10 kata, dalam Bahasa Indonesia.
- Jawab HANYA dengan JSON, tanpa penjelasan tambahan.

FORMAT OUTPUT (JSON):
{
  "is_skp": boolean,
  "skp_category": "string atau null",
  "short_description": "string (maksimal 10 kata)"
}`;

/**
 * Classifies a raw work log input using Gemini API.
 *
 * @param rawInput - The raw text message from the user describing their daily activity.
 * @returns Parsed classification result with is_skp, skp_category, and short_description.
 * @throws Error if Gemini API fails or returns invalid JSON.
 */
export async function classifyWorkLog(
  rawInput: string
): Promise<GeminiClassificationResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const result = await model.generateContent(rawInput);
  const response = result.response;
  const text = response.text();

  try {
    const parsed: GeminiClassificationResult = JSON.parse(text);

    // Validate the shape of the response
    if (typeof parsed.is_skp !== "boolean") {
      throw new Error("Invalid response: is_skp must be a boolean");
    }
    if (typeof parsed.short_description !== "string") {
      throw new Error("Invalid response: short_description must be a string");
    }
    if (parsed.is_skp && typeof parsed.skp_category !== "string") {
      throw new Error(
        "Invalid response: skp_category must be a string when is_skp is true"
      );
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse Gemini response:", text);
    throw new Error(
      `Failed to parse Gemini API response: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
