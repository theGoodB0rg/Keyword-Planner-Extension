/**
 * Heuristic Extractor
 * 
 * Phase 3: Modular Extraction Architecture
 * 
 * Platform-agnostic DOM scraping using common patterns:
 * - Semantic HTML (main, article, h1, etc.)
 * - Common CSS patterns (.price, .title, .product-, etc.)
 * - Aria labels and roles
 * - Generic attribute patterns
 * 
 * This extractor provides fallback extraction when structured data
 * is not available. Medium confidence (40-65%).
 */

import { BaseExtractor, ExtractionResult } from './types';
import { ProductData } from '../../../types/product';

/**
 * Generic Heuristic Extractor
 * Priority: 500 (medium - fallback for missing structured data)
 */
export class HeuristicExtractor extends BaseExtractor {
  readonly name = 'HeuristicExtractor';
  readonly priority = 500;
  
  canExtract(doc: Document): boolean {
    // Can always attempt extraction
    return true;
  }
  
  async extract(doc: Document): Promise<ExtractionResult> {
    const productData: Partial<ProductData> = {};
    let confidence = 0.4; // Base confidence for heuristics
    let signalsFound = 0;
    
    // Extract title
    const title = this.extractTitle(doc);
    if (title) {
      productData.title = title;
      signalsFound++;
    }
    
    // Extract price
    const price = this.extractPrice(doc);
    if (price) {
      productData.price = price;
      signalsFound++;
      confidence += 0.1; // Price is a strong signal
    }
    
    // Extract brand
    const brand = this.extractBrand(doc);
    if (brand) {
      productData.brand = brand;
      signalsFound++;
    }
    
    // Extract images
    const images = this.extractImages(doc);
    if (images.length > 0) {
      productData.images = images;
      signalsFound++;
    }
    
    // Extract description
    const description = this.extractDescription(doc);
    if (description) {
      productData.descriptionText = description;
      signalsFound++;
    }
    
    // Extract reviews
    const reviews = this.extractReviews(doc);
    if (reviews) {
      productData.reviews = reviews;
      signalsFound++;
    }
    
    // Adjust confidence based on signals found
    if (signalsFound >= 4) {
      confidence = 0.65; // Good heuristic match
    } else if (signalsFound >= 2) {
      confidence = 0.55; // Decent match
    }
    
    return this.createResult(
      productData,
      confidence,
      'heuristic',
      'semantic-html',
      { signalsFound }
    );
  }
  
  /**
   * Extract title from common patterns
   */
  private extractTitle(doc: Document): string | undefined {
    const selectors = [
      // Semantic HTML
      'h1[itemprop="name"]',
      'h1.product-title',
      'h1.product-name',
      'h1[class*="product"]',
      'h1[class*="title"]',
      'main h1',
      'article h1',
      '[role="main"] h1',
      
      // Generic patterns
      '.product-title',
      '.product-name',
      '.productTitle',
      '.pdp-title',
      '#productTitle',
      '[data-product-title]',
      '[data-testid="product-title"]',
      
      // Fallback to first h1
      'h1'
    ];
    
    return this.getMultipleTextContent(doc, selectors);
  }
  
