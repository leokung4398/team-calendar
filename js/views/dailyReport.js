// 每日工作進度回報模組（#/dailyReport）
// - 內勤 6 位同仁每日下班回報工作進度，支援一鍵複製個人 LINE 回報格式、帶入昨日項目、常用快選詞彙
// - 外勤 3 位同仁預設標示「🚲 外勤品管（免回報）」；代理副理 徐嘉鴻 預設為「👔 主管檢視 / 已閱簽核」
// - 支援「🌀 颱風停班停課（全員免回報）」彈性切換、休假與例假日自動連動
// - 支援 17:30 智慧溫和下班提醒 Toast + 行動端通勤拇指熱區懸浮按鈕（FAB）與底部快填抽屜（Bottom Sheet）

import {
  state, activeUsers, myUid, isAdmin, isFieldStaff, isSupervisor, isOfficeReporter,
  dailyReportDocOf, saveUserDailyReport, toggleTyphoonDay, acknowledgeDailyReport, eventList,
} from '../data.js';
import { eventsOfUserOn } from '../schedule.js';
import { dayInfo, ensureRange } from '../holidays.js';
import { esc, avatar, toast, ymd, addDays, fmtMD, weekdayZh, nowMinutes, $ } from '../utils.js';

// 各職務專屬的「常用工作快選膠囊」（通勤、等紅綠燈單手點一下即可插入）
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
  field: [
    '站點與自行車品管抽檢及異常回報',
    '模擬體驗發現事項複查與改善追蹤',
    '跨區站點車柱清潔與電裝妥善率巡檢',
  ],
};

function getQuickChipsForUser(u) {
  if (!u) return ROLE_QUICK_CHIPS.operations;
  const name = u.displayName || '';
  const title = u.title || '';
  if (name.includes('張必忠') || title.includes('倉管')) return ROLE_QUICK_CHIPS.warehouse;
  if (name.includes('賴宜平') || title.includes('勞安')) return ROLE_QUICK_CHIPS.safety;
  if (name.includes('包于巧')) return ROLE_QUICK_CHIPS.inventory;
  if (name.includes('陳麒任') || name.includes('丁美云') || title.includes('採購')) return ROLE_QUICK_CHIPS.procurement;
  if (isFieldStaff(u)) return ROLE_QUICK_CHIPS.field;
  return ROLE_QUICK_CHIPS.operations;
}

/** 檢查某組員在指定日期是否有請假行程（typeId === 'leave'） */
export function getUserLeaveOnDate(uid, dateStr) {
  const list = eventsOfUserOn(uid, dateStr, eventList());
  const leaveItem = list.find(x => x.ev?.typeId === 'leave');
  return leaveItem ? leaveItem.ev : null;
}

/** 取得某組員在指定日期之前的最近一筆歷史回報（供「一鍵帶入昨日項目」使用） */
export function getPreviousUserReport(uid, beforeDateStr) {
  const sortedDates = [...state.dailyReports.keys()]
    .filter(d => d < beforeDateStr)
    .sort((a, b) => b.localeCompare(a));
  for (const d of sortedDates) {
    const doc = state.dailyReports.get(d);
    const rep = doc?.reports?.[uid];
    if (rep && (rep.todayTasks?.trim() || rep.tomorrowTasks?.trim())) {
      return { date: d, report: rep };
    }
  }
  return null;
}

