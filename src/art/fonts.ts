/**
 * Fonts for the vector cover art. The SVGs are rasterised through <img>, where page web-fonts are not visible,
 * so each SVG carries its fonts as base64 @font-face data (loaded once and cached). All fonts are SIL OFL.
 */
export type ArtFont = 'block' | 'serif' | 'serifDisplay' | 'sans' | 'display' | 'ui';

interface FontFile { family: string; file: string; weight: string }

export const ART_FONTS: Record<ArtFont, FontFile> = {
  // Heavy squarish block letters (stand-in for Kehot's Toras Menachem title face)
  block: { family: 'Miriam Libre', file: 'MiriamLibre-var-hebrew.woff2', weight: '400 700' },
  // Traditional sefer serif (Likkutei Sichos title, Ramban oval, Shas)
  serif: { family: 'Frank Ruhl Libre', file: 'FrankRuhlLibre-var-hebrew.woff2', weight: '300 900' },
  serifDisplay: { family: 'Suez One', file: 'SuezOne-400-hebrew.woff2', weight: '400' },
  sans: { family: 'Heebo', file: 'Heebo-var-hebrew.woff2', weight: '100 900' },
  display: { family: 'Secular One', file: 'SecularOne-400-hebrew.woff2', weight: '400' },
  ui: { family: 'Noto Serif Hebrew', file: 'NotoSerifHebrew-var-hebrew.woff2', weight: '100 900' },
};

export const FONT_PLACEHOLDER = '/*__ART_FONTS__*/';

export function fontStack(f: ArtFont): string {
  return `'${ART_FONTS[f].family}', 'Noto Serif Hebrew', serif`;
}

const cache = new Map<string, Promise<string>>();

async function dataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font ${url}: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:font/woff2;base64,${btoa(s)}`;
}

/** @font-face CSS for the fonts an SVG uses (cached). */
export async function fontFaceCss(fonts: ArtFont[], base = '/'): Promise<string> {
  const parts = await Promise.all([...new Set(fonts)].map(async (k) => {
    const f = ART_FONTS[k];
    const key = `${base}${f.file}`;
    let p = cache.get(key);
    if (!p) { p = dataUri(`${base}fonts/${f.file}`); cache.set(key, p); }
    return `@font-face{font-family:'${f.family}';font-weight:${f.weight};src:url(${await p}) format('woff2');}`;
  }));
  return parts.join('');
}

export function fontsUsed(svg: string): ArtFont[] {
  return (Object.keys(ART_FONTS) as ArtFont[]).filter((k) => svg.includes(`'${ART_FONTS[k].family}'`));
}
