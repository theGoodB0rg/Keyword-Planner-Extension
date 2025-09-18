/**
 * Type definitions for the extension
 */

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  cpc: number;
  competition: 'low' | 'medium' | 'high';
}

export interface UserProfile {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  apiQuota: number;
  apiUsage: number;
}

export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

export interface AppState {
  keywords: KeywordData[];
  loading: boolean;
  error: string | null;
  user: UserProfile | null;
  currentUrl: string;
  isOfflineMode: boolean;
}

export interface PageMetadata {
  title: string;
  description: string;
  url: string;
  h1Tags: string[];
  h2Tags: string[];
  mainText: string;
} 