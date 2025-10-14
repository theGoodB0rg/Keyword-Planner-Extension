# Extension Failure Matrix

**Phase 0: Baseline Assessment**  
**Created**: October 14, 2025  
**Last Updated**: October 14, 2025

This document tracks known failures and limitations of the extension across different marketplaces, page types, and scenarios. Use this to prioritize fixes and measure progress.

---

## Summary Status

| Platform | Desktop Support | Mobile Support | SPA Navigation | Variant Products | Overall Status |
|----------|----------------|----------------|----------------|------------------|----------------|
| Amazon (Books) | ⚠️ Partial | ❌ Unknown | ❌ No | ⚠️ Partial | **Needs Testing** |
| Amazon (Electronics) | ⚠️ Partial | ❌ Unknown | ❌ No | ⚠️ Partial | **Needs Testing** |
| Etsy | ❌ Fails | ❌ Unknown | ❌ No | ❌ Fails | **Not Supported** |
| Walmart | ❌ Unknown | ❌ Unknown | ❌ No | ❌ Unknown | **Not Supported** |
| eBay | ❌ Unknown | ❌ Unknown | ❌ No | ❌ Unknown | **Not Supported** |
| Shopify | ⚠️ Partial | ❌ Unknown | ❌ No | ❌ Unknown | **Partial** |
| WooCommerce | ⚠️ Partial | ❌ Unknown | ❌ No | ❌ Unknown | **Partial** |

**Legend:**
- ✅ Works reliably
- ⚠️ Works partially or inconsistently  
- ❌ Fails or not supported
- 🔄 In progress
- ❓ Unknown/needs testing

---

## Known Issues by Platform

### Amazon

#### Books Category
**Status**: ⚠️ Partial Support

| Issue | Severity | Description | Root Cause |
|-------|----------|-------------|------------|
| Kindle vs Physical | 🟡 Medium | Different metadata structure for Kindle vs physical books | Selector assumes physical book layout |
| Limited Look Inside | 🟡 Medium | "Look Inside" widget may interfere with extraction | Dynamic content injection |
| Series information | 🟢 Low | Book series info not extracted | Not prioritized in current selectors |
| Author variations | 🟢 Low | Multiple authors with "and" vs "&" | String parsing limitation |

**Affected Selectors:**
- `#productTitle` - Works for both
- `#bylineInfo` - Varies between formats
- `#detailBullets_feature_div` - Different for Kindle
- `.a-size-base.a-color-price` - Price selector varies

#### Electronics Category  
**Status**: ⚠️ Partial Support

| Issue | Severity | Description | Root Cause |
|-------|----------|-------------|------------|
| Variation swatches | 🔴 High | Color/size variants not detected | Selector too specific to books |
| Tech specs table | 🟡 Medium | Specs in different format than books | Different product details structure |
| Bundle deals | 🟡 Medium | "Frequently bought together" not scraped | Not in current scope |
| Video content | 🟢 Low | Product videos not extracted | Media handling not implemented |

**Affected Selectors:**
- `#variation_color_name` - Not checked
- `#productDetails_techSpec_section_1` - Different structure
- `.a-spacing-small.item` - Bundle items selector missing

---

### Etsy

**Status**: ❌ Not Supported

| Issue | Severity | Description | Root Cause |
|-------|----------|-------------|------------|
| Page not detected | 🔴 Critical | Extension doesn't recognize Etsy pages | No Etsy detection in `detectPlatform()` |
| No extraction | 🔴 Critical | Zero data extracted from Etsy listings | No Etsy-specific selectors |
| Handmade variations | 🔴 High | Custom options (size, color, personalization) ignored | Variation system completely different |
| Shop context | 🟡 Medium | Shop/seller information not extracted | Not in data model |

**Blockers:**
1. `shouldAnalyzePage()` rejects Etsy pages (not enough `<p>` tags)
2. `detectPlatform()` has no Etsy detection logic
3. `scrapeProduct()` has no Etsy selectors
4. SPA navigation breaks on Etsy's client-side routing

**Example URLs Failing:**
- `https://www.etsy.com/listing/...` - Not detected as product page
- Etsy shop pages - Completely ignored
- Category/search pages - No competitor extraction

---

### Walmart

**Status**: ❌ Not Supported

| Issue | Severity | Description | Root Cause |
|-------|----------|-------------|------------|
| Page not detected | 🔴 Critical | Extension doesn't recognize Walmart | No Walmart in platform detection |
| Marketplace sellers | 🔴 High | Marketplace items vs Walmart direct items have different layouts | Only one template supported |
| Pickup/delivery | 🟡 Medium | Location-based availability not handled | Not in data model |

**Blockers:**
- No Walmart detection in code
- No Walmart selectors defined
- Different price structures (online vs in-store)

---

### eBay

**Status**: ❌ Not Supported

| Issue | Severity | Description | Root Cause |
|-------|----------|-------------|------------|
| Page not detected | 🔴 Critical | Extension doesn't recognize eBay | No eBay detection |
| Auction vs Buy It Now | 🔴 High | Two completely different formats | Only fixed-price model supported |
| Bidding state | 🔴 High | Time-sensitive pricing not handled | Data model assumes static price |
| Variations | 🟡 Medium | eBay variation system different from Amazon | No eBay adapter |

**Blockers:**
- No eBay platform detection
- No auction support in data model
- Competitor extraction assumes Amazon ASIN links

