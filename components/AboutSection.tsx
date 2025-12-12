
import React from 'react';

const AboutSection: React.FC = () => {
  return (
    <section id="tentang" className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <img 
              src="https://picsum.photos/600/400?random=8" 
              alt="Pemilik Kedai Bakso" 
              className="rounded-xl shadow-2xl w-full"
            />
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-bold text-red-700 mb-4">Cerita di Balik Semangkok Bakso</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Berawal dari kecintaan pada masakan Indonesia dan resep turun-temurun dari nenek, kami memberanikan diri membuka "Kedai Bakso Enak". Kami percaya, bakso bukan sekadar makanan, tapi juga kehangatan dan kenangan.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Setiap bakso kami buat dengan hati, menggunakan 100% daging sapi segar dan bumbu alami tanpa pengawet. Kami berkomitmen untuk menyajikan rasa otentik yang akan selalu Anda rindukan. Selamat menikmati!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
