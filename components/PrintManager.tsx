import React, { useEffect } from 'react';
import { printOrder } from '../services/printerService';
import type { Order, StoreProfile } from '../types';

interface PrintManagerProps {
    printerDevice: BluetoothDevice | USBDevice | null;
    setPrinterDevice: (device: BluetoothDevice | USBDevice | null) => void;
    orderToPrint: Order | null;
    clearOrderToPrint: () => void;
    storeProfile: StoreProfile;
}

const PrintManager: React.FC<PrintManagerProps> = ({ 
    printerDevice, 
    orderToPrint, 
    clearOrderToPrint, 
    storeProfile 
}) => {

    useEffect(() => {
        const print = async () => {
            if (orderToPrint && printerDevice) {
                console.log('Printing order via device:', orderToPrint.id);
                try {
                    await printOrder(printerDevice, orderToPrint, storeProfile);
                } catch (error) {
                    console.error("Auto-print failed:", error);
                    alert("Gagal mencetak otomatis: " + error);
                }
                clearOrderToPrint();
            }
        };
        print();
    }, [orderToPrint, printerDevice, storeProfile, clearOrderToPrint]);


    return null; // This is a non-visual component
};

export default PrintManager;