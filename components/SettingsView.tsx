
// ... (imports remain the same)
import React, { useState, useRef, useMemo } from 'react';
import { useAppContext } from '../types'; 
import type { MenuItem, Ingredient, User, ThemeColor, Table, StoreProfile, Branch } from '../types';
import { printTest } from '../services/printerService'; 
import { currentProjectId } from '../services/firebase'; // IMPORT PROJECT ID

// ... (Helper components ModalOverlay, InputField, SelectField, MenuForm, generatePrintLayout remain the same)
// ... (Keeping them as is, assume they are part of the file content)

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

const MenuForm = ({ onClose, onSave, item, theme }: { onClose: () => void, onSave: (i: MenuItem) => void, item: MenuItem | null, theme: string }) => {
    const { categories, ingredients } = useAppContext();
    const [form, setForm] = useState<any>(item || { name: '', price: '', category: categories[0], imageUrl: '', recipe: [], stock: '' });

    const handleRecipe = (ingId: string, amount: number) => {
        let newRecipe = [...(form.recipe || [])];
        const idx = newRecipe.findIndex((r: any) => r.ingredientId === ingId);
        if (amount <= 0) { if (idx > -1) newRecipe.splice(idx, 1); }
        else { if (idx > -1) newRecipe[idx].amount = amount; else newRecipe.push({ ingredientId: ingId, amount }); }
        setForm({ ...form, recipe: newRecipe });
    };

    const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = () => setForm({...form, imageUrl: reader.result as string});
            reader.readAsDataURL(file);
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
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Gambar Produk</label>
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-bold text-gray-600 transition-colors">
                                    Pilih File
                                    <input type="file" onChange={handleImage} className="hidden" accept="image/*" />
                                </label>
                                {form.imageUrl && <img src={form.imageUrl} className="h-12 w-12 object-cover rounded-lg border border-gray-200"/>}
                            </div>
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
                    <button onClick={onClose} className="px-6 py-3 bg-white border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">Batal</button>
                    <button onClick={() => onSave({ ...form, price: parseFloat(form.price), stock: form.stock ? parseFloat(form.stock) : undefined, id: form.id || Date.now() })} className={`px-6 py-3 bg-${theme}-600 text-white rounded-xl font-bold hover:bg-${theme}-700 transition-colors shadow-lg shadow-${theme}-200`}>Simpan Produk</button>
                </div>
            </div>
        </ModalOverlay>
    );
};

