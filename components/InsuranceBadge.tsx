
import React from 'react';
import { InsuranceStatus } from '../types';

interface Props {
  status: InsuranceStatus;
  showText?: boolean;
}

const InsuranceBadge: React.FC<Props> = ({ status, showText = false }) => {
  const config = {
    [InsuranceStatus.SECURED]: {
      icon: 'fa-shield-check',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      text: 'Segurado'
    },
    [InsuranceStatus.WARNING]: {
      icon: 'fa-shield-exclamation',
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      text: 'Renovação Pendente'
    },
    [InsuranceStatus.EXPIRED]: {
      icon: 'fa-shield-xmark',
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      text: 'Sem Cobertura'
    }
  };

  const { icon, color, bg, text } = config[status];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${bg} ${color}`}>
      <i className={`fa-solid ${icon} text-xs`}></i>
      {showText && <span className="text-[10px] font-bold uppercase tracking-wider">{text}</span>}
    </div>
  );
};

export default InsuranceBadge;
