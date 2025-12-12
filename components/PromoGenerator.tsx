
import React, { useState } from 'react';
import { generatePromoIdea } from '../services/geminiService';

const PromoGenerator: React.FC = () => {
  const [theme, setTheme] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!theme.trim()) {
      setError('Harap masukkan tema promosi terlebih dahulu.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult('');
    try {
      const idea = await generatePromoIdea(theme);
      setResult(idea);
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="promo" className="py-20 bg-red-700 text-white">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold mb-4">Butuh Ide Promo?</h2>
        <p className="max-w-2xl mx-auto mb-8">
          Masukkan tema (contoh: "promo hari kemerdekaan", "diskon musim hujan", "paket makan siang hemat"), dan biarkan AI membantu Anda membuat caption promosi yang menarik!
        </p>
        <div className="max-w-xl mx-auto flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Contoh: Promo akhir pekan"
            className="w-full px-4 py-3 rounded-md text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            disabled={isLoading}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="bg-yellow-400 text-red-800 font-bold px-8 py-3 rounded-md hover:bg-yellow-500 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isLoading ? 'Membuat...' : 'Buat Ide!'}
          </button>
        </div>
        
        {error && <div className="mt-6 bg-red-200 text-red-800 p-4 rounded-md">{error}</div>}
        
        {isLoading && (
            <div className="mt-6 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <p className="ml-3">AI sedang berpikir keras...</p>
            </div>
        )}

        {result && (
          <div className="mt-8 max-w-2xl mx-auto bg-white/10 p-6 rounded-xl backdrop-blur-sm border border-white/20">
            <h3 className="text-xl font-semibold mb-3 text-yellow-300">Ini dia idenya!</h3>
            <p className="text-left whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default PromoGenerator;
