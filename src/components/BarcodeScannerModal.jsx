import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check, CameraOff } from 'lucide-react';

export default function BarcodeScannerModal({ open, onOpenChange, onCodeScanned }) {
  const [status, setStatus] = useState('loading');
  const [scannedCode, setScannedCode] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setStatus('loading');
      setScannedCode('');
      return;
    }

    let cancelled = false;

    const start = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        await new Promise(r => setTimeout(r, 500));
        if (cancelled) return;

        const scanner = new Html5Qrcode('barcode-scanner-region');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 120 } },
          (text) => {
            setScannedCode(text);
            setStatus('success');
            scanner.stop().catch(() => { });
            setTimeout(() => {
              onCodeScanned(text);
              onOpenChange(false);
            }, 1200);
          },
          () => { }
        );

        if (!cancelled) setStatus('scanning');
      } catch (err) {
        if (cancelled) return;
        setStatus(
          err?.name === 'NotAllowedError' || String(err).includes('Permission')
            ? 'denied'
            : 'no-camera'
        );
      }
    };

    start();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => { });
        scannerRef.current = null;
      }
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ler código de barras</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Abrindo câmera...</p>
            </div>
          )}

          <div
            id="barcode-scanner-region"
            className={status === 'scanning' || status === 'loading' ? 'rounded-lg overflow-hidden' : 'hidden'}
          />

          {status === 'scanning' && (
            <p className="text-center text-sm text-muted-foreground">
              Aponte para o código de barras
            </p>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Código lido com sucesso</p>
              <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-1 rounded">
                {scannedCode}
              </p>
            </div>
          )}

          {(status === 'denied' || status === 'no-camera') && (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <CameraOff className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm font-medium">
                {status === 'denied'
                  ? 'Não foi possível acessar a câmera'
                  : 'Câmera não disponível'}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {status === 'denied'
                  ? 'Verifique as permissões do navegador. Você ainda pode digitar o código manualmente.'
                  : 'Nenhuma câmera encontrada. Você pode digitar o código manualmente.'}
              </p>
            </div>
          )}

          {status !== 'success' && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}