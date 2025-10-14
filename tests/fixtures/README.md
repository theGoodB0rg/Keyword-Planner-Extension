# Test Fixtures

This directory contains HTML snapshots of product pages from various e-commerce platforms. These fixtures are used for testing the extension's extraction logic without requiring live page access.

## Directory Structure

```
fixtures/
├── amazon-books/          # Amazon book product pages
├── amazon-electronics/    # Amazon electronics product pages
├── etsy/                  # Etsy product listings
├── walmart/               # Walmart product pages
├── ebay/                  # eBay item listings
├── shopify/               # Shopify store product pages
├── woocommerce/           # WooCommerce product pages
└── README.md             # This file
```

## How to Capture Fixtures

### Manual Capture (Recommended for Phase 0)

1. **Navigate to a product page** in your browser
2. **Open Developer Tools** (F12)
3. **Run in console:**
   ```javascript
   // Get the full HTML
   const html = document.documentElement.outerHTML;
   
   // Copy to clipboard
   copy(html);
   
   // Or download as file
   const blob = new Blob([html], { type: 'text/html' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = 'product-page.html';
   a.click();
   ```

4. **Save the HTML** to the appropriate directory with a descriptive name:
   - Format: `{platform}-{product-type}-{variant}.html`
   - Example: `amazon-books-kindle-edition.html`

### Automated Capture (Future Enhancement)

A script will be created in Phase 0 to automate fixture capture:
```bash
npm run capture-fixture -- --url="https://..." --platform="amazon-books"
```

## Fixture Naming Convention

Use descriptive names that indicate:
- Platform (amazon, etsy, walmart, etc.)
- Product category/type
- Page variant (desktop/mobile, logged-in/out)
- Special features (has-variations, has-reviews, etc.)

Examples:
- `amazon-books-hardcover-desktop.html`
- `etsy-handmade-jewelry-mobile.html`
- `walmart-electronics-tv-with-variants.html`
- `shopify-clothing-size-variants.html`

## Priority Fixtures to Capture

### Amazon
- [ ] Books - Paperback (desktop)
- [ ] Books - Kindle Edition (desktop)
- [ ] Electronics - Simple product (desktop)
- [ ] Electronics - With variations (desktop)
- [ ] Books - Mobile view
- [ ] Electronics - Mobile view

### Etsy
- [ ] Handmade item (desktop)
- [ ] Vintage item (desktop)
- [ ] Digital download (desktop)
- [ ] Item with variations (desktop)
- [ ] Mobile view

### Walmart
- [ ] Standard product (desktop)
- [ ] Product with variants (desktop)
- [ ] Marketplace seller item (desktop)
- [ ] Mobile view

### eBay
- [ ] Buy It Now listing (desktop)
- [ ] Auction listing (desktop)
- [ ] Product with variations (desktop)
- [ ] Mobile view

### Shopify
- [ ] Default theme product (desktop)
- [ ] Product with variants (desktop)
- [ ] Custom theme product (desktop)
- [ ] Mobile view

### WooCommerce
- [ ] Simple product (desktop)
- [ ] Variable product (desktop)
- [ ] Mobile view

## Using Fixtures in Tests

```typescript
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { scrapeProduct } from '../src/content/scraper/productScraper';

describe('Amazon Books Extraction', () => {
  it('should extract title from hardcover book page', () => {
    const html = readFileSync('./fixtures/amazon-books/hardcover-desktop.html', 'utf-8');
    const dom = new JSDOM(html);
    global.document = dom.window.document;
    
    const result = scrapeProduct();
    expect(result?.title).toBeTruthy();
    expect(result?.platform).toBe('amazon');
  });
});
```

## Data Privacy

⚠️ **Important**: When capturing fixtures:
- Remove any personal information (names, addresses, emails)
- Remove order history or account-specific content
- Remove tracking pixels and analytics scripts
- Keep only the product-relevant HTML structure

## Maintenance

- Update fixtures when marketplace templates change significantly
- Add new fixtures when bugs are reported for specific page types
- Document any manual modifications made to captured HTML
