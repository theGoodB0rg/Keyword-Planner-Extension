/**
 * Structured Data Extractor
 * 
 * Phase 3: Modular Extraction Architecture
 * 
 * Extracts product data from structured semantic markup:
 * - JSON-LD (schema.org/Product) - Priority 1, 95% confidence
 * - Microdata (itemprop attributes) - Priority 2, 85% confidence  
 * - OpenGraph (og:* meta tags) - Priority 3, 70% confidence
 * 
 * This extractor has the highest priority because structured data
 * is the most reliable source of product information.
 */

import { BaseExtractor, ExtractionResult } from './types';
import { ProductData } from '../../../types/product';

/**
 * JSON-LD Structured Data Extractor
 * Priority: 900 (highest - most reliable)
 */
export class JsonLdExtractor extends BaseExtractor {
  readonly name = 'JsonLdExtractor';
  readonly priority = 900;
  
  canExtract(doc: Document): boolean {
    return doc.querySelector('script[type="application/ld+json"]') !== null;
  }
  
  async extract(doc: Document): Promise<ExtractionResult> {
    const productData: Partial<ProductData> = {};
    
    // Find all JSON-LD script tags
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of Array.from(scripts)) {
      try {
        const data = JSON.parse(script.textContent || '');
        const items = Array.isArray(data) ? data : [data];
        
        for (const item of items) {
          const product = this.findProductInJsonLd(item);
          if (product) {
            this.mergeJsonLdData(productData, product);
            break; // Found product, stop searching
          }
        }
        
        if (productData.title) break; // Got product data, stop
      } catch (error) {
        console.warn('Failed to parse JSON-LD:', error);
      }
    }
    
