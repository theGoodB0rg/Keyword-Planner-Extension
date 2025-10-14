/**
 * Semantic Product Detection Module
 * 
 * Phase 1: Smart Product Detection
 * Extracts structured product data using semantic signals:
 * - JSON-LD (schema.org/Product)
 * - Microdata attributes
 * - OpenGraph meta tags
 * 
 * This provides platform-agnostic detection that works across marketplaces
 * without relying on brittle CSS selectors.
 */

import { logPlatformDetection } from '../../utils/telemetry';

/**
 * Structured product data extracted from semantic sources
 */
export interface SemanticProductData {
  // Core fields
  name?: string;
  description?: string;
  image?: string | string[];
  url?: string;
  
  // Pricing
  price?: number;
  priceCurrency?: string;
  priceValidUntil?: string;
  
  // Availability
  availability?: string; // InStock, OutOfStock, PreOrder, etc.
  
  // Brand/Manufacturer
  brand?: string;
  manufacturer?: string;
  
  // Identifiers
  sku?: string;
  gtin?: string;
  mpn?: string;
  
  // Ratings/Reviews
  aggregateRating?: {
    ratingValue?: number;
    reviewCount?: number;
    bestRating?: number;
    worstRating?: number;
  };
  
  // Offers
  offers?: Array<{
    price?: number;
    priceCurrency?: string;
    availability?: string;
    seller?: string;
  }>;
  
  // Source metadata
  source: 'json-ld' | 'microdata' | 'opengraph' | 'meta';
  confidence: number; // 0-1
}

/**
 * Platform detection result with confidence scoring
 */
export interface PlatformDetectionResult {
  platform: 'amazon' | 'etsy' | 'walmart' | 'ebay' | 'shopify' | 'woocommerce' | 'generic';
  confidence: number; // 0-1
  signals: Record<string, boolean | string | number>;
  detectionMethod: string;
}

/**
 * Parse JSON-LD structured data from the page
 */
export function parseJsonLd(): SemanticProductData[] {
  const results: SemanticProductData[] = [];
  
  // Find all JSON-LD script tags
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  
  scripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent || '');
      
      // Handle both single objects and arrays
      const items = Array.isArray(data) ? data : [data];
      
      items.forEach(item => {
        // Look for Product schema or nested Product
        const product = findProductInJsonLd(item);
        if (product) {
          results.push(extractFromJsonLd(product));
        }
      });
    } catch (error) {
      console.warn('Failed to parse JSON-LD:', error);
    }
  });
  
  return results;
}

/**
 * Recursively find Product schema in nested JSON-LD
 */
function findProductInJsonLd(obj: any): any | null {
  if (!obj || typeof obj !== 'object') return null;
  
  // Check if this is a Product
  const type = obj['@type'];
  if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) {
    return obj;
  }
  
  // Check common nested locations
  if (obj.mainEntity && typeof obj.mainEntity === 'object') {
    const nested = findProductInJsonLd(obj.mainEntity);
    if (nested) return nested;
  }
  
  // Check itemListElement for product listings
  if (Array.isArray(obj.itemListElement)) {
    for (const item of obj.itemListElement) {
      const nested = findProductInJsonLd(item);
      if (nested) return nested;
    }
  }
  
  // Check graph structure
  if (Array.isArray(obj['@graph'])) {
    for (const graphItem of obj['@graph']) {
      const nested = findProductInJsonLd(graphItem);
      if (nested) return nested;
    }
  }
  
  return null;
}

/**
 * Extract product data from JSON-LD Product schema
 */
