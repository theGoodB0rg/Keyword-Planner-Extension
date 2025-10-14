/**
 * Content script - Runs in the context of web pages
 */

import { extractPageContent, isProductPage } from './utils/scraper';
import { PageMetadata } from './utils/types';
import { scrapeProduct } from './content/scraper/productScraper';
import { 
  logPlatformDetection, 
  logExtraction, 
  logExtractionFailure, 
  logNavigation 
} from './utils/telemetry';
import { shouldAnalyzePageSemantic } from './content/scraper/semanticDetection';

// Ensure we only initialize once per page
let initialized = false;

// Wait for the page to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add a small delay to ensure all content has loaded
  setTimeout(() => {
    if (!initialized) initialize();
  }, 1000);
});

// Initialize if document is already loaded
if (document.readyState === 'complete') {
  if (!initialized) initialize();
}

/**
 * Initialize the content script
 */
function initialize() {
  try {
    if (initialized) return;
    initialized = true;
    console.log('AI Keyword Planner: Content script initialized');

    // Log initial page load
    logNavigation('initial', {
      url: window.location.href,
      pathname: window.location.pathname,
      hostname: window.location.hostname
    }).catch(console.error);

    // Check if this page is a product or content-rich page worth analyzing
    if (shouldAnalyzePage()) {
      // Extract the page content
      const pageData = extractPageContent();
      
      // Send the extracted data to the background script
      sendToBackground(pageData);
      
      // Set up the UI button
      setupUI();
    } else {
      // Notify extension UI that this page is unsupported
  chrome.runtime.sendMessage({ action: 'pageUnsupported', url: window.location.href, reason: 'nonProductPage' });
      // Optional in-page banner
      try {
        const banner = document.createElement('div');
        banner.style.position = 'fixed';
        banner.style.bottom = '16px';
        banner.style.left = '16px';
        banner.style.zIndex = '9999';
        banner.style.background = '#fff3cd';
        banner.style.color = '#664d03';
        banner.style.border = '1px solid #ffecb5';
        banner.style.padding = '8px 12px';
        banner.style.borderRadius = '4px';
        banner.style.boxShadow = '0 2px 6px rgba(0,0,0,.1)';
        banner.textContent = 'This page is not supported for analysis.';
        document.body.appendChild(banner);
        setTimeout(() => banner.remove(), 5000);
      } catch {}
    }
  } catch (error) {
    console.error('AI Keyword Planner: Error in content script', error);
  }
}

/**
 * Determine if the current page should be analyzed
 * Phase 1: Now uses semantic-first detection instead of rigid heuristics
 */
function shouldAnalyzePage(): boolean {
  // Skip login pages, error pages, etc.
  const skipPatterns = [
    /\/login\/?$/i,
    /\/register\/?$/i,
    /\/signin\/?$/i,
    /\/signup\/?$/i,
    /\/error\/?$/i,
    /\/404\/?$/i
  ];
  
  if (skipPatterns.some(pattern => pattern.test(window.location.pathname))) {
    logExtractionFailure('unknown', 'Page rejected: matches skip pattern', {
      pathname: window.location.pathname,
      url: window.location.href
    }).catch(console.error);
    return false;
  }
  
  // Use semantic detection (Phase 1)
  const semanticCheck = shouldAnalyzePageSemantic();
  
  if (semanticCheck.shouldAnalyze) {
    // Log success with reason
    console.log(`AI Keyword Planner: Page accepted - ${semanticCheck.reason} (confidence: ${semanticCheck.confidence})`);
    return true;
  }
  
  // Fallback: Check old isProductPage logic for backward compatibility
  if (isProductPage()) {
    console.log('AI Keyword Planner: Page accepted via legacy detection');
    return true;
  }
  
  // Log rejection
  logExtractionFailure('unknown', `Page rejected: ${semanticCheck.reason}`, {
    confidence: semanticCheck.confidence,
    url: window.location.href,
    pathname: window.location.pathname
  }).catch(console.error);
  
  return false;
}

/**
 * Send data to the background script
 */