---

### Shopify

**Status**: ⚠️ Partial Support

| Issue | Severity | Description | Root Cause |
|-------|----------|-------------|------------|
| Theme inconsistency | 🟡 Medium | Different Shopify themes have different DOM structures | Only default theme selectors |
| Variant handling | 🟡 Medium | Shopify variants may not extract correctly | Selector assumes specific structure |
| Custom liquid templates | 🔴 High | Heavily customized stores fail extraction | No fallback to JSON APIs |

**What Works:**
- Basic product title extraction (if using standard selectors)
- Price extraction (sometimes)
- Platform detection via meta tags

**What Fails:**
- Custom themes with non-standard markup
- Variant extraction
- Competitor scraping (no standardized competitor section)

---

### WooCommerce

**Status**: ⚠️ Partial Support

| Issue | Severity | Description | Root Cause |
|-------|----------|-------------|------------|
| Theme diversity | 🟡 Medium | Thousands of WooCommerce themes with different structures | Only generic selectors |
| Plugin interference | 🟡 Medium | Popular plugins change DOM structure | No plugin-specific handling |
| Variation products | 🟡 Medium | WooCommerce variations not fully supported | Selector too generic |

**What Works:**
- Platform detection via meta tags and body classes
- Basic title/price extraction (when using common themes)

**What Fails:**
- Custom post types
- Complex variation systems
- Plugin-added content

---

## Cross-Platform Issues

### SPA Navigation
**Status**: ❌ Not Supported  
**Severity**: 🔴 Critical

The extension only runs once per tab due to the `initialized` guard in `contentScript.ts:10`. This breaks:
- Etsy (full SPA)
- Amazon search to product navigation
- eBay category browsing
- Any site with client-side routing

**Impact**: Users must manually refresh the extension or reload the page to analyze new products.

---

### Page Detection Heuristics
**Status**: ⚠️ Too Restrictive  
**Severity**: 🔴 High

`shouldAnalyzePage()` requires:
- `>1000` characters of text
- `≥5` `<p>` tags

**Rejects:**
- Minimalist product pages
- Mobile-optimized layouts
- Image-heavy listings (Etsy, Pinterest)
- Pages with content in `<div>` instead of `<p>`

---

### Competitor Extraction
**Status**: ❌ Amazon-Only  
**Severity**: 🔴 High

Competitor scraping (line 342 of `contentScript.ts`) is hardcoded to:
- Look for `data-asin` attributes
- Parse `/dp/` URLs
- Assume Amazon's "Customers also viewed" structure

**Impact**: No competitor data on any non-Amazon site.

---

## Testing Priorities

### Phase 0 (Current)
1. ✅ Set up telemetry logging
2. 🔄 Capture HTML fixtures for each platform
3. 🔄 Document this failure matrix
4. ⏳ Manual testing with real pages to fill unknowns

### Phase 1 (Detection Overhaul)
1. Test schema.org JSON-LD detection on all platforms
2. Validate SPA observer on Etsy
3. Measure false positive/negative rates

### Phase 2 (Extraction)
1. Unit test each adapter against fixtures
2. Regression test Amazon remains working
3. Validate competitor extraction on new platforms

---

## Test Scenarios to Add

### Manual Test Checklist

#### Amazon
- [ ] Books - Hardcover desktop
- [ ] Books - Kindle desktop
- [ ] Books - Mobile view
- [ ] Electronics - Simple product desktop
- [ ] Electronics - With variations desktop
- [ ] Electronics - Mobile view
- [ ] Navigate from search to product (SPA test)

#### Etsy
- [ ] Handmade item desktop
- [ ] Vintage item desktop
- [ ] Digital download desktop
- [ ] Item with personalization desktop
- [ ] Mobile view
- [ ] Navigate between listings (SPA test)

#### Walmart
- [ ] Standard product desktop
- [ ] Marketplace seller item desktop
- [ ] Product with pickup/delivery options
- [ ] Mobile view

#### eBay
- [ ] Buy It Now listing desktop
- [ ] Auction listing desktop
- [ ] Best Offer listing desktop
- [ ] Mobile view

#### Shopify
- [ ] Default theme product desktop
- [ ] Custom theme product desktop
- [ ] Product with variants desktop
- [ ] Mobile view

#### WooCommerce
- [ ] Simple product desktop
- [ ] Variable product desktop
- [ ] Mobile view

---

## Progress Tracking

### Baseline (Before Fixes)
- **Supported Platforms**: 1 (Amazon partial)
- **Detection Success Rate**: ~30% (Amazon only)
- **SPA Support**: 0%
- **Mobile Support**: Unknown

### Target (After All Phases)
- **Supported Platforms**: 7+ (Amazon, Etsy, Walmart, eBay, Shopify, WooCommerce, Generic)
- **Detection Success Rate**: >90%
- **SPA Support**: 100%
- **Mobile Support**: >80%

---

## Notes

- This matrix will be updated as fixtures are captured and testing progresses
- Severity levels guide prioritization for fixes
- Unknown items should be tested and documented ASAP
- Each fix should update this document and re-run affected test scenarios

**Next Steps:**
1. Capture real HTML fixtures to convert "Unknown" to concrete failure descriptions
2. Add telemetry logging to track real-world failure rates
3. Use this matrix to prioritize adapter development in Phase 2