function extractFromJsonLd(product: any): SemanticProductData {
  const data: SemanticProductData = {
    source: 'json-ld',
    confidence: 0.95 // JSON-LD is highly reliable
  };
  
  // Basic fields
  if (product.name) data.name = String(product.name);
  if (product.description) data.description = String(product.description);
  if (product.image) {
    data.image = Array.isArray(product.image) ? product.image : [product.image];
  }
  if (product.url) data.url = String(product.url);
  
  // Brand
  if (product.brand) {
    if (typeof product.brand === 'string') {
      data.brand = product.brand;
    } else if (product.brand.name) {
      data.brand = String(product.brand.name);
    }
  }
  
  // Manufacturer
  if (product.manufacturer) {
    if (typeof product.manufacturer === 'string') {
      data.manufacturer = product.manufacturer;
    } else if (product.manufacturer.name) {
      data.manufacturer = String(product.manufacturer.name);
    }
  }
  
  // Identifiers
  if (product.sku) data.sku = String(product.sku);
  if (product.gtin || product.gtin13 || product.gtin14 || product.gtin8) {
    data.gtin = String(product.gtin || product.gtin13 || product.gtin14 || product.gtin8);
  }
  if (product.mpn) data.mpn = String(product.mpn);
  
  // Offers - handle both single offer and array
  const offers = Array.isArray(product.offers) ? product.offers : [product.offers].filter(Boolean);
  
  if (offers.length > 0) {
    data.offers = offers.map((offer: any) => ({
      price: offer.price ? parseFloat(offer.price) : undefined,
      priceCurrency: offer.priceCurrency,
      availability: offer.availability,
      seller: offer.seller?.name || offer.seller
    }));
    
    // Set top-level price from first offer
    const firstOffer = offers[0];
    if (firstOffer.price) {
      data.price = parseFloat(firstOffer.price);
      data.priceCurrency = firstOffer.priceCurrency;
      data.availability = firstOffer.availability;
    }
    if (firstOffer.priceValidUntil) {
      data.priceValidUntil = firstOffer.priceValidUntil;
    }
  }
  
  // Aggregate rating
  if (product.aggregateRating) {
    data.aggregateRating = {
      ratingValue: product.aggregateRating.ratingValue ? parseFloat(product.aggregateRating.ratingValue) : undefined,
      reviewCount: product.aggregateRating.reviewCount ? parseInt(product.aggregateRating.reviewCount) : undefined,
      bestRating: product.aggregateRating.bestRating ? parseFloat(product.aggregateRating.bestRating) : undefined,
      worstRating: product.aggregateRating.worstRating ? parseFloat(product.aggregateRating.worstRating) : undefined
    };
  }
  
  return data;
}

/**
 * Parse microdata attributes from HTML elements
 */
export function parseMicrodata(): SemanticProductData[] {
  const results: SemanticProductData[] = [];
  
  // Find elements with itemtype="http://schema.org/Product"
  const productElements = document.querySelectorAll('[itemtype*="schema.org/Product"]');
  
  productElements.forEach(element => {
    const data = extractFromMicrodata(element);
    if (data.name || data.price) { // Must have at least name or price
      results.push(data);
    }
  });
  
  return results;
}

/**
 * Extract product data from microdata attributes
 */
function extractFromMicrodata(element: Element): SemanticProductData {
  const data: SemanticProductData = {
    source: 'microdata',
    confidence: 0.85 // Microdata is reliable but less common
  };
  
  // Helper to find itemprop within scope
  const getProp = (propName: string): string | null => {
    const el = element.querySelector(`[itemprop="${propName}"]`);
    if (!el) return null;
    
    // Check for content attribute first
    if (el.hasAttribute('content')) {
      return el.getAttribute('content');
    }
    
    // Then check for value in specific elements
    if (el.tagName === 'META') {
      return el.getAttribute('content');
    }
    if (el.tagName === 'IMG') {
      return el.getAttribute('src');
    }
    if (el.tagName === 'A') {
      return el.getAttribute('href');
    }
    
    return el.textContent?.trim() || null;
  };
  
  // Extract basic fields
  data.name = getProp('name') || undefined;
  data.description = getProp('description') || undefined;
  data.image = getProp('image') || undefined;
  data.url = getProp('url') || undefined;
  data.brand = getProp('brand') || undefined;
  data.sku = getProp('sku') || undefined;
  data.gtin = getProp('gtin') || getProp('gtin13') || getProp('gtin14') || undefined;
  data.mpn = getProp('mpn') || undefined;
  
  // Extract price from offers
  const priceEl = element.querySelector('[itemprop="price"]');
  if (priceEl) {
    const priceStr = priceEl.getAttribute('content') || priceEl.textContent?.trim();
    if (priceStr) {
      const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
      if (!isNaN(priceNum)) {
        data.price = priceNum;
      }
    }
  }
  
  data.priceCurrency = getProp('priceCurrency') || undefined;
  data.availability = getProp('availability') || undefined;
  
  // Extract rating
  const ratingValue = getProp('ratingValue');
  const reviewCount = getProp('reviewCount');
  if (ratingValue || reviewCount) {
    data.aggregateRating = {
      ratingValue: ratingValue ? parseFloat(ratingValue) : undefined,
      reviewCount: reviewCount ? parseInt(reviewCount) : undefined
    };
  }
  
  return data;
}

/**
 * Parse OpenGraph meta tags
 */
