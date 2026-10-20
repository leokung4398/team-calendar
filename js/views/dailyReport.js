// 每日工作進度回報模組（#/dailyReport）
// - 內勤 6 位同仁：每日下班回報工作進度（1. 今日完成事項 2. 明日預計待辦 3. 備註），比照 LINE 群組做法全體組員皆可公開查看
// - 外勤品管 3 位同仁（孔令淳、葉爵豪、陸逸群）：每日下班制式化回報 3 項（地區、稽查場站數、2.0 與 2.0E 數量），因採另外回報機制，內容僅「代理副理（徐嘉鴻）」、「外勤代理人（包于巧）」與「填寫者本人」可見
// - 防代填保護：嚴格鎖定僅本人可填寫或編輯自己的回報
// - 支援「🌀 颱風停班停課（全員免回報）」彈性切換、休假與例假日自動連動
// - 支援 17:30 智慧溫和下班提醒 Toast + 行動端通勤拇指熱區懸浮按鈕（FAB）與置中快填彈窗（Modal）

import {
  state, activeUsers, myUid, isAdmin, isFieldStaff, isSupervisor, isFieldDeputy, isSystemDesigner, isOfficeReporter, isDailyReporter,
  dailyReportDocOf, saveUserDailyReport, toggleTyphoonDay, acknowledgeDailyReport, eventList,
} from '../data.js';
import { eventsOfUserOn } from '../schedule.js';
import { dayInfo, ensureRange } from '../holidays.js';
import { esc, avatar, toast, ymd, addDays, fmtMD, weekdayZh, nowMinutes } from '../utils.js';
import { startInteractiveDailyReportSpotlightTour } from '../guideModal.js';

// 內勤各職務專屬的「常用工作快選膠囊」
const ROLE_QUICK_CHIPS = {
  warehouse: [
    '總倉車柱零組件入庫清點與儲位整理',
    '各區調度站安全庫存盤點與備品撥補',
    '協同廠商完成不良品退換貨與驗收核對',
    '維修料件出庫單據登錄與帳務核對',
    '月度倉管盤點報表彙整',
  ],
  safety: [
    '職業安全衛生月報表彙整與自主檢查表歸檔',
    '新進與在職人員安全衛生教育訓練追蹤',
    '安駕宣導教材更新與防護具領用盤點',
    '各區工作場所安全衛生巡查紀錄檢核',
    '職災預防與事故通報案例宣導整理',
  ],
  inventory: [
    '各區在庫車輛數與調度周轉率報表彙整',
    '雙北及外縣市站點擴建專案進度追蹤',
    '跨部門營運數據分析與會議簡報準備',
    '車柱與車輛資產異動清冊核對',
    '異常滯留車輛與維修進度追蹤',
  ],
  procurement: [
    '審核各區維修耗材採購請購單與廠商詢價',
    '追蹤供應商交期、到貨驗收與請款發票核銷',
    '辦理年度合約續約議價與用印流程追蹤',
    '更新採購佈告欄最新公告與零件安全庫存表',
    '跨區緊急採購案件交期協調',
  ],
  operations: [
    '各區營運數據週報整理與站點周轉成效分析',
    '交通局與跨局處會議簡報資料準備',
    '站點營運異常申訴案件追蹤與跨部門協調',
    '月會專案進度彙整與決議事項追蹤',
    '年度營運企劃專案執行進度檢討',
  ],
};

// 外勤品管同仁專屬「縣市 ➔ 行政區」二階連動資料庫（涵蓋全台 YouBike 營運縣市與雙北/南區巡檢分區）
export const FIELD_CITY_DISTRICTS = {
  '新北市': [
    '板橋區', '中和區', '永和區', '新店區', '三重區', '新莊區', '蘆洲區', '土城區', '樹林區', '淡水區', '林口區',
    '汐止區', '三峽區', '鶯歌區', '五股區', '泰山區', '八里區', '深坑區', '瑞芳區', '三芝區', '金山區', '萬里區',
    '石門區', '石碇區', '坪林區', '烏來區', '平溪區', '雙溪區', '貢寮區',
  ],
  '台北市': [
    '大安區', '信義區', '中正區', '中山區', '松山區', '萬華區', '大同區', '文山區', '內湖區', '南港區', '士林區', '北投區', '台大校區',
  ],
  '桃園市': [
    '桃園區', '中壢區', '平鎮區', '八德區', '楊梅區', '蘆竹區', '龜山區', '龍潭區', '大溪區', '大園區', '觀音區', '新屋區', '復興區',
  ],
  '新竹市': [
    '東區', '北區', '香山區', '新竹科學園區',
  ],
  '新竹縣': [
    '竹北市', '竹東鎮', '新豐鄉', '湖口鄉', '新埔鎮', '關西鎮', '芎林鄉', '寶山鄉',
  ],
  '苗栗縣': [
    '苗栗市', '頭份市', '竹南鎮', '後龍鎮', '苑裡鎮', '通霄鎮', '公館鄉', '三義鄉', '南庄鄉',
  ],
  '台中市': [
    '西屯區', '北屯區', '南屯區', '西區', '北區', '中區', '東區', '南區', '豐原區', '大里區', '太平區', '烏日區',
    '沙鹿區', '清水區', '大甲區', '潭子區', '大雅區', '神岡區', '后里區', '霧峰區', '龍井區', '梧棲區', '東勢區',
  ],
  '嘉義市': [
    '東區', '西區',
  ],
  '嘉義縣': [
    '太保市', '朴子市', '民雄鄉', '水上鄉', '中埔鄉', '新港鄉', '大林鎮',
  ],
  '台南市': [
    '安平區', '中西區', '東區', '北區', '南區', '安南區', '永康區', '仁德區', '歸仁區', '新營區', '善化區', '新市區',
    '麻豆區', '佳里區', '新化區', '鹽水區', '學甲區', '北門區', '七股區', '西港區', '安定區', '官田區', '六甲區', '白河區', '關廟區',
  ],
  '高雄市': [
    '左營區', '三民區', '前金區', '新興區', '苓雅區', '鹽埕區', '鳳山區', '前鎮區', '鼓山區', '楠梓區', '小港區',
    '旗津區', '仁武區', '鳥松區', '岡山區', '橋頭區', '路竹區', '大寮區', '林園區', '美濃區', '旗山區',
  ],
  '屏東縣': [
    '屏東市', '潮州鎮', '東港鎮', '恆春鎮', '麟洛鄉', '竹田鄉', '林邊鄉', '車城鄉', '內埔鄉', '萬丹鄉', '枋寮鄉',
  ],
  '台東縣': [
    '台東市', '卑南鄉', '成功鎮', '關山鎮', '池上鄉', '太麻里鄉', '鹿野鄉',
  ],
};

