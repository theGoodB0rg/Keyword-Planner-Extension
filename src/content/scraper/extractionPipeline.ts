/**
 * Extraction Pipeline
 * 
 * Phase 3: Modular Extraction Architecture
 * 
 * Orchestrates multiple extractors to build complete product data:
 * 1. Runs extractors in priority order
 * 2. Merges results from all extractors
 * 3. Resolves conflicts (higher confidence wins)
 * 4. Tracks which extractor contributed each field
 * 5. Logs extraction process for debugging
 * 
 * This provides a flexible, extensible extraction system that can
 * adapt to any e-commerce platform by adding new extractors.
 */

import {
  IProductExtractor,
  ExtractionResult,
  PipelineResult,
  ExtractionPipelineConfig
} from './extractors/types';
import { ProductData } from '../../types/product';
import { logExtraction, logExtractionFailure } from '../../utils/telemetry';

/**
 * Extraction Pipeline Orchestrator
 */
export class ExtractionPipeline {
  private extractors: IProductExtractor[] = [];
  private config: Required<ExtractionPipelineConfig>;
  
  constructor(config: ExtractionPipelineConfig = {}) {
    this.config = {
      minConfidence: config.minConfidence ?? 0.0,
      maxExtractors: config.maxExtractors ?? 0,
      stopOnSuccess: config.stopOnSuccess ?? false,
      debug: config.debug ?? false,
      extractorTimeout: config.extractorTimeout ?? 5000
    };
  }
  
  /**
   * Register an extractor
   */
  registerExtractor(extractor: IProductExtractor): void {
    this.extractors.push(extractor);
    // Sort by priority (highest first)
    this.extractors.sort((a, b) => b.priority - a.priority);
    
    if (this.config.debug) {
      console.log(`[Pipeline] Registered ${extractor.name} (priority: ${extractor.priority})`);
    }
  }
  
  /**
   * Register multiple extractors
   */
  registerExtractors(extractors: IProductExtractor[]): void {
    extractors.forEach(e => this.registerExtractor(e));
  }
  
  /**
   * Run the extraction pipeline
   */
  async extract(document: Document, platform: string): Promise<PipelineResult> {
    const startTime = performance.now();
    const extractorResults: ExtractionResult[] = [];
    
    if (this.config.debug) {
      console.log(`[Pipeline] Starting extraction for platform: ${platform}`);
      console.log(`[Pipeline] ${this.extractors.length} extractors registered`);
    }
    
    // Run extractors in priority order
    let extractorsRun = 0;
    
    for (const extractor of this.extractors) {
      // Check maxExtractors limit
      if (this.config.maxExtractors > 0 && extractorsRun >= this.config.maxExtractors) {
        if (this.config.debug) {
          console.log(`[Pipeline] Reached maxExtractors limit (${this.config.maxExtractors})`);
        }
        break;
      }
      
      // Check if extractor can run
      if (!extractor.canExtract(document)) {
        if (this.config.debug) {
          console.log(`[Pipeline] ${extractor.name} cannot extract (canExtract=false)`);
        }
        continue;
      }
      
      // Run extractor with timeout
      try {
        if (this.config.debug) {
          console.log(`[Pipeline] Running ${extractor.name}...`);
        }
        
        const extractorPromise = extractor.extract(document);
        const timeoutPromise = new Promise<ExtractionResult>((_, reject) =>
          setTimeout(() => reject(new Error('Extractor timeout')), this.config.extractorTimeout)
        );
        
        const result = await Promise.race([extractorPromise, timeoutPromise]);
        
        extractorsRun++;
        
        // Filter by confidence
        if (result.confidence < this.config.minConfidence) {
          if (this.config.debug) {
            console.log(`[Pipeline] ${extractor.name} result filtered (confidence ${result.confidence} < ${this.config.minConfidence})`);
          }
          continue;
        }
        
        extractorResults.push(result);
        
        if (this.config.debug) {
          console.log(`[Pipeline] ${extractor.name} extracted ${result.fieldsExtracted.length} fields (confidence: ${result.confidence})`);
        }
        
        // Stop on success if configured
        if (this.config.stopOnSuccess && result.fieldsExtracted.length > 0) {
          if (this.config.debug) {
            console.log(`[Pipeline] Stopping early (stopOnSuccess=true)`);
          }
          break;
        }
      } catch (error) {
        console.error(`[Pipeline] ${extractor.name} failed:`, error);
        logExtractionFailure(platform, extractor.name, { error: String(error) });
      }
    }
    
    // Merge results
    const mergedData = this.mergeResults(extractorResults);
    const overallConfidence = this.calculateOverallConfidence(extractorResults);
    const { fieldConfidence, fieldSources } = this.buildFieldMetadata(extractorResults, mergedData);
    
    const extractorsContributed = extractorResults.filter(r => r.fieldsExtracted.length > 0).length;
    
    const extractionTime = performance.now() - startTime;
    
    // Log to telemetry
    const selectorHits: Record<string, boolean> = {};
    Object.keys(mergedData).forEach(key => {
      selectorHits[key] = true;
    });
    
    logExtraction(platform, true, selectorHits, Object.keys(mergedData));
    
    if (this.config.debug) {
      console.log(`[Pipeline] Extraction complete in ${extractionTime.toFixed(2)}ms`);
      console.log(`[Pipeline] ${extractorsRun} extractors run, ${extractorsContributed} contributed`);
      console.log(`[Pipeline] Overall confidence: ${overallConfidence.toFixed(2)}`);
      console.log(`[Pipeline] Fields extracted:`, Object.keys(mergedData));
    }
    
    return {
      data: mergedData,
      overallConfidence,
      extractorResults,
      extractorsRun,
      extractorsContributed,
      fieldConfidence,
      fieldSources,
      extractionTime
    };
  }
  
