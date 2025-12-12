
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../types';
import type { AttendanceRecord } from '../types';

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const formatDate = (ts: number) => new Date(ts).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

// --- NOTIFICATION COMPONENT ---
const NotificationToast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-slide-in-up min-w-[300px] max-w-sm ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            <div className={`p-2 rounded-full bg-white/20`}>
                {type === 'success' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                )}
            </div>
            <div>
                <h4 className="font-bold text-lg">{type === 'success' ? 'Berhasil!' : 'Gagal!'}</h4>
                <p className="text-sm font-medium opacity-90">{message}</p>
            </div>
        </div>
    );
};

// --- CAMERA COMPONENT ---
const CameraCapture = ({ onCapture, onCancel }: { onCapture: (imgData: string, loc?: {lat: number, lng: number}) => void, onCancel: () => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [location, setLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
    const [locError, setLocError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera error:", err);
                setError("Gagal mengakses kamera. Izinkan akses kamera di browser.");
            }
        };

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                },
                (err) => {
                    console.warn("Location error:", err);
                    setLocError("Lokasi tidak terdeteksi. Pastikan GPS aktif.");
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        } else {
            setLocError("Browser tidak mendukung GPS.");
        }

        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, []);

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                context.font = "20px Arial";
                context.fillStyle = "white";
                context.fillText(new Date().toLocaleString('id-ID'), 20, canvas.height - 20);
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                onCapture(dataUrl, location);
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[90] flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-md relative">
                <div className="bg-gray-900 h-64 md:h-80 relative flex items-center justify-center overflow-hidden">
                    {error ? (
                        <div className="text-white text-center p-4">
                            <p className="text-red-400 font-bold mb-2">Error Kamera</p>
                            <p className="text-sm">{error}</p>
                            <button onClick={() => onCapture('', location)} className="mt-4 bg-gray-700 px-4 py-2 rounded text-sm">Lanjut Tanpa Foto</button>
                        </div>
                    ) : (
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                    <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${location ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                        {location ? "Lokasi Terkunci" : "Mencari Lokasi..."}
                    </div>
                </div>
                <div className="p-6 text-center">
                    <h3 className="font-bold text-lg mb-1">Ambil Foto Selfie</h3>
                    <p className="text-sm text-gray-500 mb-4">Pastikan wajah terlihat jelas.</p>
                    {locError && <p className="text-xs text-red-500 bg-red-50 p-2 rounded mb-4">{locError}</p>}
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">Batal</button>
                        {!error && (
                            <button onClick={takePhoto} disabled={!location && !locError} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed">
                                {location ? "📸 Absen Masuk" : "Tunggu GPS..."}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface AttendanceViewProps {
    isKioskMode?: boolean; // If true, only shows Terminal logic, no tabs
    onBack?: () => void;   // Only for Kiosk mode to return to login
}

const AttendanceView: React.FC<AttendanceViewProps> = ({ isKioskMode = false, onBack }) => {
    const { attendanceRecords, users, clockIn, clockOut, storeProfile, addUser, deleteUser, currentUser } = useAppContext();
    const [activeTab, setActiveTab] = useState<'terminal' | 'report' | 'employees'>('terminal');
    const [pin, setPin] = useState('');
    const [terminalUser, setTerminalUser] = useState<any>(null);
    const [showCamera, setShowCamera] = useState(false);
    const [employeeSearch, setEmployeeSearch] = useState('');
    
    // Notification State
    const [notify, setNotify] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    
    // Employee Management State
    const [newEmpName, setNewEmpName] = useState('');
    const [newEmpAttendancePin, setNewEmpAttendancePin] = useState('');
    const [newEmpLoginPin, setNewEmpLoginPin] = useState('');
    const [newEmpRole, setNewEmpRole] = useState('staff');

    // Force tab if Kiosk
    useEffect(() => {
        if (isKioskMode) setActiveTab('terminal');
        else setActiveTab('report'); // Default to report for Admin view
    }, [isKioskMode]);

    const filteredUsers = useMemo(() => {
        return users.filter(u => u.name.toLowerCase().includes(employeeSearch.toLowerCase()) || u.role.toLowerCase().includes(employeeSearch.toLowerCase()));
    }, [users, employeeSearch]);

    const showNotification = (message: string, type: 'success' | 'error') => {
        setNotify({ message, type });
    };

    // TERMINAL LOGIC: Check Attendance PIN
    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // COMPARE AGAINST ATTENDANCE PIN, NOT SYSTEM PIN
        const user = users.find(u => u.attendancePin === pin);
        if (user) {
            setTerminalUser(user);
            setPin('');
        } else {
            showNotification('PIN Absen Tidak Ditemukan.', 'error');
            setPin('');
        }
    };

    const handleClockIn = async (photoUrl: string, loc?: {lat: number, lng: number}) => {
        if (!terminalUser) return;
        try {
            await clockIn(terminalUser.id, terminalUser.name, photoUrl, loc);
            showNotification(`Selamat Pagi, ${terminalUser.name}! Absen Masuk berhasil.`, 'success');
            setShowCamera(false);
            setTerminalUser(null);
            if (isKioskMode && onBack) setTimeout(onBack, 2500); // Return to main screen after success with delay
        } catch (error) {
            showNotification('Gagal melakukan absen. Coba lagi.', 'error');
        }
    };

    const handleClockOut = async (recordId: string) => {
        if (confirm("Yakin ingin Absen Pulang?")) {
            try {
                await clockOut(recordId);
                showNotification("Hati-hati di jalan! Absen Pulang berhasil.", 'success');
                setTerminalUser(null);
                if (isKioskMode && onBack) setTimeout(onBack, 2500); // Return to main screen after success with delay
            } catch (error) {
                showNotification('Gagal absen pulang.', 'error');
            }
        }
    };

    // Calculate today's record for terminalUser
    const userTodayRecord = terminalUser 
        ? attendanceRecords.find(r => r.userId === terminalUser.id && r.date === new Date().toISOString().split('T')[0]) 
        : null;

    const handleAddEmployee = (e: React.FormEvent) => {
        e.preventDefault();
        if (newEmpName && newEmpAttendancePin) {
            // Check if PIN exists
            if (users.some(u => u.attendancePin === newEmpAttendancePin)) {
                showNotification("PIN Absen ini sudah digunakan. Gunakan PIN lain.", 'error');
                return;
            }

            addUser({
                id: Date.now().toString(),
                name: newEmpName,
                attendancePin: newEmpAttendancePin, // REQUIRED for everyone
                pin: newEmpLoginPin, // Optional / Required for access roles
                role: newEmpRole as any
            });
            setNewEmpName('');
            setNewEmpAttendancePin('');
            setNewEmpLoginPin('');
            showNotification("Karyawan berhasil ditambahkan.", 'success');
        } else {
            showNotification("Lengkapi Nama dan PIN Absen.", 'error');
        }
    };

    const theme = storeProfile.themeColor || 'orange';

    return (
        <div className="flex flex-col h-full bg-gray-50 relative">
            {/* GLOBAL TOAST */}
            {notify && <NotificationToast message={notify.message} type={notify.type} onClose={() => setNotify(null)} />}

            {showCamera && <CameraCapture onCapture={handleClockIn} onCancel={() => setShowCamera(false)} />}

            {/* Header - Different for Kiosk vs Admin */}
            {!isKioskMode ? (
                <div className="bg-white border-b px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-10 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Manajemen Absensi</h1>
                        <p className="text-sm text-gray-500 font-medium">Laporan & Data Karyawan</p>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                        <button onClick={() => setActiveTab('report')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'report' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Laporan</button>
                        <button onClick={() => setActiveTab('employees')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'employees' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Karyawan</button>
                    </div>
                </div>
            ) : (
                <div className="p-4 flex items-center justify-between bg-white shadow-sm z-10">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-600 font-bold hover:bg-gray-100 px-3 py-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                        Kembali
                    </button>
                    <span className="font-bold text-gray-800">Terminal Absensi</span>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-6">
                
                {/* MODE KIOSK: Terminal Only */}
                {activeTab === 'terminal' && (
                    <div className="max-w-md mx-auto mt-4 transition-all">
                        {!terminalUser ? (
                            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 text-center animate-scale-in">
                                <div className={`w-20 h-20 bg-${theme}-100 text-${theme}-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 mb-2">Siapa Kamu?</h2>
                                <p className="text-gray-500 mb-8 text-sm">Masukkan <strong>PIN Absensi</strong> Anda.</p>
                                
                                <form onSubmit={handlePinSubmit}>
                                    <input 
                                        type="password" 
                                        value={pin} 
                                        onChange={e => setPin(e.target.value.replace(/\D/g,''))} 
                                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-center text-3xl font-bold tracking-[0.5em] focus:bg-white focus:border-black outline-none transition-all mb-6" 
                                        placeholder="••••" 
                                        autoFocus
                                        inputMode="numeric"
                                        maxLength={6}
                                    />
                                    <button type="submit" disabled={pin.length < 4} className={`w-full bg-${theme}-600 text-white font-bold py-4 rounded-2xl hover:bg-${theme}-700 shadow-lg transition-all disabled:opacity-50`}>Verifikasi</button>
                                </form>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl shadow-xl overflow-hidden animate-fade-in border border-gray-100">
                                <div className={`bg-${theme}-600 p-6 text-white text-center relative overflow-hidden`}>
                                    <div className="absolute top-0 left-0 w-full h-full bg-black/10"></div>
                                    <h2 className="text-2xl font-black relative z-10">Halo, {terminalUser.name}!</h2>
                                    <p className="opacity-90 text-xs font-bold uppercase tracking-wider relative z-10 mt-1">{terminalUser.role}</p>
                                </div>
                                <div className="p-8">
                                    {userTodayRecord ? (
                                        userTodayRecord.clockOutTime ? (
                                            <div className="text-center py-8">
                                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                </div>
                                                <div className="text-gray-800 font-bold text-xl mb-2">Shift Selesai</div>
                                                <p className="text-gray-500 text-sm">Terima kasih atas kerja kerasmu hari ini!</p>
                                                <button onClick={() => setTerminalUser(null)} className="mt-8 text-gray-400 hover:text-gray-600 font-bold text-sm bg-gray-50 px-6 py-2 rounded-full">Kembali</button>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <div className="mb-6">
                                                    <p className="text-gray-400 text-xs uppercase font-bold tracking-wide mb-1">Jam Masuk</p>
                                                    <span className="font-mono text-3xl font-bold text-gray-900">{formatTime(userTodayRecord.clockInTime)}</span>
                                                </div>
                                                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg font-bold text-sm inline-block mb-8 flex items-center justify-center gap-2 mx-auto w-fit">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                    Status: Sedang Bekerja
                                                </div>
                                                <button onClick={() => handleClockOut(userTodayRecord.id)} className="w-full bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 shadow-lg mb-3">Absen Pulang</button>
                                                <button onClick={() => setTerminalUser(null)} className="w-full bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50">Batal</button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="text-center">
                                            <p className="text-gray-500 mb-6 font-medium">Kamu belum absen hari ini.</p>
                                            <button onClick={() => setShowCamera(true)} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 shadow-lg mb-3 flex items-center justify-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                                                Foto Selfie & Masuk
                                            </button>
                                            <button onClick={() => setTerminalUser(null)} className="w-full bg-white border border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50">Batal</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* MODE ADMIN: Laporan & Karyawan */}
                {!isKioskMode && (
                    <>
                    {activeTab === 'report' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-700">Log Kehadiran</h3>
                                <button className="text-xs text-blue-600 font-bold hover:underline">Export Data</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3">Nama</th>
                                            <th className="px-6 py-3">Tanggal</th>
                                            <th className="px-6 py-3">Masuk</th>
                                            <th className="px-6 py-3">Pulang</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3 text-right">Lokasi/Foto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {attendanceRecords.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Belum ada data absensi.</td></tr>}
                                        {attendanceRecords.slice().sort((a,b) => b.clockInTime - a.clockInTime).map(record => (
                                            <tr key={record.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-bold text-gray-900">{record.userName}</td>
                                                <td className="px-6 py-4 text-gray-600">{formatDate(record.clockInTime)}</td>
                                                <td className="px-6 py-4 font-mono text-green-600 font-bold">{formatTime(record.clockInTime)}</td>
                                                <td className="px-6 py-4 font-mono text-red-600 font-bold">{record.clockOutTime ? formatTime(record.clockOutTime) : '-'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${record.clockOutTime ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700 animate-pulse'}`}>
                                                        {record.clockOutTime ? 'Selesai' : 'Aktif'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2 items-center">
                                                    {record.location && (
                                                        <a href={`https://www.google.com/maps/search/?api=1&query=${record.location.lat},${record.location.lng}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500" title="Lihat Lokasi">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                                        </a>
                                                    )}
                                                    {record.photoUrl ? (
                                                        <div className="relative group inline-block">
                                                            <img src={record.photoUrl} alt="Bukti" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm cursor-pointer" />
                                                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-20">
                                                                <img src={record.photoUrl} className="w-48 rounded-lg shadow-2xl border-4 border-white" />
                                                            </div>
                                                        </div>
                                                    ) : <span className="text-xs text-gray-400">No Photo</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'employees' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                                <h3 className="font-bold text-lg mb-4 text-gray-800">Registrasi Karyawan</h3>
                                <form onSubmit={handleAddEmployee} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama</label>
                                        <input required value={newEmpName} onChange={e => setNewEmpName(e.target.value)} className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none focus:border-black transition-colors" placeholder="Nama Karyawan" />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PIN Absen (Wajib)</label>
                                        <input required type="number" value={newEmpAttendancePin} onChange={e => setNewEmpAttendancePin(e.target.value)} className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none focus:border-black transition-colors font-mono font-bold" placeholder="Utk Clock In/Out" maxLength={6} />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PIN Login Sistem (Opsional)</label>
                                        <input type="number" value={newEmpLoginPin} onChange={e => setNewEmpLoginPin(e.target.value)} className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none focus:border-black transition-colors font-mono font-bold" placeholder="Utk Kasir/Admin" maxLength={6} />
                                        <p className="text-[10px] text-gray-400 mt-1">Hanya diisi jika karyawan butuh akses ke aplikasi.</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role / Jabatan</label>
                                        <select value={newEmpRole} onChange={e => setNewEmpRole(e.target.value)} className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none bg-white">
                                            <option value="staff">Staff Umum (Hanya Absen)</option>
                                            <option value="cashier">Kasir (Akses POS)</option>
                                            <option value="kitchen">Dapur (Akses Kitchen)</option>
                                            <option value="admin">Admin (Akses Penuh)</option>
                                        </select>
                                    </div>
                                    <button type="submit" className="w-full bg-black text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 shadow-lg">Simpan Data</button>
                                </form>
                            </div>

                            <div className="md:col-span-2 flex flex-col h-full">
                                <div className="mb-4">
                                    <input type="text" placeholder="Cari nama atau divisi..." value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} className="w-full border-2 border-gray-200 p-3 rounded-xl outline-none focus:border-black" />
                                </div>
                                <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-2">
                                    {filteredUsers.length === 0 && <p className="text-gray-400 text-center py-10">Tidak ada karyawan ditemukan.</p>}
                                    {filteredUsers.map(u => (
                                        <div key={u.id} className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:shadow-md transition-shadow group gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm ${u.role === 'admin' ? 'bg-purple-600' : u.role === 'kitchen' ? 'bg-orange-500' : u.role === 'cashier' ? 'bg-blue-500' : 'bg-gray-500'}`}>{u.name.charAt(0)}</div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900">{u.name}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span className="uppercase font-bold tracking-wide">{u.role}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-1 text-right min-w-[120px]">
                                                <div className="text-xs">
                                                    <span className="text-gray-400 mr-2">PIN Absen:</span>
                                                    <span className="font-mono font-bold bg-gray-100 px-1 rounded">{u.attendancePin}</span>
                                                </div>
                                                {u.pin && (
                                                    <div className="text-xs">
                                                        <span className="text-gray-400 mr-2">PIN Login:</span>
                                                        <span className="font-mono font-bold bg-blue-50 text-blue-600 px-1 rounded">{u.pin}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {u.role !== 'owner' && (
                                                <button onClick={() => { if(confirm('Hapus karyawan ini? Data absensi tetap tersimpan.')) deleteUser(u.id); }} className="text-red-400 hover:text-red-600 font-bold text-xs bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 self-end sm:self-center">Hapus</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AttendanceView;
