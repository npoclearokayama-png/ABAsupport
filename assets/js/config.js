export const STORAGE_KEY = 'aba_case_records_v3';
export const WEEK_STORAGE_KEY = 'aba_week_maps_v1';
export const CLIENT_STORAGE_KEY = 'aba_clients_v1';

export const ANTECEDENT_OPTIONS = [
  '課題提示直後','難しい課題','終了・切替要求','待機','拒否された','取り上げられた',
  '注目が他者へ向いた','指示が不明瞭','騒音・刺激が多い','一人でいた','好きな活動の中断','疲労・空腹・眠気'
];

export const CONSEQUENCE_OPTIONS = [
  '課題が中断された','要求が下がった','大人が近づいた','長く話しかけられた','欲しい物が得られた','嫌な刺激から離れた',
  '別室へ移動した','注目を受けた','一人になれた','感覚刺激が得られた','周囲が譲歩した','特に変化なし'
];

export const FORM_FIELDS = [
  'recordId','recordDate','recordTime','clientName','staffName','settingName','placeName','targetActivity','peoplePresent',
  'behaviorName','behaviorDef','behaviorFrequency','behaviorDuration','behaviorIntensity','riskLevel','settingEvents','environmentNote',
  'antecedentText','behaviorText','consequenceText','currentSupport','responseEffect','hypothesisMemo','nextAction'
];

export const WEEKDAY_LABELS = ['月','火','水','木','金','土','日'];
