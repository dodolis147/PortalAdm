import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export function ProceduralQRCode({ value, size = 120 }: { value: string; size?: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    console.log("[DEBUG] ProceduralQRCode rendering with value:", value);
    if (!value) {
      setQrDataUrl('');
      return;
    }
    
    let active = true;
    QRCode.toDataURL(value, {
      margin: 1,
      width: size,
      color: {
        dark: '#0f172a',  // Modern deep slate
        light: '#ffffff'
      }
    })
      .then(url => {
        if (active) {
          setQrDataUrl(url);
        }
      })
      .catch(err => {
        console.error('Error generating QR code:', err);
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  return qrDataUrl ? (
    <img 
      src={qrDataUrl} 
      alt="QR Code" 
      className="inline-block rounded-xl shadow-xs border border-gray-100"
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
    />
  ) : (
    <div 
      className="flex items-center justify-center bg-gray-50 border border-dashed border-gray-200 rounded-xl animate-pulse"
      style={{ width: size, height: size }}
    >
      <span className="text-[10px] text-gray-400 font-medium">Gerando...</span>
    </div>
  );
}
