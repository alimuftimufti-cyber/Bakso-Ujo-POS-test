
import React, { useState } from 'react';
import { useAppContext } from '../types';
import type { Table, StoreProfile, MenuItem, User } from '../types';

const formatRupiah = (number: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const generatePrintLayout = (tables: Table[], profile: StoreProfile) => {
    const baseUrl = window.location.origin;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
        alert("Browser memblokir pop-up. Izinkan pop-up untuk mencetak QR Code.");
        return;
    }

    const printContent = tables.sort((a,b) => parseInt(a.number) - parseInt(b.number)).map(t => {
        const maskedUrl = `${baseUrl}/?q=${t.qrCodeData}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(maskedUrl)}`;
        return `
            <div class="qr-card">
                <div class="header">
                    ${profile.logo ? `<img src="${profile.logo}" class="logo"/>` : ''}
                    <div class="store-name">${profile.name}</div>
                </div>
                <div class="qr-body">
                    <img src="${qrUrl}" loading="eager" alt="QR Meja ${t.number}" />
                </div>
                <div class="footer">
                    <div class="table-label">MEJA</div>
                    <div class="table-number">${t.number}</div>
                    <div class="instruction">Scan untuk pesan</div>
                </div>
            </div>`;
    }).join('');

    win.document.open();
    win.document.write(`
        <html>
            <head>
                <style>
                    body { font-family: sans-serif; display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; padding: 20px; }
                    .qr-card { border: 2px solid #000; padding: 20px; text-align: center; width: 250px; page-break-inside: avoid; margin-bottom: 20px; }
                    .logo { width: 50px; height: 50px; object-fit: contain; }
                    .store-name { font-weight: bold; font-size: 1.1rem; margin-top: 5px; }
                    .qr-body img { width: 100%; margin: 15px 0; }
                    .table-label { font-size: 0.7rem; font-weight: bold; letter-spacing: 2px; }
                    .table-number { font-size: 3rem; font-weight: 900; line-height: 1; }
                    .instruction { font-size: 0.7rem; margin-top: 10px; opacity: 0.7; }
                </style>
            </head>
            <body onload="window.print()">${printContent}</body>
        </html>
    `);
    win.document.close();
}

