
import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <section 
      className="relative h-[60vh] md:h-[80vh] bg-cover bg-center flex items-center justify-center text-white" 
      style={{ backgroundImage: "url('https://picsum.photos/1600/900?random=1&grayscale&blur=2')" }}
    >
      <div className="absolute inset-0 bg-black/50"></div>
      <div className="relative z-10 text-center px-4">
        <h2 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4 animate-fade-in-down">
          Nikmati Kelezatan Bakso Asli Indonesia
        </h2>
        <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto animate-fade-in-up">
          Dibuat dengan daging sapi pilihan dan resep warisan keluarga, setiap mangkok adalah sebuah cerita rasa.
        </p>
        <a 
          href="#menu" 
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-transform transform hover:scale-105 duration-300"
        >
          Lihat Menu
        </a>
      </div>
    </section>
  );
};

export default HeroSection;