function sendToBackground(pageData: PageMetadata) {
  let productData: ReturnType<typeof scrapeProduct> = null;
  try {
    if (isProductPage()) {
      productData = scrapeProduct();
      
      // Log extraction success/failure
      if (productData) {
        const extractedFields = Object.keys(productData).filter(key => {
          const val = productData ? (productData as any)[key] : null;
          return val !== null && val !== undefined && val !== '' && 
                 !(Array.isArray(val) && val.length === 0);
        });
        
        logExtraction(
          productData.detectedPlatform || 'unknown',
          true,
          {
            hasTitle: !!productData.title,
            hasPrice: !!productData.price?.value,
            hasBullets: (productData.bullets?.length || 0) > 0,
            hasDescription: !!productData.descriptionText,
            hasImages: (productData.images?.length || 0) > 0
          },
          extractedFields
        ).catch(console.error);
      } else {
        logExtractionFailure('unknown', 'scrapeProduct returned null', {
          url: window.location.href,
          isProductPage: true
        }).catch(console.error);
      }
    }
  } catch (e) {
    console.warn('Product scrape failed (non-fatal):', e);
    logExtractionFailure('unknown', `scrapeProduct threw error: ${(e as Error).message}`, {
      url: window.location.href,
      error: (e as Error).stack
    }).catch(console.error);
  }
  chrome.runtime.sendMessage({
    action: 'analyzePage',
    data: pageData,
    productData
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error sending data to background:', chrome.runtime.lastError);
      // Store locally if communication fails
      storeLocally(pageData);
      return;
    }
    
    if (response && response.success) {
      console.log('Data sent to background successfully');
    } else {
      console.warn('Background script did not confirm receipt');
      // Store locally as fallback
      storeLocally(pageData);
    }
  });
}

/**
 * Store data locally if background communication fails
 */
function storeLocally(pageData: PageMetadata) {
  try {
    // Generate a key based on the URL
    const key = `page_data_${window.location.hostname}`;
    
    // Get existing stored pages 
    const storedPagesJson = localStorage.getItem('ai_keyword_planner_pages');
    const storedPages = storedPagesJson ? JSON.parse(storedPagesJson) : {};
    
    // Add this page to the stored pages
    storedPages[key] = {
      data: pageData,
      timestamp: new Date().getTime()
    };
    
    // Store back to local storage
    localStorage.setItem('ai_keyword_planner_pages', JSON.stringify(storedPages));
    
    console.log('Page data stored locally for offline analysis');
  } catch (error) {
    console.error('Failed to store data locally', error);
  }
}

/**
 * Set up the UI elements
 */
function setupUI() {
  // Avoid duplicate injection
  if (document.getElementById('ai-keyword-planner-container')) return;

  // Create button container
  const container = document.createElement('div');
  container.id = 'ai-keyword-planner-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  
  // Create the analyze button
  const button = document.createElement('button');
  button.id = 'ai-keyword-planner-button';
  button.textContent = 'Analyze Keywords';
  button.style.backgroundColor = '#4285f4';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.padding = '8px 16px';
  button.style.cursor = 'pointer';
  button.style.fontFamily = 'Arial, sans-serif';
  button.style.fontSize = '14px';
  button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  
  // Add hover effect
  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#3367d6';
  });
  
  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = '#4285f4';
  });
  
  // Add click handler
  button.addEventListener('click', () => {
    const pageData = extractPageContent();
    sendToBackground(pageData);
    
    // Show loading indicator
    button.textContent = 'Analyzing...';
    button.disabled = true;
    
    // Simulate response for local testing
    setTimeout(() => {
      button.textContent = 'Analysis Complete';
      setTimeout(() => {
        button.textContent = 'Analyze Keywords';
        button.disabled = false;
      }, 2000);
    }, 2000);
  });
  
  // Add button to container
  container.appendChild(button);
  
  // Add to page
  document.body.appendChild(container);
}

