## Product Scraper Specification

Purpose: Deterministically extract structured product data from diverse e‑commerce pages (Amazon, Shopify, WooCommerce, generic) with layered fallbacks and performance budget (<150ms median on typical pages).

### Data Model (ProductData)
```ts
interface ProductData {
  title: string;
  brand: string | null;
  price: { value: number | null; currency: string | null; raw: string | null };
  bullets: string[];              // Primary feature bullets / selling points
  descriptionHTML: string;        // Sanitized subset (allowed tags: p, ul, li, strong, em, br, h1-h4)
  descriptionText: string;        // Plain text version (normalized spaces)
  images: { src: string; alt: string | null }[];
  variants: { name: string; values: string[] }[];  // e.g., Color:[Red, Blue]; Size:[S,M,L]
  specs: { key: string; value: string }[];         // Technical attributes / key-value table
  categoryPath: string[];          // Breadcrumb semantics if available
  reviews: { count: number | null; average: number | null };
  sku: string | null;              // Product code / SKU if found
  availability: string | null;     // e.g., InStock, OutOfStock
  detectedPlatform: 'amazon' | 'shopify' | 'woocommerce' | 'generic';
  url: string;
  timestamp: number;               // Extraction epoch ms
  raw: Record<string, any>;        // Internal debug stash (NOT sent to AI)
}
```

### Platform Detection Heuristics
| Platform | Indicators |
|----------|------------|
| Amazon | `meta[name="amazon-payments"]`, `#ppd`, `#productTitle`, URL host contains `amazon.` |
| Shopify | Presence of `Shopify.theme`, `meta[name='shopify-digital-wallet']`, forms posting to `/cart/add` |
| WooCommerce | Classes containing `woocommerce`, `form.cart`, `.woocommerce-product-details__short-description` |
| Generic | Fallback if none match |

### Extraction Strategy (Ordered Passes)
1. Platform specific selector maps (strong priority)
2. Semantic tags (h1, h2 near price nodes)
3. Heuristic aggregation (largest bullet-like list, longest paragraph cluster)
4. Fallback generic text slicing (truncate to size cap)

### Selector Maps (Abbreviated Examples)
```ts
const SELECTORS = {
  amazon: {
    title: ['#productTitle'],
    price: ['#corePrice_display_desktop_feature_div span.a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice'],
    bullets: ['#feature-bullets ul li'],
    description: ['#productDescription', '#aplus_feature_div'],
    images: ['#altImages img', '#imgTagWrapperId img'],
    specs: ['#productDetails_techSpec_section_1 tr', '#productDetails_detailBullets_sections1 tr', 'table.prodDetTable tr'],
    reviews: ['#acrCustomerReviewText', '.averageStarRating span.a-icon-alt']
  },
  shopify: {
    title: ['h1.product-single__title', 'h1.product__title'],
    price: ['.price-item--regular', '.product-price span', '[data-product-price]'],
    bullets: ['.product-features li', '.product-highlights li'],
    description: ['.product-single__description', '.product-description'],
    images: ['.product-single__photo-wrapper img', '.product-gallery img'],
    variants: ['form[action*="/cart/add"] select'],
    specs: ['.product-specs table tr'],
  },
  woocommerce: {
    title: ['.product_title'],
    price: ['p.price', 'span.woocommerce-Price-amount'],
    bullets: ['.woocommerce-product-details__short-description ul li'],
    description: ['#tab-description', '.woocommerce-Tabs-panel--description'],
    images: ['div.woocommerce-product-gallery__image img'],
    variants: ['form.cart table.variations select'],
    specs: ['.woocommerce-product-attributes tr'],
  }
};
```

### Normalization Rules
- Collapse whitespace → single spaces; trim ends
- Strip “Brand:” / “By ” prefixes
- Price: parse first valid decimal; detect currency via symbol map ($, €, £, ¥)
- Bullets: remove trailing punctuation duplicates, drop empties, dedupe identical lines
- Specs: key lowercased, camelCase transformation optional
- Images: discard data URIs > 512 KB; ensure absolute URLs

### Description Sanitization
Allow list tags: `p, ul, ol, li, strong, em, br, h1, h2, h3, h4, table, thead, tbody, tr, td, th`.
Strip attributes except: `href`, `src`, `alt`, `title`.
Remove scripts, styles, inline event handlers.

### Variant Extraction
For each `select` element inside recognized add-to-cart form:
- `name` attribute or associated `<label>` → variant name.
- Collect distinct option texts (filtered for placeholders like 'Choose…').

### Spec Table Extraction
Iterate `tr` nodes:
- Key: first `th` or first cell before colon pattern
- Value: remaining text joined
- Filter if key length > 60 or value empty

### Reviews
- Count: parse integer from text like "1,234 ratings" / "123 customer reviews"
- Average: parse float from alt text like "4.5 out of 5 stars"

### Attribute Gap Heuristic Seed
Canonical expected keys (dynamic by platform):
`['material','dimensions','weight','color','size','brand','model','warranty','country of origin','capacity']`
Gap scoring:
- Missing high-priority (material/dimensions/size) = weight 3
- Missing medium (model, warranty, capacity) = weight 2
- Missing low (country of origin) = weight 1
Aggregate gapScore = sum weights → classify (none / mild / moderate / severe)

### Performance Optimizations
- Abort early if title missing after all platform passes → likely non-product page
- Limit DOM queries by batching selectors per category
- Cache query results locally in a WeakMap keyed by selector list
- Hard cap descriptionText length (e.g., 15,000 chars) before AI prompt

### Error Handling & Resilience
- Wrap each extraction phase; push warnings to `raw._warnings[]`
- If critical fields missing (title + price + bullets), mark `raw._incomplete = true`
- Provide debug toggle in UI to reveal `raw` subset (non-sensitive)

### Offline Heuristic Enhancements
- If price null → attempt regex on entire body for currency pattern near title tokens
- If bullets empty → derive from first 5 sentences of description (sentence boundary heuristic)
- If brand null → look for meta og:brand / schema.org markup

### Testing Fixtures
Store representative static HTML samples under `tests/fixtures/{platform}/sample*.html`.

### Open Questions
- Should we attempt structured data JSON-LD parsing now or later? (Later / Phase 2)
- Add image dimension filtering? (Optional Phase 2)

---
This spec guides implementation. Update as new platforms or heuristics are introduced.
