import type { GeminiClassificationResult } from "@/lib/supabase/types";

export async function classifyWorkLog(rawInput: string) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not defined in environment variables");
  }

  const url = "https://api.groq.com/openai/v1/chat/completions";

  // System Prompt dengan teknik Few-Shot untuk akurasi mutlak Llama 3
  const systemPrompt = `Kamu adalah asisten klasifikasi log kerja harian untuk seorang Pranata Komputer (PNS).
Tugasmu adalah menganalisis teks laporan kegiatan harian, lalu mengklasifikasikannya ke dalam salah satu dari 9 Rencana Hasil Kerja (SKP) 2026.

KATEGORI SKP (Pilih salah satu persis seperti tertulis jika relevan):
1. Perawatan dan Pengembangan Aplikasi Layanan dilakukan secara Inovatif dan sesuai Kebutuhan
2. Dokumen Pengajuan Clearance TIK disusun sesuai dengan Kebutuhan dan Ketentuan yang Berlaku
3. Dokumen Katalog Sistem Informasi Ditjen Bimas Katolik sesuai Aset yang Tersedia
4. Dokumen Hasil Analisis Spesifikasi Teknis Pengembangan Aplikasi Web Prioritas Disusun sesuai dengan Kebutuhan dan Ketentuan yang Berlaku
5. Perawatan Infrastruktur Layanan Manajemen Dilakukan sesuai dengan Kebutuhan
6. Terlaksananya Migrasi Aplikasi ke PDN dan Integrasi ke Pusaka sesuai dengan Kebutuhan dan Ketentuan yang Berlaku
7. Dokumen Implementasi dan Pengujian Keamanan Sistem Jaringan, Server, dan Aplikasi Komputer sesuai dengan Kebutuhan dan Ketentuan yang Berlaku
8. Dokumen Penetapan Konteks Risiko, Kategorisasi Sistem Elektronik, Risk Register, dan Peta Rencana Keamanan SPBE Guna Mendukung Keberlangsungan Layanan Digital Disusun sesuai dengan Aset yang Tersedia dan Rencana Kebutuhan Kedepan
9. Obyek Multimedia Kompleks  untuk Disusun dan Diedit secara Inovatif dan Tepat Guna

ATURAN MUTLAK:
1. Jika kegiatan COCOK, is_skp = true dan skp_category = "Nama Kategori (harus sama persis)".
2. Jika kegiatan TIDAK COCOK, is_skp = false dan skp_category = null.
3. short_description: Ringkas kegiatan maksimal 10 kata dalam Bahasa Indonesia formal.
4. OUTPUT WAJIB berformat JSON murni. Dilarang memberikan teks pengantar atau markdown (\`\`\`json).

CONTOH 1 (Sesuai Kategori):
Input: "Hari ini saya melakukan setup docker dan wsl2 untuk migrasi database web ERRIKA ke cpanel PDN pusat."
Output: {"is_skp": true, "skp_category": "Terlaksananya Migrasi Aplikasi ke PDN dan Integrasi ke Pusaka sesuai dengan Kebutuhan dan Ketentuan yang Berlaku", "short_description": "Setup lingkungan pengembangan untuk migrasi web ERRIKA."}

CONTOH 2 (Sesuai Kategori):
Input: "Memperbaiki bug tampilan UI dengan Tailwind CSS v3 pada SITARA."
Output: {"is_skp": true, "skp_category": "Perawatan dan Pengembangan Aplikasi Layanan dilakukan secara Inovatif dan sesuai Kebutuhan", "short_description": "Perbaikan bug tampilan antarmuka pada aplikasi SITARA."}

CONTOH 3 (Tidak Sesuai Kategori):
Input: "Mengikuti rapat rutin mingguan divisi."
Output: {"is_skp": false, "skp_category": null, "short_description": "Mengikuti rapat rutin mingguan divisi."}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawInput }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Suhu sangat rendah agar tidak melenceng dari contoh
      max_tokens: 150 // Batasi token karena kita hanya butuh respon pendek
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("GROQ API ERROR DETAILED:", errorText);
    throw new Error(`Groq API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  let textOutput = data.choices[0].message.content;

  // Llama 3 terkadang masih membocorkan markdown meski sudah dipaksa json_object
  textOutput = textOutput.replace(/```json\n?/gi, '').replace(/```/g, '').trim();

  try {
    const result: GeminiClassificationResult = JSON.parse(textOutput);
    return result;
  } catch (parseError) {
    console.error("Gagal mem-parsing respons Groq menjadi JSON:", textOutput);
    throw new Error("Format respons AI tidak valid.");
  }
}
