import { describe, it, expect } from 'vitest';
import { deriveState, reduce, initialController, P_MAX, tweenDuration, TRANSITIONS, type Controller } from '@/library3d/machine';
import { poseAt, SHELF_ROT_Y, COVER_OPEN_MAX, folioAngle, FOLIO_COUNT, distanceForHeight } from '@/library3d/pose';
import { layoutShelves, SHELF_INNER_WIDTH, homeCenter } from '@/library3d/layout';
import { physicalLibrary, shasVolumes } from '@/catalogue';

const stage = { home: { x: 3, y: 12, z: -6 }, dims: { W: 17, H: 24, T: 3 }, present: { x: 0, y: 10, z: 40 } };

describe('book pose', () => {
  it('p=0 is exactly the shelf position (book returns to its exact original place)', () => {
    const pose = poseAt(0, stage);
    expect(pose.position).toEqual(stage.home);
    expect(pose.rotY).toBe(SHELF_ROT_Y);
    expect(pose.cover).toBe(0);
    expect(pose.fan).toBe(0);
    expect(pose.dim).toBe(0);
  });
  it('slides out along z first without moving sideways (neighbours stay clear)', () => {
    const pose = poseAt(1, stage);
    expect(pose.position.x).toBeCloseTo(stage.home.x, 6);
    expect(pose.position.z).toBeGreaterThan(stage.home.z + stage.dims.W * 0.6);
  });
  it('p=2 faces the viewer at the presentation point; p=3 cover fully open; p=4 folios fanned', () => {
    const a = poseAt(2, stage);
    expect(a.position.x).toBeCloseTo(0, 6); expect(a.position.z).toBeCloseTo(40, 6); expect(a.rotY).toBeCloseTo(0, 6); expect(a.cover).toBeCloseTo(0, 6);
    const b = poseAt(3, stage);
    expect(b.cover).toBeCloseTo(COVER_OPEN_MAX, 6); expect(b.fan).toBe(0);
    const c = poseAt(4, stage);
    expect(c.fan).toBe(1); expect(c.cover).toBeCloseTo(COVER_OPEN_MAX, 6);
  });
  it('is monotonic in cover/fan and continuous (no popping) over the whole range', () => {
    let prev = poseAt(0, stage);
    for (let i = 1; i <= 400; i++) {
      const cur = poseAt((i / 400) * P_MAX, stage);
      expect(cur.cover).toBeGreaterThanOrEqual(prev.cover - 1e-9);
      expect(cur.fan).toBeGreaterThanOrEqual(prev.fan - 1e-9);
      expect(Math.abs(cur.position.x - prev.position.x)).toBeLessThan(1.2);
      expect(Math.abs(cur.position.y - prev.position.y)).toBeLessThan(1.2);
      expect(Math.abs(cur.position.z - prev.position.z)).toBeLessThan(1.6);
      expect(Math.abs(cur.rotY - prev.rotY)).toBeLessThan(0.08);
      prev = cur;
    }
  });
  it('folio fan angles are strictly ordered (no interpenetration) and zero when closed', () => {
    for (let i = 0; i < FOLIO_COUNT; i++) expect(folioAngle(i, 0)).toBe(0);
    for (let i = 1; i < FOLIO_COUNT; i++) expect(folioAngle(i - 1, 1)).toBeGreaterThan(folioAngle(i, 1));
  });
  it('distanceForHeight inverts the projection', () => {
    expect(distanceForHeight(24, 0.5, 32)).toBeGreaterThan(70);
  });
});

