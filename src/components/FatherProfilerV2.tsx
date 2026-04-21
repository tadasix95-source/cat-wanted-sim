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
  probability: number; // 0-1, normalized
  certainty: 'definite' | 'possible';
}

interface InferenceResult {
  candidates: FatherCandidate[];
  notes: string[];
  isImpossible: boolean;
}

// ─── Genetics Engine (Bayesian) ───────────────────────────────────────────────

/**
 * Mom's possible X-chromosome O-alleles.
 * calico / sabi share the same X^O X^o genotype.
 */
function momXAlleles(color: FurColor): ('O' | 'o')[] {
  if (color === 'black') return ['o'];
  if (color === 'tabby') return ['O'];
  return ['O', 'o']; // calico / sabi = X^O X^o
}

/** Phenotype from two alleles (one may be 'Y' for male). */
function colorFromPair(a: string, b: string): FurColor {
  if (a === 'Y' || b === 'Y') {
    const x = a === 'Y' ? b : a;
    return x === 'O' ? 'tabby' : 'black';
  }
  if (a === 'O' && b === 'O') return 'tabby';
  if (a === 'o' && b === 'o') return 'black';
  return 'calico'; // X^O X^o ← same genotype for calico AND sabi
}

/**
 * P(kittenColorObserved | momColor, dadColor)
 * Calico / sabi kittens are definitely female; others assume 50/50 sex.
 */
function oLikelihood(
  momColor: FurColor,
  kittenColor: FurColor,
  dadColor: 'black' | 'tabby'
): number {
  const ma = momXAlleles(momColor);
  const dadX = dadColor === 'black' ? 'o' : 'O';
  const femaleOnly = kittenColor === 'calico' || kittenColor === 'sabi';
  // Normalize calico ↔ sabi for genotype matching
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
      // Both calico and sabi map to 'calico' genotype
      const phenoBase = phenotype === 'sabi' ? 'calico' : phenotype;
      if (phenoBase === kittenBase) total += sw * mw;
    }
  }
  return total;
}

/**
 * P(kittenHasWhite | momHasWhite, dadHasWhite)
 * Simplified S-gene model: hasWhite parent = heterozygous Ss.
 */
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

/** Full Bayesian inference: normalize joint likelihoods over all dad genotypes. */
function inferFather(mom: CatInput, kitten: CatInput): InferenceResult {
  const notes: string[] = [];

  if (kitten.color === 'calico') {
    notes.push('三毛はメスのみ (X^O X^o + 白斑あり)。');
  } else if (kitten.color === 'sabi') {
    notes.push('サビはメスのみ (X^O X^o、白斑なし)。');
  }

  // Compute raw joint likelihoods for each (dadColor × dadWhite) combination
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
    notes.push(
      '⚠️ この組み合わせは遺伝的に成立しません。入力をご確認ください。'
    );
    return { candidates: [], notes, isImpossible: true };
  }

  // Normalize
  const sum = [...raw.values()].reduce((a, b) => a + b, 0);
  const candidates: FatherCandidate[] = [...raw.entries()]
    .map(([key, v]) => {
      const [c, w] = key.split('-');
      const prob = v / sum;
      return {
        color: c as 'black' | 'tabby',
        hasWhite: w === 'true',
        probability: prob,
        certainty: (prob >= 0.94 ? 'definite' : 'possible') as
          | 'definite'
          | 'possible',
      };
    })
    .sort((a, b) => b.probability - a.probability);

  // Add S-gene interpretive notes
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

/** CatSVG only accepts Color = 'black'|'tabby'|'calico'; map sabi → calico. */
const toSVGColor = (c: FurColor): Color =>
  (c === 'sabi' ? 'calico' : c) as Color;

// ─── Sub-components ───────────────────────────────────────────────────────────

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
      className={`flex-1 py-[5px] rounded-lg font-bold text-[9px] transition-all duration-150 ${
        active ? activeClass : inactiveClass
      }`}
    >
      {label}
    </button>
  );
}

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
    <div
      className={`${scheme.bg} border ${scheme.border} rounded-2xl p-2.5 shadow-lg flex flex-col items-center gap-1.5`}
    >
      <h3 className={`text-[11px] font-black ${scheme.title} flex items-center gap-1`}>
        {title}
        {femaleOnly && (
          <span className="text-[9px] text-pink-400 font-bold">♀ メス確定</span>
        )}
      </h3>

      <div className={`${catType === 'kitten' ? 'w-9 h-9' : 'w-11 h-11'} drop-shadow-md`}>
        <CatSVG type={catType} color={toSVGColor(input.color)} hasWhite={input.hasWhite} />
      </div>

      <div className="w-full flex flex-col gap-1.5">
        {/* Color */}
        <div>
          <p className={`text-[8px] ${scheme.label} font-bold uppercase tracking-wider mb-0.5`}>
            毛色
          </p>
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
        {/* White */}
        <div>
          <p className={`text-[8px] ${scheme.label} font-bold uppercase tracking-wider mb-0.5`}>
            白斑
          </p>
          <div className="flex gap-0.5">
            <SegBtn
              label="あり"
              active={input.hasWhite}
              onClick={() => onUpdate({ hasWhite: true })}
              activeClass={scheme.activeWhite}
              inactiveClass={scheme.inactive}
            />
            <SegBtn
              label="なし"
              active={!input.hasWhite}
              onClick={() => onUpdate({ hasWhite: false })}
              activeClass={scheme.activeWhite}
              inactiveClass={scheme.inactive}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Probability Bar ──────────────────────────────────────────────────────────