/** 產生個人專屬的 LINE 群組回報文字格式（僅複製個人進度，方便貼到 LINE 群組向代理副理回報） */
export function formatPersonalLineReport(u, dateStr, report) {
  const name = u?.displayName || '組員';
  const md = fmtMD(dateStr);
  const wd = weekdayZh(dateStr);
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
  const hasSubmitted = !!(rep && rep.todayTasks && rep.todayTasks.trim());

  if (hasSubmitted) {
    return { code: 'submitted', label: '✅ 已回報', tone: 'ok', report: rep, leaveEv };
  }
  if (isSupervisor(u)) {
    return { code: 'supervisor', label: '👔 代理副理（審閱）', tone: 'supervisor', report: rep, leaveEv };
  }
  if (isFieldStaff(u)) {
    return { code: 'field_exempt', label: '🚲 外勤品管（免回報）', tone: 'exempt', report: rep, leaveEv };
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
  let editingUid = null;  // 若正在頁面上直接展開編輯某人
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
    const canManage = isAdmin() || isSupervisor(me);

    // 分類組員：6 位內勤應回報組員、1 位代理副理、3 位外勤品管
    const officeMembers = users.filter(u => isOfficeReporter(u));
    const fieldMembers = users.filter(u => isFieldStaff(u));
    const supervisors = users.filter(u => isSupervisor(u));

    // 計算當日內勤組員回報統計
    const statuses = officeMembers.map(u => ({ user: u, st: evaluateMemberReportStatus(u, selectedDate) }));
    const submittedCount = statuses.filter(x => x.st.code === 'submitted').length;
    const exemptCount = statuses.filter(x => ['typhoon_exempt', 'leave_exempt', 'holiday_exempt'].includes(x.st.code)).length;
    const pendingCount = statuses.filter(x => x.st.code === 'pending').length;

    const myReport = doc.reports?.[myId];
    const myStatus = me ? evaluateMemberReportStatus(me, selectedDate) : null;

    root.innerHTML = `
      <div class="daily-report-page">
        <!-- 頂部橫幅與快速操作 -->
        <section class="card dr-hero-card">
          <div class="dr-hero-top">
            <div>
              <div class="dr-eyebrow">📝 DAILY PROGRESS &amp; LINE REPORT HELPER</div>
              <h1 class="dr-title">每日工作進度回報中心</h1>
              <p class="dr-subtitle">
                內勤同仁每日下班前填寫工作進度，支援<strong>「一鍵帶入昨日項目」</strong>與<strong>「複製個人 LINE 回報格式」</strong>直接貼上群組向代理副理回報；外勤品管同仁預設免回報。
              </p>
            </div>
            <div class="dr-hero-actions">
              <button class="btn primary dr-quick-btn" data-open-quick="${esc(selectedDate)}">
                ✍️ ${myReport?.todayTasks ? '修改我的今日回報' : '立即填寫今日回報'}
              </button>
              ${myReport?.todayTasks ? `
                <button class="btn dr-copy-mine-btn" data-copy-personal="${esc(myId)}">
                  📋 複製我的 LINE 回報
                </button>
              ` : ''}
            </div>
          </div>

          <!-- 模式切換與日期導覽列 -->
          <div class="dr-toolbar">
            <div class="dr-view-tabs">
              <button class="dr-tab-btn ${viewMode === 'daily' ? 'active' : ''}" data-view-mode="daily">📅 單日全員看板</button>
              <button class="dr-tab-btn ${viewMode === 'history' ? 'active' : ''}" data-view-mode="history">🔍 歷史紀錄檢索</button>
            </div>

            ${viewMode === 'daily' ? `
              <div class="dr-date-nav">
                <button class="btn sm" data-shift-day="-1" title="前一天">‹ 前一天</button>
                <input type="date" class="dr-date-input" data-pick-date value="${esc(selectedDate)}">
                <span class="dr-date-label">
                  ${esc(fmtMD(selectedDate))}（週${esc(weekdayZh(selectedDate))}）
                  ${selectedDate === today ? '<span class="dr-today-pill">今天</span>' : ''}
                  ${info.off ? `<span class="dr-holiday-pill">🎉 ${esc(info.name || '例假日')}</span>` : ''}
                </span>
                <button class="btn sm" data-shift-day="1" title="後一天">後一天 ›</button>
                ${selectedDate !== today ? `<button class="btn sm" data-go-today>回到今天</button>` : ''}
              </div>
            ` : ''}

            <div class="dr-typhoon-ctrl">
              <button class="btn sm ${doc.isTyphoonDay ? 'dr-typhoon-active' : ''}" data-toggle-typhoon>
                🌀 ${doc.isTyphoonDay ? '已啟用颱風天免回報（點擊取消）' : '設為颱風天免回報'}
              </button>
            </div>
          </div>

          ${doc.isTyphoonDay ? `
            <div class="dr-typhoon-banner">
              <span class="dr-typhoon-icon">🌀</span>
              <div>
                <strong>${esc(doc.typhoonNote || '今日為颱風停班停課日 — 全體內勤同仁今日免回報')}</strong>
                <div class="muted" style="font-size:12.5px">系統已自動暫停今日 17:30 下班回報提醒；若有居家辦公進度仍可自由填寫紀錄。</div>
              </div>
            </div>
          ` : ''}
        </section>

        ${viewMode === 'daily' ? renderDailyBoard({
          selectedDate, today, doc, info, officeMembers, fieldMembers, supervisors,
          statuses, submittedCount, exemptCount, pendingCount, me, myId, myStatus, canManage,
        }) : renderHistoryExplorer({ users })}
      </div>
    `;

    bindEvents(users, doc);
  }

  function renderDailyBoard({
    selectedDate, doc, officeMembers, fieldMembers, supervisors,
    statuses, submittedCount, exemptCount, pendingCount, me, myId, canManage,
  }) {
    return `
      <!-- 當日回報進度總覽 -->
      <section class="dr-stats-grid">
        <div class="card dr-stat-card ok">
          <div class="dr-stat-num">${submittedCount} <span class="dr-stat-unit">/ ${officeMembers.length} 人</span></div>
          <div class="dr-stat-label">✅ 內勤已完成回報</div>
          <div class="dr-stat-pills">
            ${statuses.filter(x => x.st.code === 'submitted').map(x => `<span class="dr-mini-pill ok">${esc(x.user.displayName)}</span>`).join('') || '<span class="muted">尚無回報</span>'}
          </div>
        </div>

        <div class="card dr-stat-card ${pendingCount > 0 ? 'warn' : 'ok'}">
          <div class="dr-stat-num">${pendingCount} <span class="dr-stat-unit">人</span></div>
          <div class="dr-stat-label">⏳ 內勤待回報</div>
          <div class="dr-stat-pills">
            ${statuses.filter(x => x.st.code === 'pending').map(x => `<span class="dr-mini-pill pending">${esc(x.user.displayName)}</span>`).join('') || '<span class="dr-mini-pill ok">🎉 今日應回報同仁已全數完成！</span>'}
          </div>
        </div>

        <div class="card dr-stat-card neutral">
          <div class="dr-stat-num">${exemptCount + fieldMembers.length} <span class="dr-stat-unit">人</span></div>
          <div class="dr-stat-label">🏖️ 休假 / 颱風 / 🚲 外勤免回報</div>
          <div class="dr-stat-pills">
            ${statuses.filter(x => ['typhoon_exempt', 'leave_exempt', 'holiday_exempt'].includes(x.st.code)).map(x => `<span class="dr-mini-pill leave">${esc(x.user.displayName)}（${esc(x.st.label.replace(/（.*）/, ''))}）</span>`).join('')}
            ${fieldMembers.map(u => `<span class="dr-mini-pill exempt">🚲 ${esc(u.displayName)}</span>`).join('')}
          </div>
        </div>
      </section>

      <!-- 內勤 6 位組員每日回報卡片區 -->
      <section class="dr-section">
        <div class="dr-section-head">
          <h2>🏢 內勤同仁每日工作進度（${officeMembers.length} 位）</h2>
          <span class="muted" style="font-size:13px">點擊「📋 複製個人 LINE 格式」即可單獨複製該同仁進度並貼至 LINE 群組</span>
        </div>
        <div class="dr-cards-grid">
          ${officeMembers.map(u => renderMemberCard(u, selectedDate, doc, myId, canManage)).join('')}
        </div>
      </section>

      <!-- 主管與外勤品管同仁區（免回報 / 自由補充） -->
      <section class="dr-section">
        <div class="dr-section-head">
          <h2>👔 主管審閱 &amp; 🚲 外勤品管同仁（預設免回報，亦可自由紀錄）</h2>
        </div>
        <div class="dr-cards-grid compact">
          ${[...supervisors, ...fieldMembers].map(u => renderMemberCard(u, selectedDate, doc, myId, canManage, true)).join('')}
        </div>
      </section>
    `;
  }

  function renderMemberCard(u, dateStr, doc, myId, canManage, isCompact = false) {
    const st = evaluateMemberReportStatus(u, dateStr);
    const rep = st.report || {};
    const isMe = u.uid === myId;
    const canEditThis = isMe || isAdmin();
    const isEditing = editingUid === u.uid;
    const ackList = Object.values(rep.ackBy || {});
    const myAck = !!(rep.ackBy && rep.ackBy[myId]);
    const prevEntry = isEditing ? getPreviousUserReport(u.uid, dateStr) : null;
    const chips = isEditing ? getQuickChipsForUser(u) : [];

    return `
      <article class="card dr-member-card tone-${esc(st.tone)} ${isMe ? 'is-me' : ''} ${isCompact ? 'compact' : ''}" id="dr-card-${esc(u.uid)}">
        <div class="dr-card-head">
          <div class="dr-user-info">
            ${avatar(u, 38)}
            <div>
              <div class="dr-user-name">
                ${esc(u.displayName)}
                ${isMe ? '<span class="dr-me-tag">我</span>' : ''}
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

        ${isEditing ? `
          <div class="dr-inline-editor" data-editor-for="${esc(u.uid)}">
            <div class="dr-editor-top-tools">
              ${prevEntry ? `
                <button type="button" class="btn sm dr-import-prev-btn" data-import-prev="${esc(u.uid)}">
                  📥 一鍵帶入前次項目（${esc(fmtMD(prevEntry.date))}）
                </button>
              ` : `<span class="muted" style="font-size:12px">💡 可點選下方常用詞彙快速帶入</span>`}
              <button type="button" class="btn sm" data-auto-number="${esc(u.uid)}">🔢 自動整理編號</button>
            </div>

            <div class="dr-chip-bar">
              <span class="dr-chip-label">⚡ 點擊快速插入：</span>
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
              <button type="button" class="btn" data-cancel-edit>取消</button>
              <button type="button" class="btn" data-save-only="${esc(u.uid)}">💾 僅儲存</button>
              <button type="button" class="btn primary" data-save-and-copy="${esc(u.uid)}">
                💾 儲存並複製個人 LINE 格式
              </button>
            </div>
          </div>
        ` : (rep.todayTasks ? `
          <div class="dr-report-body">
            <div class="dr-block">
              <div class="dr-block-title">✅ 今日完成事項</div>
              <div class="dr-block-text">${esc(rep.todayTasks).replace(/\n/g, '<br>')}</div>
            </div>
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
        ` : `
          <div class="dr-empty-body">
            ${st.code === 'pending'
              ? '<span class="muted">今日尚未填寫工作進度回報</span>'
              : `<span class="muted">${esc(st.label)}，如需補充工作紀錄可點擊下方填寫</span>`}
          </div>
        `)}

        <!-- 主管已閱與回饋區 -->
        ${(ackList.length > 0 || rep.managerReply) ? `
          <div class="dr-ack-box">
            ${ackList.length > 0 ? `
              <div class="dr-ack-badges">
                ${ackList.map(a => `<span class="dr-ack-pill">👍 ${esc(a.name)} 已閱</span>`).join('')}
              </div>
            ` : ''}
            ${rep.managerReply ? `
              <div class="dr-manager-reply">
                <strong>💬 ${esc(rep.managerReplyBy || '主管')} 回饋：</strong>${esc(rep.managerReply)}
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${replyingUid === u.uid ? `
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
                <button class="btn sm ${isMe && !rep.todayTasks ? 'primary' : ''}" data-start-edit="${esc(u.uid)}">
                  ✍️ ${rep.todayTasks ? '編輯回報' : '填寫回報'}
                </button>
              ` : ''}
              ${rep.todayTasks ? `
                <button class="btn sm" data-copy-personal="${esc(u.uid)}" title="僅複製此人的 LINE 回報文字">
                  📋 複製 LINE 格式
                </button>
                <a class="btn sm dr-line-link" href="https://line.me/R/" target="_blank" rel="noopener" title="開啟 LINE App 貼上">
                  💬 開啟 LINE
                </a>
              ` : ''}
            </div>

            <div class="dr-foot-right">
              ${(canManage && rep.todayTasks) ? `
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

  function renderHistoryExplorer({ users }) {
    // 蒐集所有歷史回報紀錄
    const entries = [];
    const sortedDates = [...state.dailyReports.keys()].sort((a, b) => b.localeCompare(a));
    for (const d of sortedDates) {
      const doc = state.dailyReports.get(d);
      const reps = doc?.reports || {};
      for (const [uid, rep] of Object.entries(reps)) {
        if (!rep?.todayTasks?.trim()) continue;
        if (historyFilterUid !== 'all' && uid !== historyFilterUid) continue;
        const u = state.users.get(uid);
        const textBlob = `${u?.displayName || ''} ${rep.todayTasks || ''} ${rep.tomorrowTasks || ''} ${rep.notes || ''} ${rep.managerReply || ''}`.toLowerCase();
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
              <option value="all" ${historyFilterUid === 'all' ? 'selected' : ''}>全部組員（${users.length} 人）</option>
              ${users.map(u => `<option value="${esc(u.uid)}" ${historyFilterUid === u.uid ? 'selected' : ''}>${esc(u.displayName)}（${esc(u.title || '')}）</option>`).join('')}
            </select>
          </label>
          <label class="dr-filter-item grow">
            <span>🔍 關鍵字搜尋：</span>
            <input type="search" data-history-kw placeholder="搜尋工作內容、採購、倉管、勞安、車柱..." value="${esc(historyKeyword)}">
          </label>
        </div>

        <div class="dr-history-list">
          ${entries.length ? entries.map(item => `
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
                <div><strong>✅ 今日完成：</strong><br>${esc(item.report.todayTasks).replace(/\n/g, '<br>')}</div>
                ${item.report.tomorrowTasks ? `<div style="margin-top:6px"><strong>📅 明日預計：</strong><br>${esc(item.report.tomorrowTasks).replace(/\n/g, '<br>')}</div>` : ''}
                ${item.report.notes ? `<div style="margin-top:6px"><strong>💡 備註：</strong>${esc(item.report.notes)}</div>` : ''}
              </div>
              <div class="dr-history-actions">
                <button class="btn sm" data-copy-history="${esc(item.date)}" data-copy-uid="${esc(item.uid)}">📋 複製 LINE 格式</button>
              </div>
            </div>
          `).join('') : `<p class="muted" style="text-align:center;padding:32px 0">查無符合條件的歷史回報紀錄</p>`}
        </div>
      </section>
    `;
  }

  function bindEvents(users, doc) {
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
        await toggleTyphoonDay(selectedDate, nextVal, '🌀 颱風停班停課（全體內勤免回報）');
        toast(nextVal ? `🌀 已將 ${fmtMD(selectedDate)} 設為颱風天免回報` : `已恢復 ${fmtMD(selectedDate)} 為一般工作日回報`);
        render();
      };
    }

    // 頂部快速填寫彈窗按鈕
    root.querySelectorAll('[data-open-quick]').forEach(btn => {
      btn.onclick = () => openQuickDailyReportSheet(btn.dataset.openQuick || selectedDate);
    });

    // 展開行內編輯
    root.querySelectorAll('[data-start-edit]').forEach(btn => {
      btn.onclick = () => {
        editingUid = btn.dataset.startEdit;
        render();
        const ta = root.querySelector(`[data-f-today="${editingUid}"]`);
        if (ta) ta.focus();
      };
    });

    const cancelEditBtn = root.querySelector('[data-cancel-edit]');
    if (cancelEditBtn) {
      cancelEditBtn.onclick = () => {
        editingUid = null;
        render();
      };
    }

    // 一鍵帶入前次項目
    root.querySelectorAll('[data-import-prev]').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.dataset.importPrev;
        const prev = getPreviousUserReport(uid, selectedDate);
        if (!prev) return toast('查無前次歷史回報紀錄');
        const todayTa = root.querySelector(`[data-f-today="${uid}"]`);
        const tomorrowTa = root.querySelector(`[data-f-tomorrow="${uid}"]`);
        // 若前次有填「明日預計工作」，優先帶入作為今日完成事項；否則帶入前次的今日完成事項
        const seedToday = (prev.report.tomorrowTasks || '').trim() || (prev.report.todayTasks || '').trim();
        if (todayTa) todayTa.value = normalizeNumberedLines(seedToday);
        if (tomorrowTa && !tomorrowTa.value.trim()) tomorrowTa.value = prev.report.tomorrowTasks || '';
        toast(`📥 已帶入 ${fmtMD(prev.date)} 的回報項目，請直接微調！`);
      };
    });

    // 自動整理 1. 2. 3. 編號
    root.querySelectorAll('[data-auto-number]').forEach(btn => {
      btn.onclick = () => {
        const uid = btn.dataset.autoNumber;
        const todayTa = root.querySelector(`[data-f-today="${uid}"]`);
        const tomorrowTa = root.querySelector(`[data-f-tomorrow="${uid}"]`);
        if (todayTa && todayTa.value.trim()) todayTa.value = normalizeNumberedLines(todayTa.value);
        if (tomorrowTa && tomorrowTa.value.trim()) tomorrowTa.value = normalizeNumberedLines(tomorrowTa.value);
      };
    });

    // 點擊常用工作快選膠囊
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
      const todayTa = root.querySelector(`[data-f-today="${uid}"]`);
      const tomorrowTa = root.querySelector(`[data-f-tomorrow="${uid}"]`);
      const notesIn = root.querySelector(`[data-f-notes="${uid}"]`);
      const todayTasks = normalizeNumberedLines(todayTa?.value || '');
      const tomorrowTasks = normalizeNumberedLines(tomorrowTa?.value || '');
      const notes = (notesIn?.value || '').trim();

      if (!todayTasks) {
        toast('請填寫「今日完成事項 / 工作進度」', 'error');
        todayTa?.focus();
        return;
      }

      const saved = await saveUserDailyReport(selectedDate, uid, {
        todayTasks,
        tomorrowTasks,
        notes,
        status: 'submitted',
      });
      editingUid = null;

      if (copyToLine) {
        const targetUser = state.users.get(uid);
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

    // 複製個人 LINE 回報格式
    root.querySelectorAll('[data-copy-personal]').forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.dataset.copyPersonal;
        const targetUser = state.users.get(uid);
        const rep = doc.reports?.[uid];
        if (!rep?.todayTasks) return toast('尚未填寫今日回報內容', 'error');
        const text = formatPersonalLineReport(targetUser, selectedDate, rep);
        try {
          await navigator.clipboard.writeText(text);
          toast(`📋 已複製 ${targetUser?.displayName || ''} 的個人 LINE 回報格式！`);
        } catch {
          toast('複製失敗，請手動選取複製', 'error');
        }
      };
    });

    // 主管點選「👍 已閱」
    root.querySelectorAll('[data-toggle-ack]').forEach(btn => {
      btn.onclick = async () => {
        const uid = btn.dataset.toggleAck;
        const ack = btn.dataset.ackVal === '1';
        await acknowledgeDailyReport(selectedDate, uid, { ack });
        toast(ack ? '👍 已標記審閱' : '已取消審閱標記');
        render();
      };
    });

    // 主管展開回饋輸入框
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
// 行動端通勤極速快填抽屜（Bottom Sheet / Modal）
// 專為等紅綠燈、搭捷運公車單手 15 秒完成填寫與 LINE 複製設計
// ============================================================
export function openQuickDailyReportSheet(dateStr = ymd()) {
  const existingModal = document.getElementById('dr-quick-sheet-backdrop');
  if (existingModal) existingModal.remove();

  const me = state.me;
  const uid = myUid();
  if (!me || !uid) return;

  const doc = dailyReportDocOf(dateStr);
  const rep = doc.reports?.[uid] || {};
  const prevEntry = getPreviousUserReport(uid, dateStr);
  const chips = getQuickChipsForUser(me);

  const backdrop = document.createElement('div');
  backdrop.id = 'dr-quick-sheet-backdrop';
  backdrop.className = 'dr-sheet-backdrop';

  backdrop.innerHTML = `
    <div class="dr-bottom-sheet" role="dialog" aria-modal="true" aria-label="每日回報極速快填">
      <div class="dr-sheet-handle"></div>
      <div class="dr-sheet-head">
        <div>
          <div class="dr-sheet-badge">⚡ 通勤極速快填・自動排版</div>
          <h3>📝 ${esc(fmtMD(dateStr))}（週${esc(weekdayZh(dateStr))}）工作回報</h3>
        </div>
        <button type="button" class="icon-btn" data-close-sheet aria-label="關閉">✕</button>
      </div>

      <div class="dr-sheet-body">
        <div class="dr-sheet-quickbar">
          ${prevEntry ? `
            <button type="button" class="btn sm dr-sheet-prev-btn" data-sheet-import-prev>
              📥 一鍵帶入前次項目（${esc(fmtMD(prevEntry.date))}）
            </button>
          ` : ''}
          <button type="button" class="btn sm" data-sheet-renumber>🔢 自動整理 1.2.3.</button>
        </div>

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

        <label class="dr-sheet-field">
          <span>💡 需主管協助 / 備註事項（選填）</span>
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
        <button type="button" class="btn" data-sheet-save-only>💾 僅儲存</button>
        <button type="button" class="btn primary big dr-sheet-submit" data-sheet-save-copy>
          📋 儲存並複製個人 LINE 格式
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const todayTa = backdrop.querySelector('[data-sheet-today]');
  const tomorrowTa = backdrop.querySelector('[data-sheet-tomorrow]');
  const notesIn = backdrop.querySelector('[data-sheet-notes]');
  const successBox = backdrop.querySelector('[data-sheet-success]');
  const previewPre = backdrop.querySelector('[data-sheet-preview]');
  const footBox = backdrop.querySelector('[data-sheet-foot]');

  const close = () => backdrop.remove();
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelectorAll('[data-close-sheet]').forEach(b => { b.onclick = close; });

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

  async function submitSheet(copyLine = true) {
    const todayTasks = normalizeNumberedLines(todayTa.value);
    const tomorrowTasks = normalizeNumberedLines(tomorrowTa.value);
    const notes = notesIn.value.trim();

    if (!todayTasks) {
      toast('請先輸入或點選至少一項「今日完成事項」', 'error');
      todayTa.focus();
      return;
    }

    const saved = await saveUserDailyReport(dateStr, uid, {
      todayTasks,
      tomorrowTasks,
      notes,
      status: 'submitted',
    });

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
      toast('✅ 已儲存今日工作進度回報');
      close();
    }
  }

  backdrop.querySelector('[data-sheet-save-only]').onclick = () => submitSheet(false);
  backdrop.querySelector('[data-sheet-save-copy]').onclick = () => submitSheet(true);
}

// ============================================================
// 全域懸浮輔助器：
// 1. 行動端拇指熱區「✍️ 今日回報 / 📋 複製今日回報」獨立懸浮大按鈕（FAB）
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
    const isOffice = isOfficeReporter(me);
    const isPendingToday = isOffice && mySt.code === 'pending';

    // 更新導覽列「📝 每日回報」頁籤上的小紅點提示
    if (typeof onUpdateTabBadge === 'function') {
      onUpdateTabBadge(isPendingToday);
    }

    // 判斷是否已達 17:30 (1050 分鐘) 且尚未關閉今日提醒
    const mins = nowMinutes();
    const isAfter1730 = mins >= 17 * 60 + 30;
    const dismissedToday = localStorage.getItem(dismissKey(today)) === '1';
    const showGentleReminder = isPendingToday && isAfter1730 && !dismissedToday;

    // 行動端 / 通勤快速懸浮按鈕：
    // 對 6 位內勤同仁顯示在右下角拇指熱區（若在 #/dailyReport 頁面內則收斂為迷你按鈕避免遮擋）
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
            別忘了花 15 秒填寫今日工作進度，並一鍵複製貼到 LINE 群組向代理副理回報喔！
          </p>
          <div class="dr-toast-actions">
            <button type="button" class="btn primary sm" data-toast-fill>✍️ 立即快填</button>
            <button type="button" class="btn sm" data-dismiss-1730>🔕 今日不再提醒</button>
          </div>
        </aside>
      ` : ''}

      ${(isOffice && !onDailyReportPage) ? `
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
        if (!rep?.todayTasks) return openQuickDailyReportSheet(today);
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
