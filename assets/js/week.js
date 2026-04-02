import { $, state, addDays, todayStr, timeIndexToLabel, mondayOf, saveWeekMaps, collectForm } from './core.js';
import { WEEKDAY_LABELS } from './config.js';
import { analyzeCurrent, renderResults } from './analysis.js';

export function prefillRecordFromWeekSlot(slot, switchTab){
  if (!slot) { alert('週次表のセルを選択してください。'); return; }
  const start = $('weekStartDate').value;
  if (!start) return;
  const base = addDays(new Date(`${start}T00:00:00`), slot.day);
  $('recordDate').value = todayStr(base);
  $('recordTime').value = timeIndexToLabel(slot.time);
  $('clientName').value = $('weekClientSelect').value.trim();
  $('behaviorName').value = $('weekBehaviorName').value.trim();
  const levelText = ['なし','少し','中等度','多い','強い / 目立つ'][slot.level] || '';
  if (!$('behaviorText').value) $('behaviorText').value = `${$('weekBehaviorName').value.trim()} がみられた。週次表セルレベル: ${levelText}`;
  state.activeTab = 'record';
  switchTab('record');
  renderResults(analyzeCurrent());
  window.scrollTo({top:0, behavior:'smooth'});
  $('antecedentText')?.focus();
}

export function weekKey(client, behavior, weekStart){ return `${client}__${behavior}__${weekStart}`; }
export function getCurrentWeekKey(){
  const client = $('weekClientSelect').value.trim();
  const behavior = $('weekBehaviorName').value.trim();
  const weekStart = $('weekStartDate').value;
  return client && behavior && weekStart ? weekKey(client, behavior, weekStart) : '';
}
export function ensureWeekStartDefault(){ if (!$('weekStartDate').value) $('weekStartDate').value = todayStr(mondayOf(new Date())); }
export function currentWeekMatrix(){
  const key = getCurrentWeekKey();
  if (!key) return null;
  if (!state.weekMaps[key]) state.weekMaps[key] = Array.from({length:48}, ()=>Array.from({length:7}, ()=>0));
  return state.weekMaps[key];
}

export function saveWeek(){
  const key = getCurrentWeekKey();
  if (!key) { alert('利用者、対象行動、週の開始日を入力してください。'); return; }
  saveWeekMaps();
  updateWeekSummary();
  alert('週次表を保存しました。');
}

export function clearWeek(renderWeekGrid){
  const key = getCurrentWeekKey();
  if (!key) return;
  if (!confirm('この週次表をクリアします。')) return;
  state.weekMaps[key] = Array.from({length:48}, ()=>Array.from({length:7}, ()=>0));
  saveWeekMaps();
  renderWeekGrid();
}

export function renderWeekGrid(switchTab){
  ensureWeekStartDefault();
  const table = $('weekGridTable');
  const client = $('weekClientSelect').value.trim();
  const behavior = $('weekBehaviorName').value.trim();
  const start = $('weekStartDate').value;
  if (!client || !behavior || !start) {
    table.innerHTML = '<tr><td style="padding:16px">利用者・対象行動・週の開始日を入力すると週次表が表示されます。</td></tr>';
    updateWeekSummary();
    return;
  }
  const startDate = new Date(`${start}T00:00:00`);
  const headDays = Array.from({length:7}, (_,i)=>addDays(startDate,i));
  let html = '<thead><tr><th class="sticky">時刻</th>' + headDays.map(d => `<th>${d.getMonth()+1}/${d.getDate()}<br><span class="small">${WEEKDAY_LABELS[((d.getDay()+6)%7)]}</span></th>`).join('') + '</tr></thead><tbody>';
  const matrix = currentWeekMatrix();
  for (let t=0;t<48;t++){
    html += `<tr><td class="timecell">${timeIndexToLabel(t)}</td>`;
    for (let day=0;day<7;day++){
      const v = matrix[t][day] || 0;
      const selected = state.selectedWeekSlot && state.selectedWeekSlot.time===t && state.selectedWeekSlot.day===day ? ' outline:3px solid #0f172a; outline-offset:-3px;' : '';
      html += `<td><div class="slot level${v}" data-time="${t}" data-day="${day}" style="${selected}">${v===0?'':v}</div></td>`;
    }
    html += '</tr>';
  }
  html += '</tbody>';
  table.innerHTML = html;
  table.querySelectorAll('.slot').forEach(el => {
    el.addEventListener('click', (ev) => {
      const matrix = currentWeekMatrix();
      const t = Number(el.dataset.time), d = Number(el.dataset.day);
      state.selectedWeekSlot = { time:t, day:d, level: matrix[t][d] || 0 };
      if (ev.altKey) { prefillRecordFromWeekSlot(state.selectedWeekSlot, switchTab); return; }
      const mode = $('weekCellMode').value;
      matrix[t][d] = mode === 'binary' ? (matrix[t][d] ? 0 : 1) : ((matrix[t][d] + 1) % 5);
      state.selectedWeekSlot.level = matrix[t][d];
      saveWeekMaps();
      renderWeekGrid(switchTab);
    });
  });
  updateWeekSummary();
}

