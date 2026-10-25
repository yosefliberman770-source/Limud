/** Dev-only comparison lab: renders a design next to its reference blueprint. Open /art-lab.html?d=<design>&ref=<key>&w=..&h=..&t=..&labels=a|b */
import { getDesign, contextFor, type DesignId } from './index';
import { rasterize } from './raster';

const q = new URLSearchParams(location.search);
const id = (q.get('d') ?? 'tm-hisvaaduyos') as DesignId;
const ref = q.get('ref') ?? 'tm';
const sz = { w: Number(q.get('w') ?? 17.5), h: Number(q.get('h') ?? 24.5), t: Number(q.get('t') ?? 3.2) };
const labels = (q.get('labels') ?? '').split('|').filter(Boolean);
const H = Number(q.get('px') ?? 900);

(async () => {
  const d = getDesign(id);
  const ctx = contextFor(sz, labels);
  const out = document.getElementById('out')!;
  const row = document.createElement('div'); row.className = 'row'; out.appendChild(row);
  const add = (el: HTMLElement, cap: string) => { const f = document.createElement('figure'); f.appendChild(el); const c = document.createElement('figcaption'); c.textContent = cap; f.appendChild(c); row.appendChild(f); };
  const refImg = (n: string) => { const i = new Image(); i.src = `/_ref/${ref}-${n}.png`; i.style.height = `${H}px`; return i; };
  const noref = q.get('noref') === '1';
  if (!noref) add(refImg('cover'), 'reference blueprint — cover');
  add(await rasterize(d.cover(ctx), (H * ctx.W) / ctx.H, H), `recreated cover ${ctx.W}×${ctx.H} mm`);
  const sp = Math.max(60, (H * ctx.T) / ctx.H);
  if (!noref) add(refImg('spine'), 'reference — spine');
  add(await rasterize(d.spine(ctx), sp, H), `recreated spine ${ctx.T} mm`);
  if (noref) add(await rasterize(d.back(ctx), (H * ctx.W) / ctx.H, H), 'back cover');
  document.title = 'ready';
})().catch((e) => { document.body.append(String(e)); document.title = 'error'; console.error(e); });
