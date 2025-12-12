import { formatOrderForThermalPrinter, formatShiftForThermalPrinter } from './receiptFormatter';
import type { Order, StoreProfile, ShiftSummary } from '../types';

// Common Bluetooth Printer Service UUIDs
const OPTIONAL_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Standard Thermal Printer
    '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Star Micronics
    '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Generic Chinese Printers
];

// Helper for delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Device Selection ---

export const selectBluetoothPrinter = async (): Promise<BluetoothDevice> => {
    if(!navigator.bluetooth) throw new Error('Browser ini tidak mendukung Web Bluetooth. Gunakan Google Chrome di Android atau Desktop.');
    
    try {
        const device = await navigator.bluetooth.requestDevice({
           acceptAllDevices: true,
           optionalServices: OPTIONAL_SERVICES
        });
    
        if (!device) throw new Error("Tidak ada perangkat dipilih.");
        return device;
    } catch (e: any) {
        if (e.toString().includes("User cancelled")) {
            throw new Error("Pemilihan perangkat dibatalkan.");
        }
        throw e;
    }
};

export const selectUsbPrinter = async (): Promise<USBDevice> => {
    if (!navigator.usb) throw new Error('Browser ini tidak mendukung Web USB.');

    try {
        const device = await navigator.usb.requestDevice({
            filters: [{ classCode: 0x07 }] // Printer class code
        });
    
        if (!device) throw new Error("Tidak ada perangkat dipilih.");
        return device;
    } catch (e: any) {
        if (e.toString().includes("No device selected")) {
            throw new Error("Pemilihan perangkat dibatalkan.");
        }
        throw e;
    }
};


// --- Printing Logic (On-Demand Connection) ---

const printViaUsb = async (device: USBDevice, data: string) => {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    let anInterfaceNumber: number | null = null;

    try {
        await device.open();
        // Try select config, but don't fail if already selected
        if (device.configuration === null) {
            await device.selectConfiguration(1);
        }
        
        const anInterface = device.configuration?.interfaces[0];
        if (!anInterface) throw new Error("Interface USB tidak ditemukan.");
        anInterfaceNumber = anInterface.interfaceNumber;

        await device.claimInterface(anInterfaceNumber);
        
        const endpoint = anInterface.alternate.endpoints.find(e => e.direction === 'out');
        if (!endpoint) throw new Error("Endpoint USB output tidak ditemukan.");
        
        // USB transfers are usually fast enough, but we can chunk if needed. 
        // For USB, sending all at once is usually fine, but safer to chunk for large receipts.
        const chunkSize = 64; 
        for (let i = 0; i < encodedData.length; i += chunkSize) {
            const chunk = encodedData.slice(i, i + chunkSize);
            await device.transferOut(endpoint.endpointNumber, chunk);
        }
        
    } finally {
        if (device.opened) {
            try {
                if (anInterfaceNumber !== null) {
                    await device.releaseInterface(anInterfaceNumber);
                }
            } catch(e) {
                console.warn("Failed to release interface:", e);
            } finally {
                await device.close();
            }
        }
    }
};

const printViaBluetooth = async (device: BluetoothDevice, data: string) => {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    
    if (!device.gatt) throw new Error("GATT server not available.");

    if (!device.gatt.connected) {
        await device.gatt.connect();
    }
    
    const server = device.gatt;
    let service: BluetoothRemoteGATTService | undefined;
    let characteristic: BluetoothRemoteGATTCharacteristic | undefined;

    // Try to find a writable characteristic in known services
    for (const uuid of OPTIONAL_SERVICES) {
        try {
            service = await server.getPrimaryService(uuid);
            const characteristics = await service.getCharacteristics();
            // Find a characteristic that supports Write or WriteWithoutResponse
            characteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);
            if (characteristic) break; 
        } catch (e) {
            continue; // Try next service
        }
    }

    if (!characteristic) {
        device.gatt.disconnect();
        throw new Error("Printer Bluetooth tidak mendukung layanan cetak standar. Pastikan printer mendukung BLE (Bluetooth Low Energy).");
    }

    // CHUNKING STRATEGY:
    // Thermal printers have small buffers. Sending too fast causes garbage text.
    // 50-100 bytes per chunk with 30-50ms delay is the sweet spot for stability.
    const chunkSize = 100; 
    const delay = 50; // ms

    for (let i = 0; i < encodedData.length; i += chunkSize) {
        const chunk = encodedData.slice(i, i + chunkSize);
        
        if (characteristic.properties.writeWithoutResponse) {
            await characteristic.writeValueWithoutResponse(chunk);
        } else {
            await characteristic.writeValue(chunk);
        }
        
        await sleep(delay); 
    }
    
    // Waiting a bit before potentially closing helps ensure the buffer is flushed.
    await sleep(500); 
};

export const printOrder = async (device: USBDevice | BluetoothDevice, order: Order, profile: StoreProfile) => {
    const receiptData = formatOrderForThermalPrinter(order, profile);
    await executePrint(device, receiptData);
}

export const printShift = async (device: USBDevice | BluetoothDevice, shift: ShiftSummary, profile: StoreProfile) => {
    const receiptData = formatShiftForThermalPrinter(shift, profile);
    await executePrint(device, receiptData);
}

export const printTest = async (device: USBDevice | BluetoothDevice) => {
    const testData = 
        '\x1B' + '@' + // Init
        '\x1B' + 'a' + '\x01' + // Center
        '--------------------------------\n' +
        'TES PRINTER BERHASIL\n' +
        '--------------------------------\n' +
        'Koneksi OK\n' +
        'Cetak OK\n' +
        '\n\n\n' + // Feed
        '\x1D' + 'V' + '\x00'; // Cut
        
    await executePrint(device, testData);
}

const executePrint = async (device: USBDevice | BluetoothDevice, data: string) => {
    try {
        if ('transferOut' in device) { // USB
            await printViaUsb(device, data);
        } else if ('gatt' in device) { // Bluetooth
            await printViaBluetooth(device, data);
        }
    } catch (error: any) {
        console.error("Print failed:", error);
         if (error.name === 'SecurityError' || error.message.includes('Access denied')) {
             throw new Error(`Akses ditolak. Jika menggunakan USB, coba cabut-pasang kabel. Jika Bluetooth, pastikan tidak ada HP lain yang sedang terhubung.`);
        }
        throw error; 
    }
}