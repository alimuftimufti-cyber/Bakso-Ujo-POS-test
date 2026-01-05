
import React, { useState } from 'react';
import { useAppContext } from '../types';
import type { User, Branch } from '../types';

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
            updatedUsers.push({ id: `admin-${Date.now()}`, name: `Admin ${branchName}`, role: 'admin', pin: adminPin, attendancePin: '1111' } as any);
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
    // Fix: Handled potential missing properties
    const { branches = [], addBranch = async () => {}, deleteBranch = async () => {}, switchBranch = async () => {}, storeProfile, setUsers = () => {} } = useAppContext();
    const [isAdding, setIsAdding] = useState(false);
    const [newBranch, setNewBranch] = useState({ id: '', name: '', address: '' });
    
    // Management Modal State
    const [managingBranch, setManagingBranch] = useState<{id: string, name: string} | null>(null);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const id = newBranch.id.toLowerCase();
        if (!id || !newBranch.name) return;
        
        addBranch({ ...newBranch, id } as Branch);
        setNewBranch({ id: '', name: '', address: '' });
        setIsAdding(false);
    };

    // FIX: Added return statement to resolve "Type '() => void' is not assignable to type 'FC'" error.
    return (
        <div className="p-8 h-full overflow-y-auto">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                <span className="w-2 h-8 bg-indigo-600 rounded-full"></span>
                Manajemen Cabang (Multi-Branch)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map(branch => (
                    <div key={branch.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-lg transition-all">
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900">{branch.name}</h3>
                            <p className="text-xs text-gray-400 font-mono mb-2">ID: {branch.id}</p>
                            <p className="text-sm text-gray-500 line-clamp-2">{branch.address || 'Alamat belum diatur'}</p>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button 
                                onClick={() => setManagingBranch(branch)}
                                className="flex-1 bg-gray-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-black transition-all"
                            >
                                Kelola Akses
                            </button>
                            <button 
                                onClick={() => { if(confirm(`Hapus cabang ${branch.name}?`)) deleteBranch(branch.id); }}
                                className="px-3 py-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                ))}

                <button 
                    onClick={() => setIsAdding(true)}
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all min-h-[180px] bg-gray-50/50 hover:bg-indigo-50/30"
                >
                    <span className="text-4xl font-light mb-2">+</span>
                    <span className="font-black text-xs uppercase tracking-widest">Tambah Cabang Baru</span>
                </button>
            </div>

            {/* Modal Tambah Cabang */}
            {isAdding && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
                    <form onSubmit={handleAdd} className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-scale-in">
                        <h3 className="text-xl font-black mb-6 uppercase italic">Daftarkan Cabang</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">ID Cabang (Unik)</label>
                                <input value={newBranch.id} onChange={e => setNewBranch({...newBranch, id: e.target.value.replace(/\s+/g, '-').toLowerCase()})} placeholder="contoh: cabang-bogor" className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 font-mono text-sm" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Nama Cabang</label>
                                <input value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} placeholder="Nama Lokasi" className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 font-bold" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Alamat</label>
                                <textarea value={newBranch.address} onChange={e => setNewBranch({...newBranch, address: e.target.value})} placeholder="Alamat lengkap..." className="w-full border-2 border-gray-100 rounded-xl p-3 outline-none focus:border-indigo-500 h-24 text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 font-bold text-gray-500 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all">BATAL</button>
                            <button type="submit" className="flex-1 py-3 font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-xl transition-all">DAFTARKAN</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal Kelola Akses */}
            {managingBranch && (
                <AccessManagementModal 
                    branchId={managingBranch.id} 
                    branchName={managingBranch.name} 
                    onClose={() => setManagingBranch(null)} 
                    onActiveBranchUpdate={managingBranch.id === storeProfile.branchId ? setUsers : undefined}
                />
            )}
        </div>
    );
};

export default OwnerSettingsView;
