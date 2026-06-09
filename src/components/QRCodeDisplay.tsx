import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface ProceduralQRCodeProps {
  value: string;
  size: number;
}

export default function ProceduralQRCode({ value, size }: ProceduralQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then(url => setDataUrl(url))
      .catch(err => console.error(err));
  }, [value, size]);

  if (!dataUrl) return <div style={{ width: size, height: size }} className="bg-gray-100" />;

  return <img src={dataUrl} alt="QR Code" style={{ width: size, height: size }} className="rounded" />;
}
