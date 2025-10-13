/**
 * Stopwords and keyword relevance filtering
 * Filters out low-value keywords and generic terms from analysis results
 */

import { ProductData } from '../types/product';

/**
 * Comprehensive stopword list - words that add no SEO/search value
 * Categories: articles, prepositions, pronouns, conjunctions, common e-commerce terms
 */
export const STOPWORDS = new Set([
  // Articles
  'a', 'an', 'the',
  
  // Prepositions
  'in', 'on', 'at', 'by', 'for', 'from', 'to', 'with', 'about', 'into', 
  'through', 'during', 'before', 'after', 'above', 'below', 'between', 
  'under', 'along', 'across', 'behind', 'beyond', 'plus', 'except', 'up', 'down',
  
  // Pronouns
  'your', 'our', 'their', 'its', 'his', 'her', 'my', 'yours', 'theirs', 
  'mine', 'ours', 'this', 'that', 'these', 'those', 'it', 'they', 'we',
  
  // Conjunctions
  'and', 'or', 'but', 'nor', 'so', 'yet', 'if', 'because', 'while', 
  'when', 'where', 'although', 'unless', 'until', 'than',
  
  // Common verbs (low value)
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'can', 'get', 'got', 'make', 'made', 'take', 'took', 'use', 'used',
  
  // E-commerce generic terms (low SEO value)
  'item', 'items', 'product', 'products', 'page', 'pages', 'site',
  'website', 'store', 'shop', 'shopping', 'cart', 'checkout',
  'ships', 'shipping', 'shipped', 'delivery', 'delivered', 'free',
  'fast', 'quick', 'now', 'today', 'new', 'order', 'orders',
  'add', 'added', 'adding', 'save', 'saved', 'view', 'views',
  
  // Quantity/numbers as words (usually not valuable as standalone keywords)
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'first', 'second', 'third', 'each', 'every', 'all', 'both', 'few', 'many',
  'some', 'any', 'more', 'most', 'other', 'another', 'such',
  
  // Generic descriptors (too broad)
  'good', 'great', 'best', 'better', 'nice', 'perfect', 'excellent',
  'amazing', 'awesome', 'fantastic', 'wonderful', 'beautiful', 'lovely',
  
  // Time/date words
  'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years',
  'time', 'times',
  
  // Navigation/UI terms
  'home', 'back', 'next', 'previous', 'search', 'find', 'show', 'hide',
  'open', 'close', 'click', 'select', 'choose',
  
  // Generic verbs/actions
  'go', 'goes', 'went', 'come', 'came', 'see', 'seen', 'saw', 'look',
  'looks', 'looked', 'give', 'given', 'gave', 'know', 'known', 'knew',
  
  // Size indicators (too generic alone)
  'big', 'small', 'large', 'medium', 'little', 'tiny', 'huge',
  
  // Other common stopwords
  'yes', 'no', 'not', 'only', 'just', 'like', 'way', 'even', 'also',
  'well', 'much', 'very', 'too', 'off', 'out', 'over', 'then', 'there',
  'here', 'how', 'what', 'who', 'which', 'why', 'try', 'via'
]);

/**
 * Minimum keyword length (characters)
 */
export const MIN_KEYWORD_LENGTH = 3;

/**
 * Minimum relevance score (0-1) for keyword to be included
 */
export const MIN_RELEVANCE_SCORE = 0.2;

/**
 * Calculate keyword relevance score based on product context
 * @param keyword - The keyword to score
 * @param product - Product data for context
 * @returns Score from 0 (irrelevant) to 1 (highly relevant)
 */
export function calculateKeywordRelevance(keyword: string, product: ProductData): number {
  let score = 0;
  const lowerKeyword = keyword.toLowerCase();
  const titleLower = product.title.toLowerCase();
  const bulletsText = product.bullets.join(' ').toLowerCase();
  const descLower = product.descriptionText.toLowerCase();
  const categoryText = product.categoryPath.join(' ').toLowerCase();

  // +0.4 if keyword appears in title (most important)
  if (titleLower.includes(lowerKeyword)) {
    score += 0.4;
  }

  // +0.2 if keyword appears in bullets (very important)
  if (bulletsText.includes(lowerKeyword)) {
    score += 0.2;
  }

  // +0.15 if keyword appears in category path
  if (categoryText.includes(lowerKeyword)) {
    score += 0.15;
  }

  // +0.1 if keyword appears in description
  if (descLower.includes(lowerKeyword)) {
    score += 0.1;
  }

  // +0.3 if keyword has commercial intent (buy/price related terms)
  const commercialIntentPatterns = [
    /buy/i, /purchase/i, /order/i, /price/i, /cost/i, /cheap/i, /affordable/i,
    /deal/i, /sale/i, /discount/i, /best/i, /top/i, /review/i, /compare/i,
    /vs/i, /versus/i, /alternative/i
  ];
  
  if (commercialIntentPatterns.some(pattern => pattern.test(lowerKeyword))) {
    score += 0.3;
  }

  // +0.2 if keyword is a brand name or product feature
  if (product.brand && lowerKeyword.includes(product.brand.toLowerCase())) {
    score += 0.2;
  }

  // Penalty: -0.3 if keyword is too generic (single common word)
  const genericTerms = ['product', 'item', 'thing', 'stuff', 'quality', 'value', 'price'];
  if (genericTerms.includes(lowerKeyword)) {
    score -= 0.3;
  }

  // Cap score at 1.0
  return Math.max(0, Math.min(score, 1.0));
}

/**
 * Filter keywords by removing stopwords and low-relevance terms
 * @param keywords - Array of keyword strings
 * @param productContext - Product data for relevance calculation
 * @returns Filtered array of keywords
 */
export function filterKeywords(keywords: string[], productContext?: ProductData): string[] {
  return keywords.filter(kw => {
    const trimmed = kw.trim();
    
    // Length check
    if (trimmed.length < MIN_KEYWORD_LENGTH) {
      return false;
    }

    // Stopword check
    const lowerKw = trimmed.toLowerCase();
    if (STOPWORDS.has(lowerKw)) {
      return false;
    }

    // Check if keyword is only numbers
    if (/^\d+$/.test(trimmed)) {
      return false;
    }

    // Relevance check (if product context provided)
    if (productContext) {
      const score = calculateKeywordRelevance(trimmed, productContext);
      if (score < MIN_RELEVANCE_SCORE) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter an array of KeywordData objects
 */
export function filterKeywordData<T extends { keyword: string }>(
  keywords: T[],
  productContext?: ProductData
): T[] {
  return keywords.filter(kw => {
    const trimmed = kw.keyword.trim();
    
    if (trimmed.length < MIN_KEYWORD_LENGTH) return false;
    if (STOPWORDS.has(trimmed.toLowerCase())) return false;
    if (/^\d+$/.test(trimmed)) return false;
    
    if (productContext) {
      const score = calculateKeywordRelevance(trimmed, productContext);
      if (score < MIN_RELEVANCE_SCORE) return false;
    }
    
    return true;
  });
}

/**
 * Check if a single keyword is a stopword
 */
export function isStopword(keyword: string): boolean {
  return STOPWORDS.has(keyword.toLowerCase().trim());
}

/**
 * Get stopwords count in a text
 */
export function countStopwords(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  return words.filter(word => STOPWORDS.has(word)).length;
}

/**
 * Calculate stopword ratio in text (0-1)
 */
export function stopwordRatio(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;
  const stopwordCount = words.filter(word => STOPWORDS.has(word)).length;
  return stopwordCount / words.length;
}
