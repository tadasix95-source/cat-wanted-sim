import React, { useState, useMemo, useEffect } from 'react';
import type { Parent, Color } from '../utils/genetics';
import { calculateProbabilities } from '../utils/genetics';
import CatSVG from './CatSVG';

export default function Simulator() {
  const [father, setFather] = useState<Parent>({ gender: 'male', color: 'black', hasWhite: false });
  const [mother, setMother] = useState<Parent>({ gender: 'female', color: 'calico', hasWhite: true });
  
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [animFace, setAnimFace] = useState<{ color: Color, hasWhite: boolean }>({ color: 'black', hasWhite: false });
  const [faceCount, setFaceCount] = useState(0);

  const probabilities = useMemo(() => calculateProbabilities(father, mother), [father, mother]);

  // Handle slot machine animation during calculation
  useEffect(() => {
    let interval: number;
    if (isCalculating) {
      const faces: { color: Color, hasWhite: boolean }[] = [
        { color: 'black', hasWhite: false },
        { color: 'tabby', hasWhite: false },
        { color: 'black', hasWhite: true },
        { color: 'tabby', hasWhite: true },
        { color: 'calico', hasWhite: true },
        { color: 'calico', hasWhite: false },
      ];
      interval = window.setInterval(() => {
        setFaceCount(prev => prev + 1);
        setAnimFace(faces[Math.floor(Math.random() * faces.length)]);
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isCalculating]);

  const resetResults = () => {
    setShowResults(false);
    setIsCalculating(false);
  };

  const updateFather = (updates: Partial<Parent>) => {
    setFather({ ...father, ...updates });
    resetResults();
  };

  const updateMother = (updates: Partial<Parent>) => {
    setMother({ ...mother, ...updates });
    resetResults();
  };

  const startSimulation = () => {
    setIsCalculating(true);
    setShowResults(false);
    
    setTimeout(() => {
      setIsCalculating(false);
      setShowResults(true);
    }, 3000);
  };

  return (
    <div className="max-w-screen-lg mx-auto w-full flex flex-col gap-4 md:gap-5 scale-[0.9] origin-top">
      {/* Parents Section */}
      <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-5 items-stretch">
        
        {/* Father Card */}
        <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-3 relative overflow-hidden w-full md:max-w-[360px]">
          <h2 className="text-base font-black text-blue-600 z-10">パパ猫 (Dad)</h2>
          
          <div className="w-20 h-20 md:w-24 md:h-24 z-10 drop-shadow-md">
            <CatSVG type="dad" color={father.color} hasWhite={father.hasWhite} />
          </div>

          <div className="w-full flex flex-col gap-2 z-10">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">毛色</label>
              <div className="flex gap-2 text-[11px]">
                <button 
                  onClick={() => updateFather({ color: 'black' })} 
                  className={`flex-1 py-1 px-1.5 rounded-lg font-bold transition-all ${father.color === 'black' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-blue-400 border border-blue-200 hover:bg-blue-100/50'}`}
                >
                  黒
                </button>
                <button 
                  onClick={() => updateFather({ color: 'tabby' })} 
                  className={`flex-1 py-1 px-1.5 rounded-lg font-bold transition-all ${father.color === 'tabby' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-blue-400 border border-blue-200 hover:bg-blue-100/50'}`}
                >
                  トラ
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">白斑</label>
              <div className="flex gap-2 text-[11px]">
                <button 
                  onClick={() => updateFather({ hasWhite: true })} 
                  className={`flex-1 py-1 px-1.5 rounded-lg font-bold transition-all ${father.hasWhite ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-400 border border-blue-200 hover:bg-blue-100/50'}`}
                >
                  あり
                </button>
                <button 
                  onClick={() => updateFather({ hasWhite: false })} 
                  className={`flex-1 py-1 px-1.5 rounded-lg font-bold transition-all ${!father.hasWhite ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-blue-400 border border-blue-200 hover:bg-blue-100/50'}`}
                >
                  なし
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mother Card */}
        <div className="bg-pink-50 border-2 border-pink-100 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-3 relative overflow-hidden w-full md:max-w-[360px]">
          <h2 className="text-base font-black text-pink-600 z-10">ママ猫 (Mom)</h2>
          
          <div className="w-20 h-20 md:w-24 md:h-24 z-10 drop-shadow-md">
            <CatSVG type="mom" color={mother.color} hasWhite={mother.hasWhite} />
          </div>

          <div className="w-full flex flex-col gap-2 z-10">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">毛色</label>
              <div className="flex gap-1.5 text-[11px]">
                <button 
                  onClick={() => updateMother({ color: 'black' })} 
                  className={`flex-1 py-1 px-0.5 rounded-lg font-bold transition-all ${mother.color === 'black' ? 'bg-pink-500 text-white shadow-md' : 'bg-white text-pink-400 border border-pink-200 hover:bg-pink-100/50'}`}
                >
                  黒
                </button>
                <button 
                  onClick={() => updateMother({ color: 'tabby' })} 
                  className={`flex-1 py-1 px-0.5 rounded-lg font-bold transition-all ${mother.color === 'tabby' ? 'bg-pink-500 text-white shadow-md' : 'bg-white text-pink-400 border border-pink-200 hover:bg-pink-100/50'}`}
                >
                  トラ
                </button>
                <button 
                  onClick={() => updateMother({ color: 'calico' })} 
                  className={`flex-1 py-1 px-0.5 rounded-lg font-bold transition-all ${mother.color === 'calico' ? 'bg-pink-500 text-white shadow-md' : 'bg-white text-pink-400 border border-pink-200 hover:bg-pink-100/50'}`}
                >
                  三毛・サビ
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">白斑</label>
              <div className="flex gap-2 text-[11px]">
                <button 
                  onClick={() => updateMother({ hasWhite: true })} 
                  className={`flex-1 py-1 px-1.5 rounded-lg font-bold transition-all ${mother.hasWhite ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-pink-400 border border-pink-200 hover:bg-pink-100/50'}`}
                >
                  あり
                </button>
                <button 
                  onClick={() => updateMother({ hasWhite: false })} 
                  className={`flex-1 py-1 px-1.5 rounded-lg font-bold transition-all ${!mother.hasWhite ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-pink-400 border border-pink-200 hover:bg-pink-100/50'}`}
                >
                  なし
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Results Section Container */}
      <div className={`border-2 rounded-2xl p-4 shadow-sm flex flex-col items-center min-h-[170px] relative transition-all duration-500 ${isCalculating ? 'animate-bg-shimmer border-yellow-300' : 'bg-yellow-50 border-yellow-100'}`}>
        
        {/* Start Button Area */}
        {!isCalculating && !showResults && (
           <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
             <p className="text-yellow-600/70 text-xs font-bold">親猫を選んだらスタート！</p>
             <button 
              onClick={startSimulation}
              className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black py-2.5 px-8 rounded-full shadow-md shadow-yellow-200 transform hover:scale-105 transition-all text-base"
             >
               シミュレーション開始
             </button>
           </div>
        )}

        {/* Calculating Area: Animation with Head Rotating & Popping */}
        {isCalculating && (
          <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
            <div className="w-16 h-16 md:w-20 md:h-20 drop-shadow-xl mb-2 relative z-10">
              <CatSVG 
                key={faceCount}
                type="kitten" 
                color={animFace.color} 
                hasWhite={animFace.hasWhite} 
                headOnly={true}
                className="animate-pop"
              />
            </div>
            
            {/* Sparkle effects (simple dots) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-2 h-2 bg-white rounded-full absolute top-4 left-1/4 animate-ping" />
                <div className="w-1.5 h-1.5 bg-yellow-200 rounded-full absolute bottom-8 right-1/3 animate-ping delay-75" />
                <div className="w-2 h-2 bg-white rounded-full absolute top-10 right-1/4 animate-ping delay-150" />
            </div>

            <div className="flex flex-col items-center gap-1 animate-pulse z-10">
              <span className="text-xl font-black text-yellow-600 animate-bounce">どの子が生まれるかな？</span>
              <span className="text-sm font-bold text-yellow-500/80">考え中...</span>
            </div>
          </div>
        )}

        {/* Results Area */}
        {showResults && (
          <div className="w-full flex flex-col items-center pb-2">
            <div className="flex flex-col items-center mb-3">
                 <h2 className="text-lg font-black text-yellow-700 tracking-tight flex items-center gap-2">
                   ✨ 生まれる子猫の確率 ✨
                 </h2>
                 <button 
                   onClick={resetResults}
                   className="text-[10px] text-yellow-500 font-bold hover:text-yellow-700 mt-1 underline underline-offset-1"
                 >
                   やり直す
                 </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 w-full z-10">
              {probabilities.map((prob, idx) => {
                if (prob.probability === 0) return null;
                
                const colorName = prob.phenotype.color === 'black' ? '黒' : 
                                  prob.phenotype.color === 'tabby' ? 'トラ' : 
                                  (prob.phenotype.hasWhite ? '三毛' : 'サビ');
                                  
                const genderName = prob.phenotype.gender === 'male' ? '♂' : '♀';
                const percentage = Math.round(prob.probability * 100);

                return (
                  <div 
                    key={idx} 
                    className="bg-white/90 rounded-2xl p-2.5 flex flex-col items-center gap-1.5 border border-yellow-200 shadow-sm animate-reveal"
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 drop-shadow-sm">
                      <CatSVG 
                        type="kitten" 
                        color={prob.phenotype.color} 
                        hasWhite={prob.phenotype.hasWhite} 
                      />
                    </div>
                    
                    <div className="flex flex-col items-center text-center">
                      <span className="text-xl font-black text-slate-800 leading-none">{percentage}%</span>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] font-black text-slate-600">{colorName}</span>
                        <span className={`text-[10px] font-black ${prob.phenotype.gender === 'male' ? 'text-blue-500' : 'text-pink-500'}`}>{genderName}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
