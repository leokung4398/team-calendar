// ============================================================
// 經營 Team 行事曆 - 設定檔
// ============================================================
// 資料安全由雲端 firestore.rules 嚴格保護（僅限已驗證之公司企業網域與授權白名單存取）。
// 成員名單與排班配額於通過企業身分驗證後自雲端動態載入，不在前端靜態原始碼暴露個人資訊。
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyAS9YFhHAKazjKmCLJfJvjg325_8gZUtDs",
  authDomain: "team-calendar-93cb2.firebaseapp.com",
  projectId: "team-calendar-93cb2",
  storageBucket: "team-calendar-93cb2.firebasestorage.app",
  messagingSenderId: "973017260884",
  appId: "1:973017260884:web:7c96e92b12f33a4145dec1",
};

export const APP = {
  // 允許登入的公司 Email 網域
  allowedDomains: ['youbike.com.tw'],
  // 平台白名單：於通過企業登入後由 Firestore (groups/default/settings/whitelist & users) 自動載入同步
  whitelistEmails: [],
  whitelistNames: [],
  // 目前只有一個組別；資料結構已預留多組別
  groupId: 'default',
  groupName: '經營 Team',
  // 時段定義（上午 = 上班～午休、下午 = 午休結束～下班；今日動態與騎行進度條使用）
  periods: {
    am: ['08:30', '12:00'],
    pm: ['13:00', '17:30'],
  },
  // 停用滿幾天後自動刪除組員資料（需與 firestore.rules 中的 duration.value(90, 'd') 一致）
  purgeAfterDays: 90,
};

// 第一次啟動時（第一位管理員登入）自動建立的行程類型，之後可於「管理」頁修改
export const DEFAULT_TYPES = [
  { id: 'trip', name: '出差', color: '#2563eb' },
  { id: 'out', name: '外出', color: '#16a34a' },
  { id: 'office', name: '進辦公室', color: '#f59e0b' },
  { id: 'leave', name: '公休/請假', color: '#dc2626' },
  { id: 'meeting', name: '會議', color: '#9333ea' },
  { id: 'training', name: '教育訓練', color: '#ea580c' },
  { id: 'other', name: '其他', color: '#64748b' },
];

export const isConfigured = !String(firebaseConfig.apiKey).startsWith('請填入');
