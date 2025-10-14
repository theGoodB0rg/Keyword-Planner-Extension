/**
 * Extractor Interface Types
 * 
 * Phase 3: Modular Extraction Architecture
 * 
 * Defines the contract for product data extractors.
 * Extractors run in priority order and return data with confidence scores.
 * The pipeline merges results and resolves conflicts.
 */

import { ProductData } from '../../../types/product';

/**
 * Source type for extracted data
 */
export type ExtractionSource = 'structured' | 'heuristic' | 'platform-specific' | 'ai';

/**
 * Extraction method details
 */
export type ExtractionMethod = 
  | 'json-ld'
  | 'microdata' 
  | 'opengraph'
  | 'semantic-html'
  | 'css-selectors'
  | 'platform-adapter'
  | 'ai-inference';

/**
 * Result from a single extractor with metadata
 */
export interface ExtractionResult {
  // Partial product data extracted
  data: Partial<ProductData>;
  
  // Confidence score (0-1)
  // 0.95+ = Structured data (JSON-LD, microdata)
  // 0.70-0.94 = High-quality signals (OpenGraph, semantic HTML)
  // 0.40-0.69 = Heuristic patterns (common selectors)
  // 0.0-0.39 = Low confidence guesses
  confidence: number;
  
  // Source category
  source: ExtractionSource;
  
  // Specific extraction method used
  method: ExtractionMethod;
  
  // Extractor name (for logging)
  extractorName: string;
  
  // Fields successfully extracted
  fieldsExtracted: string[];
  
  // Optional metadata
  metadata?: {
    [key: string]: any;
  };
}

/**
 * Core interface all extractors must implement
 */
export interface IProductExtractor {
  /**
   * Unique name for this extractor
   */
  readonly name: string;
  
  /**
   * Priority level (higher = runs first)
   * 100-999: Structured data extractors
   * 50-99: Platform-specific extractors  
   * 10-49: Heuristic extractors
   * 1-9: Fallback extractors
   */
  readonly priority: number;
  
  /**
   * Check if this extractor can process the current page
   * Should be fast - avoid heavy DOM queries
   */
  canExtract(document: Document): boolean;
  
  /**
   * Extract product data from the page
   * Returns ExtractionResult with confidence score
   */
  extract(document: Document): Promise<ExtractionResult>;
}

/**
 * Base abstract class for extractors
 * Provides common functionality and logging
 */
export abstract class BaseExtractor implements IProductExtractor {
  abstract readonly name: string;
  abstract readonly priority: number;
  
  abstract canExtract(document: Document): boolean;
  abstract extract(document: Document): Promise<ExtractionResult>;
  
  /**
   * Helper: Safely get text content from selector
   */
  protected getTextContent(
    doc: Document, 
    selector: string,
    fallback: string = ''
  ): string {
    try {
      const element = doc.querySelector(selector);
      return element?.textContent?.trim() || fallback;
    } catch (error) {
      console.warn(`Selector error in ${this.name}:`, selector, error);
      return fallback;
    }
  }
  
  /**
   * Helper: Safely get attribute value
   */
  protected getAttribute(
    doc: Document,
    selector: string,
    attribute: string,
    fallback: string = ''
  ): string {
    try {
      const element = doc.querySelector(selector);
      return element?.getAttribute(attribute)?.trim() || fallback;
    } catch (error) {
      console.warn(`Attribute error in ${this.name}:`, selector, attribute, error);
      return fallback;
    }
  }
  
  /**
   * Helper: Safely parse price from text
   */
  protected parsePrice(priceText: string): number | undefined {
    if (!priceText) return undefined;
    
    // Remove currency symbols and common formatting
    const cleaned = priceText
      .replace(/[$£€¥₹]/g, '')
      .replace(/,/g, '')
      .trim();
    
    const price = parseFloat(cleaned);
    return isNaN(price) ? undefined : price;
  }
  
  /**
   * Helper: Extract all text content from multiple selectors
   */
  protected getMultipleTextContent(
    doc: Document,
    selectors: string[]
  ): string | undefined {
    for (const selector of selectors) {
      const text = this.getTextContent(doc, selector);
      if (text) return text;
    }
    return undefined;
  }
  
  /**
   * Helper: Check if element exists
   */
  protected elementExists(doc: Document, selector: string): boolean {
    try {
      return doc.querySelector(selector) !== null;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Helper: Count matching elements
   */
  protected countElements(doc: Document, selector: string): number {
    try {
      return doc.querySelectorAll(selector).length;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Create a standard ExtractionResult
   */
  protected createResult(
    data: Partial<ProductData>,
    confidence: number,
    source: ExtractionSource,
    method: ExtractionMethod,
    metadata?: any
  ): ExtractionResult {
    // Determine which fields were extracted
    const fieldsExtracted = Object.keys(data).filter(key => {
      const value = (data as any)[key];
      return value !== undefined && value !== null && value !== '';
    });
    
    return {
      data,
      confidence,
      source,
      method,
      extractorName: this.name,
      fieldsExtracted,
      metadata
    };
  }
}

/**
 * Configuration for the extraction pipeline
 */
export interface ExtractionPipelineConfig {
  // Minimum confidence to include data (0-1)
  minConfidence?: number;
  
  // Maximum number of extractors to run (0 = all)
  maxExtractors?: number;
  
  // Stop after first successful extraction
  stopOnSuccess?: boolean;
  
  // Enable debug logging
  debug?: boolean;
  
  // Timeout per extractor (ms)
  extractorTimeout?: number;
}

/**
 * Result from the full extraction pipeline
 */
export interface PipelineResult {
  // Merged product data
  data: Partial<ProductData>;
  
  // Overall confidence (weighted average)
  overallConfidence: number;
  
  // Individual extractor results
  extractorResults: ExtractionResult[];
  
  // Number of extractors that ran
  extractorsRun: number;
  
  // Number that contributed data
  extractorsContributed: number;
  
  // Field-level confidence scores
  fieldConfidence: Record<string, number>;
  
  // Field-level sources
  fieldSources: Record<string, string>;
  
  // Extraction time (ms)
  extractionTime: number;
}
