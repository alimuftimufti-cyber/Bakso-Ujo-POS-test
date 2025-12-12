
import React from 'react';
// FIX: Changed MenuItemType to MenuItem to match the type defined in types.ts
import type { MenuItem } from '../types';

interface MenuItemProps {
  // FIX: Changed MenuItemType to MenuItem
  item: MenuItem;
}

// FIX: Added currency formatting utility
const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};


const MenuItem: React.FC<MenuItemProps> = ({ item }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 group">
      <img className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500" src={item.imageUrl || 'https://via.placeholder.com/400x300?text=Bakso'} alt={item.name} />
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2">{item.name}</h3>
        {/* FIX: Replaced non-existent 'description' with 'category' and adjusted styling */}
        <p className="text-gray-500 text-sm mb-4">{item.category}</p>
        {/* FIX: Formatted price from number to currency string */}
        <div className="text-xl font-bold text-red-700">{formatRupiah(item.price)}</div>
      </div>
    </div>
  );
};

export default MenuItem;
