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
    '#priceblock_ourprice', '#priceblock_dealprice', 'span.a-offscreen',
    '.price-item--regular', '.product-price span', 'p.price', 'span.woocommerce-Price-amount'
  ];
  for (const sel of priceSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      const raw = text(el);
      const match = raw.match(/([£$€¥])\s?([0-9,.]+)/);
      let currency: string | null = null;
      let value: number | null = null;
      if (match) {
        currency = match[1];
        value = parseFloat(match[2].replace(/,/g, ''));
      }
      return { raw, value, currency };
    }
  }
  return { raw: null, value: null, currency: null };
}

function extractBullets(): string[] {
  const bulletRoots = [
    '#feature-bullets ul', '.product-features ul', '.product-highlights ul', '.woocommerce-product-details__short-description ul'
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

export function scrapeProduct(): ProductData | null {
  const title = pickFirst(['#productTitle', 'h1.product-single__title', 'h1.product__title', '.product_title', 'h1']);
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

  const product: ProductData = {
    title,
    brand: null,
    price,
    bullets,
    descriptionHTML,
    descriptionText,
    images,
    variants,
    specs,
    categoryPath,
    reviews,
    sku: null,
    availability: null,
    detectedPlatform: platform,
    url: window.location.href,
    timestamp: Date.now(),
    raw: {}
  };
  return product;
}
