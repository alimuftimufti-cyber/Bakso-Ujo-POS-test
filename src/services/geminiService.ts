import { GoogleGenAI } from "@google/genai";

// Gunakan VITE_API_KEY jika tersedia (standar Vite), atau fallback ke process.env.API_KEY
// @ts-ignore
const apiKey = import.meta.env?.VITE_API_KEY || process.env.API_KEY;

const ai = new GoogleGenAI({ apiKey: apiKey });

export const generatePromoIdea = async (theme: string): Promise<string> => {
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
    return response.text || "Maaf, tidak ada respon.";
  } catch (error) {
    console.error("Error generating content:", error);
    return "Maaf, terjadi kesalahan saat membuat ide promosi. Silakan coba lagi nanti.";
  }
};