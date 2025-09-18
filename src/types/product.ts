// Product & AI related types (initial scaffolding)
// These align with PRODUCT_SCRAPER_SPEC.md & AI_TASKS_SPEC.md (subset for Phase 1)

export interface ProductData {
  title: string;
  brand: string | null;
  price: { value: number | null; currency: string | null; raw: string | null };
  bullets: string[];
  descriptionHTML: string;
  descriptionText: string;
  images: { src: string; alt: string | null }[];
  variants: { name: string; values: string[] }[];
  specs: { key: string; value: string }[];
  categoryPath: string[];
  reviews: { count: number | null; average: number | null };
  sku: string | null;
  availability: string | null;
  detectedPlatform: 'amazon' | 'shopify' | 'woocommerce' | 'generic';
  url: string;
  timestamp: number;
  raw: Record<string, any>;
}

export interface LongTailSuggestion { phrase: string; rationale?: string; category?: string; score: number; }
export interface RewrittenBullet { original: string; rewritten: string; length: number; diffHint?: string; }
export interface MetaSuggestion { metaTitle: string; metaDescription: string; metaTitleLength: number; metaDescriptionLength: number; }

export interface AttributeGap { key: string; severity: 'high' | 'medium' | 'low'; suggestion: string; }
export interface GapResult { gaps: AttributeGap[]; gapScore: number; classification: 'none' | 'mild' | 'moderate' | 'severe'; }

export type AiTaskType = 'generate.longTail' | 'rewrite.bullets' | 'generate.meta' | 'detect.gaps'; // initial subset

export interface AiTaskRequest<TInput = any> {
  task: AiTaskType;
  input: TInput;
  offline?: boolean;
}

export interface AiTaskResponse<TOutput = any> {
  task: AiTaskType;
  success: boolean;
  data: TOutput | null;
  model?: string;
  cacheHit?: boolean;
  elapsedMs: number;
  error?: string;
  fallbackUsed?: boolean;
}

export interface ProductOptimizationResult {
  product: ProductData;
  longTail?: LongTailSuggestion[];
  meta?: MetaSuggestion;
  rewrittenBullets?: RewrittenBullet[];
  gaps?: GapResult;
  timestamp: number;
}
