// src/utils/api.ts

import { KeywordData } from './types';
import { loadByokConfig, ByokConfig } from './storage';

// Configuration with fallback options
const API_CONFIG = {
  // Primary endpoints (cloud-based)
  CLOUD: {
    // For local development, route to the local proxy service to avoid 307/JS challenges
    KEYWORD_ANALYSIS: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production')
      ? 'http://localhost:8787/analyze'
      : 'https://api.yourdomain.com/analyze',
    USER_DATA: 'https://api.yourdomain.com/user'
  },
  // Local fallback (for development/testing)
  LOCAL: {
    ENABLED: true, // This is for getLocalFallbackData, not the primary flow
    STORAGE_KEY: 'ai_keyword_planner_data'
  },
  // AI service endpoints
  AI: {
    // Primary AI service (e.g., OpenAI - replace placeholder key if you use this)
    PRIMARY: 'https://api.openai.com/v1/completions',
    // Fallback AI services - NOTE: We will try gemini-1.5-flash-latest
    FALLBACKS: [
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent', // Google Gemini (Updated Model)
      'https://api.deepseek.com/v1/completions' // Another example (replace placeholder key if used)
    ],
    PROXY: {
      ENABLED: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production'),
      URL: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production')
        ? 'http://localhost:8787/proxy/ai'
        : 'https://your-secure-proxy.example.com/ai' // See PROVIDER_CONFIG.md
    }
  }
};

// Retry configuration
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BACKOFF_FACTOR: 1.5,
  INITIAL_DELAY: 1000 // ms
};

const ECHO_PROXY_ERROR = "AI proxy running in echo mode (missing OpenAI API key).";


type ServiceType = 'openai' | 'gemini' | 'deepseek' | 'generic_openai_clone';

function sanitizeKey(value?: string | null): string {
  return (value || '').trim();
}

function resolveKeyFromByok(type: ServiceType, byok: ByokConfig | null): string | null {
  if (!byok?.enabled) return null;
  const candidate = sanitizeKey(byok.key);
  if (!candidate) return null;

  if (type === 'gemini' && byok.provider === 'gemini') {
    return candidate;
  }
  if (type !== 'gemini' && byok.provider === 'openai') {
    return candidate;
  }
  return null;
}

function resolveKeyFromEnv(type: ServiceType): string {
  if (typeof process === 'undefined' || !process?.env) return '';

  switch (type) {
    case 'gemini':
      return sanitizeKey(process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '');
    case 'openai':
      return sanitizeKey(process.env.OPENAI_API_KEY || '');
    case 'deepseek':
      return sanitizeKey(process.env.DEEPSEEK_API_KEY || '');
    default:
      return sanitizeKey(process.env.OTHER_FALLBACK_AI_KEY || '');
  }
}

function placeholderFor(type: ServiceType): string {
  switch (type) {
    case 'gemini':
      return 'GEMINI_API_KEY_PLACEHOLDER';
    case 'openai':
      return 'YOUR_OPENAI_API_KEY_PLACEHOLDER';
    case 'deepseek':
      return 'YOUR_DEEPSEEK_API_KEY_PLACEHOLDER';
    default:
      return 'YOUR_OTHER_FALLBACK_KEY_PLACEHOLDER';
  }
}

function resolveServiceKey(type: ServiceType, byok: ByokConfig | null): string {
  const byokKey = resolveKeyFromByok(type, byok);
  if (byokKey) return byokKey;

  const envKey = resolveKeyFromEnv(type);
  if (envKey) return envKey;

  return placeholderFor(type);
}


/**
 * Makes an API request with built-in retries.
 * If all retries fail and a fallbackHandler is provided, it's called.
 * If no fallbackHandler or it also fails (or isn't provided), the error is thrown.
 */
