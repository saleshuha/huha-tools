// ─── Category Detection Engine (shared utility) ─────────────────────────────

export interface CategoryRule {
  category: string;
  keywords: string[];
  priority: number;
  color: string;
}

export const CATEGORY_RULES: CategoryRule[] = [
  { category: 'Screen Protector', keywords: ['tempered glass', 'screen protector', 'glass protector', 'privacy glass', 'matte glass', 'ceramic glass'], priority: 1, color: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  { category: 'TPU / Carbon Fiber Case', keywords: ['tpu', 'carbon fiber', 'carbon fibre', 'brushed case', 'rugged armor'], priority: 2, color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { category: 'Silicone Case', keywords: ['silicone case', 'silicone phone', 'soft case', 'jelly case', 'gel case'], priority: 3, color: 'bg-pink-500/15 text-pink-700 dark:text-pink-300' },
  { category: 'Leather / Flip Case', keywords: ['leather case', 'flip case', 'flip cover', 'wallet case', 'book case', 'folio'], priority: 4, color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { category: 'Shockproof / Rugged Case', keywords: ['shockproof', 'rugged', 'armor case', 'heavy duty', 'military', 'kickstand case', 'ring holder case'], priority: 5, color: 'bg-red-500/15 text-red-700 dark:text-red-300' },
  { category: 'Clear / Transparent Case', keywords: ['clear case', 'transparent case', 'crystal case', 'see through'], priority: 6, color: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' },
  { category: 'Remote Control', keywords: ['remote', 'ir remote', 'tv remote', 'ac remote', 'air conditioner remote', 'air condition'], priority: 7, color: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
  { category: 'Watch Band / Strap', keywords: ['watch band', 'watch strap', 'smartwatch band', 'wrist band', 'wristband'], priority: 8, color: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300' },
  { category: 'Cable & Charger', keywords: ['cable', 'charger', 'adapter', 'charging', 'usb', 'type-c', 'type c', 'lightning cable', 'power bank', 'wireless charger'], priority: 9, color: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
  { category: 'Audio Accessory', keywords: ['earphone', 'headphone', 'earbuds', 'headset', 'speaker', 'airpods', 'buds case'], priority: 10, color: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' },
  { category: 'Tablet Case / Cover', keywords: ['tablet case', 'ipad case', 'tab case', 'tablet cover', 'ipad cover', 'smart cover'], priority: 11, color: 'bg-teal-500/15 text-teal-700 dark:text-teal-300' },
  { category: 'Electronics Accessory', keywords: ['hdmi', 'converter', 'hub', 'splitter', 'switch', 'extender', 'dongle', 'otg'], priority: 12, color: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300' },
  { category: 'Camera / Lens', keywords: ['camera', 'lens', 'tripod', 'selfie', 'ring light', 'gimbal'], priority: 13, color: 'bg-lime-500/15 text-lime-700 dark:text-lime-300' },
  { category: 'Car Accessory', keywords: ['car mount', 'car holder', 'car charger', 'phone holder car', 'dashboard'], priority: 14, color: 'bg-stone-500/15 text-stone-700 dark:text-stone-300' },
];

export const BRAND_PATTERNS: { brand: string; keywords: string[] }[] = [
  { brand: 'Samsung', keywords: ['samsung', 'galaxy'] },
  { brand: 'iPhone / Apple', keywords: ['iphone', 'apple', 'ipad', 'airpods', 'macbook'] },
  { brand: 'Xiaomi', keywords: ['xiaomi', 'redmi', 'poco', 'mi '] },
  { brand: 'OPPO', keywords: ['oppo', 'realme'] },
  { brand: 'Huawei', keywords: ['huawei', 'honor'] },
  { brand: 'OnePlus', keywords: ['oneplus', 'one plus'] },
  { brand: 'Vivo', keywords: ['vivo'] },
  { brand: 'Nokia', keywords: ['nokia'] },
  { brand: 'Motorola', keywords: ['motorola', 'moto '] },
  { brand: 'Google', keywords: ['google', 'pixel'] },
  { brand: 'Sony', keywords: ['sony', 'xperia'] },
  { brand: 'LG', keywords: ['lg '] },
  { brand: 'Tecno', keywords: ['tecno'] },
  { brand: 'Infinix', keywords: ['infinix'] },
  { brand: 'TCL', keywords: ['tcl'] },
  { brand: 'Nothing', keywords: ['nothing phone'] },
];

export function detectCategory(title: string): { category: string; color: string } {
  const lower = (title || '').toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { category: rule.category, color: rule.color };
    }
  }
  return { category: 'Miscellaneous', color: 'bg-muted text-muted-foreground' };
}

export function detectBrand(title: string): string {
  const lower = (title || '').toLowerCase();
  for (const bp of BRAND_PATTERNS) {
    if (bp.keywords.some(kw => lower.includes(kw))) {
      return bp.brand;
    }
  }
  return 'Other';
}
