/**
 * Storage utilities with fallback mechanisms
 */

import { KeywordData, UserProfile, AppState } from './types';
import { ProductOptimizationResult } from '../types/product';

// Storage keys
export const STORAGE_KEYS = {
  KEYWORDS: 'keywords_data',
  USER_PROFILE: 'user_profile',
  SETTINGS: 'app_settings',
  HISTORY: 'search_history',
  PRODUCT_OPTIMIZATION: 'product_optimization_latest',
  PRODUCT_OPTIMIZATION_HISTORY: 'product_optimization_history'
} as const;

// Local storage fallback flag
const USE_LOCAL_STORAGE_FALLBACK = true;

/**
 * Save data to Chrome storage with local fallback
 */
export async function saveData<T>(key: string, data: T): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Try to save to Chrome storage
      chrome.storage.local.set({ [key]: data }, () => {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }
        resolve();
      });
    } catch (error) {
      console.error('Chrome storage error:', error);
      
      // Fallback to localStorage if Chrome storage fails
      if (USE_LOCAL_STORAGE_FALLBACK) {
        try {
          localStorage.setItem(key, JSON.stringify(data));
          resolve();
        } catch (localError) {
          console.error('Local storage fallback error:', localError);
          reject(localError);
        }
      } else {
        reject(error);
      }
    }
  });
}

/**
 * Load data from Chrome storage with local fallback
 */
export async function loadData<T>(key: string, defaultValue: T): Promise<T> {
  return new Promise((resolve) => {
    try {
      // Try to load from Chrome storage
      chrome.storage.local.get(key, (result) => {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }
        
        if (result[key] !== undefined) {
          resolve(result[key] as T);
        } else {
          resolve(defaultValue);
        }
      });
    } catch (error) {
      console.warn('Chrome storage load error:', error);
      
      // Fallback to localStorage if Chrome storage fails
      if (USE_LOCAL_STORAGE_FALLBACK) {
        try {
          const localData = localStorage.getItem(key);
          if (localData) {
            resolve(JSON.parse(localData) as T);
          } else {
            resolve(defaultValue);
          }
        } catch (localError) {
          console.error('Local storage fallback error:', localError);
          resolve(defaultValue);
        }
      } else {
        resolve(defaultValue);
      }
    }
  });
}

/**
 * Clear all stored data
 */
export async function clearAllData(): Promise<void> {
  return new Promise((resolve) => {
    try {
      // Clear Chrome storage
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          throw new Error(chrome.runtime.lastError.message);
        }
        resolve();
      });
    } catch (error) {
      console.error('Chrome storage clear error:', error);
      
      // Fallback to clearing localStorage
      if (USE_LOCAL_STORAGE_FALLBACK) {
        try {
          localStorage.clear();
          resolve();
        } catch (localError) {
          console.error('Local storage fallback clear error:', localError);
          // We're just going to resolve anyway as a best effort
          resolve();
        }
      }
    }
  });
}

/**
 * Save keyword data
 */
export async function saveKeywords(keywords: KeywordData[]): Promise<void> {
  return saveData(STORAGE_KEYS.KEYWORDS, keywords);
}

/**
 * Load keyword data
 */
export async function loadKeywords(): Promise<KeywordData[]> {
  return loadData<KeywordData[]>(STORAGE_KEYS.KEYWORDS, []);
}

/**
 * Save user profile data
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  return saveData(STORAGE_KEYS.USER_PROFILE, profile);
}

/**
 * Load user profile data
 */
export async function loadUserProfile(): Promise<UserProfile | null> {
  return loadData<UserProfile | null>(STORAGE_KEYS.USER_PROFILE, null);
}

/**
 * Save app settings
 */
export async function saveSettings(settings: Partial<AppState>): Promise<void> {
  const currentSettings = await loadSettings();
  return saveData(STORAGE_KEYS.SETTINGS, { ...currentSettings, ...settings });
}

/**
 * Load app settings
 */
export async function loadSettings(): Promise<Partial<AppState>> {
  return loadData<Partial<AppState>>(STORAGE_KEYS.SETTINGS, {
    isOfflineMode: false
  });
}

/**
 * Toggle offline mode
 */
export async function toggleOfflineMode(value?: boolean): Promise<boolean> {
  const settings = await loadSettings();
  const newValue = value !== undefined ? value : !settings.isOfflineMode;
  
  await saveSettings({ isOfflineMode: newValue });
  return newValue;
}

/**
 * Check if we're in offline mode
 */
export async function isOfflineMode(): Promise<boolean> {
  const settings = await loadSettings();
  return settings.isOfflineMode === true;
} 

/**
 * Save latest product optimization result
 */
export async function saveProductOptimization(result: ProductOptimizationResult): Promise<void> {
  return saveData(STORAGE_KEYS.PRODUCT_OPTIMIZATION, result);
}

/**
 * Load latest product optimization result
 */
export async function loadProductOptimization(): Promise<ProductOptimizationResult | null> {
  return loadData<ProductOptimizationResult | null>(STORAGE_KEYS.PRODUCT_OPTIMIZATION, null);
}

/**
 * Append optimization result to history (capped to last N entries)
 */
export async function appendProductOptimizationHistory(result: ProductOptimizationResult, maxEntries = 10): Promise<void> {
  const history = await loadData<ProductOptimizationResult[]>(STORAGE_KEYS.PRODUCT_OPTIMIZATION_HISTORY, []);
  history.unshift(result);
  if (history.length > maxEntries) history.length = maxEntries;
  await saveData(STORAGE_KEYS.PRODUCT_OPTIMIZATION_HISTORY, history);
}

/**
 * Load optimization history list
 */
export async function loadProductOptimizationHistory(): Promise<ProductOptimizationResult[]> {
  return loadData<ProductOptimizationResult[]>(STORAGE_KEYS.PRODUCT_OPTIMIZATION_HISTORY, []);
}