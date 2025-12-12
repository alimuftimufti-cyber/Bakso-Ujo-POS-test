
import React, { useState } from 'react';
import { useAppContext } from '../types';
import type { User } from '../types';

// Access Management Modal
const AccessManagementModal = ({ 
    branchId, 
    branchName, 
    onClose, 
    onActiveBranchUpdate 
}: { 
    branchId: string, 
    branchName: string, 
    onClose: () => void,
    onActiveBranchUpdate?: (newUsers: User[]) => void // Callback for live update
}) => {
    // Read from localStorage to ensure we get the persistent data for THAT branch
    const storageKey = `pos-branch-${branchId}-users`;
    
    // We start by reading local storage, but for the ACTIVE branch, we might want to trust Context more?
    // Actually, localStorage is the single source of truth for persistence.
    const [localUsers, setLocalUsers] = useState<User[]>(() => {
        try {
            return JSON.parse(localStorage.getItem(storageKey) || '[]');
        } catch (e) { return []; }
    });

    const [adminPin, setAdminPin] = useState('');

    // Find the main admin for this branch
    const adminUser = localUsers.find(u => u.role === 'admin');

    const handleSavePin = () => {
        if (!adminPin || adminPin.length < 4) {
            alert("PIN minimal 4 angka.");
            return;
        }

        let updatedUsers = [...localUsers];
        if (adminUser) {
            updatedUsers = updatedUsers.map(u => u.id === adminUser.id ? { ...u, pin: adminPin } : u);
        } else {
            // Create if missing
            updatedUsers.push({ id: `admin-${Date.now()}`, name: `Admin ${branchName}`, role: 'admin', pin: adminPin, attendancePin: '1111' });
        }

        // 1. Save to Persistent Storage
        localStorage.setItem(storageKey, JSON.stringify(updatedUsers));
        setLocalUsers(updatedUsers);
        
        // 2. IMPORTANT: If this is the currently active branch, force update the Context state
        // This ensures the App doesn't need a reload to see the new PIN
        if (onActiveBranchUpdate) {
            onActiveBranchUpdate(updatedUsers);
        }

        alert(`PIN Admin untuk ${branchName} berhasil diubah menjadi: ${adminPin}`);
        setAdminPin('');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-scale-in">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">&times;</button>
                
                <h3 className="text-xl font-bold text-gray-900 mb-1">Akses Cabang</h3>
                <p className="text-sm text-gray-500 mb-6">{branchName} ({branchId})</p>

                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6">
                    <h4 className="text-xs font-bold text-orange-800 uppercase mb-2">Admin Saat Ini</h4>
                    {adminUser ? (
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-800">{adminUser.name}</span>
                            <div className="flex flex-col text-right">
                                <span className="font-mono bg-white px-2 py-1 rounded border border-orange-200 text-orange-600 font-bold text-xs mb-1">Login: {adminUser.pin}</span>
                                <span className="font-mono bg-white px-2 py-1 rounded border border-gray-200 text-gray-500 font-bold text-xs">Absen: {adminUser.attendancePin}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-red-500 italic">Belum ada Admin terdaftar.</p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Reset PIN Login Admin</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={adminPin} 
                            onChange={e => setAdminPin(e.target.value.replace(/\D/g,''))} 
                            placeholder="PIN Baru (Angka)" 
                            className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-black font-mono font-bold"
                            maxLength={6}
                        />
                        <button onClick={handleSavePin} className="bg-gray-900 text-white font-bold px-4 rounded-xl hover:bg-black">Simpan</button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">PIN ini digunakan oleh staff Admin di cabang tersebut untuk login ke dashboard.</p>
                </div>
            </div>
        </div>
    );
};

const OwnerSettingsView: React.FC = () => {
    const { branches, addBranch, deleteBranch, switchBranch, storeProfile, setUsers } = useAppContext();
    const [isAdding, setIsAdding] = useState(false);
    const [newBranch, setNewBranch] = useState({ id: '', name: '', address: '' });
    
    // Management Modal State
    const [managingBranch, setManagingBranch] = useState<{id: string, name: string} | null>(null);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const id = newBranch.id.toLowerCase().replace(/\s+/g, '-');
        if (branches.find(b => b.id === id)) {
            alert("ID Cabang sudah ada!");
            return;
        }
        
        // This triggers the App.tsx addBranch which creates the seed data
        addBranch({ ...newBranch, id });
        
        setNewBranch({ id: '', name: '', address: '' });
        setIsAdding(false);
        alert(`Cabang "${newBranch.name}" berhasil dibuat. \n\nData default (Admin Cabang PIN: 1234) telah diinisialisasi.`);
    };

    const handleDelete = (id: string) => {
        if (id === 'pusat') return alert("Cabang Pusat tidak dapat dihapus.");
        if (storeProfile.branchId === id) return alert("Pindah ke cabang lain dulu sebelum menghapus cabang ini.");
        if (confirm(`Yakin hapus cabang ${id}? Data tidak dapat dikembalikan.`)) {
            deleteBranch(id);
        }
    };

    return (
        <div className="bg-slate-50 min-h-full font-sans">
            {managingBranch && (
                <AccessManagementModal 
                    branchId={managingBranch.id} 
                    branchName={managingBranch.name} 
                    onClose={() => setManagingBranch(null)}
                    onActiveBranchUpdate={
                        // Only pass the update callback if we are editing the CURRENTLY ACTIVE branch
                        managingBranch.id === storeProfile.branchId ? setUsers : undefined
                    }
                />
            )}

            {/* Header */}
            <div className="bg-slate-900 text-white px-8 py-8 shadow-lg">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight mb-1">Manajemen Bisnis</h1>
                        <p className="text-slate-400 text-sm">Pengaturan Global & Cabang Outlet</p>
                    </div>
                    <button onClick={() => setIsAdding(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all transform hover:scale-105 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Buka Cabang Baru
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-8">
                {isAdding && (
                    <div className="mb-8 bg-white p-6 rounded-2xl shadow-xl border border-indigo-100 animate-fade-in">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 text-lg">Form Cabang Baru</h3>
                            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID Cabang (Unik)</label>
                                <input required value={newBranch.id} onChange={e => setNewBranch({...newBranch, id: e.target.value})} placeholder="cth: jakarta-selatan" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Tampilan</label>
                                <input required value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} placeholder="cth: Cabang Fatmawati" className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alamat</label>
                                <input value={newBranch.address} onChange={e => setNewBranch({...newBranch, address: e.target.value})} placeholder="Jl. Raya..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-indigo-500 outline-none" />
                            </div>
                            <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Batal</button>
                                <button type="submit" className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md">Simpan & Inisialisasi</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branches.map(branch => {
                        const isCurrent = storeProfile.branchId === branch.id;
                        return (
                            <div key={branch.id} className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-between transition-all duration-200 ${isCurrent ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${isCurrent ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {isCurrent ? 'Sedang Dipantau' : 'Standby'}
                                        </span>
                                        {branch.id !== 'pusat' && (
                                            <button onClick={() => handleDelete(branch.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{branch.name}</h3>
                                    <p className="text-sm text-gray-500 font-mono mb-4">{branch.id}</p>
                                    <p className="text-sm text-gray-600 border-t border-gray-100 pt-3">{branch.address || 'Alamat belum diset'}</p>
                                </div>
                                
                                <div className="mt-6 flex flex-col gap-2">
                                    <button 
                                        onClick={() => switchBranch(branch.id)}
                                        disabled={isCurrent}
                                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${isCurrent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black shadow-lg hover:shadow-xl'}`}
                                    >
                                        {isCurrent ? 'Sedang Aktif' : 'Masuk / Kelola'}
                                    </button>
                                    
                                    <button 
                                        onClick={() => setManagingBranch(branch)}
                                        className="w-full py-2.5 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                        Kelola Akses
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                <div className="mt-12 bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-900 text-lg">Info Super Admin</h4>
                        <p className="text-blue-700 text-sm mt-1">
                            Saat Anda memilih cabang di atas, aplikasi akan memuat database khusus cabang tersebut. Staff biasa hanya bisa login ke cabang yang sedang Anda aktifkan ini. <br/>
                            <strong>Tips:</strong> Untuk menyiapkan tablet kasir cabang baru, login sebagai Owner, pilih cabang tersebut, lalu Logout. Tablet akan terkunci di cabang itu.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnerSettingsView;
