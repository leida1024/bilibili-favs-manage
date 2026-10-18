export const panelStyles = `
.bili-favs-manage-panel { position:fixed; top:40px; left:40px; width:860px; height:680px; max-width:calc(100vw - 16px); max-height:calc(100vh - 16px); min-width:280px; min-height:64px; z-index:99999; background:#fff; color:#24364b; border:1px solid #d6dfe9; border-radius:14px; box-shadow:0 16px 60px #18314a30; font:14px/1.55 system-ui,"Microsoft YaHei",sans-serif; overflow:hidden; resize:both; display:flex; flex-direction:column; text-align:left; }
.bili-favs-manage-panel * { box-sizing:border-box; }
.bili-favs-manage-panel [hidden] { display:none !important; }
.bili-favs-manage-panel h3 { font-size:15px; font-weight:650; margin:0 0 8px; }
.bili-favs-manage-panel p { margin:6px 0; overflow-wrap:anywhere; }
.bili-favs-manage-panel .bf-header { display:flex; align-items:center; gap:8px; padding:12px 16px; background:#f5f9fc; border-bottom:1px solid #e2eaf1; cursor:move; flex-shrink:0; }
.bili-favs-manage-panel .bf-header strong { flex:1; font-size:17px; }
.bili-favs-manage-panel button,.bili-favs-manage-panel select { width:auto; min-height:34px; margin:0; padding:6px 12px; border:1px solid #cbd7e3; border-radius:7px; background:#fff; color:#24364b; cursor:pointer; font:inherit; }
.bili-favs-manage-panel button:disabled { opacity:.5; cursor:default; }
.bili-favs-manage-panel :focus-visible { outline:3px solid #289cce; outline-offset:2px; }
.bili-favs-manage-panel .bf-primary { background:#007eaa; color:white; border-color:#007eaa; margin-top:12px; }
.bili-favs-manage-panel .bf-content { overflow:auto; padding:16px; min-height:0; }
.bili-favs-manage-panel .bf-muted { color:#62758a; font-size:12px; }
.bili-favs-manage-panel .bf-workspace { display:grid; grid-template-columns:minmax(0,1.2fr) minmax(0,1fr); gap:20px; margin-top:14px; }
.bili-favs-manage-panel .fav-panel { max-height:245px; overflow:auto; margin-top:10px; }
.bili-favs-manage-panel .signal-panel { display:grid; grid-template-columns:20px minmax(0,1fr); gap:5px 8px; border:0; border-bottom:1px solid #e6edf4; padding:10px 0; }
.bili-favs-manage-panel .signal-panel label { overflow-wrap:anywhere; cursor:pointer; }
.bili-favs-manage-panel input[type=text] { grid-column:2; width:100%; min-width:0; padding:7px; border:1px solid #cbd7e3; border-radius:6px; background:white; color:#24364b; font:inherit; text-align:left; }
.bili-favs-manage-panel input[type=checkbox] { accent-color:#007eaa; width:16px; height:16px; margin-top:4px; }
.bili-favs-manage-panel .bf-selection { max-height:245px; overflow:auto; padding:10px; background:#f5f9fc; border-radius:8px; }
.bili-favs-manage-panel .bf-status { margin-top:18px; padding:12px; background:#edf7fc; border-left:3px solid #0089b9; border-radius:6px; }
.bili-favs-manage-panel .bf-status[data-status=failed] { background:#fff3ef; border-color:#bc4527; }
.bili-favs-manage-panel .bf-status[data-status=completed] { background:#eef8f1; border-color:#268552; }
.bili-favs-manage-panel .bf-diagnostics { margin-top:16px; border-top:1px solid #e2eaf1; padding-top:12px; }
.bili-favs-manage-panel summary { cursor:pointer; padding:4px 0; font-weight:600; }
.bili-favs-manage-panel .bf-tools { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin:10px 0; }
.bili-favs-manage-panel .bf-tools label { display:flex; align-items:center; gap:4px; }
.bili-favs-manage-panel .output-text-box { white-space:pre-wrap; overflow-wrap:anywhere; max-height:200px; overflow:auto; background:#f5f8fb; padding:10px; font:12px/1.7 ui-monospace,monospace; }
.bili-favs-manage-panel .bf-log-error { color:#ad361e; }
.bili-favs-manage-panel .bf-log-warn { color:#875900; }
.bili-favs-manage-panel .bf-log-debug { color:#666; }
.bili-favs-manage-panel .bf-export { margin-top:14px; padding:12px; border:1px solid #cbd7e3; border-radius:8px; }
.bili-favs-manage-panel textarea { display:block; width:100%; min-height:160px; margin:10px 0; font:12px/1.5 monospace; }
@media(max-width:650px) { .bili-favs-manage-panel { top:8px; left:8px; } .bili-favs-manage-panel .bf-workspace { grid-template-columns:minmax(0,1fr); gap:12px; } .bili-favs-manage-panel .fav-panel { max-height:200px; } }
`;
