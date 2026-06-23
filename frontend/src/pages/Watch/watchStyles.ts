/** Faithful TypeScript port of _ui-logic/IPTV Play.dc.html:388-432
 *  (styles(), tileBox, tabStyle, pillStyle, rowThumb/sugThumb, setBp helpers).
 */

export type Breakpoint = 'mobile' | 'tabletP' | 'tabletL' | 'desktop';

export const breakpointOf = (w: number): Breakpoint =>
  w < 600 ? 'mobile' : w < 900 ? 'tabletP' : w < 1280 ? 'tabletL' : 'desktop';

/** .dc:428 — dark tile by default so light/white channel logos stay visible. */
export const tileBox = (size: number, radius: string): string =>
  `width:${size}px;height:${size}px;border-radius:${radius};background:#1f1f25;display:inline-flex;align-items:center;justify-content:center;flex:none;overflow:hidden;border:1px solid #34343c`;

/** .dc:429 */
export const tabStyle = (active: boolean): string =>
  `height:48px;border:none;border-radius:10px;font-family:inherit;font-weight:700;font-size:16px;cursor:pointer;${active ? 'background:#fff;color:#0d0d0c' : 'background:#1a1a1f;color:#fff'}`;

/** .dc:430 */
export const pillStyle = (active: boolean): string =>
  `height:40px;padding:0 16px;border:none;border-radius:9999px;font-family:inherit;font-weight:600;font-size:13px;cursor:pointer;${active ? 'background:var(--accent-strong);color:#fff' : 'background:#1d1d22;color:#b5b5ba'}`;

// Deterministic per-group accent from a generic palette (no hardcoded names):
// hash the group label to a palette index. Used when GROUP_COLORS has no entry.
const GROUP_PALETTE = ['#1d4ed8', '#b91c1c', '#0369a1', '#15803d', '#6d28d9', '#c2410c', '#0f766e', '#a21caf'];
const hashColor = (s: string): string => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return GROUP_PALETTE[h % GROUP_PALETTE.length];
};

/** .dc:431-432 – rowThumb and sugThumb are identical; merged here */
export const groupThumb = (group: string, colors: Record<string, string>): string => {
  const c = colors[group] || hashColor(group);
  return `position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;background:linear-gradient(135deg,${c}33,#15151a)`;
};

export interface StyleArgs {
  bp: Breakpoint;
  drawerOpen: boolean;
  settingsOpen: boolean;
  status: string;
}

/** .dc:388-427 – styles() method ported verbatim. */
export function makeStyles({ bp, drawerOpen, settingsOpen, status }: StyleArgs): Record<string, string> {
  const twoCol = bp === 'desktop' || bp === 'tabletL';
  const wide = twoCol;
  const mob = bp === 'mobile';
  const pad = mob ? 16 : bp === 'tabletP' ? 20 : bp === 'tabletL' ? 24 : 32;
  const ctrl = 44; // 44px minimum touch target (a11y) at every breakpoint
  const card = 'background:#141417;border:1px solid #23232a;border-radius:12px';

  // .dc:424 statusStyle – fixed muted color (load feedback moved to Toasts)
  const statusColor = '#9a9a9f';
  void status; // param kept for API compat

  return {
    // .dc:394
    page: `min-height:100vh;background:#0d0d0c;padding-bottom:${mob ? '28px' : '40px'}`,
    // .dc:395
    header: `display:flex;align-items:center;justify-content:space-between;gap:${mob ? 10 : 16}px;padding:0 ${pad}px;height:${mob ? 52 : bp === 'desktop' ? 64 : 56}px;background:#0d0d0c;position:sticky;top:0;z-index:40;border-bottom:1px solid #18181c;padding-top:env(safe-area-inset-top)`,
    // .dc:396
    hamb: `display:${wide ? 'none' : 'inline-flex'};align-items:center;justify-content:center;width:${ctrl}px;height:${ctrl}px;background:none;border:none;cursor:pointer;padding:0;flex:none`,
    // .dc:397
    nav: `display:${wide ? 'flex' : 'none'};align-items:center;gap:26px;margin-left:8px`,
    // .dc:398
    icon: `display:inline-flex;align-items:center;justify-content:center;width:${ctrl}px;height:${ctrl}px;background:none;border:none;cursor:pointer;padding:0;flex:none`,
    // .dc:404
    main:`display:${twoCol ? 'grid' : 'flex'};${twoCol ? `grid-template-columns:minmax(0,1fr) ${bp === 'desktop' ? 380 : 340}px;` : 'flex-direction:column;'}gap:${twoCol ? 24 : 16}px;padding:${mob ? 16 : pad}px ${pad}px 0;align-items:start`,
    // .dc:405
    leftCol: `display:flex;flex-direction:column;gap:14px;min-width:0;width:100%`,
    // .dc:407
    aside: `display:flex;flex-direction:column;gap:12px;min-width:0;width:100%;${twoCol ? 'position:sticky;top:84px' : ''}`,
    // .dc:408
    toggle: `display:grid;grid-template-columns:1fr 1fr;gap:10px`,
    // .dc:411
    epgCard: `${card};overflow:hidden`,
    // .dc:415
    epgList: `padding:4px 16px 14px;max-height:${twoCol ? 'var(--epg-max, calc(100vh - 320px))' : '560px'};overflow-y:auto`,
    // .dc:419
    scrim: `position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:50;opacity:${drawerOpen ? 1 : 0};pointer-events:${drawerOpen ? 'auto' : 'none'};transition:opacity .2s`,
    // .dc:420
    drawer: `position:fixed;top:0;bottom:0;left:0;width:${mob ? '86%' : '360px'};max-width:400px;background:#101013;border-right:1px solid #23232a;z-index:51;display:flex;flex-direction:column;transform:translateX(${drawerOpen ? '0' : '-105%'});transition:transform .25s`,
    // .dc:421
    modalScrim: `position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:60;opacity:${settingsOpen ? 1 : 0};pointer-events:${settingsOpen ? 'auto' : 'none'};transition:opacity .2s`,
    // .dc:422
    modal: `position:fixed;z-index:61;left:50%;${mob ? `bottom:0;top:auto;transform:translateX(-50%) translateY(${settingsOpen ? '0' : '105%'});width:100%;border-radius:18px 18px 0 0` : `top:50%;transform:translate(-50%,-50%) scale(${settingsOpen ? 1 : 0.96});width:480px;border-radius:16px;opacity:${settingsOpen ? 1 : 0}`};max-width:100%;background:#141417;border:1px solid #2a2a31;padding:20px;${settingsOpen ? 'pointer-events:auto' : 'pointer-events:none'};transition:transform .22s,opacity .22s;max-height:92vh;overflow-y:auto;padding-bottom:calc(20px + env(safe-area-inset-bottom))`,
    // .dc:423
    field: `width:100%;height:44px;padding:0 14px;background:#1c1c21;border:1px solid #2f2f37;border-radius:10px;color:#fff;font-family:inherit;font-size:14px;outline:none`,
    // .dc:424
    statusStyle: `margin-top:14px;font-size:13px;min-height:18px;color:${statusColor}`,
  };
}