function ProbBar({ prob, isDefinite }: { prob: number; isDefinite: boolean }) {
  const pct = Math.round(prob * 100);
  return (
    <div className="w-full flex flex-col items-center gap-0.5 mt-0.5">
      <span
        className={`text-[9px] font-black tabular-nums ${
          isDefinite ? 'text-amber-500' : 'text-slate-400'
        }`}
      >
        {pct}%
      </span>
      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isDefinite ? 'bg-amber-400' : 'bg-slate-300'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FatherProfilerV2() {
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
      // small rAF delay so CSS transition fires after mount
      requestAnimationFrame(() => setTimeout(() => setShow(true), 30));
    }, 900);
  };

  const reset = () => {
    setShow(false);
    setTimeout(() => setResult(null), 400); // wait for fade-out
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

  const femaleOnly =
    kitten.color === 'calico' || kitten.color === 'sabi';

  return (
    <div className="flex flex-col gap-2.5 w-full">

      {/* ── Subtitle ── */}
      <p className="text-center text-sm font-bold text-gray-700">
        子猫から犯人（父猫）の毛色を特定
      </p>

      {/* ── Input Cards ── */}
      <div className="grid grid-cols-2 gap-3">
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

      {/* ── Action ── */}
      <div className="flex justify-center items-center min-h-[40px]">
        {calculating ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 drop-shadow-md">
              <CatSVG type="dad" color="black" hasWhite={false} headOnly />
            </div>
            <span className="text-sm font-black text-amber-600 animate-bounce">
              解析中…
            </span>
          </div>
        ) : (
          <button
            id="profiling-btn-v2"
            onClick={run}
            disabled={show}
            className={`bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-yellow-900 font-black py-2 px-8 rounded-full shadow-md shadow-yellow-200 text-sm transition-all duration-200 ${
              show
                ? 'opacity-50 cursor-not-allowed'
                : 'animate-pulse hover:scale-105'
            }`}
          >
            🔍 パパ猫をプロファイリング！
          </button>
        )}
      </div>

      {/* ── Result Panel (fade + slide-down) ── */}
      <div
        style={{
          maxHeight: show ? '520px' : '0px',
          opacity: show ? 1 : 0,
          overflow: 'hidden',
          transition:
            'max-height 0.55s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease',
        }}
      >
        {result && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 shadow-xl flex flex-col gap-2.5">

            {/* Header row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-[11px] font-black text-gray-700 flex items-center gap-1">
                🕵️‍♂️ 推測されるパパ猫の候補
              </h3>
              <button
                onClick={reset}
                className="text-[9px] text-amber-600 font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full px-2.5 py-0.5 transition-colors whitespace-nowrap"
              >
                ↩ 条件を変えて再プロファイリング
              </button>
            </div>

            {/* Input summary badge */}
            <p className="text-[9px] text-gray-400 font-bold -mt-1">
              ママ：{COLOR_NAMES[mom.color]}
              {mom.hasWhite ? '・白斑あり' : ''}　
              子猫：{COLOR_NAMES[kitten.color]}
              {kitten.hasWhite ? '・白斑あり' : ''}
            </p>

            {/* Impossible */}
            {result.isImpossible && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2 text-center">
                <p className="text-red-500 font-bold text-xs">
                  ⚠️ この組み合わせは遺伝的に成立しません
                </p>
              </div>
            )}

            {/* Candidate Cards */}
            {!result.isImpossible && result.candidates.length > 0 && (
              <div
                className={`grid gap-2 ${
                  result.candidates.length <= 2
                    ? 'grid-cols-2'
                    : result.candidates.length === 3
                    ? 'grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-4'
                }`}
              >
                {result.candidates.map((c, i) => {
                  const pct = Math.round(c.probability * 100);
                  const isDef = c.certainty === 'definite';
                  return (
                    <div
                      key={i}
                      className={`bg-white rounded-xl p-2 flex flex-col items-center gap-1 shadow-sm border-2 ${
                        isDef
                          ? 'border-amber-400 ring-2 ring-amber-100'
                          : 'border-slate-100'
                      }`}
                    >
                      {/* Badge */}
                      <span
                        className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                          isDef
                            ? 'bg-amber-400 text-amber-900'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isDef ? '✓ 確定' : '? 候補'}
                      </span>

                      {/* Cat Illustration */}
                      <div className="w-10 h-10 drop-shadow-sm">
                        <CatSVG type="dad" color={c.color} hasWhite={c.hasWhite} />
                      </div>

                      {/* Labels */}
                      <span className="text-[10px] font-black text-slate-700">
                        {c.color === 'black' ? '黒' : 'トラ'}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        白斑{c.hasWhite ? 'あり' : 'なし'}
                      </span>

                      {/* Probability */}
                      <ProbBar prob={c.probability} isDefinite={isDef} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Genetic Notes */}
            {result.notes.length > 0 && (
              <div className="bg-white/90 border border-amber-100 rounded-xl p-2 flex flex-col gap-1">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider">
                  🧬 遺伝の根拠
                </p>
                {result.notes.map((note, i) => (
                  <p key={i} className="text-[10px] text-slate-600 leading-relaxed">
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
