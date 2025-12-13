
import { GoogleGenAI } from "@google/genai";

// Helper aman untuk membaca env variable (mencegah crash pada beberapa browser/environment)
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore error
  }
  
  try {
    // Fallback ke process.env jika diinject oleh Vite define
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }
  
  return undefined;
};

// Ambil API Key dengan prioritas: VITE_API_KEY (Env Var) -> API_KEY (Fallback)
const apiKey = getEnv('VITE_API_KEY') || getEnv('API_KEY');

// Inisialisasi hanya jika API Key ada
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey: apiKey });
} else {
  console.warn("Gemini API Key missing. Promo generator will not work.");
}

export const generatePromoIdea = async (theme: string): Promise<string> => {
  if (!ai) {
    return "API Key Google Gemini belum dikonfigurasi. Harap isi API_KEY di Vercel Environment Variables.";
  }

  if (!theme.trim()) {
    return "Tolong masukkan tema promosi.";
  }

  const prompt = `Anda adalah seorang konsultan marketing jenius untuk bisnis kuliner di Indonesia.
Seorang pemilik kedai bakso pemula meminta bantuan Anda.
Buatkan ide promosi yang kreatif, menarik, dan mudah dijalankan untuk kedai baksonya dengan tema: "${theme}".

Berikan jawaban dalam satu paragraf singkat yang persuasif dan langsung bisa dipakai untuk postingan media sosial.
Gunakan bahasa yang santai dan menarik bagi pelanggan.
Contoh: "Hujan-hujan gini, paling pas sruput kuah bakso panas! Khusus hari ini, setiap pembelian Bakso Urat Spesial, gratis Es Teh Manis. Biar angetnya dobel! Yuk, mampir ke Kedai Bakso Enak!"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Maaf, tidak ada respon dari AI.";
  } catch (error: any) {
    console.error("Error generating content:", error);
    return `Gagal membuat ide promosi: ${error.message}`;
  }
};