export function parseOpenGraph(): SemanticProductData | null {
  const data: SemanticProductData = {
    source: 'opengraph',
    confidence: 0.7 // OpenGraph is common but less product-specific
  };
  
  // Helper to get OG meta content
  const getOgMeta = (property: string): string | null => {
    const el = document.querySelector(`meta[property="og:${property}"], meta[name="og:${property}"]`);
    return el?.getAttribute('content') || null;
  };
  
  // Check if this is a product page
  const ogType = getOgMeta('type');
  const isProduct = ogType?.includes('product') || false;
  
  // Extract basic OG fields
  data.name = getOgMeta('title') || undefined;
  data.description = getOgMeta('description') || undefined;
  data.image = getOgMeta('image') || undefined;
  data.url = getOgMeta('url') || undefined;
  
  // Product-specific OG tags
  const price = getOgMeta('price:amount') || getOgMeta('product:price:amount');
  if (price) {
    data.price = parseFloat(price);
    data.priceCurrency = getOgMeta('price:currency') || getOgMeta('product:price:currency') || undefined;
  }
  
  data.brand = getOgMeta('brand') || getOgMeta('product:brand') || undefined;
  data.availability = getOgMeta('availability') || getOgMeta('product:availability') || undefined;
  
  // Only return if we have meaningful product data
  if (isProduct || data.price || data.brand) {
    return data;
  }
  
  return null;
}

/**
 * Parse additional meta tags (Twitter, etc.)
 */
export function parseMetaTags(): Partial<SemanticProductData> {
  const data: Partial<SemanticProductData> = {};
  
  // Helper to get meta content
  const getMeta = (name: string): string | null => {
    const selectors = [
      `meta[name="${name}"]`,
      `meta[property="${name}"]`,
      `meta[itemprop="${name}"]`
    ];
    
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el.getAttribute('content');
    }
    return null;
  };
  
  // Twitter card
  data.name = getMeta('twitter:title') || undefined;
  data.description = getMeta('twitter:description') || undefined;
  data.image = getMeta('twitter:image') || undefined;
  
  // Standard meta tags
  if (!data.description) {
    data.description = getMeta('description') || undefined;
  }
  
  return data;
}

/**
 * Combine all semantic sources with priority ordering
 */
export function extractSemanticData(): SemanticProductData | null {
  // Try JSON-LD first (highest confidence)
  const jsonLdResults = parseJsonLd();
  if (jsonLdResults.length > 0) {
    return jsonLdResults[0]; // Use first result
  }
  
  // Try microdata second
  const microdataResults = parseMicrodata();
  if (microdataResults.length > 0) {
    return microdataResults[0];
  }
  
  // Try OpenGraph
  const ogData = parseOpenGraph();
  if (ogData) {
    return ogData;
  }
  
  // Fallback to meta tags (lowest confidence)
  const metaData = parseMetaTags();
  if (metaData.name || metaData.description) {
    return {
      ...metaData,
      source: 'meta',
      confidence: 0.5
    } as SemanticProductData;
  }
  
  return null;
}

/**
 * Detect if page is a product page using semantic signals
 */
export function isProductPageSemantic(): { isProduct: boolean; confidence: number; source?: string } {
  // Check JSON-LD
  const jsonLdProducts = parseJsonLd();
  if (jsonLdProducts.length > 0) {
    return { isProduct: true, confidence: 0.95, source: 'json-ld' };
  }
  
  // Check microdata
  const microdataProducts = parseMicrodata();
  if (microdataProducts.length > 0) {
    return { isProduct: true, confidence: 0.85, source: 'microdata' };
  }
  
  // Check OpenGraph
  const ogData = parseOpenGraph();
  if (ogData && (ogData.price || ogData.brand)) {
    return { isProduct: true, confidence: 0.7, source: 'opengraph' };
  }
  
  return { isProduct: false, confidence: 0 };
}

/**
 * Enhanced platform detection using semantic signals + hostname
 */