/** 依外勤人員北區/南區屬性排序優先顯示的縣市清單 */
function getOrderedCitiesForUser(u) {
  const allCities = Object.keys(FIELD_CITY_DISTRICTS);
  const name = u?.displayName || '';
  if (name.includes('陸逸群')) {
    const southFirst = ['高雄市', '台南市', '嘉義市', '嘉義縣', '屏東縣', '台東縣', '台中市'];
    return [...southFirst, ...allCities.filter(c => !southFirst.includes(c))];
  }
  const northFirst = ['新北市', '台北市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '台中市'];
  return [...northFirst, ...allCities.filter(c => !northFirst.includes(c))];
}

function getQuickChipsForUser(u) {
  if (!u) return ROLE_QUICK_CHIPS.operations;
  const name = u.displayName || '';
  const title = u.title || '';
  if (name.includes('張必忠') || title.includes('倉管')) return ROLE_QUICK_CHIPS.warehouse;
  if (name.includes('賴宜平') || title.includes('勞安')) return ROLE_QUICK_CHIPS.safety;
  if (name.includes('包于巧')) return ROLE_QUICK_CHIPS.inventory;
  if (name.includes('陳麒任') || name.includes('丁美云') || title.includes('採購')) return ROLE_QUICK_CHIPS.procurement;
  return ROLE_QUICK_CHIPS.operations;
}

/** 智慧合併地區文字：將「新北市」與「板橋區」自動收納為「新北市（板橋區、中和區）」 */
export function appendCityDistrictToRegionText(currentText, city, district) {
  if (!city) return currentText || '';
  const cur = String(currentText || '').trim();
  const distClean = String(district || '').trim();

  if (!distClean || distClean === '全區' || distClean === '不限行政區') {
    if (!cur) return city;
    if (cur.includes(city)) return cur;
    return `${cur}、${city}`;
  }

  // 若目前已包含「縣市（...）」結構，將新行政區插入該縣市括號內
  const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bracketRegex = new RegExp(`${escapedCity}（([^）]*)）`);
  const match = cur.match(bracketRegex);
  if (match) {
    const existingList = match[1].split(/[、,，\s]+/).map(s => s.trim()).filter(Boolean);
    if (!existingList.includes(distClean)) {
      existingList.push(distClean);
    }
    return cur.replace(bracketRegex, `${city}（${existingList.join('、')}）`);
  }

  // 若目前只有單純「縣市」二/三字，升級為「縣市（行政區）」
  const plainCityRegex = new RegExp(`(^|[、,，\\s])${escapedCity}($|[、,，\\s])`);
  if (plainCityRegex.test(cur)) {
    return cur.replace(plainCityRegex, `$1${city}（${distClean}）$2`);
  }

  const entry = `${city}（${distClean}）`;
  return cur ? `${cur}、${entry}` : entry;
}

/** 判斷一筆回報紀錄是否已完成填寫（支援內勤條列模式 與 外勤品管制式 3 題模式） */
export function isReportSubmitted(rep, u) {
  if (!rep) return false;
  if (isFieldStaff(u) || rep.reportType === 'field') {
    const hasRegion = !!(rep.fieldRegion && String(rep.fieldRegion).trim());
    const hasStations = rep.fieldStations !== undefined && rep.fieldStations !== '' && Number(rep.fieldStations) >= 0;
    return hasRegion && hasStations;
  }
  return !!(rep.todayTasks && String(rep.todayTasks).trim());
}

/**
 * 判斷目前登入者是否有權限查看某位組員的回報詳細內容：
 * 1. 內勤同仁（6位）的每日工作進度：比照目前 LINE 群組做法，全體組員皆可公開查看。
 * 2. 外勤品管同仁（3位：孔令淳、葉爵豪、陸逸群）的回報：因採另外回報機制，僅「代理副理（徐嘉鴻）」、「外勤代理人（包于巧）」與「填寫者本人」（及最高管理權限）可見，其他組員看不到。
 */
export function canViewReportContent(targetUid, rep = null) {
  const me = state.me;
  const myId = myUid();
  if (!me || !myId) return false;
  if (targetUid === myId) return true;
  if (isSupervisor(me) || isSystemDesigner(me)) return true;

  const targetUser = state.users.get(targetUid);
  // 常態外勤三人的回報內容：僅包于巧（外勤代理人）與徐嘉鴻（代理副理）及本人可見
  if (isFieldStaff(targetUser)) {
    return isFieldDeputy(me);
  }
  // 內勤同仁（含一般進度或每月支援外勤模擬體驗回報）：全體組員皆可看見
  return true;
}

/** 檢查某組員在指定日期是否有請假行程（typeId === 'leave'） */
export function getUserLeaveOnDate(uid, dateStr) {
  const list = eventsOfUserOn(uid, dateStr, eventList());
  const leaveItem = list.find(x => x.ev?.typeId === 'leave');
  return leaveItem ? leaveItem.ev : null;
}

/** 取得某組員在指定日期之前的最近一筆歷史回報（供「一鍵帶入昨日項目」使用） */
export function getPreviousUserReport(uid, beforeDateStr) {
  const u = state.users.get(uid);
  const sortedDates = [...state.dailyReports.keys()]
    .filter(d => d < beforeDateStr)
    .sort((a, b) => b.localeCompare(a));
  for (const d of sortedDates) {
    const doc = state.dailyReports.get(d);
    const rep = doc?.reports?.[uid];
    if (rep && isReportSubmitted(rep, u)) {
      return { date: d, report: rep };
    }
  }
  return null;
}

/** 產生個人專屬的 LINE 群組回報文字格式（自動區分外勤制式 3 題 / 內勤支援外勤模擬體驗 / 內勤工作進度） */
export function formatPersonalLineReport(u, dateStr, report) {
  const name = u?.displayName || '組員';
  const md = fmtMD(dateStr);
  const wd = weekdayZh(dateStr);
  const isRegularField = isFieldStaff(u);

  if (isRegularField || report?.reportType === 'field') {
    const region = (report?.fieldRegion || '').trim() || '（未填）';
    const stations = Number(report?.fieldStations) || 0;
    const v20 = Number(report?.fieldV20) || 0;
    const v20e = Number(report?.fieldV20E) || 0;
    const totalBikes = v20 + v20e;
    const titleLabel = isRegularField ? '外勤品管每日回報' : '外勤支援（模擬體驗）每日回報';
    const lines = [
      `【${md} (${wd}) ${titleLabel} - ${name}】`,
      `地區：${region}`,
      `稽查場站數：${stations} 站`,
      `2.0與2.0E的數量：2.0 共 ${v20} 台 / 2.0E 共 ${v20e} 台（合計 ${totalBikes} 台）`,
    ];
    if (report?.notes && report.notes.trim()) {
      lines.push(`備註事項：${report.notes.trim()}`);
    }
    return lines.join('\n');
  }

  const todayTasks = (report?.todayTasks || '').trim() || '（無）';
  const tomorrowTasks = (report?.tomorrowTasks || '').trim();
  const notes = (report?.notes || '').trim();

  const lines = [
    `【${md} (${wd}) 每日工作進度回報 - ${name}】`,
    `✅ 今日完成事項：`,
    todayTasks,
  ];
  if (tomorrowTasks) {
    lines.push('', `📅 明日預計工作 / 後續待辦：`, tomorrowTasks);
  }
  if (notes) {
    lines.push('', `💡 需主管協助 / 備註事項：`, notes);
  }
  return lines.join('\n');
}

/** 自動將多行文字整理為 1. 2. 3. 條列編號 */
function normalizeNumberedLines(text) {
  const rawLines = String(text || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  if (!rawLines.length) return '';
  return rawLines.map((line, idx) => {
    const cleaned = line.replace(/^(\d+[\.\、\)]|[-•*])\s*/, '');
    return `${idx + 1}. ${cleaned}`;
  }).join('\n');
}

/** 判斷某組員在某日的回報狀態 */
export function evaluateMemberReportStatus(u, dateStr) {
  const doc = dailyReportDocOf(dateStr);
  const rep = doc.reports?.[u.uid];
  const info = dayInfo(dateStr);
  const leaveEv = getUserLeaveOnDate(u.uid, dateStr);
  const hasSubmitted = isReportSubmitted(rep, u);

  if (hasSubmitted) {
    return { code: 'submitted', label: '✅ 已回報', tone: 'ok', report: rep, leaveEv };
  }
  if (isSupervisor(u)) {
    return { code: 'supervisor', label: '👔 代理副理（審閱）', tone: 'supervisor', report: rep, leaveEv };
  }
  if (doc.isTyphoonDay) {
    return { code: 'typhoon_exempt', label: '🌀 颱風假（免回報）', tone: 'typhoon', report: rep, leaveEv };
  }
  if (leaveEv || rep?.status === 'leave_exempt') {
    return { code: 'leave_exempt', label: '🏖️ 今日休假（免回報）', tone: 'leave', report: rep, leaveEv };
  }
  if (info.off) {
    return { code: 'holiday_exempt', label: `🎉 ${info.name || '例假日'}（免回報）`, tone: 'exempt', report: rep, leaveEv };
  }
  return { code: 'pending', label: '⏳ 待回報', tone: 'pending', report: rep, leaveEv };
}

// ============================================================
// 主畫面：📝 每日回報（#/dailyReport）
// ============================================================
export function mountDailyReport(root) {
  let selectedDate = ymd();
  let viewMode = 'daily'; // 'daily' | 'history'
  let editingUid = null;  // 本人展開編輯，或系統設計者展開唯讀預覽
  let historyFilterUid = 'all';
  let historyKeyword = '';
  let replyingUid = null;

  ensureRange(addDays(selectedDate, -30), addDays(selectedDate, 30)).then(() => render());

  function render() {
    const today = ymd();
    const doc = dailyReportDocOf(selectedDate);
    const info = dayInfo(selectedDate);
    const users = activeUsers();
    const me = state.me;
    const myId = myUid();
    const isSup = isSupervisor(me);
    const isDesigner = isSystemDesigner(me);
    const canViewAll = isSup || isDesigner;
    const canManage = isSup || isAdmin();

    // 分類組員：6 位內勤同仁、3 位外勤品管同仁、1 位代理副理
    const officeMembers = users.filter(u => isOfficeReporter(u));
    const fieldMembers = users.filter(u => isFieldStaff(u));
    const allReporters = users.filter(u => isDailyReporter(u)); // 共 9 位應回報同仁（6 內勤 + 3 外勤）
    const supervisors = users.filter(u => isSupervisor(u));

    // 計算當日全體 9 位應回報同仁進度統計
    const statuses = allReporters.map(u => ({ user: u, st: evaluateMemberReportStatus(u, selectedDate) }));
    const submittedCount = statuses.filter(x => x.st.code === 'submitted').length;
    const exemptCount = statuses.filter(x => ['typhoon_exempt', 'leave_exempt', 'holiday_exempt'].includes(x.st.code)).length;
    const pendingCount = statuses.filter(x => x.st.code === 'pending').length;

    const myReport = doc.reports?.[myId];
    const mySubmitted = isReportSubmitted(myReport, me);
    const myStatus = me ? evaluateMemberReportStatus(me, selectedDate) : null;

    root.innerHTML = `
      <div class="daily-report-page">
        <!-- 輕量化頂部標題與快速操作 -->
        <section class="card dr-hero-card" style="padding:14px 18px">
          <div class="dr-hero-top" style="margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <h1 class="dr-title" style="margin:0;font-size:19px">📝 每日工作進度回報</h1>
              <span class="info-pill-tip" data-tip="🏢 內勤同仁填寫今日工作進度（全員可見，每月支援外勤日可切換外勤回報分頁）；🚲 外勤三人制式回報 3 題（僅副理徐嘉鴻、代理人包于巧與本人可見）。🔒 嚴格防代填保護。">ⓘ 規則說明</span>
              <div class="compact-kpi-strip">
                <span class="kpi-chip" style="background:#F0FDF4;border-color:#BBF7D0;color:#166534">✅ 已回報 <b>${submittedCount}/${allReporters.length}</b></span>
                <span class="kpi-chip ${pendingCount > 0 ? 'danger' : ''}">⏳ 待回報 <b>${pendingCount}</b></span>
                ${exemptCount > 0 ? `<span class="kpi-chip">🏖️ 免回報 <b>${exemptCount}</b></span>` : ''}
              </div>
            </div>
            <div class="dr-hero-actions">
              <button type="button" class="btn sm ghost guide-btn" data-open-dr-tour title="啟動每日回報 6 步實景聚焦導覽">
                🎯 導覽
              </button>
              ${!isSup ? `
                <button class="btn sm primary dr-quick-btn" data-open-quick="${esc(selectedDate)}">
                  ✍️ ${mySubmitted ? '修改我的回報' : '填寫今日回報'}
                </button>
              ` : ''}
              ${mySubmitted ? `
                <button class="btn sm dr-copy-mine-btn" data-copy-personal="${esc(myId)}">
                  📋 複製 LINE 格式
                </button>
              ` : ''}
            </div>
          </div>

          <!-- 模式切換與日期導覽列 -->
          <div class="dr-toolbar">
            <div class="dr-view-tabs">
              <button class="dr-tab-btn ${viewMode === 'daily' ? 'active' : ''}" data-view-mode="daily">📅 單日看板</button>
              <button class="dr-tab-btn ${viewMode === 'history' ? 'active' : ''}" data-view-mode="history">🔍 歷史檢索</button>
            </div>

            ${viewMode === 'daily' ? `
              <div class="dr-date-nav">
                <button class="btn sm" data-shift-day="-1" title="前一天">‹</button>
                <input type="date" class="dr-date-input" data-pick-date value="${esc(selectedDate)}">
                <span class="dr-date-label">
                  ${esc(fmtMD(selectedDate))}（${esc(weekdayZh(selectedDate))}）
                  ${selectedDate === today ? '<span class="dr-today-pill">今天</span>' : ''}
                  ${info.off ? `<span class="dr-holiday-pill">🎉 ${esc(info.name || '例假日')}</span>` : ''}
                </span>
                <button class="btn sm" data-shift-day="1" title="後一天">›</button>
                ${selectedDate !== today ? `<button class="btn sm" data-go-today>今天</button>` : ''}
              </div>
            ` : ''}

            <div class="dr-typhoon-ctrl">
              <button class="btn sm ${doc.isTyphoonDay ? 'dr-typhoon-active' : ''}" data-toggle-typhoon>
                🌀 ${doc.isTyphoonDay ? '取消颱風免回報' : '颱風免回報'}
              </button>
            </div>
          </div>

          ${doc.isTyphoonDay ? `
            <div class="dr-typhoon-banner">
              <span class="dr-typhoon-icon">🌀</span>
              <div><strong>${esc(doc.typhoonNote || '今日為颱風停班停課日 — 全體同仁免回報')}</strong></div>
            </div>
          ` : ''}
        </section>

        ${viewMode === 'daily' ? renderDailyBoard({
          selectedDate, today, doc, info, officeMembers, fieldMembers, allReporters, supervisors,
          statuses, submittedCount, exemptCount, pendingCount, me, myId, myStatus, isSup, isDesigner, canManage,
        }) : renderHistoryExplorer({ users, canViewAll, myId })}
      </div>
    `;

    bindEvents(users, doc, isDesigner);
  }

  function renderDailyBoard({
    selectedDate, doc, officeMembers, fieldMembers, supervisors,
    myId, isSup, isDesigner, canManage,
  }) {
    return `
      <!-- 外勤品管 3 位同仁制式回報區 -->
      <section class="dr-section" id="dr-field-section">
        <div class="dr-section-head">
          <h2>🚲 外勤品管稽查回報（${fieldMembers.length} 位）</h2>
          <span class="info-pill-tip" data-tip="外勤回報內容僅代理副理（徐嘉鴻）、外勤代理人（包于巧）與填寫者本人可見">🔒 權限保護</span>
        </div>
        <div class="dr-cards-grid">
          ${fieldMembers.map(u => renderMemberCard(u, selectedDate, doc, myId, isSup, isDesigner, canManage)).join('')}
        </div>
      </section>

      <!-- 內勤 6 位組員每日回報卡片區 -->
      <section class="dr-section" id="dr-office-section">
        <div class="dr-section-head">
          <h2>🏢 內勤同仁工作進度（${officeMembers.length} 位）</h2>
          <span class="info-pill-tip" data-tip="內勤工作進度全體組員皆可公開查看；每月支援外勤模擬體驗日可於填寫時切換『🚲 外勤支援回報』分頁">👥 全員公開</span>
        </div>
        <div class="dr-cards-grid">
          ${officeMembers.map(u => renderMemberCard(u, selectedDate, doc, myId, isSup, isDesigner, canManage)).join('')}
        </div>
      </section>

      <!-- 代理副理審閱狀態區 -->
      ${supervisors.length ? `
        <section class="dr-section" id="dr-exempt-section">
          <div class="dr-section-head">
            <h2>👔 代理副理審閱專區</h2>
          </div>
          <div class="dr-cards-grid compact">
            ${supervisors.map(u => renderSupervisorCard(u)).join('')}
          </div>
        </section>
      ` : ''}
    `;
  }

  function renderSupervisorCard(u) {
    const isMe = u.uid === myUid();
    return `
      <article class="card dr-member-card tone-supervisor ${isMe ? 'is-me' : ''} compact" id="dr-card-${esc(u.uid)}">
        <div class="dr-card-head">
          <div class="dr-user-info">
            ${avatar(u, 38)}
            <div>
              <div class="dr-user-name">
                ${esc(u.displayName)}
                ${isMe ? '<span class="dr-me-tag">我</span>' : ''}
              </div>
              <div class="dr-user-title">${esc(u.title || '經營Team代理副理')}</div>
            </div>
          </div>
          <span class="dr-status-badge tone-supervisor">👔 代理副理（全組內容審閱權限）</span>
        </div>
        <div class="dr-empty-body">
          <span class="muted">🔑 擁有全組 9 位內外勤同仁每日回報內容之完整查閱、「👍 已閱」簽核與「💬 主管回饋」權限。</span>
        </div>
      </article>
    `;
  }

  let editingModeOverride = null; // 供內勤同仁切換 'office' (一般進度) | 'field' (每月支援外勤模擬體驗)

  function renderMemberCard(u, dateStr, doc, myId, isSup, isDesigner, canManage) {
    const st = evaluateMemberReportStatus(u, dateStr);
    const rep = st.report || {};
    const isMe = u.uid === myId;
    const isField = isFieldStaff(u);
    const hasSubmitted = isReportSubmitted(rep, u);

    // 一般組員嚴格限定本人填寫（防止代填）；最高管理權限者預設擁有完整管理與表單操作權限（無額外提示字樣）
    const canEditThis = isMe || isDesigner;
    const isEditing = editingUid === u.uid && canEditThis;

    // 內勤同仁展開編輯時，支援分頁切換「🏢 內勤工作進度（預設）」與「🚲 外勤支援（模擬體驗）」
    const activeEditorMode = isField
      ? 'field'
      : (editingModeOverride || (rep.reportType === 'field' ? 'field' : 'office'));

    // 內勤全體可見；外勤僅代理副理（徐嘉鴻）、外勤代理人（包于巧）與本人可見
    const canSeeDetails = canViewReportContent(u.uid, rep);

    const ackList = Object.values(rep.ackBy || {});
    const myAck = !!(rep.ackBy && rep.ackBy[myId]);
    const prevEntry = isEditing ? getPreviousUserReport(u.uid, dateStr) : null;
    const chips = isEditing && activeEditorMode === 'office' ? getQuickChipsForUser(u) : [];

    return `
      <article class="card dr-member-card tone-${esc(st.tone)} ${isMe ? 'is-me' : ''} ${isEditing ? 'is-editing' : ''}" id="dr-card-${esc(u.uid)}">
        <div class="dr-card-head">
          <div class="dr-user-info">
            ${avatar(u, 38)}
            <div>
              <div class="dr-user-name">
                ${esc(u.displayName)}
                ${isMe ? '<span class="dr-me-tag">我</span>' : ''}
                ${isField ? '<span class="dr-role-pill field">🚲 外勤品管</span>' : '<span class="dr-role-pill office">🏢 內勤</span>'}
                ${(!isField && rep.reportType === 'field' && hasSubmitted) ? '<span class="dr-role-pill field" title="當日支援外勤模擬體驗">🚲 外勤支援</span>' : ''}
              </div>
              <div class="dr-user-title">${esc(u.title || '經營 Team 組員')}</div>
            </div>
          </div>
          <span class="dr-status-badge tone-${esc(st.tone)}">${esc(st.label)}</span>
        </div>

        ${st.leaveEv ? `
          <div class="dr-leave-notice">
            🏖️ 行事曆已登記休假：<strong>${esc(st.leaveEv.reason || '休假')}</strong>（今日免回報）
          </div>
        ` : ''}

        ${isEditing ? (
          activeEditorMode === 'field'
            ? renderFieldInlineEditor(u, rep, prevEntry, !isField)
            : renderOfficeInlineEditor(u, rep, prevEntry, chips, !isField)
        ) : (
          hasSubmitted ? (
            canSeeDetails ? (
              (isField || rep.reportType === 'field') ? renderFieldReportBody(rep, !isField) : renderOfficeReportBody(rep)
            ) : `
              <div class="dr-private-mask">
                <span class="dr-lock-icon">🔒</span>
                <div>
                  <strong>${esc(u.displayName)} 已完成今日回報</strong>
                  <div class="muted" style="font-size:12px">外勤回報內容僅代理副理（徐嘉鴻）、代理人（包于巧）與本人可見</div>
                </div>
              </div>
            `
          ) : `
            <div class="dr-empty-body">
              ${st.code === 'pending'
                ? '<span class="muted">今日尚未填寫工作進度回報</span>'
                : `<span class="muted">${esc(st.label)}，如需補充紀錄可由本人點擊填寫</span>`}
            </div>
          `
        )}

        <!-- 主管已閱與回饋區 -->
        ${(ackList.length > 0 || (canSeeDetails && rep.managerReply)) ? `
          <div class="dr-ack-box">
            ${ackList.length > 0 ? `
              <div class="dr-ack-badges">
                ${ackList.map(a => `<span class="dr-ack-pill">👍 ${esc(a.name)} 已閱</span>`).join('')}
              </div>
            ` : ''}
            ${(canSeeDetails && rep.managerReply) ? `
              <div class="dr-manager-reply">
                <strong>💬 ${esc(rep.managerReplyBy || '代理副理')} 回饋：</strong>${esc(rep.managerReply)}
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${(canManage && replyingUid === u.uid) ? `
          <div class="dr-reply-editor">
            <input type="text" data-reply-input="${esc(u.uid)}" placeholder="輸入給 ${esc(u.displayName)} 的主管回饋或勉勵..." value="${esc(rep.managerReply || '')}">
            <div class="dr-reply-btns">
              <button class="btn sm" data-cancel-reply>取消</button>
              <button class="btn sm primary" data-save-reply="${esc(u.uid)}">💬 儲存回饋並標記已閱</button>
            </div>
          </div>
        ` : ''}

        <!-- 卡片底部操作列 -->
        ${!isEditing ? `
          <div class="dr-card-foot">
            <div class="dr-foot-left">
              ${canEditThis ? `
                <button class="btn sm ${!hasSubmitted && isMe ? 'primary' : ''}" data-start-edit="${esc(u.uid)}">
                  ✍️ ${hasSubmitted ? '編輯回報' : '填寫回報'}
                </button>
              ` : ''}
              ${(hasSubmitted && canSeeDetails) ? `
                <button class="btn sm" data-copy-personal="${esc(u.uid)}" title="複製個人 LINE 回報格式">
                  📋 複製 LINE 格式
                </button>
                ${isMe ? `
                  <a class="btn sm dr-line-link" href="https://line.me/R/" target="_blank" rel="noopener" title="開啟 LINE App 貼上">
                    💬 開啟 LINE
                  </a>
                ` : ''}
              ` : ''}
            </div>

            <div class="dr-foot-right">
              ${(canManage && hasSubmitted) ? `
                <button class="btn sm ${myAck ? 'dr-ack-active' : ''}" data-toggle-ack="${esc(u.uid)}" data-ack-val="${myAck ? '0' : '1'}">
                  👍 ${myAck ? '已閱' : '點選已閱'}
                </button>
                <button class="btn sm" data-open-reply="${esc(u.uid)}" title="留下主管回饋">
                  💬 回饋
                </button>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </article>
    `;
  }

  /** 內勤同仁專屬：回報模式切換分頁列（一般工作進度 vs. 每月支援外勤模擬體驗） */
  function renderOfficeModeTabs(uid, activeMode) {
    return `
      <div class="dr-office-mode-tabs" style="display:flex; gap:6px; margin-bottom:12px; padding:4px; background:#f1f5f9; border-radius:10px; border:1px solid #e2e8f0;">
        <button type="button" class="dr-mode-tab-btn ${activeMode === 'office' ? 'active' : ''}" data-switch-edit-mode="office" data-target-uid="${esc(uid)}"
          style="flex:1; padding:7px 12px; border-radius:7px; border:none; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; ${activeMode === 'office' ? 'background:#fff; color:#0f172a; box-shadow:0 1px 3px rgba(15,23,42,.08);' : 'background:transparent; color:#64748b;'}">
          🏢 內勤工作進度（日常預設）
        </button>
        <button type="button" class="dr-mode-tab-btn ${activeMode === 'field' ? 'active' : ''}" data-switch-edit-mode="field" data-target-uid="${esc(uid)}"
          style="flex:1; padding:7px 12px; border-radius:7px; border:none; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; ${activeMode === 'field' ? 'background:#fff; color:#0369a1; box-shadow:0 1px 3px rgba(15,23,42,.08);' : 'background:transparent; color:#64748b;'}">
          🚲 外勤支援回報（每月模擬體驗）
        </button>
      </div>
    `;
  }

  /** 外勤品管 / 內勤支援外勤模擬體驗：制式化 3 題行內編輯器（含「縣市 ➔ 行政區」連動下拉選單） */
  function renderFieldInlineEditor(u, rep, prevEntry, showModeSwitcher = false) {
    const v20 = rep.fieldV20 !== undefined ? rep.fieldV20 : '';
    const v20e = rep.fieldV20E !== undefined ? rep.fieldV20E : '';
    const total = (Number(v20) || 0) + (Number(v20e) || 0);
    const cities = getOrderedCitiesForUser(u);
    const defaultCity = cities[0] || '新北市';
    const defaultDistricts = FIELD_CITY_DISTRICTS[defaultCity] || [];

    return `
      <div class="dr-inline-editor field-mode" data-editor-for="${esc(u.uid)}" data-editor-mode="field">
        ${showModeSwitcher ? renderOfficeModeTabs(u.uid, 'field') : ''}
        <div class="dr-editor-top-tools">
          <span class="dr-field-mode-tag">${showModeSwitcher ? '🚲 內勤支援外勤（模擬體驗）回報（3 項必填）' : '🚲 外勤品管制式回報（3 項必填）'}</span>
          ${prevEntry ? `
            <button type="button" class="btn sm dr-import-prev-btn" data-import-prev="${esc(u.uid)}">
              📥 帶入前次地區與數據（${esc(fmtMD(prevEntry.date))}）
            </button>
          ` : ''}
        </div>

        <!-- 縣市 ➔ 行政區 二階連動下拉選單 -->
        <div class="dr-cascade-box">
          <div class="dr-cascade-title">📍 縣市與行政區連動選擇器 <small class="muted">（選擇縣市後自動切換對應行政區，點選即可自動加入下方地區欄，支援同日多區）</small></div>
          <div class="dr-cascade-row">
            <label class="dr-cascade-col">
              <span>① 選擇縣市</span>
              <select data-cascade-city="${esc(u.uid)}">
                ${cities.map(c => `<option value="${esc(c)}" ${c === defaultCity ? 'selected' : ''}>${esc(c)}</option>`).join('')}
              </select>
            </label>
            <label class="dr-cascade-col">
              <span>② 選擇行政區（自動帶入）</span>
              <select data-cascade-dist="${esc(u.uid)}">
                <option value="">-- 請選擇 ${esc(defaultCity)} 行政區 --</option>
                <option value="全區">📌 ${esc(defaultCity)}（不限行政區 / 全區）</option>
                ${defaultDistricts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
              </select>
            </label>
            <div class="dr-cascade-actions">
              <button type="button" class="btn sm primary" data-cascade-add="${esc(u.uid)}">＋ 加入地區</button>
              <button type="button" class="btn sm ghost" data-cascade-clear="${esc(u.uid)}" title="清空地區欄">清空</button>
            </div>
          </div>
        </div>

        <label class="dr-field">
          <span>1️⃣ 地區 <small class="muted">（必填，由上方連動選單自動帶入，亦可直接手動補充微調）</small></span>
          <input type="text" data-f-region="${esc(u.uid)}" placeholder="例如：新北市（板橋區、中和區）..." value="${esc(rep.fieldRegion || '')}">
        </label>

        <div class="dr-field-row3">
          <label class="dr-field">
            <span>2️⃣ 稽查場站數 <small class="muted">（站）</small></span>
            <input type="number" min="0" step="1" inputmode="numeric" data-f-stations="${esc(u.uid)}" placeholder="0" value="${esc(rep.fieldStations ?? '')}">
          </label>
          <label class="dr-field">
            <span>3️⃣ YouBike 2.0 數量 <small class="muted">（台）</small></span>
            <input type="number" min="0" step="1" inputmode="numeric" data-f-v20="${esc(u.uid)}" placeholder="0" value="${esc(v20)}">
          </label>
          <label class="dr-field">
            <span>⚡ YouBike 2.0E 數量 <small class="muted">（台）</small></span>
            <input type="number" min="0" step="1" inputmode="numeric" data-f-v20e="${esc(u.uid)}" placeholder="0" value="${esc(v20e)}">
          </label>
        </div>

        <div class="dr-bike-sum-bar" data-bike-sum="${esc(u.uid)}">
          🚲 2.0 與 2.0E 合計稽查車輛數：<strong>${total} 台</strong>（2.0：${Number(v20) || 0} 台 ＋ 2.0E：${Number(v20e) || 0} 台）
        </div>

        <label class="dr-field">
          <span>💡 補充備註事項 <small class="muted">（選填）</small></span>
          <input type="text" data-f-notes="${esc(u.uid)}" placeholder="例如：特殊異常回報、跨區支援說明..." value="${esc(rep.notes || '')}">
        </label>

        <div class="dr-editor-actions">
          <button type="button" class="btn sm" data-cancel-edit>取消</button>
          <button type="button" class="btn sm" data-save-only="${esc(u.uid)}">💾 儲存</button>
          <button type="button" class="btn sm primary" data-save-and-copy="${esc(u.uid)}">
            📋 儲存並複製 LINE
          </button>
        </div>
      </div>
    `;
  }

  /** 內勤同仁專屬：條列式工作進度行內編輯器 */
  function renderOfficeInlineEditor(u, rep, prevEntry, chips, showModeSwitcher = false) {
    return `
      <div class="dr-inline-editor" data-editor-for="${esc(u.uid)}" data-editor-mode="office">
        ${showModeSwitcher ? renderOfficeModeTabs(u.uid, 'office') : ''}
        <div class="dr-editor-top-tools">
          ${prevEntry ? `
            <button type="button" class="btn sm dr-import-prev-btn" data-import-prev="${esc(u.uid)}">
              📥 一鍵帶入前次項目（${esc(fmtMD(prevEntry.date))}）
            </button>
          ` : `<span class="muted" style="font-size:12px">💡 可點選下方常用詞彙快速帶入</span>`}
          <button type="button" class="btn sm" data-auto-number="${esc(u.uid)}">🔢 自動整理編號</button>
        </div>

        <div class="dr-chip-bar">
          <span class="dr-chip-label">⚡ ${esc(u.displayName)} 職務專屬快選詞彙：</span>
          ${chips.map(c => `<button type="button" class="dr-phrase-chip" data-insert-chip="${esc(c)}" data-target-uid="${esc(u.uid)}">＋ ${esc(c)}</button>`).join('')}
        </div>

        <label class="dr-field">
          <span>✅ 今日完成事項 / 工作進度 <small class="muted">（必填，每行一項）</small></span>
          <textarea rows="4" data-f-today="${esc(u.uid)}" placeholder="1. 完成...&#10;2. 追蹤...">${esc(rep.todayTasks || '')}</textarea>
        </label>

        <label class="dr-field">
          <span>📅 明日預計工作 / 後續待辦 <small class="muted">（選填）</small></span>
          <textarea rows="2" data-f-tomorrow="${esc(u.uid)}" placeholder="1. 預計處理...">${esc(rep.tomorrowTasks || '')}</textarea>
        </label>

        <label class="dr-field">
          <span>💡 需主管協助 / 備註事項 <small class="muted">（選填）</small></span>
          <input type="text" data-f-notes="${esc(u.uid)}" placeholder="例如：合約待核章、需跨部門協調事項..." value="${esc(rep.notes || '')}">
        </label>

        <div class="dr-editor-actions">
          <button type="button" class="btn sm" data-cancel-edit>取消</button>
          <button type="button" class="btn sm" data-save-only="${esc(u.uid)}">💾 儲存</button>
          <button type="button" class="btn sm primary" data-save-and-copy="${esc(u.uid)}">
            📋 儲存並複製 LINE
          </button>
        </div>
      </div>
    `;
  }

  /** 外勤品管 / 內勤支援外勤模擬體驗 已填寫內容顯示區 */
  function renderFieldReportBody(rep, isOfficeSupport = false) {
    const v20 = Number(rep.fieldV20) || 0;
    const v20e = Number(rep.fieldV20E) || 0;
    const total = v20 + v20e;
    return `
      <div class="dr-report-body field-summary">
        ${isOfficeSupport ? `<div style="font-size:12px; font-weight:700; color:#0369a1; margin-bottom:6px;">🚲 當日支援外勤（模擬體驗）稽查回報</div>` : ''}
        <div class="dr-field-metrics">
          <div class="dr-f-metric">
            <span class="dr-fm-label">📍 地區</span>
            <strong class="dr-fm-val">${esc(rep.fieldRegion || '—')}</strong>
          </div>
          <div class="dr-f-metric">
            <span class="dr-fm-label">🚏 稽查場站數</span>
            <strong class="dr-fm-val">${esc(String(rep.fieldStations ?? 0))} 站</strong>
          </div>
          <div class="dr-f-metric wide">
            <span class="dr-fm-label">🚲 2.0 與 2.0E 的數量</span>
            <strong class="dr-fm-val">2.0：${v20} 台 ／ 2.0E：${v20e} 台 <span class="dr-fm-total">（合計 ${total} 台）</span></strong>
          </div>
        </div>
        ${rep.notes ? `
          <div class="dr-block note" style="margin-top:6px">
            <div class="dr-block-title">💡 備註事項</div>
            <div class="dr-block-text">${esc(rep.notes)}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /** 內勤已填寫內容顯示區（全體組員皆可查看，預設顯示精簡摘要，若有明日預計或備註則可展開） */
  function renderOfficeReportBody(rep) {
    const lines = String(rep.todayTasks || '').trim().split('\n').filter(Boolean);
    const hasExtra = !!(rep.tomorrowTasks || rep.notes || lines.length > 3);
    const previewLines = lines.slice(0, 3).join('\n');

    if (!hasExtra) {
      return `
        <div class="dr-report-body">
          <div class="dr-block">
            <div class="dr-block-title">✅ 今日完成</div>
            <div class="dr-block-text">${esc(rep.todayTasks).replace(/\n/g, '<br>')}</div>
          </div>
        </div>
      `;
    }

    return `
      <details class="dr-report-body dr-collapsible-report">
        <summary class="dr-collapsible-summary">
          <div class="dr-block" style="margin:0;flex:1">
            <div class="dr-block-title" style="display:flex;justify-content:space-between;align-items:center">
              <span>✅ 今日完成（共 ${lines.length} 項）</span>
              <span class="dr-expand-hint">▸ 點擊展開完整內容</span>
            </div>
            <div class="dr-block-text">${esc(previewLines).replace(/\n/g, '<br>')}${lines.length > 3 ? '<span class="muted"> …</span>' : ''}</div>
          </div>
        </summary>
        <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)">
          ${lines.length > 3 ? `
            <div class="dr-block">
              <div class="dr-block-title">✅ 完整今日完成事項</div>
              <div class="dr-block-text">${esc(rep.todayTasks).replace(/\n/g, '<br>')}</div>
            </div>
          ` : ''}
          ${rep.tomorrowTasks ? `
            <div class="dr-block">
              <div class="dr-block-title">📅 明日預計 / 待辦</div>
              <div class="dr-block-text">${esc(rep.tomorrowTasks).replace(/\n/g, '<br>')}</div>
            </div>
          ` : ''}
          ${rep.notes ? `
            <div class="dr-block note">
              <div class="dr-block-title">💡 備註 / 需協助事項</div>
              <div class="dr-block-text">${esc(rep.notes)}</div>
            </div>
          ` : ''}
        </div>
      </details>
    `;
  }

  function renderHistoryExplorer({ users }) {
    // 蒐集歷史回報紀錄（內勤全員可見；外勤僅徐嘉鴻、包于巧與本人可見）
    const viewableUsers = users.filter(u => !isSupervisor(u) && canViewReportContent(u.uid));
    const entries = [];
    const sortedDates = [...state.dailyReports.keys()].sort((a, b) => b.localeCompare(a));
    for (const d of sortedDates) {
      const doc = state.dailyReports.get(d);
      const reps = doc?.reports || {};
      for (const [uid, rep] of Object.entries(reps)) {
        if (!canViewReportContent(uid, rep)) continue;
        const u = state.users.get(uid);
        if (!isReportSubmitted(rep, u)) continue;
        if (historyFilterUid !== 'all' && uid !== historyFilterUid) continue;
        const textBlob = `${u?.displayName || ''} ${rep.todayTasks || ''} ${rep.tomorrowTasks || ''} ${rep.fieldRegion || ''} ${rep.notes || ''} ${rep.managerReply || ''}`.toLowerCase();
        if (historyKeyword.trim() && !textBlob.includes(historyKeyword.trim().toLowerCase())) continue;
        entries.push({ date: d, uid, user: u, report: rep });
      }
    }

    return `
      <section class="card pad dr-history-section">
        <div class="dr-history-filters">
          <label class="dr-filter-item">
            <span>👤 篩選組員：</span>
            <select data-history-uid>
              <option value="all" ${historyFilterUid === 'all' ? 'selected' : ''}>全部可查閱組員（${viewableUsers.length} 人）</option>
              ${viewableUsers.map(u => `<option value="${esc(u.uid)}" ${historyFilterUid === u.uid ? 'selected' : ''}>${esc(u.displayName)}（${esc(u.title || '')}）</option>`).join('')}
            </select>
          </label>
          <label class="dr-filter-item grow">
            <span>🔍 關鍵字搜尋：</span>
            <input type="search" data-history-kw placeholder="搜尋地區、工作內容、採購、倉管、勞安..." value="${esc(historyKeyword)}">
          </label>
        </div>

        <div class="dr-history-list">
          ${entries.length ? entries.map(item => {
            const isField = isFieldStaff(item.user) || item.report.reportType === 'field';
            const v20 = Number(item.report.fieldV20) || 0;
            const v20e = Number(item.report.fieldV20E) || 0;
            return `
              <div class="dr-history-row">
                <div class="dr-history-meta">
                  <button class="dr-history-date-btn" data-jump-date="${esc(item.date)}">
                    📅 ${esc(item.date)}（週${esc(weekdayZh(item.date))}）
                  </button>
                  <div class="dr-history-user">
                    ${avatar(item.user, 28)}
                    <strong>${esc(item.user?.displayName || item.uid)}</strong>
                    <span class="muted">${esc(item.user?.title || '')}</span>
                  </div>
                </div>
                <div class="dr-history-content">
                  ${isField ? `
                    <div><strong>📍 地區：</strong>${esc(item.report.fieldRegion || '—')}</div>
                    <div><strong>🚏 稽查場站數：</strong>${esc(String(item.report.fieldStations ?? 0))} 站</div>
                    <div><strong>🚲 2.0與2.0E的數量：</strong>2.0 共 ${v20} 台 / 2.0E 共 ${v20e} 台（合計 ${v20 + v20e} 台）</div>
                  ` : `
                    <div><strong>✅ 今日完成：</strong><br>${esc(item.report.todayTasks).replace(/\n/g, '<br>')}</div>
                    ${item.report.tomorrowTasks ? `<div style="margin-top:6px"><strong>📅 明日預計：</strong><br>${esc(item.report.tomorrowTasks).replace(/\n/g, '<br>')}</div>` : ''}
                  `}
                  ${item.report.notes ? `<div style="margin-top:6px"><strong>💡 備註：</strong>${esc(item.report.notes)}</div>` : ''}
                </div>
                <div class="dr-history-actions">
                  <button class="btn sm" data-copy-history="${esc(item.date)}" data-copy-uid="${esc(item.uid)}">📋 複製 LINE 格式</button>
                </div>
              </div>
            `;
          }).join('') : `<p class="muted" style="text-align:center;padding:32px 0">查無符合條件的歷史回報紀錄</p>`}
        </div>
      </section>
    `;
  }

  function bindEvents(users, doc, isDesigner) {
    // 切換單日看板 / 歷史檢索
    root.querySelectorAll('[data-view-mode]').forEach(btn => {
      btn.onclick = () => {
        viewMode = btn.dataset.viewMode;
        render();
      };
    });

    // 日期切換
    root.querySelectorAll('[data-shift-day]').forEach(btn => {
      btn.onclick = async () => {
        selectedDate = addDays(selectedDate, Number(btn.dataset.shiftDay));
        editingUid = null;
        await ensureRange(addDays(selectedDate, -7), addDays(selectedDate, 7));
        render();
      };
    });

    const dateInput = root.querySelector('[data-pick-date]');
    if (dateInput) {
      dateInput.onchange = async () => {
        if (!dateInput.value) return;
        selectedDate = dateInput.value;
        editingUid = null;
        await ensureRange(addDays(selectedDate, -7), addDays(selectedDate, 7));
        render();
      };
    }

    const goTodayBtn = root.querySelector('[data-go-today]');
    if (goTodayBtn) {
      goTodayBtn.onclick = () => {
        selectedDate = ymd();
        editingUid = null;
        render();
      };
    }

    // 颱風天免回報切換
    const typhoonBtn = root.querySelector('[data-toggle-typhoon]');
    if (typhoonBtn) {
      typhoonBtn.onclick = async () => {
        const nextVal = !doc.isTyphoonDay;
        await toggleTyphoonDay(selectedDate, nextVal, '🌀 颱風停班停課（全體同仁免回報）');
        toast(nextVal ? `🌀 已將 ${fmtMD(selectedDate)} 設為颱風天免回報` : `已恢復 ${fmtMD(selectedDate)} 為一般工作日回報`);
        render();
      };
    }

    // 頂部快速填寫彈窗按鈕與每日回報導覽按鈕
    const drTourBtn = root.querySelector('[data-open-dr-tour]');
    if (drTourBtn) {
      drTourBtn.onclick = () => startInteractiveDailyReportSpotlightTour();
    }

    root.querySelectorAll('[data-open-quick]').forEach(btn => {
      btn.onclick = () => openQuickDailyReportSheet(btn.dataset.openQuick || selectedDate);
    });

    // 展開行內編輯（本人填寫，或系統設計者展開預覽設定）
    root.querySelectorAll('[data-start-edit]').forEach(btn => {
      btn.onclick = () => {
        const targetId = btn.dataset.startEdit;
        if (targetId !== myUid() && !isDesigner) {
          toast('每日回報僅限本人親自填寫，無法代填喔！', 'error');
          return;
        }
        editingUid = targetId;
        editingModeOverride = null;
        render();
        const firstInput = root.querySelector(`[data-f-region="${editingUid}"], [data-f-today="${editingUid}"]`);
        if (firstInput) firstInput.focus();
      };
    });

    // 內勤同仁切換「🏢 內勤工作進度 / 🚲 外勤支援回報（每月模擬體驗）」分頁
    root.querySelectorAll('[data-switch-edit-mode]').forEach(tabBtn => {
      tabBtn.onclick = () => {
        editingModeOverride = tabBtn.dataset.switchEditMode;
        render();
        const firstInput = root.querySelector(`[data-f-region="${editingUid}"], [data-f-today="${editingUid}"]`);
        if (firstInput) firstInput.focus();
      };
    });

    const cancelEditBtn = root.querySelector('[data-cancel-edit]');
    if (cancelEditBtn) {
      cancelEditBtn.onclick = () => {
        editingUid = null;
        editingModeOverride = null;
        render();
      };
    }

    // 一鍵帶入前次項目（同時支援內勤與外勤品管/支援模式）
    root.querySelectorAll('[data-import-prev]').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.dataset.importPrev;
        const prev = getPreviousUserReport(uid, selectedDate);
        if (!prev) return toast('查無前次歷史回報紀錄');
        const editorEl = root.querySelector(`[data-editor-for="${uid}"]`);
        const isFieldMode = editorEl?.dataset.editorMode === 'field';
        if (isFieldMode) {
          const regIn = root.querySelector(`[data-f-region="${uid}"]`);
          const stIn = root.querySelector(`[data-f-stations="${uid}"]`);
          const v20In = root.querySelector(`[data-f-v20="${uid}"]`);
          const v20eIn = root.querySelector(`[data-f-v20e="${uid}"]`);
          if (regIn) regIn.value = prev.report.fieldRegion || '';
          if (stIn) stIn.value = prev.report.fieldStations ?? '';
          if (v20In) v20In.value = prev.report.fieldV20 ?? '';
          if (v20eIn) v20eIn.value = prev.report.fieldV20E ?? '';
          updateFieldBikeSum(uid);
          toast(`📥 已帶入 ${fmtMD(prev.date)} 的外勤稽查數據，請直接微調！`);
        } else {
          const todayTa = root.querySelector(`[data-f-today="${uid}"]`);
          const tomorrowTa = root.querySelector(`[data-f-tomorrow="${uid}"]`);
          const seedToday = (prev.report.tomorrowTasks || '').trim() || (prev.report.todayTasks || '').trim();
          if (todayTa) todayTa.value = normalizeNumberedLines(seedToday);
          if (tomorrowTa && !tomorrowTa.value.trim()) tomorrowTa.value = prev.report.tomorrowTasks || '';
          toast(`📥 已帶入 ${fmtMD(prev.date)} 的回報項目，請直接微調！`);
        }
      };
    });

    // 外勤品管：縣市 ➔ 行政區 二階連動下拉選單事件
    root.querySelectorAll('[data-cascade-city]').forEach(citySel => {
      citySel.onchange = () => {
        const uid = citySel.dataset.cascadeCity;
        const city = citySel.value;
        const distSel = root.querySelector(`[data-cascade-dist="${uid}"]`);
        if (!distSel) return;
        const districts = FIELD_CITY_DISTRICTS[city] || [];
        distSel.innerHTML = `
          <option value="">-- 請選擇 ${esc(city)} 行政區 --</option>
          <option value="全區">📌 ${esc(city)}（不限行政區 / 全區）</option>
          ${districts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
        `;
      };
    });

    // 選擇第二層行政區時，自動合併帶入下方「1️⃣ 地區」欄位
    root.querySelectorAll('[data-cascade-dist]').forEach(distSel => {
      distSel.onchange = () => {
        const uid = distSel.dataset.cascadeDist;
        const dist = distSel.value;
        if (!dist) return;
        const citySel = root.querySelector(`[data-cascade-city="${uid}"]`);
        const regIn = root.querySelector(`[data-f-region="${uid}"]`);
        if (!citySel || !regIn) return;
        regIn.value = appendCityDistrictToRegionText(regIn.value, citySel.value, dist);
      };
    });

    // 點擊「＋加入地區」按鈕（若未選行政區則直接加入該縣市，已選則加入縣市＋行政區）
    root.querySelectorAll('[data-cascade-add]').forEach(addBtn => {
      addBtn.onclick = () => {
        const uid = addBtn.dataset.cascadeAdd;
        const citySel = root.querySelector(`[data-cascade-city="${uid}"]`);
        const distSel = root.querySelector(`[data-cascade-dist="${uid}"]`);
        const regIn = root.querySelector(`[data-f-region="${uid}"]`);
        if (!citySel || !regIn) return;
        regIn.value = appendCityDistrictToRegionText(regIn.value, citySel.value, distSel?.value || '');
        regIn.focus();
      };
    });

    root.querySelectorAll('[data-cascade-clear]').forEach(clrBtn => {
      clrBtn.onclick = () => {
        const uid = clrBtn.dataset.cascadeClear;
        const regIn = root.querySelector(`[data-f-region="${uid}"]`);
        if (regIn) {
          regIn.value = '';
          regIn.focus();
        }
      };
    });

    // 外勤品管：即時計算 2.0 + 2.0E 總台數
    function updateFieldBikeSum(uid) {
      const v20 = Number(root.querySelector(`[data-f-v20="${uid}"]`)?.value) || 0;
      const v20e = Number(root.querySelector(`[data-f-v20e="${uid}"]`)?.value) || 0;
      const sumEl = root.querySelector(`[data-bike-sum="${uid}"]`);
      if (sumEl) {
        sumEl.innerHTML = `🚲 2.0 與 2.0E 合計稽查車輛數：<strong>${v20 + v20e} 台</strong>（2.0：${v20} 台 ＋ 2.0E：${v20e} 台）`;
      }
    }
    root.querySelectorAll('[data-f-v20], [data-f-v20e]').forEach(inp => {
      inp.oninput = () => updateFieldBikeSum(inp.dataset.fV20 || inp.dataset.fV20e);
    });

    // 內勤：自動整理 1. 2. 3. 編號
    root.querySelectorAll('[data-auto-number]').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.dataset.autoNumber;
        const todayTa = root.querySelector(`[data-f-today="${uid}"]`);
        const tomorrowTa = root.querySelector(`[data-f-tomorrow="${uid}"]`);
        if (todayTa && todayTa.value.trim()) todayTa.value = normalizeNumberedLines(todayTa.value);
        if (tomorrowTa && tomorrowTa.value.trim()) tomorrowTa.value = normalizeNumberedLines(tomorrowTa.value);
      };
    });

    // 內勤：點擊常用工作快選膠囊
    root.querySelectorAll('[data-insert-chip]').forEach(chip => {
      chip.onclick = () => {
        const uid = chip.dataset.targetUid;
        const phrase = chip.dataset.insertChip;
        const todayTa = root.querySelector(`[data-f-today="${uid}"]`);
        if (!todayTa) return;
        const existing = todayTa.value.trim();
        const combined = existing ? `${existing}\n${phrase}` : phrase;
        todayTa.value = normalizeNumberedLines(combined);
        todayTa.focus();
      };
    });

    // 儲存（僅儲存 或 儲存並複製 LINE 格式）
    async function handleSaveInline(uid, copyToLine = false) {
      if (uid !== myUid() && !isDesigner) {
        toast('每日回報僅限本人親自填寫，無法代填！', 'error');
        return;
      }
      const targetUser = state.users.get(uid);
      const editorEl = root.querySelector(`[data-editor-for="${uid}"]`);
      const isFieldMode = editorEl ? editorEl.dataset.editorMode === 'field' : isFieldStaff(targetUser);
      const notesIn = root.querySelector(`[data-f-notes="${uid}"]`);
      const notes = (notesIn?.value || '').trim();

      let payload;
      if (isFieldMode) {
        const regIn = root.querySelector(`[data-f-region="${uid}"]`);
        const stIn = root.querySelector(`[data-f-stations="${uid}"]`);
        const v20In = root.querySelector(`[data-f-v20="${uid}"]`);
        const v20eIn = root.querySelector(`[data-f-v20e="${uid}"]`);

        const fieldRegion = (regIn?.value || '').trim();
        const fieldStationsRaw = stIn?.value ?? '';
        const fieldV20 = Number(v20In?.value) || 0;
        const fieldV20E = Number(v20eIn?.value) || 0;

        if (!fieldRegion) {
          toast('請透過上方連動選單選擇或填寫「1️⃣ 地區」', 'error');
          regIn?.focus();
          return;
        }
        if (fieldStationsRaw === '' || Number(fieldStationsRaw) < 0) {
          toast('請填寫「2️⃣ 稽查場站數」', 'error');
          stIn?.focus();
          return;
        }
        const fieldStations = Number(fieldStationsRaw) || 0;
        payload = {
          reportType: 'field',
          fieldRegion,
          fieldStations,
          fieldV20,
          fieldV20E,
          todayTasks: `地區：${fieldRegion}\n稽查場站數：${fieldStations} 站\n2.0與2.0E的數量：2.0 共 ${fieldV20} 台 / 2.0E 共 ${fieldV20E} 台（合計 ${fieldV20 + fieldV20E} 台）`,
          notes,
          status: 'submitted',
        };
      } else {
        const todayTa = root.querySelector(`[data-f-today="${uid}"]`);
        const tomorrowTa = root.querySelector(`[data-f-tomorrow="${uid}"]`);
        const todayTasks = normalizeNumberedLines(todayTa?.value || '');
        const tomorrowTasks = normalizeNumberedLines(tomorrowTa?.value || '');

        if (!todayTasks) {
          toast('請填寫「今日完成事項 / 工作進度」', 'error');
          todayTa?.focus();
          return;
        }
        payload = {
          reportType: 'office',
          todayTasks,
          tomorrowTasks,
          notes,
          status: 'submitted',
        };
      }

      const saved = await saveUserDailyReport(selectedDate, uid, payload);
      editingUid = null;
      editingModeOverride = null;

      if (copyToLine) {
        const text = formatPersonalLineReport(targetUser, selectedDate, saved);
        try {
          await navigator.clipboard.writeText(text);
          toast('✅ 已儲存並複製個人 LINE 回報格式！可直接至 LINE 群組貼上');
        } catch {
          toast('✅ 已儲存回報（請點擊複製按鈕複製文字）');
        }
      } else {
        toast('✅ 已儲存每日工作進度回報');
      }
      render();
    }

    root.querySelectorAll('[data-save-only]').forEach(btn => {
      btn.onclick = () => handleSaveInline(btn.dataset.saveOnly, false);
    });
    root.querySelectorAll('[data-save-and-copy]').forEach(btn => {
      btn.onclick = () => handleSaveInline(btn.dataset.saveAndCopy, true);
    });

    // 複製個人 LINE 回報格式（嚴格檢查查看權限）
    root.querySelectorAll('[data-copy-personal]').forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.dataset.copyPersonal;
        if (!canViewReportContent(uid)) {
          return toast('回報內容僅代理副理與本人可複製', 'error');
        }
        const targetUser = state.users.get(uid);
        const rep = doc.reports?.[uid];
        if (!isReportSubmitted(rep, targetUser)) return toast('尚未填寫今日回報內容', 'error');
        const text = formatPersonalLineReport(targetUser, selectedDate, rep);
        try {
          await navigator.clipboard.writeText(text);
          toast(`📋 已複製 ${targetUser?.displayName || ''} 的個人 LINE 回報格式！`);
        } catch {
          toast('複製失敗，請手動選取複製', 'error');
        }
      };
    });

    // 代理副理點選「👍 已閱」
    root.querySelectorAll('[data-toggle-ack]').forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.dataset.toggleAck;
        const ack = btn.dataset.ackVal === '1';
        await acknowledgeDailyReport(selectedDate, uid, { ack });
        toast(ack ? '👍 已標記審閱' : '已取消審閱標記');
        render();
      };
    });

    // 代理副理展開回饋輸入框
    root.querySelectorAll('[data-open-reply]').forEach(btn => {
      btn.onclick = () => {
        replyingUid = btn.dataset.openReply;
        render();
        const inp = root.querySelector(`[data-reply-input="${replyingUid}"]`);
        if (inp) inp.focus();
      };
    });

    const cancelReplyBtn = root.querySelector('[data-cancel-reply]');
    if (cancelReplyBtn) {
      cancelReplyBtn.onclick = () => {
        replyingUid = null;
        render();
      };
    }

    root.querySelectorAll('[data-save-reply]').forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.dataset.saveReply;
        const inp = root.querySelector(`[data-reply-input="${uid}"]`);
        const managerReply = (inp?.value || '').trim();
        await acknowledgeDailyReport(selectedDate, uid, { ack: true, managerReply });
        replyingUid = null;
        toast('💬 已儲存主管回饋並標記已閱');
        render();
      };
    });

    // 歷史檢索篩選器
    const histUidSel = root.querySelector('[data-history-uid]');
    if (histUidSel) {
      histUidSel.onchange = () => {
        historyFilterUid = histUidSel.value;
        render();
      };
    }
    const histKwIn = root.querySelector('[data-history-kw]');
    if (histKwIn) {
      histKwIn.oninput = () => {
        historyKeyword = histKwIn.value;
        render();
      };
    }
    root.querySelectorAll('[data-jump-date]').forEach(btn => {
      btn.onclick = () => {
        selectedDate = btn.dataset.jumpDate;
        viewMode = 'daily';
        render();
      };
    });
    root.querySelectorAll('[data-copy-history]').forEach(btn => {
      btn.onclick = async () => {
        const d = btn.dataset.copyHistory;
        const uid = btn.dataset.copyUid;
        if (!canViewReportContent(uid)) return;
        const targetUser = state.users.get(uid);
        const rep = dailyReportDocOf(d).reports?.[uid];
        if (!rep) return;
        const text = formatPersonalLineReport(targetUser, d, rep);
        await navigator.clipboard.writeText(text);
        toast(`📋 已複製 ${fmtMD(d)} ${targetUser?.displayName || ''} 的 LINE 回報格式`);
      };
    });
  }

  render();
  return {
    update() {
      if (!editingUid && !replyingUid) render();
    },
    destroy() {},
  };
}

