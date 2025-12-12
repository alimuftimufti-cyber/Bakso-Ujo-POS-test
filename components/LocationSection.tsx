
import React from 'react';

const LocationSection: React.FC = () => {
  return (
    <section id="lokasi" className="py-20 bg-white">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-red-700 mb-12">Kunjungi Kami!</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-gray-200 rounded-xl h-80 flex items-center justify-center">
             <div className="text-center p-4">
                <h3 className="text-2xl font-semibold text-gray-700">Peta Lokasi</h3>
                <p className="text-gray-500 mt-2">(Placeholder untuk peta interaktif)</p>
                 <img src="https://picsum.photos/400/200?random=9" alt="Peta Lokasi" className="mt-4 rounded-lg shadow-md mx-auto"/>
            </div>
          </div>
          <div className="bg-red-50 p-8 rounded-xl text-left flex flex-col justify-center shadow-lg">
            <h3 className="text-2xl font-bold text-red-800 mb-4">Alamat & Jam Buka</h3>
            <p className="text-gray-700 mb-2">
              <strong>Alamat:</strong> Jl. Kuliner Raya No. 123, Jakarta, Indonesia
            </p>
            <p className="text-gray-700 mb-4">
              <strong>Telepon:</strong> (021) 123-4567
            </p>
            <div className="text-gray-700">
              <strong>Jam Operasional:</strong>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>Senin - Jumat: 10:00 - 21:00</li>
                <li>Sabtu - Minggu: 10:00 - 22:00</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocationSection;
