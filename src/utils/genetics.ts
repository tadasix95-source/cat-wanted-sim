export type Color = 'black' | 'tabby' | 'calico';
export type Gender = 'male' | 'female';

export interface Parent {
  gender: Gender;
  color: Color; // Males: 'black' | 'tabby', Females: 'black' | 'tabby' | 'calico'
  hasWhite: boolean;
}

export interface Phenotype {
  gender: Gender;
  color: Color;
  hasWhite: boolean;
}

export interface OffspringProbability {
  phenotype: Phenotype;
  probability: number; // 0.0 to 1.0
}

/**
 * Get the O gene alleles for a given parent
 */
function getOGene(parent: Parent): string[] {
  if (parent.gender === 'male') {
    if (parent.color === 'black') return ['o', 'Y'];
    if (parent.color === 'tabby') return ['O', 'Y'];
    // Fallback if male calico is somehow passed, though impossible in this simple model
    return ['o', 'Y'];
  } else {
    if (parent.color === 'black') return ['o', 'o'];
    if (parent.color === 'tabby') return ['O', 'O'];
    if (parent.color === 'calico') return ['O', 'o'];
    return ['o', 'o'];
  }
}

/**
 * Get S gene alleles for a given parent.
 * Assume white spotting "hasWhite" is heterozygous (Ss).
 */
function getSGene(parent: Parent): string[] {
  return parent.hasWhite ? ['S', 's'] : ['s', 's'];
}

/**
 * Determine the phenotype color based on O gene alleles.
 */
function determineColor(alleles: string[]): Color {
  // Male
  if (alleles.includes('Y')) {
    if (alleles.includes('O')) return 'tabby';
    return 'black';
  }
  // Female
  const oCount = alleles.filter(a => a === 'o').length;
  const OCount = alleles.filter(a => a === 'O').length;
  if (oCount === 2) return 'black';
  if (OCount === 2) return 'tabby';
  return 'calico'; // One 'O', one 'o'
}

/**
 * Determine if phenotype has white based on S gene alleles.
 */
function determineWhite(alleles: string[]): boolean {
  return alleles.includes('S');
}

/**
 * Determine the gender based on sex chromosomes
 */
function determineGender(alleles: string[]): Gender {
  return alleles.includes('Y') ? 'male' : 'female';
}

/**
 * Calculate offspring probabilities given a father and a mother.
 */
export function calculateProbabilities(father: Parent, mother: Parent): OffspringProbability[] {
  // Ensure we have correct sexes just in case
  const actualFather = father.gender === 'male' ? father : mother;
  const actualMother = mother.gender === 'female' ? mother : father;

  const fatherO = getOGene(actualFather);
  const motherO = getOGene(actualMother);
  const fatherS = getSGene(actualFather);
  const motherS = getSGene(actualMother);

  const totalCombinations = 16; // 2*2 for O gene * 2*2 for S gene
  const outcomes: Record<string, number> = {};

  for (const fO of fatherO) {
    for (const mO of motherO) {
      for (const fS of fatherS) {
        for (const mS of motherS) {
          const oAlleles = [fO, mO];
          const sAlleles = [fS, mS];

          const gender = determineGender(oAlleles);
          const color = determineColor(oAlleles);
          const hasWhite = determineWhite(sAlleles);

          const key = `${gender}-${color}-${hasWhite}`;
          if (!outcomes[key]) outcomes[key] = 0;
          outcomes[key]++;
        }
      }
    }
  }

  const result: OffspringProbability[] = [];
  for (const [key, count] of Object.entries(outcomes)) {
    const [gender, color, hasWhiteStr] = key.split('-');
    result.push({
      phenotype: {
        gender: gender as Gender,
        color: color as Color,
        hasWhite: hasWhiteStr === 'true',
      },
      probability: count / totalCombinations,
    });
  }

  // Sort by probability descending
  result.sort((a, b) => b.probability - a.probability);

  return result;
}
