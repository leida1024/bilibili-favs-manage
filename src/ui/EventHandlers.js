import { CONFIG } from '../config/config.js';
/** Title dragging and thin, in-bounds resizing; one owner for both gestures. */
export class EventHandlers {
  static mouseDown(panel, e) {
    if (e.button !== 0 || e.target.closest('button,input,select,textarea,label,summary,a') || panel.exportReview) return;
    const d = this.getDirection(panel, e), r = panel.floatingPanel.getBoundingClientRect();
    if (d && !panel.minimized) {
      panel.resizeable = true; panel.direction = d;
      panel.resizeStart = { x:e.clientX, y:e.clientY, ...this.rectangle(r) };
    } else if (!d && e.target.closest('.bf-header')) {
      panel.dragStart = { x:e.clientX, y:e.clientY, ...this.rectangle(r) };
    } else return;
    e.preventDefault();
  }
  static rectangle(r) { return { left:r.left, top:r.top, width:r.width, height:r.height }; }
  static getDirection(panel, e) {
    const r = panel.floatingPanel.getBoundingClientRect(), x = e.clientX-r.left, y = e.clientY-r.top;
    if (x<0 || y<0 || x>r.width || y>r.height || panel.minimized) return '';
    if (e.target?.closest('.bf-resize-grip')) return 'se';
    const edge = CONFIG.PANEL.RESIZE_BORDER_SIZE;
    return (y<=edge?'n':y>=r.height-edge?'s':'')+(x<=edge?'w':x>=r.width-edge?'e':'');
  }
  static mouseMove(panel, e) {
    const d = this.getDirection(panel,e);
    panel.floatingPanel.style.cursor = d ? d+'-resize' : '';
    panel.header.style.cursor = d ? d+'-resize' : '';
    if (!panel.resizeable) return;
    const s=panel.resizeStart, dir=panel.direction, dx=e.clientX-s.x, dy=e.clientY-s.y;
    const w=Math.max(panel.minW,s.width+(dir.includes('w')?-dx:dir.includes('e')?dx:0));
    const h=Math.max(panel.minH,s.height+(dir.includes('n')?-dy:dir.includes('s')?dy:0));
    this.judgePanelSizeAndUpdate(panel,dir.includes('w')?s.left+s.width-w:s.left,dir.includes('n')?s.top+s.height-h:s.top,w,h);
  }
  static dragOnPanel(panel,e) {
    const s=panel.dragStart;
    if (!s || panel.resizeable) return;
    if (!panel.isDragging && Math.hypot(e.clientX-s.x,e.clientY-s.y)<3) return;
    panel.isDragging=true;
    this.judgePanelPosAndUpdate(panel,s.left+e.clientX-s.x,s.top+e.clientY-s.y);
  }
  static judgePanelSizeAndUpdate(panel,left,top,width,height) {
    Object.assign(panel.floatingPanel.style,{left:Math.max(0,left)+'px',top:Math.max(0,top)+'px',width:Math.max(panel.minW,width)+'px',height:Math.max(panel.minH,height)+'px'});
    panel.clampToViewport();
  }
  static judgePanelPosAndUpdate(panel,left,top) {
    Object.assign(panel.floatingPanel.style,{left:left+'px',top:top+'px'}); panel.clampToViewport();
  }
}
