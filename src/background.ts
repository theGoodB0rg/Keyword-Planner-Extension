// src/background.ts

import { analyzePageContent, getAIAnalysis } from './utils/api';
import { loadKeywords, saveKeywords, isOfflineMode, toggleOfflineMode, STORAGE_KEYS, saveProductOptimization, loadProductOptimization, appendProductOptimizationHistory, loadProductOptimizationHistory, canUsePreview, consumePreview, refundPreview, loadByokConfig } from './utils/storage';
import { PageMetadata, KeywordData } from './utils/types';
import { optimizeProduct, optimizeProductWithProgress } from './background/aiOrchestrator';
import { ProductData, ProductOptimizationResult } from './types/product';
import { canConsume, consumeOne, refundOne, getStatus, activateToken } from './utils/licensing';
import { getDemandScore, Marketplace } from './utils/signals';

// Holds the most recent product optimization result so popup or other parts can request it later.
let latestProductOptimization: ProductOptimizationResult | null = null;
let lastProductData: ProductData | null = null; // cache last scraped product for refresh
let lastAnalyzeAt = 0;
const ANALYZE_DEBOUNCE_MS = 4000; // avoid spam & accidental double clicks

chrome.runtime.onInstalled.addListener(() => {
  console.log('BG: AI Keyword Planner extension installed/updated.');
  initializeStorage();
});

type CompetitionLevel = "low" | "medium" | "high";

function isValidCompetitionLevel(value: string): value is CompetitionLevel {
  return ["low", "medium", "high"].includes(value.toLowerCase());
}