/**
 * Listen for messages from the popup (e.g., manual analysis trigger)
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeCompetitors') {
    try {
      const limit = typeof request.limit === 'number' && request.limit > 0 ? request.limit : 6;
      const competitors = scrapeCompetitorCards(limit, request.excludeSku || null);
      sendResponse({ success: true, competitors });
    } catch (error) {
      sendResponse({ success: false, error: (error as Error)?.message || 'Unable to scrape competitors' });
    }
    return false;
  }
  if (request.action === "manualAnalyze") {
    console.log('AI Keyword Planner: Manual analysis triggered from popup.');
    try {
      const pageData = extractPageContent();
      sendToBackground(pageData); // This will send to background for analysis
      sendResponse({ success: true, message: "Manual analysis initiated." });

      // Optional: Provide immediate feedback on the button if it exists
      const button = document.querySelector('#ai-keyword-planner-button'); // Assume button has an ID
      if (button && button instanceof HTMLButtonElement) {
        button.textContent = 'Analyzing...';
        button.disabled = true;
        // The button state should ideally be reset based on a response from the background
        // or after keywords are updated in the popup, rather than a fixed timeout here.
      }
    } catch (error) {
      console.error('AI Keyword Planner: Error during manual analysis:', error);
      sendResponse({ success: false, error: "Failed to initiate manual analysis." });
    }
    return true; // Indicate asynchronous response
  }
}); 

interface ScrapedCompetitorPayload {
  asin: string | null;
  title: string;
  url: string;
  price: number | null;
  currency: string | null;
  rating: number | null;
  reviewCount: number | null;
  image?: string | null;
  subtitle?: string | null;
  source: string;
  rawPrice?: string | null;
}

function parsePriceText(text: string | null | undefined): { value: number | null; currency: string | null; raw: string | null } {
  if (!text) return { value: null, currency: null, raw: null };
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/(USD|CAD|EUR|GBP|£|€|¥|\$)\s*([0-9.,]+)/i);
  if (!match) return { value: null, currency: null, raw: cleaned };
  const currency = match[1].toUpperCase();
  const numeric = parseFloat(match[2].replace(/,/g, ''));
  return {
    value: Number.isFinite(numeric) ? numeric : null,
    currency,
    raw: cleaned
  };
}

function parseRatingText(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(/([0-9.]+)\s*out\s*of\s*5/i);
  if (match) {
    const value = parseFloat(match[1]);
    return Number.isFinite(value) ? Math.max(0, Math.min(5, value)) : null;
  }
  const direct = parseFloat(text);
  return Number.isFinite(direct) ? Math.max(0, Math.min(5, direct)) : null;
}

function parseReviewCount(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(/([0-9.,]+)/);
  if (!match) return null;
  const value = parseInt(match[1].replace(/,/g, ''), 10);
  return Number.isFinite(value) ? value : null;
}

function getFirstText(root: Element, selectors: string[]): string {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el) {
      const txt = el.textContent?.trim();
      if (txt) return txt;
    }
  }
  return '';
}

function canonicalizeUrl(href: string, asin: string | null): string {
  try {
    const url = new URL(href, window.location.origin);
    if (asin && url.hostname.includes('amazon.')) {
      url.pathname = `/dp/${asin}`;
      url.search = '';
      url.hash = '';
    }
    return url.toString();
  } catch {
    return href;
  }
}

function scrapeCompetitorCards(limit: number, excludeAsin: string | null): ScrapedCompetitorPayload[] {
  const normalizedExclude = excludeAsin ? excludeAsin.toUpperCase() : null;
  const currentAsinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
  const currentAsin = currentAsinMatch ? currentAsinMatch[1].toUpperCase() : null;
  const seen = new Map<string, ScrapedCompetitorPayload>();

  const candidateNodes = Array.from(document.querySelectorAll('[data-asin]'))
    .filter(node => node instanceof HTMLElement);

  for (const node of candidateNodes as HTMLElement[]) {
    const asinAttr = node.getAttribute('data-asin');
    const asin = asinAttr && asinAttr !== '0' ? asinAttr.toUpperCase() : null;
    if (asin && (asin === normalizedExclude || asin === currentAsin)) continue;
    if (asin && seen.has(asin)) continue;

    const title = getFirstText(node, [
      'h2 span',
      'h2',
      '.a-size-base-plus.a-color-base.a-text-normal',
      '.a-truncate-full',
      '.a-truncate-cut',
      '.p13n-sc-truncate',
      '.s-access-title',
      '.s-line-clamp-2'
    ]).trim();
    if (!title || title.length < 4) continue;

    const linkEl = node.querySelector<HTMLAnchorElement>('a[href*="/dp/"]') || node.querySelector<HTMLAnchorElement>('a.a-link-normal');
    if (!linkEl) continue;
    const href = linkEl.href || linkEl.getAttribute('href');
    if (!href) continue;

    const priceText = getFirstText(node, [
      '.a-price .a-offscreen',
      '.a-color-price',
      '.a-text-price',
      '.p13n-sc-price',
      '.a-price-whole',
      '[data-a-strike]'
    ]);
    const priceInfo = parsePriceText(priceText);

    const ratingNode = node.querySelector('[aria-label*="out of 5 stars"], .a-icon-alt');
    const rating = parseRatingText(ratingNode?.getAttribute('aria-label') || ratingNode?.textContent || '');

    const reviewNode = node.querySelector('[aria-label*="ratings"], [aria-label*="reviews"], .a-size-small .a-link-normal');
    const reviewCount = parseReviewCount(reviewNode?.getAttribute('aria-label') || reviewNode?.textContent || '');

    const imageEl = node.querySelector<HTMLImageElement>('img');
    const subtitle = getFirstText(node, ['.a-color-secondary', '.a-row.a-size-small']);

    const key = asin || canonicalizeUrl(href, asin);
    if (seen.has(key)) continue;

    seen.set(key, {
      asin,
      title,
      url: canonicalizeUrl(href, asin),
      price: priceInfo.value,
      currency: priceInfo.currency,
      rating,
      reviewCount,
      image: imageEl?.src || null,
      subtitle: subtitle || null,
      source: node.closest('#sims-consolidated-2_feature_div, #sp_detail, .a-carousel') ? 'amazon.carousel' : 'page.grid',
      rawPrice: priceInfo.raw
    });
    if (seen.size >= limit * 3) break;
  }

  const results = Array.from(seen.values())
    .filter(entry => entry.title && (entry.price !== null || entry.rating !== null || entry.reviewCount !== null))
    .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));

  return results.slice(0, limit);
}