export function detectPlatformSemantic(): PlatformDetectionResult {
  const host = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  
  const signals: Record<string, boolean | string | number> = {
    hostname: host,
    pathname: pathname
  };
  
  let platform: PlatformDetectionResult['platform'] = 'generic';
  let confidence = 0.5;
  let detectionMethod = 'default';
  
  // Hostname-based detection (highest confidence)
  if (host.includes('amazon.')) {
    platform = 'amazon';
    confidence = 1.0;
    detectionMethod = 'hostname';
    signals.hostname_amazon = true;
  } else if (host.includes('etsy.')) {
    platform = 'etsy';
    confidence = 1.0;
    detectionMethod = 'hostname';
    signals.hostname_etsy = true;
  } else if (host.includes('walmart.')) {
    platform = 'walmart';
    confidence = 1.0;
    detectionMethod = 'hostname';
    signals.hostname_walmart = true;
  } else if (host.includes('ebay.')) {
    platform = 'ebay';
    confidence = 1.0;
    detectionMethod = 'hostname';
    signals.hostname_ebay = true;
  }
  
  // Shopify detection
  if ((window as any).Shopify) {
    signals.window_shopify = true;
    if (platform === 'generic') {
      platform = 'shopify';
      confidence = 0.95;
      detectionMethod = 'window.Shopify';
    }
  }
  
  const shopifyMeta = document.querySelector("meta[name='shopify-digital-wallet']");
  if (shopifyMeta) {
    signals.meta_shopify = true;
    if (platform === 'generic') {
      platform = 'shopify';
      confidence = 0.9;
      detectionMethod = 'meta[shopify]';
    }
  }
  
  // WooCommerce detection
  const wooClass = document.querySelector('[class*="woocommerce"]');
  const wooBody = document.body.classList.toString().includes('woocommerce');
  if (wooClass || wooBody) {
    signals.class_woocommerce = true;
    if (platform === 'generic') {
      platform = 'woocommerce';
      confidence = 0.85;
      detectionMethod = 'woocommerce class';
    }
  }
  
  // Check JSON-LD for additional signals
  const semanticData = extractSemanticData();
  if (semanticData) {
    signals.has_semantic_data = true;
    signals.semantic_source = semanticData.source;
    signals.semantic_confidence = semanticData.confidence;
    
    // Boost confidence if we have semantic data
    if (platform === 'generic') {
      confidence = Math.max(confidence, 0.6);
    }
  }
  
  // Log the detection result (convert signals to boolean-only for telemetry)
  const booleanSignals: Record<string, boolean> = {};
  Object.keys(signals).forEach(key => {
    if (typeof signals[key] === 'boolean') {
      booleanSignals[key] = signals[key] as boolean;
    } else {
      booleanSignals[key] = !!signals[key];
    }
  });
  logPlatformDetection(platform, confidence, booleanSignals).catch(console.error);
  
  return {
    platform,
    confidence,
    signals,
    detectionMethod
  };
}

/**
 * Check if page has enough product signals to analyze
 */
export function shouldAnalyzePageSemantic(): { 
  shouldAnalyze: boolean; 
  reason: string; 
  confidence: number;
} {
  // Check semantic signals first
  const productCheck = isProductPageSemantic();
  if (productCheck.isProduct) {
    return {
      shouldAnalyze: true,
      reason: `Product detected via ${productCheck.source}`,
      confidence: productCheck.confidence
    };
  }
  
  // Check for common product page URL patterns
  const pathname = window.location.pathname.toLowerCase();
  const productUrlPatterns = [
    /\/dp\/[A-Z0-9]+/i,        // Amazon ASIN
    /\/product\//i,              // Generic /product/
    /\/item\//i,                 // eBay, Etsy
    /\/listing\//i,              // Etsy
    /\/p\//i,                    // Walmart, Target
    /\/gp\/product\//i,          // Amazon
    /\/products\//i              // Shopify
  ];
  
  for (const pattern of productUrlPatterns) {
    if (pattern.test(pathname)) {
      return {
        shouldAnalyze: true,
        reason: 'Product URL pattern matched',
        confidence: 0.7
      };
    }
  }
  
  // Check page content as fallback
  const contentLength = document.body.innerText.length;
  if (contentLength < 500) {
    return {
      shouldAnalyze: false,
      reason: 'Insufficient content (< 500 chars)',
      confidence: 0
    };
  }
  
  // Check for product-like content
  const hasPriceSymbols = /[$£€¥₹]/.test(document.body.textContent || '');
  const hasAddToCart = /add to (cart|bag|basket)|buy now|purchase/i.test(document.body.textContent || '');
  
  if (hasPriceSymbols && hasAddToCart) {
    return {
      shouldAnalyze: true,
      reason: 'Product-like content detected (price + add to cart)',
      confidence: 0.6
    };
  }
  
  // Default: don't analyze
  return {
    shouldAnalyze: false,
    reason: 'No product signals detected',
    confidence: 0
  };
}
