
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
    // Fix: Handled potential missing properties
    const { branches = [], addBranch = async () => {}, deleteBranch = async () => {}, switchBranch = async () => {}, storeProfile, setUsers = () => {} } = useAppContext();
    const [isAdding, setIsAdding] = useState(false);
    const [newBranch, setNewBranch] = useState({ id: '', name: '', address: '' });
    
    // Management Modal State
    const [managingBranch, setManagingBranch] = useState<{id: string, name: string} | null>(null);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const id = newBranch.id.toLowerCase