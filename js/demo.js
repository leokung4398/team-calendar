// ============================================================
// 示範模式（只在 localhost 且網址帶 ?demo 時啟用）
// - 9 位虛擬組員 + 自動產生的行程，資料只存在記憶體，不會寫入 Firebase
// - 重新整理即重置（相同亂數種子，每次產生的資料相同）
// ============================================================
import { DEFAULT_TYPES, APP } from './config.js';
import { ymd, addDays, eachDay, monthRange, shiftMonth, minToHM, nowMinutes } from './utils.js';
import { dayInfo, ensureRange } from './holidays.js';

export const DEMO = new URLSearchParams(location.search).has('demo');

const ts = ms => ({ toMillis: () => ms, toDate: () => new Date(ms) });
const DAY = 86400000;

const ME = {
  uid: 'demo-me',
  displayName: '孔令淳',
  title: '營運自行車品管專員',
  email: 'leokung@youbike.com.tw',
};

const PEOPLE = [
  ['u1', '蕭琮瀚', '經營企劃專員', 'jackhsiao@youbike.com.tw'],
  ['u2', '包于巧', '經營企劃高專', 'ciaopao@youbike.com.tw'],
  ['u3', '徐嘉鴻', '經營Team代理副理', 'jhsu@youbike.com.tw'],
  ['u4', '張必忠', '品檢與倉管專員', 'joshchang@youbike.com.tw'],
  ['u5', '賴宜平', '勞安暨品管專員', 'benlai@youbike.com.tw'],
  ['u6', '陳麒任', '採購企劃專員', 'aidpanchen@youbike.com.tw'],
  ['u7', '丁美云', '採購專員', 'sunnyting@youbike.com.tw'],
  ['u8', '葉爵豪', '營運自行車品管專員(北區)', 'chuehhaoyeh@youbike.com.tw'],
  ['u9', '陸逸群', '營運自行車品管專員(高)', 'yichunlu@youbike.com.tw'],
];
const CLIENTS = ['台北市政府交通局', '新北市交通局', '桃園市政府', '台北捷運公司', '內湖倉庫', '新竹市政府',
  '巨大機械 台中總部', '台北市議會', '南港站點巡檢', '信義區站點巡檢', '廠商 XX 科技', '銀行 洽談合約'];
