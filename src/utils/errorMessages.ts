// src/utils/errorMessages.ts
/**
 * Structured error message system for better user communication
 */

export interface StructuredError {
  code: ErrorCode;
  title: string;
  message: string;
  details?: string;
  actionable: boolean;
  retryable: boolean;
  actions?: ErrorAction[];
  severity: 'error' | 'warning' | 'info';
}

export interface ErrorAction {
  label: string;
  action: 'retry' | 'navigate' | 'copy' | 'report' | 'custom';
  callback?: () => void;
}

export type ErrorCode =
  | 'NO_ACTIVE_TAB'
  | 'UNSUPPORTED_PAGE'
  | 'NO_PRODUCT_DATA'
  | 'NETWORK_ERROR'
  | 'API_QUOTA_EXCEEDED'
  | 'API_KEY_INVALID'
  | 'CONTENT_SCRIPT_ERROR'
  | 'STORAGE_ERROR'
  | 'PARSE_ERROR'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN_ERROR';

const ERROR_CATALOG: Record<ErrorCode, Omit<StructuredError, 'details' | 'code'>> = {
  NO_ACTIVE_TAB: {
    title: 'No Active Tab',
    message: 'Could not detect an active browser tab. Please make sure you have a tab open and try again.',
    actionable: true,
    retryable: true,
    severity: 'error',
    actions: [{ label: 'Retry', action: 'retry' }]
  },
  
  UNSUPPORTED_PAGE: {
    title: 'Unsupported Page Type',
    message: 'This page type is not supported for analysis yet. Please navigate to a product page on Amazon, Shopify, or WooCommerce.',
    actionable: true,
    retryable: false,
    severity: 'warning',
  },
  
  NO_PRODUCT_DATA: {
    title: 'No Product Data Found',
    message: 'We couldn\'t extract product information from this page. This might be a non-product page or the page structure is unusual.',
    actionable: true,
    retryable: true,
    severity: 'warning',
    actions: [
      { label: 'Retry Analysis', action: 'retry' },
      { label: 'Report Issue', action: 'report' }
    ]
  },
  
  NETWORK_ERROR: {
    title: 'Network Connection Error',
    message: 'Unable to connect to the analysis service. Please check your internet connection and try again.',
    actionable: true,
    retryable: true,
    severity: 'error',
    actions: [
      { label: 'Retry', action: 'retry' },
      { label: 'Enable Offline Mode', action: 'custom' }
    ]
  },
  
  API_QUOTA_EXCEEDED: {
    title: 'Daily Limit Reached',
    message: 'You\'ve reached your daily analysis limit. Upgrade to Pro for unlimited analyses or use your own AI API key.',
    actionable: true,
    retryable: false,
    severity: 'warning',
    actions: [
      { label: 'Use Your Own Key', action: 'custom' },
      { label: 'Learn About Pro', action: 'navigate' }
    ]
  },
  
  API_KEY_INVALID: {
    title: 'Invalid API Key',
    message: 'The AI API key you provided is invalid or expired. Please check your key and try again.',
    actionable: true,
    retryable: true,
    severity: 'error',
    actions: [
      { label: 'Update Key', action: 'custom' },
      { label: 'Remove Key', action: 'custom' }
    ]
  },
  
  CONTENT_SCRIPT_ERROR: {
    title: 'Page Analysis Failed',
    message: 'The content script failed to analyze this page. This might be due to page security restrictions or an unusual page structure.',
    actionable: true,
    retryable: true,
    severity: 'error',
    actions: [
      { label: 'Retry', action: 'retry' },
      { label: 'Refresh Page', action: 'custom' }
    ]
  },
  
  STORAGE_ERROR: {
    title: 'Storage Error',
    message: 'Failed to save or load data from browser storage. Please check your browser storage settings.',
    actionable: true,
    retryable: true,
    severity: 'error',
    actions: [{ label: 'Retry', action: 'retry' }]
  },
  
  PARSE_ERROR: {
    title: 'Data Parsing Error',
    message: 'Received unexpected data format from the analysis service. The service might be experiencing issues.',
    actionable: true,
    retryable: true,
    severity: 'error',
    actions: [
      { label: 'Retry', action: 'retry' },
      { label: 'Report Issue', action: 'report' }
    ]
  },
  
  TIMEOUT: {
    title: 'Request Timeout',
    message: 'The analysis took too long to complete. This might be due to a slow connection or high server load.',
    actionable: true,
    retryable: true,
    severity: 'warning',
    actions: [
      { label: 'Retry', action: 'retry' },
      { label: 'Try Offline Mode', action: 'custom' }
    ]
  },
  
  PERMISSION_DENIED: {
    title: 'Permission Denied',
    message: 'The extension doesn\'t have permission to access this page. Please check your extension permissions in browser settings.',
    actionable: true,
    retryable: false,
    severity: 'error',
  },
  
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again, and if the problem persists, report this issue.',
    actionable: true,
    retryable: true,
    severity: 'error',
    actions: [
      { label: 'Retry', action: 'retry' },
      { label: 'Report Issue', action: 'report' }
    ]
  }
};

