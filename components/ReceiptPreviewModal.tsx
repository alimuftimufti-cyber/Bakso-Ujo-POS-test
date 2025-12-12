import React from 'react';
import { useAppContext } from '../types';
import PrintableReceipt from './PrintableReceipt';
import type { Order, ShiftSummary } from '../types';

interface ReceiptPreviewModalProps {
    order?: Order | null;
    shift?: ShiftSummary | null;
    onClose: () => void;
    variant?: 'receipt' | 'kitchen' | 'shift';
}

const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({ order, shift, onClose, variant = 'receipt' }) => {
    const { storeProfile, printOrderToDevice, printShiftToDevice, printOrderViaBrowser, isPrinting, printerDevice } = useAppContext();

    const handlePrintDirect = () => {
        if (variant === 'shift' && shift) {
            printShiftToDevice(shift);
        } else if (order) {
            printOrderToDevice(order);
        }
    };

    const handlePrintBrowser = () => {
        if (variant === 'shift' && shift) {
            printOrderViaBrowser(shift, 'shift');
        } else if (order) {
            printOrderViaBrowser(order, variant);
        }
    };

    const dataProps = variant === 'shift' ? { shift: shift! } : { order: order! };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99] p-4 no-print">
            <div className="bg-gray-100 rounded-lg shadow-xl w-full max-w-[340px] flex flex-col h-[95vh]">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg">Pratinjau {variant === 'kitchen' ? 'Tiket Dapur' : (variant === 'shift' ? 'Laporan Shift' : 'Struk')}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-light">&times;</button>
                </div>
                
                <div className="flex-1 overflow-y-auto bg-white p-2">
                     <div id="receipt-content-for-browser">
                        {/* @ts-ignore */}
                        <PrintableReceipt {...dataProps} profile={storeProfile} variant={variant} />
                     </div>
                </div>
                
                <div className="p-4 border-t bg-white space-y-2">
                    {(variant === 'receipt' || variant === 'shift') && (
                        <button 
                            onClick={handlePrintDirect}
                            disabled={!printerDevice || isPrinting}
                            className="w-full bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isPrinting ? 'Mencetak...' : (printerDevice ? 'Cetak ke Printer Struk' : 'Pilih Printer Dulu')}
                        </button>
                    )}
                    <button 
                        onClick={handlePrintBrowser}
                        className="w-full bg-gray-600 text-white font-semibold py-3 rounded-lg hover:bg-gray-700"
                    >
                        Cetak via Browser (Kompatibel)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptPreviewModal;