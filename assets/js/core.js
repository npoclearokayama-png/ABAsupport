import { STORAGE_KEY, WEEK_STORAGE_KEY, FORM_FIELDS } from './config.js';

export const state = {
  records: [],
  selectedId: null,
  weekMaps: {},
  activeTab: 'record',
  selectedWeekSlot: null,
};

export const $ = (id) => document.getElementById(id);

export function escapeHtml(str=''){
  return String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

export function makeCheckGroup(containerId, options, prefix){
  const wrap = $(containerId);
  wrap.innerHTML = '';
  options.forEach((opt, i) => {
    const id = `${prefix}_${i}`;
    const lab = document.createElement('label');
    lab.innerHTML = `<input type="checkbox" value="${escapeHtml(opt)}" id="${id}"> <span>${escapeHtml(opt)}</span>`;
    wrap.appendChild(lab);
  });
}

export function getChecked(containerId){
  return [...$(containerId).querySelectorAll('input[type="checkbox"]:checked')].map(x => x.value);
}

export function setChecked(containerId, values=[]){
  const set = new Set(values || []);
  [...$(containerId).querySelectorAll('input[type="checkbox"]')].forEach(cb => cb.checked = set.has(cb.value));
}

export function todayStr(d=new Date()){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}

export function currentTimeStr(){
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export function mondayOf(date){
  const d = new Date(date);
  const day = (d.getDay()+6)%7;
  d.setDate(d.getDate()-day);
  d.setHours(0,0,0,0);
  return d;
}

export function addDays(date, n){
  const d = new Date(date);
  d.setDate(d.getDate()+n);
  return d;
}

export function formatDateJP(d){ return `${d.getMonth()+1}/${d.getDate()}`; }
export function timeIndexToLabel(i){ const h=Math.floor(i/2); const m=i%2===0?'00':'30'; return `${String(h).padStart(2,'0')}:${m}`; }
export function parseDateTime(rec){ const ds=rec.recordDate||todayStr(); const ts=rec.recordTime||'00:00'; return new Date(`${ds}T${ts}:00`); }
export function includesAny(text, arr){ return arr.some(k => text.includes(k)); }

export function loadAll(){
  try { state.records = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { state.records = []; }
  try { state.weekMaps = JSON.parse(localStorage.getItem(WEEK_STORAGE_KEY) || '{}'); } catch { state.weekMaps = {}; }
}
export function saveRecords(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records)); }
export function saveWeekMaps(){ localStorage.setItem(WEEK_STORAGE_KEY, JSON.stringify(state.weekMaps)); }

export function collectForm(){
  return {
    id: $('recordId').value || crypto.randomUUID(),
    recordDate: $('recordDate').value || todayStr(),
    recordTime: $('recordTime').value || '',
    clientName: $('clientName').value.trim(),
    staffName: $('staffName').value.trim(),
    settingName: $('settingName').value,
    placeName: $('placeName').value.trim(),
    targetActivity: $('targetActivity').value.trim(),
    peoplePresent: $('peoplePresent').value.trim(),
    behaviorName: $('behaviorName').value.trim(),
    behaviorDef: $('behaviorDef').value.trim(),
    behaviorFrequency: $('behaviorFrequency').value.trim(),
    behaviorDuration: $('behaviorDuration').value.trim(),
    behaviorIntensity: $('behaviorIntensity').value,
    riskLevel: $('riskLevel').value,
    settingEvents: $('settingEvents').value.trim(),
    environmentNote: $('environmentNote').value.trim(),
    antecedentChecks: getChecked('antecedentChecks'),
    antecedentText: $('antecedentText').value.trim(),
    behaviorText: $('behaviorText').value.trim(),
    consequenceChecks: getChecked('consequenceChecks'),
    consequenceText: $('consequenceText').value.trim(),
    currentSupport: $('currentSupport').value.trim(),
    responseEffect: $('responseEffect').value.trim(),
    hypothesisMemo: $('hypothesisMemo').value.trim(),
    nextAction: $('nextAction').value.trim(),
    updatedAt: new Date().toISOString(),
  };
}

export function fillForm(rec, renderAnalysis, renderList, updateClientViews){
  FORM_FIELDS.forEach(id => { if ($(id)) $(id).value = rec[id] ?? ''; });
  setChecked('antecedentChecks', rec.antecedentChecks || []);
  setChecked('consequenceChecks', rec.consequenceChecks || []);
  state.selectedId = rec.id;
  $('recordId').value = rec.id;
  renderAnalysis(rec);
  renderList();
  updateClientViews(rec.clientName);
}

export function blankForm(renderAnalysis, renderList){
  FORM_FIELDS.forEach(id => { if ($(id)) $(id).value = ''; });
  $('recordDate').value = todayStr();
  $('recordTime').value = currentTimeStr();
  $('settingName').value = '学習';
  $('behaviorIntensity').value = '中等度';
  $('riskLevel').value = '低';
  setChecked('antecedentChecks', []);
  setChecked('consequenceChecks', []);
  state.selectedId = null;
  renderAnalysis(collectForm());
  renderList();
}

export function filteredRecords(){
  const q = $('searchInput').value.trim().toLowerCase();
  const fc = $('filterClient').value;
  const mode = $('sortSelect').value;
  let arr = [...state.records].filter(r => {
    const clientOk = !fc || r.clientName === fc;
    if (!clientOk) return false;
    if (!q) return true;
    const hay = [r.clientName,r.staffName,r.behaviorName,r.settingName,r.placeName,r.targetActivity,r.behaviorText,r.antecedentText,r.consequenceText,r.settingEvents].join(' ').toLowerCase();
    return hay.includes(q);
  });
  arr.sort((a,b) => {
    if (mode === 'asc') return parseDateTime(a) - parseDateTime(b);
    if (mode === 'client') return (a.clientName || '').localeCompare(b.clientName || '', 'ja');
    if (mode === 'behavior') return (a.behaviorName || '').localeCompare(b.behaviorName || '', 'ja');
    return parseDateTime(b) - parseDateTime(a);
  });
  return arr;
}

export function refreshClientSelectors(){
  const clients = [...new Set(state.records.map(r => (r.clientName || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
  ['filterClient','historyClientSelect','weekClientSelect'].forEach(id => {
    const select = $(id);
    const cur = select.value;
    const first = id === 'filterClient' ? '<option value="">すべて</option>' : '<option value="">利用者を選択</option>';
    select.innerHTML = first + clients.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (clients.includes(cur)) select.value = cur;
  });
}

export async function copyText(text){
  try { await navigator.clipboard.writeText(text); alert('コピーしました。'); }
  catch { alert('コピーできませんでした。手動でコピーしてください。'); }
}

export function exportJson(){
  const payload = { records: state.records, weekMaps: state.weekMaps };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aba_records_full_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJson(file, onAfterImport){
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      let recs = [];
      let weekMaps = {};
      if (Array.isArray(data)) recs = data;
      else {
        recs = Array.isArray(data.records) ? data.records : [];
        weekMaps = data.weekMaps && typeof data.weekMaps === 'object' ? data.weekMaps : {};
      }
      const merged = [...state.records];
      recs.forEach(rec => {
        if (!rec.id) rec.id = crypto.randomUUID();
        const idx = merged.findIndex(r => r.id === rec.id);
        if (idx >= 0) merged[idx] = rec; else merged.push(rec);
      });
      state.records = merged;
      state.weekMaps = { ...state.weekMaps, ...weekMaps };
      saveRecords(); saveWeekMaps();
      if (onAfterImport) onAfterImport();
      alert('読込が完了しました。');
    } catch {
      alert('JSONの読込に失敗しました。');
    }
  };
  reader.readAsText(file, 'utf-8');
}
