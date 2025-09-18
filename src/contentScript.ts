/**
 * Content script - Runs in the context of web pages
 */

import { extractPageContent, isProductPage } from './utils/scraper';
import { PageMetadata } from './utils/types';
import { scrapeProduct } from './content/scraper/productScraper';

// Wait for the page to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add a small delay to ensure all content has loaded
  setTimeout(initialize, 1000);
});

// Initialize if document is already loaded
if (document.readyState === 'complete') {
  initialize();
}

/**
 * Initialize the content script
 */
function initialize() {
  try {
    console.log('AI Keyword Planner: Content script initialized');

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
      chrome.runtime.sendMessage({ action: 'pageUnsupported', url: window.location.href });
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
 */
function shouldAnalyzePage(): boolean {
  // Skip pages with little content
  const contentLength = document.body.innerText.length;
  if (contentLength < 1000) {
    return false;
  }
  
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
    return false;
  }
  
  // Always analyze product pages
  if (isProductPage()) {
    return true;
  }
  
  // Check for content-rich pages 
  const paragraphs = document.querySelectorAll('p');
  if (paragraphs.length >= 5) {
    return true;
  }
  
  return false;
}

/**
 * Send data to the background script
 */
function sendToBackground(pageData: PageMetadata) {
  let productData = null;
  try {
    if (isProductPage()) {
      productData = scrapeProduct();
    }
  } catch (e) {
    console.warn('Product scrape failed (non-fatal):', e);
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
  // Create button container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  
  // Create the analyze button
  const button = document.createElement('button');
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