// ============================================================
// 行動端通勤極速快填彈窗（Modal）
// - 外勤品管同仁：直接使用制式 3 題
// - 內勤同仁：預設為「🏢 內勤工作進度」，並提供「🚲 外勤支援回報（模擬體驗）」分頁切換
// ============================================================
export function openQuickDailyReportSheet(dateStr = ymd(), modeOverride = null) {
  const existingModal = document.getElementById('dr-quick-sheet-backdrop');
  if (existingModal) existingModal.remove();

  const me = state.me;
  const uid = myUid();
  if (!me || !uid) return;

  const isRegularField = isFieldStaff(me);
  const doc = dailyReportDocOf(dateStr);
  const rep = doc.reports?.[uid] || {};
  const activeSheetMode = isRegularField
    ? 'field'
    : (modeOverride || (rep.reportType === 'field' ? 'field' : 'office'));
  const isField = activeSheetMode === 'field';

  const prevEntry = getPreviousUserReport(uid, dateStr);
  const chips = !isField ? getQuickChipsForUser(me) : [];
  const cities = isField ? getOrderedCitiesForUser(me) : [];
  const defaultCity = cities[0] || '新北市';
  const defaultDistricts = FIELD_CITY_DISTRICTS[defaultCity] || [];
  const initV20 = rep.fieldV20 !== undefined ? rep.fieldV20 : '';
  const initV20E = rep.fieldV20E !== undefined ? rep.fieldV20E : '';
  const initTotal = (Number(initV20) || 0) + (Number(initV20E) || 0);

  const backdrop = document.createElement('div');
  backdrop.id = 'dr-quick-sheet-backdrop';
  backdrop.className = 'dr-sheet-backdrop';

  backdrop.innerHTML = `
    <div class="dr-bottom-sheet" role="dialog" aria-modal="true" aria-label="每日回報極速快填">
      <div class="dr-sheet-handle"></div>
      <div class="dr-sheet-head">
        <div>
          <div class="dr-sheet-badge">${isRegularField ? '🚲 外勤品管制式快填・僅徐嘉鴻與包于巧可見' : (isField ? '🚲 內勤支援外勤（模擬體驗）快填' : '⚡ 內勤每日進度快填・全組公開共享')}</div>
          <h3>📝 ${esc(fmtMD(dateStr))}（週${esc(weekdayZh(dateStr))}）${esc(me.displayName)} 回報</h3>
        </div>
        <button type="button" class="icon-btn" data-close-sheet aria-label="關閉">✕</button>
      </div>

      <div class="dr-sheet-body">
        ${!isRegularField ? `
          <div class="dr-office-mode-tabs" style="display:flex; gap:6px; margin-bottom:12px; padding:4px; background:#f1f5f9; border-radius:10px; border:1px solid #e2e8f0;">
            <button type="button" class="dr-mode-tab-btn ${activeSheetMode === 'office' ? 'active' : ''}" data-sheet-switch-mode="office"
              style="flex:1; padding:7px 10px; border-radius:7px; border:none; font-size:12.5px; font-weight:600; cursor:pointer; transition:all .15s; ${activeSheetMode === 'office' ? 'background:#fff; color:#0f172a; box-shadow:0 1px 3px rgba(15,23,42,.08);' : 'background:transparent; color:#64748b;'}">
              🏢 內勤工作進度（日常預設）
            </button>
            <button type="button" class="dr-mode-tab-btn ${activeSheetMode === 'field' ? 'active' : ''}" data-sheet-switch-mode="field"
              style="flex:1; padding:7px 10px; border-radius:7px; border:none; font-size:12.5px; font-weight:600; cursor:pointer; transition:all .15s; ${activeSheetMode === 'field' ? 'background:#fff; color:#0369a1; box-shadow:0 1px 3px rgba(15,23,42,.08);' : 'background:transparent; color:#64748b;'}">
              🚲 外勤支援回報（每月模擬體驗）
            </button>
          </div>
        ` : ''}

        <div class="dr-sheet-quickbar">
          ${prevEntry ? `
            <button type="button" class="btn sm dr-sheet-prev-btn" data-sheet-import-prev>
              📥 一鍵帶入前次資料（${esc(fmtMD(prevEntry.date))}）
            </button>
          ` : ''}
          ${!isField ? `<button type="button" class="btn sm" data-sheet-renumber>🔢 自動整理 1.2.3.</button>` : ''}
        </div>

        ${isField ? `
          <div class="dr-cascade-box">
            <div class="dr-cascade-title">📍 縣市與行政區連動選擇器（選擇即自動加入下方地區欄，支援多區）</div>
            <div class="dr-cascade-row">
              <label class="dr-cascade-col">
                <span>① 選擇縣市</span>
                <select data-sheet-cascade-city>
                  ${cities.map(c => `<option value="${esc(c)}" ${c === defaultCity ? 'selected' : ''}>${esc(c)}</option>`).join('')}
                </select>
              </label>
              <label class="dr-cascade-col">
                <span>② 選擇行政區（自動帶入）</span>
                <select data-sheet-cascade-dist>
                  <option value="">-- 請選擇 ${esc(defaultCity)} 行政區 --</option>
                  <option value="全區">📌 ${esc(defaultCity)}（不限行政區 / 全區）</option>
                  ${defaultDistricts.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
                </select>
              </label>
              <div class="dr-cascade-actions">
                <button type="button" class="btn sm primary" data-sheet-cascade-add>＋ 加入地區</button>
                <button type="button" class="btn sm ghost" data-sheet-cascade-clear>清空</button>
              </div>
            </div>
          </div>

          <label class="dr-sheet-field">
            <span>1️⃣ 地區（必填，由上方選單自動帶入，亦可直接手動補充微調）</span>
            <input type="text" data-sheet-region placeholder="例如：新北市（板橋區、中和區）..." value="${esc(rep.fieldRegion || '')}">
          </label>

          <div class="dr-field-row3">
            <label class="dr-sheet-field">
              <span>2️⃣ 稽查場站數（站）</span>
              <input type="number" min="0" step="1" inputmode="numeric" data-sheet-stations placeholder="0" value="${esc(rep.fieldStations ?? '')}">
            </label>
            <label class="dr-sheet-field">
              <span>3️⃣ 2.0 數量（台）</span>
              <input type="number" min="0" step="1" inputmode="numeric" data-sheet-v20 placeholder="0" value="${esc(initV20)}">
            </label>
            <label class="dr-sheet-field">
              <span>⚡ 2.0E 數量（台）</span>
              <input type="number" min="0" step="1" inputmode="numeric" data-sheet-v20e placeholder="0" value="${esc(initV20E)}">
            </label>
          </div>

          <div class="dr-bike-sum-bar" data-sheet-bike-sum>
            🚲 2.0 與 2.0E 合計稽查車輛數：<strong>${initTotal} 台</strong>（2.0：${Number(initV20) || 0} 台 ＋ 2.0E：${Number(initV20E) || 0} 台）
          </div>
        ` : `
          <div class="dr-sheet-chips">
            <div class="dr-chip-label">👆 點擊下方常用詞彙直接加入今日進度（免打字）：</div>
            <div class="dr-chip-scroll">
              ${chips.map(c => `<button type="button" class="dr-phrase-chip" data-sheet-chip="${esc(c)}">＋ ${esc(c)}</button>`).join('')}
            </div>
          </div>

          <label class="dr-sheet-field">
            <span>✅ 今日完成事項 / 工作進度</span>
            <textarea rows="4" data-sheet-today placeholder="1. 點擊上方詞彙或輸入今日工作進度...">${esc(rep.todayTasks || '')}</textarea>
          </label>

          <label class="dr-sheet-field">
            <span>📅 明日預計工作 / 後續待辦（選填）</span>
            <textarea rows="2" data-sheet-tomorrow placeholder="1. 明日預計待辦...">${esc(rep.tomorrowTasks || '')}</textarea>
          </label>
        `}

        <label class="dr-sheet-field">
          <span>💡 備註事項（選填）</span>
          <input type="text" data-sheet-notes placeholder="選填備註..." value="${esc(rep.notes || '')}">
        </label>

        <div class="dr-sheet-success-box" data-sheet-success hidden>
          <div class="dr-sheet-success-title">🎉 已儲存並複製您的 LINE 回報格式！</div>
          <pre class="dr-sheet-preview" data-sheet-preview></pre>
          <div class="dr-sheet-success-actions">
            <a class="btn primary big dr-open-line-btn" href="https://line.me/R/" target="_blank" rel="noopener">
              💬 點此直接打開 LINE 群組貼上
            </a>
            <button type="button" class="btn" data-close-sheet>完成關閉</button>
          </div>
        </div>
      </div>

      <div class="dr-sheet-foot" data-sheet-foot>
        <button type="button" class="btn" data-sheet-save-only>💾 儲存</button>
        <button type="button" class="btn primary big dr-sheet-submit" data-sheet-save-copy>
          📋 儲存並複製 LINE
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const notesIn = backdrop.querySelector('[data-sheet-notes]');
  const successBox = backdrop.querySelector('[data-sheet-success]');
  const previewPre = backdrop.querySelector('[data-sheet-preview]');
  const footBox = backdrop.querySelector('[data-sheet-foot]');

  const close = () => backdrop.remove();
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelectorAll('[data-close-sheet]').forEach(b => { b.onclick = close; });

  // 內勤同仁於彈窗內切換「🏢 內勤工作進度 / 🚲 外勤支援回報」分頁
  backdrop.querySelectorAll('[data-sheet-switch-mode]').forEach(tabBtn => {
    tabBtn.onclick = () => {
      openQuickDailyReportSheet(dateStr, tabBtn.dataset.sheetSwitchMode);
    };
  });

  if (isField) {
    const regIn = backdrop.querySelector('[data-sheet-region]');
    const stIn = backdrop.querySelector('[data-sheet-stations]');
    const v20In = backdrop.querySelector('[data-sheet-v20]');
    const v20eIn = backdrop.querySelector('[data-sheet-v20e]');
    const sumEl = backdrop.querySelector('[data-sheet-bike-sum]');
    const citySel = backdrop.querySelector('[data-sheet-cascade-city]');
    const distSel = backdrop.querySelector('[data-sheet-cascade-dist]');
    const addBtn = backdrop.querySelector('[data-sheet-cascade-add]');
    const clrBtn = backdrop.querySelector('[data-sheet-cascade-clear]');

    if (citySel && distSel) {
      citySel.onchange = () => {
        const city = citySel.value;
        const dists = FIELD_CITY_DISTRICTS[city] || [];
        distSel.innerHTML = `
          <option value="">-- 請選擇 ${esc(city)} 行政區 --</option>
          <option value="全區">📌 ${esc(city)}（不限行政區 / 全區）</option>
          ${dists.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('')}
        `;
      };
      distSel.onchange = () => {
        if (!distSel.value) return;
        regIn.value = appendCityDistrictToRegionText(regIn.value, citySel.value, distSel.value);
      };
    }

    if (addBtn && citySel) {
      addBtn.onclick = () => {
        regIn.value = appendCityDistrictToRegionText(regIn.value, citySel.value, distSel?.value || '');
      };
    }

    if (clrBtn) {
      clrBtn.onclick = () => {
        regIn.value = '';
        regIn.focus();
      };
    }

    const updateSheetSum = () => {
      const a = Number(v20In?.value) || 0;
      const b = Number(v20eIn?.value) || 0;
      if (sumEl) {
        sumEl.innerHTML = `🚲 2.0 與 2.0E 合計稽查車輛數：<strong>${a + b} 台</strong>（2.0：${a} 台 ＋ 2.0E：${b} 台）`;
      }
    };
    v20In?.addEventListener('input', updateSheetSum);
    v20eIn?.addEventListener('input', updateSheetSum);

    const prevBtn = backdrop.querySelector('[data-sheet-import-prev]');
    if (prevBtn && prevEntry) {
      prevBtn.onclick = () => {
        regIn.value = prevEntry.report.fieldRegion || '';
        stIn.value = prevEntry.report.fieldStations ?? '';
        v20In.value = prevEntry.report.fieldV20 ?? '';
        v20eIn.value = prevEntry.report.fieldV20E ?? '';
        updateSheetSum();
        toast(`📥 已帶入 ${fmtMD(prevEntry.date)} 的稽查資料`);
      };
    }
  } else {
    const todayTa = backdrop.querySelector('[data-sheet-today]');
    const tomorrowTa = backdrop.querySelector('[data-sheet-tomorrow]');

    const prevBtn = backdrop.querySelector('[data-sheet-import-prev]');
    if (prevBtn && prevEntry) {
      prevBtn.onclick = () => {
        const seed = (prevEntry.report.tomorrowTasks || '').trim() || (prevEntry.report.todayTasks || '').trim();
        todayTa.value = normalizeNumberedLines(seed);
        if (!tomorrowTa.value.trim()) tomorrowTa.value = prevEntry.report.tomorrowTasks || '';
        toast(`📥 已帶入 ${fmtMD(prevEntry.date)} 的項目`);
      };
    }

    const renumBtn = backdrop.querySelector('[data-sheet-renumber]');
    if (renumBtn) {
      renumBtn.onclick = () => {
        if (todayTa.value.trim()) todayTa.value = normalizeNumberedLines(todayTa.value);
        if (tomorrowTa.value.trim()) tomorrowTa.value = normalizeNumberedLines(tomorrowTa.value);
      };
    }

    backdrop.querySelectorAll('[data-sheet-chip]').forEach(chip => {
      chip.onclick = () => {
        const phrase = chip.dataset.sheetChip;
        const cur = todayTa.value.trim();
        todayTa.value = normalizeNumberedLines(cur ? `${cur}\n${phrase}` : phrase);
      };
    });
  }

  async function submitSheet(copyLine = true) {
    const notes = notesIn.value.trim();
    let payload;

    if (isField) {
      const regIn = backdrop.querySelector('[data-sheet-region]');
      const stIn = backdrop.querySelector('[data-sheet-stations]');
      const v20In = backdrop.querySelector('[data-sheet-v20]');
      const v20eIn = backdrop.querySelector('[data-sheet-v20e]');

      const fieldRegion = (regIn?.value || '').trim();
      const fieldStationsRaw = stIn?.value ?? '';
      const fieldV20 = Number(v20In?.value) || 0;
      const fieldV20E = Number(v20eIn?.value) || 0;

      if (!fieldRegion) {
        toast('請先點選或輸入「1️⃣ 地區」', 'error');
        regIn?.focus();
        return;
      }
      if (fieldStationsRaw === '' || Number(fieldStationsRaw) < 0) {
        toast('請輸入「2️⃣ 稽查場站數」', 'error');
        stIn?.focus();
        return;
      }
      const fieldStations = Number(fieldStationsRaw) || 0;
      payload = {
        reportType: 'field',
        fieldRegion,
        fieldStations,
        fieldV20,
        fieldV20E,
        todayTasks: `地區：${fieldRegion}\n稽查場站數：${fieldStations} 站\n2.0與2.0E的數量：2.0 共 ${fieldV20} 台 / 2.0E 共 ${fieldV20E} 台（合計 ${fieldV20 + fieldV20E} 台）`,
        notes,
        status: 'submitted',
      };
    } else {
      const todayTa = backdrop.querySelector('[data-sheet-today]');
      const tomorrowTa = backdrop.querySelector('[data-sheet-tomorrow]');
      const todayTasks = normalizeNumberedLines(todayTa.value);
      const tomorrowTasks = normalizeNumberedLines(tomorrowTa.value);

      if (!todayTasks) {
        toast('請先輸入或點選至少一項「今日完成事項」', 'error');
        todayTa.focus();
        return;
      }
      payload = {
        reportType: 'office',
        todayTasks,
        tomorrowTasks,
        notes,
        status: 'submitted',
      };
    }

    const saved = await saveUserDailyReport(dateStr, uid, payload);

    if (copyLine) {
      const lineText = formatPersonalLineReport(me, dateStr, saved);
      try {
        await navigator.clipboard.writeText(lineText);
        toast('✅ 已複製個人 LINE 回報格式！');
      } catch {
        toast('✅ 已儲存回報');
      }
      previewPre.textContent = lineText;
      successBox.hidden = false;
      footBox.hidden = true;
    } else {
      toast('✅ 已儲存今日回報');
      close();
    }
  }

  backdrop.querySelector('[data-sheet-save-only]').onclick = () => submitSheet(false);
  backdrop.querySelector('[data-sheet-save-copy]').onclick = () => submitSheet(true);
}

// ============================================================
// 全域懸浮輔助器：
// 1. 行動端拇指熱區「✍️ 今日回報 / 📋 複製今日回報」獨立懸浮大按鈕（全體 9 位內外勤同仁適用）
// 2. 每日 17:30 智慧溫和下班提醒卡片（不鎖死畫面、4 層智慧過濾）
// ============================================================
export function initDailyReportFloatingWidget(onUpdateTabBadge) {
  let rootEl = document.getElementById('dr-floating-root');
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'dr-floating-root';
    document.body.appendChild(rootEl);
  }

  function dismissKey(dateStr) {
    return `yb_dr_dismiss_${dateStr}_${myUid() || 'anon'}`;
  }

  function evaluateAndRender() {
    const me = state.me;
    const uid = myUid();
    if (!me || !uid) {
      rootEl.innerHTML = '';
      return;
    }

    const today = ymd();
    const doc = dailyReportDocOf(today);
    const mySt = evaluateMemberReportStatus(me, today);
    const isReporter = isDailyReporter(me); // 6 位內勤 ＋ 3 位外勤品管皆適用
    const isPendingToday = isReporter && mySt.code === 'pending';

    // 更新導覽列「每日回報」頁籤上的小紅點提示
    if (typeof onUpdateTabBadge === 'function') {
      onUpdateTabBadge(isPendingToday);
    }

    // 判斷是否已達 17:30 (1050 分鐘) 且尚未關閉今日提醒
    const mins = nowMinutes();
    const isAfter1730 = mins >= 17 * 60 + 30;
    const dismissedToday = localStorage.getItem(dismissKey(today)) === '1';
    const showGentleReminder = isPendingToday && isAfter1730 && !dismissedToday;

    const onDailyReportPage = location.hash.startsWith('#/dailyReport');
    const hasSubmittedToday = mySt.code === 'submitted';

    rootEl.innerHTML = `
      ${showGentleReminder ? `
        <aside class="dr-gentle-toast" role="status" aria-live="polite">
          <div class="dr-toast-header">
            <span class="dr-toast-icon">🚲</span>
            <strong>17:30 準備下班囉！</strong>
            <button type="button" class="dr-toast-close" data-dismiss-1730 title="今日不再提醒">✕</button>
          </div>
          <p class="dr-toast-desc">
            別忘了花 15 秒填寫今日回報，並一鍵複製貼到 LINE 群組向代理副理回報喔！
          </p>
          <div class="dr-toast-actions">
            <button type="button" class="btn primary sm" data-toast-fill>✍️ 立即快填</button>
            <button type="button" class="btn sm" data-dismiss-1730>🔕 今日不再提醒</button>
          </div>
        </aside>
      ` : ''}

      ${(isReporter && !onDailyReportPage) ? `
        <div class="dr-commuter-fab-wrap">
          ${hasSubmittedToday ? `
            <button type="button" class="dr-commuter-fab done" data-fab-copy title="一鍵複製今日個人 LINE 回報格式">
              <span class="dr-fab-icon">📋</span>
              <span class="dr-fab-text">複製今日 LINE 回報</span>
            </button>
          ` : `
            <button type="button" class="dr-commuter-fab ${isPendingToday ? 'pulse' : ''}" data-fab-open title="通勤/等紅綠燈極速填寫今日回報">
              <span class="dr-fab-icon">✍️</span>
              <span class="dr-fab-text">今日回報</span>
              ${isPendingToday ? '<span class="dr-fab-dot"></span>' : ''}
            </button>
          `}
        </div>
      ` : ''}
    `;

    rootEl.querySelectorAll('[data-dismiss-1730]').forEach(btn => {
      btn.onclick = () => {
        try { localStorage.setItem(dismissKey(today), '1'); } catch { /* ignore */ }
        evaluateAndRender();
      };
    });

    const toastFillBtn = rootEl.querySelector('[data-toast-fill]');
    if (toastFillBtn) {
      toastFillBtn.onclick = () => {
        try { localStorage.setItem(dismissKey(today), '1'); } catch { /* ignore */ }
        evaluateAndRender();
        openQuickDailyReportSheet(today);
      };
    }

    const fabOpenBtn = rootEl.querySelector('[data-fab-open]');
    if (fabOpenBtn) {
      fabOpenBtn.onclick = () => openQuickDailyReportSheet(today);
    }

    const fabCopyBtn = rootEl.querySelector('[data-fab-copy]');
    if (fabCopyBtn) {
      fabCopyBtn.onclick = async () => {
        const rep = doc.reports?.[uid];
        if (!isReportSubmitted(rep, me)) return openQuickDailyReportSheet(today);
        const text = formatPersonalLineReport(me, today, rep);
        try {
          await navigator.clipboard.writeText(text);
          toast('📋 已複製您的今日 LINE 回報格式！正在為您準備貼上...');
        } catch {
          /* ignore */
        }
        openQuickDailyReportSheet(today);
      };
    }
  }

  evaluateAndRender();
  const timer = setInterval(evaluateAndRender, 30000);
  window.addEventListener('hashchange', evaluateAndRender);

  return {
    refresh: evaluateAndRender,
    destroy() {
      clearInterval(timer);
      window.removeEventListener('hashchange', evaluateAndRender);
      rootEl.innerHTML = '';
    },
  };
}
