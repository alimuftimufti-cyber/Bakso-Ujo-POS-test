import React, { useState, useMemo } from 'react';
import { useAppContext } from '../types';
import type { IngredientType } from '../types';

// --- COMPONENTS ---

const StockCard = ({ title, stock, unit, onUpdate, onEdit, image, theme, minStock = 5, isTracked = true }: any) => {
    // If stock is not tracked (undefined), consider it safe
    const isCritical = isTracked && stock <= 0;
    const isLow = isTracked && stock <= minStock;
    
    let statusColor = "bg-green-100 text-green-700 border-green-200";
    let statusText = "Aman";
    
    if (!isTracked) {
        statusColor = "bg-gray-100 text-gray-600 border-gray-200";
        statusText = "Unlimited";
    } else if (isCritical) {
        statusColor = "bg-red-100 text-red-700 border-red-200 animate-pulse";
        statusText = "Habis!";
    } else if (isLow) {
        statusColor = "bg-yellow-100 text-yellow-700 border-yellow-200";
        statusText = "Menipis";
    }

    return (
        <div className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full relative overflow-hidden group ${isCritical ? 'ring-2 ring-red-400' : ''}`}>
            <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}>
                {statusText}
            </div>
            <div className="flex items-start gap-4 mb-4">
                {image ? (
                    <img src={image} className="w-16 h-16 rounded-xl object-cover bg-gray-100 border border-gray-100" alt={title} />
                ) : (
                    <div className={`w-16 h-16 rounded-xl bg-${theme}-50 flex items-center justify-center text-${theme}-600 font-bold text-xl border border-${theme}-100`}>
                        {title.charAt(0)}
                    </div>
                )}
                <div className="flex-1 pr-14">
                    <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">{title}</h3>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Produk Jadi</p>
                    <div className="flex items-baseline gap-1">
                        {isTracked ? (
                            <>
                                <span className={`text-2xl font-black ${isCritical ? 'text-red-600' : 'text-gray-900'}`}>{stock}</span>
                                <span className="text-xs font-bold text-gray-500">{unit}</span>
                            </>
                        ) : (
                            <span className="text-xl font-bold text-gray-400">∞</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-auto flex flex-col gap-2">
                {isTracked ? (
                    <div className="flex items-center justify-between gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                        <button onClick={() => onUpdate(-1)} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded-lg text-red-500 hover:bg-red-50 hover:border-red-200 font-bold text-lg active:scale-90">-</button>
                        <div className="h-4 w-px bg-gray-200 mx-1"></div>
                        <button onClick={() => onUpdate(1)} className="flex-1 py-1.5 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded-lg text-gray-700 hover:text-green-600 font-bold text-xs active:scale-95">+1</button>
                        <button onClick={() => onUpdate(5)} className="flex-1 py-1.5 flex items-center justify-center bg-white border border-gray-200 shadow-sm rounded-lg text-gray-700 hover:text-green-600 font-bold text-xs active:scale-95">+5</button>
                    </div>
                ) : (
                    <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 text-center text-xs text-gray-400 font-medium">
                        Stok tidak dilacak
                    </div>
                )}
                <button onClick={onEdit} className="w-full py-1.5 text-xs font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">Edit Detail & Stok</button>
            </div>
        </div>
    );
};

const EditInventoryModal = ({ onClose, onSave, item, type }: { onClose: () => void, onSave: (data: any) => void, item: any, type: 'product' | 'ingredient' }) => {
    // Initial state logic: if product has stock defined, trackStock is true
    const initialTrackStock = type === 'ingredient' ? true : (item?.stock !== undefined);
    
    const [form, setForm] = useState(item || { name: '', unit: 'pcs', stock: 0, minStock: 5, type: 'raw' });
    const [trackStock, setTrackStock] = useState(initialTrackStock);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            ...form, 
            stock: trackStock ? parseFloat(form.stock || 0) : undefined, 
            minStock: trackStock ? parseFloat(form.minStock || 5) : undefined 
        });
    };

    return (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-scale-in max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h3 className="text-xl font-bold text-gray-800 mb-6">{item ? 'Edit Item' : 'Tambah Item Baru'}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Item</label>
                        <input 
                            type="text" 
                            value={form.name} 
                            onChange={e => setForm({...form, name: e.target.value})} 
                            className={`w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-800 ${type === 'product' ? 'bg-gray-100 text-gray-500' : ''}`}
                            readOnly={type === 'product'} // Prevent renaming menu here, do it in Settings
                            required 
                        />
                        {type === 'product' && <p className="text-[10px] text-gray-400 mt-1">Nama produk diubah melalui menu Pengaturan.</p>}
                    </div>

                    {type === 'product' && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <div>
                                <label className="block text-sm font-bold text-blue-900">Kelola Stok?</label>
                                <p className="text-xs text-blue-600">Aktifkan untuk melacak sisa porsi.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={trackStock} onChange={e => setTrackStock(e.target.checked)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    )}

                    {type === 'ingredient' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kategori</label>
                            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-800 bg-white">
                                <option value="raw">Bahan Baku (Raw)</option>
                                <option value="spice">Bumbu (Spice)</option>
                                <option value="packaging">Kemasan (Packaging)</option>
                                <option value="equipment">Perlengkapan/Alat</option>
                                <option value="other">Lainnya</option>
                            </select>
                        </div>
                    )}

                    {trackStock && (
                        <>
                            <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stok Saat Ini</label>
                                    <input type="number" value={form.stock || 0} onChange={e => setForm({...form, stock: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-800" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Satuan</label>
                                    {type === 'product' ? (
                                        <input type="text" value="Porsi/Pcs" disabled className="w-full border-2 border-gray-200 bg-gray-100 rounded-xl px-4 py-2.5" />
                                    ) : (
                                        <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-800 bg-white">
                                            <option value="gram">Gram</option>
                                            <option value="kg">Kilogram</option>
                                            <option value="ml">Mililiter</option>
                                            <option value="liter">Liter</option>
                                            <option value="pcs">Pcs</option>
                                            <option value="ikat">Ikat</option>
                                            <option value="porsi">Porsi</option>
                                            <option value="box">Box</option>
                                            <option value="pack">Pack</option>
                                            <option value="kaleng">Kaleng</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div className="animate-fade-in">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Batas Minimum (Alert)</label>
                                <input type="number" value={form.minStock || 5} onChange={e => setForm({...form, minStock: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-gray-800" />
                                <p className="text-[10px] text-gray-400 mt-1">Indikator akan berubah warna jika stok dibawah angka ini.</p>
                            </div>
                        </>
                    )}
                    
                    <button className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-all mt-4">Simpan Perubahan</button>
                </form>
            </div>
        </div>
    );
}

const typeLabels: Record<string, string> = {
    raw: 'Bahan Baku',
    spice: 'Bumbu Dapur',
    packaging: 'Kemasan',
    equipment: 'Alat',
    other: 'Lainnya'
};

const typeColors: Record<string, string> = {
    raw: 'bg-orange-100 text-orange-700',
    spice: 'bg-red-100 text-red-700',
    packaging: 'bg-blue-100 text-blue-700',
    equipment: 'bg-gray-100 text-gray-700',
    other: 'bg-purple-100 text-purple-700'
};

const InventoryView: React.FC = () => {
    const { menu, setMenu, ingredients, updateIngredient, addIngredient, storeProfile, categories } = useAppContext();
    const [viewMode, setViewMode] = useState<'products' | 'ingredients'>('products');
    const [ingredientFilter, setIngredientFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<any>(null);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    
    const theme = storeProfile.themeColor || 'orange';

    const updateProductStock = (id: number, change: number) => {
        setMenu(prev => prev.map(m => m.id === id && m.stock !== undefined ? { ...m, stock: Math.max(0, (m.stock || 0) + change) } : m));
    };

    const updateIngredientStock = (id: string, change: number) => {
        const ing = ingredients.find(i => i.id === id);
        if (ing) updateIngredient({ ...ing, stock: Math.max(0, ing.stock + change) });
    };

    const handleSaveItem = (data: any) => {
        if (viewMode === 'products') {
            // Note: data.stock will be undefined if tracking is disabled
            setMenu(prev => prev.map(m => m.id === data.id ? { ...m, stock: data.stock, minStock: data.minStock } : m));
        } else {
            if (data.id) updateIngredient(data);
            else addIngredient({ ...data, id: Date.now().toString() });
        }
        setEditingItem(null);
        setAddModalOpen(false);
    };

    const sortedIngredients = useMemo(() => {
        let items = ingredients;
        if (ingredientFilter !== 'all') {
            items = items.filter(i => i.type === ingredientFilter);
        }
        if (searchTerm) {
            items = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        // SORTING: Critical (0) -> Low (< min) -> Normal
        return items.sort((a, b) => {
            const getScore = (item: any) => {
                const min = item.minStock || 5;
                if (item.stock <= 0) return 0; // Highest priority
                if (item.stock <= min) return 1; // Medium priority
                return 2; // Low priority
            };
            return getScore(a) - getScore(b);
        });
    }, [ingredients, ingredientFilter, searchTerm]);

    const filteredProducts = useMemo(() => {
        // Show all products now, not just those with stock
        return menu.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [menu, searchTerm]);

    const lowStockCount = useMemo(() => {
        const lowProducts = menu.filter(m => m.stock !== undefined && m.stock <= (m.minStock || 5)).length;
        const lowIngredients = ingredients.filter(i => i.stock <= (i.minStock || 5)).length;
        return lowProducts + lowIngredients;
    }, [menu, ingredients]);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {(editingItem || isAddModalOpen) && (
                <EditInventoryModal 
                    onClose={() => { setEditingItem(null); setAddModalOpen(false); }} 
                    onSave={handleSaveItem} 
                    item={editingItem} 
                    type={viewMode === 'products' ? 'product' : 'ingredient'} 
                />
            )}

            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
                <div className="px-6 py-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Manajemen Stok</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${lowStockCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {lowStockCount > 0 ? `${lowStockCount} Item Perlu Restock` : 'Stok Aman'}
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setAddModalOpen(true)} 
                            disabled={viewMode === 'products'}
                            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 ${viewMode === 'products' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : `bg-${theme}-600 text-white hover:bg-${theme}-700 shadow-lg`}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            Item Baru
                        </button>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto shrink-0">
                            <button onClick={() => setViewMode('products')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 justify-center ${viewMode === 'products' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
                                Produk Jadi
                            </button>
                            <button onClick={() => setViewMode('ingredients')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 justify-center ${viewMode === 'ingredients' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
                                Stok Gudang (Bahan)
                            </button>
                        </div>
                        
                        <div className="relative flex-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input type="text" placeholder="Cari item..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-gray-200 text-sm outline-none font-medium transition-all" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
                
                {/* VIEW MODE: PRODUCTS (Cards) */}
                {viewMode === 'products' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map((item: any) => (
                            <StockCard 
                                key={item.id} 
                                title={item.name} 
                                stock={item.stock || 0} 
                                unit="Porsi" 
                                type="product" 
                                minStock={item.minStock} 
                                image={item.imageUrl} 
                                theme={theme}
                                isTracked={item.stock !== undefined}
                                onUpdate={(val: number) => updateProductStock(item.id, val)}
                                onEdit={() => setEditingItem(item)}
                            />
                        ))}
                        {filteredProducts.length === 0 && <div className="col-span-full text-center py-20 text-gray-400 font-medium">Menu tidak ditemukan.</div>}
                    </div>
                )}

                {/* VIEW MODE: INGREDIENTS (Table) */}
                {viewMode === 'ingredients' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        {/* Table Controls */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="font-bold text-gray-700">Daftar Stok</h3>
                            <select 
                                value={ingredientFilter} 
                                onChange={(e) => setIngredientFilter(e.target.value)} 
                                className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 font-bold outline-none"
                            >
                                <option value="all">Semua Kategori</option>
                                <option value="raw">Bahan Baku</option>
                                <option value="spice">Bumbu</option>
                                <option value="packaging">Kemasan</option>
                                <option value="equipment">Alat</option>
                                <option value="other">Lainnya</option>
                            </select>
                        </div>

                        {sortedIngredients.length === 0 ? (
                            <div className="text-center py-20 text-gray-400 font-medium flex flex-col items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                Data stok kosong. Tambahkan item baru.
                            </div>
                        ) : (
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-sm text-left min-w-[600px]">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3 font-bold">Item</th>
                                            <th className="px-6 py-3 font-bold">Kategori</th>
                                            <th className="px-6 py-3 font-bold">Jumlah Stok</th>
                                            <th className="px-6 py-3 font-bold text-center">Update</th>
                                            <th className="px-6 py-3 font-bold text-right">Status</th>
                                            <th className="px-6 py-3 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {sortedIngredients.map((item) => {
                                            const min = item.minStock || 5;
                                            const isLow = item.stock <= min;
                                            const isCritical = item.stock <= 0;
                                            const percent = Math.min(100, Math.max(0, (item.stock / (min * 3)) * 100)); // Visual bar width

                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="px-6 py-4 font-bold text-gray-800">{item.name}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${typeColors[item.type] || 'bg-gray-100'}`}>
                                                            {typeLabels[item.type] || item.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className={`text-base font-black ${isCritical ? 'text-red-600' : 'text-gray-800'}`}>
                                                                {item.stock} <span className="text-xs font-medium text-gray-400 ml-1">{item.unit}</span>
                                                            </span>
                                                            {/* Visual Stock Bar */}
                                                            <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full ${isCritical ? 'bg-red-500' : (isLow ? 'bg-yellow-400' : 'bg-green-500')}`} 
                                                                    style={{ width: `${percent}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => updateIngredientStock(item.id, -1)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded hover:bg-red-50 hover:border-red-200 text-red-500 font-bold active:scale-95 transition-transform">-</button>
                                                            <button onClick={() => updateIngredientStock(item.id, 1)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded hover:bg-green-50 hover:border-green-200 text-green-600 font-bold active:scale-95 transition-transform">+1</button>
                                                            <button onClick={() => updateIngredientStock(item.id, 10)} className="w-8 h-7 flex items-center justify-center bg-white border border-gray-200 rounded hover:bg-green-50 hover:border-green-200 text-green-600 text-xs font-bold active:scale-95 transition-transform">+10</button>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {isCritical ? (
                                                            <span className="text-red-600 font-bold text-xs flex items-center justify-end gap-1 animate-pulse">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                                Habis
                                                            </span>
                                                        ) : isLow ? (
                                                            <span className="text-yellow-600 font-bold text-xs">Menipis</span>
                                                        ) : (
                                                            <span className="text-green-600 font-bold text-xs">Aman</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button onClick={() => setEditingItem(item)} className="text-gray-400 hover:text-blue-600 font-bold text-xs hover:bg-blue-50 px-3 py-1.5 rounded transition-colors">
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryView;