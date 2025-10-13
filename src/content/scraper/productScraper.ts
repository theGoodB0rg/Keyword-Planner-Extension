import { ProductData } from '../../types/product';

// Basic platform detection (extend later)
function detectPlatform(): ProductData['detectedPlatform'] {
  const host = window.location.host.toLowerCase();
  if (host.includes('amazon.')) return 'amazon';
  if ((window as any).Shopify || document.querySelector("meta[name='shopify-digital-wallet']")) return 'shopify';
  if (document.querySelector('[class*="woocommerce"]')) return 'woocommerce';
  return 'generic';
}

function text(el: Element | null): string {
  return (el?.textContent || '').trim();
}

function pickFirst(selectors: string[]): string | null {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return text(el);
  }
  return null;
}

function extractPriceRaw(): { raw: string | null; value: number | null; currency: string | null } {
  const priceSelectors = [
    '#priceblock_ourprice', '#priceblock_dealprice', '#corePrice_feature_div .a-offscreen', '.a-price .a-offscreen', 'span.a-offscreen',
    '.price-item--regular', '.product-price span', 'p.price', 'span.woocommerce-Price-amount'
  ];
  for (const sel of priceSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const raw = text(el);
      const match = raw.match(/([£$€¥]|USD|EUR|GBP)\s?([0-9,.]+)/i);
      let currency: string | null = null;
      let value: number | null = null;
      if (match) {
        currency = match[1].toUpperCase();
        value = parseFloat(match[2].replace(/,/g, ''));
      }
      return { raw, value, currency };
    }
  }
  return { raw: null, value: null, currency: null };
}

function extractBullets(): string[] {
  const bulletRoots = [
    '#feature-bullets ul', '#featurebullets_feature_div ul', '#detailBullets_feature_div ul',
    '.product-features ul', '.product-highlights ul', '.woocommerce-product-details__short-description ul'
  ];
  for (const rootSel of bulletRoots) {
    const root = document.querySelector(rootSel);
    if (root) {
      return Array.from(root.querySelectorAll('li'))
        .map(li => text(li))
        .filter(Boolean)
        .slice(0, 10);
    }
  }
  return [];
}

function extractDescription(): { html: string; text: string } {
  const descSelectors = [
    '#productDescription', '#aplus_feature_div', '.product-single__description', '.product-description', '#tab-description', '.woocommerce-Tabs-panel--description'
  ];
  for (const sel of descSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script,style,noscript').forEach(n => n.remove());
      const html = clone.innerHTML.trim();
      const textContent = clone.textContent?.replace(/\s+/g, ' ').trim() || '';
      return { html, text: textContent.slice(0, 15000) };
    }
  }
  return { html: '', text: '' };
}

function extractImages(): { src: string; alt: string | null }[] {
  const imgs: { src: string; alt: string | null }[] = [];
  const selectors = ['#altImages img', '#imgTagWrapperId img', '.product-single__photo-wrapper img', '.product-gallery img', 'div.woocommerce-product-gallery__image img'];
  const seen = new Set<string>();
  selectors.forEach(sel => {
    document.querySelectorAll<HTMLImageElement>(sel).forEach(img => {
      if (img.src && !seen.has(img.src)) {
        seen.add(img.src);
        imgs.push({ src: img.src, alt: img.alt || null });
      }
    });
  });
  return imgs.slice(0, 12);
}

function extractVariants(): { name: string; values: string[] }[] {
  const variantSelects = document.querySelectorAll('form select');
  const variants: { name: string; values: string[] }[] = [];
  variantSelects.forEach(sel => {
    const name = sel.getAttribute('name') || sel.id || 'option';
    const values = Array.from(sel.querySelectorAll('option'))
      .map(o => o.textContent?.trim() || '')
      .filter(v => v && !/choose/i.test(v))
      .slice(0, 30);
    if (values.length > 0) variants.push({ name, values });
  });
  return variants.slice(0, 6);
}

function extractSpecs(): { key: string; value: string }[] {
  const specs: { key: string; value: string }[] = [];
  const rows = document.querySelectorAll('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, table.prodDetTable tr, .woocommerce-product-attributes tr');
  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('th,td'));
    if (cells.length >= 2) {
      const key = text(cells[0]).toLowerCase();
      const value = cells.slice(1).map(c => text(c)).join(' ').trim();
      if (key && value) specs.push({ key, value });
    } else {
      const line = text(row);
      const parts = line.split(/:\s*/);
      if (parts.length === 2) {
        specs.push({ key: parts[0].toLowerCase(), value: parts[1] });
      }
    }
  });
  return specs.slice(0, 40);
}

function extractBrand(platform: ProductData['detectedPlatform'], specs: { key: string; value: string }[], title: string): string | null {
  // Platform-specific brand selectors
  const brandSelectors: Record<ProductData['detectedPlatform'], string[]> = {
    amazon: [
      '#bylineInfo', 
      'a#brand', 
      '#bylineInfo_feature_div a', 
      '.a-row .a-size-small.a-color-secondary',
      'a.a-link-normal[href*="/stores/"]'
    ],
    shopify: [
      '.product__vendor',
      '[itemprop="brand"]',
      '.product-vendor',
      '.product-single__vendor a'
    ],
    woocommerce: [
      '.posted_in a',
      '.product_meta .brand',
      '[itemprop="brand"]'
    ],
    generic: [
      '[itemprop="brand"]',
      '.brand',
      '.manufacturer',
      '.product-brand'
    ]
  };

  // Try direct brand selectors first
  let brand = pickFirst(brandSelectors[platform]);
  
  // Clean up Amazon "Visit the X Store" or "Brand: X"
  if (brand) {
    brand = brand.replace(/^Visit the\s+/i, '').replace(/\s+Store$/i, '').replace(/^Brand:\s*/i, '').trim();
  }

  // Fallback 1: Check specs table for brand/manufacturer
  if (!brand) {
    const brandSpec = specs.find(s => /^(brand|manufacturer)$/i.test(s.key));
    if (brandSpec?.value) {
      brand = brandSpec.value;
    }
  }

  // Fallback 2: Extract from title (first capitalized word, common brand patterns)
  if (!brand && title) {
    // Try to find brand from common patterns in title
    const knownBrandPatterns = [
      // Will match things like "Samsung Galaxy" -> "Samsung"
      /^([A-Z][a-z]+(?:[A-Z][a-z]+)?)\s+/,
      // Match all-caps brands like "SONY" or "HP"
      /^([A-Z]{2,})\s+/
    ];
    
    for (const pattern of knownBrandPatterns) {
      const match = title.match(pattern);
      if (match && match[1]) {
        brand = match[1];
        break;
      }
    }
  }

  return brand ? brand.trim() : null;
}

function extractAdditionalAttributes(specs: { key: string; value: string }[]): {
  dimensions?: string;
  weight?: string;
  color?: string;
  size?: string;
  material?: string;
  countryOfOrigin?: string;
  asin?: string;
  modelNumber?: string;
} {
  const attrs: any = {};
  
  // Extract from specs table
  specs.forEach(spec => {
    const key = spec.key.toLowerCase();
    const value = spec.value.trim();
    
    if (/dimensions?|size\s*\(.*\)/.test(key)) {
      attrs.dimensions = value;
    } else if (/weight/.test(key)) {
      attrs.weight = value;
    } else if (/colou?r/.test(key)) {
      attrs.color = value;
    } else if (/^size$/.test(key)) {
      attrs.size = value;
    } else if (/material/.test(key)) {
      attrs.material = value;
    } else if (/country.*origin|made in/i.test(key)) {
      attrs.countryOfOrigin = value;
    } else if (/asin/.test(key)) {
      attrs.asin = value;
    } else if (/model|item model|part number/.test(key)) {
      attrs.modelNumber = value;
    }
  });
  
  // Try to extract ASIN from URL or page (Amazon specific)
  if (!attrs.asin) {
    const asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    if (asinMatch) {
      attrs.asin = asinMatch[1];
    }
  }
  
  return attrs;
}

export function scrapeProduct(): ProductData | null {
  const title = pickFirst(['#productTitle', '#titleSection h1', "meta[name='title']", 'h1.product-single__title', 'h1.product__title', '.product_title', 'h1']);
  if (!title) return null; // Not a recognizable product page
  const platform = detectPlatform();
  const price = extractPriceRaw();
  const bullets = extractBullets();
  const { html: descriptionHTML, text: descriptionText } = extractDescription();
  const images = extractImages();
  const variants = extractVariants();
  const specs = extractSpecs();
  const reviews = { count: null as number | null, average: null as number | null };
  const categoryPath: string[] = [];
  
  // Extract brand and additional attributes
  const brand = extractBrand(platform, specs, title);
  const additionalAttrs = extractAdditionalAttributes(specs);

  const product: ProductData = {
    title,
    brand,
    price,
    bullets,
    descriptionHTML,
    descriptionText,
    images,
    variants,
    specs,
    categoryPath,
    reviews,
    sku: additionalAttrs.asin || null,
    availability: null,
    detectedPlatform: platform,
    url: window.location.href,
    timestamp: Date.now(),
    raw: {
      dimensions: additionalAttrs.dimensions,
      weight: additionalAttrs.weight,
      color: additionalAttrs.color,
      size: additionalAttrs.size,
      material: additionalAttrs.material,
      countryOfOrigin: additionalAttrs.countryOfOrigin,
      modelNumber: additionalAttrs.modelNumber
    }
  };
  return product;
}
