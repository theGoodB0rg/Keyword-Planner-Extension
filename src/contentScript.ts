/**
 * Content script - Runs in the context of web pages
 * Phase 2: Now supports SPA navigation and re-initialization
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

/**
 * Phase 2: SPA Navigation Support
 * Track state instead of blocking re-runs
 */
let lastAnalyzedUrl = '';
let analysisInProgress = false;
let debounceTimer: number | null = null;
let navigationObserver: MutationObserver | null = null;

/**
 * Debounce function to prevent excessive re-analysis
 */
function debounce(func: Function, delay: number) {
  return (...args: any[]) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => func(...args), delay);
  };
}

// Wait for the page to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add a small delay to ensure all content has loaded
  setTimeout(() => {
    initialize();
  }, 1000);
});

// Initialize if document is already loaded
if (document.readyState === 'complete') {
  initialize();
}

/**
 * Initialize the content script
 * Phase 2: Now supports re-initialization for SPA navigation
 */
function initialize() {
  try {
    console.log('AI Keyword Planner: Content script initialized');

    // Log initial page load
    logNavigation('initial', {
      url: window.location.href,
      pathname: window.location.pathname,
      hostname: window.location.hostname
    }).catch(console.error);

    // Set up SPA navigation listeners
    setupSPAListeners();

    // Analyze current page
    analyzePage();
  } catch (error) {
    console.error('AI Keyword Planner: Error in content script initialization', error);
  }
}

/**
 * Phase 2: Set up listeners for SPA navigation
 */
function setupSPAListeners() {
  // Listen for browser history changes (pushState, replaceState)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    logNavigation('pushstate', {
      url: window.location.href,
      pathname: window.location.pathname
    }).catch(console.error);
    handleSPANavigation();
  };

  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    logNavigation('pushstate', {
      url: window.location.href,
      pathname: window.location.pathname,
      type: 'replace'
    }).catch(console.error);
    handleSPANavigation();
  };

  // Listen for popstate (back/forward button)
  window.addEventListener('popstate', () => {
    logNavigation('popstate', {
      url: window.location.href,
      pathname: window.location.pathname
    }).catch(console.error);
    handleSPANavigation();
  });

  // Set up MutationObserver for DOM changes
  setupMutationObserver();

  console.log('AI Keyword Planner: SPA navigation listeners active');
}

/**
 * Phase 2: Set up MutationObserver to detect significant DOM changes
 */
function setupMutationObserver() {
  // Disconnect existing observer if any
  if (navigationObserver) {
    navigationObserver.disconnect();
  }

  navigationObserver = new MutationObserver(
    debounce((mutations: MutationRecord[]) => {
      // Check if mutations are significant (not just minor UI updates)
      const significantChange = mutations.some(mutation => {
        // Look for changes in main content areas
        const target = mutation.target as HTMLElement;
        if (!target.closest) return false;

        // Check if change is in main product/content area
        const isMainContent = 
          target.closest('main') ||
          target.closest('[role="main"]') ||
          target.closest('#content') ||
          target.closest('.product') ||
          target.closest('[data-product]');

        // Check for added product-related elements
        if (mutation.addedNodes.length > 0) {
          return Array.from(mutation.addedNodes).some(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const el = node as HTMLElement;
            return el.querySelector && (
              el.querySelector('[itemtype*="Product"]') ||
              el.querySelector('[data-product]') ||
              el.querySelector('.product') ||
              el.id?.includes('product')
            );
          });
        }

        return isMainContent && mutation.addedNodes.length > 3;
      });

      if (significantChange) {
        logNavigation('mutation', {
          url: window.location.href,
          mutationCount: mutations.length
        }).catch(console.error);
        handleSPANavigation();
      }
    }, 500) // 500ms debounce
  );

  // Observe the entire document for changes
  navigationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false // Don't track attribute changes to reduce noise
  });

  console.log('AI Keyword Planner: MutationObserver active');
}

/**
 * Phase 2: Handle SPA navigation by re-analyzing the page
 */
function handleSPANavigation() {
  const currentUrl = window.location.href;

  // Check if URL actually changed
  if (currentUrl === lastAnalyzedUrl) {
    return;
  }

  console.log('AI Keyword Planner: SPA navigation detected', {
    from: lastAnalyzedUrl,
    to: currentUrl
  });

  // Re-analyze the new page
  analyzePage();
}

/**
 * Phase 2: Analyze the current page (can be called multiple times)
 * Phase 3: Now async to support pipeline extraction
 */
async function analyzePage() {
  const currentUrl = window.location.href;

  // Skip if already analyzing
  if (analysisInProgress) {
    console.log('AI Keyword Planner: Analysis already in progress, skipping');
    return;
  }

  // Skip if already analyzed this exact URL
  if (currentUrl === lastAnalyzedUrl) {
    console.log('AI Keyword Planner: URL already analyzed, skipping');
    return;
  }

  try {
    analysisInProgress = true;

    // Check if this page is a product or content-rich page worth analyzing
    if (shouldAnalyzePage()) {
      // Extract the page content
      const pageData = extractPageContent();
      
      // Send the extracted data to the background script (now async)
      await sendToBackground(pageData);
      
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

    // Mark this URL as analyzed
    lastAnalyzedUrl = currentUrl;
    console.log('AI Keyword Planner: Page analysis complete for', currentUrl);

  } catch (error) {
    console.error('AI Keyword Planner: Error analyzing page', error);
  } finally {
    // Always reset the in-progress flag
    analysisInProgress = false;
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
 * Phase 3: Now async to support pipeline extraction
 */
async function sendToBackground(pageData: PageMetadata) {
  let productData: Awaited<ReturnType<typeof scrapeProduct>> = null;
  try {
    if (isProductPage()) {
      productData = await scrapeProduct();
      
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
      // Phase 2: Force re-analysis by clearing last analyzed URL
      const previousUrl = lastAnalyzedUrl;
      lastAnalyzedUrl = '';
      
      // Re-analyze the current page
      analyzePage();
      
      sendResponse({ success: true, message: "Manual analysis initiated." });

      // Optional: Provide immediate feedback on the button if it exists
      const button = document.querySelector('#ai-keyword-planner-button');
      if (button && button instanceof HTMLButtonElement) {
        button.textContent = 'Analyzing...';
        button.disabled = true;
        // Reset after a delay
        setTimeout(() => {
          if (button) {
            button.textContent = 'Analyze Keywords';
            button.disabled = false;
          }
        }, 3000);
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