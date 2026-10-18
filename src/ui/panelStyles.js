export const panelStyles = `
.bili-favs-manage-panel {
 --bf-font:system-ui,-apple-system,"Segoe UI","Microsoft YaHei UI","PingFang SC","Noto Sans CJK SC",sans-serif;
 --bf-text:14px; --bf-small:12px; --bf-title:16px;
 --bf-ink:#243544; --bf-muted:#526575; --bf-blue:#00789b; --bf-hover:#006581;
 --bf-line:#dce4eb; --bf-control:#8295a5; --bf-surface:#fff; --bf-soft:#f5f8fa; --bf-selected:#edf7fb;
 --bf-danger:#a8382b; --bf-danger-soft:#fff5f2; --bf-success:#236846; --bf-warning:#795200;
 box-sizing:border-box; position:fixed; top:36px; left:36px; width:680px; height:auto; max-width:calc(100vw - 16px); max-height:min(700px,calc(100dvh - 16px)); min-width:280px; min-height:64px;
 z-index:99999; background:var(--bf-surface); color:var(--bf-ink); border:1px solid var(--bf-line); border-radius:12px; box-shadow:0 12px 42px #20334424;
 font:400 var(--bf-text)/1.5 var(--bf-font); overflow:hidden; resize:both; display:flex; flex-direction:column; text-align:left; container-type:inline-size; isolation:isolate; color-scheme:light;
}
.bili-favs-manage-panel * { box-sizing:border-box; font-family:inherit; letter-spacing:normal; }
.bili-favs-manage-panel [hidden] { display:none !important; }
.bili-favs-manage-panel h2,.bili-favs-manage-panel h3 { color:var(--bf-ink); font:600 var(--bf-title)/1.5 var(--bf-font); margin:0 0 8px; }
.bili-favs-manage-panel strong { font-weight:600; }
.bili-favs-manage-panel p { margin:4px 0; overflow-wrap:anywhere; }
.bili-favs-manage-panel label { color:inherit; font:inherit; }
.bili-favs-manage-panel button,.bili-favs-manage-panel select,.bili-favs-manage-panel input,.bili-favs-manage-panel textarea { font:inherit; color:var(--bf-ink); }
.bili-favs-manage-panel button,.bili-favs-manage-panel select { width:auto; min-height:36px; margin:0; padding:7px 12px; border:1px solid var(--bf-control); border-radius:6px; background:var(--bf-surface); cursor:pointer; line-height:1.4; transition:background-color 140ms ease,border-color 140ms ease; }
.bili-favs-manage-panel button:hover:not(:disabled) { border-color:var(--bf-blue); background:var(--bf-selected); }
.bili-favs-manage-panel button:active:not(:disabled) { background:var(--bf-line); }
.bili-favs-manage-panel button:disabled { opacity:.5; cursor:default; }
.bili-favs-manage-panel :focus-visible { outline:3px solid var(--bf-blue); outline-offset:2px; }
.bili-favs-manage-panel .bf-header { display:flex; align-items:center; gap:4px; padding:10px 16px; background:var(--bf-soft); cursor:move; flex-shrink:0; }
.bili-favs-manage-panel .bf-header strong { flex:1; min-width:0; font-size:var(--bf-title); }
.bili-favs-manage-panel .bf-header button { font-size:var(--bf-small); min-height:32px; padding:6px 8px; border-color:transparent; background:transparent; }
.bili-favs-manage-panel .bf-header button[aria-expanded=true] { color:var(--bf-blue); background:var(--bf-selected); border-color:var(--bf-control); }
.bili-favs-manage-panel .bf-navigation { display:flex; gap:24px; padding:0 16px; border-bottom:1px solid var(--bf-line); flex-shrink:0; }
.bili-favs-manage-panel .bf-navigation button { border:0; border-bottom:3px solid transparent; border-radius:0; padding:10px 0 8px; background:none; color:var(--bf-muted); }
.bili-favs-manage-panel .bf-navigation button[aria-pressed=true] { color:var(--bf-blue); font-weight:600; border-bottom-color:var(--bf-blue); }
.bili-favs-manage-panel .bf-content { overflow-y:auto; overflow-x:hidden; padding:16px; min-height:80px; flex:0 1 auto; scrollbar-width:thin; scrollbar-color:var(--bf-control) transparent; scroll-padding:12px; }
.bili-favs-manage-panel .bf-muted,.bili-favs-manage-panel .bf-help { color:var(--bf-muted); font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-task-heading { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:0 12px; }
.bili-favs-manage-panel .bf-task-heading h2 { margin:0; }
.bili-favs-manage-panel .bf-task-heading p { margin:0; }
.bili-favs-manage-panel .bf-help { margin:4px 0 8px; }
.bili-favs-manage-panel .bf-copy-columns,.bili-favs-manage-panel .signal-panel { display:grid; grid-template-columns:40px minmax(0,1fr) 24px minmax(0,1fr); align-items:center; gap:8px; }
.bili-favs-manage-panel .bf-copy-columns { padding:4px 0; font-size:var(--bf-small); color:var(--bf-muted); border-bottom:1px solid var(--bf-control); }
.bili-favs-manage-panel .bf-copy-columns button { padding:6px 0; min-height:32px; font-size:var(--bf-small); border-color:transparent; color:var(--bf-blue); }
.bili-favs-manage-panel .fav-panel { margin:0; }
.bili-favs-manage-panel .signal-panel { padding:6px 0; border-bottom:1px solid var(--bf-line); }
.bili-favs-manage-panel .fav-panel>[data-selected=true] { background:var(--bf-selected); }
.bili-favs-manage-panel .signal-panel label { overflow-wrap:anywhere; min-width:0; cursor:pointer; }
.bili-favs-manage-panel .bf-direction { text-align:center; color:var(--bf-muted); }
.bili-favs-manage-panel input[type=text] { width:100%; min-width:0; min-height:36px; padding:6px 8px; border:1px solid var(--bf-control); border-radius:6px; background:var(--bf-surface); }
.bili-favs-manage-panel input[aria-invalid=true] { border-color:var(--bf-danger); }
.bili-favs-manage-panel input[type=checkbox] { accent-color:var(--bf-blue); width:17px; height:17px; margin:2px 0; flex-shrink:0; cursor:pointer; }
.bili-favs-manage-panel .signal-panel input[type=checkbox] { justify-self:center; }
.bili-favs-manage-panel .bf-footer { border-top:1px solid var(--bf-line); background:var(--bf-surface); padding:12px 16px; flex-shrink:0; max-height:45%; overflow:auto; }
.bili-favs-manage-panel .bf-action-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.bili-favs-manage-panel .bf-selection-count { flex:1; color:var(--bf-muted); min-width:90px; font-size:var(--bf-small); font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-primary { background:var(--bf-blue); border-color:var(--bf-blue); color:var(--bf-surface); font-weight:600; }
.bili-favs-manage-panel .bf-primary:hover:not(:disabled) { background:var(--bf-hover); color:var(--bf-surface); }
.bili-favs-manage-panel .bf-danger { background:var(--bf-danger); border-color:var(--bf-danger); color:var(--bf-surface); }
.bili-favs-manage-panel .bf-danger:hover:not(:disabled) { color:var(--bf-danger); border-color:var(--bf-danger); background:var(--bf-danger-soft); }
.bili-favs-manage-panel .bf-status { display:flex; align-items:center; flex-wrap:wrap; gap:2px 12px; padding:0 0 6px; margin-bottom:6px; border-bottom:1px solid var(--bf-line); font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-status>span { color:var(--bf-muted); font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-status[data-status=failed] strong,.bili-favs-manage-panel .bf-status[data-status=interrupted] strong { color:var(--bf-danger); }
.bili-favs-manage-panel .bf-status[data-status=completed] strong { color:var(--bf-success); }
.bili-favs-manage-panel .bf-progress-detail { width:100%; color:var(--bf-muted); }
.bili-favs-manage-panel .bf-progress-detail p { display:inline; margin:0; }
.bili-favs-manage-panel .bf-progress-detail p+p::before { content:' · '; }
.bili-favs-manage-panel .bf-tools { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin:12px 0; }
.bili-favs-manage-panel .bf-tools select { min-width:0; max-width:100%; }
.bili-favs-manage-panel .bf-tools label { display:flex; align-items:center; gap:8px; }
.bili-favs-manage-panel .bf-catalog-tools { background:var(--bf-soft); border:1px solid var(--bf-line); padding:8px; border-radius:6px; }
.bili-favs-manage-panel .bf-scope-label { flex:1; flex-wrap:wrap; font-size:var(--bf-small); color:var(--bf-muted); }
.bili-favs-manage-panel .bf-scope-label select { flex:1; font-size:var(--bf-text); }
.bili-favs-manage-panel .bf-empty { padding:24px 12px; text-align:center; color:var(--bf-muted); line-height:1.8; }
.bili-favs-manage-panel .bf-folder-item { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:4px 12px; border-bottom:1px solid var(--bf-line); padding:8px 0; }
.bili-favs-manage-panel .bf-folder-row { display:flex; align-items:flex-start; gap:8px; overflow-wrap:anywhere; min-width:0; }
.bili-favs-manage-panel .bf-folder-item>.bf-folder-row { display:grid; grid-template-columns:20px minmax(0,1fr) max-content; align-items:center; }
.bili-favs-manage-panel .bf-folder-name { min-width:0; overflow-wrap:anywhere; }
.bili-favs-manage-panel .bf-folder-count { font-size:var(--bf-small); color:var(--bf-muted); text-align:right; font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-folder-identity { font-size:var(--bf-small); color:var(--bf-muted); overflow-wrap:anywhere; }
.bili-favs-manage-panel .bf-folder-reason { grid-column:1/-1; margin-left:28px; font-size:var(--bf-small); color:var(--bf-warning); }
.bili-favs-manage-panel .bf-inventory-result:not(:empty) { margin-top:16px; padding:12px 0; border-top:1px solid var(--bf-line); }
.bili-favs-manage-panel .bf-mutation-review:not(:empty) { border-left:3px solid var(--bf-danger); padding:12px; margin:16px 0; background:var(--bf-danger-soft); }
.bili-favs-manage-panel .bf-diagnostics { border-top:1px solid var(--bf-line); background:var(--bf-soft); padding:8px 16px; display:flex; flex-direction:column; min-height:0; flex:0 0 auto; }
.bili-favs-manage-panel .bf-log-heading { display:flex; align-items:baseline; justify-content:space-between; gap:8px; flex-wrap:wrap; }
.bili-favs-manage-panel .bf-log-heading h2 { font-size:var(--bf-text); margin:0; }
.bili-favs-manage-panel .bf-record-tools { flex-shrink:0; }
.bili-favs-manage-panel .bf-diagnostics .bf-tools { margin:4px 0 8px; gap:4px 8px; font-size:var(--bf-small); }
.bili-favs-manage-panel .bf-diagnostics .bf-tools button,.bili-favs-manage-panel .bf-diagnostics .bf-tools select { font-size:var(--bf-small); min-height:32px; padding:6px 8px; }
.bili-favs-manage-panel .output-text-box { overflow:auto; min-height:48px; max-height:96px; border-top:1px solid var(--bf-line); font-size:var(--bf-small); line-height:1.5; scrollbar-width:thin; scroll-padding:8px; }
.bili-favs-manage-panel .bf-log-row { display:grid; grid-template-columns:58px 28px minmax(0,1fr); gap:8px; padding:6px 0; border-bottom:1px solid var(--bf-line); align-items:baseline; }
.bili-favs-manage-panel .bf-log-row time { color:var(--bf-muted); font-variant-numeric:tabular-nums; }
.bili-favs-manage-panel .bf-log-level { font-weight:600; }
.bili-favs-manage-panel .bf-log-message { white-space:pre-wrap; overflow-wrap:anywhere; min-width:0; }
.bili-favs-manage-panel .bf-log-error { color:var(--bf-danger); }
.bili-favs-manage-panel .bf-log-warn { color:var(--bf-warning); }
.bili-favs-manage-panel .bf-log-debug { color:var(--bf-muted); }
.bili-favs-manage-panel .bf-export { position:absolute; inset:0; background:var(--bf-surface); z-index:2; padding:20px; display:flex; align-content:flex-start; flex-wrap:wrap; gap:12px; overflow:auto; }
.bili-favs-manage-panel .bf-export h3,.bili-favs-manage-panel .bf-export p { width:100%; }
.bili-favs-manage-panel textarea { display:block; width:100%; height:55%; min-height:140px; resize:vertical; padding:12px; margin:0; border:1px solid var(--bf-control); background:var(--bf-surface); }
@container (max-width:500px) {
 .bili-favs-manage-panel .bf-folder-item { grid-template-columns:minmax(0,1fr); }
 .bili-favs-manage-panel .bf-folder-identity { margin-left:28px; }
 .bili-favs-manage-panel .bf-header { padding:8px; gap:0; }
 .bili-favs-manage-panel .bf-header button { padding:6px; }
 .bili-favs-manage-panel .bf-navigation { padding:0 12px; }
 .bili-favs-manage-panel .bf-content { padding:12px; }
 .bili-favs-manage-panel .bf-footer,.bili-favs-manage-panel .bf-diagnostics { padding:8px 12px; }
 .bili-favs-manage-panel .bf-copy-columns,.bili-favs-manage-panel .signal-panel { grid-template-columns:32px minmax(0,1fr) 12px minmax(0,1fr); gap:4px; }
 .bili-favs-manage-panel input[type=text] { padding:6px 4px; }
 .bili-favs-manage-panel .bf-log-row { grid-template-columns:54px 26px minmax(0,1fr); gap:4px; }
}
@media(max-width:650px) { .bili-favs-manage-panel { top:8px; left:8px; } }
@media(max-height:500px) {
 .bili-favs-manage-panel .bf-content { min-height:48px; }
 .bili-favs-manage-panel .bf-footer { max-height:22dvh; }
 .bili-favs-manage-panel .bf-diagnostics { max-height:36dvh; overflow:auto; }
 .bili-favs-manage-panel .output-text-box { min-height:32px; max-height:44px; }
}
@media(prefers-reduced-motion:reduce) {
 .bili-favs-manage-panel button,.bili-favs-manage-panel select { transition:none; }
 .bili-favs-manage-panel * { scroll-behavior:auto; }
}
`;