const generatePrintLayout = (tables: Table[], profile: StoreProfile) => {
    const baseUrl = window.location.origin;
    
    // Robust print window opening
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
        alert("Browser memblokir pop-up. Izinkan pop-up untuk mencetak QR Code.");
        return;
    }

    const printContent = tables.map(t => {
        // Ensure URL handles query params correctly
        const deepLinkUrl = `${baseUrl}/?mode=customer&branch=${profile.branchId}&table=${t.number}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(deepLinkUrl)}`;
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
                // Wait for all images to load before printing
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        // Optional: window.close(); // Uncomment to close automatically after print dialog
                    }, 1000);
                };
            </script>
        </body>
        </html>
    `);
    win.document.close();
}

// --- MAIN SETTINGS COMPONENT (ADMIN FOCUSED) ---
const SettingsView = () => {
    const { 
        menu, setMenu, users, addUser, updateUser, deleteUser, 
        storeProfile, setStoreProfile, requestPassword, 
        tables, addTable, deleteTable, setTables,
        printerDevice, connectToPrinter, disconnectPrinter, currentUser,
        kitchenAlarmTime, setKitchenAlarmTime, kitchenAlarmSound, setKitchenAlarmSound
    } = useAppContext();

    const theme = storeProfile.themeColor || 'orange';
    const [tab, setTab] = useState<'menu' | 'users' | 'profile' | 'kitchen' | 'qr' | 'data'>('menu');
    const [isMenuModalOpen, setMenuModalOpen] = useState(false);
    const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
    const [userForm, setUserForm] = useState<User>({ id: '', name: '', pin: '', attendancePin: '', role: 'cashier' }); // Updated initial state
    const [qrSingleTable, setQrSingleTable] = useState('');
    const [qrBatchStart, setQrBatchStart] = useState('');
    const [qrBatchEnd, setQrBatchEnd] = useState('');
    const [newMotivation, setNewMotivation] = useState('');

    const availableColors: ThemeColor[] = ['orange', 'red', 'blue', 'green', 'purple', 'slate', 'pink'];
    const isOwner = currentUser?.role === 'owner'; // Check privilege

    // ACTIONS
    const saveMenu = (item: MenuItem) => { 
        setMenu(prev => { 
            const idx = prev.findIndex(i => i.id === item.id); 
            if (idx > -1) { const newMenu = [...prev]; newMenu[idx] = item; return newMenu; } 
            return [...prev, item]; 
        }); 
        setMenuModalOpen(false); 
        setEditingMenu(null);
    };
    
    const deleteMenu = (id: number) => requestPassword("Hapus menu?", () => setMenu(prev => prev.filter(i => i.id !== id)));
    
    const saveUser = (e: React.FormEvent) => { 
        e.preventDefault(); 
        requestPassword("Simpan User?", () => { 
            // Ensure attendancePin exists if not provided
            const userData = {
                ...userForm,
                id: Date.now().toString(),
                attendancePin: userForm.attendancePin || Math.floor(1000 + Math.random() * 9000).toString()
            };
            addUser(userData); 
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
                if(!tables.find(t => t.number === numStr)) newTables.push({ id: Date.now().toString() + i, number: numStr, qrCodeData: `{"table":"${numStr}"}` });
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

    // Kitchen Actions
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
            {isMenuModalOpen && <MenuForm onClose={() => { setMenuModalOpen(false); setEditingMenu(null); }} onSave={saveMenu} item={editingMenu} theme={theme} />}
            
            <div className="bg-white border-b px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-10 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pengaturan Operasional</h1>
                    <p className="text-sm text-gray-500 font-medium">{storeProfile.name} ({storeProfile.branchId})</p>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 overflow-x-auto max-w-full">
                    <TabButton id="menu" label="Produk & Menu" />
                    {isOwner && <TabButton id="users" label="Manajemen Staff" />}
                    <TabButton id="kitchen" label="Dapur" />
                    <TabButton id="profile" label="Profil & Koneksi" />
                    <TabButton id="qr" label="QR Meja" />
                    <TabButton id="data" label="Backup Data" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
                
                {/* TAB: MENU */}
                {tab === 'menu' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl text-gray-800">Daftar Menu Aktif</h3>
                            <button onClick={() => setMenuModalOpen(true)} className={`bg-${theme}-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform`}>+ Tambah Menu</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {menu.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-4 items-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">?</div>}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800">{item.name}</h4>
                                        <p className="text-xs text-gray-500">{item.category} • Rp {item.price}</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button onClick={() => { setEditingMenu(item); setMenuModalOpen(true); }} className="text-blue-500 text-xs font-bold hover:underline">Edit</button>
                                        <button onClick={() => deleteMenu(item.id)} className="text-red-500 text-xs font-bold hover:underline">Hapus</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB: USERS (OWNER ONLY) */}
                {tab === 'users' && isOwner && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                            <h3 className="font-bold text-lg mb-4">Tambah Pegawai</h3>
                            <form onSubmit={saveUser} className="space-y-4">
                                <input required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Nama Pegawai" className="w-full border p-3 rounded-xl outline-none focus:border-black" />
                                <input required type="number" value={userForm.pin} onChange={e => setUserForm({...userForm, pin: e.target.value})} placeholder="PIN Login Sistem" className="w-full border p-3 rounded-xl outline-none focus:border-black" />
                                <input type="number" value={userForm.attendancePin || ''} onChange={e => setUserForm({...userForm, attendancePin: e.target.value})} placeholder="PIN Absen (Opsional)" className="w-full border p-3 rounded-xl outline-none focus:border-black" />
                                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})} className="w-full border p-3 rounded-xl outline-none bg-white">
                                    <option value="cashier">Kasir</option>
                                    <option value="kitchen">Dapur</option>
                                    <option value="admin">Admin Cabang</option>
                                    <option value="staff">Staff Umum</option>
                                </select>
                                <button type="submit" className="w-full bg-black text-white font-bold py-3 rounded-xl hover:bg-gray-800">Simpan Pegawai</button>
                            </form>
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            {users.map(u => (
                                <div key={u.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-gray-900">{u.name}</h4>
                                        <span className="text-xs uppercase font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">{u.role}</span>
                                        <span className="text-xs text-gray-400 ml-2">Login: {u.pin || '-'} | Absen: {u.attendancePin || '-'}</span>
                                    </div>
                                    {u.role !== 'owner' && (
                                        <button onClick={() => deleteUserAction(u.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100">Hapus</button>
                                    )}
                                </div>
                            ))}
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
                            {/* DATABASE STATUS CARD */}
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
                                        Hosting: <strong>Gratis (Vercel / Firebase Hosting)</strong>
                                    </div>
                                    <p className="text-[10px] text-blue-500 mt-2 italic">
                                        *Jika ID Project tidak sesuai, update di Vercel Settings.
                                    </p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-lg mb-4">Generator Meja</h3>
                            <div className="flex gap-2 mb-6">
                                <input value={qrSingleTable} onChange={e => setQrSingleTable(e.target.value)} placeholder="Nomor Meja" className="border p-2 rounded-lg flex-1 outline-none" />
                                <button onClick={() => { addTable(qrSingleTable); setQrSingleTable(''); }} className="bg-black text-white px-4 rounded-lg font-bold">Tambah</button>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Batch Generator</p>
                                <div className="flex gap-2">
                                    <input type="number" value={qrBatchStart} onChange={e => setQrBatchStart(e.target.value)} placeholder="Mulai" className="border p-2 rounded-lg w-20" />
                                    <input type="number" value={qrBatchEnd} onChange={e => setQrBatchEnd(e.target.value)} placeholder="Sampai" className="border p-2 rounded-lg w-20" />
                                    <button onClick={handleBatchAddTable} className="bg-blue-600 text-white px-4 rounded-lg font-bold text-xs flex-1">Buat Banyak</button>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-lg mb-2">Cetak QR Code</h3>
                                <p className="text-gray-500 text-sm mb-4">Total Meja Terdaftar: {tables.length}</p>
                            </div>
                            <button onClick={() => generatePrintLayout(tables, storeProfile)} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 shadow-lg">
                                Print Semua QR Meja
                            </button>
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