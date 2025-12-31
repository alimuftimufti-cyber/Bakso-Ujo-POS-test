
import React, { useState, useRef, useMemo } from 'react';
import { useAppContext } from '../types'; 
import type { MenuItem, Ingredient, User, ThemeColor, Table, StoreProfile, Branch, UserRole } from '../types';
import { printTest } from '../services/printerService'; 
import { currentProjectId } from '../services/firebase'; 

// --- HELPER COMPONENTS ---
const ModalOverlay = ({ children, onClose }: { children?: React.ReactNode, onClose: () => void }) => (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in relative">
            <button onClick={onClose} className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 rounded-full p-2 text-gray-500 transition-colors z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            {children}
        </div>
    </div>
);

const InputField = ({ label, ...props }: any) => (
    <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">{label}</label>
        <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-gray-800 focus:ring-0 outline-none transition-colors text-sm font-medium" {...props} />
    </div>
);

const SelectField = ({ label, children, ...props }: any) => (
    <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">{label}</label>
        <div className="relative">
            <select className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-gray-800 focus:ring-0 outline-none transition-colors text-sm font-medium appearance-none bg-white" {...props}>
                {children}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
    </div>
);

const MenuForm = ({ onClose, onSave, item, theme }: { onClose: () => void, onSave: (i: MenuItem) => Promise<void>, item: MenuItem | null, theme: string }) => {
    const { categories, ingredients } = useAppContext();
    const [form, setForm] = useState<any>(item || { name: '', price: '', category: categories[0], imageUrl: '', recipe: [], stock: '' });
    const [isSaving, setIsSaving] = useState(false);

    const handleRecipe = (ingId: string, amount: number) => {
        let newRecipe = [...(form.recipe || [])];
        const idx = newRecipe.findIndex((r: any) => r.ingredientId === ingId);
        if (amount <= 0) { if (idx > -1) newRecipe.splice(idx, 1); }
        else { if (idx > -1) newRecipe[idx].amount = amount; else newRecipe.push({ ingredientId: ingId, amount }); }
        setForm({ ...form, recipe: newRecipe });
    };

    const handleSave = async () => {
        if (!form.name || !form.price) {
            alert("Nama dan Harga wajib diisi.");
            return;
        }
        setIsSaving(true);
        try {
            await onSave({ 
                ...form, 
                price: parseFloat(form.price), 
                stock: form.stock ? parseFloat(form.stock) : undefined, 
                id: form.id || Date.now() 
            });
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="p-8">
                <h2 className="text-2xl font-black text-gray-900 mb-6">{item ? 'Edit Menu' : 'Tambah Menu Baru'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <InputField label="Nama Produk" placeholder="Contoh: Bakso Urat" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField type="number" label="Harga (Rp)" placeholder="0" value={form.price} onChange={(e: any) => setForm({ ...form, price: e.target.value })} />
                            <InputField type="number" label="Stok Langsung" placeholder="Opsional" value={form.stock} onChange={(e: any) => setForm({ ...form, stock: e.target.value })} />
                        </div>
                        <SelectField label="Kategori" value={form.category} onChange={(e: any) => setForm({ ...form, category: e.target.value })}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </SelectField>
                        
                        <div className="mb-4">
                             <InputField 
                                label="Link Gambar Online" 
                                placeholder="https://contoh.com/gambar.jpg" 
                                value={form.imageUrl} 
                                onChange={(e: any) => setForm({ ...form, imageUrl: e.target.value })} 
                             />
                             {form.imageUrl && (
                                <div className="mt-2 p-2 bg-gray-50 border rounded-lg">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Preview:</p>
                                    <img src={form.imageUrl} className="h-24 w-full object-cover rounded border border-gray-200" onError={(e:any) => e.target.src='https://via.placeholder.com/150?text=Invalid+Link'} />
                                </div>
                             )}
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-gray-800 text-sm uppercase">Komposisi Resep</h3>
                             <span className="text-[10px] bg-gray-200 px-2 py-1 rounded text-gray-600">Auto-Deduct Stock</span>
                        </div>
                        <div className="space-y-2 h-64 overflow-y-auto pr-2 custom-scrollbar">
                            {ingredients.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Belum ada data bahan baku.</p>}
                            {ingredients.map(ing => {
                                const used = form.recipe?.find((r: any) => r.ingredientId === ing.id);
                                return (
                                    <div key={ing.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                                        <span className="text-sm font-medium text-gray-700">{ing.name} <span className="text-xs text-gray-400">({ing.unit})</span></span>
                                        <input type="number" placeholder="0" className="w-20 p-1 border rounded text-right text-sm font-bold" value={used?.amount || ''} onChange={e => handleRecipe(ing.id, parseFloat(e.target.value))} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                    <button onClick={onClose} disabled={isSaving} className="px-6 py-3 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">Batal</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className={`px-6 py-3 bg-${theme}-600 text-white rounded-xl font-bold hover:bg-${theme}-700 transition-colors shadow-lg shadow-${theme}-200 flex items-center gap-2 disabled:bg-gray-400`}
                    >
                        {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {isSaving ? 'Menyimpan...' : 'Simpan Produk'}
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};

// HELPER: Generate Masked URL
const getMaskedUrl = (baseUrl: string, branchId: string, tableNum: string) => {
    const rawStr = `B:${branchId}|T:${tableNum}`;
    const masked = btoa(rawStr);
    return `${baseUrl}/?q=${masked}`;
}

const generatePrintLayout = (tables: Table[], profile: StoreProfile) => {
    const baseUrl = window.location.origin;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
        alert("Browser memblokir pop-up. Izinkan pop-up untuk mencetak QR Code.");
        return;
    }

    const printContent = tables.map(t => {
        const maskedUrl = getMaskedUrl(baseUrl, profile.branchId, t.number);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(maskedUrl)}`;
        return `
            <div class="qr-card">
                <div class="header">
                    ${profile.logo ? `<img src="${profile.logo}" class="logo"/>` : ''}
                    <div class="store-name">${profile.name}</div>
                </div>
                <div class="qr-body">
                    <img src="${qrUrl}" loading="eager" alt="QR Meja ${t.number}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'" />
                    <div style="display:none;font-size:10px;color:red;">QR Gagal Dimuat</div>
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
            <title>Cetak QR - ${profile.name}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                body { font-family: 'Inter', sans-serif; background: #fff; padding: 20px; }
                .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
                .qr-card { border: 2px solid #000; border-radius: 12px; padding: 20px; text-align: center; break-inside: avoid; display: flex; flex-direction: column; align-items: center; justify-content: space-between; aspect-ratio: 2/3; box-sizing: border-box; }
                .header { margin-bottom: 10px; width: 100%; }
                .logo { height: 40px; width: auto; margin-bottom: 5px; object-fit: contain; }
                .store-name { font-size: 14px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 1px; }
                .qr-body { flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 150px; }
                .qr-body img { width: 100%; max-width: 160px; height: auto; mix-blend-mode: multiply; }
                .footer { margin-top: 10px; width: 100%; border-top: 2px dashed #ccc; pt: 10px; }
                .table-label { font-size: 10px; font-weight: 700; color: #666; letter-spacing: 2px; }
                .table-number { font-size: 48px; font-weight: 900; color: #000; line-height: 1; margin: 5px 0; }
                .instruction { font-size: 11px; color: #000; font-weight: 600; text-transform: uppercase; }
                
                @media print {
                    @page { margin: 0.5cm; }
                    .qr-grid { grid-template-columns: repeat(3, 1fr); }
                }
            </style>
        </head>
        <body>
            <div class="qr-grid">${printContent}</div>
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 1000);
                };
            </script>
        </body>
        </html>
    `);
    win.document.close();
}

const roleBadgeColors: Record<UserRole, string> = {
    owner: 'bg-red-600 text-white',
    admin: 'bg-purple-600 text-white',
    cashier: 'bg-blue-600 text-white',
    kitchen: 'bg-orange-500 text-white',
    staff: 'bg-gray-500 text-white'
};

const SettingsView = () => {
    const { 
        menu, saveMenuItem, removeMenuItem, users, addUser, updateUser, deleteUser, 
        storeProfile, setStoreProfile, requestPassword, 
        tables, addTable, deleteTable, setTables,
        printerDevice, connectToPrinter, disconnectPrinter, currentUser,
        kitchenAlarmTime, setKitchenAlarmTime, kitchenAlarmSound, setKitchenAlarmSound
    } = useAppContext();

    const theme = storeProfile.themeColor || 'orange';
    const [tab, setTab] = useState<'menu' | 'users' | 'profile' | 'kitchen' | 'qr' | 'data'>('menu');
    const [isMenuModalOpen, setMenuModalOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
    const [userForm, setUserForm] = useState<User>({ id: '', name: '', pin: '', attendancePin: '', role: 'cashier' });
    const [qrSingleTable, setQrSingleTable] = useState('');
    const [qrBatchStart, setQrBatchStart] = useState('');
    const [qrBatchEnd, setQrBatchEnd] = useState('');
    const [newMotivation, setNewMotivation] = useState('');

    const availableColors: ThemeColor[] = ['orange', 'red', 'blue', 'green', 'purple', 'slate', 'pink'];
    const isOwner = currentUser?.role === 'owner';

    const handleSaveMenu = async (item: MenuItem) => { 
        await saveMenuItem(item);
    };
    
    const deleteMenu = (id: number) => requestPassword("Hapus menu?", () => removeMenuItem(id));
    
    const saveUser = (e: React.FormEvent) => { 
        e.preventDefault(); 
        requestPassword("Simpan User?", () => { 
            const userData = {
                ...userForm,
                id: userForm.id || Date.now().toString(),
                attendancePin: userForm.attendancePin || Math.floor(1000 + Math.random() * 9000).toString()
            };
            if (userForm.id) updateUser(userData);
            else addUser(userData); 
            setUserForm({ id: '', name: '', pin: '', attendancePin: '', role: 'cashier' }); 
        }, true); 
    };
    
    const deleteUserAction = (id: string) => requestPassword("Hapus Staff?", () => deleteUser(id), true);

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
        const file = e.target.files?.[0]; 
        if(file) { 
            const reader = new FileReader(); 
            reader.onload = () => setStoreProfile({...storeProfile, logo: reader.result as string}); 
            reader.readAsDataURL(file); 
        } 
    };

    const handleBatchAddTable = () => {
        const start = parseInt(qrBatchStart), end = parseInt(qrBatchEnd);
        if(!isNaN(start) && !isNaN(end) && end >= start) {
            const newTables: Table[] = [];
            for(let i=start; i<=end; i++) {
                const numStr = i.toString();
                if(!tables.find(t => t.number === numStr)) newTables.push({ id: Date.now().toString() + i, number: numStr, qrCodeData: numStr });
            }
            if (newTables.length > 0) { setTables(prev => [...prev, ...newTables]); alert(`Berhasil membuat ${newTables.length} meja baru.`); }
        }
    };

    const handleTestPrint = async () => {
        if (!printerDevice) return alert("Printer belum terhubung");
        try { await printTest(printerDevice); } catch (e: any) { alert("Print gagal: " + e.message); }
    };

    const handleBackup = () => {
        const data: any = {};
        for(let i=0; i<localStorage.length; i++) {
            const key = localStorage.key(i);
            if(key && key.startsWith('pos-')) data[key] = JSON.parse(localStorage.getItem(key) || 'null');
        }
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = `backup_pos.json`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const addMotivation = () => {
        if (newMotivation.trim()) {
            setStoreProfile(prev => ({
                ...prev,
                kitchenMotivations: [...(prev.kitchenMotivations || []), newMotivation]
            }));
            setNewMotivation('');
        }
    };

    const deleteMotivation = (idx: number) => {
        setStoreProfile(prev => ({
            ...prev,
            kitchenMotivations: prev.kitchenMotivations.filter((_, i) => i !== idx)
        }));
    };

    const TabButton = ({ id, label }: { id: typeof tab, label: string }) => (
        <button onClick={() => setTab(id)} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${tab === id ? 'bg-gray-900 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-100'}`}>{label}</button>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {isMenuModalOpen && <MenuForm onClose={() => { setMenuModalOpen(false); setEditingMenu(null); }} onSave={handleSaveMenu} item={editingMenu} theme={theme} />}
            
            <div className="bg-white border-b px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-10 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pengaturan Operasional</h1>
                    <p className="text-sm text-gray-500 font-medium">{storeProfile.name} ({storeProfile.branchId})</p>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 overflow-x-auto max-w-full no-scrollbar">
                    <TabButton id="menu" label="Produk & Menu" />
                    <TabButton id="users" label="Manajemen Staff" />
                    <TabButton id="kitchen" label="Dapur" />
                    <TabButton id="profile" label="Profil & Koneksi" />
                    <TabButton id="qr" label="QR Meja" />
                    <TabButton id="data" label="Backup Data" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full custom-scrollbar">
                
                {/* TAB: MENU */}
                {tab === 'menu' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-gray-800">Daftar Menu Aktif</h3>
                            <button onClick={() => setMenuModalOpen(true)} className={`bg-${theme}-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform`}>+ Tambah Menu</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {menu.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 items-center group">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" onError={(e:any) => e.target.src='https://via.placeholder.com/150?text=Error'}/> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">?</div>}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800">{item.name}</h4>
                                        <p className="text-xs text-gray-500">{item.category} • Rp {item.price}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingMenu(item); setMenuModalOpen(true); }} className="text-blue-500 text-xs font-bold hover:underline text-left">Edit</button>
                                        <button onClick={() => deleteMenu(item.id)} className="text-red-500 text-xs font-bold hover:underline text-left">Hapus</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB: USERS (Enhanced) */}
                {tab === 'users' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-xl border border-orange-100 h-fit sticky top-6">
                                <h3 className="font-black text-lg mb-6 uppercase tracking-wider text-gray-800 flex items-center gap-2">
                                    <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
                                    {userForm.id ? 'Edit Staff' : 'Tambah Staff'}
                                </h3>
                                <form onSubmit={saveUser} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Nama Lengkap</label>
                                        <input required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Contoh: Budi Santoso" className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:border-orange-500 transition-all font-bold" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">PIN Login</label>
                                            <input required type="number" value={userForm.pin} onChange={e => setUserForm({...userForm, pin: e.target.value})} placeholder="4 Digit" className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:border-orange-500 transition-all font-mono font-bold text-center" maxLength={4} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">PIN Absen</label>
                                            <input required type="number" value={userForm.attendancePin} onChange={e => setUserForm({...userForm, attendancePin: e.target.value})} placeholder="4 Digit" className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none focus:border-orange-500 transition-all font-mono font-bold text-center" maxLength={4} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Jabatan / Role</label>
                                        <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})} className="w-full border-2 border-gray-100 p-3 rounded-xl outline-none bg-white font-bold appearance-none">
                                            <option value="cashier">Kasir (Bisa POS & Keuangan)</option>
                                            <option value="kitchen">Dapur (Hanya Monitor Dapur)</option>
                                            <option value="admin">Admin (Laporan & Stok)</option>
                                            <option value="staff">Staff Umum (Hanya Absen)</option>
                                        </select>
                                    </div>

                                    <div className="pt-2">
                                        <button type="submit" className="w-full bg-orange-600 text-white font-black py-4 rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all active:scale-95 uppercase tracking-widest text-sm">
                                            {userForm.id ? 'Perbarui Data' : 'Daftarkan Staff'}
                                        </button>
                                        {userForm.id && (
                                            <button type="button" onClick={() => setUserForm({ id: '', name: '', pin: '', attendancePin: '', role: 'cashier' })} className="w-full mt-2 text-gray-400 font-bold text-xs hover:text-gray-600">Batal Edit</button>
                                        )}
                                    </div>
                                </form>
                            </div>

                            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                                <h4 className="font-bold text-indigo-900 text-sm mb-3 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Panduan Hak Akses
                                </h4>
                                <ul className="space-y-2">
                                    <li className="text-[10px] text-indigo-700 leading-relaxed"><strong>Admin:</strong> Akses penuh kecuali Owner Panel.</li>
                                    <li className="text-[10px] text-indigo-700 leading-relaxed"><strong>Kasir:</strong> Hanya menu Kasir & Keuangan.</li>
                                    <li className="text-[10px] text-indigo-700 leading-relaxed"><strong>Dapur:</strong> Hanya menu Monitor Dapur.</li>
                                    <li className="text-[10px] text-indigo-700 leading-relaxed"><strong>Staff:</strong> Tidak ada akses menu operasional.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex justify-between items-center mb-2 px-2">
                                <h3 className="font-black text-gray-500 uppercase tracking-widest text-xs">Daftar Tim Bakso Ujo</h3>
                                <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-gray-400 border border-gray-100">{users.length} STAFF</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {users.map(u => (
                                    <div key={u.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${roleBadgeColors[u.role] || 'bg-gray-100'}`}>
                                                {u.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-900 leading-tight">{u.name}</h4>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${roleBadgeColors[u.role] || 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 border-t border-gray-50 pt-4 mt-2">
                                            <div className="bg-gray-50 p-2 rounded-xl text-center">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">PIN Login</p>
                                                <p className="font-mono font-black text-gray-700 text-xs tracking-widest">{u.pin || '---'}</p>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded-xl text-center">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">PIN Absen</p>
                                                <p className="font-mono font-black text-orange-600 text-xs tracking-widest">{u.attendancePin || '---'}</p>
                                            </div>
                                        </div>

                                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setUserForm(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Edit">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            </button>
                                            {u.role !== 'owner' && (
                                                <button onClick={() => deleteUserAction(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Hapus">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: KITCHEN */}
                {tab === 'kitchen' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800 mb-4">Pengaturan Alarm</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Batas Waktu (Detik)</label>
                                    <input type="number" value={kitchenAlarmTime} onChange={e => setKitchenAlarmTime(parseInt(e.target.value))} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-black" />
                                    <p className="text-xs text-gray-400 mt-1">Alarm berbunyi jika pesanan belum siap setelah waktu ini.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Jenis Suara</label>
                                    <select value={kitchenAlarmSound} onChange={e => setKitchenAlarmSound(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none bg-white">
                                        <option value="none">Mati</option>
                                        <option value="beep">Beep (Default)</option>
                                        <option value="ring">Dering Telepon</option>
                                        <option value="bell">Lonceng</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800 mb-4">Motivasi Tim Dapur</h3>
                            <div className="flex gap-2 mb-4">
                                <input value={newMotivation} onChange={e => setNewMotivation(e.target.value)} placeholder="Tulis kata-kata semangat..." className="border-2 border-gray-200 rounded-xl px-4 py-2 flex-1 outline-none focus:border-black" />
                                <button onClick={addMotivation} className="bg-green-600 text-white px-4 rounded-xl font-bold hover:bg-green-700">Tambah</button>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {(storeProfile.kitchenMotivations || []).map((msg, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 text-sm">
                                        <span>{msg}</span>
                                        <button onClick={() => deleteMotivation(idx)} className="text-red-400 hover:text-red-600 font-bold">&times;</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: PROFILE & PRINTER */}
                {tab === 'profile' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <h3 className="font-bold text-lg border-b pb-2">Status Sistem</h3>
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <h4 className="font-bold text-blue-900 mb-2">Informasi Cloud Database</h4>
                                    <p className="text-sm text-blue-800 mb-3">
                                        Status Koneksi: <strong>{currentProjectId ? 'TERHUBUNG' : 'OFFLINE'}</strong>
                                    </p>
                                    {currentProjectId && (
                                        <div className="text-xs bg-white p-2 rounded border border-blue-200 font-mono text-blue-600 mb-2">
                                            Project ID: {currentProjectId}
                                        </div>
                                    )}
                                    <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                                        Hosting: <strong>Vercel / Supabase</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <h3 className="font-bold text-lg border-b pb-2">Identitas Toko</h3>
                                <InputField label="Nama Toko" value={storeProfile.name} onChange={(e: any) => setStoreProfile({...storeProfile, name: e.target.value})} />
                                <InputField label="Alamat" value={storeProfile.address} onChange={(e: any) => setStoreProfile({...storeProfile, address: e.target.value})} />
                                <InputField label="Slogan Struk" value={storeProfile.slogan} onChange={(e: any) => setStoreProfile({...storeProfile, slogan: e.target.value})} />
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Warna Tema</label>
                                    <div className="flex gap-2">
                                        {availableColors.map(c => (
                                            <div key={c} onClick={() => setStoreProfile({...storeProfile, themeColor: c})} className={`w-8 h-8 rounded-full cursor-pointer bg-${c}-500 ${storeProfile.themeColor === c ? 'ring-4 ring-gray-200' : ''}`}></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 h-fit">
                            <h3 className="font-bold text-lg border-b pb-2">Koneksi Printer</h3>
                            <div className={`p-4 rounded-xl text-center ${printerDevice ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                <p className="font-bold">{printerDevice ? `Terhubung: ${printerDevice.productName}` : 'Printer Terputus'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => connectToPrinter('bluetooth')} className="bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700">Scan Bluetooth</button>
                                <button onClick={() => connectToPrinter('usb')} className="bg-gray-800 text-white font-bold py-2 rounded-lg hover:bg-gray-900">Scan USB</button>
                            </div>
                            {printerDevice && (
                                <button onClick={handleTestPrint} className="w-full border border-gray-300 text-gray-600 font-bold py-2 rounded-lg hover:bg-gray-50">Test Print Struk</button>
                            )}
                            <div className="pt-4 border-t">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={storeProfile.autoPrintReceipt} onChange={e => setStoreProfile({...storeProfile, autoPrintReceipt: e.target.checked})} className="w-5 h-5 rounded text-blue-600" />
                                    <span className="font-bold text-sm text-gray-700">Print Struk Otomatis setelah Bayar</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: QR */}
                {tab === 'qr' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-lg mb-4 text-gray-800">Manajemen Meja (QR Order)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tambah Meja Tunggal</label>
                                        <div className="flex gap-2">
                                            <input value={qrSingleTable} onChange={e => setQrSingleTable(e.target.value)} placeholder="Nomor Meja" className="border-2 border-gray-100 px-4 py-2.5 rounded-xl flex-1 outline-none focus:border-black font-bold" />
                                            <button onClick={() => { if(qrSingleTable) { addTable(qrSingleTable); setQrSingleTable(''); } }} className="bg-black text-white px-6 rounded-xl font-bold shadow-lg hover:bg-gray-800">Tambah</button>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                        <p className="text-[10px] font-black text-gray-500 mb-3 uppercase tracking-widest">Generator Massal</p>
                                        <div className="flex items-center gap-2">
                                            <input type="number" value={qrBatchStart} onChange={e => setQrBatchStart(e.target.value)} placeholder="Awal" className="border-2 border-gray-200 px-3 py-2 rounded-xl w-24 text-center font-bold" />
                                            <span className="text-gray-400 font-bold">s/d</span>
                                            <input type="number" value={qrBatchEnd} onChange={e => setQrBatchEnd(e.target.value)} placeholder="Akhir" className="border-2 border-gray-200 px-3 py-2 rounded-xl w-24 text-center font-bold" />
                                            <button onClick={handleBatchAddTable} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex-1 shadow-md hover:bg-blue-700">Buat Sekaligus</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" /><path d="M11 12a1 1 0 011-1h1v1h-1v1h1v1h-1v1h-1v-1h-1v-1h1v-1zM16 11a1 1 0 00-1 1v1h1v-1h1v1h-1v1h-1v-1h1v-1h-1v-1h-1zM16 16v1h1v-1h-1zM12 16v1h1v-1h-1z" /></svg>
                                            Mode Pesan Mandiri (Self Order)
                                        </h4>
                                        <p className="text-sm text-indigo-700 leading-relaxed mb-4">Pastikan URL toko Anda sudah benar. QR Code akan mengarahkan pelanggan ke menu digital yang terenkripsi dan otomatis mengisi nomor meja masing-masing.</p>
                                    </div>
                                    <button onClick={() => generatePrintLayout(tables, storeProfile)} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95">
                                        CETAK SEMUA QR MEJA
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* LIST MEJA & QR PREVIEW */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                                <h3 className="font-bold text-gray-700">Daftar Meja & QR Kunci</h3>
                                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black">{tables.length} MEJA</span>
                            </div>
                            <div className="p-6">
                                {tables.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400 italic font-medium">Belum ada meja yang terdaftar. Gunakan input di atas untuk membuat meja.</div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                        {tables.map(table => {
                                            const baseUrl = window.location.origin;
                                            const maskedUrl = getMaskedUrl(baseUrl, storeProfile.branchId, table.number);
                                            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(maskedUrl)}`;
                                            
                                            return (
                                                <div key={table.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center group relative hover:border-indigo-400 transition-colors">
                                                    <button 
                                                        onClick={() => deleteTable(table.id)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold"
                                                    >
                                                        &times;
                                                    </button>
                                                    <div className="bg-white p-2 rounded-lg shadow-inner mb-3 w-full aspect-square flex items-center justify-center">
                                                        <img src={qrUrl} alt={`Meja ${table.number}`} className="w-full h-full mix-blend-multiply" loading="lazy" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MEJA</span>
                                                    <span className="text-2xl font-black text-gray-900">{table.number}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: DATA */}
                {tab === 'data' && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <h3 className="font-bold text-xl text-gray-900 mb-2">Backup & Restore</h3>
                        <p className="text-gray-500 mb-8">Amankan data transaksi dan pengaturan toko Anda.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={handleBackup} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700">Download Backup</button>
                            <label className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 cursor-pointer">
                                Restore Data
                                <input type="file" onChange={(e) => { 
                                    const file = e.target.files?.[0];
                                    if(file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            const data = JSON.parse(ev.target?.result as string);
                                            requestPassword("Restore Data?", () => {
                                                Object.keys(data).forEach(k => { if(k.startsWith('pos-')) localStorage.setItem(k, JSON.stringify(data[k])); });
                                                window.location.reload();
                                            }, true);
                                        };
                                        reader.readAsText(file);
                                    }
                                }} className="hidden" />
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsView;
