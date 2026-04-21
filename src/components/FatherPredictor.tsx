import React, { useState } from 'react';
import type { Color } from '../utils/genetics';
import CatSVG from './CatSVG';

// ─── Types ────────────────────────────────────────────────────────────────────

type FurColor = 'black' | 'tabby' | 'calico';

interface CatInput {
  color: FurColor;
  hasWhite: boolean;
}

interface FatherCandidate {
  color: Color;         // 'black' | 'tabby' — males can't be calico
  hasWhite: boolean;
  certainty: 'definite' | 'possible';
  reason: string;
}

interface InferenceResult {
  candidates: FatherCandidate[];
  notes: string[];
}

// ─── Genetics Logic ───────────────────────────────────────────────────────────

/**
 * Infer possible father genotypes from mom + kitten phenotypes.
 *
 * O-gene rules (X-linked):
 *   Male:   black = X^o Y,  tabby = X^O Y
 *   Female: black = X^o X^o, tabby = X^O X^O, calico = X^O X^o
 *
 * S-gene rules (autosomal dominant):
 *   hasWhite = at least one S allele present
 */
function inferFather(mom: CatInput, kitten: CatInput): InferenceResult {
  const candidates: FatherCandidate[] = [];
  const notes: string[] = [];

  // ── Calico kitten note ──────────────────────────────────────────────────────
  if (kitten.color === 'calico') {
    notes.push('三毛はメスのみに現れます (X^O X^o)。');
  }

  // ── O-gene: determine father's O-allele requirement ─────────────────────────
  // Mom's O alleles
  const momO: ('O' | 'o')[] =
    mom.color === 'black'   ? ['o', 'o'] :
    mom.color === 'tabby'   ? ['O', 'O'] :
    /* calico */              ['O', 'o'];

  // Kitten needs one X from mom and one X from dad (females) or Y from dad (males).
  // Since kitten's sex is unknown in general, we consider both possibilities,
  // but calico kitten is definitely female.

  // What color allele must the father have contributed?
  // Female kitten: receives X^? from dad
  // Male kitten:   receives Y from dad (no O allele contribution, so father color
  //                doesn't restrict kitten O color — unless we track what mom gave)

  // We evaluate the O requirement by asking: for the kitten's observed color,
  // what allele must dad have provided (assuming kitten is female)?
  //   calico kitten  → needs X^O and X^o  → dad must have X^O (tabby) or X^o (black)
  //   black  kitten  → needs X^o X^o      → dad must have X^o  → dad is black
  //   tabby  kitten  → needs X^O X^O      → dad must have X^O  → dad is tabby
  // If kitten could be male, dad contributes Y and the kitten O is determined by mom alone,
  // so dad's O-allele is unconstrained by the kitten's color.

  // Determine which O allele(s) dad must have contributed for a FEMALE kitten with this color:
  const requiredDadOForFemaleKitten: Set<'O' | 'o'> = new Set();

  if (kitten.color === 'black') {
    // female black: X^o X^o → dad gave X^o
    requiredDadOForFemaleKitten.add('o');
  } else if (kitten.color === 'tabby') {
    // female tabby: X^O X^O → dad gave X^O
    requiredDadOForFemaleKitten.add('O');
  } else {
    // calico (definitely female): X^O X^o — dad gave either X^O or X^o
    requiredDadOForFemaleKitten.add('O');
    requiredDadOForFemaleKitten.add('o');
  }

  // Cross-check with what mom CAN give
  const momCanGiveO = momO.includes('O');
  const momCanGiveo = momO.includes('o');

  // Also consider kitten could be MALE (only if kitten is NOT calico)
  const kittenCouldBeMale = kitten.color !== 'calico';

  // Determine definite / possible father colors
  const definitelyTabbyDad =
    requiredDadOForFemaleKitten.has('O') &&
    !requiredDadOForFemaleKitten.has('o') &&
    !kittenCouldBeMale;

  const definitelyBlackDad =
    requiredDadOForFemaleKitten.has('o') &&
    !requiredDadOForFemaleKitten.has('O') &&
    !kittenCouldBeMale;

  // Build father color candidates
  const fatherColorCandidates: { color: 'black' | 'tabby'; certainty: 'definite' | 'possible'; reason: string }[] = [];

  if (kitten.color === 'calico') {
    // calico (female): needs X^O from one parent and X^o from the other
    // mom's contribution: if mom is black → gives X^o → dad must give X^O → dad is tabby
    //                     if mom is tabby → gives X^O → dad must give X^o → dad is black
    //                     if mom is calico → can give either → dad could be either
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
      // mom calico: can give O or o
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
    // black kitten: could be male (dad gives Y, O from mom=o fine) or female (dad gives X^o)
    if (momCanGiveo) {
      // mom CAN give X^o for a female black kitten
      // male black kitten: gets Y from dad, X^o from mom (mom must have X^o) → dad can be any color
      fatherColorCandidates.push({
        color: 'black',
        certainty: kittenCouldBeMale ? 'possible' : 'definite',
        reason: '黒の子猫 → パパは黒 (X^o) を提供できる',
      });
      if (kittenCouldBeMale) {
        // Male black kitten: dad gives Y → dad's O doesn't matter → tabby dad also possible
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
      // mom is tabby (X^O X^O): a female black kitten is impossible!
      // must be male black kitten (gets X^O from mom, Y from dad → X^O Y = tabby male… wait)
      // Actually: male black kitten = X^o Y. Mom is X^O X^O → can only give X^O to sons.
      // X^O + Y = tabby male. So black male kitten is IMPOSSIBLE from tabby mom.
      // The user may have input an inconsistent combination.
      notes.push('⚠️ ママがトラ(X^O X^O)の場合、黒の子猫は遺伝的に成立しません。入力をご確認ください。');
    }
  } else if (kitten.color === 'tabby') {
    // tabby kitten: could be male (dad gives Y, X^O from mom) or female (dad gives X^O)
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
      // mom is black (X^o X^o): can only give X^o. Female tabby needs X^O from dad.
      // Male tabby: needs X^O + Y → mom can give X^o → X^o Y = black male. Tabby male impossible.
      // So tabby kitten from black mom MUST be female with X^O from dad → dad is tabby.
      fatherColorCandidates.push({
        color: 'tabby',
        certainty: 'definite',
        reason: 'ママ黒(X^o X^o) × トラ子猫 → X^Oはパパから → パパはトラ確定',
      });
      notes.push('ママが黒(X^o X^o)のためX^Oを渡せません。トラの子猫のX^OはパパのX^Oから。パパはトラ確定です。');
    }
  }

  // ── S-gene: determine father's white spotting requirement ─────────────────────
  let dadMustHaveWhite = false;
  let dadWhiteCertain = false;

  if (kitten.hasWhite && !mom.hasWhite) {
    // Kitten has white, mom doesn't → kitten's S allele came from dad
    dadMustHaveWhite = true;
    dadWhiteCertain = true;
    notes.push('子猫に白斑があり、ママにないため → パパは白斑あり確定。');
  } else if (kitten.hasWhite && mom.hasWhite) {
    // Both could have contributed S
    notes.push('子猫に白斑あり。ママも白斑あり → パパの白斑は不確定（あり・なし両方の可能性）。');
  } else {
    // Kitten has no white → dad didn't necessarily have it (or had ss)
    // Dad could still be Ss but happened to pass s... but in this simplified model we say dad may or may not have white
  }

  // ── Assemble final candidates ─────────────────────────────────────────────────
  // For each color candidate, add two white variants (or forced white)
  for (const colorCandidate of fatherColorCandidates) {
    if (dadWhiteCertain) {
      candidates.push({
        color: colorCandidate.color,
        hasWhite: true,
        certainty: colorCandidate.certainty,
        reason: colorCandidate.reason,
      });
    } else if (dadMustHaveWhite) {
      candidates.push({
        color: colorCandidate.color,
        hasWhite: true,
        certainty: colorCandidate.certainty,
        reason: colorCandidate.reason,
      });
    } else {
      // White not certain — add both possibilities
      candidates.push({
        color: colorCandidate.color,
        hasWhite: false,
        certainty: colorCandidate.certainty,
        reason: colorCandidate.reason + '・白斑なし',
      });
      // Only add white variant if kitten has white (otherwise white in dad couldn't reach kitten)
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

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ColorButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass: string;
  inactiveClass: string;
}

function ColorButton({ label, active, onClick, activeClass, inactiveClass }: ColorButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 px-1 rounded-lg font-bold text-[11px] transition-all duration-200 ${active ? activeClass : inactiveClass}`}
    >
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FatherPredictor() {
  const [mom, setMom] = useState<CatInput>({ color: 'black', hasWhite: false });
  const [kitten, setKitten] = useState<CatInput>({ color: 'calico', hasWhite: false });
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

  const startSimulation = () => {
    setIsCalculating(true);
    setShowResult(false);
    setResult(null);

    setTimeout(() => {
      const inferred = inferFather(mom, kitten);
      setResult(inferred);
      setIsCalculating(false);
      setShowResult(true);
    }, 1800);
  };

  const reset = () => {
    setResult(null);
    setShowResult(false);
    setIsCalculating(false);
  };

  const colorNameJa = (c: FurColor) =>
    c === 'black' ? '黒' : c === 'tabby' ? 'トラ' : '三毛';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-screen-md mx-auto w-full flex flex-col gap-5">

      {/* ── Title ── */}
      <div className="text-center">
        <h2 className="text-base font-black text-amber-700 tracking-tight flex items-center justify-center gap-2">
          <span>🔍</span>
          <span>父猫（パパ）特定シミュレーター</span>
        </h2>
        <p className="text-[11px] text-amber-500/80 mt-0.5">
          ママ猫と子猫の毛色から、パパ猫の候補を推理します
        </p>
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
                <ColorButton
                  label="黒"
                  active={mom.color === 'black'}
                  onClick={() => updateMom({ color: 'black' })}
                  activeClass="bg-pink-500 text-white shadow-md"
                  inactiveClass="bg-white text-pink-400 border border-pink-200 hover:bg-pink-50"
                />
                <ColorButton
                  label="トラ"
                  active={mom.color === 'tabby'}
                  onClick={() => updateMom({ color: 'tabby' })}
                  activeClass="bg-pink-500 text-white shadow-md"
                  inactiveClass="bg-white text-pink-400 border border-pink-200 hover:bg-pink-50"
                />
                <ColorButton
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
                <ColorButton
                  label="あり"
                  active={mom.hasWhite}
                  onClick={() => updateMom({ hasWhite: true })}
                  activeClass="bg-pink-600 text-white shadow-md"
                  inactiveClass="bg-white text-pink-400 border border-pink-200 hover:bg-pink-50"
                />
                <ColorButton
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

        {/* Arrow */}
        <div className="flex items-center justify-center text-amber-400 text-2xl font-black select-none md:mt-0 -my-1">
          <span className="hidden md:block">＋</span>
          <span className="md:hidden">＋</span>
        </div>

        {/* Kitten Card */}
        <div className="flex-1 bg-yellow-50 border-2 border-yellow-100 rounded-2xl p-4 shadow-xl flex flex-col items-center gap-3">
          <h3 className="text-sm font-black text-yellow-600">子猫 (Kitten)</h3>

          <div className="w-20 h-20 drop-shadow-md">
            <CatSVG type="kitten" color={kitten.color} hasWhite={kitten.hasWhite} />
          </div>

          <div className="w-full flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">
                毛色
                {kitten.color === 'calico' && (
                  <span className="ml-2 text-pink-400 normal-case font-bold">（♀ メス確定）</span>
                )}
              </label>
              <div className="flex gap-1.5">
                <ColorButton
                  label="黒"
                  active={kitten.color === 'black'}
                  onClick={() => updateKitten({ color: 'black' })}
                  activeClass="bg-yellow-500 text-white shadow-md"
                  inactiveClass="bg-white text-yellow-500 border border-yellow-200 hover:bg-yellow-50"
                />
                <ColorButton
                  label="トラ"
                  active={kitten.color === 'tabby'}
                  onClick={() => updateKitten({ color: 'tabby' })}
                  activeClass="bg-yellow-500 text-white shadow-md"
                  inactiveClass="bg-white text-yellow-500 border border-yellow-200 hover:bg-yellow-50"
                />
                <ColorButton
                  label="三毛"
                  active={kitten.color === 'calico'}
                  onClick={() => updateKitten({ color: 'calico' })}
                  activeClass="bg-yellow-500 text-white shadow-md"
                  inactiveClass="bg-white text-yellow-500 border border-yellow-200 hover:bg-yellow-50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">白斑</label>
              <div className="flex gap-1.5">
                <ColorButton
                  label="あり"
                  active={kitten.hasWhite}
                  onClick={() => updateKitten({ hasWhite: true })}
                  activeClass="bg-yellow-600 text-white shadow-md"
                  inactiveClass="bg-white text-yellow-500 border border-yellow-200 hover:bg-yellow-50"
                />
                <ColorButton
                  label="なし"
                  active={!kitten.hasWhite}
                  onClick={() => updateKitten({ hasWhite: false })}
                  activeClass="bg-yellow-600 text-white shadow-md"
                  inactiveClass="bg-white text-yellow-500 border border-yellow-200 hover:bg-yellow-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Result Area ── */}
      <div
        className={`bg-amber-50 border-2 rounded-2xl p-5 shadow-xl flex flex-col items-center min-h-[160px] transition-all duration-500 ${
          isCalculating ? 'border-yellow-300 animate-pulse' : 'border-yellow-200'
        }`}
      >

        {/* Idle state */}
        {!isCalculating && !showResult && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
            <p className="text-amber-500/70 text-xs font-bold">ママ猫と子猫を選んだら推理スタート！</p>
            <button
              onClick={startSimulation}
              id="start-prediction-btn"
              className="bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-yellow-900 font-black py-2.5 px-10 rounded-full shadow-md shadow-yellow-200 transform hover:scale-105 transition-all text-sm"
            >
              🔍 パパ猫を推理する
            </button>
          </div>
        )}

        {/* Calculating state */}
        {isCalculating && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
            <div className="w-16 h-16 drop-shadow-xl">
              <CatSVG type="dad" color="black" hasWhite={false} headOnly />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg font-black text-amber-600 animate-bounce">遺伝子を解析中…</span>
              <span className="text-xs text-amber-400 font-bold">パパ猫の手がかりを調べています</span>
            </div>
          </div>
        )}

        {/* Result state */}
        {showResult && result && (
          <div className="w-full flex flex-col gap-4">

            {/* Header */}
            <div className="flex flex-col items-center gap-1">
              <h4 className="text-base font-black text-amber-700 flex items-center gap-2">
                🕵️ 推理結果
              </h4>
              <p className="text-[11px] text-amber-500">
                ママ：{colorNameJa(mom.color)}{mom.hasWhite ? '・白斑あり' : ''}　
                子猫：{colorNameJa(kitten.color)}{kitten.hasWhite ? '・白斑あり' : ''}
              </p>
              <button
                onClick={reset}
                className="text-[10px] text-amber-400 font-bold hover:text-amber-600 underline underline-offset-2 mt-0.5"
              >
                やり直す
              </button>
            </div>

            {/* No candidates (impossible combination) */}
            {result.candidates.length === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-red-500 font-bold text-sm">
                  ⚠️ この組み合わせは遺伝的に成立しない可能性があります
                </p>
              </div>
            )}

            {/* Candidate cards */}
            {result.candidates.length > 0 && (
              <>
                <div className="flex flex-col gap-1 mb-1">
                  <p className="text-[11px] text-amber-600 font-bold text-center">
                    パパ猫の候補
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {result.candidates.map((c, i) => (
                    <div
                      key={i}
                      className={`bg-white rounded-2xl p-3 flex flex-col items-center gap-2 shadow-md border-2 transition-all duration-300 ${
                        c.certainty === 'definite'
                          ? 'border-amber-400 ring-2 ring-amber-200'
                          : 'border-slate-100'
                      }`}
                    >
                      {/* Certainty badge */}
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          c.certainty === 'definite'
                            ? 'bg-amber-400 text-amber-900'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {c.certainty === 'definite' ? '✓ 確定' : '? 候補'}
                      </span>

                      {/* Cat illustration */}
                      <div className="w-14 h-14 drop-shadow-sm">
                        <CatSVG type="dad" color={c.color} hasWhite={c.hasWhite} />
                      </div>

                      {/* Labels */}
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
              </>
            )}

            {/* Genetic notes */}
            {result.notes.length > 0 && (
              <div className="bg-white/80 border border-amber-100 rounded-xl p-3 flex flex-col gap-1.5">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">🧬 遺伝の根拠</p>
                {result.notes.map((note, i) => (
                  <p key={i} className="text-[11px] text-slate-600 leading-relaxed">
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