const SettingsView: React.FC = () => {
    const { 
        tables, addTable, deleteTable, storeProfile, setStoreProfile, 
        menu, saveMenuItem, removeMenuItem, 
        categories, addCategory, deleteCategory,
        users, addUser, deleteUser
    } = useAppContext();

    const [activeTab, setActiveTab] = useState<'profile' | 'menu' | 'tables' | 'staff'>('profile');
    
    // --- STATE FOR TABLES ---
    const [qrBatchStart, setQrBatchStart] = useState('1');
    const [qrBatchEnd, setQrBatchEnd] = useState('10');
    const [manualTableName, setManualTableName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [editingProduct, setEditingProduct] = useState<Partial<MenuItem> | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

    // --- ACTIONS ---
    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        setStoreProfile(storeProfile);
        alert("Profil Kedai Berhasil Disimpan!");
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            await saveMenuItem(editingProduct as MenuItem);
            setEditingProduct(null);
            alert("Produk Berhasil Disimpan!");
        }
    };

    const handleAddCategory = () => {
        if (newCategoryName.trim()) {
            addCategory(newCategoryName.trim());
            setNewCategoryName('');
        }
    };

    const handleSaveUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            const userData = {
                ...editingUser,
                id: editingUser.id || Date.now().toString()
            } as User;
            addUser(userData);
            setEditingUser(null);
            alert("Data Staff Berhasil Disimpan!");
        }
    };

    const handleAddSingleTable = async () => {
        if (!manualTableName.trim()) return;
        setIsProcessing(true);
        try {
            if (tables.find(t => t.number === manualTableName.trim())) {
                alert("Nomor meja sudah ada!");
                return;
            }
            await addTable(manualTableName.trim());
            setManualTableName('');
        } catch (e) {
            alert("Gagal menambah meja.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBatchAddTable = async () => {
        const start = parseInt(qrBatchStart), end = parseInt(qrBatchEnd);
        if(!isNaN(start) && !isNaN(end) && end >= start) {
            if (end - start > 50) {
                alert("Maksimal 50 meja per batch.");
                return;
            }
            setIsProcessing(true);
            try {
                for(let i=start; i<=end; i++) {
                    const numStr = i.toString();
                    if(!tables.find(t => t.number === numStr)) {
                        await addTable(numStr); 
                    }
                }
                alert(`Selesai memproses pembuatan meja.`);
            } catch (e) {
                alert("Gagal batch upload.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            {/* Tab Header */}
            <div className="bg-white border-b px-8 py-4 flex items-center justify-between sticky top-0 z-20">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">Pengaturan Sistem</h2>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>PROFIL</button>
                    <button onClick={() => setActiveTab('menu')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'menu' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>MENU</button>
                    <button onClick={() => setActiveTab('tables')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'tables' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>MEJA QR</button>
                    <button onClick={() => setActiveTab('staff')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'staff' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>STAFF</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto pb-20">
                    
                    {/* TAB: PROFIL KEDAI */}
                    {activeTab === 'profile' && (
                        <div className="animate-fade-in">
                            <div className="bg-white rounded-3xl shadow-sm border p-8">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                    <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
                                    IDENTITAS KEDAI
                                </h3>
                                <form onSubmit={handleSaveProfile} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nama Kedai</label>
                                            <input value={storeProfile.name} onChange={e => setStoreProfile({...storeProfile, name: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-orange-500 outline-none font-bold" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Slogan / Motto</label>
                                            <input value={storeProfile.slogan} onChange={e => setStoreProfile({...storeProfile, slogan: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-orange-500 outline-none" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Alamat Lengkap</label>
                                            <input value={storeProfile.address} onChange={e => setStoreProfile({...storeProfile, address: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-orange-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">URL Logo</label>
                                            <input value={storeProfile.logo} onChange={e => setStoreProfile({...storeProfile, logo: e.target.value})} className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-orange-500 outline-none" placeholder="https://..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">PPN (%)</label>
                                            <div className="flex items-center gap-3">
                                                <input type="number" value={storeProfile.taxRate} onChange={e => setStoreProfile({...storeProfile, taxRate: parseFloat(e.target.value) || 0})} className="w-24 border-2 border-gray-100 rounded-xl p-3 focus:border-orange-500 outline-none font-bold" />
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={storeProfile.enableTax} onChange={e => setStoreProfile({...storeProfile, enableTax: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500" />
                                                    <span className="text-sm font-bold text-gray-600 uppercase">Aktifkan Pajak</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" className="bg-orange-600 text-white font-black px-8 py-3 rounded-xl hover:bg-orange-700 shadow-lg transition-all active:scale-95">SIMPAN PROFIL</button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* TAB: MENU & PRODUK */}
                    {activeTab === 'menu' && (
                        <div className="animate-fade-in space-y-8">
                            <div className="bg-white rounded-3xl shadow-sm border p-8">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                    <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                                    KATEGORI MENU
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {categories.map(cat => (
                                        <div key={cat} className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full border">
                                            <span className="text-sm font-bold text-gray-700">{cat}</span>
                                            <button onClick={() => { if(confirm('Hapus kategori ' + cat + '?')) deleteCategory(cat); }} className="text-red-400 hover:text-red-600">&times;</button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 max-w-sm">
                                    <input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nama Kategori Baru..." className="flex-1 border-2 border-gray-100 rounded-xl p-2.5 outline-none focus:border-blue-500" />
                                    <button onClick={handleAddCategory} className="bg-blue-600 text-white font-bold px-6 rounded-xl hover:bg-blue-700 transition-all">+</button>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl shadow-sm border p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black flex items-center gap-3">
                                        <span className="w-2 h-6 bg-green-500 rounded-full"></span>
                                        DAFTAR MENU
                                    </h3>
                                    <button onClick={() => setEditingProduct({ id: Date.now(), name: '', price: 0, category: categories[0] || '', imageUrl: '' })} className="bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-green-700 transition-all">+ TAMBAH MENU</button>
                                </div>

                                {editingProduct && (
                                    <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 mb-8 animate-slide-in-up">
                                        <h4 className="font-bold text-gray-800 mb-4 uppercase text-sm">Form Data Menu</h4>
                                        <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input required value={editingProduct.name || ''} onChange={e => setEditingProduct(prev => prev ? {...prev, name: e.target.value} : prev)} placeholder="Nama Menu" className="border rounded-xl p-3 font-bold" />
                                            <input required type="number" value={editingProduct.price || 0} onChange={e => setEditingProduct(prev => prev ? {...prev, price: parseInt(e.target.value) || 0} : prev)} placeholder="Harga (Rp)" className="border rounded-xl p-3 font-bold" />
                                            <select value={editingProduct.category || ''} onChange={e => setEditingProduct(prev => prev ? {...prev, category: e.target.value} : prev)} className="border rounded-xl p-3 bg-white font-bold">
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <input value={editingProduct.imageUrl || ''} onChange={e => setEditingProduct(prev => prev ? {...prev, imageUrl: e.target.value} : prev)} placeholder="URL Gambar" className="border rounded-xl p-3" />
                                            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                                                <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-200">BATAL</button>
                                                <button type="submit" className="px-8 py-2 bg-green-600 text-white rounded-xl font-black hover:bg-green-700 shadow-md">SIMPAN</button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {menu.map(item => (
                                        <div key={item.id} className="flex items-center gap-4 bg-white border p-3 rounded-2xl hover:shadow-md transition-shadow group">
                                            <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                                                {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.name} /> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">?</div>}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-800">{item.name}</div>
                                                <div className="text-xs text-orange-600 font-black">{formatRupiah(item.price)}</div>
                                                <div className="text-[10px] text-gray-400 uppercase font-bold">{item.category}</div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => setEditingProduct(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                                <button onClick={() => { if(confirm('Hapus ' + item.name + '?')) removeMenuItem(item.id); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: MEJA & QR */}
                    {activeTab === 'tables' && (
                        <div className="animate-fade-in space-y-8">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                    <span className="w-2 h-6 bg-green-500 rounded-full"></span>
                                    TAMBAH MEJA MANUAL
                                </h3>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nomor Meja</label>
                                        <input value={manualTableName} onChange={e => setManualTableName(e.target.value)} placeholder="Contoh: A1, 15, VVIP..." className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-green-500 outline-none font-bold" />
                                    </div>
                                    <button onClick={handleAddSingleTable} disabled={isProcessing || !manualTableName} className="bg-green-600 text-white font-black px-8 py-3.5 rounded-xl hover:bg-green-700 shadow-lg disabled:bg-gray-300 transition-all">{isProcessing ? '...' : '+ TAMBAH'}</button>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl shadow-sm border">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                    <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                                    GENERATOR BATCH (NOMOR URUT)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mulai Nomor</label>
                                            <input value={qrBatchStart} onChange={e => setQrBatchStart(e.target.value)} type="number" className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-indigo-500 outline-none font-bold" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sampai Nomor</label>
                                            <input value={qrBatchEnd} onChange={e => setQrBatchEnd(e.target.value)} type="number" className="w-full border-2 border-gray-100 rounded-xl p-3 focus:border-indigo-500 outline-none font-bold" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleBatchAddTable} disabled={isProcessing} className="flex-1 bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 shadow-lg active:scale-95 transition-all disabled:bg-gray-300">{isProcessing ? 'MEMPROSES...' : 'BUAT BATCH'}</button>
                                        <button onClick={() => generatePrintLayout(tables, storeProfile)} className="bg-gray-900 text-white font-black px-6 py-3 rounded-xl hover:bg-black shadow-lg transition-all">CETAK SEMUA</button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {tables.sort((a,b) => parseInt(a.number) - parseInt(b.number) || a.number.localeCompare(b.number)).map(table => {
                                    const baseUrl = window.location.origin;
                                    const maskedUrl = `${baseUrl}/?q=${table.qrCodeData}`; 
                                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(maskedUrl)}`;
                                    return (
                                        <div key={table.id} className="bg-white p-4 border rounded-2xl text-center shadow-sm relative group hover:border-indigo-500 transition-all animate-fade-in">
                                            <button onClick={() => { if(confirm('Hapus meja ' + table.number + '?')) deleteTable(table.id); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs">&times;</button>
                                            <img src={qrUrl} className="mx-auto mb-3 w-full aspect-square object-contain" alt={`Meja ${table.number}`} />
                                            <div className="font-black text-gray-800 text-lg">MEJA {table.number}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* TAB: STAFF / KARYAWAN */}
                    {activeTab === 'staff' && (
                        <div className="animate-fade-in space-y-8">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black flex items-center gap-3">
                                        <span className="w-2 h-6 bg-purple-500 rounded-full"></span>
                                        MANAJEMEN STAFF
                                    </h3>
                                    <button onClick={() => setEditingUser({ name: '', pin: '', role: 'cashier', attendancePin: '1111' })} className="bg-purple-600 text-white font-bold px-4 py-2 rounded-xl text-xs hover:bg-purple-700">+ TAMBAH STAFF</button>
                                </div>

                                {editingUser && (
                                    <div className="bg-gray-50 p-6 rounded-2xl border-2 border-dashed border-gray-200 mb-8 animate-slide-in-up">
                                        <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input required value={editingUser.name || ''} onChange={e => setEditingUser(prev => prev ? {...prev, name: e.target.value} : prev)} placeholder="Nama Lengkap" className="border rounded-xl p-3 font-bold" />
                                            <input required value={editingUser.pin || ''} onChange={e => setEditingUser(prev => prev ? {...prev, pin: e.target.value.replace(/\D/g,'')} : prev)} placeholder="PIN Login (4-6 Angka)" className="border rounded-xl p-3 font-bold" maxLength={6} />
                                            <select value={editingUser.role || 'staff'} onChange={e => setEditingUser(prev => prev ? {...prev, role: e.target.value as any} : prev)} className="border rounded-xl p-3 bg-white font-bold">
                                                <option value="admin">Admin / Owner</option>
                                                <option value="cashier">Kasir</option>
                                                <option value="kitchen">Dapur</option>
                                                <option value="staff">Staff Umum</option>
                                            </select>
                                            <div className="flex justify-end gap-2 mt-2 md:col-span-2">
                                                <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-200">BATAL</button>
                                                <button type="submit" className="px-8 py-2 bg-purple-600 text-white rounded-xl font-black hover:bg-purple-700 shadow-md">SIMPAN STAFF</button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {users.map(u => (
                                        <div key={u.id} className="flex items-center justify-between bg-white border p-4 rounded-2xl hover:border-purple-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-black text-xl">{u.name ? u.name.charAt(0) : '?'}</div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{u.name}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-500">{u.role}</span>
                                                        <span className="text-[10px] font-bold text-gray-400">PIN: {u.pin}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => { if(confirm('Hapus staff ' + u.name + '?')) deleteUser(u.id); }} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default SettingsView;