export function updateWeekSummary(){
  const key = getCurrentWeekKey();
  const totalEl = $('weekTotalSlots'), dayEl = $('weekPeakDay'), timeEl = $('weekPeakTime');
  if (!key || !state.weekMaps[key]) {
    totalEl.textContent = '0'; dayEl.textContent = '-'; timeEl.textContent = '-'; return;
  }
  const matrix = state.weekMaps[key];
  let total = 0;
  const dayTotals = Array.from({length:7}, ()=>0);
  const timeTotals = Array.from({length:48}, ()=>0);
  for (let t=0;t<48;t++){
    for (let d=0;d<7;d++){
      const v = matrix[t][d] || 0;
      if (v > 0) total += 1;
      dayTotals[d] += v;
      timeTotals[t] += v;
    }
  }
  totalEl.textContent = String(total);
  const dayIdx = dayTotals.every(v=>v===0) ? -1 : dayTotals.indexOf(Math.max(...dayTotals));
  const timeIdx = timeTotals.every(v=>v===0) ? -1 : timeTotals.indexOf(Math.max(...timeTotals));
  dayEl.textContent = dayIdx >= 0 ? WEEKDAY_LABELS[dayIdx] : '-';
  timeEl.textContent = timeIdx >= 0 ? timeIndexToLabel(timeIdx) : '-';
}

export function buildWeekSummaryText(){
  const client = $('weekClientSelect').value.trim();
  const behavior = $('weekBehaviorName').value.trim();
  const weekStart = $('weekStartDate').value;
  const key = getCurrentWeekKey();
  const matrix = state.weekMaps[key];
  if (!key || !matrix) return '週次表が未入力です。';
  const dayTotals = Array.from({length:7}, ()=>0);
  const timeTotals = Array.from({length:48}, ()=>0);
  let activeCount = 0;
  for (let t=0;t<48;t++) for (let d=0;d<7;d++) {
    const v = matrix[t][d] || 0;
    if (v>0) activeCount++;
    dayTotals[d] += v;
    timeTotals[t] += v;
  }
  const sortedDays = dayTotals.map((v,i)=>({name:WEEKDAY_LABELS[i], v})).sort((a,b)=>b.v-a.v);
  const sortedTimes = timeTotals.map((v,i)=>({name:timeIndexToLabel(i), v})).sort((a,b)=>b.v-a.v);
  return [
    `【週次30分表サマリー】`,
    `利用者: ${client}`,
    `対象行動: ${behavior}`,
    `週開始日: ${weekStart}`,
    `0以外の記録セル数: ${activeCount}`,
    `多い曜日: ${sortedDays.filter(x=>x.v>0).slice(0,3).map(x=>`${x.name}(${x.v})`).join('、') || '記録なし'}`,
    `目立つ時間帯: ${sortedTimes.filter(x=>x.v>0).slice(0,5).map(x=>`${x.name}(${x.v})`).join('、') || '記録なし'}`,
    '',
    `コメント: 週次表は発生の「時間帯傾向」を見るための俯瞰記録です。詳細な前後関係は個別のABC記録で補ってください。`
  ].join('\n');
}

export function linkRecordToWeekFields(){
  const rec = collectForm();
  if (rec.clientName && !$('weekClientSelect').value) $('weekClientSelect').value = rec.clientName;
  if (rec.behaviorName && !$('weekBehaviorName').value) $('weekBehaviorName').value = rec.behaviorName;
}