const TRIPS = ['台中', '高雄', '台南', '新竹', '嘉義', '屏東'];
const MEETINGS = ['總公司 3F 會議室', '總公司 5F 大會議室', '線上會議 (Meet)', '新北市政府 會議室'];
const REASONS = ['站點擴建討論', '年度合約續約', '設備驗收', '營運數據簡報', '客訴處理', '新站點勘查', '季度檢討會議', '廠商評鑑'];

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDemoBackend(state, emit, describeEvent) {
  let seq = 0;
  const id = p => `${p}-${++seq}`;
  const now = Date.now();

  function setup() {
    state.types = DEFAULT_TYPES.map((t, i) => ({ ...t, order: i, active: true }));
    const meUser = {
      ...ME,
      photoURL: '',
      groupId: 'default',
      role: 'member', // 隱藏管理員（孔令淳）表面角色顯示為一般組員
      active: true,
      createdAt: ts(now - 30 * DAY),
      lastSeenActivityAt: ts(now - DAY),
    };
    const teamUsers = PEOPLE.map(([uid, displayName, title, email], i) => ({
      uid,
      displayName,
      title,
      email,
      photoURL: '',
      groupId: 'default',
      role: displayName.includes('徐嘉鴻') ? 'admin' : 'member', // 顯性管理員權限交接予代理副理 徐嘉鴻
      active: true,
      createdAt: ts(now - (29 - i) * DAY),
      lastSeenActivityAt: ts(now - DAY),
    }));
    const users = [meUser, ...teamUsers];
    state.users = new Map(users.map(u => [u.uid, u]));
    // 已離職的示範組員
    const former = [
      { uid: 'x1', displayName: '周品妤', title: '營運專員', days: 40 },
      { uid: 'x2', displayName: '鄭家豪', title: '品管專員', days: 95 },
    ];
    former.forEach(f => state.users.set(f.uid, {
      uid: f.uid, displayName: f.displayName, title: f.title, email: `${f.uid}.demo@youbike.com.tw`, photoURL: '', groupId: 'default',
      role: 'member', active: false, deactivatedAt: ts(now - f.days * DAY), createdAt: ts(now - 400 * DAY),
    }));
    state.me = state.users.get(ME.uid);
  }

  async function generate() {
    const today = ymd();
    const thisMonth = today.slice(0, 7);
    const from = monthRange(shiftMonth(thisMonth, -1)).from;
    const to = monthRange(shiftMonth(thisMonth, 1)).to;
    await ensureRange(from, to);
    const r = rng(20261009);
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const uids = [ME.uid, ...PEOPLE.map(p => p[0])];
    const busy = new Map(uids.map(u => [u, new Set()]));
    const events = [];
    const phone = uid => `09${String(10 + uids.indexOf(uid)).padStart(2, '0')}-${String(100 + uids.indexOf(uid) * 37).slice(-3)}-${String(500 + uids.indexOf(uid) * 53).slice(-3)}`;
    const otherThan = (...ex) => uids.filter(u => !ex.includes(u));

    function add(ev) {
      const companions = ev.companionUids || [];
      const e = {
        id: id('ev'), groupId: 'default', location: '', reason: '', phone: phone(ev.ownerUid), canAnswer: true,
        deputyUid: '', returnAt: '', startTime: '', endTime: '', ...ev, companionUids: companions,
        participantUids: [ev.ownerUid, ...companions], createdBy: ev.ownerUid, updatedBy: ev.ownerUid,
        createdAt: ts(now - r() * 20 * DAY), updatedAt: ts(now - r() * 5 * DAY),
      };
      events.push(e);
      for (const u of e.participantUids) eachDay(e.startDate, e.endDate).forEach(d => busy.get(u).add(d));
      return e;
    }
    const hm = m => minToHM(Math.max(0, Math.min(1439, Math.round(m / 30) * 30)));
    const n = nowMinutes();

    // ---- 今天：刻意安排各種狀態，方便看「今日動態」 ----
    add({ ownerUid: 'u1', typeId: 'out', startDate: today, endDate: today, period: 'custom', startTime: hm(n - 60), endTime: hm(n + 90), location: '新北市交通局', reason: '站點擴建討論', deputyUid: 'u2', returnAt: `${today}T${hm(n + 120)}` });
    add({ ownerUid: 'u2', typeId: 'trip', startDate: today, endDate: addDays(today, 1), period: 'full', location: '台中・巨大機械總部', reason: '設備驗收', companionUids: ['u3'], deputyUid: 'u5' });
    add({ ownerUid: 'u4', typeId: 'leave', startDate: today, endDate: today, period: 'full', reason: '特休', phone: '', canAnswer: false, deputyUid: 'u6' });
    add({ ownerUid: 'u5', typeId: 'meeting', startDate: today, endDate: today, period: 'custom', startTime: hm(n + 120), endTime: hm(n + 180), location: '總公司 5F 大會議室', reason: '季度檢討會議' });
    add({ ownerUid: 'u6', typeId: 'out', startDate: today, endDate: today, period: 'custom', startTime: hm(n - 240), endTime: hm(n - 120), location: '南港站點巡檢' });
    add({ ownerUid: 'u8', typeId: 'out', startDate: today, endDate: today, period: 'custom', startTime: hm(n - 30), endTime: hm(n + 30), location: '台北市議會', reason: '議員質詢備詢', canAnswer: false, deputyUid: 'u9' });
    // 孔令淳今天安排「進辦公室」，展現進駐時在辦公室的效果；陸逸群今天無行程，展現常態外勤效果
    add({ ownerUid: ME.uid, typeId: 'office', startDate: today, endDate: today, period: 'full', location: '總公司 3F 經營組工位', reason: '例行進辦與組務討論' });

    // ---- 其他日子：依機率隨機產生 ----
    const workdays = eachDay(from, to).filter(d => !dayInfo(d).off && d !== today);
    for (const u of uids) {
      for (let i = 0; i < workdays.length; i++) {
        const d = workdays[i];
        if (busy.get(u).has(d)) continue;
        const x = r();
        if (x < 0.05) {
          const len = 1 + Math.floor(r() * 3);
          const end = workdays[Math.min(i + len - 1, workdays.length - 1)];
          const comp = r() < 0.35 ? [pick(otherThan(u))].filter(c => !busy.get(c).has(d)) : [];
          add({ ownerUid: u, typeId: 'trip', startDate: d, endDate: end, period: 'full', location: pick(TRIPS) + (r() < 0.5 ? '・' + pick(CLIENTS) : ''), reason: pick(REASONS), companionUids: comp, deputyUid: pick(otherThan(u, ...comp)) });
        } else if (x < 0.22) {
          const p = r();
          const period = p < 0.4 ? 'am' : p < 0.8 ? 'pm' : 'custom';
          const st = 9 * 60 + Math.floor(r() * 14) * 30;
          add({ ownerUid: u, typeId: 'out', startDate: d, endDate: d, period, startTime: period === 'custom' ? hm(st) : '', endTime: period === 'custom' ? hm(st + 60 + Math.floor(r() * 4) * 30) : '', location: pick(CLIENTS), reason: r() < 0.6 ? pick(REASONS) : '', deputyUid: r() < 0.4 ? pick(otherThan(u)) : '', canAnswer: r() < 0.85 });
        } else if (x < 0.27) {
          const half = r() < 0.4;
          add({ ownerUid: u, typeId: 'leave', startDate: d, endDate: d, period: half ? (r() < 0.5 ? 'am' : 'pm') : 'full', reason: pick(['特休', '病假', '事假', '補休']), phone: '', canAnswer: false, deputyUid: pick(otherThan(u)) });
        } else if (x < 0.35) {
          const st = 9 * 60 + Math.floor(r() * 14) * 30;
          add({ ownerUid: u, typeId: 'meeting', startDate: d, endDate: d, period: 'custom', startTime: hm(st), endTime: hm(st + 60 + Math.floor(r() * 3) * 30), location: pick(MEETINGS), reason: pick(REASONS) });
        } else if (x < 0.37) {
          add({ ownerUid: u, typeId: 'training', startDate: d, endDate: d, period: 'full', location: pick(['總公司 訓練教室', '外訓・台北商會', '線上課程']), reason: pick(['資安教育訓練', '主管培訓', 'Excel 進階課程', '急救訓練']) });
        } else if (x < 0.38) {
          add({ ownerUid: u, typeId: 'other', startDate: d, endDate: d, period: 'pm', location: '健康檢查中心', reason: '年度健康檢查' });
        }
      }
    }
    state.events = new Map(events.map(e => [e.id, e]));

    // ---- 月會示範設定與示範月會 ----
    state.meetingSettings = {
      defaultMeetUrl: 'https://meet.google.com/abc-defg-hij',
      defaultLocation: '總公司 5F 大會議室',
      defaultStartTime: '14:00',
      defaultEndTime: '16:00',
      rotationOrder: PEOPLE.map(p => p[0]), // u1 ~ u9 輪值
      lastRecorderUid: 'u1',
    };

    const nextMeetingDate = addDays(today, 5);
    const m1 = {
      id: 'demo-m-1',
      date: nextMeetingDate,
      startTime: '14:00',
      endTime: '16:00',
      location: '總公司 5F 大會議室',
      meetUrl: 'https://meet.google.com/abc-defg-hij',
      hostUid: ME.uid,
      recorderUid: 'u1', // 輪到蕭琮瀚 (經營企劃專員) 擔任紀錄人
      status: 'scheduled',
      agenda: [
        { title: '9月份經營數據回顧與各區調度成效分析', ownerUid: 'u1', duration: 30, links: [{ title: '9月營運分析簡報 (Google Slides)', url: 'https://docs.google.com/presentation/d/demo' }] },
        { title: '經營企劃進度與跨區排程審核', ownerUid: 'u2', duration: 25, links: [] },
        { title: '經營Team近期專案推進與資源調配報告', ownerUid: 'u3', duration: 20, links: [{ title: 'Q4採購驗收清單 (Google Sheets)', url: 'https://docs.google.com/spreadsheets/d/demo' }] },
        { title: '高雄遠端營運狀況與跨區支援方案報告', ownerUid: 'u9', duration: 25, links: [] },
        { title: '臨時動議與綜合討論', ownerUid: ME.uid, duration: 20, links: [] },
      ],
      reads: [],
      createdBy: ME.uid,
      createdAt: ts(now - 2 * DAY),
      updatedBy: ME.uid,
      updatedAt: ts(now - 2 * DAY),
    };

    // 上個月月會（已完成，紀錄已正式發布）
    const prevMonthDate = addDays(today, -28);
    const mPast1 = {
      id: 'demo-m-past1',
      date: prevMonthDate,
      startTime: '14:00',
      endTime: '16:00',
      location: '總公司 5F 大會議室',
      meetUrl: 'https://meet.google.com/past-sept-meet',
      hostUid: 'u3', // 徐嘉鴻 (經營Team代理副理)
      recorderUid: 'u2', // 包于巧 (經營企劃高專)
      status: 'published',
      agenda: [
        { title: '8月份各縣市營運周轉率與車輛調度成效報告', ownerUid: 'u1', duration: 30, links: [{ title: '8月車輛調度分析 (Google Slides)', url: 'https://docs.google.com/presentation/d/past1' }] },
        { title: '北區新站點驗收與品質抽查結果彙整', ownerUid: 'u8', duration: 25, links: [] },
        { title: '勞安規範執行進度與倉管庫存盤點報告', ownerUid: 'u5', duration: 20, links: [] },
        { title: '臨時動議與全組綜合討論', ownerUid: 'u3', duration: 20, links: [] },
      ],
      minutes: {
        attendees: {
          'demo-me': 'present',
          'u1': 'present',
          'u2': 'present',
          'u3': 'present',
          'u4': 'present',
          'u5': 'leave',
          'u6': 'present',
          'u7': 'present',
          'u8': 'present',
          'u9': 'remote',
        },
        agendaNotes: {
          0: {
            discussion: '蕭琮瀚報告：雙北地區上下班高峰調度車次提高 12%，新北板橋與中和借還熱點無車率已明顯降至 3% 以下。各區主管建議持續擴大雙和調度熱區。',
            conclusion: '通過。下月持續維持平日晨間熱點專人駐站調度。',
          },
          1: {
            discussion: '葉爵豪報告：北區新設 15 處站點電裝配線與車柱螺栓全數通過安全扭力檢驗，唯淡水有 2 柱插銷輕微刮傷已現場修復。',
            conclusion: '已驗收合格完成撥交營運。',
          },
          2: {
            discussion: '賴宜平當天公假，由張必忠代理報告倉管及車柱零組件備料無虞，安全鞋配發率已達 100%。',
            conclusion: '請倉管組每週固定盤點安全防護用品。',
          },
          3: {
            discussion: '副理徐嘉鴻提醒下半年度雙週預審即將上線，請各同仁注意預先提報行程。',
            conclusion: '即日起實施。',
          },
        },
        resolutions: '1. 通過新北板橋雙和晨間駐站調度專案續行。\n2. 北區 15 處新站驗收全數核備結案。\n3. 即日起全面落實行事曆雙週預審與外出報備機制。',
        generalNotes: '會議進行順暢，高雄遠端連線品質優良無中斷。全體組員對新版行事曆系統反應良好，後續將陸續擴增統計報表。',
        actionItems: [
          { task: '完成雙和區站點早尖峰調度數據週報', ownerUid: 'u1', dueDate: addDays(prevMonthDate, 7) },
          { task: '採購部提交 Q4 零件安全庫存清單', ownerUid: 'u6', dueDate: addDays(prevMonthDate, 14) },
          { task: '發送勞安規範宣導簡報給外勤巡檢同仁', ownerUid: 'u5', dueDate: addDays(prevMonthDate, 10) },
        ],
        publishedAt: ts(now - 27 * DAY),
        publishedBy: 'u2',
      },
      reads: [],
      createdBy: 'u3',
      createdAt: ts(now - 35 * DAY),
      updatedBy: 'u2',
      updatedAt: ts(now - 27 * DAY),
    };

    // 兩個月前月會（已完成，紀錄已正式發布）
    const past2Date = addDays(today, -58);
    const mPast2 = {
      id: 'demo-m-past2',
      date: past2Date,
      startTime: '14:00',
      endTime: '16:00',
      location: '總公司 5F 大會議室',
      meetUrl: 'https://meet.google.com/past-aug-meet',
      hostUid: ME.uid,
      recorderUid: 'u7', // 丁美云 (採購專員)
      status: 'published',
      agenda: [
        { title: '7月份全台營運站點妥善率與維修工單稽核', ownerUid: 'u4', duration: 30, links: [{ title: '7月妥善率總表 (Google Sheets)', url: 'https://docs.google.com/spreadsheets/d/past2' }] },
        { title: '高雄高屏跨區支援車輛進場調度', ownerUid: 'u9', duration: 25, links: [] },
        { title: '臨時動議與主管裁示事項', ownerUid: ME.uid, duration: 20, links: [] },
      ],
      minutes: {
        attendees: {
          'demo-me': 'present',
          'u1': 'present',
          'u2': 'present',
          'u3': 'present',
          'u4': 'present',
          'u5': 'present',
          'u6': 'present',
          'u7': 'present',
          'u8': 'present',
          'u9': 'remote',
        },
        agendaNotes: {
          0: {
            discussion: '張必忠報告：全台車柱妥善率平均維持在 99.4%，暑期高溫對電裝板影響不大，防水膠條更換進度達 98%。',
            conclusion: '持續追蹤剩餘 2% 膠條更換。',
          },
          1: {
            discussion: '陸逸群高雄遠端連線報告：暑假駁二與西子灣遊客量大增，自屏東緊急調撥 80 輛 2.0 自行車支援順利化解尖峰借車潮。',
            conclusion: '跨區調度機制運作良好，予以嘉獎肯定。',
          },
        },
        resolutions: '1. 高雄跨區調撥專案成效卓越，列入後續長假應變 SOP。\n2. 全台各區車輛膠條更換請於 8 月底前全數結案。',
        generalNotes: '全體全員到齊，會議於下午 15:45 準時結束。',
        actionItems: [
          { task: '結清高屏跨區車輛運送運費報銷單據', ownerUid: 'u9', dueDate: addDays(past2Date, 10) },
          { task: '採購補充備用車柱防水膠條 500 組', ownerUid: 'u7', dueDate: addDays(past2Date, 14) },
        ],
        publishedAt: ts(now - 57 * DAY),
        publishedBy: 'u7',
      },
      reads: [],
      createdBy: ME.uid,
      createdAt: ts(now - 65 * DAY),
      updatedBy: 'u7',
      updatedAt: ts(now - 57 * DAY),
    };

    state.meetings = new Map([
      [m1.id, m1],
      [mPast1.id, mPast1],
      [mPast2.id, mPast2],
    ]);

    // ---- 全組動態與個人通知 ----
    const recent = events.filter(e => e.ownerUid !== ME.uid).sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis()).slice(0, 15);
    state.activities = recent.map((e, i) => ({
      id: id('act'), actorUid: e.ownerUid, action: i % 4 === 1 ? 'update' : 'create', eventId: e.id, ownerUid: e.ownerUid,
      summary: describeEvent(e), createdAt: ts(now - i * 3.3 * 3600000),
    }));
    const mine = events.filter(e => e.deputyUid === ME.uid || e.companionUids.includes(ME.uid)).slice(0, 4);
    state.notifications = mine.map((e, i) => ({
      id: id('n'), kind: e.deputyUid === ME.uid ? 'deputy' : 'companion', eventId: e.id, actorUid: e.ownerUid,
      ownerUid: e.ownerUid, summary: describeEvent(e), read: i > 1, createdAt: ts(now - (i + 1) * 5 * 3600000),
    }));

    // ---- 示範用每日工作進度回報 ----
    const yesterday = addDays(today, -1);
    state.dailyReports = new Map([
      [yesterday, {
        id: yesterday,
        isTyphoonDay: false,
        typhoonNote: '',
        reports: {
          'demo-me': { uid: 'demo-me', reportType: 'field', fieldRegion: '台北市（大安、信義）', fieldStations: 18, fieldV20: 36, fieldV20E: 14, todayTasks: '地區：台北市（大安、信義）\n稽查場站數：18 站\n2.0與2.0E的數量：2.0 共 36 台 / 2.0E 共 14 台（合計 50 台）', notes: '', updatedAt: new Date(now - DAY).toISOString(), ackBy: { u3: { uid: 'u3', name: '徐嘉鴻', at: new Date(now - DAY + 3600000).toISOString() } } },
          u8: { uid: 'u8', reportType: 'field', fieldRegion: '新北市（板橋、中和）', fieldStations: 16, fieldV20: 32, fieldV20E: 12, todayTasks: '地區：新北市（板橋、中和）\n稽查場站數：16 站\n2.0與2.0E的數量：2.0 共 32 台 / 2.0E 共 12 台（合計 44 台）', notes: '', updatedAt: new Date(now - DAY).toISOString(), ackBy: { u3: { uid: 'u3', name: '徐嘉鴻', at: new Date(now - DAY + 3600000).toISOString() } } },
          u9: { uid: 'u9', reportType: 'field', fieldRegion: '高雄市（左營、三民）', fieldStations: 15, fieldV20: 30, fieldV20E: 10, todayTasks: '地區：高雄市（左營、三民）\n稽查場站數：15 站\n2.0與2.0E的數量：2.0 共 30 台 / 2.0E 共 10 台（合計 40 台）', notes: '', updatedAt: new Date(now - DAY).toISOString(), ackBy: { u3: { uid: 'u3', name: '徐嘉鴻', at: new Date(now - DAY + 3600000).toISOString() } } },
          u4: { uid: 'u4', reportType: 'office', todayTasks: '1. 總倉車柱零組件入庫清點與儲位整理\n2. 協同廠商完成不良品退換貨核對', tomorrowTasks: '1. 雙北調度站安全庫存盤點', notes: '', updatedAt: new Date(now - DAY).toISOString(), ackBy: { u3: { uid: 'u3', name: '徐嘉鴻', at: new Date(now - DAY + 3600000).toISOString() } } },
          u5: { uid: 'u5', reportType: 'office', todayTasks: '1. 職業安全衛生月報表彙整與自主檢查表歸檔\n2. 安駕宣導教材更新與防護具領用登記', tomorrowTasks: '1. 辦理新進人員安全衛生教育訓練追蹤', notes: '', updatedAt: new Date(now - DAY).toISOString(), ackBy: { u3: { uid: 'u3', name: '徐嘉鴻', at: new Date(now - DAY + 3600000).toISOString() } } },
          u2: { uid: 'u2', reportType: 'office', todayTasks: '1. 彙整各區在庫車輛與調度周轉率月報\n2. 跨部門營運會議資料準備', tomorrowTasks: '1. 追蹤雙北車柱擴建專案進度', notes: '', updatedAt: new Date(now - DAY).toISOString(), ackBy: { u3: { uid: 'u3', name: '徐嘉鴻', at: new Date(now - DAY + 3600000).toISOString() } } },
          u6: { uid: 'u6', reportType: 'office', todayTasks: '1. 審核第四季維修耗材採購請購單與廠商詢價\n2. 追蹤供應商交期與驗收單據核銷', tomorrowTasks: '1. 辦理年度合約續約議價作業', notes: '', updatedAt: new Date(now - DAY).toISOString(), ackBy: { u3: { uid: 'u3', name: '徐嘉鴻', at: new Date(now - DAY + 3600000).toISOString() } } },
          u7: { uid: 'u7', reportType: 'office', todayTasks: '1. 處理各區零配件採購訂單與發票請款核對\n2. 彙整採購佈告欄最新公告事項', tomorrowTasks: '1. 追蹤車柱電子零件到貨驗收', notes: '', updatedAt: new Date(now - DAY).toISOString(), ackBy: { u3: { uid: 'u3', name: '徐嘉鴻', at: new Date(now - DAY + 3600000).toISOString() } } },
          u1: { uid: 'u1', reportType: 'office', todayTasks: '1. 雙北營運數據週報整理與站點成效分析\n2. 整理下週交通局會議簡報', tomorrowTasks: '1. 新北市交通局站點擴建會議', notes: '', updatedAt: new Date(now - DAY).toISOString(), ackBy: { u3: { uid: 'u3', name: '徐嘉鴻', at: new Date(now - DAY + 3600000).toISOString() } } },
        },
      }],
      [today, {
        id: today,
        isTyphoonDay: false,
        typhoonNote: '',
        reports: {
          u8: { uid: 'u8', reportType: 'field', fieldRegion: '桃園市（中壢、桃園區）', fieldStations: 14, fieldV20: 28, fieldV20E: 12, todayTasks: '地區：桃園市（中壢、桃園區）\n稽查場站數：14 站\n2.0與2.0E的數量：2.0 共 28 台 / 2.0E 共 12 台（合計 40 台）', notes: '', updatedAt: new Date(now - 2000000).toISOString(), ackBy: { u3: { uid: 'u3', name: '徐嘉鴻', at: new Date(now - 800000).toISOString() } } },
          u4: { uid: 'u4', reportType: 'office', todayTasks: '1. 完成雙北調度站安全庫存盤點\n2. 協助各區請領車柱鎖體備品出庫', tomorrowTasks: '1. 整理月度倉管盤點報表', notes: '', updatedAt: new Date(now - 1800000).toISOString(), ackBy: { u3: { uid: 'u3', name: '徐嘉鴻', at: new Date(now - 600000).toISOString() } }, managerReply: '辛苦了，鎖體備品庫存請留意安全水位！', managerReplyBy: '徐嘉鴻' },
          u6: { uid: 'u6', reportType: 'office', todayTasks: '1. 完成年度耗材合約續約比價單陳核\n2. 通知中南部維修耗材供應商本週到貨排程', tomorrowTasks: '1. 整理下月採購預估表', notes: '合約用印流程進行中', updatedAt: new Date(now - 1200000).toISOString(), ackBy: {} },
          u7: { uid: 'u7', reportType: 'office', todayTasks: '1. 核對 10 月份第二批車柱零件驗收單與請款發票\n2. 更新採購進度追蹤表', tomorrowTasks: '1. 辦理耗材下單作業', notes: '', updatedAt: new Date(now - 900000).toISOString(), ackBy: {} },
        },
      }],
    ]);

    state.loaded = { users: true, types: true, events: true, dailyReports: true };
    state.eventsFrom = from;
    emit();
  }

  return {
    watchAuth(cb) { setTimeout(() => cb({ uid: ME.uid, email: ME.email, displayName: ME.displayName, photoURL: '' }), 0); return () => {}; },
    login: async () => {},
    logout: async () => { location.href = location.pathname; },
    ensureProfile: async () => { setup(); return state.me; },
    startSync() { generate().catch(e => console.error('demo generate', e)); },
    ensureEventsFrom() {},
    stopSync() {},
    fetchEvent: async eid => state.events.get(eid) || null,
    fetchEventsInRange: async (from, to) => [...state.events.values()].filter(e => e.endDate >= from && e.startDate <= to),

    async saveEvent(data, prev) {
      const companionUids = [...new Set(data.companionUids)].filter(u => u !== data.ownerUid);
      const ev = {
        ...(prev || {}), ...data, companionUids, participantUids: [data.ownerUid, ...companionUids], groupId: 'default',
        id: prev?.id || id('ev'), createdBy: prev?.createdBy || ME.uid, createdAt: prev?.createdAt || ts(Date.now()),
        updatedBy: ME.uid, updatedAt: ts(Date.now()),
      };
      state.events = new Map(state.events).set(ev.id, ev);
      state.activities = [{ id: id('act'), actorUid: ME.uid, action: prev ? 'update' : 'create', eventId: ev.id, ownerUid: ev.ownerUid, summary: describeEvent(ev), createdAt: ts(Date.now()) }, ...state.activities];
      emit();
      return ev.id;
    },
    async deleteEvent(ev) {
      const m = new Map(state.events); m.delete(ev.id); state.events = m;
      state.activities = [{ id: id('act'), actorUid: ME.uid, action: 'delete', eventId: ev.id, ownerUid: ev.ownerUid, summary: describeEvent(ev), createdAt: ts(Date.now()) }, ...state.activities];
      emit();
    },
    async markActivitiesSeen() { state.me = { ...state.me, lastSeenActivityAt: ts(Date.now()) }; emit(); },
    async markNotificationsRead(ids) { state.notifications = state.notifications.map(n => (ids.includes(n.id) ? { ...n, read: true } : n)); emit(); },
    async updateUserAdmin(uid, patch) {
      if ('active' in patch) patch = { ...patch, deactivatedAt: patch.active ? null : ts(Date.now()) };
      state.users = new Map(state.users).set(uid, { ...state.users.get(uid), ...patch });
      emit();
    },
    async createPreseededUser(payload) {
      const u = { ...payload, createdAt: ts(Date.now()) };
      state.users = new Map(state.users).set(u.uid, u);
      emit();
      return u;
    },
    async deletePreseededUser(uid) {
      const m = new Map(state.users);
      m.delete(uid);
      state.users = m;
      emit();
    },
    async purgeExpiredUsers() {
      const limit = Date.now() - APP.purgeAfterDays * DAY;
      const gone = [...state.users.values()].filter(u => !u.active && u.deactivatedAt && u.deactivatedAt.toMillis() < limit);
      if (!gone.length) return [];
      const m = new Map(state.users);
      gone.forEach(u => m.delete(u.uid));
      state.users = m;
      emit();
      return gone.map(u => u.displayName);
    },
    async saveType(t) {
      const tid = t.id || id('type');
      const rest = state.types.filter(x => x.id !== tid);
      state.types = [...rest, { id: tid, name: t.name, color: t.color, order: Number(t.order) || 0, active: t.active !== false }].sort((a, b) => a.order - b.order);
      emit();
    },
    async saveUserModulePermission(uid, moduleKey, allowed) {
      const current = state.modulePermissions || {};
      const userPerms = { ...(current[uid] || {}) };
      userPerms[moduleKey] = allowed;
      state.modulePermissions = { ...current, [uid]: userPerms };
      emit();
    },
    async batchUpdateModulePermission(moduleKey, allowed) {
      const current = state.modulePermissions || {};
      const updated = { ...current };
      for (const u of state.users.values()) {
        if (!u.active) continue;
        updated[u.uid] = { ...(updated[u.uid] || {}), [moduleKey]: allowed };
      }
      state.modulePermissions = updated;
      emit();
    },
    async saveMeetingSettings(patch) {
      state.meetingSettings = { ...(state.meetingSettings || {}), ...patch };
      emit();
    },
    async saveMeeting(meetingData, prev) {
      const mid = prev?.id || id('meeting');
      const m = {
        ...(prev || {}),
        ...meetingData,
        id: mid,
        createdBy: prev?.createdBy || ME.uid,
        createdAt: prev?.createdAt || ts(Date.now()),
        updatedBy: ME.uid,
        updatedAt: ts(Date.now()),
        status: prev?.status || 'scheduled',
        agenda: meetingData.agenda || prev?.agenda || [],
        reads: prev?.reads || [],
      };
      state.meetings = new Map(state.meetings).set(mid, m);
      if (m.recorderUid) {
        state.meetingSettings = { ...(state.meetingSettings || {}), lastRecorderUid: m.recorderUid };
      }
      state.activities = [{
        id: id('act'),
        actorUid: ME.uid,
        action: prev ? 'update' : 'create',
        meetingId: mid,
        summary: `月會｜${m.date} ${m.startTime || ''}–${m.endTime || ''}`,
        createdAt: ts(Date.now()),
      }, ...state.activities];
      emit();
      return mid;
    },
    async deleteMeeting(mid) {
      const m = state.meetings.get(mid);
      const next = new Map(state.meetings);
      next.delete(mid);
      state.meetings = next;
      state.activities = [{
        id: id('act'),
        actorUid: ME.uid,
        action: 'delete',
        meetingId: mid,
        summary: `月會｜${m?.date || ''} 已取消`,
        createdAt: ts(Date.now()),
      }, ...state.activities];
      emit();
    },
    async updateMeetingAgendaItem(meetingId, agendaIndex, patch, fallbackAgenda = null) {
      const m = state.meetings.get(meetingId);
      if (!m) return;
      const baseAgenda = (Array.isArray(m.agenda) && m.agenda.length)
        ? [...m.agenda]
        : (Array.isArray(fallbackAgenda) ? [...fallbackAgenda] : []);
      if (!baseAgenda[agendaIndex]) return;
      const newAgenda = [...baseAgenda];
      newAgenda[agendaIndex] = { ...newAgenda[agendaIndex], ...patch };
      const updated = { ...m, agenda: newAgenda, updatedAt: ts(Date.now()) };
      state.meetings = new Map(state.meetings).set(meetingId, updated);
      emit();
    },
    async saveMeetingMinutes(meetingId, minutesData, isPublish = false) {
      const m = state.meetings.get(meetingId);
      if (!m) return;
      const now = Date.now();
      const updated = {
        ...m,
        status: isPublish ? 'published' : 'draft',
        minutes: {
          ...minutesData,
          updatedBy: ME.uid,
          updatedAt: ts(now),
          ...(isPublish ? { publishedAt: ts(now), publishedBy: ME.uid } : {}),
        },
        updatedBy: ME.uid,
        updatedAt: ts(now),
      };
      state.meetings = new Map(state.meetings).set(meetingId, updated);
      if (isPublish) {
        state.activities = [{
          id: id('act'),
          actorUid: ME.uid,
          action: 'publish_minutes',
          meetingId,
          summary: `會議紀錄發布｜${m.date} 經營組月會會議紀錄已發布`,
          createdAt: ts(now),
        }, ...state.activities];
      }
      emit();
    },
  };
}
