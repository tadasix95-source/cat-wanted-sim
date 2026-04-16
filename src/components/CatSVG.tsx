import React from 'react';
import type { Color } from '../utils/genetics';

interface CatSVGProps {
  type: 'dad' | 'mom' | 'kitten';
  color: Color;
  hasWhite: boolean;
  className?: string;
  headOnly?: boolean;
}

export default function CatSVG({ type, color, hasWhite, className = '', headOnly = false }: CatSVGProps) {
  // Determine base colors
  let baseColor = '#1e293b'; // slate-800 for black
  if (color === 'tabby') baseColor = '#d97706'; // amber-600
  if (color === 'calico') baseColor = '#334155'; // slate-700 base for patches

  let viewBox = "0 0 100 100";
  let bodyRx = 30, bodyRy = 40, bodyCy = 65;
  let headR = 25, headCx = 50, headCy = 35;
  let earSize = 15;

  if (type === 'dad') {
    bodyRx = 35; bodyRy = 45; bodyCy = 65;
    headR = 28; headCy = 35;
  } else if (type === 'mom') {
    bodyRx = 25; bodyRy = 40; bodyCy = 60;
    headR = 23; headCy = 30;
  } else if (type === 'kitten') {
    bodyRx = 18; bodyRy = 22; bodyCy = 75;
    headR = 22; headCy = 45;
    earSize = 16;
  }

  if (headOnly) {
    // Focus on head area
    viewBox = `15 ${Math.max(0, headCy - headR - earSize - 5)} 70 70`;
  }

  return (
    <svg 
      viewBox={viewBox} 
      className={`w-full h-full drop-shadow-2xl transition-transform hover:scale-105 duration-300 ${className}`} 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <clipPath id={`body-clip-${type}`}>
          <ellipse cx="50" cy={bodyCy} rx={bodyRx} ry={bodyRy} />
        </clipPath>
        <clipPath id={`head-clip-${type}`}>
          <circle cx={headCx} cy={headCy} r={headR} />
        </clipPath>
      </defs>

      {!headOnly && (
        <>
          {/* Tail (animating slightly) */}
          <path 
            d={`M ${50 + bodyRx - 5} ${bodyCy + 10} Q 95 ${bodyCy + 25} 85 ${bodyCy - 20}`} 
            fill="none" stroke={baseColor} strokeWidth="8" strokeLinecap="round" 
            className="transition-colors duration-500 origin-bottom"
          />

          {/* Body */}
          <g>
            <ellipse cx="50" cy={bodyCy} rx={bodyRx} ry={bodyRy} fill={baseColor} className="transition-colors duration-500" />
            
            {/* Calico Patches Body */}
            {color === 'calico' && (
              <g clipPath={`url(#body-clip-${type})`}>
                <circle cx="20" cy={bodyCy - 15} r="20" fill="#ea580c" />
                <circle cx="75" cy={bodyCy + 10} r="25" fill="#ea580c" />
                <ellipse cx="40" cy={bodyCy + 20} rx="20" ry="15" fill="#0f172a" />
              </g>
            )}

            {/* Tabby Stripes Body */}
            {color === 'tabby' && (
              <g clipPath={`url(#body-clip-${type})`}>
                <path d={`M ${50 - bodyRx} ${bodyCy - 5} Q 50 ${bodyCy + 5} ${50 + bodyRx} ${bodyCy - 5}`} stroke="#78350f" strokeWidth="4" fill="none" />
                <path d={`M ${50 - bodyRx + 5} ${bodyCy + 10} Q 50 ${bodyCy + 20} ${50 + bodyRx - 5} ${bodyCy + 10}`} stroke="#78350f" strokeWidth="4" fill="none" />
                <path d={`M ${50 - bodyRx + 15} ${bodyCy + 25} Q 50 ${bodyCy + 35} ${50 + bodyRx - 15} ${bodyCy + 25}`} stroke="#78350f" strokeWidth="4" fill="none" />
              </g>
            )}

            {/* White Belly */}
            {hasWhite && (
              <ellipse cx="50" cy={bodyCy + 15} rx={bodyRx * 0.75} ry={bodyRy * 0.7} fill="#ffffff" className="transition-colors duration-500 shadow-inner" />
            )}
          </g>
        </>
      )}

      {/* Ears */}
      <path d={`M ${headCx - headR + 5} ${headCy - 10} L ${headCx - headR - 5} ${headCy - headR - earSize + 5} L ${headCx - 5} ${headCy - headR + 5} Z`} fill={baseColor} className="transition-colors duration-500" />
      <path d={`M ${headCx + headR - 5} ${headCy - 10} L ${headCx + headR + 5} ${headCy - headR - earSize + 5} L ${headCx + 5} ${headCy - headR + 5} Z`} fill={baseColor} className="transition-colors duration-500" />

      {/* Head */}
      <g>
        <circle cx={headCx} cy={headCy} r={headR} fill={baseColor} className="transition-colors duration-500 shadow-md" />
        
        {/* Calico Patches Head */}
        {color === 'calico' && (
           <g clipPath={`url(#head-clip-${type})`}>
             <circle cx={headCx - 15} cy={headCy - 15} r="18" fill="#ea580c" />
           </g>
        )}

        {/* Tabby Head Stripes */}
        {color === 'tabby' && (
           <g clipPath={`url(#head-clip-${type})`}>
             <path d={`M ${headCx} ${headCy - headR} L ${headCx} ${headCy - 5}`} stroke="#78350f" strokeWidth="3" />
             <path d={`M ${headCx - 6} ${headCy - headR} L ${headCx - 8} ${headCy - 8}`} stroke="#78350f" strokeWidth="2" />
             <path d={`M ${headCx + 6} ${headCy - headR} L ${headCx + 8} ${headCy - 8}`} stroke="#78350f" strokeWidth="2" />
           </g>
        )}

        {/* White Muzzle */}
        {hasWhite && (
          <ellipse cx={headCx} cy={headCy + 12} rx={headR * 0.8} ry={headR * 0.6} fill="#ffffff" />
        )}

        {/* Eyes (Glowing slightly) */}
        <circle cx={headCx - 10} cy={headCy} r="4" fill="#fde047" className="animate-pulse" />
        <circle cx={headCx + 10} cy={headCy} r="4" fill="#fde047" className="animate-pulse" />
        {/* Pupils */}
        <circle cx={headCx - 10} cy={headCy} r="2" fill="#0f172a" />
        <circle cx={headCx + 10} cy={headCy} r="2" fill="#0f172a" />
        
        {/* Nose */}
        <path d={`M ${headCx - 3} ${headCy + 8} L ${headCx + 3} ${headCy + 8} L ${headCx} ${headCy + 12} Z`} fill="#f472b6" />
        
        {/* Whiskers */}
        <path d={`M ${headCx - 15} ${headCy + 10} L ${headCx - 30} ${headCy + 5}`} stroke="#94a3b8" strokeWidth="1" />
        <path d={`M ${headCx - 15} ${headCy + 12} L ${headCx - 32} ${headCy + 12}`} stroke="#94a3b8" strokeWidth="1" />
        <path d={`M ${headCx + 15} ${headCy + 10} L ${headCx + 30} ${headCy + 5}`} stroke="#94a3b8" strokeWidth="1" />
        <path d={`M ${headCx + 15} ${headCy + 12} L ${headCx + 32} ${headCy + 12}`} stroke="#94a3b8" strokeWidth="1" />
      </g>
    </svg>
  );
}
