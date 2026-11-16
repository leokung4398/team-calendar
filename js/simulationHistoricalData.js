// 2026 全年度模擬體驗配額、人員排班與出差日期雲端資料容器
// （完整母體車輛數、跨部門名冊與 1～12 月排班資料已移入受保護之 Firestore 雲端資料庫，於企業帳號登入後動態注入）

export const SIMULATION_2026_MONTHS = [
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
  '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'
];

export const MONTH_ZH_NAMES = {
  '2026-01': '一月',
  '2026-02': '二月',
  '2026-03': '三月',
  '2026-04': '四月',
  '2026-05': '五月',
  '2026-06': '六月',
  '2026-07': '七月',
  '2026-08': '八月',
  '2026-09': '九月',
  '2026-10': '十月',
  '2026-11': '十一月',
  '2026-12': '十二月',
};

// 登入後由 data.js 自 Firestore (groups/default/settings/simulationMaster) 自動注入
export const FLEET_MASTER_SUMMARY = {
  totalV20: 0,
  totalV20e: 0,
  grandTotal: 0,
  teamQuotaTotal: 0,
  teamQuotaV20e: 0,
  combinedQuotaTotal: 0,
  overallSampleRate: '0%',
  cities: [],
  crossDeptRoster: [],
};

// 登入後由 data.js 自 Firestore (groups/default/settings/simulationMaster & simulationDuties) 自動注入
export const HISTORICAL_SIMULATION_2026 = {};

/** 將雲端載入之母體配額與各月歷史排班注入記憶體容器 */
export function hydrateSimulationMasterFromCloud(cloudDoc) {
  if (!cloudDoc) return;
  if (cloudDoc.fleetMasterSummary && typeof cloudDoc.fleetMasterSummary === 'object') {
    Object.assign(FLEET_MASTER_SUMMARY, cloudDoc.fleetMasterSummary);
  }
  if (cloudDoc.historicalSimulation2026 && typeof cloudDoc.historicalSimulation2026 === 'object') {
    Object.assign(HISTORICAL_SIMULATION_2026, cloudDoc.historicalSimulation2026);
  }
}
