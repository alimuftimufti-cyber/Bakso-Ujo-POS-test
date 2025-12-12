
import type { Category, StoreProfile, MenuItem, Branch } from './types';

export const initialCategories: Category[] = [
    'Bakso', 'Mie Ayam', 'Tambahan', 'Makanan', 'Kriuk', 'Minuman'
];

export const initialBranches: Branch[] = [
    { id: 'pusat', name: 'Pusat (Main)', address: 'Jl. Utama No. 1' },
    { id: 'cabang-1', name: 'Cabang 1 (Pasar)', address: 'Jl. Pasar Baru No. 5' }
];

export const initialMenuData: MenuItem[] = [
    // BAKSO
    { id: 1, name: 'Bakso Polos', price: 15000, category: 'Bakso', imageUrl: 'https://picsum.photos/400/300?random=1' },
    { id: 2, name: 'Bakso Komplit', price: 23000, category: 'Bakso', imageUrl: 'https://picsum.photos/400/300?random=2' },
    { id: 3, name: 'Bakso Komplit + Tetelan/T.Rangu', price: 35000, category: 'Bakso', imageUrl: 'https://picsum.photos/400/300?random=3' },
    { id: 4, name: 'Bakso Urat Gimbal', price: 25000, category: 'Bakso', imageUrl: 'https://picsum.photos/400/300?random=4' },
    { id: 5, name: 'Bakso Jumbo Urat Gimbal', price: 40000, category: 'Bakso', imageUrl: 'https://picsum.photos/400/300?random=5' },
    { id: 6, name: 'Bakso Telur Komplit', price: 25000, category: 'Bakso', imageUrl: 'https://picsum.photos/400/300?random=6' },
    { id: 7, name: 'Bakso Keju Komplit', price: 28000, category: 'Bakso', imageUrl: 'https://picsum.photos/400/300?random=7' },

    // MIE AYAM
    { id: 8, name: 'Mie Ayam', price: 15000, category: 'Mie Ayam', imageUrl: 'https://picsum.photos/400/300?random=8' },
    { id: 9, name: 'Mie Ayam Bakso Polos', price: 20000, category: 'Mie Ayam', imageUrl: 'https://picsum.photos/400/300?random=9' },
    { id: 10, name: 'Mie Ayam Bakso Isi Daging', price: 25000, category: 'Mie Ayam', imageUrl: 'https://picsum.photos/400/300?random=10' },
    { id: 11, name: 'Mie Ayam Bakso Urat Gimbal', price: 25000, category: 'Mie Ayam', imageUrl: 'https://picsum.photos/400/300?random=11' },

    // TAMBAHAN
    { id: 12, name: 'Tetelan', price: 10000, category: 'Tambahan', imageUrl: 'https://picsum.photos/400/300?random=12' },
    { id: 13, name: 'Tulang Rangu', price: 10000, category: 'Tambahan', imageUrl: 'https://picsum.photos/400/300?random=13' },
    { id: 14, name: 'Nasi', price: 7000, category: 'Tambahan', imageUrl: 'https://picsum.photos/400/300?random=14' },

    // MAKANAN
    { id: 15, name: 'Ayam Goreng Serundeng', price: 25000, category: 'Makanan', imageUrl: 'https://picsum.photos/400/300?random=15' },
    { id: 16, name: 'Siomay', price: 25000, category: 'Makanan', imageUrl: 'https://picsum.photos/400/300?random=16' },
    { id: 17, name: 'Risoles', price: 18000, category: 'Makanan', imageUrl: 'https://picsum.photos/400/300?random=17' },
    { id: 18, name: 'Cireng Ayam Original', price: 18000, category: 'Makanan', imageUrl: 'https://picsum.photos/400/300?random=18' },
    { id: 19, name: 'Cireng Ayam Pedas', price: 18000, category: 'Makanan', imageUrl: 'https://picsum.photos/400/300?random=19' },
    { id: 20, name: 'Cireng Keju', price: 18000, category: 'Makanan', imageUrl: 'https://picsum.photos/400/300?random=20' },

    // KRIUK (Using stock management usually)
    { id: 21, name: 'Pangsit', price: 1000, category: 'Kriuk', imageUrl: 'https://picsum.photos/400/300?random=21', stock: 100 },
    { id: 22, name: 'Kerupuk Kaleng', price: 2000, category: 'Kriuk', imageUrl: 'https://picsum.photos/400/300?random=22', stock: 50 },
    { id: 23, name: 'Kerupuk Kulit', price: 8000, category: 'Kriuk', imageUrl: 'https://picsum.photos/400/300?random=23', stock: 30 },

    // MINUMAN
    { id: 24, name: 'Air Mineral', price: 5000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=24' },
    { id: 25, name: 'Teh Tawar', price: 2000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=25' },
    { id: 26, name: 'Teh Manis Hot / Ice', price: 7000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=26' },
    { id: 27, name: 'Teh Botol', price: 5000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=27' },
    { id: 28, name: 'Jeruk Hot / Ice', price: 10000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=28' },
    { id: 29, name: 'Es Teler Original', price: 20000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=29' },
    { id: 30, name: 'Es Teler Kuah Alpukat', price: 30000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=30' },
    { id: 31, name: 'Es Teler Durian', price: 35000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=31' },
    { id: 32, name: 'Es Alpukat Kelapa', price: 15000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=32' },
    { id: 33, name: 'Cendol Ori', price: 15000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=33' },
    { id: 34, name: 'Cendol Nangka', price: 18000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=34' },
    { id: 35, name: 'Cendol Nangka Alpukat', price: 20000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=35' },
    { id: 36, name: 'Cendol Durian', price: 28000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=36' },
    { id: 37, name: 'Jus Alpukat Jumbo', price: 18000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=37' },
    { id: 38, name: 'Jus Mangga Jumbo', price: 15000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=38' },
    { id: 39, name: 'Jus Melon Jumbo', price: 15000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=39' },
    { id: 40, name: 'Jus Stroberry Jumbo', price: 15000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=40' },
    { id: 41, name: 'Jus Nanas Jumbo', price: 15000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=41' },
    { id: 42, name: 'Jus Sirsak Jumbo', price: 15000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=42' },
    { id: 43, name: 'Jus Jambu Jumbo', price: 15000, category: 'Minuman', imageUrl: 'https://picsum.photos/400/300?random=43' },
];

export const defaultStoreProfile: StoreProfile = {
    name: "Bakso Ujo",
    address: "Jl. Spesial Tetelan Urat Gimbal No.1",
    phoneNumber: "628123456789", // Default phone
    slogan: "Nikmatnya Asli, Bikin Nagih!",
    logo: "",
    themeColor: 'orange', // Default theme
    enableKitchen: true,  // Default enabled
    kitchenMotivations: [
        "Semangat Tim Dapur! Pelanggan menunggu masakan lezatmu! 👨‍🍳",
        "Kualitas adalah prioritas! Jaga rasa tetap otentik. 🔥",
        "Senyum pelanggan berawal dari piring yang bersih dan rasa yang enak. 😊",
        "Kerja tim membuat mimpi jadi nyata! Saling bantu ya! 🤝"
    ],
    taxRate: 0,
    enableTax: false,
    serviceChargeRate: 0,
    enableServiceCharge: false,
    enableTableLayout: false,
    enableTableInput: true, // Default enabled for ease of use
    autoPrintReceipt: false,
    branchId: "pusat" // Default Branch ID
};
