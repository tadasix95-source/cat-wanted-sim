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
  return 'calico';
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
        sex === 'm' ? colorFromPair(mAllele, 'Y') : colorFromPair(mAllele, dadX);
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
  for (const m of ms)
    for (const d of ds)
      if ((m === 'S' || d === 'S') === kittenHasWhite) match++;
  return match / (ms.length * ds.length);
}

function inferFather(mom: CatInput, kitten: CatInput): InferenceResult {
  const notes: string[] = [];
  if (kitten.color === 'calico') notes.push('三毛はメスのみ (X^O X^o + 白斑あり)。');
  else if (kitten.color === 'sabi') notes.push('サビはメスのみ (X^O X^o、白斑なし)。');

  const raw = new Map<string, number>();
  for (const color of ['black', 'tabby'] as const) {
    const ol = oLikelihood(mom.color, kitten.color, color);
    if (ol <= 0) continue;
    for (const white of [false, true]) {
      const j = ol * sLikelihood(mom.hasWhite, kitten.hasWhite, white);
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

  if (kitten.hasWhite && !mom.hasWhite)
    notes.push('子猫に白斑あり・ママなし → パパに白斑あり確定。');
  else if (kitten.hasWhite && mom.hasWhite)
    notes.push('子猫・ママ共に白斑あり → パパの白斑は確率次第。');
  else if (!kitten.hasWhite && !mom.hasWhite)
    notes.push('子猫・ママ共に白斑なし → パパに白斑がある確率はやや低め。');
  else if (!kitten.hasWhite && mom.hasWhite)
    notes.push('子猫に白斑なし・ママあり → パパの白斑の有無は不確定。');

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

/**
 * 毛色 × 白斑パターンからそれっぽい日本語名を返す。
 * rank でプール内をローテーション（同じ組み合わせが複数出た場合に被らない）。
 */
const CAT_NAMES: Record<string, string[]> = {
  'black-false': ['くろすけ', 'くろまる', 'やみぞう', 'くろべえ', 'すみきち'],
  'black-true':  ['はちわれ次郎', 'パンダ兵衛', 'ごまお', 'まだらぞう', 'しらひげ'],
  'tabby-false': ['とらきち', 'もんた', 'しまじろう', 'とら丸', 'しまぞう'],
  'tabby-true':  ['ぶちとら', 'とらしろ', 'ぶち兵衛', 'はなとら', 'まだらとら'],
};

function getCatName(color: 'black' | 'tabby', hasWhite: boolean, rank: number): string {
  const key = `${color}-${hasWhite}`;
  const pool = CAT_NAMES[key] ?? ['なぞの猫'];
  return pool[rank % pool.length];
}

// ─── SegBtn ───────────────────────────────────────────────────────────────────

interface SegBtnProps {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass: string;
  inactiveClass: string;
  disabled?: boolean;
}

function SegBtn({ label, active, onClick, activeClass, inactiveClass, disabled = false }: SegBtnProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? '※ この組み合わせは遺伝的に不可' : undefined}
      className={`flex-1 py-1 rounded-md text-xs font-bold transition-all duration-150 ${
        disabled
          ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
          : active
          ? activeClass
          : inactiveClass
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

  // ── Color selection handler: auto-correct hasWhite for sabi/calico ──
  const handleColorChange = (c: FurColor) => {
    if (c === 'sabi')   { onUpdate({ color: c, hasWhite: false }); return; }
    if (c === 'calico') { onUpdate({ color: c, hasWhite: true  }); return; }
    onUpdate({ color: c });
  };

  // ── White-spot selection handler: auto-switch between sabi/calico ──
  const handleWhiteChange = (w: boolean) => {
    // 白斑あり → サビなら三毛に自動切り替え
    if (w && input.color === 'sabi') { onUpdate({ color: 'calico', hasWhite: true }); return; }
    // 白斑なし → 三毛ならサビに自動切り替え
    if (!w && input.color === 'calico') { onUpdate({ color: 'sabi', hasWhite: false }); return; }
    onUpdate({ hasWhite: w });
  };

  return (
    <div
      className={`${scheme.bg} border-2 ${scheme.border} rounded-2xl p-3 shadow-md flex flex-col items-center gap-2`}
    >
      {/* Title */}
      <h3 className={`text-[11px] font-black ${scheme.title} flex items-center gap-1`}>
        {title}
        {femaleOnly && (
          <span className="text-[9px] text-pink-400 font-bold">♀ メス確定</span>
        )}
      </h3>

      {/* Cat illustration */}
      <div className={`${catType === 'kitten' ? 'w-14 h-14' : 'w-16 h-16'} drop-shadow-md`}>
        <CatSVG type={catType} color={toSVGColor(input.color)} hasWhite={input.hasWhite} />
      </div>

      <div className="w-full flex flex-col gap-2">
        {/* Color selector */}
        <div>
          <p className={`text-[9px] ${scheme.label} font-black uppercase tracking-widest mb-1`}>
            毛色
          </p>
          <div className="flex gap-1">
            {colors.map((c) => (
              <SegBtn
                key={c}
                label={COLOR_NAMES[c]}
                active={input.color === c}
                onClick={() => handleColorChange(c)}
                activeClass={scheme.active}
                inactiveClass={scheme.inactive}
              />
            ))}
          </div>
        </div>
        {/* White spot selector */}
        <div>
          <p className={`text-[9px] ${scheme.label} font-black uppercase tracking-widest mb-1`}>
            白斑
          </p>
          <div className="flex gap-1">
            <SegBtn
              label="あり"
              active={input.hasWhite}
              onClick={() => handleWhiteChange(true)}
              activeClass={scheme.activeWhite}
              inactiveClass={scheme.inactive}
            />
            <SegBtn
              label="なし"
              active={!input.hasWhite}
              onClick={() => handleWhiteChange(false)}
              activeClass={scheme.activeWhite}
              inactiveClass={scheme.inactive}
            />
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
      className={`relative flex flex-col items-center rounded-xl overflow-hidden border-2 shadow-lg transition-transform hover:scale-[1.02] ${
        isDef
          ? 'border-amber-400 bg-gradient-to-b from-amber-50 to-orange-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Header strip — cat name */}
      <div
        className="w-full text-center py-1 px-1"
        style={{
          background: isDef
            ? 'linear-gradient(135deg, #92400e, #b45309)'
            : 'linear-gradient(135deg, #475569, #334155)',
        }}
      >
        <span className="text-[10px] font-black text-amber-100 tracking-wide">
          {getCatName(candidate.color, candidate.hasWhite, rank)}
        </span>
      </div>

      {/* Cat illustration + WANTED! stamp */}
      <div className="relative w-full flex justify-center py-2">
        <div className="w-16 h-16 drop-shadow">
          <CatSVG type="dad" color={candidate.color} hasWhite={candidate.hasWhite} />
        </div>

        {/* WANTED! stamp — rotated, red, stencil style */}
        <div
          className="absolute inset-0 flex items-start justify-center pointer-events-none"
          style={{ paddingTop: '6px' }}
        >
          <span
            style={{
              fontFamily: '"Impact", "Arial Black", sans-serif',
              fontSize: '14px',
              fontWeight: 900,
              color: '#dc2626',
              textShadow: '0 0 2px #7f1d1d',
              letterSpacing: '0.08em',
              transform: 'rotate(-10deg)',
              display: 'inline-block',
              opacity: 0.82,
              lineHeight: 1,
              border: '2px solid #dc2626',
              borderRadius: '2px',
              padding: '1px 5px',
            }}
          >
            WANTED!
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="w-full px-2.5 pb-2 flex flex-col items-center gap-1">
        {/* 犯ニャン確率 — prominent */}
        <span
          className="text-sm font-black leading-tight"
          style={{ color: isDef ? '#c2410c' : '#64748b' }}
        >
          犯ニャン確率 {pct}%
        </span>

        {/* Probability bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: isDef
                ? 'linear-gradient(90deg, #f59e0b, #ea580c)'
                : '#cbd5e1',
            }}
          />
        </div>

        {/* Cat description */}
        <span className="text-[10px] font-bold text-slate-700">
          {candidate.color === 'black' ? '黒猫' : 'トラ猫'}
          {candidate.hasWhite ? '・白斑あり' : ''}
        </span>

        {isDef && (
          <span className="text-[9px] bg-amber-400 text-amber-900 font-black px-2 py-0.5 rounded-full">
            ✓ ほぼ確定
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CatWANTEDProfilerV3() {
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
    setTimeout(() => setResult(null), 350);
  };

  const momScheme = {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    title: 'text-pink-600',
    active: 'bg-pink-500 text-white shadow-sm',
    activeWhite: 'bg-pink-600 text-white shadow-sm',
    inactive: 'bg-white text-pink-400 border border-pink-200 hover:bg-pink-50',
    label: 'text-pink-400',
  };
  const kittenScheme = {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    title: 'text-blue-600',
    active: 'bg-blue-500 text-white shadow-sm',
    activeWhite: 'bg-blue-600 text-white shadow-sm',
    inactive: 'bg-white text-blue-400 border border-blue-200 hover:bg-blue-50',
    label: 'text-blue-400',
  };

  const femaleOnly = kitten.color === 'calico' || kitten.color === 'sabi';

  // Show at most 3 top candidates; group remainder
  const displayCandidates = result?.candidates.slice(0, 3) ?? [];
  const restCandidates = result?.candidates.slice(3) ?? [];

  return (
    // Full-height flex column; justify-between for natural vertical rhythm
    <div className="w-full h-full flex flex-col justify-between gap-3">

      {/* ── Subtitle ── */}
      <p className="text-center text-sm font-bold text-gray-500 leading-tight">
        子猫の毛色から犯人（父猫）を割り出せ！
      </p>

      {/* ── Input Cards ── */}
      <div className="grid grid-cols-2 gap-4">
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

      {/* ── Action Button ── */}
      <div className="flex justify-center">
        {calculating ? (
          <div className="flex items-center gap-2 py-2">
            <div className="w-8 h-8">
              <CatSVG type="dad" color="black" hasWhite={false} headOnly />
            </div>
            <span className="text-sm font-black text-amber-600 animate-bounce">
              解析中…🔍
            </span>
          </div>
        ) : (
          <button
            id="wanted-run-btn-v3"
            onClick={show ? reset : run}
            className={`font-black py-2 px-8 rounded-full text-sm transition-all duration-200 active:scale-95 shadow-md ${
              show
                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300 shadow-slate-100'
                : 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-yellow-200 animate-pulse hover:scale-105'
            }`}
          >
            {show ? '↩ 条件を変えて再プロファイリング' : '🔍 パパ猫を指名手配！'}
          </button>
        )}
      </div>

      {/* ── Result Panel ── */}
      <div
        style={{
          maxHeight: show ? '500px' : '0px',
          opacity: show ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.55s cubic-bezier(0.4,0,0.2,1), opacity 0.4s ease',
          flexShrink: 0,
        }}
      >
        {result && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 shadow-xl flex flex-col gap-2">

            {/* Result header */}
            <div className="flex items-center justify-between flex-wrap gap-1">
              <h3 className="text-xs font-black text-gray-700 flex items-center gap-1">
                🕵️‍♂️ 指名手配リスト
              </h3>
              <p className="text-[9px] text-gray-400 font-bold">
                ママ：{COLOR_NAMES[mom.color]}{mom.hasWhite ? '・白斑' : ''}　
                子猫：{COLOR_NAMES[kitten.color]}{kitten.hasWhite ? '・白斑' : ''}
              </p>
            </div>

            {/* Impossible state */}
            {result.isImpossible && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-2 text-center">
                <p className="text-red-500 font-bold text-xs">
                  ⚠️ この組み合わせは遺伝的に成立しません
                </p>
              </div>
            )}

            {/* Candidate cards — max 3 columns, full width */}
            {!result.isImpossible && displayCandidates.length > 0 && (
              <>
                <div
                  className={`grid gap-2 ${
                    displayCandidates.length === 1
                      ? 'grid-cols-1 max-w-xs mx-auto w-full'
                      : displayCandidates.length === 2
                      ? 'grid-cols-2'
                      : 'grid-cols-3'
                  }`}
                >
                  {displayCandidates.map((c, i) => (
                    <WantedCard key={i} candidate={c} rank={i} />
                  ))}
                </div>

                {/* "その他" row for 4th+ candidates */}
                {restCandidates.length > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      その他の候補
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {restCandidates.map((c, i) => (
                        <span
                          key={i}
                          className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full"
                        >
                          {c.color === 'black' ? '黒猫' : 'トラ猫'}
                          {c.hasWhite ? '・白斑' : ''} {Math.round(c.probability * 100)}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Genetic notes */}
            {result.notes.length > 0 && (
              <div className="bg-white/90 border border-amber-100 rounded-xl p-2 flex flex-col gap-0.5">
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-wider mb-0.5">
                  🧬 遺伝の根拠
                </p>
                {result.notes.map((note, i) => (
                  <p key={i} className="text-[10px] text-slate-600 leading-snug">
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