    return this.createResult(
      productData,
      0.95, // Very high confidence for JSON-LD
      'structured',
      'json-ld',
      { scriptCount: scripts.length }
    );
  }
  
  /**
   * Recursively find Product schema in JSON-LD
   */
  private findProductInJsonLd(obj: any): any {
    if (!obj || typeof obj !== 'object') return null;
    
    // Check if this is a Product
    if (obj['@type'] === 'Product' || obj['@type']?.includes?.('Product')) {
      return obj;
    }
    
    // Search nested structures
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      
      if (Array.isArray(value)) {
        for (const item of value) {
          const found = this.findProductInJsonLd(item);
          if (found) return found;
        }
      } else if (typeof value === 'object') {
        const found = this.findProductInJsonLd(value);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * Merge JSON-LD product data into ProductData
   */
  private mergeJsonLdData(productData: Partial<ProductData>, product: any): void {
    // Basic info
    if (product.name) productData.title = product.name;
    if (product.description) productData.descriptionText = product.description;
    
    // Images
    if (product.image) {
      let imageUrl: string | undefined;
      if (typeof product.image === 'string') {
        imageUrl = product.image;
      } else if (Array.isArray(product.image)) {
        imageUrl = product.image[0];
      } else if (product.image.url) {
        imageUrl = product.image.url;
      }
      
      if (imageUrl) {
        productData.images = [{ src: imageUrl, alt: product.name || null }];
      }
    }
    
    // Brand
    if (product.brand) {
      if (typeof product.brand === 'string') {
        productData.brand = product.brand;
      } else if (product.brand.name) {
        productData.brand = product.brand.name;
      }
    }
    
    // Price from offers
    if (product.offers) {
      const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
      const firstOffer = offers[0];
      
      if (firstOffer?.price) {
        const priceNum = typeof firstOffer.price === 'number' 
          ? firstOffer.price 
          : parseFloat(String(firstOffer.price));
        
        if (!isNaN(priceNum)) {
          productData.price = {
            value: priceNum,
            currency: firstOffer.priceCurrency || null,
            raw: String(firstOffer.price)
          };
        }
      }
    }
    
    // Direct price property (fallback)
    if (!productData.price && product.price) {
      const priceNum = typeof product.price === 'number'
        ? product.price
        : parseFloat(String(product.price));
      
      if (!isNaN(priceNum)) {
        productData.price = {
          value: priceNum,
          currency: product.priceCurrency || null,
          raw: String(product.price)
        };
      }
    }
    
    // Rating
    if (product.aggregateRating) {
      const rating = product.aggregateRating.ratingValue;
      const count = product.aggregateRating.reviewCount;
      
      const ratingValue = rating ? 
        (typeof rating === 'number' ? rating : parseFloat(String(rating))) : null;
      const reviewCount = count ?
        (typeof count === 'number' ? count : parseInt(String(count))) : null;
      
      if (ratingValue !== null || reviewCount !== null) {
        productData.reviews = {
          average: ratingValue,
          count: reviewCount
        };
      }
    }
    
    // SKU/GTIN
    if (product.sku) productData.sku = String(product.sku);
    if (product.gtin && !productData.sku) productData.sku = String(product.gtin);
  }
}

/**
 * Microdata Extractor
 * Priority: 850 (high - reliable structured data)
 */
export class MicrodataExtractor extends BaseExtractor {
  readonly name = 'MicrodataExtractor';
  readonly priority = 850;
  
  canExtract(doc: Document): boolean {
    return doc.querySelector('[itemtype*="schema.org/Product"]') !== null;
  }
  
  async extract(doc: Document): Promise<ExtractionResult> {
    const productData: Partial<ProductData> = {};
    
    // Find Product microdata elements
    const productElements = doc.querySelectorAll('[itemtype*="schema.org/Product"]');
    
    if (productElements.length > 0) {
      // Use first product element
      const element = productElements[0];
      this.extractFromMicrodata(productData, element);
    }
    
    return this.createResult(
      productData,
      0.85, // High confidence for microdata
      'structured',
      'microdata',
      { elementCount: productElements.length }
    );
  }
  
  /**
   * Extract product data from microdata element
   */
  private extractFromMicrodata(productData: Partial<ProductData>, element: Element): void {
    const getProp = (propName: string): string | null => {
      const el = element.querySelector(`[itemprop="${propName}"]`);
      if (!el) return null;
      
      // Check for content attribute first
      if (el.hasAttribute('content')) {
        return el.getAttribute('content');
      }
      
      // Element-specific attributes
      if (el.tagName === 'META') return el.getAttribute('content');
      if (el.tagName === 'IMG') return el.getAttribute('src');
      if (el.tagName === 'A') return el.getAttribute('href');
      
      return el.textContent?.trim() || null;
    };
    
    // Extract fields
    const name = getProp('name');
    if (name) productData.title = name;
    
    const description = getProp('description');
    if (description) productData.descriptionText = description;
    
    const image = getProp('image');
    if (image) {
      productData.images = [{ src: image, alt: name || null }];
    }
    
    const brand = getProp('brand');
    if (brand) productData.brand = brand;
    
    // Price
    const priceEl = element.querySelector('[itemprop="price"]');
    const currency = getProp('priceCurrency');
    
    if (priceEl) {
      const priceStr = priceEl.getAttribute('content') || priceEl.textContent?.trim();
      if (priceStr) {
        const priceValue = this.parsePrice(priceStr);
        if (priceValue !== undefined) {
          productData.price = {
            value: priceValue,
            currency: currency,
            raw: priceStr
          };
        }
      }
    }
    
    // Rating
    const ratingStr = getProp('ratingValue');
    const reviewCountStr = getProp('reviewCount');
    
    const ratingValue = ratingStr ? parseFloat(ratingStr) : null;
    const reviewCount = reviewCountStr ? parseInt(reviewCountStr) : null;
    
    if (ratingValue !== null || reviewCount !== null) {
      productData.reviews = {
        average: !isNaN(ratingValue!) ? ratingValue : null,
        count: !isNaN(reviewCount!) ? reviewCount : null
      };
    }
    
    // SKU
    const sku = getProp('sku');
    if (sku) productData.sku = sku;
  }
}

/**
 * OpenGraph Meta Tags Extractor
 * Priority: 800 (medium-high - common but less structured)
 */
export class OpenGraphExtractor extends BaseExtractor {
  readonly name = 'OpenGraphExtractor';
  readonly priority = 800;
  
  canExtract(doc: Document): boolean {
    return doc.querySelector('meta[property^="og:"]') !== null;
  }
  
  async extract(doc: Document): Promise<ExtractionResult> {
    const productData: Partial<ProductData> = {};
    
    const getMetaContent = (property: string): string | null => {
      const meta = doc.querySelector(`meta[property="${property}"]`);
      return meta?.getAttribute('content') || null;
    };
    
    // Extract OpenGraph fields
    const title = getMetaContent('og:title');
    if (title) productData.title = title;
    
    const description = getMetaContent('og:description');
    if (description) productData.descriptionText = description;
    
    const image = getMetaContent('og:image');
    if (image) {
      productData.images = [{ src: image, alt: title || null }];
    }
    
    const url = getMetaContent('og:url');
    if (url) productData.url = url;
    
    // Product-specific OpenGraph
    const priceAmount = getMetaContent('og:price:amount') || getMetaContent('product:price:amount');
    const currency = getMetaContent('og:price:currency') || getMetaContent('product:price:currency');
    
    if (priceAmount) {
      const priceValue = this.parsePrice(priceAmount);
      if (priceValue !== undefined) {
        productData.price = {
          value: priceValue,
          currency: currency,
          raw: priceAmount
        };
      }
    }
    
    const brand = getMetaContent('og:brand') || getMetaContent('product:brand');
    if (brand) productData.brand = brand;
    
    return this.createResult(
      productData,
      0.70, // Medium confidence for OpenGraph
      'structured',
      'opengraph',
      { metaTagCount: doc.querySelectorAll('meta[property^="og:"]').length }
    );
  }
}