/**
 * Create a structured error from an error code
 */
export function createStructuredError(
  code: ErrorCode,
  details?: string
): StructuredError {
  const template = ERROR_CATALOG[code];
  return {
    code,
    ...template,
    details
  };
}

/**
 * Parse a raw error message and try to categorize it
 */
export function categorizeError(error: string | Error): StructuredError {
  const errorMsg = typeof error === 'string' ? error.toLowerCase() : error.message.toLowerCase();
  
  // Network errors
  if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('connection')) {
    return createStructuredError('NETWORK_ERROR', typeof error === 'string' ? error : error.message);
  }
  
  // Quota/limit errors
  if (errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('daily')) {
    return createStructuredError('API_QUOTA_EXCEEDED', typeof error === 'string' ? error : error.message);
  }
  
  // API key errors
  if (errorMsg.includes('api key') || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
    return createStructuredError('API_KEY_INVALID', typeof error === 'string' ? error : error.message);
  }
  
  // Timeout errors
  if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
    return createStructuredError('TIMEOUT', typeof error === 'string' ? error : error.message);
  }
  
  // Parse errors
  if (errorMsg.includes('parse') || errorMsg.includes('json') || errorMsg.includes('syntax')) {
    return createStructuredError('PARSE_ERROR', typeof error === 'string' ? error : error.message);
  }
  
  // Storage errors
  if (errorMsg.includes('storage') || errorMsg.includes('quota_bytes')) {
    return createStructuredError('STORAGE_ERROR', typeof error === 'string' ? error : error.message);
  }
  
  // Content script errors
  if (errorMsg.includes('content script') || errorMsg.includes('injection')) {
    return createStructuredError('CONTENT_SCRIPT_ERROR', typeof error === 'string' ? error : error.message);
  }
  
  // Permission errors
  if (errorMsg.includes('permission') || errorMsg.includes('denied') || errorMsg.includes('403')) {
    return createStructuredError('PERMISSION_DENIED', typeof error === 'string' ? error : error.message);
  }
  
  // Default to unknown
  return createStructuredError('UNKNOWN_ERROR', typeof error === 'string' ? error : error.message);
}

/**
 * Format error for display with technical details collapsed
 */
export function formatErrorForDisplay(structuredError: StructuredError): {
  displayMessage: string;
  technicalDetails?: string;
} {
  return {
    displayMessage: `${structuredError.title}: ${structuredError.message}`,
    technicalDetails: structuredError.details
  };
}

/**
 * Get user-friendly suggestions based on error type
 */
export function getErrorSuggestions(code: ErrorCode): string[] {
  const suggestions: Record<ErrorCode, string[]> = {
    NO_ACTIVE_TAB: ['Open a product page in a new tab', 'Refresh the current page'],
    UNSUPPORTED_PAGE: ['Navigate to an Amazon product page', 'Try a Shopify or WooCommerce product page'],
    NO_PRODUCT_DATA: ['Make sure you\'re on a product detail page', 'Try refreshing the page', 'Check if the page is fully loaded'],
    NETWORK_ERROR: ['Check your internet connection', 'Try disabling VPN or proxy', 'Enable Offline Mode for basic analysis'],
    API_QUOTA_EXCEEDED: ['Wait until tomorrow for quota reset', 'Upgrade to Pro for unlimited access', 'Add your own AI API key'],
    API_KEY_INVALID: ['Verify your API key is correct', 'Generate a new API key', 'Remove the key to use default service'],
    CONTENT_SCRIPT_ERROR: ['Refresh the page and try again', 'Check if the page allows extension access', 'Try a different product page'],
    STORAGE_ERROR: ['Clear browser cache and data', 'Check available storage space', 'Try using Incognito mode'],
    PARSE_ERROR: ['Try again in a few minutes', 'Report this issue if it persists', 'Enable Offline Mode as fallback'],
    TIMEOUT: ['Check your internet speed', 'Try Offline Mode for faster results', 'Retry the analysis'],
    PERMISSION_DENIED: ['Check extension permissions in browser settings', 'Reinstall the extension if needed'],
    UNKNOWN_ERROR: ['Try refreshing the page', 'Clear browser cache', 'Report the issue with error details']
  };
  
  return suggestions[code] || suggestions.UNKNOWN_ERROR;
}
