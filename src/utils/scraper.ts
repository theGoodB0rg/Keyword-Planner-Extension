/**
 * Web page content scraper utility
 */

import { PageMetadata } from './types';

/**
 * Extract clean content from a webpage
 */
export function extractPageContent(): PageMetadata {
  try {
    // Extract basic metadata
    const title = document.title || '';
    const description = getMetaDescription();
    const url = window.location.href;
    
    // Extract heading tags
    const h1Tags = Array.from(document.querySelectorAll('h1')).map(h => h.textContent?.trim() || '');
    const h2Tags = Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim() || '');
    
    // Extract main content using heuristics
    const mainText = extractMainContent();
    
    return {
      title,
      description,
      url,
      h1Tags,
      h2Tags,
      mainText
    };
  } catch (error) {
    console.error('Error extracting page content:', error);
    
    // Return fallback with minimal extraction
    return {
      title: document.title || '',
      description: '',
      url: window.location.href,
      h1Tags: [],
      h2Tags: [],
      mainText: document.body.innerText.substring(0, 5000) // Basic fallback
    };
  }
}

/**
 * Extract meta description
 */
function getMetaDescription(): string {
  const metaDescription = document.querySelector('meta[name="description"]');
  return metaDescription ? (metaDescription as HTMLMetaElement).content : '';
}

/**
 * Extract main content using heuristics
 */
function extractMainContent(): string {
  // Try to find the main content container using common selectors
  const possibleContentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.main-content',
    '#content',
    '#main',
    '.post-content',
    '.entry-content'
  ];
  
  let mainElement: Element | null = null;
  
  // Try each selector until we find something
  for (const selector of possibleContentSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // Find the element with the most text content
      let maxLength = 0;
      let bestElement = null;
      
      for (let i = 0; i < elements.length; i++) {
        const textLength = elements[i].textContent?.length || 0;
        if (textLength > maxLength) {
          maxLength = textLength;
          bestElement = elements[i];
        }
      }
      
      if (bestElement && maxLength > 200) {
        mainElement = bestElement;
        break;
      }
    }
  }
  
  // If we couldn't find a good container, use readability fallback
  if (!mainElement) {
    try {
      // Simple readability-like heuristic
      mainElement = findContentByParagraphDensity();
    } catch (error) {
      console.warn('Readability fallback failed:', error);
    }
  }
  
  // Extract text from the main element or fall back to body
  let mainText = '';
  if (mainElement) {
    mainText = extractCleanText(mainElement);
  } else {
    // Fall back to body text with basic cleaning
    mainText = extractCleanText(document.body);
  }
  
  return mainText;
}

/**
 * Find content by paragraph density (simple Readability-like algorithm)
 */
function findContentByParagraphDensity(): Element | null {
  const paragraphs = document.querySelectorAll('p');
  if (paragraphs.length === 0) return null;
  
  // Group paragraphs by their parent
  const parentScores = new Map<Element, number>();
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const parent = paragraph.parentElement;
    if (!parent) continue;
    
    // Score based on text length (prioritize longer paragraphs)
    const textLength = paragraph.textContent?.length || 0;
    const currentScore = parentScores.get(parent) || 0;
    parentScores.set(parent, currentScore + textLength);
  }
  
  // Find the highest-scoring parent
  let bestParent: Element | null = null;
  let highestScore = 0;
  
  parentScores.forEach((score, parent) => {
    if (score > highestScore) {
      highestScore = score;
      bestParent = parent;
    }
  });
  
  return bestParent;
}

/**
 * Clean up text content from an element
 */
function extractCleanText(element: Element): string {
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as Element;
  
  // Remove unwanted elements
  const unwantedSelectors = [
    'script',
    'style',
    'nav',
    'header',
    'footer',
    'aside',
    '.ad',
    '.ads',
    '.advertisement',
    '.sidebar',
    '.comment',
    '.menu',
    '.navigation'
  ];
  
  unwantedSelectors.forEach(selector => {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  });
  
  // Get the text and clean it up
  let text = clone.textContent || '';
  
  // Replace multiple whitespace with a single space
  text = text.replace(/\s+/g, ' ');
  
  // Remove leading/trailing whitespace
  text = text.trim();
  
  return text;
}

/**
 * Detect if the current page is likely an e-commerce product page
 */
export function isProductPage(): boolean {
  // Check for common product page indicators
  const hasProductSchema = document.querySelector('[itemtype*="Product"]') !== null;
  const hasPriceElement = document.querySelector('.price, #price, [itemprop="price"]') !== null;
  // Use safe detection for add-to-cart. :contains is not a valid CSS selector in querySelector, so check text manually.
  const hasAddToCartButton = (() => {
    try {
      // Quick hits: elements/classes/ids that include cart/basket
      if (document.querySelector('[class*="cart" i], [id*="cart" i], [class*="basket" i]')) {
        return true;
      }
      // Scan common clickable elements for intent keywords
      const candidates = Array.from(
        document.querySelectorAll('button, [role="button"], input[type="submit"], a[role="button"], a.btn, .btn')
      );
      const keywordRe = /(add to cart|add to bag|add to basket|buy now|add item|add to trolley|add to basket)/i;
      return candidates.some((el) => {
        const label = (el as HTMLElement).innerText || el.getAttribute('aria-label') || el.getAttribute('value') || '';
        return keywordRe.test(label);
      });
    } catch {
      return false;
    }
  })();
  
  // Check URL for product indicators
  const urlIndicators = ['product', 'item', 'details', 'buy', 'shop'];
  const urlHasProductIndicator = urlIndicators.some(indicator => 
    window.location.href.toLowerCase().includes(indicator)
  );
  
  // Return true if multiple indicators are found
  let score = 0;
  if (hasProductSchema) score += 2;
  if (hasPriceElement) score += 1;
  if (hasAddToCartButton) score += 1;
  if (urlHasProductIndicator) score += 1;
  
  return score >= 2;
} 