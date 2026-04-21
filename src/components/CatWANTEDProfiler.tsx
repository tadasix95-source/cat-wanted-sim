import React, { useState } from 'react';
import type { Color } from '../utils/genetics';
import CatSVG from './CatSVG';

// ─── Types ────────────────────────────────────────────────────────────────────

type FurColor = 'black' | 'tabby' | 'calico' | 'sabi';

interface CatInput {
  color: FurColor;
  hasWhite: boolean;
}

interface FatherCandidate {
  color: 'black' | 'tabby';
  hasWhite: boolean;
  probability: number;
  certainty: 'definite' | 'possible';
}

interface InferenceResult {
  candidates: FatherCandidate[];
  notes: string[];
  isImpossible: boolean;
}

// ─── Genetics Engine (Bayesian) ───────────────────────────────────────────────

function momXAlleles(color: FurColor): ('O' | 'o')[] {
  if (color === 'black') return ['o'];
  if (color === 'tabby') return ['O'];
  return ['O', 'o']; // calico / sabi = X^O X^o
}

function colorFromPair(a: string, b: string): FurColor {
  if (a === 'Y' || b === 'Y') {
    const x = a === 'Y' ? b : a;
    return x === 'O' ? 'tabby' : 'black';
  }
  if (a === 'O' && b === 'O') return 'tabby';
  if (a === 'o' && b === 'o') return 'black';
  return 'calico'; // X^O X^o ← genotype for calico AND sabi
}

function oLikelihood(
  momColor: FurColor,
  kittenColor: FurColor,
  dadColor: 'black' | 'tabby'
): number {
  const ma = momXAlleles(momColor);
  const dadX = dadColor === 'black' ? 'o' : 'O';
  const femaleOnly = kittenColor === 'calico' || kittenColor === 'sabi';
  const kittenBase = kittenColor === 'sabi' ? 'calico' : kittenColor;

  let total = 0;
  const sexes: ('m' | 'f')[] = femaleOnly ? ['f'] : ['m', 'f'];

  for (const sex of sexes) {
    const sw = femaleOnly ? 1.0 : 0.5;
    for (const mAllele of ma) {
      const mw = 1 / ma.length;
      const phenotype =
        sex === 'm'
          ? colorFromPair(mAllele, 'Y')
          : colorFromPair(mAllele, dadX);
      const phenoBase = phenotype === 'sabi' ? 'calico' : phenotype;
      if (phenoBase === kittenBase) total += sw * mw;
    }
  }
  return total;
}

function sLikelihood(
  momHasWhite: boolean,
  kittenHasWhite: boolean,
  dadHasWhite: boolean
): number {
  const ms = momHasWhite ? ['S', 's'] : ['s', 's'];
  const ds = dadHasWhite ? ['S', 's'] : ['s', 's'];
  let match = 0;
  for (const m of ms) {
    for (const d of ds) {
      if ((m === 'S' || d === 'S') === kittenHasWhite) match++;
    }
  }
  return match / (ms.length * ds.length);
}

