import { GoogleGenerativeAI } from "@google/generative-ai";

// Pastikan API Key tersedia. Gunakan VITE_API_KEY jika menggunakan Vite env vars, atau string kosong untuk fallback
const apiKey = import.meta.env.VITE_API_KEY || ""; 
const genAI = new GoogleGenerativeAI(apiKey);

export const generatePromoIdea = async (theme: string): Promise<string> => {
  if (!theme.trim()) {
    return "Tolong masukkan tema promosi.";
  }

  // Gunakan model yang stabil
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `Anda adalah seorang konsultan marketing jenius untuk bisnis kuliner di Indonesia.
Seorang pemilik kedai bakso pemula meminta bantuan Anda.
Buatkan ide promosi yang kreatif, menarik, dan mudah dijalankan untuk kedai baksonya dengan tema: "${theme}".

Berikan jawaban dalam satu paragraf singkat yang persuasif dan langsung bisa dipakai untuk postingan media sosial.
Gunakan bahasa yang santai dan menarik bagi pelanggan.
Contoh: "Hujan-hujan gini, paling pas sruput kuah bakso panas! Khusus hari ini, setiap pembelian Bakso Urat Spesial, gratis Es Teh Manis. Biar angetnya dobel! Yuk, mampir ke Kedai Bakso Enak!"`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Maaf, AI tidak memberikan respons.";
  } catch (error) {
    console.error("Error generating content:", error);
    return "Maaf, terjadi kesalahan saat membuat ide promosi. Pastikan API Key sudah benar.";
  }
};