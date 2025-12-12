
import React, { useState } from 'react';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: '#menu', text: 'Menu' },
    { href: '#tentang', text: 'Tentang Kami' },
    { href: '#lokasi', text: 'Lokasi' },
    { href: '#promo', text: 'Buat Promo' },
  ];

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-red-700">
          <a href="#">Kedai Bakso Enak</a>
        </h1>
        <nav className="hidden md:flex space-x-8">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-gray-600 hover:text-red-700 font-semibold transition-colors duration-300">
              {link.text}
            </a>
          ))}
        </nav>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden text-gray-700 hover:text-red-700 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"}></path>
          </svg>
        </button>
      </div>
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <nav className="flex flex-col items-center space-y-4 py-4">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setIsMenuOpen(false)} className="text-gray-600 hover:text-red-700 font-semibold transition-colors duration-300">
                {link.text}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