describe('state machine', () => {
  it('derives every named state from progress', () => {
    expect(deriveState(0, 'idle', false)).toBe('SHELF_IDLE');
    expect(deriveState(0, 'idle', true)).toBe('BOOK_SELECTED');
    expect(deriveState(0.5, 'opening', false)).toBe('BOOK_EXTRACTING');
    expect(deriveState(1.5, 'opening', false)).toBe('BOOK_PRESENTING');
    expect(deriveState(2.5, 'opening', false)).toBe('COVER_OPENING');
    expect(deriveState(3.5, 'opening', false)).toBe('FOLIOS_FANNING');
    expect(deriveState(4, 'idle', false)).toBe('LOG_ACTIVE');
    expect(deriveState(3.5, 'closing', false)).toBe('FOLIOS_CLOSING');
    expect(deriveState(1.5, 'closing', false)).toBe('BOOK_RETURNING');
  });
  it('open → settle → close returns to idle', () => {
    let c: Controller = initialController();
    let plan = reduce(c, { type: 'open', id: 'a' });
    expect(plan.tweenTo).toBe(P_MAX); c = plan.state;
    c = { ...c, p: P_MAX }; c = reduce(c, { type: 'settled' }).state;
    expect(deriveState(c.p, c.direction, false)).toBe('LOG_ACTIVE');
    plan = reduce(c, { type: 'close' }); expect(plan.tweenTo).toBe(0); c = plan.state;
    c = { ...c, p: 0 }; plan = reduce(c, { type: 'settled' }); c = plan.state;
    expect(c).toEqual({ activeId: null, wantId: null, p: 0, direction: 'idle' });
  });
  it('double tap on the same book never restarts or stalls', () => {
    let c = reduce(initialController(), { type: 'open', id: 'a' }).state;
    c = { ...c, p: 1.7 };
    const again = reduce(c, { type: 'open', id: 'a' });
    expect(again.tweenTo).toBe(P_MAX);
    expect(again.state.activeId).toBe('a');
  });
  it('close mid-animation reverses from the current progress (no snapping)', () => {
    let c = reduce(initialController(), { type: 'open', id: 'a' }).state;
    c = { ...c, p: 2.4 };
    const plan = reduce(c, { type: 'close' });
    expect(plan.tweenTo).toBe(0);
    expect(plan.fromCurrent).toBe(true);
    expect(deriveState(2.4, plan.state.direction, false)).toBe('FOLIOS_CLOSING');
  });
  it('opening another book while one is out returns the first, then opens the second', () => {
    let c = reduce(initialController(), { type: 'open', id: 'a' }).state;
    c = { ...c, p: P_MAX };
    const sw = reduce(c, { type: 'open', id: 'b' });
    expect(sw.tweenTo).toBe(0);
    expect(sw.state.wantId).toBe('b');
    const settled = reduce({ ...sw.state, p: 0 }, { type: 'settled' });
    expect(settled.state.activeId).toBe('b');
    expect(settled.tweenTo).toBe(P_MAX);
  });
  it('rapid sequence a → b → a → close converges to idle', () => {
    let c = initialController();
    c = reduce(c, { type: 'open', id: 'a' }).state; c = { ...c, p: 1 };
    c = reduce(c, { type: 'open', id: 'b' }).state;
    c = reduce(c, { type: 'open', id: 'a' }).state;
    expect(c.wantId).toBe('a');
    c = reduce(c, { type: 'close' }).state;
    expect(c.wantId).toBeNull();
    c = { ...c, p: 0 }; c = reduce(c, { type: 'settled' }).state;
    expect(c.activeId).toBeNull();
  });
  it('every state has an exit; reduced motion has zero duration', () => {
    for (const [k, v] of Object.entries(TRANSITIONS)) expect(v.length, k).toBeGreaterThan(0);
    expect(tweenDuration(4, 'off')).toBe(0);
    expect(tweenDuration(4, 'full')).toBeGreaterThan(tweenDuration(4, 'short'));
  });
});

describe('shelf layout', () => {
  const vols = [...physicalLibrary.volumes, ...shasVolumes()];
  const layout = layoutShelves(vols, physicalLibrary.collections);
  it('places every physical volume exactly once', () => {
    expect(layout.placed.length).toBe(vols.length);
    expect(new Set(layout.placed.map((p) => p.vol.id)).size).toBe(vols.length);
  });
  it('no overlaps and nothing outside the shelf width', () => {
    for (let r = 0; r < layout.rows; r++) {
      const row = layout.placed.filter((p) => p.row === r).sort((a, b) => b.x - a.x);
      for (let i = 0; i < row.length; i++) {
        expect(row[i].x + row[i].T / 2).toBeLessThanOrEqual(SHELF_INNER_WIDTH / 2 + 1e-6);
        expect(row[i].x - row[i].T / 2).toBeGreaterThanOrEqual(-SHELF_INNER_WIDTH / 2 - 1e-6);
        if (i > 0) expect(row[i - 1].x - row[i - 1].T / 2).toBeGreaterThanOrEqual(row[i].x + row[i].T / 2 - 1e-6);
      }
    }
  });
  it('Hebrew sets run right → left: Toras Menachem vol. 1 is right of vol. 2', () => {
    const a = layout.byId.get('pv-tm-5710-01')!, b = layout.byId.get('pv-tm-5711-02')!;
    expect(a.row).toBe(b.row); expect(a.x).toBeGreaterThan(b.x);
  });
  it('same-series volumes share dimensions and binding (look like a set)', () => {
    const ls = layout.placed.filter((p) => p.vol.collectionId === 'likkutei-sichos');
    expect(ls.length).toBe(5);
    expect(new Set(ls.map((p) => p.vol.colors.binding)).size).toBe(1);
  });
  it('homeCenter stands the book on the board with the spine plane fixed', () => {
    const p = layout.placed[0];
    const c = homeCenter(p, 0);
    expect(c.y - p.H / 2).toBeCloseTo(-p.row * 33 + 1, 6);
  });
});
