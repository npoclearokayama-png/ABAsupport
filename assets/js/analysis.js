import { $, escapeHtml, collectForm, includesAny, state, todayStr } from './core.js';

export function analyzeRecord(rec){
  const textA = [...(rec.antecedentChecks || []), rec.antecedentText || '', rec.settingEvents || '', rec.environmentNote || '', rec.targetActivity || '', rec.placeName || '', rec.peoplePresent || ''].join(' / ');
  const textB = [rec.behaviorName || '', rec.behaviorDef || '', rec.behaviorText || '' ].join(' / ');
  const textC = [...(rec.consequenceChecks || []), rec.consequenceText || '', rec.responseEffect || '' ].join(' / ');
  const scores = {'要求回避':0,'注目獲得':0,'物・活動の獲得':0,'感覚・自動強化':0};
  const basis = [];
  if (includesAny(textA, ['課題','難しい','指示','終了','切替','待機','拒否された','取り上げられた','学習','片付け'])) { scores['要求回避'] += 3; basis.push('課題・切替・制限の直後に起きやすい情報があります。'); }
  if (includesAny(textC, ['課題が中断','要求が下がった','離れた','別室','嫌な刺激から離れた'])) { scores['要求回避'] += 4; basis.push('行動後に課題や不快刺激から離れられている可能性があります。'); }
  if (includesAny(textA, ['注目が他者へ向いた'])) { scores['注目獲得'] += 3; basis.push('大人や他者の注意が外れた直後の情報があります。'); }
  if (includesAny(textC, ['大人が近づいた','長く話しかけられた','注目を受けた'])) { scores['注目獲得'] += 4; basis.push('行動後に関わりや注目が増えています。'); }
  if (includesAny(textA, ['取り上げられた','拒否された','好きな活動の中断'])) { scores['物・活動の獲得'] += 3; basis.push('欲しい物や好み活動へのアクセス制限が示唆されます。'); }
  if (includesAny(textC, ['欲しい物が得られた','周囲が譲歩した'])) { scores['物・活動の獲得'] += 4; basis.push('行動後に物や活動が得られています。'); }
  if (includesAny(textA, ['一人でいた','騒音','刺激が多い','疲労','空腹','眠気','体調'])) { scores['感覚・自動強化'] += 2; basis.push('環境刺激や身体状態の影響が考えられます。'); }
  if (includesAny(textC, ['感覚刺激が得られた','特に変化なし','一人になれた'])) { scores['感覚・自動強化'] += 4; basis.push('周囲の反応に依存せず維持されている可能性があります。'); }
  if (includesAny(textB, ['反復','揺れる','叩き続ける','独語','感覚'])) { scores['感覚・自動強化'] += 2; }
  if (!textA.trim() && !textC.trim()) {
    Object.keys(scores).forEach(k => scores[k] += 1);
    basis.push('情報が少ないため仮説精度は低めです。ABCの追加観察が必要です。');
  }
  const total = Object.values(scores).reduce((a,b)=>a+b,0) || 1;
  const ranked = Object.entries(scores).map(([name, score]) => ({ name, score, pct: Math.round(score / total * 100) })).sort((a,b)=> b.score - a.score);
  const top = ranked[0].name;
  const interventions = interventionBy(top, rec);
  const observes = observeBy(top, rec);
  const summary = buildSummary(rec, ranked, interventions, observes, basis);
  return { ranked, basis, interventions, observes, summary };
}

export function interventionBy(top, rec){
  const common = ['対象行動の定義をチーム内でそろえる。','頻度・持続時間・強度を同じ基準で記録する。','安全確保を最優先し、危険度が高い場合は即時の環境調整を行う。'];
  const map = {
    '要求回避': ['課題量や難度を調整し、成功しやすい単位に分ける。','見通し提示、選択肢提示、先に終わりを示す支援を行う。','「休憩したい」「手伝って」などの代替要求を教え、出たら即強化する。','問題行動で課題全体が消える設計を避けつつ、適切な要求では短い逃避を認める。'],
    '注目獲得': ['問題行動前から短く高頻度の肯定的注目を入れる。','適切な呼びかけ・近づき方・援助要請を教えて強化する。','問題行動には過度な言語的注目を避け、落ち着いた行動を即時に拾う。','注目の得られ方を、問題行動から適切行動へ置き換える。'],
    '物・活動の獲得': ['要求手段を明確に教える。絵カード・言語・ジェスチャーなどを使う。','好み活動の終了前に予告し、代替案や再獲得条件を示す。','問題行動で物が出る流れを減らし、適切要求ではすぐアクセスさせる。','待機の練習は短時間から始め、成功経験を重ねる。'],
    '感覚・自動強化': ['環境刺激の調整と身体状態の確認を優先する。','競合する感覚活動や代替行動を用意する。','行動が起こりにくい時間帯・場所・刺激条件を特定する。','医学的要因、睡眠、痛み、てんかん等の確認が必要なら専門機関につなぐ。']
  };
  const extra = rec.riskLevel === '高'
    ? ['自傷・他害・破壊の危険が高いため、人的配置・物理的環境・緊急時手順を再確認する。']
    : rec.riskLevel === '中' ? ['危険化しやすい前兆を定義し、早めに介入する。'] : [];
  return [...common, ...(map[top] || []), ...extra];
}

