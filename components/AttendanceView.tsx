
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../types';
import type { AttendanceRecord } from '../types';
import { uploadSelfieToCloud } from '../services/firebase';

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
const formatDate = (ts: number) => new Date(ts).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

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

const AttendanceView: React.FC<{ isKioskMode?: boolean; onBack?: () => void }> = ({ isKioskMode = false, onBack }) => {
    const { attendanceRecords, users, clockIn, clockOut, storeProfile, currentUser } = useAppContext();
    const [activeTab, setActiveTab] = useState<'terminal' | 'report' | 'employees'>('terminal');
    const [isProcessing, setIsProcessing] = useState(false);
    const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null);
    const [notify, setNotify] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    
    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    useEffect(() => {
        if (isKioskMode) setActiveTab('terminal');
        else setActiveTab('report');
    }, [isKioskMode]);

    useEffect(() => {
        let stream: MediaStream | null = null;
        if (activeTab === 'terminal' && !successRecord) {
            const startCamera = async () => {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } catch (err) {
                    setCameraError("Kamera tidak dapat diakses.");
                }
            };
            startCamera();
        }
        return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
    }, [activeTab, successRecord]);

    const showNotification = (message: string, type: 'success' | 'error') => setNotify({ message, type });

    const dataURLtoBlob = (dataurl: string) => {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){ u8arr[n] = bstr.charCodeAt(n); }
        return new Blob([u8arr], {type:mime});
    }

    const processClockIn = async () => {
        if (!currentUser) return;
        setIsProcessing(true);
        try {
            // 1. Ambil Foto
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas) throw new Error("Hardware failure");
            
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context?.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Kompres gambar ke ~1MB atau kurang
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const blob = dataURLtoBlob(compressedDataUrl);
            
            // 2. Ambil Geolocation
            const pos: any = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });
            const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            
            // 3. Upload ke Storage
            const fileName = `${currentUser.id}_${Date.now()}.jpg`;
            const publicUrl = await uploadSelfieToCloud(blob, fileName);
            if (!publicUrl) throw new Error("Upload failed");

            // 4. Simpan ke Database
            await clockIn(currentUser.id, currentUser.name, publicUrl, location);
            
            // Tampilkan layar sukses
            const newRecord: AttendanceRecord = {
                id: Date.now().toString(),
                userId: currentUser.id,
                userName: currentUser.name,
                date: new Date().toISOString().split('T')[0],
                clockInTime: Date.now(),
                photoUrl: publicUrl,
                status: 'Present',
                branchId: storeProfile.branchId,
                location
            };
            setSuccessRecord(newRecord);
        } catch (err: any) {
            showNotification(err.message || "Gagal melakukan absensi.", 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const theme = storeProfile.themeColor || 'orange';

    return (
        <div className="flex flex-col h-full bg-gray-50 relative font-sans">
            {notify && <NotificationToast message={notify.message} type={notify.type} onClose={() => setNotify(null)} />}

            {/* Header Admin Only */}
            {!isKioskMode && (
                <div className="bg-white border-b px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-10 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase italic">Manajemen Absensi</h1>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                        <button onClick={() => setActiveTab('report')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'report' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>LAPORAN</button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                {/* TERMINAL ABSENSI */}
                {activeTab === 'terminal' && !successRecord && (
                    <div className="max-w-md mx-auto space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 animate-scale-in">
                            <div className={`bg-${theme}-600 p-6 text-white text-center`}>
                                <h2 className="text-2xl font-black italic tracking-tighter">TERMINAL ABSENSI</h2>
                                <p className="text-xs font-bold opacity-80 uppercase tracking-widest mt-1">{currentUser?.name} ({currentUser?.role})</p>
                            </div>
                            
                            <div className="p-8">
                                <div className="bg-gray-900 aspect-[3/4] rounded-3xl overflow-hidden relative border-4 border-gray-50 shadow-inner mb-8">
                                    {cameraError ? (
                                        <div className="flex flex-col items-center justify-center h-full text-red-400 p-6 text-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            <p className="font-bold">{cameraError}</p>
                                        </div>
                                    ) : (
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                    )}
                                    <canvas ref={canvasRef} className="hidden" />
                                    <div className="absolute bottom-4 left-0 w-full text-center">
                                        <span className="bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">Posisikan Wajah di Tengah</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => { alert("Mohon tunjukkan wajah Anda ke kamera."); processClockIn(); }}
                                    disabled={isProcessing || !!cameraError}
                                    className={`w-full py-5 rounded-[2rem] bg-${theme}-600 text-white font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-gray-300`}
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>MEMPROSES...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            ABSEN SEKARANG
                                        </>
                                    )}
                                </button>
                                {onBack && <button onClick={onBack} className="w-full mt-4 text-gray-400 font-bold uppercase tracking-widest text-sm hover:text-gray-600 transition-colors">Batal</button>}
                            </div>
                        </div>
                    </div>
                )}

                {/* LAYAR SUKSES */}
                {successRecord && (
                    <div className="max-w-md mx-auto animate-scale-in">
                        <div className="bg-white rounded-[3rem] shadow-2xl p-10 text-center border border-gray-100">
                             <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                             </div>
                             <h2 className="text-3xl font-black text-gray-900 mb-2 italic">ABSEN BERHASIL!</h2>
                             <p className="text-gray-500 font-medium mb-8">Terima kasih atas dedikasinya, selamat bertugas!</p>
                             
                             <div className="grid grid-cols-2 gap-4 mb-8">
                                 <div className="rounded-3xl overflow-hidden border-4 border-gray-50 shadow-md">
                                     <img src={successRecord.photoUrl} className="w-full aspect-[3/4] object-cover" />
                                 </div>
                                 <div className="bg-gray-50 rounded-3xl p-4 flex flex-col justify-center text-left border border-gray-100">
                                     <div className="mb-3">
                                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Waktu</p>
                                         <p className="font-black text-gray-800">{formatTime(successRecord.clockInTime)}</p>
                                     </div>
                                     <div>
                                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lokasi</p>
                                         <p className="font-bold text-[11px] text-gray-800 line-clamp-2">GPS Aktif & Terkunci</p>
                                     </div>
                                 </div>
                             </div>

                             <button onClick={onBack} className="w-full bg-gray-900 text-white font-black py-5 rounded-[2rem] hover:bg-black shadow-xl transition-all active:scale-95 uppercase tracking-widest">KEMBALI KE BERANDA</button>
                        </div>
                    </div>
                )}

                {/* REPORT TAB ADMIN */}
                {!isKioskMode && activeTab === 'report' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Nama</th>
                                        <th className="px-6 py-4">Tanggal</th>
                                        <th className="px-6 py-4">Jam</th>
                                        <th className="px-6 py-4">Lokasi / Foto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {attendanceRecords.length === 0 && <tr><td colSpan={4} className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest">Belum ada data absensi</td></tr>}
                                    {attendanceRecords.map(record => (
                                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{record.userName}</td>
                                            <td className="px-6 py-4 text-gray-500">{formatDate(record.clockInTime)}</td>
                                            <td className="px-6 py-4 font-black text-blue-600">{formatTime(record.clockInTime)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {record.photoUrl && <img src={record.photoUrl} className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm" />}
                                                    {record.location && (
                                                        <a href={`https://www.google.com/maps?q=${record.location.lat},${record.location.lng}`} target="_blank" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceView;
