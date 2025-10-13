// src/utils/confidence.ts
/**
 * Confidence scoring system for AI-generated suggestions
 * Scores range from 0-100, where:
 * - 70-100: High confidence (trustworthy)
 * - 40-69: Medium confidence (verify recommended)
 * - 0-39: Low confidence (use with caution)
 */

export interface ConfidenceFactors {
  contextMatch?: number;      // 0-1: How well it matches product context
  commercialIntent?: number;   // 0-1: Likelihood of purchase intent
  dataQuality?: number;        // 0-1: Quality of input data
  aiCertainty?: number;        // 0-1: AI model's own confidence
  specificity?: number;        // 0-1: How specific vs generic
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ConfidenceScore {
  score: number;              // 0-100
  level: ConfidenceLevel;     // high/medium/low
  factors: ConfidenceFactors; // Breakdown of contributing factors
  explanation: string;        // Human-readable explanation
}

/**
 * Calculate confidence score from individual factors
 */
export function calculateConfidence(factors: ConfidenceFactors): ConfidenceScore {
  // Normalize and weight factors
  const weights = {
    contextMatch: 0.35,
    commercialIntent: 0.25,
    dataQuality: 0.20,
    aiCertainty: 0.15,
    specificity: 0.05
  };

  let totalScore = 0;
  let totalWeight = 0;

  // Calculate weighted average
  if (factors.contextMatch !== undefined) {
    totalScore += factors.contextMatch * weights.contextMatch * 100;
    totalWeight += weights.contextMatch;
  }
  if (factors.commercialIntent !== undefined) {
    totalScore += factors.commercialIntent * weights.commercialIntent * 100;
    totalWeight += weights.commercialIntent;
  }
  if (factors.dataQuality !== undefined) {
    totalScore += factors.dataQuality * weights.dataQuality * 100;
    totalWeight += weights.dataQuality;
  }
  if (factors.aiCertainty !== undefined) {
    totalScore += factors.aiCertainty * weights.aiCertainty * 100;
    totalWeight += weights.aiCertainty;
  }
  if (factors.specificity !== undefined) {
    totalScore += factors.specificity * weights.specificity * 100;
    totalWeight += weights.specificity;
  }

  // Normalize score
  const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50;

  // Determine level
  const level: ConfidenceLevel = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

  // Generate explanation
  const explanation = generateExplanation(score, level, factors);

  return { score, level, factors, explanation };
}

/**
 * Convert a confidence score (0-100) to a confidence level
 */
export function scoreToLevel(score: number): ConfidenceLevel {
  return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
}

/**
 * Calculate confidence for long-tail keyword suggestions
 */
export function calculateLongTailConfidence(
  keyword: string,
  productTitle: string,
  productCategory?: string,
  keywordScore?: number
): ConfidenceScore {
  const factors: ConfidenceFactors = {};

  // Context match: How well does keyword relate to product?
  const titleWords = productTitle.toLowerCase().split(/\s+/);
  const keywordWords = keyword.toLowerCase().split(/\s+/);
  const matchingWords = keywordWords.filter(kw => titleWords.some(tw => tw.includes(kw) || kw.includes(tw)));
  factors.contextMatch = Math.min(1, matchingWords.length / Math.max(keywordWords.length, 1));

  // Commercial intent: Does keyword suggest buying intent?
  const commercialTerms = ['buy', 'best', 'top', 'review', 'cheap', 'affordable', 'price', 'deal', 'sale', 'discount', 'compare'];
  const hasCommercialIntent = keywordWords.some(w => commercialTerms.includes(w));
  factors.commercialIntent = hasCommercialIntent ? 0.8 : 0.5;

  // Specificity: More specific = higher confidence
  factors.specificity = Math.min(1, keywordWords.length / 6); // 6+ words is very specific

  // Use existing keyword score if available
  if (keywordScore !== undefined) {
    factors.aiCertainty = Math.min(1, keywordScore / 100);
  }

  return calculateConfidence(factors);
}

/**
 * Calculate confidence for meta title/description
 */
export function calculateMetaConfidence(
  metaText: string,
  productTitle: string,
  productDescription?: string,
  isOriginal: boolean = true
): ConfidenceScore {
  const factors: ConfidenceFactors = {};

  // Originality check
  if (isOriginal) {
    factors.aiCertainty = 0.85;
  } else {
    factors.aiCertainty = 0.40; // Low confidence if copied
  }

  // Context match: Does meta text relate to product?
  const productWords = productTitle.toLowerCase().split(/\s+/);
  const metaWords = metaText.toLowerCase().split(/\s+/);
  const matchingWords = metaWords.filter(mw => productWords.some(pw => pw.includes(mw) || mw.includes(pw)));
  factors.contextMatch = Math.min(1, matchingWords.length / Math.max(metaWords.length * 0.5, 1));

  // Length appropriateness
  const isTitle = metaText.length <= 70;
  const optimalLength = isTitle ? (metaText.length >= 30 && metaText.length <= 60) : (metaText.length >= 120 && metaText.length <= 160);
  factors.dataQuality = optimalLength ? 0.9 : 0.6;

  return calculateConfidence(factors);
}

/**
 * Calculate confidence for rewritten bullet points
 */
export function calculateBulletConfidence(
  original: string,
  rewritten: string,
  productContext: string
): ConfidenceScore {
  const factors: ConfidenceFactors = {};

  // Check if actually rewritten (not just copied)
  const similarity = calculateTextSimilarity(original, rewritten);
  const isActuallyRewritten = similarity < 0.8;
  factors.aiCertainty = isActuallyRewritten ? 0.80 : 0.35;

  // Context match
  const contextWords = productContext.toLowerCase().split(/\s+/);
  const bulletWords = rewritten.toLowerCase().split(/\s+/);
  const matchingWords = bulletWords.filter(bw => contextWords.some(cw => cw.includes(bw) || bw.includes(cw)));
  factors.contextMatch = Math.min(1, matchingWords.length / Math.max(bulletWords.length * 0.3, 1));

  // Length and quality
  const hasGoodLength = rewritten.length >= 50 && rewritten.length <= 200;
  const startsWithBenefit = /^[A-Z]/.test(rewritten); // Starts with capital letter
  factors.dataQuality = (hasGoodLength ? 0.6 : 0.4) + (startsWithBenefit ? 0.3 : 0);

  return calculateConfidence(factors);
}

/**
 * Calculate confidence for gap detection
 */
export function calculateGapConfidence(
  attributeName: string,
  productData: any,
  severity: 'high' | 'medium' | 'low'
): ConfidenceScore {
  const factors: ConfidenceFactors = {};

  // Severity indicates importance
  factors.commercialIntent = severity === 'high' ? 0.9 : severity === 'medium' ? 0.7 : 0.5;

  // Check if we actually looked for this attribute
  const wasChecked = productData && typeof productData === 'object';
  factors.dataQuality = wasChecked ? 0.85 : 0.50;

  // Certainty based on attribute type
  const criticalAttributes = ['brand', 'dimensions', 'weight', 'material'];
  const isCritical = criticalAttributes.includes(attributeName.toLowerCase());
  factors.aiCertainty = isCritical ? 0.90 : 0.70;

  return calculateConfidence(factors);
}

/**
 * Generate human-readable explanation for confidence score
 */
function generateExplanation(
  score: number,
  level: ConfidenceLevel,
  factors: ConfidenceFactors
): string {
  const explanations: string[] = [];

  if (level === 'high') {
    explanations.push('High confidence based on');
    if (factors.contextMatch && factors.contextMatch > 0.7) {
      explanations.push('strong product context match');
    }
    if (factors.commercialIntent && factors.commercialIntent > 0.7) {
      explanations.push('clear commercial intent');
    }
    if (factors.aiCertainty && factors.aiCertainty > 0.7) {
      explanations.push('high AI certainty');
    }
  } else if (level === 'medium') {
    explanations.push('Medium confidence.');
    if (factors.contextMatch && factors.contextMatch < 0.5) {
      explanations.push('Moderate product relevance');
    }
    if (factors.commercialIntent && factors.commercialIntent < 0.6) {
      explanations.push('unclear buyer intent');
    }
    explanations.push('Verify before using');
  } else {
    explanations.push('Low confidence.');
    if (factors.contextMatch && factors.contextMatch < 0.4) {
      explanations.push('Weak product match');
    }
    if (factors.aiCertainty && factors.aiCertainty < 0.5) {
      explanations.push('low AI certainty');
    }
    explanations.push('Use with caution');
  }

  return explanations.join(' ');
}

/**
 * Simple text similarity calculation (Jaccard index)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Get confidence level display properties
 */
export function getConfidenceDisplay(level: ConfidenceLevel): {
  color: string;
  icon: string;
  stars: number;
  label: string;
} {
  switch (level) {
    case 'high':
      return {
        color: '#10b981', // green
        icon: '✓',
        stars: 3,
        label: 'High Confidence'
      };
    case 'medium':
      return {
        color: '#f59e0b', // amber
        icon: '◐',
        stars: 2,
        label: 'Medium Confidence'
      };
    case 'low':
      return {
        color: '#ef4444', // red
        icon: '!',
        stars: 1,
        label: 'Low Confidence'
      };
  }
}
