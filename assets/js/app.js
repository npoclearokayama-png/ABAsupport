import { ANTECEDENT_OPTIONS, CONSEQUENCE_OPTIONS } from './config.js';
import {
  $, state, escapeHtml, makeCheckGroup, loadAll, saveRecords, saveClients, normalizeClient,
  collectForm, fillForm, blankForm, filteredRecords, refreshClientSelectors,
  exportJson, importJson, copyText, todayStr, currentTimeStr
} from './core.js';
import { analyzeRecord, analyzeCurrent, renderResults, renderAnalysis, buildPrompt } from './analysis.js';
import { populateBehaviorFilter, renderHistoryTab, renderMonthlyReport } from './history.js';
import { renderWeekGrid, saveWeek, clearWeek, buildWeekSummaryText, prefillRecordFromWeekSlot, ensureWeekStartDefault, linkRecordToWeekFields } from './week.js';

function upsertRecord(){
  const rec = collectForm();
  if (!rec.clientName && !rec.behaviorName) {
    alert('少なくとも「利用者名」と「問題行動名」のどちらかは入れてください。');
    return;
  }
  const idx = state.records.findIndex(r => r.id === rec.id);
  if (idx >= 0) state.records[idx] = rec;
  else state.records.push(rec);
  state.selectedId = rec.id;
  $('recordId').value = rec.id;
  saveRecords();
  renderList();
  renderAnalysis(rec);
  updateClientViews(rec.clientName);
}

function duplicateRecord(){
  const rec = collectForm();
  rec.id = crypto.randomUUID();
  rec.recordDate = todayStr();
  rec.recordTime = currentTimeStr();
  rec.updatedAt = new Date().toISOString();
  rec.behaviorName = rec.behaviorName ? `${rec.behaviorName}（複製）` : '複製記録';
  state.records.push(rec);
  saveRecords();
  fillForm(rec, renderAnalysis, renderList, updateClientViews);
}

function deleteRecord(){
  const id = $('recordId').value || state.selectedId;
  if (!id) return;
  if (!confirm('この記録を削除します。元に戻せません。')) return;
  state.records = state.records.filter(r => r.id !== id);
  saveRecords();
  blankForm(renderAnalysis, renderList);
  refreshClientSelectors();
  renderHistoryTab();
}

function renderList(){
  const list = $('recordList');
  const arr = filteredRecords();
  $('statCount').textContent = state.records.length;
  $('statClient').textContent = new Set(state.records.map(r => (r.clientName || '').trim()).filter(Boolean)).size;
  list.innerHTML = '';
  if (!arr.length) {
    list.innerHTML = '<div class="empty">該当する記録がありません。</div>';
    return;
  }
  arr.forEach(rec => {
    const analysis = analyzeRecord(rec);
    const top = analysis.ranked[0];
    const div = document.createElement('div');
    div.className = `record${state.selectedId === rec.id ? ' active':''}`;
    div.innerHTML = `
      <div class="record-head">
        <div>
          <div class="record-title">${escapeHtml(rec.clientName || '名称未入力')} / ${escapeHtml(rec.behaviorName || '行動名未入力')}</div>
          <div class="record-meta">${escapeHtml(rec.recordDate || '')} ${escapeHtml(rec.recordTime || '')} / ${escapeHtml(rec.settingName || '')} / ${escapeHtml(rec.staffName || '')}</div>
        </div>
        <div class="record-meta">${escapeHtml(rec.riskLevel || '')}</div>
      </div>
      <div class="chips">
        <span class="chip">${escapeHtml(top.name)} ${top.pct}%</span>
        ${rec.placeName ? `<span class="chip">${escapeHtml(rec.placeName)}</span>`:''}
        ${rec.targetActivity ? `<span class="chip">${escapeHtml(rec.targetActivity)}</span>`:''}
        <span class="chip ${rec.riskLevel === '高' ? 'danger' : rec.riskLevel === '中' ? 'warn' : ''}">安全:${escapeHtml(rec.riskLevel || '')}</span>
      </div>`;
    div.addEventListener('click', () => fillForm(rec, renderAnalysis, renderList, updateClientViews));
    list.appendChild(div);
  });
}