export function observeBy(top, rec){
  const common = ['行動の直前30秒〜数分で何が起きていたか。','行動後に本人が得たもの・避けたものは何か。','誰がいるとき / いないときに増えるか。'];
  const map = {
    '要求回避': ['難度、量、提示の仕方で頻度が変わるか。','援助要求や休憩要求が可能なら行動が減るか。'],
    '注目獲得': ['大人の注目が外れた直後に増えるか。','先に関わりを入れると減るか。'],
    '物・活動の獲得': ['好きな物の中断、待機、拒否で増えるか。','適切要求を教えると置き換わるか。'],
    '感覚・自動強化': ['一人のときにも同様に起こるか。','刺激量、体調、痛み、疲労で上下するか。']
  };
  if (rec.riskLevel === '高') common.push('前兆行動とエスカレーションの段階を分けて記録する。');
  return [...common, ...(map[top] || [])];
}

export function buildSummary(rec, ranked, interventions, observes, basis){
  return [
    '【基本情報】',
    `記録日: ${rec.recordDate || ''} ${rec.recordTime || ''}`,
    `利用者: ${rec.clientName || ''}`,
    `記録者: ${rec.staffName || ''}`,
    `場面: ${rec.settingName || ''}`,
    `場所: ${rec.placeName || ''} / 活動: ${rec.targetActivity || ''} / 同席者: ${rec.peoplePresent || ''}`,
    '',
    '【対象行動】',
    `行動名: ${rec.behaviorName || ''}`,
    `操作的定義: ${rec.behaviorDef || ''}`,
    `頻度: ${rec.behaviorFrequency || ''} / 持続時間: ${rec.behaviorDuration || ''} / 強度: ${rec.behaviorIntensity || ''} / 安全面: ${rec.riskLevel || ''}`,
    '',
    '【背景条件】',
    rec.settingEvents || '記載なし',
    `環境要因: ${rec.environmentNote || '記載なし'}`,
    '',
    '【ABC】',
    `A(先行事象): ${(rec.antecedentChecks || []).join('、')}${rec.antecedentText ? ' / ' + rec.antecedentText : ''}`,
    `B(行動): ${rec.behaviorText || rec.behaviorName || '記載なし'}`,
    `C(結果事象): ${(rec.consequenceChecks || []).join('、')}${rec.consequenceText ? ' / ' + rec.consequenceText : ''}`,
    '',
    '【機能仮説】',
    ...ranked.map((r,i)=> `${i+1}. ${r.name}（${r.pct}%）`),
    '',
    '【仮説の根拠】',
    ...(basis.length ? basis.map(x => `- ${x}`) : ['- 情報不足のため追加観察が必要']),
    '',
    '【その場の対応】',
    rec.currentSupport || '記載なし',
    '【対応結果】',
    rec.responseEffect || '記載なし',
    '',
    '【推奨される初期介入】',
    ...interventions.map(x => `- ${x}`),
    '',
    '【追加で観察したい点】',
    ...observes.map(x => `- ${x}`),
    '',
    '【見立てメモ】',
    rec.hypothesisMemo || '記載なし',
    '【次回修正案】',
    rec.nextAction || '記載なし'
  ].join('\n');
}

export function renderResults(analysis){
  $('rankWrap').innerHTML = analysis.ranked.map((r, i) => `
    <div class="rank-item">
      <div class="rank-top"><div class="rank-name">${i+1}. ${escapeHtml(r.name)}</div><div class="muted">${r.pct}%</div></div>
      <div class="progress"><div class="bar" style="width:${Math.max(6,r.pct)}%"></div></div>
    </div>`).join('');
  $('basisWrap').innerHTML = analysis.basis.length ? analysis.basis.map(x => `・${escapeHtml(x)}`).join('<br>') : '根拠情報が不足しています。';
  $('interventionWrap').innerHTML = `<ul>${analysis.interventions.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
  $('observeWrap').innerHTML = `<ul>${analysis.observes.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
  $('summaryOutput').value = analysis.summary;
}

export function analyzeCurrent(){ return analyzeRecord(collectForm()); }
export function renderAnalysis(rec){ renderResults(analyzeRecord(rec)); }

export function buildPrompt(){
  const rec = collectForm();
  const analysis = analyzeRecord(rec);
  return [
    '以下の事例について、応用行動分析の観点から支援会議用に整理してください。',
    '断定は避け、仮説として示してください。',
    '',
    `【利用者】${rec.clientName || ''}`,
    `【場面】${rec.settingName || ''}`,
    `【場所】${rec.placeName || ''}`,
    `【活動】${rec.targetActivity || ''}`,
    `【問題行動】${rec.behaviorName || ''}`,
    `【操作的定義】${rec.behaviorDef || ''}`,
    `【背景条件】${rec.settingEvents || ''}`,
    `【環境要因】${rec.environmentNote || ''}`,
    `【先行事象】${(rec.antecedentChecks || []).join('、')} ${rec.antecedentText || ''}`,
    `【行動】${rec.behaviorText || ''}`,
    `【結果事象】${(rec.consequenceChecks || []).join('、')} ${rec.consequenceText || ''}`,
    `【その場の対応】${rec.currentSupport || ''}`,
    `【対応結果】${rec.responseEffect || ''}`,
    '',
    '次の形式で出力してください。',
    '1. 機能仮説を優先順で3つまで',
    '2. 各仮説の根拠',
    '3. 追加で観察すべき点',
    '4. 予防的介入',
    '5. 代替行動',
    '6. 周囲の対応で避けるべきこと',
    '7. 支援会議で共有すべき要点',
    '',
    '参考として簡易ツール上の仮説順位:',
    ...analysis.ranked.map((r,i) => `${i+1}. ${r.name} ${r.pct}%`)
  ].join('\n');
}
