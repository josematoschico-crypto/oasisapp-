import React from 'react';

interface Props {
  expiryDate: string;
}

const GuaranteeBar: React.FC<Props> = ({ expiryDate }) => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
  
  // Cálculo proporcional baseado em um ciclo de 365 dias (1 ano)
  const percentage = Math.max(0, Math.min(100, (diffDays / 365) * 100));
  
  // Cores baseadas na imagem: Vermelho (#ef4444) -> Laranja (#f97316) -> Amarelo (#facc15) -> Verde (#22c55e)
  // Para manter as cores fixas na posição da barra (estilo medição conforme a imagem), 
  // ajustamos o background-size para que o gradiente se comporte como se estivesse fixo no container.
  const gradientStyle: React.CSSProperties = {
    width: `${percentage}%`,
    background: 'linear-gradient(to right, #ef4444, #f97316, #facc15, #22c55e)',
    backgroundSize: percentage > 0 ? `${(100 / percentage) * 100}% 100%` : '100% 100%',
    transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1), background-size 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[10px] text-slate-500">
        <span className="font-black uppercase tracking-[0.2em]">Vigência da Garantia</span>
        <span className="text-white font-black">{diffDays > 0 ? diffDays : 0} dias restantes</span>
      </div>
      <div className="h-3 w-full bg-slate-800/40 rounded-full overflow-hidden border border-slate-700/30 p-[1px]">
        <div 
          className="h-full rounded-full shadow-[0_0_15px_rgba(245,158,11,0.15)]" 
          style={gradientStyle}
        />
      </div>
    </div>
  );
};

export default GuaranteeBar;