async function initializeStorage() {
  try {
    const settings = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    if (settings[STORAGE_KEYS.SETTINGS] === undefined) {
      await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: { isOfflineMode: false } });
    }
    const existingKeywords = await loadKeywords();
    if (!existingKeywords || existingKeywords.length === 0) {
      const sampleKeywords: KeywordData[] = [
        { keyword: 'seo keyword research', searchVolume: 8200, keywordDifficulty: 45, cpc: 1.75, competition: 'medium' },
        { keyword: 'competitor keyword analysis', searchVolume: 3800, keywordDifficulty: 35, cpc: 2.15, competition: 'low' },
        { keyword: 'best keyword research tool', searchVolume: 9400, keywordDifficulty: 65, cpc: 3.25, competition: 'high' }
      ];
      await saveKeywords(sampleKeywords);
    }
  } catch (error) {
    console.error('BG: Error initializing storage:', (error as Error).message);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('BG: Message received:', message, 'from sender:', sender.tab ? 'content script (' + sender.tab.url + ')' : 'extension');

  switch (message.action) {
    case 'getDemandScore':
      (async () => {
        try {
          const { keyword, marketplace } = message as { keyword: string; marketplace?: Marketplace };
          const res = await getDemandScore(keyword, marketplace);
          sendResponse({ success: true, demand: res });
        } catch (e:any) {
          sendResponse({ success: false, error: e?.message || 'Failed to fetch demand' });
        }
      })();
      return true;
    case 'getCompetitorSnapshot':
      (async () => {
        try {
          const { keyword, marketplace } = message as { keyword: string; marketplace?: Marketplace };
          // Stub: return lightweight, deterministic values based on keyword hash to feel dynamic without network
          const base = Array.from(keyword).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          const totalConsidered = 24 + (base % 8); // 24-31
          const sponsoredCount = 3 + (base % 6); // 3-8
          const medianReviews = 120 + (base % 800); // 120-919
          const medianRating = 3 + ((base % 20) / 20) * 2; // 3.0 - 5.0
          const priceMin = 9 + (base % 20); // 9-28
          const priceMax = priceMin + 15 + (base % 40); // ensure > min
          sendResponse({
            success: true,
            snapshot: {
              keyword,
              marketplace: marketplace || 'amazon.com',
              sponsoredCount,
              totalConsidered,
              medianRating: Math.round(medianRating * 10) / 10,
              medianReviews,
              priceMin,
              priceMax
            }
          });
        } catch (e:any) {
          sendResponse({ success: false, error: e?.message || 'Failed to get snapshot' });
        }
      })();
      return true;
    case 'getPreviewStatus':
      (async () => {
        const st = await canUsePreview();
        sendResponse({ success: true, remaining: st.remaining });
      })();
      return true;
    case 'validateByok':
      (async () => {
        // Minimal stub: trust client for now; real validation can attempt a tiny model ping via proxy later
        try {
          const cfg = await loadByokConfig();
          sendResponse({ success: !!cfg?.enabled, provider: cfg?.provider || null });
        } catch {
          sendResponse({ success: false });
        }
      })();
      return true;
    case 'analyzePage': // This message comes from contentScript.ts
      if (message.data) {
        // simple debounce to avoid rapid repeated analysis triggering multiple provider calls
        const now = Date.now();
        const elapsed = now - lastAnalyzeAt;
        if (elapsed < ANALYZE_DEBOUNCE_MS) {
          sendResponse({ success: false, error: `Please wait ${Math.ceil((ANALYZE_DEBOUNCE_MS - elapsed)/1000)}s before analyzing again.` });
          return true;
        }
        lastAnalyzeAt = now;
        handlePageAnalysis(message.data as PageMetadata, sendResponse, message.productData as ProductData | null | undefined);
      } else {
        sendResponse({ success: false, error: 'No page data provided for analysis.' });
      }
      return true; // Indicate we will respond asynchronously to contentScript
    
    // Messages directly from popup (or other extension parts) if any, might be handled here.
    // For example, if popup directly asked background for something NOT via content script.
    // For now, getKeywords and toggleOfflineMode are typically called by the popup or options page.

    case 'getKeywords': // Usually from Popup
      handleGetKeywords(sendResponse);
      return true;
    case 'toggleOfflineMode': // Usually from Popup
      handleToggleOfflineMode(message.value as boolean | undefined, sendResponse);
      return true;
    case 'getProductOptimization':
      (async () => {
        // Return cached first; else lazy load from storage
        if (latestProductOptimization) {
          sendResponse({ success: true, optimization: latestProductOptimization });
        } else {
          const stored = await loadProductOptimization();
          if (stored) {
            latestProductOptimization = stored;
            sendResponse({ success: true, optimization: stored });
          } else {
            sendResponse({ success: true, optimization: null });
          }
        }
      })();
      return true;
    case 'getLicenseStatus':
      (async () => {
        try {
          const status = await getStatus();
          sendResponse({ success: true, status });
        } catch (e:any) {
          sendResponse({ success: false, error: e?.message || 'Failed to load license status' });
        }
      })();
      return true;
    case 'activateToken':
      (async () => {
        try {
          const result = await activateToken(message.token as string);
          if (!result.ok) {
            sendResponse({ success: false, error: result.error || 'Invalid token' });
            return;
          }
          const status = await getStatus();
          sendResponse({ success: true, status });
        } catch (e:any) {
          sendResponse({ success: false, error: e?.message || 'Activation failed' });
        }
      })();
      return true;
    case 'refreshProductOptimization':
      (async () => {
        if (!lastProductData) {
          sendResponse({ success: false, error: 'No prior product context to refresh.' });
          return;
        }
        const offline = await isOfflineMode();
        try {
          const results = await optimizeProductWithProgress(lastProductData, offline, (e) => {
            chrome.runtime.sendMessage({ action: 'optimizationProgress', event: e });
          });
          latestProductOptimization = buildOptimizationResult(lastProductData, results);
          saveProductOptimization(latestProductOptimization).catch(()=>{});
          appendProductOptimizationHistory(latestProductOptimization).catch(()=>{});
          chrome.runtime.sendMessage({ action: 'productOptimizationUpdated', optimization: latestProductOptimization });
          sendResponse({ success: true, optimization: latestProductOptimization });
        } catch (e:any) {
          sendResponse({ success: false, error: e?.message || 'Refresh failed.' });
        }
      })();
      return true;
    case 'getProductOptimizationHistory':
      (async () => {
        try {
          const history = await loadProductOptimizationHistory();
          sendResponse({ success: true, history });
        } catch (e:any) {
          sendResponse({ success: false, error: e?.message || 'Failed to load history', history: [] });
        }
      })();
      return true;
      
    default:
      console.warn('BG: Unknown action received:', message.action);
      // Not returning true, as we don't intend to sendResponse for unknown actions.
      // Or, if a response is always expected:
      // sendResponse({ success: false, error: `Unknown action: ${message.action}` });
      // return false; // if not responding asynchronously
  }
  // Default to not keeping the message channel open if not handled by specific async cases.
  // However, the specific cases above DO return true.
});


