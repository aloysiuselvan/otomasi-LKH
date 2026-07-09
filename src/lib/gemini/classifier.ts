import type { GeminiClassificationResult } from "@/lib/supabase/types";

export async function classifyWorkLog(rawInput: string) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not defined in environment variables");
  }

  const url = "https://api.groq.com/openai/v1/chat/completions";

  // System Prompt dengan teknik Few-Shot untuk akurasi mutlak Llama 3
  const systemPrompt = `Kamu adalah asisten klasifikasi log kerja harian untuk seorang Pranata Komputer (PNS).
Tugasmu ada dua:
1. MENGKLASIFIKASIKAN teks input ke dalam salah satu dari 9 Kategori SKP.
2. MENGOPTIMALKAN kalimat input yang santai/kasar menjadi deskripsi pekerjaan birokrasi/teknis formal yang berbobot.

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
1. Jika relevan, is_skp = true dan skp_category = "Nama Kategori (harus sama persis)". Jika tidak, is_skp = false dan skp_category = null.
2. short_description: JANGAN HANYA MENYALIN INPUT. Ubah dan optimalkan kalimat menjadi bahasa resmi dan teknis standar Pranata Komputer. 
   - Ganti kata santai (misal: bikin, rapat, riset, ngerjain, ngecek) menjadi kata kerja formal (misal: merancang, melakukan koordinasi teknis, melakukan analisis spesifikasi, mengimplementasikan, melakukan audit).
   - Fokus pada OUTPUT pekerjaan, bukan sekadar aktivitas.
   - Maksimal 15 kata dalam Bahasa Indonesia formal.
3. OUTPUT WAJIB berformat JSON murni tanpa markdown.

CONTOH 1 (Sesuai Kategori):
Input: "hari ini rapat bahas sisa kerjaan dan bikin repo staging di gitlab."
Output: {"is_skp": true, "skp_category": "Perawatan dan Pengembangan Aplikasi Layanan dilakukan secara Inovatif dan sesuai Kebutuhan", "short_description": "Melakukan koordinasi teknis penjadwalan dan setup repository staging pada GitLab."}

CONTOH 2 (Optimalisasi Kata Riset):
Input: "riset docker sama wsl2 buat migrasi web"
Output: {"is_skp": true, "skp_category": "Terlaksananya Migrasi Aplikasi ke PDN dan Integrasi ke Pusaka sesuai dengan Kebutuhan dan Ketentuan yang Berlaku", "short_description": "Melakukan analisis spesifikasi teknis dan konfigurasi environment menggunakan Docker dan WSL2."}

CONTOH 3 (Bukan SKP):
Input: "ikut apel pagi dan senam"
Output: {"is_skp": false, "skp_category": null, "short_description": "Mengikuti kegiatan apel pagi dan senam kebugaran pegawai."}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawInput }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2, // Sedikit dinaikkan agar AI punya ruang kreativitas merangkai kata formal
      max_tokens: 150
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("GROQ API ERROR DETAILED:", errorText);
    throw new Error(`Groq API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  let textOutput = data.choices[0].message.content;

  textOutput = textOutput.replace(/```json\n?/gi, '').replace(/```/g, '').trim();

  try {
    const result: GeminiClassificationResult = JSON.parse(textOutput);
    return result;
  } catch (parseError) {
    console.error("Gagal mem-parsing respons Groq menjadi JSON:", textOutput);
    throw new Error("Format respons AI tidak valid.");
  }
}
