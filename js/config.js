// ============================================================
// 經營 Team 行事曆 - 設定檔
// ============================================================
// 1. 將 Firebase 控制台「專案設定 → 你的應用程式 → SDK 設定」
//    中的 firebaseConfig 貼到下方（這組值本來就會公開在網頁上，不是機密，
//    資料安全由 firestore.rules 保護）。
// 2. 若有修改 allowedDomains，請同步修改 firestore.rules 中的 isCompany()。
// ============================================================

const _host = typeof location !== 'undefined' ? location.hostname : '';
export const firebaseConfig = {
  apiKey: "AIzaSyAS9YFhHAKazjKmCLJfJvjg325_8gZUtDs",
  // 若目前位於 Firebase Hosting 同源網域（.web.app 或 .firebaseapp.com），自動對齊 authDomain 以避免手機 iOS Safari / 跨網域 Storage Partitioning 造成登入卡住
  authDomain: (_host.endsWith('.web.app') || _host.endsWith('.firebaseapp.com'))
    ? _host
    : "team-calendar-93cb2.firebaseapp.com",
  projectId: "team-calendar-93cb2",
  storageBucket: "team-calendar-93cb2.firebasestorage.app",
  messagingSenderId: "973017260884",
  appId: "1:973017260884:web:7c96e92b12f33a4145dec1",
};

export const APP = {
  // 允許登入的公司 Email 網域
  allowedDomains: ['youbike.com.tw'],
  // 平台白名單：僅限經營 Team 10 位同仁存取
  whitelistEmails: [
    'leokung@youbike.com.tw',     // 孔令淳
    'chuehhaoyeh@youbike.com.tw', // 葉爵豪
    'yichunlu@youbike.com.tw',    // 陸逸群
    'joshchang@youbike.com.tw',   // 張必忠
    'benlai@youbike.com.tw',      // 賴宜平
    'ciaopao@youbike.com.tw',     // 包于巧
    'aidpanchen@youbike.com.tw',  // 陳麒任
    'sunnyting@youbike.com.tw',   // 丁美云
    'jackhsiao@youbike.com.tw',   // 蕭琮瀚
    'jhsu@youbike.com.tw',        // 徐嘉鴻
  ],
  whitelistNames: [
    '孔令淳', '葉爵豪', '陸逸群', '張必忠', '賴宜平',
    '包于巧', '陳麒任', '丁美云', '蕭琮瀚', '徐嘉鴻',
  ],
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
