/**
 * Fixture Capture Helper Script
 * 
 * Run this in the browser console on a product page to capture HTML fixture
 * 
 * Usage:
 * 1. Navigate to a product page
 * 2. Open DevTools Console (F12)
 * 3. Paste this entire script and press Enter
 * 4. Follow the prompts to save the fixture
 */

(function captureFixture() {
  console.log('📸 Fixture Capture Tool - Starting...');
  
  // Get the full HTML
  const html = document.documentElement.outerHTML;
  
  // Detect platform
  const host = window.location.hostname;
  let suggestedPlatform = 'generic';
  
  if (host.includes('amazon.')) suggestedPlatform = 'amazon';
  else if (host.includes('etsy.')) suggestedPlatform = 'etsy';
  else if (host.includes('walmart.')) suggestedPlatform = 'walmart';
  else if (host.includes('ebay.')) suggestedPlatform = 'ebay';
  else if (window.Shopify || document.querySelector("meta[name='shopify-digital-wallet']")) suggestedPlatform = 'shopify';
  else if (document.querySelector('[class*="woocommerce"]')) suggestedPlatform = 'woocommerce';
  
  // Get product info for suggested filename
  const titleEl = document.querySelector('h1, [id*="title"], [class*="title"]');
  const title = titleEl ? titleEl.textContent.trim().substring(0, 40) : 'product';
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  const suggestedFilename = `${suggestedPlatform}-${cleanTitle}-${Date.now()}.html`;
  
  console.log(`
✅ Fixture Captured!

Platform: ${suggestedPlatform}
URL: ${window.location.href}
Title: ${title}
Size: ${(html.length / 1024).toFixed(2)} KB

Suggested filename: ${suggestedFilename}

---

Choose an option:

1️⃣ Copy to clipboard (recommended)
   Run: copy(window.__capturedFixture)

2️⃣ Download as file
   A download should start automatically...

3️⃣ View in new tab
   Run: window.open().document.write(window.__capturedFixture)

---

⚠️ REMEMBER: Before saving, remove any personal information!
  `);
  
  // Store in window for easy access
  window.__capturedFixture = html;
  
  // Try to copy to clipboard automatically
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(html).then(() => {
        console.log('✅ HTML copied to clipboard!');
      }).catch(() => {
        console.log('⚠️ Could not auto-copy. Use: copy(window.__capturedFixture)');
      });
    } else {
      // Fallback for older browsers
      console.log('ℹ️ To copy: run copy(window.__capturedFixture)');
    }
  } catch (e) {
    console.log('ℹ️ To copy: run copy(window.__capturedFixture)');
  }
  
  // Auto-download
  try {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedFilename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    console.log('⬇️ Download started!');
  } catch (e) {
    console.error('❌ Auto-download failed:', e);
  }
  
  // Return summary
  return {
    platform: suggestedPlatform,
    url: window.location.href,
    title: title,
    sizeKB: (html.length / 1024).toFixed(2),
    filename: suggestedFilename,
    html: html
  };
})();