async function handlePageAnalysis(pageData: PageMetadata, sendResponseToContentScript: (response: any) => void, productData?: ProductData | null) {
  let analysisSuccess = false;
  let analysisMessage = '';
  let finalKeywords: KeywordData[] | null = null;
  let productOptimization: ProductOptimizationResult | null = null;

  try {
    // Quota gate (predictive consume)
    const gate = await canConsume();
    if (!gate.allowed) {
      analysisMessage = 'Daily limit reached. Upgrade to continue full AI analysis.';
      if (productData) {
        const offline = true; // force heuristic path when over limit
        try {
          const results = await optimizeProductWithProgress(productData, offline, (e) => {
            chrome.runtime.sendMessage({ action: 'optimizationProgress', event: e });
          });
          productOptimization = buildOptimizationResult(productData, results);
          productOptimization.offlineFallback = true;
          productOptimization.quotaLimited = true;
          latestProductOptimization = productOptimization;
          saveProductOptimization(productOptimization).catch(() => {});
          appendProductOptimizationHistory(productOptimization).catch(() => {});
          chrome.runtime.sendMessage({ action: 'productOptimizationUpdated', optimization: productOptimization });
        } catch (err) {
          console.warn('BG: Heuristic optimization failed while quota limited.', err);
          chrome.runtime.sendMessage({
            action: 'productOptimizationFailed',
            error: (err as Error)?.message || 'Optimization unavailable while quota is exceeded.',
            offline: true
          });
        }
      } else {
        latestProductOptimization = null;
        chrome.runtime.sendMessage({ action: 'productOptimizationUnavailable', reason: 'noProductData' });
      }
      chrome.runtime.sendMessage({ action: 'quotaExceeded', info: gate.info, remaining: gate.remaining });
      sendResponseToContentScript({ success: false, message: analysisMessage });
      return;
    } else {
      await consumeOne();
    }
    console.log('BG: Analyzing page:', pageData.url);
    const offline = await isOfflineMode();

  if (offline) {
      console.log('BG: Operating in offline mode - calling getAIAnalysis directly.');
      const prompt = createAnalyticsPrompt(pageData);
      const aiResponseText = await getAIAnalysis(prompt);
      finalKeywords = parseKeywordsFromAIResponse(aiResponseText);
      await saveKeywords(finalKeywords);
      analysisSuccess = true;
      analysisMessage = 'Page analyzed successfully (offline with getAIAnalysis)';
      console.log('BG: Offline analysis complete, keywords saved.');
    } else {
      console.log('BG: Online mode - Attempting analyzePageContent (custom backend).');
      try {
        const contentForCustomBackend = `${pageData.title} ${pageData.description} ${pageData.mainText.substring(0, 4000)}`;
        finalKeywords = await analyzePageContent(contentForCustomBackend);
        await saveKeywords(finalKeywords);
        analysisSuccess = true;
        analysisMessage = 'Page analyzed successfully via custom backend flow.';
        console.log('BG: Successfully processed page with custom backend flow (analyzePageContent).');
      } catch (customBackendError) {
        console.warn('BG: Custom backend (analyzePageContent) failed:', (customBackendError as Error).message);
        console.log('BG: Falling back to direct AI analysis (getAIAnalysis) due to custom backend failure.');
        try {
          // Preview enforcement: if BYOK configured, skip preview counters; else consume preview allowance
          try {
            const byok = await loadByokConfig();
            if (!byok?.enabled) {
              const pv = await canUsePreview();
              if (!pv.allowed) throw new Error('Preview limit reached');
              await consumePreview();
            }
          } catch (e:any) {
            console.warn('BG: preview gating:', e?.message);
          }
          const prompt = createAnalyticsPrompt(pageData);
          const aiResponseText = await getAIAnalysis(prompt);
          finalKeywords = parseKeywordsFromAIResponse(aiResponseText);
          await saveKeywords(finalKeywords);
          analysisSuccess = true;
          analysisMessage = 'Page analyzed successfully (fallback to getAIAnalysis)';
          console.log('BG: Direct AI analysis (getAIAnalysis) fallback successful, keywords saved.');
        } catch (getAIAnalysisError) {
          console.error('BG: Direct AI analysis (getAIAnalysis) also failed:', (getAIAnalysisError as Error).message);
          analysisMessage = 'Failed to analyze page using all available online methods.';
          finalKeywords = await loadKeywords();
          try { await refundPreview(); } catch {}
        }
      }
    }

    // Product optimization (heuristics + AI tasks) after keyword analysis
    if (productData) {
      lastProductData = productData; // remember for refresh
      try {
        const results = await optimizeProductWithProgress(productData, offline, (e) => {
          chrome.runtime.sendMessage({ action: 'optimizationProgress', event: e });
        });
        const fallbackUsed = Array.isArray(results) && results.some((r: { fallbackUsed?: boolean }) => r?.fallbackUsed === true);
        productOptimization = buildOptimizationResult(productData, results);
        productOptimization.offlineFallback = offline || fallbackUsed;
        productOptimization.quotaLimited = false;
        latestProductOptimization = productOptimization; // cache globally
        // Persist for later sessions (fire and forget)
        saveProductOptimization(productOptimization).catch(err => console.warn('BG: Failed to persist product optimization', err));
        appendProductOptimizationHistory(productOptimization).catch(err => console.warn('BG: Failed to append optimization history', err));
      } catch (e) {
        console.warn(`BG: Product optimization run failed (${offline ? 'offline/heuristic' : 'online'}).`, e);
        chrome.runtime.sendMessage({
          action: 'productOptimizationFailed',
          error: (e as Error)?.message || 'Product optimization failed.',
          offline
        });
        productOptimization = null;
      }
    } else {
      latestProductOptimization = null;
      chrome.runtime.sendMessage({ action: 'productOptimizationUnavailable', reason: 'noProductData' });
    }
  } catch (error) {
    console.error('BG: Critical error in handlePageAnalysis orchestration:', (error as Error).message);
    analysisMessage = 'An unexpected error occurred during page analysis setup.';
    finalKeywords = await loadKeywords();
    // Refund on critical orchestration error
    try { await refundOne(); } catch {}
  }

  // Respond to content script
  sendResponseToContentScript({ success: analysisSuccess, message: analysisMessage });

  // Broadcast keyword updates to popup / UI
  if (analysisSuccess) {
    chrome.runtime.sendMessage({ action: 'keywordsUpdated', keywords: finalKeywords || [] });
  }
  // Broadcast product optimization if available
  if (productOptimization) {
    chrome.runtime.sendMessage({ action: 'productOptimizationUpdated', optimization: productOptimization });
  }
}

