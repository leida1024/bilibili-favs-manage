export const panelStyles = `
.bili-favs-manage-panel { --bf-ink:#203344; --bf-blue:#007fa8; --bf-line:#dae5ec; position:fixed; top:36px; left:36px; width:800px; height:640px; max-width:calc(100vw - 16px); max-height:calc(100dvh - 16px); min-width:280px; min-height:64px; z-index:99999; background:#fff; color:var(--bf-ink); border:1px solid var(--bf-line); border-radius:10px; box-shadow:0 12px 42px #20334424; font:14px/1.5 "Microsoft YaHei UI","PingFang SC","Noto Sans CJK SC",sans-serif; overflow:hidden; resize:both; display:flex; flex-direction:column; text-align:left; container-type:inline-size; }
.bili-favs-manage-panel * { box-sizing:border-box; }
.bili-favs-manage-panel [hidden] { display:none !important; }
.bili-favs-manage-panel h2 { color:var(--bf-ink); font-family:inherit; font-size:18px; line-height:1.4; font-weight:700; margin:0 0 6px; }
.bili-favs-manage-panel h3 { color:var(--bf-ink); font-size:15px; font-weight:600; margin:0 0 6px; }
.bili-favs-manage-panel p { margin:6px 0; overflow-wrap:anywhere; }
.bili-favs-manage-panel .bf-header { display:flex; align-items:center; gap:6px; padding:10px 16px; background:#fff; cursor:move; flex-shrink:0; }
.bili-favs-manage-panel .bf-header strong { flex:1; font-size:16px; letter-spacing:.03em; }
.bili-favs-manage-panel button,.bili-favs-manage-panel select { width:auto; min-height:34px; margin:0; padding:6px 12px; border:1px solid #b7c9d5; border-radius:5px; background:#fff; color:var(--bf-ink); cursor:pointer; font:inherit; line-height:1.4; }
.bili-favs-manage-panel button:hover:not(:disabled) { border-color:var(--bf-blue); background:#f2faff; }
.bili-favs-manage-panel button:disabled { opacity:.5; cursor:default; }
.bili-favs-manage-panel :focus-visible { outline:3px solid #178cb3; outline-offset:2px; }
.bili-favs-manage-panel .bf-header button { font-size:12px; min-height:30px; padding:5px 8px; border-color:transparent; }
.bili-favs-manage-panel .bf-header button:hover { background:#edf6fa; }
.bili-favs-manage-panel .bf-navigation { display:flex; gap:20px; padding:0 20px; border-bottom:1px solid var(--bf-line); flex-shrink:0; }
.bili-favs-manage-panel .bf-navigation button { border:0; border-bottom:3px solid transparent; border-radius:0; padding:10px 2px; background:none; color:#526879; }
.bili-favs-manage-panel .bf-navigation button[aria-pressed=true] { color:var(--bf-blue); font-weight:700; border-bottom-color:var(--bf-blue); }
.bili-favs-manage-panel .bf-content { overflow-y:auto; overflow-x:hidden; padding:18px 20px; min-height:0; flex:1; scrollbar-width:thin; scrollbar-color:#a1b6c3 transparent; }
.bili-favs-manage-panel .bf-muted { color:#526879; font-size:12px; }
.bili-favs-manage-panel .bf-intro { color:#40596c; max-width:70ch; margin-bottom:6px; }
.bili-favs-manage-panel .bf-help { font-size:12px; color:#526879; margin:6px 0 10px; max-width:75ch; }
.bili-favs-manage-panel summary { cursor:pointer; padding:4px 0; }
.bili-favs-manage-panel .bf-help summary { color:var(--bf-blue); }
.bili-favs-manage-panel .bf-copy-columns,.bili-favs-manage-panel .signal-panel { display:grid; grid-template-columns:40px minmax(0,1fr) 24px minmax(0,1fr); align-items:center; gap:8px; }
.bili-favs-manage-panel .bf-copy-columns { padding:7px 0; font-size:12px; color:#526879; border-bottom:1px solid #bbceda; }
.bili-favs-manage-panel .bf-copy-columns button { padding:5px 1px; min-height:28px; font-size:11px; border-color:transparent; color:var(--bf-blue); }
.bili-favs-manage-panel .fav-panel { margin:0; }
.bili-favs-manage-panel .signal-panel { padding:8px 0; border-bottom:1px solid var(--bf-line); }
.bili-favs-manage-panel .fav-panel>[data-selected=true] { background:#eaf7fc; }
.bili-favs-manage-panel .signal-panel label { overflow-wrap:anywhere; min-width:0; cursor:pointer; }
.bili-favs-manage-panel .bf-direction { text-align:center; color:#6d8999; }
.bili-favs-manage-panel input[type=text] { width:100%; min-width:0; min-height:36px; padding:7px 9px; border:1px solid #b7c9d5; border-radius:5px; background:#fff; color:var(--bf-ink); font:inherit; }
.bili-favs-manage-panel input[aria-invalid=true] { border-color:#aa4332; }
.bili-favs-manage-panel input[type=checkbox] { accent-color:var(--bf-blue); width:17px; height:17px; margin:2px 0; flex-shrink:0; cursor:pointer; }
.bili-favs-manage-panel .signal-panel input[type=checkbox] { justify-self:center; }
.bili-favs-manage-panel .bf-footer { border-top:1px solid var(--bf-line); background:#fff; padding:10px 20px; flex-shrink:0; }
.bili-favs-manage-panel .bf-action-bar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.bili-favs-manage-panel .bf-selection-count { flex:1; color:#526879; min-width:90px; font-size:13px; }
.bili-favs-manage-panel .bf-primary { background:var(--bf-blue); border-color:var(--bf-blue); color:white; font-weight:600; }
.bili-favs-manage-panel .bf-primary:hover:not(:disabled) { background:#006989; color:#fff; }
.bili-favs-manage-panel .bf-danger { background:#aa4332; border-color:#aa4332; color:white; }
.bili-favs-manage-panel .bf-status { padding:0 0 10px; margin-bottom:10px; border-bottom:1px solid var(--bf-line); font-size:12px; }
.bili-favs-manage-panel .bf-status strong { display:block; font-size:13px; }
.bili-favs-manage-panel .bf-status>span { color:#526879; }
.bili-favs-manage-panel .bf-status[data-status=failed] strong,.bili-favs-manage-panel .bf-status[data-status=interrupted] strong { color:#aa4332; }
.bili-favs-manage-panel .bf-status[data-status=completed] strong { color:#24734b; }
.bili-favs-manage-panel .bf-status-message { color:#8d382a; }
.bili-favs-manage-panel .bf-progress-detail { display:inline; margin-left:12px; }
.bili-favs-manage-panel .bf-progress-detail summary { display:inline; color:var(--bf-blue); }
.bili-favs-manage-panel .bf-progress-detail[open] { display:block; margin:0; }
.bili-favs-manage-panel .bf-progress-detail p { max-width:75ch; }
.bili-favs-manage-panel .bf-tools { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin:12px 0; }
.bili-favs-manage-panel .bf-tools select { min-width:0; max-width:100%; }
.bili-favs-manage-panel .bf-tools label { display:flex; align-items:center; gap:6px; }
.bili-favs-manage-panel .bf-empty { padding:28px 12px; text-align:center; color:#526879; line-height:1.8; }
.bili-favs-manage-panel .bf-folder-item { border-bottom:1px solid var(--bf-line); padding:10px 0; }
.bili-favs-manage-panel .bf-folder-row { display:flex; align-items:flex-start; gap:10px; overflow-wrap:anywhere; }
.bili-favs-manage-panel .bf-folder-text { min-width:0; flex:1; }
.bili-favs-manage-panel .bf-folder-text strong { display:block; font-weight:600; }
.bili-favs-manage-panel .bf-folder-text small { color:#526879; display:block; font-size:12px; margin-top:3px; }
.bili-favs-manage-panel .bf-object-details { margin-left:27px; font-size:12px; color:#526879; }
.bili-favs-manage-panel .bf-object-details summary { padding:3px 0 0; }
.bili-favs-manage-panel .bf-inventory-result:not(:empty) { margin-top:16px; padding:12px 0; border-top:1px solid var(--bf-line); }
.bili-favs-manage-panel .bf-mutation-review:not(:empty) { border-left:3px solid #aa4332; padding:12px; margin:16px 0; background:#fff6f3; }
.bili-favs-manage-panel .bf-show-logs { overflow:hidden; display:flex; flex-direction:column; }
.bili-favs-manage-panel .bf-diagnostics { display:flex; flex-direction:column; flex:1; min-height:0; }
.bili-favs-manage-panel .output-text-box { flex:1; min-height:0; white-space:pre-wrap; overflow-wrap:anywhere; overflow:auto; padding:12px; border:1px solid var(--bf-line); font-size:12px; line-height:1.8; scrollbar-width:thin; }
.bili-favs-manage-panel .bf-log-error { color:#aa4332; }
.bili-favs-manage-panel .bf-log-warn { color:#805500; }
.bili-favs-manage-panel .bf-log-debug { color:#526879; }
.bili-favs-manage-panel .bf-export { position:absolute; inset:0; background:#fff; z-index:2; padding:20px; display:flex; align-content:flex-start; flex-wrap:wrap; gap:10px; overflow:auto; }
.bili-favs-manage-panel .bf-export h3,.bili-favs-manage-panel .bf-export p { width:100%; }
.bili-favs-manage-panel textarea { display:block; width:100%; height:55%; min-height:140px; resize:vertical; padding:10px; margin:0; border:1px solid #b7c9d5; color:var(--bf-ink); background:#fff; font:12px/1.6 monospace; }
@container (max-width:500px) {
 .bili-favs-manage-panel .bf-header { padding:9px 12px; gap:1px; }
 .bili-favs-manage-panel .bf-header strong { font-size:15px; }
 .bili-favs-manage-panel .bf-navigation { padding:0 14px; gap:20px; }
 .bili-favs-manage-panel .bf-content { padding:14px; }
 .bili-favs-manage-panel .bf-footer { padding:10px 14px; }
 .bili-favs-manage-panel .bf-copy-columns,.bili-favs-manage-panel .signal-panel { grid-template-columns:28px minmax(0,1fr) 14px minmax(0,1fr); gap:5px; }
 .bili-favs-manage-panel .bf-copy-columns { font-size:11px; }
 .bili-favs-manage-panel input[type=text] { font-size:13px; padding:7px 5px; }
 .bili-favs-manage-panel .bf-action-bar button { padding:7px 9px; font-size:13px; }
}
@media(max-width:650px) { .bili-favs-manage-panel { top:8px; left:8px; } }
`;
