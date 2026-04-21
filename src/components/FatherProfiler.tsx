import React, { useState, useRef, useEffect } from 'react';
import type { Color } from '../utils/genetics';
import CatSVG from './CatSVG';

// ─── Types ────────────────────────────────────────────────────────────────────

type FurColor = 'black' | 'tabby' | 'calico';

interface CatInput {
  color: FurColor;
  hasWhite: boolean;
}

interface FatherCandidate {
  color: Color;
  hasWhite: boolean;
  certainty: 'definite' | 'possible';
  reason: string;
}

interface InferenceResult {
  candidates: FatherCandidate[];
  notes: string[];
}

// ─── Genetics Logic ───────────────────────────────────────────────────────────

function inferFather(mom: CatInput, kitten: CatInput): InferenceResult {
  const candidates: FatherCandidate[] = [];
  const notes: string[] = [];

  if (kitten.color === 'calico') {
    notes.push('三毛はメスのみに現れます (X^O X^o)。');
  }

  const momO: ('O' | 'o')[] =
    mom.color === 'black'   ? ['o', 'o'] :
    mom.color === 'tabby'   ? ['O', 'O'] :
    /* calico */              ['O', 'o'];

  const requiredDadOForFemaleKitten: Set<'O' | 'o'> = new Set();

  if (kitten.color === 'black') {
    requiredDadOForFemaleKitten.add('o');
  } else if (kitten.color === 'tabby') {
    requiredDadOForFemaleKitten.add('O');
  } else {
    requiredDadOForFemaleKitten.add('O');
    requiredDadOForFemaleKitten.add('o');
  }

  const momCanGiveO = momO.includes('O');
  const momCanGiveo = momO.includes('o');
  const kittenCouldBeMale = kitten.color !== 'calico';

  const fatherColorCandidates: { color: 'black' | 'tabby'; certainty: 'definite' | 'possible'; reason: string }[] = [];

  if (kitten.color === 'calico') {
    if (mom.color === 'black') {
      fatherColorCandidates.push({
        color: 'tabby',
        certainty: 'definite',
        reason: 'ママ黒 × 三毛子猫 → パパはX^Oを持つ必要あり → トラ確定',
      });
      notes.push('ママが黒 (X^o X^o) なので、三毛の子猫にX^OはパパのX^Oから受け継いだもの。パパはトラ確定です。');
    } else if (mom.color === 'tabby') {
      fatherColorCandidates.push({
        color: 'black',
        certainty: 'definite',
        reason: 'ママトラ × 三毛子猫 → パパはX^oを持つ必要あり → 黒確定',
      });
      notes.push('ママがトラ (X^O X^O) なので、三毛の子猫にX^oはパパのX^oから受け継いだもの。パパは黒確定です。');
    } else {
      fatherColorCandidates.push({
        color: 'black',
        certainty: 'possible',
        reason: 'ママ三毛 → X^oを子猫へ渡せるため、パパが黒の可能性あり',
      });
      fatherColorCandidates.push({
        color: 'tabby',
        certainty: 'possible',
        reason: 'ママ三毛 → X^Oを子猫へ渡せるため、パパがトラの可能性あり',
      });
      notes.push('ママが三毛なので両方のX染色体を持ちます。パパは黒・トラどちらの可能性もあります。');
    }
  } else if (kitten.color === 'black') {
    if (momCanGiveo) {
      fatherColorCandidates.push({
        color: 'black',
        certainty: kittenCouldBeMale ? 'possible' : 'definite',
        reason: '黒の子猫 → パパは黒 (X^o) を提供できる',
      });
      if (kittenCouldBeMale) {
        fatherColorCandidates.push({
          color: 'tabby',
          certainty: 'possible',
          reason: '子猫がオスの場合、パパのO遺伝子は関係なくトラでも可能',
        });
        notes.push('子猫が黒の場合、オスなら父猫のO遺伝子は不問（Y染色体のみ渡す）。パパが黒でもトラでも成立します。');
      } else {
        notes.push('子猫が黒メスなら、パパはX^o（黒）確定です。');
      }
    } else {
      notes.push('⚠️ ママがトラ(X^O X^O)の場合、黒の子猫は遺伝的に成立しません。入力をご確認ください。');
    }
  } else if (kitten.color === 'tabby') {
    if (momCanGiveO) {
      fatherColorCandidates.push({
        color: 'tabby',
        certainty: kittenCouldBeMale ? 'possible' : 'definite',
        reason: 'トラの子猫 → パパはX^O（トラ）を提供できる',
      });
      if (kittenCouldBeMale) {
        fatherColorCandidates.push({
          color: 'black',
          certainty: 'possible',
          reason: '子猫がオスの場合、パパのO遺伝子は関係なく黒でも可能',
        });
        notes.push('子猫がトラの場合、オスならパパのO遺伝子は不問（Y染色体のみ渡す）。パパが黒でもトラでも成立します。');
      } else {
        notes.push('子猫がトラメスなら、パパはX^O（トラ）確定です。');
      }
    } else {
      fatherColorCandidates.push({
        color: 'tabby',
        certainty: 'definite',
        reason: 'ママ黒(X^o X^o) × トラ子猫 → X^Oはパパから → パパはトラ確定',
      });
      notes.push('ママが黒(X^o X^o)のためX^Oを渡せません。トラの子猫のX^OはパパのX^Oから。パパはトラ確定です。');
    }
  }

  // S-gene logic
  let dadMustHaveWhite = false;
  let dadWhiteCertain = false;

  if (kitten.hasWhite && !mom.hasWhite) {
    dadMustHaveWhite = true;
    dadWhiteCertain = true;
    notes.push('子猫に白斑があり、ママにないため → パパは白斑あり確定。');
  } else if (kitten.hasWhite && mom.hasWhite) {
    notes.push('子猫に白斑あり。ママも白斑あり → パパの白斑は不確定（あり・なし両方の可能性）。');
  }

  for (const colorCandidate of fatherColorCandidates) {
    if (dadWhiteCertain || dadMustHaveWhite) {
      candidates.push({
        color: colorCandidate.color,
        hasWhite: true,
        certainty: colorCandidate.certainty,
        reason: colorCandidate.reason,
      });
    } else {
      candidates.push({
        color: colorCandidate.color,
        hasWhite: false,
        certainty: colorCandidate.certainty,
        reason: colorCandidate.reason + '・白斑なし',
      });
      if (kitten.hasWhite) {
        candidates.push({
          color: colorCandidate.color,
          hasWhite: true,
          certainty: colorCandidate.certainty,
          reason: colorCandidate.reason + '・白斑あり',
        });
      }
    }
  }

  return { candidates, notes };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const colorNameJa = (c: FurColor) =>
  c === 'black' ? '黒' : c === 'tabby' ? 'トラ' : '三毛';

// ─── Sub-component: Segment Button ────────────────────────────────────────────

interface SegBtn {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass: string;
  inactiveClass: string;
}

function SegBtn({ label, active, onClick, activeClass, inactiveClass }: SegBtn) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 px-1 rounded-lg font-bold text-[11px] transition-all duration-200 ${active ? activeClass : inactiveClass}`}
    >
      {label}
    </button>
  );
}

// ─── Sub-component: Animated Result Panel ─────────────────────────────────────

function ResultPanel({ result, isVisible, mom, kitten, onReset }: {
  result: InferenceResult | null;
  isVisible: boolean;
  mom: CatInput;
  kitten: CatInput;
  onReset: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState('0px');

  useEffect(() => {
    if (isVisible && panelRef.current) {
      // Measure then animate
      const scrollH = panelRef.current.scrollHeight;
      setMaxH(`${scrollH + 32}px`);
    } else {
      setMaxH('0px');
    }
  }, [isVisible, result]);

  return (
    <div
      style={{ maxHeight: maxH, overflow: 'hidden', transition: 'max-height 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease' }}
      className={isVisible ? 'opacity-100' : 'opacity-0'}
    >
      <div ref={panelRef} className="bg-gray-50 border-2 border-gray-200 rounded-2xl shadow-xl p-5 flex flex-col gap-4">

        {/* Section title */}
        <div className="flex flex-col items-center gap-0.5">
          <h3 className="text-sm font-black text-gray-700 flex items-center gap-2">
            🕵️‍♂️ 推測されるパパ猫の候補
          </h3>
          <p className="text-[11px] text-gray-400 font-bold">
            ママ：{colorNameJa(mom.color)}{mom.hasWhite ? '・白斑あり' : ''}　
            子猫：{colorNameJa(kitten.color)}{kitten.hasWhite ? '・白斑あり' : ''}
          </p>
          <button
            onClick={onReset}
            className="text-[10px] text-amber-500 font-bold hover:text-amber-700 underline underline-offset-2 mt-0.5 transition-colors"
          >
            やり直す
          </button>
        </div>

        {result && result.candidates.length === 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-red-500 font-bold text-sm">
              ⚠️ この組み合わせは遺伝的に成立しない可能性があります
            </p>
          </div>
        )}

        {result && result.candidates.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {result.candidates.map((c, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl p-3 flex flex-col items-center gap-2 shadow-md border-2 transition-all duration-300 ${
                  c.certainty === 'definite'
                    ? 'border-amber-400 ring-2 ring-amber-100'
                    : 'border-slate-100'
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                    c.certainty === 'definite'
                      ? 'bg-amber-400 text-amber-900'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {c.certainty === 'definite' ? '✓ 確定' : '? 候補'}
                </span>

                <div className="w-16 h-16 drop-shadow-sm">
                  <CatSVG type="dad" color={c.color} hasWhite={c.hasWhite} />
                </div>

                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs font-black text-slate-700">
                    {colorNameJa(c.color)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    白斑 {c.hasWhite ? 'あり' : 'なし'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {result && result.notes.length > 0 && (
          <div className="bg-white/90 border border-amber-100 rounded-xl p-3 flex flex-col gap-1.5">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">🧬 遺伝の根拠</p>
            {result.notes.map((note, i) => (
              <p key={i} className="text-[11px] text-slate-600 leading-relaxed">
                • {note}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FatherProfiler() {
  const [mom, setMom] = useState<CatInput>({ color: 'calico', hasWhite: true });
  const [kitten, setKitten] = useState<CatInput>({ color: 'black', hasWhite: false });
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const updateMom = (updates: Partial<CatInput>) => {
    setMom(prev => ({ ...prev, ...updates }));
    setResult(null);
    setShowResult(false);
  };

  const updateKitten = (updates: Partial<CatInput>) => {
    setKitten(prev => ({ ...prev, ...updates }));
    setResult(null);
    setShowResult(false);
  };

  const startProfiling = () => {
    setIsCalculating(true);
    setShowResult(false);
    setResult(null);

    setTimeout(() => {
      const inferred = inferFather(mom, kitten);
      setResult(inferred);
      setIsCalculating(false);
      // Small delay so panel animation fires after state settles
      setTimeout(() => setShowResult(true), 50);
    }, 1600);
  };

  const reset = () => {
    setResult(null);
    setShowResult(false);
    setIsCalculating(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-screen-md mx-auto w-full flex flex-col gap-5">

      {/* ── Subtitle ── */}
      <div className="text-lg font-bold text-gray-700 text-center">
        子猫から犯人（父猫）の毛色を特定
      </div>

      {/* ── Input Cards ── */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch justify-center">

        {/* Mom Card */}
        <div className="flex-1 bg-pink-50 border-2 border-pink-100 rounded-2xl p-4 shadow-xl flex flex-col items-center gap-3">
          <h3 className="text-sm font-black text-pink-600">ママ猫 (Mom)</h3>

          <div className="w-20 h-20 drop-shadow-md">
            <CatSVG type="mom" color={mom.color} hasWhite={mom.hasWhite} />
          </div>

          <div className="w-full flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">毛色</label>
              <div className="flex gap-1.5">
                <SegBtn
                  label="黒"
                  active={mom.color === 'black'}
                  onClick={() => updateMom({ color: 'black' })}
                  activeClass="bg-pink-500 text-white shadow-md"
                  inactiveClass="bg-white text-pink-400 border border-pink-200 hover:bg-pink-50"
                />
                <SegBtn
                  label="トラ"
                  active={mom.color === 'tabby'}
                  onClick={() => updateMom({ color: 'tabby' })}
                  activeClass="bg-pink-500 text-white shadow-md"
                  inactiveClass="bg-white text-pink-400 border border-pink-200 hover:bg-pink-50"
                />
                <SegBtn
                  label="三毛"
                  active={mom.color === 'calico'}
                  onClick={() => updateMom({ color: 'calico' })}
                  activeClass="bg-pink-500 text-white shadow-md"
                  inactiveClass="bg-white text-pink-400 border border-pink-200 hover:bg-pink-50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-pink-400 font-bold uppercase tracking-wider">白斑</label>
              <div className="flex gap-1.5">
                <SegBtn
                  label="あり"
                  active={mom.hasWhite}
                  onClick={() => updateMom({ hasWhite: true })}
                  activeClass="bg-pink-600 text-white shadow-md"
                  inactiveClass="bg-white text-pink-400 border border-pink-200 hover:bg-pink-50"
                />
                <SegBtn
                  label="なし"
                  active={!mom.hasWhite}
                  onClick={() => updateMom({ hasWhite: false })}
                  activeClass="bg-pink-600 text-white shadow-md"
                  inactiveClass="bg-white text-pink-400 border border-pink-200 hover:bg-pink-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Plus Separator */}
        <div className="flex items-center justify-center text-amber-400 text-2xl font-black select-none">
          ＋
        </div>

        {/* Kitten Card */}
        <div className="flex-1 bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 shadow-xl flex flex-col items-center gap-3">
          <h3 className="text-sm font-black text-blue-600">
            子猫 (Kitten)
            {kitten.color === 'calico' && (
              <span className="ml-2 text-[10px] text-pink-400 font-bold">&nbsp;♀ メス確定</span>
            )}
          </h3>

          <div className="w-16 h-16 drop-shadow-md">
            <CatSVG type="kitten" color={kitten.color} hasWhite={kitten.hasWhite} />
          </div>

          <div className="w-full flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                毛色
                {kitten.color === 'calico' && (
                  <span className="ml-1 text-pink-400 normal-case font-bold">（♀ メス確定）</span>
                )}
              </label>
              <div className="flex gap-1.5">
                <SegBtn
                  label="黒"
                  active={kitten.color === 'black'}
                  onClick={() => updateKitten({ color: 'black' })}
                  activeClass="bg-blue-500 text-white shadow-md"
                  inactiveClass="bg-white text-blue-400 border border-blue-200 hover:bg-blue-50"
                />
                <SegBtn
                  label="トラ"
                  active={kitten.color === 'tabby'}
                  onClick={() => updateKitten({ color: 'tabby' })}
                  activeClass="bg-blue-500 text-white shadow-md"
                  inactiveClass="bg-white text-blue-400 border border-blue-200 hover:bg-blue-50"
                />
                <SegBtn
                  label="三毛"
                  active={kitten.color === 'calico'}
                  onClick={() => updateKitten({ color: 'calico' })}
                  activeClass="bg-blue-500 text-white shadow-md"
                  inactiveClass="bg-white text-blue-400 border border-blue-200 hover:bg-blue-50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">白斑</label>
              <div className="flex gap-1.5">
                <SegBtn
                  label="あり"
                  active={kitten.hasWhite}
                  onClick={() => updateKitten({ hasWhite: true })}
                  activeClass="bg-blue-600 text-white shadow-md"
                  inactiveClass="bg-white text-blue-400 border border-blue-200 hover:bg-blue-50"
                />
                <SegBtn
                  label="なし"
                  active={!kitten.hasWhite}
                  onClick={() => updateKitten({ hasWhite: false })}
                  activeClass="bg-blue-600 text-white shadow-md"
                  inactiveClass="bg-white text-blue-400 border border-blue-200 hover:bg-blue-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Button ── */}
      <div className="flex flex-col items-center gap-2">
        {!showResult && !isCalculating && (
          <p className="text-[11px] text-amber-500/80 font-bold">
            証拠品（ママ猫・子猫）を登録したらプロファイリング開始！
          </p>
        )}
        {isCalculating ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="w-14 h-14 drop-shadow-xl">
              <CatSVG type="dad" color="black" hasWhite={false} headOnly />
            </div>
            <span className="text-base font-black text-amber-600 animate-bounce">遺伝子を解析中…</span>
            <span className="text-xs text-amber-400 font-bold">パパ猫の手がかりを調べています</span>
          </div>
        ) : (
          <button
            id="profiling-btn"
            onClick={startProfiling}
            disabled={showResult}
            className={`animate-pulse bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-yellow-900 font-black py-3 px-10 rounded-full shadow-lg shadow-yellow-200 transform hover:scale-105 transition-all text-sm ${showResult ? 'opacity-50 cursor-not-allowed animate-none' : ''}`}
          >
            🔍 パパ猫をプロファイリング！
          </button>
        )}
      </div>

      {/* ── Result Panel (animated) ── */}
      <ResultPanel
        result={result}
        isVisible={showResult}
        mom={mom}
        kitten={kitten}
        onReset={reset}
      />
    </div>
  );
}
