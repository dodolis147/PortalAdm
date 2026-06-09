import React from 'react';

interface MercosulPlateProps {
  plate: string;
  key?: React.Key;
}

export default function MercosulPlate({ plate }: MercosulPlateProps) {
  if (!plate || !plate.trim()) return null;
  
  // Format the plate string to uppercase, removing hyphens and spaces
  const rawPlate = plate.toUpperCase().trim();
  // We can insert a subtle gap/space in the middle of standard mercosul format ABC1D23 or ABC1234
  // Mercosul plates do not have hyphens. Let's strip them, but to keep readability, let's keep it clean
  const cleanPlate = rawPlate.replace('-', '').replace(/\s+/g, '');

  return (
    <div 
      className="inline-flex flex-col w-[112px] h-[36px] bg-white border-[1.5px] border-zinc-950 rounded-xs overflow-hidden shadow-xs select-none shrink-0" 
      title={`Placa Padrão Mercosul: ${plate}`}
    >
      {/* Top Blue Header bar */}
      <div className="bg-[#003399] text-white h-[11px] flex items-center justify-between px-1.5 relative select-none">
        
        {/* Mercosul Symbol Cluster (Glyphs) */}
        <div className="flex gap-0.25 scale-75 origin-left select-none outline-none">
          <span className="text-[6px] text-white font-bold leading-none select-none">&#x2726;</span>
          <span className="text-[6px] text-white font-light leading-none select-none opacity-80">&#x2726;</span>
        </div>
        
        {/* BRASIL Text */}
        <span className="text-[8px] font-black tracking-widest leading-none font-sans uppercase text-[#FFFFFF] select-none">
          BRASIL
        </span>
        
        {/* Micro Brazilian Flag Graphic */}
        <div className="w-[11px] h-[7.5px] bg-[#009c3b] rounded-2xs relative flex items-center justify-center overflow-hidden shrink-0 border-[0.2px] border-white/40 shadow-2xs select-none">
          {/* Yellow Diamond */}
          <div className="absolute w-[8.5px] h-[8.5px] bg-[#ffdf00] rotate-45 transform"></div>
          {/* Blue Circle */}
          <div className="absolute w-[3.2px] h-[3.2px] bg-[#002776] rounded-full"></div>
        </div>
      </div>
      
      {/* Alphanumerics */}
      <div className="flex-1 flex items-center justify-center bg-white px-1 leading-none select-all">
        <span className="text-xs font-black font-mono tracking-wider text-slate-900 leading-none">
          {cleanPlate}
        </span>
      </div>
    </div>
  );
}
