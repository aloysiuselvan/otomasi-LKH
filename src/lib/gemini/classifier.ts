import type { GeminiClassificationResult } from "@/lib/supabase/types";
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
 * Classifies a raw work log input using Gemini API via raw fetch.
 *
 * @param rawInput - The raw text message from the user describing their daily activity.
 * @returns Parsed classification result with is_skp, skp_category, and short_description.
 * @throws Error if Gemini API fails or returns invalid JSON.
 */
export async function classifyWorkLog(
  rawInput: string
): Promise<GeminiClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in environment variables");
  }

  // KITA KENDALIKAN PENUH URL-NYA (Menggunakan v1, bukan v1beta)
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Menggabungkan instruksi sistem ke dalam prompt
  const promptText = `${SYSTEM_PROMPT}\n\nLog Kerja:\n${rawInput}`;

  // Tembak API Google secara langsung menggunakan Raw Fetch
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: promptText }] 
        }
      ],
      generationConfig: {
        responseMimeType: "application/json", // Memaksa AI mengembalikan JSON
        temperature: 0.2
      }
    }),
  });

  // Tangkap error dengan sangat spesifik agar kita tahu pasti apa masalahnya
  if (!response.ok) {
    const errorText = await response.text();
    console.error("RAW FETCH ERROR DETAILED:", errorText);
    throw new Error(`Google API Raw Error ${response.status}: ${errorText}`);
  }

  // Parse hasil JSON dari Google
  const data = await response.json();
  const textOutput = data.candidates[0].content.parts[0].text;

  // Lanjutkan dengan logika parsing Anda ke tipe GeminiClassificationResult
  try {
    const result: GeminiClassificationResult = JSON.parse(textOutput);
    
    // Validate the shape of the response
    if (typeof result.is_skp !== "boolean") {
      throw new Error("Invalid response: is_skp must be a boolean");
    }
    if (typeof result.short_description !== "string") {
      throw new Error("Invalid response: short_description must be a string");
    }
    if (result.is_skp && typeof result.skp_category !== "string") {
      throw new Error(
        "Invalid response: skp_category must be a string when is_skp is true"
      );
    }
    
    return result;
  } catch (parseError) {
    console.error("Gagal mem-parsing respons AI menjadi JSON:", textOutput);
    throw new Error("Format respons AI tidak valid.");
  }
}
