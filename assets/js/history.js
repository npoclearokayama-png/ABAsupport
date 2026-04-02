import { $, state, escapeHtml, parseDateTime, todayStr } from './core.js';
import { analyzeRecord, interventionBy } from './analysis.js';
import { drawBarChart, clearCanvas } from './charts.js';

export function populateBehaviorFilter(){
  const client = $('historyClientSelect').value;
  const behaviors = [...new Set(state.records.filter(r => !client || r.clientName === client).map(r => (r.behaviorName || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
  const cur = $('historyBehaviorFilter').value;
  $('historyBehaviorFilter').innerHTML = '<option value="">すべて</option>' + behaviors.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
  if (behaviors.includes(cur)) $('historyBehaviorFilter').value = cur;
}

export function getHistoryRecords(){
  const client = $('historyClientSelect').value;
  const behavior = $('historyBehaviorFilter').value;
  const days = Number($('historyRange').value || 30);
  if (!client) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate()-days);
  return state.records
    .filter(r => r.clientName === client && (!behavior || r.behaviorName === behavior) && (days === 9999 || parseDateTime(r) >= cutoff))
    .sort((a,b)=> parseDateTime(a)-parseDateTime(b));
}

export function monthLabelFromDate(dateStr=''){ return (dateStr || todayStr()).slice(0,7); }

export function deriveMonthlyReport(recs, client, behavior){
  const topBehaviorMap = {}, topFuncMap = {}, placeMap = {}, antecedentMap = {}, interventionMap = {};
  const hourMap = Array.from({length:24}, ()=>0);
  recs.forEach(r => {
    const behaviorName = (r.behaviorName || '未記載').trim();
    topBehaviorMap[behaviorName] = (topBehaviorMap[behaviorName] || 0) + 1;
    const func = analyzeRecord(r).ranked[0].name;
    topFuncMap[func] = (topFuncMap[func] || 0) + 1;
    const hh = Number(String(r.recordTime || '00:00').split(':')[0] || 0);
    if (hh >= 0 && hh < 24) hourMap[hh] += 1;
    const place = (r.placeName || '未記載').trim();
    placeMap[place] = (placeMap[place] || 0) + 1;
    (r.antecedentChecks || []).forEach(x => antecedentMap[x] = (antecedentMap[x] || 0) + 1);
    const ints = interventionBy(func, r).slice(0,2);
    ints.forEach(x => interventionMap[x] = (interventionMap[x] || 0) + 1);
  });
  const topBehavior = Object.entries(topBehaviorMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
  const topFunction = Object.entries(topFuncMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
  const topHour = hourMap.every(v=>v===0) ? '-' : `${String(hourMap.indexOf(Math.max(...hourMap))).padStart(2,'0')}:00台`;
  const topPlace = Object.entries(placeMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || '-';
  const topAnte = Object.entries(antecedentMap).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>`${x[0]}(${x[1]})`);
  const topInt = Object.entries(interventionMap).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
  return {
    totalCases: recs.length,
    topBehavior,
    topFunction,
    topHour,
    topPlace,
    report: [
      `【月次レポート】`,
      `利用者: ${client || ''}`,
      `対象行動: ${behavior || '全行動'}`,
      `対象期間: ${monthLabelFromDate(recs[0]?.recordDate || todayStr())}`,
      `記録件数: ${recs.length}`,
      ``,
      `1. 概況`,
      `- 最多行動: ${topBehavior}`,
      `- 主機能仮説: ${topFunction}`,
      `- 目立つ時間帯: ${topHour}`,
      `- 多い場所: ${topPlace}`,
      ``,
      `2. 先行事象で多かったもの`,
      ...(topAnte.length ? topAnte.map(x=>`- ${x}`) : ['- 記録不足']),
      ``,
      `3. 支援上の示唆`,
      ...(topInt.length ? topInt.map(x=>`- ${x}`) : ['- 情報不足のため個別記録の充実が必要']),
      ``,
      `4. 次月の重点`,
      `- ${topFunction} を第一仮説として、前兆・先行事象・結果事象の整合性を継続観察する。`,
      `- ${topHour !== '-' ? topHour + '前後' : '高頻度時間帯'}の予防的支援を先行配置する。`,
      `- 代替行動の教示と、問題行動では目的達成しにくい結果調整をチームで統一する。`
    ].join('\n')
  };
}

export function getMonthlyRecords(){
  const client = $('historyClientSelect').value;
  const behavior = $('historyBehaviorFilter').value;
  const days = Number($('historyRange').value || 30);
  const recs = getHistoryRecords();
  if (!client || !recs.length) return [];
  if (days === 9999) return recs;
  const latest = recs[recs.length-1]?.recordDate || todayStr();
  const month = latest.slice(0,7);
  return recs.filter(r => (r.recordDate || '').startsWith(month) && (!behavior || r.behaviorName === behavior));
}

export function renderMonthlyReport(){
  const recs = getMonthlyRecords();
  if (!recs.length){
    $('monthTotalCases').textContent = '0';
    $('monthTopBehavior').textContent = '-';
    $('monthTopFunction').textContent = '-';
    $('monthTopTime').textContent = '-';
    $('monthlyReportOutput').value = '利用者を選択し、記録がある状態で月次レポートを生成してください。';
    return;
  }
  const derived = deriveMonthlyReport(recs, $('historyClientSelect').value, $('historyBehaviorFilter').value);
  $('monthTotalCases').textContent = String(derived.totalCases);
  $('monthTopBehavior').textContent = derived.topBehavior;
  $('monthTopFunction').textContent = derived.topFunction;
  $('monthTopTime').textContent = derived.topHour;
  $('monthlyReportOutput').value = derived.report;
}

export function renderHistoryTab(){
  populateBehaviorFilter();
  const recs = getHistoryRecords();
  const client = $('historyClientSelect').value;
  const list = $('historyList');
  const summary = $('historySummary');
  if (!client) {
    summary.textContent = '利用者を選択すると、日別推移・時間帯別傾向・機能仮説分布を表示します。';
    list.innerHTML = '<div class="empty">利用者を選択してください。</div>';
    clearCanvas('dailyTrendChart'); clearCanvas('hourTrendChart'); clearCanvas('functionDistChart');
    renderMonthlyReport();
    return;
  }
  summary.innerHTML = `${escapeHtml(client)} / 該当記録 ${recs.length}件`;
  list.innerHTML = recs.length ? recs.slice().reverse().map(r => {
    const a = analyzeRecord(r);
    return `<div class="mini-row">
      <div><strong>${escapeHtml(r.recordDate || '')} ${escapeHtml(r.recordTime || '')}</strong> <span class="pill">${escapeHtml(r.behaviorName || '行動名未入力')}</span></div>
      <div class="small">${escapeHtml(r.settingName || '')}${r.placeName ? ' / ' + escapeHtml(r.placeName) : ''}${r.targetActivity ? ' / ' + escapeHtml(r.targetActivity) : ''}</div>
      <div class="small">主仮説: ${escapeHtml(a.ranked[0].name)} ${a.ranked[0].pct}%</div>
    </div>`;
  }).join('') : '<div class="empty">条件に合う記録がありません。</div>';

  const dailyMap = {};
  recs.forEach(r => { const k = r.recordDate || ''; dailyMap[k] = (dailyMap[k] || 0) + 1; });
  const dailyLabels = Object.keys(dailyMap).sort();
  const dailyValues = dailyLabels.map(k => dailyMap[k]);
  drawBarChart('dailyTrendChart', dailyLabels.map(x=>x.slice(5)), dailyValues, { yTitle:'件数' });

  const hourMap = Array.from({length:24}, ()=>0);
  recs.forEach(r => {
    const t = r.recordTime || '00:00';
    const h = Number(String(t).split(':')[0] || 0);
    if (h >= 0 && h < 24) hourMap[h] += 1;
  });
  drawBarChart('hourTrendChart', hourMap.map((_,i)=>String(i)), hourMap, { yTitle:'件数' });

  const funcMap = {'要求回避':0,'注目獲得':0,'物・活動の獲得':0,'感覚・自動強化':0};
  recs.forEach(r => { funcMap[analyzeRecord(r).ranked[0].name] += 1; });
  drawBarChart('functionDistChart', Object.keys(funcMap), Object.values(funcMap), { yTitle:'件数' });
  renderMonthlyReport();
}
