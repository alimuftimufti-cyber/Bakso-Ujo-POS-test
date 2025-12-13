import { GoogleGenAI } from "@google/genai";

// FIX: Aligned with Gemini API guidelines by using process.env.API_KEY directly and removing the manual check.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    return response.text;
  } catch (error) {
    console.error("Error generating content:", error);
    return "Maaf, terjadi kesalahan saat membuat ide promosi. Silakan coba lagi nanti.";
  }
};
