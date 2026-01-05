
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../types';
import type { AttendanceRecord, AttendanceStatus, OfficeSettings } from '../types';
import { uploadSelfieToCloud, subscribeToAttendance } from '../services/firebase';

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const formatDate = (ts: number) => new Date(ts).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

const StatCard = ({ title, value, color, icon }: any) => (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 w-16 h-16 bg-${color}-500/5 rounded-bl-[4rem] group-hover:scale-110 transition-transform`}></div>
        <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 bg-${color}-50 text-${color}-600 rounded-lg`}>{icon}</div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</h3>
        </div>
        <p className={`text-3xl font-black text-${color}-600 tracking-tight`}>{value}</p>
    </div>
);

const AttendanceView: React.FC<{ isKioskMode?: boolean; onBack?: () => void }> = ({ isKioskMode = false, onBack }) => {
    const { attendanceRecords: initialRecords, users, clockIn, storeProfile, currentUser, officeSettings, updateOfficeSettings } = useAppContext();
    const [activeTab, setActiveTab] = useState<'terminal' | 'report' | 'map' | 'settings'>('report');
    const [liveRecords, setLiveRecords] = useState<AttendanceRecord[]>(initialRecords);
    
    // Filters
    const [filterName, setFilterName] = useState('');
    const [filterDept, setFilterDept] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    
    // UI States
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null);
    
    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Settings Form
    const [editSettings, setEditSettings] = useState<OfficeSettings | null>(officeSettings);

    useEffect(() => {
        if (isKioskMode) setActiveTab('terminal');
        const unsub = subscribeToAttendance(storeProfile.branchId, filterDate, (recs) => setLiveRecords(recs));
        return () => unsub();
    }, [isKioskMode, filterDate]);

    // Statistics Calculation
    const stats = useMemo(() => {
        const totalStaff = users.length;
        const present = liveRecords.filter(r => r.status === 'Hadir' || r.status === 'Terlambat').length;
        const late = liveRecords.filter(r => r.status === 'Terlambat').length;
        const permission = liveRecords.filter(r => r.status === 'Izin' || r.status === 'Sakit').length;
        const earlyLeave = liveRecords.filter(r => r.status === 'Pulang Awal').length;
        return { totalStaff, present, absent: totalStaff - present - permission, late, permission, earlyLeave };
    }, [liveRecords, users]);

    // Filter Logic
    const filteredRecords = useMemo(() => {
        return liveRecords.filter(r => {
            const matchName = r.userName.toLowerCase().includes(filterName.toLowerCase());
            const matchDept = filterDept === 'all' || r.department === filterDept;
            const matchStatus = filterStatus === 'all' || r.status === filterStatus;
            return matchName && matchDept && matchStatus;
        });
    }, [liveRecords, filterName, filterDept, filterStatus]);

    const departments = useMemo(() => Array.from(new Set(users.map(u => u.department).filter(Boolean))), [users]);

    // Camera Logic for Terminal
    useEffect(() => {
        let stream: MediaStream | null = null;
        if (activeTab === 'terminal') {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
                .catch(() => setCameraError("Kamera tidak dapat diakses."));
        }
        return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
    }, [activeTab]);

    const processClockIn = async () => {
        if (!currentUser) return;
        setIsProcessing(true);
        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas) throw new Error("Hardware failure");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0);
            const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.8));
            const pos: any = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
            const publicUrl = await uploadSelfieToCloud(blob, `${currentUser.id}_${Date.now()}.jpg`);
            await clockIn(currentUser.id, currentUser.name, publicUrl || undefined, { lat: pos.coords.latitude, lng: pos.coords.longitude });
            alert("Absensi Berhasil!");
            onBack?.();
        } catch (err: any) {
            alert(err.message || "Gagal absen.");
        } finally { setIsProcessing(false); }
    };

    const theme = storeProfile.themeColor || 'orange';

    return (
        <div className="flex flex-col h-full bg-gray-50 font-sans overflow-hidden">
            {/* PHOTO ZOOM MODAL */}
            {showPhotoModal && (
                <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowPhotoModal(null)}>
                    <img src={showPhotoModal} className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl animate-scale-in" />
                    <button className="absolute top-6 right-6 text-white text-4xl">&times;</button>
                </div>
            )}

            {/* HEADER & TABS */}
            {!isKioskMode && (
                <div className="bg-white border-b px-8 py-6 flex flex-col xl:flex-row justify-between items-center gap-6 sticky top-0 z-50">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">Monitoring Absensi Live</h1>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Real-time Staff Analytics</p>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-2xl w-full xl:w-auto overflow-x-auto">
                        <button onClick={() => setActiveTab('report')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'report' ? 'bg-white shadow-lg text-gray-900' : 'text-gray-500'}`}>DASHBOARD</button>
                        <button onClick={() => setActiveTab('map')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'map' ? 'bg-white shadow-lg text-gray-900' : 'text-gray-500'}`}>PETA SEBARAN</button>
                        <button onClick={() => setActiveTab('settings')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'settings' ? 'bg-white shadow-lg text-gray-900' : 'text-gray-500'}`}>PENGATURAN</button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 lg:p-8 no-scrollbar">
                {/* KPI CARDS */}
                {!isKioskMode && activeTab !== 'settings' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8 animate-fade-in">
                        <StatCard title="Total Staff" value={stats.totalStaff} color="indigo" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
                        <StatCard title="Hadir" value={stats.present} color="green" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>} />
                        <StatCard title="Belum Absen" value={stats.absent} color="slate" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                        <StatCard title="Terlambat" value={stats.late} color="red" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>} />
                        <StatCard title="Izin/Sakit" value={stats.permission} color="orange" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
                        <StatCard title="Pulang Awal" value={stats.earlyLeave} color="blue" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>} />
                    </div>
                )}

                {/* FILTER PANEL */}
                {!isKioskMode && activeTab === 'report' && (
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 mb-6 flex flex-col xl:flex-row gap-4 items-end animate-fade-in shadow-sm">
                        <div className="flex-1 w-full">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Pencarian Staff</label>
                            <input type="text" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Cari nama..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-bold" />
                        </div>
                        <div className="w-full xl:w-48">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Filter Dept</label>
                            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 outline-none font-bold">
                                <option value="all">Semua</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div className="w-full xl:w-48">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Filter Status</label>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 outline-none font-bold">
                                <option value="all">Semua Status</option>
                                <option value="Hadir">Hadir</option>
                                <option value="Terlambat">Terlambat</option>
                                <option value="Izin">Izin / Sakit</option>
                            </select>
                        </div>
                        <div className="w-full xl:w-48">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Pilih Tanggal</label>
                            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 outline-none font-bold uppercase" />
                        </div>
                    </div>
                )}

                {/* MAIN CONTENT: REPORT TABLE */}
                {activeTab === 'report' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-scale-in">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Profil Pegawai</th>
                                        <th className="px-6 py-4">Jam Masuk</th>
                                        <th className="px-6 py-4">Lokasi (Geo)</th>
                                        <th className="px-6 py-4">Bukti Foto</th>
                                        <th className="px-6 py-4">Status Device</th>
                                        <th className="px-6 py-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredRecords.length === 0 && (
                                        <tr><td colSpan={6} className="text-center py-24 text-gray-400 font-bold uppercase tracking-widest">Tidak ada data ditemukan</td></tr>
                                    )}
                                    {filteredRecords.map(record => (
                                        <React.Fragment key={record.id}>
                                            <tr className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => setExpandedRow(expandedRow === record.id ? null : record.id)}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-lg shadow-inner">
                                                            {record.userName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-900 text-base">{record.userName}</p>
                                                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{record.department}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-gray-800 text-lg">{formatTime(record.clockInTime)}</span>
                                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md inline-block w-fit mt-1 shadow-sm ${record.status === 'Terlambat' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-green-100 text-green-600 border border-green-200'}`}>
                                                            {record.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <div className="flex flex-col">
                                                        <p className="font-bold text-gray-700 truncate">{record.locationName || 'Melacak alamat...'}</p>
                                                        <p className={`text-[10px] font-black uppercase flex items-center gap-1 mt-1 ${record.isWithinRadius ? 'text-green-600' : 'text-red-500'}`}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                                                            {record.distanceMeters}m dari Kantor
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {record.photoUrl ? (
                                                        <button onClick={(e) => { e.stopPropagation(); setShowPhotoModal(record.photoUrl!); }} className="relative group/photo overflow-hidden rounded-xl border-2 border-white shadow-md">
                                                            <img src={record.photoUrl} className="w-12 h-12 object-cover group-hover/photo:scale-110 transition-transform" />
                                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/photo:opacity-100 flex items-center justify-center text-white transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg></div>
                                                        </button>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {record.deviceInfo?.includes('Mobile') ? (
                                                            <div className="p-2 bg-slate-100 rounded-lg text-slate-500" title="Handphone"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
                                                        ) : (
                                                            <div className="p-2 bg-slate-100 rounded-lg text-slate-500" title="Komputer / Laptop"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 21h6l-.75-4M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
                                                        )}
                                                        <span className="text-[10px] font-bold text-gray-400 truncate max-w-[100px]">{record.ipAddress}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); window.open(`https://www.google.com/maps?q=${record.location?.lat},${record.location?.lng}`); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Lihat di Peta"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
                                                        <button className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm" title="Tandai / Flag"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 01-2 2zm9-13.5V9" /></svg></button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* ACCORDION: AUDIT TRAIL */}
                                            {expandedRow === record.id && (
                                                <tr className="bg-slate-50 border-l-4 border-l-indigo-500 animate-fade-in">
                                                    <td colSpan={6} className="px-12 py-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                            <div className="space-y-3">
                                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">Detail Audit Keamanan</h4>
                                                                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">IP Address:</span><span className="font-mono text-xs font-bold text-gray-800">{record.ipAddress || '-'}</span></div>
                                                                <div className="flex flex-col"><span className="text-gray-500 font-medium">User Agent:</span><span className="text-[10px] font-bold text-gray-400 break-all bg-white p-2 rounded-lg border mt-1 leading-relaxed">{record.deviceInfo || '-'}</span></div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">Aktivitas Sesi</h4>
                                                                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Jam Keluar:</span><span className="font-bold text-gray-800">{record.clockOutTime ? formatTime(record.clockOutTime) : 'Masih Bekerja'}</span></div>
                                                                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Durasi Kerja:</span><span className="font-black text-blue-600">{record.clockOutTime ? `${Math.floor((record.clockOutTime - record.clockInTime) / 3600000)} Jam` : 'Sedang Berjalan...'}</span></div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">Analisis Lokasi</h4>
                                                                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Status Geofence:</span><span className={`font-black uppercase text-[10px] ${record.isWithinRadius ? 'text-green-600' : 'text-red-500'}`}>{record.isWithinRadius ? 'VALID (INSIDE)' : 'INVALID (OUTSIDE)'}</span></div>
                                                                <div className="flex justify-between items-center"><span className="text-gray-500 font-medium">Koordinat:</span><span className="font-mono text-[10px] font-bold text-gray-800">{record.location?.lat.toFixed(4)}, {record.location?.lng.toFixed(4)}</span></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB: MAP VIEW */}
                {activeTab === 'map' && (
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden h-[600px] flex flex-col animate-scale-in">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-black text-gray-800 uppercase tracking-tighter italic">Live Tracking Area Kantor</h3>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500"></span><span className="text-[10px] font-bold text-gray-400 uppercase">Dalam Radius</span></div>
                                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span><span className="text-[10px] font-bold text-gray-400 uppercase">Luar Radius</span></div>
                            </div>
                        </div>
                        <div className="flex-1 relative bg-slate-100">
                            {/* Peta menggunakan OpenStreetMap Leaflet via CDN / Iframe untuk kompatibilitas tinggi */}
                            <iframe 
                                title="Attendance Map"
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                scrolling="no" 
                                marginHeight={0} 
                                marginWidth={0} 
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${(officeSettings?.longitude || 106.845) - 0.01}%2C${(officeSettings?.latitude || -6.2) - 0.01}%2C${(officeSettings?.longitude || 106.845) + 0.01}%2C${(officeSettings?.latitude || -6.2) + 0.01}&layer=mapnik`}
                            />
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-4 rounded-2xl shadow-2xl border border-white max-w-xs">
                                <h4 className="font-black text-gray-900 text-xs uppercase mb-2">Sebaran Karyawan</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                                    {liveRecords.filter(r => r.location).map(r => (
                                        <div key={r.id} className="flex items-center gap-2 text-[10px] font-bold">
                                            <span className={`w-2 h-2 rounded-full ${r.isWithinRadius ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            <span className="text-gray-700">{r.userName}</span>
                                            <span className="text-gray-300 ml-auto">{formatTime(r.clockInTime)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: SETTINGS */}
                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto animate-scale-in">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-10">
                            <h3 className="text-2xl font-black mb-8 italic uppercase tracking-tighter flex items-center gap-3">
                                <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                                Pengaturan Kantor
                            </h3>
                            <form onSubmit={async (e) => { e.preventDefault(); if(editSettings) await updateOfficeSettings(editSettings); alert("Pengaturan disimpan!"); }} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Nama Area / Kantor</label>
                                        <input required value={editSettings?.officeName || ''} onChange={e => setEditSettings(prev => ({...prev!, officeName: e.target.value}))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Latitude Kantor</label>
                                        <input required type="number" step="any" value={editSettings?.latitude || 0} onChange={e => setEditSettings(prev => ({...prev!, latitude: parseFloat(e.target.value)}))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Longitude Kantor</label>
                                        <input required type="number" step="any" value={editSettings?.longitude || 0} onChange={e => setEditSettings(prev => ({...prev!, longitude: parseFloat(e.target.value)}))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Radius Toleransi (KM)</label>
                                        <input required type="number" step="0.01" value={editSettings?.radiusKm || 0.05} onChange={e => setEditSettings(prev => ({...prev!, radiusKm: parseFloat(e.target.value)}))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-500" />
                                        <p className="text-[10px] text-gray-400 mt-2 px-1">Gunakan 0.05 untuk 50 meter.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Jam Masuk</label>
                                            <input required type="time" value={editSettings?.startTime || '08:00'} onChange={e => setEditSettings(prev => ({...prev!, startTime: e.target.value}))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-500 uppercase" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2 block">Jam Pulang</label>
                                            <input required type="time" value={editSettings?.endTime || '17:00'} onChange={e => setEditSettings(prev => ({...prev!, endTime: e.target.value}))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-indigo-500 uppercase" />
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-gray-900 text-white font-black py-5 rounded-[2.5rem] shadow-2xl hover:bg-black transition-all active:scale-95 uppercase tracking-widest mt-4">Simpan Konfigurasi</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* KIOSK / TERMINAL MODE */}
                {activeTab === 'terminal' && (
                    <div className="max-w-md mx-auto space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 animate-scale-in">
                            <div className={`bg-${theme}-600 p-8 text-white text-center shadow-lg`}>
                                <h2 className="text-3xl font-black italic tracking-tighter uppercase">Terminal Absensi</h2>
                                <p className="text-xs font-bold opacity-80 uppercase tracking-widest mt-2">{currentUser?.name} ({currentUser?.role})</p>
                            </div>
                            <div className="p-10">
                                <div className="bg-gray-900 aspect-[3/4] rounded-[2rem] overflow-hidden relative border-8 border-gray-50 shadow-inner mb-8 ring-1 ring-gray-100">
                                    {cameraError ? (
                                        <div className="flex flex-col items-center justify-center h-full text-red-400 p-6 text-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            <p className="font-black uppercase tracking-widest">{cameraError}</p>
                                        </div>
                                    ) : (
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                    )}
                                    <canvas ref={canvasRef} className="hidden" />
                                    <div className="absolute bottom-6 left-0 w-full text-center px-6">
                                        <span className="bg-black/60 backdrop-blur-xl text-white text-[10px] px-6 py-2.5 rounded-full font-black uppercase tracking-[0.2em] border border-white/20 shadow-2xl">Posisikan Wajah & Lokasi Aktif</span>
                                    </div>
                                </div>
                                <button onClick={processClockIn} disabled={isProcessing || !!cameraError} className={`w-full py-6 rounded-[2.5rem] bg-${theme}-600 text-white font-black text-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 disabled:bg-gray-300 border-b-8 border-black/10`}>
                                    {isProcessing ? (
                                        <><div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div><span>MEMPROSES...</span></>
                                    ) : (
                                        <><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>ABSEN SEKARANG</>
                                    )}
                                </button>
                                {onBack && <button onClick={onBack} className="w-full mt-6 text-gray-400 font-black uppercase tracking-[0.2em] text-xs hover:text-gray-600 transition-colors">Batalkan</button>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceView;
