
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-6 text-center">
        <p>&copy; {new Date().getFullYear()} Kedai Bakso Enak. Dibuat dengan ❤️ untuk para pecinta bakso.</p>
        <div className="flex justify-center space-x-6 mt-4">
          <a href="#" className="hover:text-red-500 transition-colors">Instagram</a>
          <a href="#" className="hover:text-red-500 transition-colors">Facebook</a>
          <a href="#" className="hover:text-red-500 transition-colors">TikTok</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