async function handleGetKeywords(sendResponse: (response: any) => void) {
  try {
    const keywords = await loadKeywords();
    if (!keywords || keywords.length === 0) {
      await initializeStorage();
      const freshKeywords = await loadKeywords();
      sendResponse({ success: true, keywords: freshKeywords, optimization: latestProductOptimization });
    } else {
      sendResponse({ success: true, keywords, optimization: latestProductOptimization });
    }
  } catch (error) {
    sendResponse({ success: false, error: 'Failed to get keywords.', keywords: [], optimization: latestProductOptimization });
  }
}

async function handleToggleOfflineMode(value: boolean | undefined, sendResponse: (response: any) => void) {
  try {
    const newValue = await toggleOfflineMode(value); 
    sendResponse({ success: true, offlineMode: newValue });
  } catch (error) {
    const currentValue = await isOfflineMode(); // Try to get current state for accurate response
    sendResponse({ success: false, offlineMode: currentValue, error: `Failed to toggle. Current: ${currentValue}` });
  }
}

function createAnalyticsPrompt(pageData: PageMetadata): string {
  const maxHeadingChars = 200;
  const h1s = pageData.h1Tags.join(', ').substring(0, maxHeadingChars);
  const h2s = pageData.h2Tags.slice(0, 5).join(', ').substring(0, maxHeadingChars);
  const mainTextExcerpt = pageData.mainText.substring(0, 1500);

  return `Analyze the following web page content. Your task is to identify 5-8 highly relevant SEO keywords for business use.
Strictly adhere to the following format for each keyword. Do NOT include any other text, explanations, or conversational filler.

For each keyword, provide these exact fields:
1. Keyword: [The keyword phrase itself - focus on commercial/business-relevant search terms]
2. Search Volume: [Estimated monthly search volume as a number, e.g., 1500]
3. Keyword Difficulty: [Keyword difficulty as a number from 1-100]
4. CPC: [Estimated Cost Per Click in USD, e.g., 0.75]
5. Competition: [Competition level: low, medium, or high]

Example of the required format:
Keyword: Best AI Marketing Tools 
Search Volume: 12000
Keyword Difficulty: 60
CPC: 1.50
Competition: high

IMPORTANT GUIDELINES:
- Include at least 2 long-tail keywords (4+ words) that have lower competition
- Include a mix of informational and commercial intent keywords
- Avoid generic terms with no business/commercial value
- Prioritize keywords with clear user intent
- For fiction/entertainment content, focus on terms readers would search to find similar content

---BEGIN PAGE CONTENT---
Page Title: ${pageData.title || 'N/A'}
URL: ${pageData.url || 'N/A'}
Meta Description: ${pageData.description || 'N/A'}
Main Headings (H1): ${h1s || 'N/A'}
Sub Headings (H2): ${h2s || 'N/A'}

Main Content Excerpt:
${mainTextExcerpt || 'N/A'}
---END PAGE CONTENT---`;
}