function switchTab(tab){
  state.activeTab = tab;
  document.querySelectorAll('.tabbar button').forEach(btn => btn.classList.toggle('active-tab', btn.dataset.tab === tab));
  document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));
  $(`tab-${tab}`).classList.add('active');
  if (tab === 'history') renderHistoryTab();
  if (tab === 'week') renderWeekGrid(switchTab);
  if (tab === 'clients') renderClientList();
}

function updateClientViews(preferredClient=''){
  refreshClientSelectors();
  if (preferredClient) {
    if ([...$('historyClientSelect').options].some(o => o.value === preferredClient)) $('historyClientSelect').value = preferredClient;
    if ([...$('weekClientSelect').options].some(o => o.value === preferredClient)) $('weekClientSelect').value = preferredClient;
  }
  populateBehaviorFilter();
  renderHistoryTab();
  renderWeekGrid(switchTab);
  renderClientList();
}

function collectClientForm(){
  return normalizeClient({
    id: $('clientId').value || crypto.randomUUID(),
    displayName: $('clientDisplayName').value.trim(),
    kana: $('clientKana').value.trim(),
    birthDate: $('clientBirthDate').value || '',
    supportLevel: $('clientSupportLevel').value.trim(),
    contactNote: $('clientContactNote').value.trim(),
    memo: $('clientMemo').value.trim(),
    updatedAt: new Date().toISOString(),
  });
}

function clearClientForm(){
  $('clientId').value = '';
  $('clientDisplayName').value = '';
  $('clientKana').value = '';
  $('clientBirthDate').value = '';
  $('clientSupportLevel').value = '';
  $('clientContactNote').value = '';
  $('clientMemo').value = '';
}

function fillClientForm(client){
  $('clientId').value = client.id;
  $('clientDisplayName').value = client.displayName;
  $('clientKana').value = client.kana || '';
  $('clientBirthDate').value = client.birthDate || '';
  $('clientSupportLevel').value = client.supportLevel || '';
  $('clientContactNote').value = client.contactNote || '';
  $('clientMemo').value = client.memo || '';
}

function upsertClient(){
  const client = collectClientForm();
  if (!client.displayName) {
    alert('利用者名を入力してください。');
    return;
  }
  const duplicate = state.clients.find(c => c.displayName === client.displayName && c.id !== client.id);
  if (duplicate) {
    alert('同名の利用者が既に登録されています。編集する場合は一覧から選択してください。');
    return;
  }
  const idx = state.clients.findIndex(c => c.id === client.id);
  if (idx >= 0) state.clients[idx] = client;
  else state.clients.push(client);
  state.clients.sort((a,b) => a.displayName.localeCompare(b.displayName, 'ja'));
  saveClients();
  refreshClientSelectors();
  $('clientName').value = client.displayName;
  $('weekClientSelect').value = client.displayName;
  renderClientList();
}

function deleteClient(){
  const id = $('clientId').value;
  if (!id) return;
  if (!confirm('この利用者情報を削除します。')) return;
  const removed = state.clients.find(c => c.id === id);
  state.clients = state.clients.filter(c => c.id !== id);
  saveClients();
  refreshClientSelectors();
  if (removed && $('clientName').value === removed.displayName) $('clientName').value = '';
  clearClientForm();
  renderClientList();
}

function renderClientList(){
  const wrap = $('clientList');
  if (!wrap) return;
  if (!state.clients.length) {
    wrap.innerHTML = '<div class="empty">利用者情報が未登録です。</div>';
    return;
  }
  wrap.innerHTML = state.clients.map(client => `
    <div class="record client-item" data-client-id="${escapeHtml(client.id)}">
      <div class="record-head">
        <div>
          <div class="record-title">${escapeHtml(client.displayName)}</div>
          <div class="record-meta">${escapeHtml(client.kana || 'ふりがな未登録')}</div>
        </div>
        <div class="record-meta">${escapeHtml(client.supportLevel || '')}</div>
      </div>
      <div class="small" style="margin-top:8px">${escapeHtml(client.contactNote || client.memo || 'メモ未登録')}</div>
    </div>
  `).join('');
  wrap.querySelectorAll('.client-item').forEach(el => {
    el.addEventListener('click', () => {
      const client = state.clients.find(c => c.id === el.dataset.clientId);
      if (client) fillClientForm(client);
    });
  });
}

