'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = async () => {
    if (!containerRef.current) return;

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Stop scanner after successful scan
          scanner.stop().then(() => {
            setIsScanning(false);
            onScan(decodedText);
          });
        },
        () => {
          // Ignore scan errors (no QR found in frame)
        }
      );

      setIsScanning(true);
      setHasPermission(true);
    } catch (err) {
      setHasPermission(false);
      const message = err instanceof Error ? err.message : 'Camera access denied';
      onError?.(message);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isScanning]);

  return (
    <div className="flex flex-col items-center">
      <div
        id="qr-reader"
        ref={containerRef}
        className={`w-full max-w-sm bg-black rounded-lg overflow-hidden ${isScanning ? '' : 'hidden'}`}
      />

      {!isScanning && (
        <button
          onClick={startScanner}
          className="w-full py-4 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 flex items-center justify-center gap-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Open Camera to Scan
        </button>
      )}

      {isScanning && (
        <button
          onClick={stopScanner}
          className="mt-4 px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          Cancel
        </button>
      )}

      {hasPermission === false && (
        <p className="mt-4 text-red-500 text-sm text-center">
          Camera access denied. Please allow camera access in your browser settings.
        </p>
      )}
    </div>
  );
}
