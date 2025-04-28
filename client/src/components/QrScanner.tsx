import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Camera, X } from 'lucide-react';

interface QrScannerProps {
  onResult: (result: string) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
}

export default function QrScanner({ onResult, isScanning, setIsScanning }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'html5qr-code-full-region';
  
  // Start the QR scanner
  const startScanner = async () => {
    try {
      setError(null);
      
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;
      
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onResult(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Ignore errors during scanning
        }
      );
      
      setIsScanning(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to start the scanner');
      }
      setIsScanning(false);
    }
  };
  
  // Stop the QR scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
  };
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error(err));
      }
    };
  }, []);
  
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
          </span>
          {isScanning && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={stopScanner} 
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 text-red-800 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        
        <div id={scannerContainerId} className="mb-4 relative">
          {!isScanning && (
            <div className="border-2 border-dashed border-muted-foreground/50 rounded-md p-6 flex flex-col items-center justify-center">
              <QrCode className="h-12 w-12 text-muted-foreground/70 mb-2" />
              <p className="text-muted-foreground text-center">
                Scan a rider's QR code to check them in
              </p>
              <Button onClick={startScanner} className="mt-4">
                <Camera className="h-4 w-4 mr-2" />
                Start Scanner
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}