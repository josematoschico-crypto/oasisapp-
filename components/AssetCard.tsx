import React from 'react';
import { ArtAsset } from '../types';
import InsuranceBadge from './InsuranceBadge';

interface Props {
  asset: ArtAsset;
  onClick: () => void;
}

const AssetCard: React.FC<Props> = ({ asset, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group bg-slate-900/80 rounded-[2rem] overflow-hidden border border-slate-700/50 active:scale-[0.97] transition-all duration-500 ease-out cursor-pointer shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] hover:shadow-[0_30px_60px_-15px_rgba(245,158,11,0.25)] hover:border-amber-500/50 relative hover:-translate-y-2"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img 
          src={asset.imageUrl} 
          alt={asset.title} 
          className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110"
        />
        <div className="absolute top-4 right-4 z-10 transform group-hover:scale-110 transition-transform duration-500">
          <InsuranceBadge status={asset.insuranceStatus} showText />
        </div>
        
        {/* Decorative Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90 group-hover:opacity-70 transition-opacity"></div>
        
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <div className="space-y-0.5 transform group-hover:-translate-y-1 transition-transform duration-500">
            <p className="text-amber-400 font-black text-[9px] tracking-[0.2em] uppercase opacity-90 group-hover:opacity-100">{asset.artist}</p>
            <h3 className="text-white font-black text-2xl leading-none tracking-tighter uppercase group-hover:text-amber-100 transition-colors">{asset.title}</h3>
          </div>
        </div>
      </div>
      
      <div className="p-5 flex justify-between items-center bg-slate-900/95 backdrop-blur-2xl border-t border-slate-800/50">
        <div className="space-y-0.5">
          <p className="text-slate-500 text-[8px] uppercase font-black tracking-[0.2em]">Fração Mínima</p>
          <div className="flex items-baseline gap-1">
             <span className="text-amber-500 font-bold text-[10px]">R$</span>
             <p className="text-white font-black text-xl tracking-tighter">{(asset.fractionPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
          </div>
        </div>
        <div className="text-right space-y-0.5">
          <p className="text-slate-500 text-[8px] uppercase font-black tracking-[0.2em]">Disponível</p>
          <div className="flex items-center justify-end gap-1">
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             <p className="text-emerald-400 font-black text-lg tracking-tighter">
                {((asset.availableFractions / (asset.totalFractions || 1)) * 100).toFixed(0)}%
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetCard;