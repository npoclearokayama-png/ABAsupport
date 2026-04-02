import { $ } from './core.js';

export function clearCanvas(id){
  const c = $(id);
  if (!c) return;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px sans-serif';
  ctx.fillText('データなし', 20, 30);
}

export function drawBarChart(id, labels, values, opts={}){
  const c = $(id);
  if (!c) return;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const w = c.width, h = c.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0,w,h);
  if (!labels.length || !values.some(v=>v>0)) {
    ctx.fillStyle = '#94a3b8'; ctx.font = '14px sans-serif'; ctx.fillText('データなし', 20, 30); return;
  }
  const left = 42, right = 14, top = 14, bottom = 34;
  const plotW = w-left-right, plotH = h-top-bottom;
  const max = Math.max(...values, 1);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (let i=0;i<=4;i++){
    const y = top + plotH * i/4;
    ctx.beginPath(); ctx.moveTo(left,y); ctx.lineTo(left+plotW,y); ctx.stroke();
  }
  const barGap = 6;
  const barW = Math.max(4, (plotW - barGap*(labels.length+1)) / labels.length);
  values.forEach((v, i) => {
    const x = left + barGap + i*(barW+barGap);
    const bh = (v/max)*plotH;
    const y = top + plotH - bh;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x, y, barW, bh);
  });
  ctx.fillStyle = '#64748b'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
  labels.forEach((lab, i) => {
    const x = left + barGap + i*(barW+barGap) + barW/2;
    if (labels.length <= 14 || i % Math.ceil(labels.length/14) === 0) ctx.fillText(lab, x, h-14);
  });
  ctx.textAlign = 'right';
  for (let i=0;i<=4;i++){
    const val = Math.round(max * (4-i)/4);
    const y = top + plotH * i/4 + 4;
    ctx.fillText(String(val), left-6, y);
  }
  if (opts.yTitle) {
    ctx.save();
    ctx.translate(14, h/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText(opts.yTitle, 0, 0);
    ctx.restore();
  }
}
