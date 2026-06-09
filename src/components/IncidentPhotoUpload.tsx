import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react';

interface IncidentPhotoUploadProps {
  photos: string[]; // Base64 or URLs
  onPhotosChange: (photos: string[]) => void;
  title: string;
}

export default function IncidentPhotoUpload({ photos, onPhotosChange, title }: IncidentPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        onPhotosChange([...photos, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-gray-650 block">Evidências Fotográficas</label>
      
      <div className="flex flex-wrap gap-3">
        {photos.map((photo, index) => (
          <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
            <img src={photo} alt={`Evidência ${index + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-sky-500 hover:text-sky-500"
        >
          <Camera className="w-6 h-6" />
          <span className="text-[9px] mt-1">Capturar</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
        />
      </div>
    </div>
  );
}