function parseKeywordsFromAIResponse(aiResponseText: string): KeywordData[] {
  // console.log('BG: Parsing AI response text (first 300 chars):', aiResponseText ? aiResponseText.substring(0, 300) + '...' : 'N/A');
  const keywords: KeywordData[] = [];
  if (!aiResponseText || typeof aiResponseText !== 'string' || aiResponseText.trim() === "") {
    console.warn('BG: AI response was empty, not a string, or whitespace only.');
    return keywords;
  }

  try {
    const blocks = aiResponseText.split(/\n?(?=Keyword:)/gi); 

    for (const block of blocks) {
      let currentText = block.trim();
      if (currentText === "" || !currentText.toLowerCase().startsWith("keyword:")) {
        if (currentText !== "") {
            // console.log('BG: Skipping block not starting with "Keyword:":', currentText.substring(0,100) + '...');
        }
        continue; 
      }

      const keywordData: Partial<KeywordData> = {};
      let competitionString: string | undefined;

      let match = currentText.match(/^Keyword:\s*([\s\S]*?)(?=\n\s*Search Volume:|\n\s*Keyword Difficulty:|\n\s*Difficulty:|\n\s*CPC:|\n\s*Competition:|$)/i);
      if (match && match[1]) {
        keywordData.keyword = match[1].trim();
        currentText = currentText.substring(match[0].length).trim();
      } else {
        match = currentText.match(/^Keyword:\s*(.+)/i);
        if (match && match[1]) {
            keywordData.keyword = match[1].trim();
            currentText = ""; 
        } else {
            // console.warn('BG: Could not extract keyword phrase from block:', currentText.substring(0,150));
            continue; 
        }
      }
      
      match = currentText.match(/^(?:Search Volume:)?\s*([0-9,]+)/i);
      if (match && match[1]) {
        keywordData.searchVolume = parseInt(match[1].replace(/,/g, ''), 10);
        currentText = currentText.substring(match[0].length).trim();
      } else {
         match = keywordData.keyword?.match(/Search Volume:\s*([0-9,]+)/i);
         if(match && match[1] && keywordData.keyword) {
            keywordData.searchVolume = parseInt(match[1].replace(/,/g, ''), 10);
            keywordData.keyword = keywordData.keyword.substring(0, match.index).trim(); 
         }
      }

      match = currentText.match(/^(?:Keyword Difficulty|Difficulty):?\s*([0-9]+(?:(?:\s*\/)?\s*100)?)/i);
      if (match && match[1]) {
        keywordData.keywordDifficulty = parseInt(match[1].split('/')[0].trim(), 10);
        currentText = currentText.substring(match[0].length).trim();
      } else {
         match = keywordData.keyword?.match(/(?:Keyword Difficulty|Difficulty):?\s*([0-9]+(?:(?:\s*\/)?\s*100)?)/i);
         if(match && match[1] && keywordData.keyword) {
            keywordData.keywordDifficulty = parseInt(match[1].split('/')[0].trim(), 10);
            keywordData.keyword = keywordData.keyword.substring(0, match.index).trim();
         }
      }

      match = currentText.match(/^(?:CPC:)?\s*\$?([0-9,.]+)/i);
      if (match && match[1]) {
        keywordData.cpc = parseFloat(match[1].replace(/,/g, ''));
        currentText = currentText.substring(match[0].length).trim();
      } else {
         match = keywordData.keyword?.match(/CPC:\s*\$?([0-9,.]+)/i);
         if(match && match[1] && keywordData.keyword) {
            keywordData.cpc = parseFloat(match[1].replace(/,/g, ''));
            keywordData.keyword = keywordData.keyword.substring(0, match.index).trim();
         }
      }

      match = currentText.match(/^(?:Competition(?: Level)?:)?\s*(\w+)/i);
      if (match && match[1]) {
        competitionString = match[1].toLowerCase();
      } else {
         match = keywordData.keyword?.match(/Competition(?: Level)?:?\s*(\w+)/i);
         if(match && match[1] && keywordData.keyword) {
            competitionString = match[1].toLowerCase();
            keywordData.keyword = keywordData.keyword.substring(0, match.index).trim();
         }
      }
      
      if (keywordData.keyword && keywordData.keyword.length > 0) {
        keywordData.keyword = keywordData.keyword.replace(/(\nSearch Volume:|\nKeyword Difficulty:|\nDifficulty:|\nCPC:|\nCompetition:)[\s\S]*/i, "").trim();

        let finalCompetition: CompetitionLevel;
        if (competitionString && isValidCompetitionLevel(competitionString)) {
          finalCompetition = competitionString;
        } else {
          // console.warn(`BG: Invalid or missing competition for "${keywordData.keyword}", defaulting to "medium". Parsed: "${competitionString}"`);
          finalCompetition = "medium"; 
        }

        keywords.push({
          keyword: keywordData.keyword,
          searchVolume: typeof keywordData.searchVolume === 'number' && !isNaN(keywordData.searchVolume) ? keywordData.searchVolume : 0,
          keywordDifficulty: typeof keywordData.keywordDifficulty === 'number' && !isNaN(keywordData.keywordDifficulty) ? keywordData.keywordDifficulty : 0,
          cpc: typeof keywordData.cpc === 'number' && !isNaN(keywordData.cpc) ? keywordData.cpc : 0.0,
          competition: finalCompetition,
        });
      } else {
        //  if (block.trim()) { 
            // console.warn('BG: Skipped block due to missing keyword phrase after all parsing attempts:', block.trim().substring(0,150));
        // }
      }
    }
  } catch (error) {
    console.error('BG: Error during AI response parsing process:', (error as Error).message, 'Original Response was:\n', aiResponseText);
  }
  
  if (keywords.length === 0 && aiResponseText && aiResponseText.trim() !== "") { 
      // console.warn('BG: No keywords were successfully parsed from the AI response, though response was not empty.');
  } else if (keywords.length > 0) {
      // console.log(`BG: Successfully parsed ${keywords.length} keywords from AI response.`);
  }
  return keywords;
}

