
import React, { useState } from 'react';
// FIX: Added missing imports
import { useAppContext, Table, StoreProfile } from '../types';

const generatePrintLayout = (tables: Table[], profile: StoreProfile) => {
    const baseUrl = window.location.origin;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
        alert("Browser memblokir pop-up. Izinkan pop-up untuk mencetak QR Code.");
        return;
    }

    const printContent = tables.map(t => {
        // AMBIL PAYLOAD DARI DATABASE (t.qrCodeData)
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
                    body { font-family: sans-serif; display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
                    .qr-card { border: 2px solid #000; padding: 20px; text-align: center; width: 300px; }
                    .logo { width: 50px; height: 50px; }
                    .store-name { font-weight: bold; font-size: 1.2rem; }
                    .qr-body img { width: 100%; }
                    .table-label { font-size: 0.8rem; }
                    .table-number { font-size: 2.5rem; font-weight: 900; }
                </style>
            </head>
            <body>${printContent}</body>
        </html>
    `);
    win.document.close();
}

const SettingsView: React.FC = () => {
    const { 
        tables, addTable, storeProfile
    } = useAppContext();

    // FIX: Added missing batch state variables
    const [qrBatchStart, setQrBatchStart] = useState('1');
    const [qrBatchEnd, setQrBatchEnd] = useState('10');

    const handleBatchAddTable = async () => {
        const start = parseInt(qrBatchStart), end = parseInt(qrBatchEnd);
        if(!isNaN(start) && !isNaN(end) && end >= start) {
            for(let i=start; i<=end; i++) {
                const numStr = i.toString();
                if(!tables.find(t => t.number === numStr)) {
                    await addTable(numStr); 
                }
            }
            alert(`Selesai memproses pembuatan meja.`);
        }
    };

    return (
        <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">Pengaturan Meja & QR</h2>
            <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
                <h3 className="font-bold mb-4">Batch Buat Meja</h3>
                <div className="flex gap-4 items-end">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Mulai</label>
                        <input value={qrBatchStart} onChange={e => setQrBatchStart(e.target.value)} type="number" className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Sampai</label>
                        <input value={qrBatchEnd} onChange={e => setQrBatchEnd(e.target.value)} type="number" className="w-full border p-2 rounded" />
                    </div>
                    <button onClick={handleBatchAddTable} className="bg-orange-600 text-white px-6 py-2 rounded font-bold">Proses Batch</button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {tables.map(table => {
                    const baseUrl = window.location.origin;
                    const maskedUrl = `${baseUrl}/?q=${table.qrCodeData}`; 
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(maskedUrl)}`;
                    
                    return (
                        <div key={table.id} className="bg-white p-4 border rounded-xl text-center shadow-sm">
                            <img src={qrUrl} className="mx-auto mb-2" alt={`Meja ${table.number}`} />
                            <div className="font-bold">Meja {table.number}</div>
                        </div>
                    );
                })}
            </div>
            
            <button 
                onClick={() => generatePrintLayout(tables, storeProfile)} 
                className="mt-8 bg-gray-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg"
            >
                Cetak Semua QR Code
            </button>
        </div>
    );
}

export default SettingsView;
