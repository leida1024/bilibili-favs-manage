import { CONFIG } from '../config/config.js';

export const panelStyles = `
.bili-favs-manage-panel {
 --bf-font:system-ui,-apple-system,"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans CJK SC",sans-serif;
 --bf-text:14px; --bf-small:12px; --bf-title:15px;
 --bf-ink:#243544; --bf-muted:#526575; --bf-blue:#00789b; --bf-hover:#006581;
 --bf-line:#dce4eb; --bf-control:#8295a5; --bf-surface:#fff; --bf-soft:#f5f7f9; --bf-selected:#edf7fb;
 --bf-danger:#a8382b; --bf-danger-soft:#fff5f2; --bf-success:#236846; --bf-warning:#795200;
 box-sizing:border-box; position:fixed; top:24px; left:24px; width:${CONFIG.PANEL.INITIAL_WIDTH}px; height:${CONFIG.PANEL.INITIAL_HEIGHT}px;
 max-width:calc(100vw - 16px); max-height:calc(100dvh - 16px); min-width:280px; min-height:64px;
 z-index:99999; background:var(--bf-surface); color:var(--bf-ink); border:1px solid var(--bf-control); border-radius:6px;
 box-shadow:0 4px 20px #20334424; font:400 var(--bf-text)/1.5 var(--bf-font); overflow:hidden; resize:none;
 display:flex; flex-direction:column;
 text-align:left; container-type:inline-size; isolation:isolate; color-scheme:light;
}
.bili-favs-manage-panel .bf-body { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,var(--bf-record-width,272px)); grid-template-rows:minmax(0,1fr) auto; flex:1; min-height:0; }
.bili-favs-manage-panel[data-logs-open=false] .bf-body { grid-template-columns:minmax(0,1fr); }
.bili-favs-manage-panel[data-minimized=true] { display:block; resize:none; }
.bili-favs-manage-panel[data-minimized=true] .bf-body { display:none; }
.bili-favs-manage-panel .bf-resize-grip { position:absolute; right:0; bottom:0; width:14px; height:14px; z-index:3; cursor:se-resize; background:repeating-linear-gradient(135deg,transparent 0 3px,var(--bf-control) 3px 4px); clip-path:polygon(100% 0,100% 100%,0 100%); }
.bili-favs-manage-panel[data-minimized=true] .bf-resize-grip { display:none; }
.bili-favs-manage-panel * { box-sizing:border-box; font-family:inherit; letter-spacing:normal; }
.bili-favs-manage-panel [hidden] { display:none !important; }
.bili-favs-manage-panel h2,.bili-favs-manage-panel h3 { color:var(--bf-ink); font:600 var(--bf-title)/1.5 var(--bf-font); margin:0 0 8px; }
.bili-favs-manage-panel strong { font-weight:600; }
.bili-favs-manage-panel p { margin:4px 0; overflow-wrap:anywhere; }
.bili-favs-manage-panel label { color:inherit; font:inherit; }
.bili-favs-manage-panel button,.bili-favs-manage-panel select,.bili-favs-manage-panel input,.bili-favs-manage-panel textarea { font:inherit; color:var(--bf-ink); }
.bili-favs-manage-panel button,.bili-favs-manage-panel select { width:auto; min-height:30px; margin:0; padding:4px 8px; border:1px solid var(--bf-control); border-radius:4px; background:var(--bf-surface); cursor:pointer; line-height:1.4; transition:background-color 120ms ease,border-color 120ms ease; }
.bili-favs-manage-panel button:hover:not(:disabled) { border-color:var(--bf-blue); background:var(--bf-selected); }
.bili-favs-manage-panel button:active:not(:disabled) { background:var(--bf-line); }
.bili-favs-manage-panel button:disabled { opacity:.5; cursor:default; }
.bili-favs-manage-panel :focus-visible { outline:3px solid var(--bf-blue); outline-offset:1px; }
.bili-favs-manage-panel .bf-sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; border:0; }
.bili-favs-manage-panel .bf-header { display:flex; align-items:center; gap:2px; min-width:0; padding:6px; cursor:move; border-bottom:1px solid var(--bf-line); flex-shrink:0; }
.bili-favs-manage-panel .bf-header strong { min-width:0; font-size:var(--bf-title); }
.bili-favs-manage-panel .bf-version { margin-right:auto; font-size:var(--bf-small); color:var(--bf-muted); }
.bili-favs-manage-panel .bf-header button { font-size:var(--bf-small); min-height:28px; padding:4px; border-color:transparent; background:transparent; flex-shrink:0; }
.bili-favs-manage-panel .bf-header button[aria-expanded=true] { color:var(--bf-blue); background:var(--bf-selected); }
.bili-favs-manage-panel .bf-navigation { display:flex; gap:18px; padding:0 12px; border-bottom:1px solid var(--bf-line); flex-shrink:0; }
.bili-favs-manage-panel .bf-notice { display:flex; align-items:center; flex:1; min-width:0; gap:2px; margin:0 4px; }
.bili-favs-manage-panel .bf-notice-window { flex:1; min-width:0; overflow:hidden; }
.bili-favs-manage-panel .bf-notice button { min-height:24px; padding:2px 4px; font-size:var(--bf-small); border-color:transparent; background:transparent; }
.bili-favs-manage-panel .bf-notice-text { white-space:nowrap; animation:bf-notice-scroll 18s linear infinite; }
.bili-favs-manage-panel .bf-notice:hover .bf-notice-text,.bili-favs-manage-panel .bf-notice:focus-within .bf-notice-text,.bili-favs-manage-panel .bf-notice[data-paused=true] .bf-notice-text { animation-play-state:paused; }
.bili-favs-manage-panel .bf-notice:focus-within .bf-notice-text { transform:none; animation:none; white-space:normal; text-align:left; }
.bili-favs-manage-panel .bf-help-panel details { border-bottom:1px solid var(--bf-line); padding:8px 0; }
.bili-favs-manage-panel .bf-help-panel summary { cursor:pointer; font-weight:600; }
.bili-favs-manage-panel .bf-help-panel h3 { margin-top:12px; }
.bili-favs-manage-panel a { color:var(--bf-blue); text-decoration:underline; }
@keyframes bf-notice-scroll { 0%,20% { transform:translateX(0); } 75% { transform:translateX(-40%); } 100% { transform:translateX(0); } }
@container (max-width:420px) { .bili-favs-manage-panel .bf-notice { display:none; } .bili-favs-manage-panel .bf-navigation { gap:12px; padding:0 8px; } }
@media (prefers-reduced-motion:reduce) { .bili-favs-manage-panel .bf-notice .bf-notice-text { animation:none; white-space:normal; text-align:left; } }
.bili-favs-manage-panel .bf-navigation button { border:0; border-bottom:2px solid transparent; border-radius:0; padding:8px 0 6px; background:none; color:var(--bf-muted); }
.bili-favs-manage-panel .bf-navigation button[aria-pressed=true] { color:var(--bf-blue); font-weight:600; border-bottom-color:var(--bf-blue); }
.bili-favs-manage-panel .bf-content { grid-column:1; grid-row:1; overflow-y:auto; overflow-x:hidden; padding:8px 12px; min-height:0; scrollbar-width:thin; scrollbar-color:var(--bf-control) transparent; scroll-padding:8px; }
.bili-favs-manage-panel .bf-muted,.bili-favs-manage-panel .bf-help { color:var(--bf-muted); font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-task-heading p { margin:0; font-size:var(--bf-small); color:var(--bf-muted); }
.bili-favs-manage-panel .bf-task-heading { display:flex; align-items:baseline; flex-wrap:wrap; gap:0 8px; margin-bottom:6px; }
.bili-favs-manage-panel .bf-help { margin:2px 0 8px; }
.bili-favs-manage-panel .bf-selection-tools { display:flex; align-items:center; flex-wrap:wrap; gap:4px 8px; padding:0 0 6px; }
.bili-favs-manage-panel .bf-selection-tools[data-empty=true] { display:none; }
.bili-favs-manage-panel .bf-search { flex:1; min-width:100px; }
.bili-favs-manage-panel input[type=search] { display:block; width:100%; min-width:0; min-height:30px; padding:4px 6px; border:1px solid var(--bf-control); border-radius:4px; background:var(--bf-surface); }
.bili-favs-manage-panel input::placeholder { color:var(--bf-muted); opacity:1; }
.bili-favs-manage-panel .bf-selection-tools button { font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-selection-count { flex-basis:100%; color:var(--bf-muted); font-size:var(--bf-small); font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-filter-notice { flex-basis:100%; font-size:var(--bf-small); color:var(--bf-warning); }
.bili-favs-manage-panel .bf-copy-columns,.bili-favs-manage-panel .signal-panel { display:grid; grid-template-columns:20px minmax(0,1fr) 12px minmax(0,1fr); align-items:center; gap:6px; }
.bili-favs-manage-panel .bf-copy-columns { padding:4px 0; font-size:var(--bf-small); color:var(--bf-muted); border-bottom:1px solid var(--bf-control); }
.bili-favs-manage-panel .fav-panel { margin:0; }
.bili-favs-manage-panel .signal-panel { padding:2px 0; border-bottom:1px solid var(--bf-line); }
.bili-favs-manage-panel [data-selected=true] { background:var(--bf-selected); }
.bili-favs-manage-panel .signal-panel label { overflow-wrap:anywhere; min-width:0; cursor:pointer; }
.bili-favs-manage-panel .bf-direction { text-align:center; color:var(--bf-muted); }
.bili-favs-manage-panel input[type=text] { width:100%; min-width:0; min-height:30px; padding:4px 6px; border:1px solid var(--bf-control); border-radius:4px; background:var(--bf-surface); }
.bili-favs-manage-panel input[aria-invalid=true] { border-color:var(--bf-danger); }
.bili-favs-manage-panel input[type=checkbox] { accent-color:var(--bf-blue); width:17px; height:17px; margin:3px 0; flex-shrink:0; cursor:pointer; }
.bili-favs-manage-panel .signal-panel input[type=checkbox] { justify-self:center; }
.bili-favs-manage-panel .bf-footer { grid-column:1; grid-row:2; border-top:1px solid var(--bf-line); background:var(--bf-surface); padding:8px 12px; max-height:35dvh; overflow:auto; }
.bili-favs-manage-panel .bf-action-bar { display:flex; align-items:center; justify-content:flex-end; gap:8px; flex-wrap:wrap; }
.bili-favs-manage-panel .bf-primary { background:var(--bf-blue); border-color:var(--bf-blue); color:var(--bf-surface); font-weight:600; }
.bili-favs-manage-panel .bf-primary:hover:not(:disabled) { background:var(--bf-hover); color:var(--bf-surface); }
.bili-favs-manage-panel .bf-danger { background:var(--bf-danger); border-color:var(--bf-danger); color:var(--bf-surface); }
.bili-favs-manage-panel .bf-danger:hover:not(:disabled) { color:var(--bf-danger); border-color:var(--bf-danger); background:var(--bf-danger-soft); }
.bili-favs-manage-panel .bf-status { display:flex; align-items:center; flex-wrap:wrap; gap:2px 8px; padding:0 0 4px; margin-bottom:4px; font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-status>span { color:var(--bf-muted); font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-status[data-status=failed] strong,.bili-favs-manage-panel .bf-status[data-status=interrupted] strong { color:var(--bf-danger); }
.bili-favs-manage-panel .bf-status[data-status=completed] strong { color:var(--bf-success); }
.bili-favs-manage-panel .bf-status[data-status=unknown] strong { color:var(--bf-warning); }
.bili-favs-manage-panel .bf-progress-detail { width:100%; color:var(--bf-muted); }
.bili-favs-manage-panel .bf-progress-detail p { display:inline; margin:0; }
.bili-favs-manage-panel .bf-progress-detail p+p::before { content:' · '; }
.bili-favs-manage-panel .bf-tools { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin:8px 0; }
.bili-favs-manage-panel .bf-tools select { min-width:0; max-width:100%; }
.bili-favs-manage-panel .bf-tools label { display:flex; align-items:center; gap:4px; }
.bili-favs-manage-panel .bf-catalog-tools { margin:0 0 8px; }
.bili-favs-manage-panel .bf-scope-switch { display:flex; gap:0; flex:1; min-width:0; }
.bili-favs-manage-panel .bf-scope-switch button { flex:1; border-radius:0; font-size:var(--bf-small); padding:4px 6px; }
.bili-favs-manage-panel .bf-scope-switch button+button { margin-left:-1px; }
.bili-favs-manage-panel .bf-scope-switch button:first-child { border-radius:4px 0 0 4px; }
.bili-favs-manage-panel .bf-scope-switch button:last-child { border-radius:0 4px 4px 0; }
.bili-favs-manage-panel .bf-scope-switch button[aria-pressed=true] { background:var(--bf-selected); color:var(--bf-blue); border-color:var(--bf-blue); position:relative; font-weight:600; }
.bili-favs-manage-panel .bf-catalog-tools>button { font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-empty { padding:20px 8px; text-align:center; color:var(--bf-muted); line-height:1.8; }
.bili-favs-manage-panel .bf-folder-item { border-bottom:1px solid var(--bf-line); padding:3px 0; }
.bili-favs-manage-panel .bf-folder-row { display:flex; align-items:flex-start; gap:8px; overflow-wrap:anywhere; min-width:0; }
.bili-favs-manage-panel .bf-folder-item>.bf-folder-row { display:grid; grid-template-columns:20px minmax(0,1fr) max-content; align-items:center; cursor:pointer; min-height:24px; }
.bili-favs-manage-panel .bf-folder-name { min-width:0; overflow-wrap:anywhere; }
.bili-favs-manage-panel .bf-folder-count { font-size:var(--bf-small); color:var(--bf-muted); text-align:right; font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-folder-reason { display:block; margin-left:28px; font-size:var(--bf-small); color:var(--bf-warning); overflow-wrap:anywhere; }
.bili-favs-manage-panel .bf-inventory-result:not(:empty) { margin-top:12px; padding:8px 0; border-top:1px solid var(--bf-line); }
.bili-favs-manage-panel .bf-mutation-review:not(:empty) { border-left:3px solid var(--bf-danger); padding:8px; margin:12px 0; background:var(--bf-danger-soft); }
.bili-favs-manage-panel .bf-diagnostics { grid-column:2; grid-row:1/3; border-left:1px solid var(--bf-line); background:var(--bf-soft); padding:8px; display:flex; flex-direction:column; min-height:0; min-width:0; }
.bili-favs-manage-panel .bf-log-heading { display:flex; align-items:baseline; justify-content:space-between; gap:4px; flex-wrap:wrap; }
.bili-favs-manage-panel .bf-log-heading h2 { font-size:var(--bf-text); margin:0; }
.bili-favs-manage-panel .bf-diagnostics .bf-tools { margin:4px 0 6px; gap:4px 8px; font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-diagnostics button,.bili-favs-manage-panel .bf-diagnostics select { font-size:var(--bf-small); min-height:28px; padding:4px 6px; }
.bili-favs-manage-panel .bf-diagnostics label { gap:4px; }
.bili-favs-manage-panel .bf-log-filter select { appearance:auto; background-image:none; min-width:90px; flex:1; }
.bili-favs-manage-panel .bf-log-filter { flex:1; min-width:110px; }
.bili-favs-manage-panel .output-text-box { flex:1; overflow:auto; min-height:32px; border-top:1px solid var(--bf-line); font-size:var(--bf-small); line-height:1.5; scrollbar-width:thin; scroll-padding:8px; }
.bili-favs-manage-panel .bf-log-row { display:grid; grid-template-columns:54px 28px minmax(0,1fr); gap:0 6px; padding:5px 0; border-bottom:1px solid var(--bf-line); align-items:baseline; }
.bili-favs-manage-panel .bf-log-context { color:var(--bf-muted); font-size:var(--bf-small); text-align:right; overflow-wrap:anywhere; }
.bili-favs-manage-panel .bf-log-help { margin:4px 0; }
.bili-favs-manage-panel .bf-log-row time { color:var(--bf-muted); font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-log-level { font-weight:600; }
.bili-favs-manage-panel .bf-log-message { grid-column:1/-1; white-space:pre-wrap; overflow-wrap:anywhere; min-width:0; }
.bili-favs-manage-panel .bf-log-error { color:var(--bf-danger); }
.bili-favs-manage-panel .bf-log-warn { color:var(--bf-warning); }
.bili-favs-manage-panel .bf-log-debug { color:var(--bf-muted); }
.bili-favs-manage-panel .bf-log-actions { display:flex; gap:8px; padding-top:6px; }
.bili-favs-manage-panel .bf-export { position:absolute; inset:0; background:var(--bf-surface); z-index:2; padding:16px; display:flex; align-content:flex-start; flex-wrap:wrap; gap:12px; overflow:auto; }
.bili-favs-manage-panel .bf-export h3,.bili-favs-manage-panel .bf-export p { width:100%; }
.bili-favs-manage-panel textarea { display:block; width:100%; height:55%; min-height:140px; resize:vertical; padding:8px; margin:0; border:1px solid var(--bf-control); background:var(--bf-surface); }
.bili-favs-manage-panel .bf-settings { display:grid; gap:10px; }
.bili-favs-manage-panel .bf-setting-row { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; }
.bili-favs-manage-panel .bf-navigation button[data-settings=true] { margin-left:auto; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-body { grid-template-columns:minmax(0,1fr); grid-template-rows:minmax(0,1fr) auto auto; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-diagnostics { grid-column:1; grid-row:3; border-left:0; border-top:1px solid var(--bf-line); height:var(--bf-record-height,130px); }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-record-tools { display:block; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-heading .bf-muted { font-size:var(--bf-small); }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-diagnostics .bf-tools { margin:0; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-actions { padding:4px 0 0; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-row { grid-template-columns:54px 28px minmax(0,1fr); gap:4px; padding:4px 0; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-context { grid-column:1/-1; text-align:left; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-row:has(.bf-log-context) .bf-log-message { grid-column:1/-1; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-log-message { grid-column:auto; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-header { padding:6px; gap:2px; flex-wrap:wrap; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-header strong { font-size:14px; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-header button { padding:4px; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-version { font-size:12px; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-content { padding:8px; }
 .bili-favs-manage-panel[data-records-layout=bottom] .bf-footer { padding:6px 8px; }
 @media(max-height:500px) {
  .bili-favs-manage-panel[data-records-layout=bottom] .bf-diagnostics { height:var(--bf-record-height,130px); padding:4px 8px; }
  .bili-favs-manage-panel[data-records-layout=bottom] .bf-diagnostics button,.bili-favs-manage-panel[data-records-layout=bottom] .bf-diagnostics select { min-height:24px; padding:2px 6px; }
  .bili-favs-manage-panel[data-records-layout=bottom] .output-text-box { min-height:24px; }
 }
@media(max-width:595px) { .bili-favs-manage-panel { top:8px; left:8px; } }
@media(max-height:500px) {
 .bili-favs-manage-panel .bf-header { padding-top:4px; padding-bottom:4px; }
 .bili-favs-manage-panel .bf-navigation button { padding-top:4px; padding-bottom:4px; }
 .bili-favs-manage-panel .bf-footer { max-height:28dvh; }
 .bili-favs-manage-panel .bf-diagnostics { max-height:none; }
}
@media(prefers-reduced-motion:reduce) {
 .bili-favs-manage-panel button,.bili-favs-manage-panel select { transition:none; }
 .bili-favs-manage-panel * { scroll-behavior:auto; }
}
`;