  /**
   * Merge results from all extractors
   * Higher confidence values override lower ones
   */
  private mergeResults(results: ExtractionResult[]): Partial<ProductData> {
    const merged: Partial<ProductData> = {};
    const confidenceMap = new Map<string, number>();
    
    for (const result of results) {
      for (const field of result.fieldsExtracted) {
        const currentConfidence = confidenceMap.get(field) ?? -1;
        
        // Only override if new confidence is higher
        if (result.confidence > currentConfidence) {
          (merged as any)[field] = (result.data as any)[field];
          confidenceMap.set(field, result.confidence);
        }
      }
    }
    
    return merged;
  }
  
  /**
   * Calculate overall confidence (weighted average)
   */
  private calculateOverallConfidence(results: ExtractionResult[]): number {
    if (results.length === 0) return 0;
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const result of results) {
      const weight = result.fieldsExtracted.length;
      totalWeight += weight;
      weightedSum += result.confidence * weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
  
  /**
   * Build field-level metadata (confidence and source)
   */
  private buildFieldMetadata(
    results: ExtractionResult[],
    mergedData: Partial<ProductData>
  ): {
    fieldConfidence: Record<string, number>;
    fieldSources: Record<string, string>;
  } {
    const fieldConfidence: Record<string, number> = {};
    const fieldSources: Record<string, string> = {};
    
    // Track which extractor contributed each field
    const fieldExtractorMap = new Map<string, { extractor: string; confidence: number }>();
    
    for (const result of results) {
      for (const field of result.fieldsExtracted) {
        const current = fieldExtractorMap.get(field);
        
        // Track highest confidence source for each field
        if (!current || result.confidence > current.confidence) {
          fieldExtractorMap.set(field, {
            extractor: result.extractorName,
            confidence: result.confidence
          });
        }
      }
    }
    
    // Build final metadata
    for (const [field, info] of fieldExtractorMap.entries()) {
      fieldConfidence[field] = info.confidence;
      fieldSources[field] = info.extractor;
    }
    
    return { fieldConfidence, fieldSources };
  }
  
  /**
   * Get registered extractors (for debugging)
   */
  getExtractors(): IProductExtractor[] {
    return [...this.extractors];
  }
}

/**
 * Create a default extraction pipeline with standard extractors
 */
export function createDefaultPipeline(config?: ExtractionPipelineConfig): ExtractionPipeline {
  const pipeline = new ExtractionPipeline(config);
  
  // Import and register extractors
  // Note: Actual imports happen in the file that uses this
  // This is a factory function that will be called with extractors
  
  return pipeline;
}