function buildOptimizationResult(product: ProductData, responses: any[]): ProductOptimizationResult {
  const result: ProductOptimizationResult = {
    product,
    timestamp: Date.now()
  } as ProductOptimizationResult;
  for (const r of responses) {
    if (!r || !r.task) continue;
    switch (r.task) {
      case 'generate.longTail':
        result.longTail = r.data || [];
        break;
      case 'generate.meta':
        result.meta = r.data || null;
        break;
      case 'rewrite.bullets':
        result.rewrittenBullets = r.data || [];
        break;
      case 'detect.gaps':
        result.gaps = r.data || null;
        break;
    }
  }
  return result;
}

// Handle extension icon click to open side panel (like Copilot)
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && tab.windowId) {
    try {
      // Use the correct Chrome Side Panel API
      await (chrome as any).sidePanel.open({ windowId: tab.windowId });
      console.log('BG: Side panel opened for window', tab.windowId);
    } catch (error) {
      console.error('BG: Error opening side panel:', error);
      // Fallback: try enabling the panel first
      try {
        await (chrome as any).sidePanel.setOptions({
          tabId: tab.id,
          enabled: true
        });
        await (chrome as any).sidePanel.open({ windowId: tab.windowId });
        console.log('BG: Side panel enabled and opened');
      } catch (fallbackError) {
        console.error('BG: Fallback failed:', fallbackError);
      }
    }
  }
});
