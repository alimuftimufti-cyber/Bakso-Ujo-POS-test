import React from 'react';
// FIX: Changed MenuItemType to MenuItem to match the exported type from types.ts
import type { MenuItem } from '../types';
// FIX: Aliased component import to avoid naming collision with the MenuItem type.
import MenuItemComponent from './MenuItem';

// FIX: Updated menuData to conform to the MenuItem interface.
const menuData: MenuItem[] = [
  {
    id: 1,
    name: 'Bakso Urat Spesial',
    price: 20000,
    category: 'Bakso',
    imageUrl: 'https://picsum.photos/400/300?random=2'
  },
  {
    id: 2,
    name: 'Bakso Telur Puyuh',
    price: 18000,
    category: 'Bakso',
    imageUrl: 'https://picsum.photos/400/300?random=3'
  },
  {
    id: 3,
    name: 'Bakso Keju Meleleh',
    price: 22000,
    category: 'Bakso',
    imageUrl: 'https://picsum.photos/400/300?random=4'
  },
  {
    id: 4,
    name: 'Mie Ayam Bakso',
    price: 17000,
    category: 'Mie Ayam',
    imageUrl: 'https://picsum.photos/400/300?random=5'
  },
   {
    id: 5,
    name: 'Bakso Mercon',
    price: 21000,
    category: 'Bakso',
    imageUrl: 'https://picsum.photos/400/300?random=6'
  },
  {
    id: 6,
    name: 'Bakso Komplit',
    price: 25000,
    category: 'Bakso',
    imageUrl: 'https://picsum.photos/400/300?random=7'
  }
];

const MenuSection: React.FC = () => {
  return (
    <section id="menu" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-red-700">Menu Andalan Kami</h2>
          <p className="text-gray-600 mt-2">Pilihan terbaik untuk memanjakan lidah Anda.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {menuData.map(item => (
            // FIX: Use the aliased component name to render.
            <MenuItemComponent key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MenuSection;