function inferFather(mom: CatInput, kitten: CatInput): InferenceResult {
  const notes: string[] = [];

  if (kitten.color === 'calico') {
    notes.push('三毛はメスのみ (X^O X^o + 白斑あり)。');
  } else if (kitten.color === 'sabi') {
    notes.push('サビはメスのみ (X^O X^o、白斑なし)。');
  }

  const raw = new Map<string, number>();

  for (const color of ['black', 'tabby'] as const) {
    const ol = oLikelihood(mom.color, kitten.color, color);
    if (ol <= 0) continue;
    for (const white of [false, true]) {
      const sl = sLikelihood(mom.hasWhite, kitten.hasWhite, white);
      const j = ol * sl;
      if (j > 0.0005) raw.set(`${color}-${white}`, j);
    }
  }

  if (raw.size === 0) {
    notes.push('⚠️ この組み合わせは遺伝的に成立しません。入力をご確認ください。');
    return { candidates: [], notes, isImpossible: true };
  }

  const sum = [...raw.values()].reduce((a, b) => a + b, 0);
  const candidates: FatherCandidate[] = [...raw.entries()]
    .map(([key, v]) => {
      const [c, w] = key.split('-');
      const prob = v / sum;
      return {
        color: c as 'black' | 'tabby',
        hasWhite: w === 'true',
        probability: prob,
        certainty: (prob >= 0.94 ? 'definite' : 'possible') as 'definite' | 'possible',
      };
    })
    .sort((a, b) => b.probability - a.probability);

  if (kitten.hasWhite && !mom.hasWhite) {
    notes.push('子猫に白斑あり・ママなし → パパに白斑あり確定。');
  } else if (kitten.hasWhite && mom.hasWhite) {
    notes.push('子猫・ママ共に白斑あり → パパの白斑は確率次第。');
  } else if (!kitten.hasWhite && !mom.hasWhite) {
    notes.push('子猫・ママ共に白斑なし → パパに白斑がある確率はやや低め。');
  } else if (!kitten.hasWhite && mom.hasWhite) {
    notes.push('子猫に白斑なし・ママあり → パパの白斑の有無は不確定。');
  }

  return { candidates, notes, isImpossible: false };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COLOR_NAMES: Record<FurColor, string> = {
  black: '黒',
  tabby: 'トラ',
  calico: '三毛',
  sabi: 'サビ',
};

const toSVGColor = (c: FurColor): Color =>
  (c === 'sabi' ? 'calico' : c) as Color;

// ─── SegBtn ───────────────────────────────────────────────────────────────────

interface SegBtnProps {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass: string;
  inactiveClass: string;
}

function SegBtn({ label, active, onClick, activeClass, inactiveClass }: SegBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-[3px] rounded text-[8px] font-bold transition-all duration-150 ${
        active ? activeClass : inactiveClass
      }`}
    >
      {label}
    </button>
  );
}

// ─── InputCard ────────────────────────────────────────────────────────────────

interface InputCardProps {
  title: string;
  femaleOnly: boolean;
  catType: 'mom' | 'kitten';
  input: CatInput;
  onUpdate: (u: Partial<CatInput>) => void;
  scheme: {
    bg: string;
    border: string;
    title: string;
    active: string;
    activeWhite: string;
    inactive: string;
    label: string;
  };
}

function InputCard({ title, femaleOnly, catType, input, onUpdate, scheme }: InputCardProps) {
  const colors: FurColor[] = ['black', 'tabby', 'calico', 'sabi'];
  return (
    <div className={`${scheme.bg} border ${scheme.border} rounded-xl p-1.5 shadow flex flex-col items-center gap-1`}>
      <h3 className={`text-[9px] font-black ${scheme.title} flex items-center gap-0.5`}>
        {title}
        {femaleOnly && (
          <span className="text-[7px] text-pink-400 font-bold">♀ メス確定</span>
        )}
      </h3>

      {/* Cat illustration */}
      <div className={`${catType === 'kitten' ? 'w-7 h-7' : 'w-8 h-8'} drop-shadow`}>
        <CatSVG type={catType} color={toSVGColor(input.color)} hasWhite={input.hasWhite} />
      </div>

      <div className="w-full flex flex-col gap-1">
        {/* Color */}
        <div>
          <p className={`text-[7px] ${scheme.label} font-bold uppercase tracking-wider mb-0.5`}>毛色</p>
          <div className="flex gap-0.5">
            {colors.map((c) => (
              <SegBtn
                key={c}
                label={COLOR_NAMES[c]}
                active={input.color === c}
                onClick={() => onUpdate({ color: c })}
                activeClass={scheme.active}
                inactiveClass={scheme.inactive}
              />
            ))}
          </div>
        </div>
        {/* White spot */}
        <div>
          <p className={`text-[7px] ${scheme.label} font-bold uppercase tracking-wider mb-0.5`}>白斑</p>
          <div className="flex gap-0.5">
            <SegBtn label="あり" active={input.hasWhite} onClick={() => onUpdate({ hasWhite: true })} activeClass={scheme.activeWhite} inactiveClass={scheme.inactive} />
            <SegBtn label="なし" active={!input.hasWhite} onClick={() => onUpdate({ hasWhite: false })} activeClass={scheme.activeWhite} inactiveClass={scheme.inactive} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WantedCard ───────────────────────────────────────────────────────────────

interface WantedCardProps {
  candidate: FatherCandidate;
  rank: number;
}

function WantedCard({ candidate, rank }: WantedCardProps) {
  const pct = Math.round(candidate.probability * 100);
  const isDef = candidate.certainty === 'definite';

  return (
    <div
      className={`relative flex flex-col items-center rounded-lg overflow-hidden border-2 shadow-md ${
        isDef
          ? 'border-amber-400 bg-gradient-to-b from-amber-50 to-orange-50'
          : 'border-slate-200 bg-white'
      }`}
      style={{ minWidth: 0 }}
    >
      {/* Aged paper texture strip */}
      <div
        className="w-full text-center py-0.5"
        style={{
          background: isDef
            ? 'linear-gradient(135deg, #92400e, #b45309)'
            : 'linear-gradient(135deg, #475569, #334155)',
        }}
      >
        <span className="text-[7px] font-black text-amber-100 tracking-widest uppercase">
          #{rank + 1} Suspect
        </span>
      </div>

      {/* Cat illustration + WANTED! stamp */}
      <div className="relative w-full flex justify-center" style={{ paddingTop: '4px', paddingBottom: '2px' }}>
        <div className="w-11 h-11 drop-shadow-sm">
          <CatSVG type="dad" color={candidate.color} hasWhite={candidate.hasWhite} />
        </div>

        {/* WANTED! stamp overlay */}
        <div
          className="absolute inset-0 flex items-start justify-center pointer-events-none"
          style={{ paddingTop: '2px' }}
        >
          <span
            style={{
              fontFamily: '"Impact", "Arial Black", sans-serif',
              fontSize: '11px',
              fontWeight: 900,
              color: '#dc2626',
              textShadow: '0 0 1px #7f1d1d, 1px 1px 0 #7f1d1d',
              letterSpacing: '0.05em',
              transform: 'rotate(-8deg)',
              display: 'inline-block',
              opacity: 0.85,
              lineHeight: 1,
              border: '1.5px solid #dc2626',
              padding: '1px 3px',
            }}
          >
            WANTED!
          </span>
        </div>
      </div>

      {/* 犯ニャン確率 */}
      <div className="w-full px-1.5 pb-0.5 flex flex-col items-center gap-0.5">
        <span
          className={`text-[9px] font-black ${isDef ? 'text-amber-700' : 'text-slate-600'}`}
        >
          犯ニャン確率 {pct}%
        </span>

        {/* Probability bar */}
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isDef ? 'bg-amber-400' : 'bg-slate-300'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Cat description */}
        <span className="text-[8px] font-bold text-slate-700 mt-0.5">
          {candidate.color === 'black' ? '黒猫' : 'トラ猫'}
          {candidate.hasWhite ? '・白斑あり' : ''}
        </span>

        {isDef && (
          <span className="text-[7px] bg-amber-400 text-amber-900 font-black px-1.5 rounded-full mb-0.5">
            ✓ ほぼ確定
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CatWANTEDProfiler() {
  const [mom, setMom] = useState<CatInput>({ color: 'calico', hasWhite: true });
  const [kitten, setKitten] = useState<CatInput>({ color: 'black', hasWhite: false });
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [show, setShow] = useState(false);

  const updateMom = (u: Partial<CatInput>) => {
    setMom((p) => ({ ...p, ...u }));
    setShow(false);
    setResult(null);
  };
  const updateKitten = (u: Partial<CatInput>) => {
    setKitten((p) => ({ ...p, ...u }));
    setShow(false);
    setResult(null);
  };

  const run = () => {
    setCalculating(true);
    setShow(false);
    setResult(null);
    setTimeout(() => {
      const r = inferFather(mom, kitten);
      setResult(r);
      setCalculating(false);
      requestAnimationFrame(() => setTimeout(() => setShow(true), 30));
    }, 700);
  };

  const reset = () => {
    setShow(false);
    setTimeout(() => setResult(null), 300);
  };

  const momScheme = {
    bg: 'bg-pink-50',
    border: 'border-pink-100',
    title: 'text-pink-600',
    active: 'bg-pink-500 text-white shadow-sm',
    activeWhite: 'bg-pink-600 text-white shadow-sm',
    inactive: 'bg-white text-pink-400 border border-pink-200 hover:bg-pink-50',
    label: 'text-pink-400',
  };
  const kittenScheme = {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    title: 'text-blue-600',
    active: 'bg-blue-500 text-white shadow-sm',
    activeWhite: 'bg-blue-600 text-white shadow-sm',
    inactive: 'bg-white text-blue-400 border border-blue-200 hover:bg-blue-50',
    label: 'text-blue-400',
  };

  const femaleOnly = kitten.color === 'calico' || kitten.color === 'sabi';
  const candidateCount = result?.candidates.length ?? 0;

  return (
    <div
      className="w-full flex flex-col gap-1.5"
      style={{ maxHeight: '100vh', overflow: 'hidden' }}
    >
      {/* ── Subtitle ── */}
      <p className="text-center text-[11px] font-bold text-gray-600 leading-tight">
        子猫の毛色から犯人（父猫）を割り出せ！
      </p>

      {/* ── Input Row ── */}
      <div className="grid grid-cols-2 gap-2">
        <InputCard
          title="ママ猫 (Mom)"
          femaleOnly={false}
          catType="mom"
          input={mom}
          onUpdate={updateMom}
          scheme={momScheme}
        />
        <InputCard
          title="子猫 (Kitten)"
          femaleOnly={femaleOnly}
          catType="kitten"
          input={kitten}
          onUpdate={updateKitten}
          scheme={kittenScheme}
        />
      </div>

      {/* ── Run / Loading ── */}
      <div className="flex justify-center items-center" style={{ height: '30px' }}>
        {calculating ? (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6">
              <CatSVG type="dad" color="black" hasWhite={false} headOnly />
            </div>
            <span className="text-[11px] font-black text-amber-600 animate-bounce">
              解析中…🔍
            </span>
          </div>
        ) : (
          <button
            id="wanted-run-btn"
            onClick={show ? reset : run}
            className={`font-black py-1 px-5 rounded-full text-[11px] transition-all duration-200 active:scale-95 shadow-sm ${
              show
                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-yellow-200 animate-pulse hover:scale-105'
            }`}
          >
            {show ? '↩ 再プロファイリング' : '🔍 パパ猫を指名手配！'}
          </button>
        )}
      </div>

      {/* ── Result Panel ── */}
      <div
        style={{
          maxHeight: show ? '400px' : '0px',
          opacity: show ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease',
          flexShrink: 0,
        }}
      >
        {result && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 shadow-lg flex flex-col gap-1.5">

            {/* Header */}
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-[10px] font-black text-gray-700 flex items-center gap-0.5">
                🕵️‍♂️ 指名手配リスト
              </h3>
              <p className="text-[8px] text-gray-400 font-bold">
                ママ：{COLOR_NAMES[mom.color]}{mom.hasWhite ? '・白斑' : ''}　
                子猫：{COLOR_NAMES[kitten.color]}{kitten.hasWhite ? '・白斑' : ''}
              </p>
            </div>

            {/* Impossible */}
            {result.isImpossible && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-1.5 text-center">
                <p className="text-red-500 font-bold text-[10px]">
                  ⚠️ この組み合わせは遺伝的に成立しません
                </p>
              </div>
            )}

            {/* Candidate Cards */}
            {!result.isImpossible && candidateCount > 0 && (
              <div
                className={`grid gap-1.5 ${
                  candidateCount <= 2
                    ? 'grid-cols-2'
                    : candidateCount === 3
                    ? 'grid-cols-3'
                    : 'grid-cols-4'
                }`}
              >
                {result.candidates.map((c, i) => (
                  <WantedCard key={i} candidate={c} rank={i} />
                ))}
              </div>
            )}

            {/* Notes */}
            {result.notes.length > 0 && (
              <div className="bg-white/90 border border-amber-100 rounded-lg p-1.5">
                <p className="text-[8px] font-black text-amber-600 uppercase tracking-wider mb-0.5">
                  🧬 遺伝の根拠
                </p>
                {result.notes.map((note, i) => (
                  <p key={i} className="text-[8px] text-slate-600 leading-snug">
                    • {note}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
