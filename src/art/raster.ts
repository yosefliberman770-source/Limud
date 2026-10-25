import { FONT_PLACEHOLDER, fontFaceCss, fontsUsed } from './fonts';

const cssCache = new Map<string, Promise<string>>();

/** Inline the fonts the SVG needs so it renders correctly when loaded through <img>. */
export async function inlineFonts(svg: string, base = '/'): Promise<string> {
  const used = fontsUsed(svg);
  const key = `${base}|${used.sort().join(',')}`;
  let p = cssCache.get(key);
  if (!p) { p = fontFaceCss(used, base); cssCache.set(key, p); }
  return svg.replace(FONT_PLACEHOLDER, await p);
}

export async function svgToImage(svg: string, base = '/'): Promise<{ img: HTMLImageElement; url: string }> {
  const full = await inlineFonts(svg, base);
  const url = URL.createObjectURL(new Blob([full], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode();
  return { img, url };
}

/** Rasterise a vector design at the requested pixel size (re-rendered from vectors, not scaled bitmap). */
export async function rasterize(svg: string, pxW: number, pxH: number, base = '/'): Promise<HTMLCanvasElement> {
  const { img, url } = await svgToImage(svg, base);
  const c = document.createElement('canvas');
  c.width = Math.round(pxW); c.height = Math.round(pxH);
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c;
}

/** A self-contained SVG string (fonts embedded) suitable for saving as a .svg file or using as <img src>. */
export async function standaloneSvg(svg: string, base = '/'): Promise<string> {
  return inlineFonts(svg, base);
}