export async function fetchWithRetries<T>(
  url: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Log the error text for better debugging, especially for redirects with content
      console.error(`Fetch error response text for ${url} (status ${response.status}):`, errorText.substring(0, 500)); // Log more of the error
      throw new Error(`HTTP error ${response.status} for ${url}. Response: ${errorText.substring(0, 200)}...`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return await response.json();
    } else {
        const textResponse = await response.text();
        console.warn(`Non-JSON response received from ${url}. Content: ${textResponse.substring(0,200)}...`);
        throw new Error(`Expected JSON response but received ${contentType} from ${url}`);
    }

  } catch (error) {
    console.warn(`API Error during fetch to ${url} (attempt ${retryCount + 1}):`, (error as Error).message);

    if (retryCount < RETRY_CONFIG.MAX_ATTEMPTS - 1) {
      const delay = RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, retryCount);
      console.log(`Retrying ${url} in ${delay / 1000}s (attempt ${retryCount + 2}/${RETRY_CONFIG.MAX_ATTEMPTS})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetries<T>(url, options, retryCount + 1);
    }

    console.error(`All retries failed for ${url}.`);
    throw error; // Re-throw the error to be caught by the caller
  }
}


/**
 * Get fallback data from local storage (used by getAIAnalysis if all API calls fail)
 */
async function getLocalFallbackDataForAI(): Promise<string> { // Specifically for AI string response
  return new Promise((resolve) => {
    chrome.storage.local.get(API_CONFIG.LOCAL.STORAGE_KEY, (result) => {
      const storedData = result[API_CONFIG.LOCAL.STORAGE_KEY] || {};
      const fallbackKey = 'ai_mock_response';
      let aiMockResponse = storedData[fallbackKey];

      if (!aiMockResponse) {
        console.log('No mock AI response found in local storage, creating one.');
        aiMockResponse = getMockAIResponse('mock prompt for local fallback');
        storedData[fallbackKey] = aiMockResponse;
        chrome.storage.local.set({ [API_CONFIG.LOCAL.STORAGE_KEY]: storedData });
      }
      resolve(aiMockResponse);
    });
  });
}


/**
 * Create mock data when no data exists
 */
function getMockKeywords(): KeywordData[] {
  console.log(`Creating mock KeywordData[]`);
  return [
    { keyword: 'mock wireless headphones', searchVolume: 1800, keywordDifficulty: 60, cpc: 1.80, competition: 'high' },
    { keyword: 'mock noise cancelling', searchVolume: 1250, keywordDifficulty: 50, cpc: 1.40, competition: 'medium'},
  ];
}

function getMockAIResponse(prompt: string): string {
  console.log(`Creating mock AI string response for prompt: ${prompt.substring(0,50)}...`);
  return `
Keyword: Mock AI Keyword 1
Search Volume: 1500
Keyword Difficulty: 55
CPC: 1.20
Competition: medium

Keyword: Mock AI Keyword 2
Search Volume: 900
Keyword Difficulty: 40
CPC: 0.80
Competition: low
  `;
}


/**
 * Send page content for keyword analysis (via your custom backend).
 * IMPORTANT: If this function fails (throws an error), background.ts should catch it
 * and then call getAIAnalysis.
 */
export async function analyzePageContent(pageContent: string): Promise<KeywordData[]> {
  // Try local dev service first (fast timeout), then fallback to cloud URL
  const tryLocal = async (): Promise<KeywordData[] | null> => {
    const url = 'http://localhost:8787/analyze';
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: pageContent }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (Array.isArray(json)) return json as KeywordData[];
      return null;
    } catch {
      return null;
    }
  };

  const local = await tryLocal();
  if (local) {
    console.log('Custom backend analysis (local proxy) successful.');
    return local;
  }

  console.log(`Attempting custom backend analysis: ${API_CONFIG.CLOUD.KEYWORD_ANALYSIS}`);
  try {
    const result = await fetchWithRetries<KeywordData[]>(
      API_CONFIG.CLOUD.KEYWORD_ANALYSIS,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: pageContent }),
      }
    );
    console.log('Custom backend analysis successful.');
    return result;

  } catch (error) {
    console.warn(`analyzePageContent: Custom backend ${API_CONFIG.CLOUD.KEYWORD_ANALYSIS} ultimately failed after retries:`, (error as Error).message);
    throw error;
  }
}

/**
 * Attempt AI service call with multiple fallback options.
 */
export async function getAIAnalysis(prompt: string): Promise<string> {
  // Try local proxy first (fast timeout)
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);
    const resp = await fetch('http://localhost:8787/proxy/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'openai', model: 'gpt-4o-mini', prompt, maxTokens: 800 }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (resp.ok) {
      const data = await resp.json();
      const content = (data && (data as any).content) || '';
      const provider = (data && (data as any).provider) || '';
      if (provider === 'echo' || (typeof content === 'string' && content.trim().startsWith('ECHO:'))) {
        throw new Error('DEV_PROXY_ECHO');
      }
      if (content) return content;
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'DEV_PROXY_ECHO') {
      throw new Error(ECHO_PROXY_ERROR);
    }
    // ignore other failures; downstream fallbacks will execute
  }
  // If proxy is enabled, try it first
  if (API_CONFIG.AI.PROXY.ENABLED) {
    try {
      const resp = await fetch(API_CONFIG.AI.PROXY.URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // token-proxy-service expects: { provider, model, prompt, temperature?, maxTokens? }
        body: JSON.stringify({ provider: 'openai', model: 'gpt-4o-mini', prompt, maxTokens: 800 })
      });
      if (resp.ok) {
        const data = await resp.json();
        const content = data?.content || '';
        const provider = data?.provider;
        if (provider === 'echo' || (typeof content === 'string' && content.trim().startsWith('ECHO:'))) {
          throw new Error(ECHO_PROXY_ERROR);
        }
        if (content) return content;
        console.warn('Proxy returned OK but no content.');
      } else {
        console.warn('Proxy call failed:', await resp.text());
      }
    } catch (e) {
      if (e instanceof Error && e.message === ECHO_PROXY_ERROR) {
        throw e;
      }
      console.warn('Proxy call threw:', (e as Error).message);
    }
  }
  // Define services to try, including the updated Gemini model
  let byokConfig: ByokConfig | null = null;
  try {
    byokConfig = await loadByokConfig();
  } catch (error) {
    console.warn('getAIAnalysis: failed to load BYOK configuration; defaulting to placeholders.', (error as Error)?.message || error);
  }

  const serviceKeys = {
    openai: resolveServiceKey('openai', byokConfig),
    gemini: resolveServiceKey('gemini', byokConfig),
    deepseek: resolveServiceKey('deepseek', byokConfig),
    generic: resolveServiceKey('generic_openai_clone', byokConfig)
  };

  const servicesToTry = [
    { name: 'Primary AI (OpenAI/similar)', url: API_CONFIG.AI.PRIMARY, key: serviceKeys.openai, type: 'openai' as const },
    // Fallback services from API_CONFIG.AI.FALLBACKS
    ...API_CONFIG.AI.FALLBACKS.map(url => {
      if (url.includes('generativelanguage.googleapis.com')) {
        // This will now use 'gemini-1.5-flash-latest' from API_CONFIG
        return { name: 'Google Gemini', url, key: serviceKeys.gemini, type: 'gemini' as const };
      } else if (url.includes('deepseek.com')) {
        return { name: 'Deepseek', url, key: serviceKeys.deepseek, type: 'deepseek' as const };
      }
      // Generic fallback for any other URLs in API_CONFIG.AI.FALLBACKS
      return { name: 'Other Fallback AI', url, key: serviceKeys.generic, type: 'generic_openai_clone' as const };
    })
  ];

  for (const service of servicesToTry) {
    try {
      console.log(`Attempting AI Analysis with: ${service.name} (${service.url})`);

      if (service.key.includes('_PLACEHOLDER')) {
        console.warn(`${service.name} API Key is a placeholder. Skipping this call.`);
        continue; 
      }

      let requestBody: string;
      let effectiveUrl = service.url;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };

      switch(service.type) {
        case 'openai':
        case 'deepseek': 
        case 'generic_openai_clone':
          headers['Authorization'] = `Bearer ${service.key}`;
          requestBody = JSON.stringify({
            model: service.type === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 800
          });
          break;
        case 'gemini':
          // The service.url already contains the model name like 'gemini-1.5-flash-latest'
          effectiveUrl = `${service.url}?key=${service.key}`; 
          requestBody = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 800,
              temperature: 0.7,
            }
          });
          break;
      }

      const response = await fetch(effectiveUrl, {
        method: 'POST',
        headers: headers,
        body: requestBody
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`${service.name} analysis successful.`);
        let content = '';
        if (service.type === 'gemini') {
          content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else { 
          content = data?.choices?.[0]?.message?.content || '';
        }
        if (!content && data) { // check if data itself is the string, or if content is empty
             if(typeof data === 'string') content = data; // Should not happen with Gemini JSON
             else console.warn(`${service.name} returned a successful response but no parseable content found. Response:`, JSON.stringify(data).substring(0,500));
        }
        if (!content) {
            throw new Error('Successful response but no content or unparseable content.');
        }
        return content;
      }
      const errorText = await response.text();
      console.warn(`${service.name} request failed with status ${response.status}: ${errorText.substring(0,300)}`);
      throw new Error(`${service.name} request failed: ${response.status} ${errorText.substring(0,100)}`);

    } catch (error) {
      console.warn(`Error with ${service.name}:`, (error as Error).message);
      if (service === servicesToTry[servicesToTry.length - 1]) { // Check if it's the last service
          console.error('All AI services failed.');
          // Do not throw here, let it fall through to local mock
      }
    }
  }

  // Fallback to local mock data if ALL services fail
  console.warn('All AI services failed. Falling back to local mock AI response.');
  try {
      return await getLocalFallbackDataForAI();
  } catch (localFallbackError) {
      console.error('Local storage fallback for AI response also failed:', (localFallbackError as Error).message);
      return "Error: AI analysis completely failed, and local fallback also failed.";
  }
}
export const __private = {
  resolveServiceKey,
  placeholderFor,
  resolveKeyFromEnv,
  resolveKeyFromByok
};