function wireEvents(){
  $('newCaseBtn').addEventListener('click', () => blankForm(renderAnalysis, renderList));
  $('saveCaseBtn').addEventListener('click', upsertRecord);
  $('duplicateBtn').addEventListener('click', duplicateRecord);
  $('deleteBtn').addEventListener('click', deleteRecord);
  $('analyzeBtn').addEventListener('click', () => renderResults(analyzeCurrent()));
  $('copySummaryBtn').addEventListener('click', () => copyText($('summaryOutput').value));
  $('copyPromptBtn').addEventListener('click', () => copyText(buildPrompt()));
  $('printBtn').addEventListener('click', () => window.print());
  $('exportBtn').addEventListener('click', exportJson);
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', e => { if (e.target.files[0]) importJson(e.target.files[0], onDataChanged); e.target.value=''; });

  ['searchInput','filterClient','sortSelect'].forEach(id => $(id).addEventListener('input', renderList));
  ['filterClient','sortSelect'].forEach(id => $(id).addEventListener('change', renderList));
  document.querySelectorAll('.tabbar button').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  ['historyClientSelect','historyBehaviorFilter','historyRange'].forEach(id => $(id).addEventListener('change', renderHistoryTab));
  ['weekClientSelect','weekBehaviorName','weekStartDate','weekCellMode'].forEach(id => $(id).addEventListener('change', () => renderWeekGrid(switchTab)));
  $('saveWeekBtn').addEventListener('click', saveWeek);
  $('clearWeekBtn').addEventListener('click', () => clearWeek(() => renderWeekGrid(switchTab)));
  $('copyWeekSummaryBtn').addEventListener('click', () => copyText(buildWeekSummaryText()));
  $('openSlotToRecordBtn').addEventListener('click', () => prefillRecordFromWeekSlot(state.selectedWeekSlot, switchTab));
  $('generateMonthlyReportBtn').addEventListener('click', renderMonthlyReport);
  $('copyMonthlyReportBtn').addEventListener('click', () => copyText($('monthlyReportOutput').value));
  $('saveClientBtn').addEventListener('click', upsertClient);
  $('newClientBtn').addEventListener('click', clearClientForm);
  $('deleteClientBtn').addEventListener('click', deleteClient);

  document.querySelectorAll('input, textarea, select').forEach(el => {
    if (!['searchInput','filterClient','sortSelect','importFile','historyClientSelect','historyBehaviorFilter','historyRange','weekClientSelect','weekBehaviorName','weekStartDate','weekCellMode','clientId','clientDisplayName','clientKana','clientBirthDate','clientSupportLevel','clientContactNote','clientMemo'].includes(el.id)) {
      el.addEventListener('input', () => { renderResults(analyzeCurrent()); linkRecordToWeekFields(); });
      el.addEventListener('change', () => { renderResults(analyzeCurrent()); linkRecordToWeekFields(); });
    }
  });
}

function onDataChanged(){
  renderList();
  refreshClientSelectors();
  renderHistoryTab();
  renderWeekGrid(switchTab);
  renderClientList();
}

function init(){
  makeCheckGroup('antecedentChecks', ANTECEDENT_OPTIONS, 'a');
  makeCheckGroup('consequenceChecks', CONSEQUENCE_OPTIONS, 'c');
  loadAll();
  refreshClientSelectors();
  ensureWeekStartDefault();
  renderList();
  blankForm(renderAnalysis, renderList);
  renderHistoryTab();
  renderWeekGrid(switchTab);
  renderClientList();
  wireEvents();
}

init();