  /**
   * Extract price from common patterns
   */
  private extractPrice(doc: Document): { value: number; currency: string | null; raw: string } | undefined {
    const priceSelectors = [
      // Semantic
      '[itemprop="price"]',
      '[property="og:price:amount"]',
      
      // Common classes
      '.price',
      '.product-price',
      '.productPrice',
      '.current-price',
      '.sale-price',
      '.final-price',
      '[class*="price"]',
      '[data-price]',
      '[data-product-price]',
      
      // IDs
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#price',
      
      // Aria
      '[aria-label*="price"]',
      '[aria-label*="Price"]'
    ];
    
    for (const selector of priceSelectors) {
      try {
        const element = doc.querySelector(selector);
        if (!element) continue;
        
        // Get price text
        let priceText = element.getAttribute('content') || 
                       element.getAttribute('data-price') ||
                       element.textContent?.trim() || '';
        
        if (!priceText) continue;
        
        // Parse price
        const priceValue = this.parsePrice(priceText);
        if (priceValue !== undefined) {
          // Try to extract currency
          const currency = this.extractCurrency(priceText, element);
          
          return {
            value: priceValue,
            currency,
            raw: priceText
          };
        }
      } catch (error) {
        continue;
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract currency from price text or nearby elements
   */
  private extractCurrency(priceText: string, element: Element): string | null {
    // Check for currency symbols in text
    if (priceText.includes('$')) return 'USD';
    if (priceText.includes('£')) return 'GBP';
    if (priceText.includes('€')) return 'EUR';
    if (priceText.includes('¥')) return 'JPY';
    if (priceText.includes('₹')) return 'INR';
    
    // Check meta tag
    const currencyMeta = element.closest('[itemscope]')?.querySelector('[itemprop="priceCurrency"]');
    if (currencyMeta) {
      return currencyMeta.getAttribute('content') || currencyMeta.textContent?.trim() || null;
    }
    
    return null;
  }
  
  /**
   * Extract brand from common patterns
   */
  private extractBrand(doc: Document): string | null {
    const selectors = [
      '[itemprop="brand"]',
      '[property="og:brand"]',
      '.brand',
      '.product-brand',
      '.productBrand',
      '[data-brand]',
      'a[href*="/brand/"]',
      'a[href*="/brands/"]',
      '.manufacturer'
    ];
    
    for (const selector of selectors) {
      const text = this.getTextContent(doc, selector);
      if (text && text.length > 1 && text.length < 100) {
        return text;
      }
    }
    
    return null;
  }
  
  /**
   * Extract images from common patterns
   */
  private extractImages(doc: Document): { src: string; alt: string | null }[] {
    const images: { src: string; alt: string | null }[] = [];
    
    const selectors = [
      '[itemprop="image"]',
      '.product-image img',
      '.productImage img',
      '#product-image img',
      '[class*="product-image"] img',
      '[class*="productImage"] img',
      'main img[src*="product"]',
      'article img'
    ];
    
    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector);
      
      for (const el of Array.from(elements)) {
        const img = el.tagName === 'IMG' ? el as HTMLImageElement : el.querySelector('img');
        if (!img) continue;
        
        const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        if (!src) continue;
        
        // Skip tiny images (likely icons)
        if (img.naturalWidth && img.naturalWidth < 100) continue;
        
        images.push({
          src,
          alt: img.alt || null
        });
        
        // Limit to first 5 images
        if (images.length >= 5) break;
      }
      
      if (images.length > 0) break; // Found images, stop searching
    }
    
    return images;
  }
  
  /**
   * Extract description from common patterns
   */
  private extractDescription(doc: Document): string | undefined {
    const selectors = [
      '[itemprop="description"]',
      '[property="og:description"]',
      '.product-description',
      '.productDescription',
      '#productDescription',
      '[class*="description"]',
      'main p',
      'article p'
    ];
    
    for (const selector of selectors) {
      const text = this.getTextContent(doc, selector);
      if (text && text.length > 20) {
        // Truncate very long descriptions
        return text.length > 500 ? text.substring(0, 500) + '...' : text;
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract reviews/ratings from common patterns
   */
  private extractReviews(doc: Document): { average: number | null; count: number | null } | null {
    let average: number | null = null;
    let count: number | null = null;
    
    // Rating selectors
    const ratingSelectors = [
      '[itemprop="ratingValue"]',
      '.rating-value',
      '.stars',
      '[aria-label*="rating"]',
      '[data-rating]'
    ];
    
    for (const selector of ratingSelectors) {
      const element = doc.querySelector(selector);
      if (!element) continue;
      
      const ratingText = element.getAttribute('content') || 
                        element.getAttribute('data-rating') ||
                        element.textContent?.trim();
      
      if (ratingText) {
        const rating = parseFloat(ratingText);
        if (!isNaN(rating) && rating >= 0 && rating <= 5) {
          average = rating;
          break;
        }
      }
    }
    
    // Review count selectors
    const countSelectors = [
      '[itemprop="reviewCount"]',
      '.review-count',
      '.reviews-count',
      '[aria-label*="reviews"]',
      '[data-review-count]'
    ];
    
    for (const selector of countSelectors) {
      const element = doc.querySelector(selector);
      if (!element) continue;
      
      const countText = element.getAttribute('content') ||
                       element.getAttribute('data-review-count') ||
                       element.textContent?.trim();
      
      if (countText) {
        // Extract number from text like "1,234 reviews"
        const match = countText.match(/[\d,]+/);
        if (match) {
          const reviewCount = parseInt(match[0].replace(/,/g, ''));
          if (!isNaN(reviewCount) && reviewCount > 0) {
            count = reviewCount;
            break;
          }
        }
      }
    }
    
    if (average !== null || count !== null) {
      return { average, count };
    }
    
    return null;
  }
}
