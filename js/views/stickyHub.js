// 🎯 團隊黏著度與日常互動中樞（今日備忘錄 Memo / 下午茶午餐揪團 / 團隊感謝貼紙 Kudos / 每日微投票 / 五區即時天氣）
import { state, myUid, isAdmin, activeUsers, userOf, saveVibeDoc, saveToolsDoc } from '../data.js';
import { esc, ymd, fmtMD, weekdayZh, eachDay, avatar, toast, openModal, closeModal } from '../utils.js';

/** 取得目前登入組員可見的所有備忘錄（個人私密 + 全組共享） */
export function getVisibleMemos() {
  const uid = myUid();
  const memosDoc = state.toolsData.get('memos') || { list: [] };
  const allMemos = Array.isArray(memosDoc.list) ? memosDoc.list : [];
  return allMemos.filter(m => m.scope === 'team' || m.uid === uid);
}

/** 取得特定日期 (YYYY-MM-DD) 的可見備忘錄 */
export function getMemosOnDay(dayStr) {
  return getVisibleMemos().filter(m => m.date === dayStr);
}

/** 開啟特定日期的「📌 備忘錄管理與快速新增」彈窗（供月曆、總表、或新增行程視窗直接呼叫） */
export function openDayMemoModal(defaultDate = ymd(), onUpdated = null) {
  const uid = myUid();
  let curDate = defaultDate || ymd();

  const renderModalContent = () => {
    const memosDoc = state.toolsData.get('memos') || { list: [] };
    const allMemos = Array.isArray(memosDoc.list) ? memosDoc.list : [];
    const dayMemos = allMemos
      .filter(m => (m.scope === 'team' || m.uid === uid) && m.date === curDate)
      .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));

    return `
      <div class="modal-head">
        <h3>📌 ${fmtMD(curDate)}（${weekdayZh(curDate)}）備忘錄提醒</h3>
        <button class="icon-btn" data-close>✕</button>
      </div>
      <div class="modal-body">
        <form id="cal-memo-add-form" class="form" style="background:#FFFDF5;border:1px solid #FDE68A;padding:12px 14px;border-radius:12px;margin-bottom:14px">
          <div style="font-size:12.5px;font-weight:800;color:#B45309;margin-bottom:8px">✨ 新增備忘提醒（支援單日或連續多日預排）</div>
          <div class="row2">
            <label class="field"><span>開始日期 <em>*</em></span>
              <input type="date" name="startDate" value="${esc(curDate)}" required>
            </label>
            <label class="field"><span>結束日期（可跨日建立）</span>
              <input type="date" name="endDate" value="${esc(curDate)}" required>
            </label>
          </div>
          <div class="row2">
            <label class="field"><span>可見範圍</span>
              <select name="scope">
                <option value="mine">🔒 個人備忘（僅自己可見）</option>
                <option value="team">📢 全組共享（提醒全體組員）</option>
              </select>
            </label>
            <label class="field"><span>備忘內容 <em>*</em></span>
              <input type="text" name="text" placeholder="輸入待辦事項，完成後點選即可消除…" required maxlength="120">
            </label>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:6px">
            <button type="submit" class="btn small primary">＋ 加入備忘錄</button>
          </div>
        </form>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <strong style="font-size:13.5px;color:#0F172A">📋 當日備忘清單（點擊項目即可勾選完成消除）</strong>
          <span class="muted tiny">共 ${dayMemos.length} 筆 · 未完成 ${dayMemos.filter(x => !x.done).length} 筆</span>
        </div>
        <div class="memo-list-wrap" style="max-height:280px">
          ${dayMemos.length === 0 ? `
            <div class="bw-empty">✨ ${fmtMD(curDate)} 尚無備忘事項，可由上方直接新增！</div>
          ` : dayMemos.map(m => `
            <div class="memo-item-row ${m.done ? 'is-done' : ''}" data-modal-toggle-memo="${esc(m.id)}" title="點擊即可打勾完成 / 消除">
              <span class="memo-check-box">${m.done ? '✅' : '⬜'}</span>
              <div class="memo-item-body">
                <div class="memo-item-text">${esc(m.text)}</div>
                <div class="memo-item-meta">
                  <span class="memo-scope-badge">${m.scope === 'team' ? `📢 ${esc(m.authorName)} 共享` : '🔒 個人私密'}</span>
                </div>
              </div>
              ${(m.uid === uid || isAdmin()) ? `<button type="button" class="memo-del-btn" data-modal-del-memo="${esc(m.id)}" title="永久刪除">✕</button>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-foot">
        <span class="hint">💡 提示：在月曆與總表上點擊「📌」角標，皆可隨時查看或打勾消除！</span>
        <span class="spacer"></span>
        <button type="button" class="btn" data-close>關閉</button>
      </div>
    `;
  };

  const m = openModal(renderModalContent());

  const bindModalEvents = () => {
    const form = m.el.querySelector('#cal-memo-add-form');
    if (form) {
      form.startDate.onchange = () => {
        if (form.endDate.value < form.startDate.value) form.endDate.value = form.startDate.value;
      };
      form.onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(form);
        const text = String(fd.get('text') || '').trim();
        const sDate = String(fd.get('startDate') || curDate);
        const eDate = String(fd.get('endDate') || sDate);
        const scope = String(fd.get('scope') || 'mine');
        if (!text) return;
        const days = eachDay(sDate, eDate >= sDate ? eDate : sDate).slice(0, 31); // 最多一次連建 31 天防呆
        const memosDoc = state.toolsData.get('memos') || { list: [] };
        const allMemos = Array.isArray(memosDoc.list) ? memosDoc.list : [];
        const newItems = days.map((dStr, idx) => ({
          id: 'mm_' + Date.now().toString(36) + '_' + idx + Math.random().toString(36).slice(2, 5),
          uid,
          authorName: state.me?.displayName || '組員',
          date: dStr,
          scope,
          text,
          done: false,
          createdAt: new Date().toISOString(),
        }));
        await saveToolsDoc('memos', { list: [...newItems, ...allMemos] });
        curDate = sDate;
        toast(days.length > 1 ? `已為 ${days.length} 天建立備忘錄！` : `已新增 ${fmtMD(sDate)} 備忘錄！`, 'success');
        m.el.innerHTML = renderModalContent();
        bindModalEvents();
        onUpdated?.();
      };
    }

    m.el.querySelectorAll('[data-modal-toggle-memo]').forEach(row => {
      row.onclick = async e => {
        if (e.target.closest('[data-modal-del-memo]')) return;
        const mid = row.dataset.modalToggleMemo;
        const memosDoc = state.toolsData.get('memos') || { list: [] };
        const allMemos = Array.isArray(memosDoc.list) ? memosDoc.list : [];
        const nextList = allMemos.map(x => x.id === mid ? { ...x, done: !x.done } : x);
        await saveToolsDoc('memos', { list: nextList });
        m.el.innerHTML = renderModalContent();
        bindModalEvents();
        onUpdated?.();
      };
    });

    m.el.querySelectorAll('[data-modal-del-memo]').forEach(btn => {
      btn.onclick = async e => {
        e.stopPropagation();
        const mid = btn.dataset.modalDelMemo;
        const memosDoc = state.toolsData.get('memos') || { list: [] };
        const allMemos = Array.isArray(memosDoc.list) ? memosDoc.list : [];
        const nextList = allMemos.filter(x => x.id !== mid);
        await saveToolsDoc('memos', { list: nextList });
        toast('已刪除備忘錄');
        m.el.innerHTML = renderModalContent();
        bindModalEvents();
        onUpdated?.();
      };
    });

    m.el.querySelectorAll('[data-close]').forEach(b => {
      b.onclick = () => m.close();
    });
  };

  bindModalEvents();
}

// 每日微投票題庫（依日期 Hash 自動輪播，全組同一天看到同一題）
const DAILY_POLL_QUESTIONS = [
  { q: '🧋 今天下午工作體感，你想來杯什麼？', a: '🧊 冰搖茶飲提神', b: '☕ 濃醇熱咖啡續命' },
  { q: '🚲 外出或通勤時，你最常依賴哪種運具？', a: '⚡ YouBike 2.0E 電輔車', b: '🛵 機車 / 大眾運輸' },
  { q: '🍱 中午吃飯最困擾你的是什麼？', a: '🤔 不知道要吃什麼', b: '⏳ 排隊等太久' },
  { q: '🌧️ 遇到午後雷陣雨，你的第一反應是？', a: '🧥 雨衣穿好照樣衝', b: '🏠 先躲超商喝杯東西' },
  { q: '📅 一週裡面哪一天最有戰鬥力？', a: '🔥 週二週三效率王', b: '🎉 週五準備放假最嗨' },
  { q: '🎧 整理報表或寫資料時習慣？', a: '🎵 戴耳機聽音樂專注', b: '🤫 保持安靜聽環境音' },
  { q: '🧾 去超商結帳時，你的發票習慣是？', a: '📱 手機條碼載具秒刷', b: '💳 直接存悠遊卡/信用卡' },
];

// 五大外勤區域座標（台北、桃園、新竹、台中、高雄）
const WEATHER_REGIONS = [
  { id: 'tpe', name: '雙北', lat: 25.033, lon: 121.565 },
  { id: 'tyn', name: '桃園', lat: 24.993, lon: 121.301 },
  { id: 'hsz', name: '新竹', lat: 24.813, lon: 120.967 },
  { id: 'txg', name: '台中', lat: 24.147, lon: 120.673 },
  { id: 'khh', name: '高屏', lat: 22.627, lon: 120.301 },
];

let cachedWeather = null;
let weatherLoading = false;
let memoViewMode = 'day'; // 'day' (聚焦所選日+未完成) | 'all' (全部待辦)

async function ensureQuickWeather(onUpdate) {
  if (cachedWeather || weatherLoading) return;
  weatherLoading = true;
  try {
    const results = await Promise.all(WEATHER_REGIONS.map(async r => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${r.lat}&longitude=${r.lon}&current=temperature_2m,weather_code&daily=precipitation_probability_max&timezone=Asia%2FTaipei&forecast_days=1`;
      const res = await fetch(url);
      const j = await res.json();
      const temp = Math.round(j.current?.temperature_2m ?? 26);
      const rain = j.daily?.precipitation_probability_max?.[0] ?? 10;
      const icon = rain >= 60 ? '🌧️' : rain >= 30 ? '⛅' : '☀️';
      return { ...r, temp, rain, icon };
    }));
    cachedWeather = results;
    onUpdate?.();
  } catch {
    cachedWeather = WEATHER_REGIONS.map(r => ({ ...r, temp: 26, rain: 20, icon: '⛅' }));
  } finally {
    weatherLoading = false;
  }
}

function getPollForDay(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  return {
    idx: h % DAILY_POLL_QUESTIONS.length,
    ...DAILY_POLL_QUESTIONS[h % DAILY_POLL_QUESTIONS.length],
  };
}

/**
 * 渲染首頁右側/下方高黏著度互動中樞 (Bento Hub)
 * @param {HTMLElement} container
 * @param {string} selectedDay 目前首頁檢視的日期 YYYY-MM-DD
 * @param {Function} onRerender
 */
export function renderStickyHub(container, selectedDay, onRerender) {
  if (!container) return;
  const today = ymd();
  const targetDay = selectedDay || today;
  const uid = myUid();
  ensureQuickWeather(() => renderStickyHub(container, selectedDay, onRerender));

  // 1. 取得備忘錄資料（支援個人備忘 + 團隊公開備忘，可綁定日期，點選打勾消除）
  const memosDoc = state.toolsData.get('memos') || { list: [] };
  const allMemos = Array.isArray(memosDoc.list) ? memosDoc.list : [];
  // 過濾出「屬於我個人」或「設為全組共享」的備忘錄
  const visibleMemos = allMemos.filter(m => m.scope === 'team' || m.uid === uid);
  // 依檢視模式篩選：
  // 'day': 顯示「目標日期 (targetDay)」的所有備忘 + 過去尚未完成的逾期備忘
  // 'all': 顯示所有未來預排與今日備忘
  const filteredMemos = visibleMemos.filter(m => {
    if (memoViewMode === 'all') return true;
    if (m.date === targetDay) return true;
    if (!m.done && m.date < targetDay) return true; // 未完成的過期備忘自動保留提醒
    return false;
  }).sort((a, b) => (a.done === b.done ? String(a.date).localeCompare(String(b.date)) : a.done ? 1 : -1));

  const pendingCount = visibleMemos.filter(m => !m.done && m.date <= targetDay).length;
  const upcomingCount = visibleMemos.filter(m => !m.done && m.date > targetDay).length;

  // 2. 取得下午茶 / 午餐揪團資料
  const groupBuyDoc = state.vibeShared.get('groupBuy') || { activeOrder: null };
  const activeOrder = groupBuyDoc.activeOrder;
  const orderItems = Array.isArray(activeOrder?.items) ? activeOrder.items : [];
  const totalOrderAmount = orderItems.reduce((s, it) => s + (Number(it.price) || 0), 0);

  // 3. 取得每日 PK 投票資料
  const pollInfo = getPollForDay(today);
  const pollsDoc = state.vibeShared.get('polls') || { votes: {} };
  const dayVotes = pollsDoc.votes?.[today] || { a: [], b: [] };
  const votesA = Array.isArray(dayVotes.a) ? dayVotes.a : [];
  const votesB = Array.isArray(dayVotes.b) ? dayVotes.b : [];
  const totalVotes = votesA.length + votesB.length;
  const pctA = totalVotes ? Math.round((votesA.length / totalVotes) * 100) : 50;
  const pctB = totalVotes ? 100 - pctA : 50;
  const myVote = votesA.includes(uid) ? 'a' : votesB.includes(uid) ? 'b' : '';

  // 4. 取得團隊感謝貼紙 (Kudos 誇誇牆)
  const kudosDoc = state.vibeShared.get('kudos') || { list: [] };
  const kudosList = Array.isArray(kudosDoc.list) ? kudosDoc.list : [];

  // 5. 五區天氣
  const weathers = cachedWeather || WEATHER_REGIONS.map(r => ({ ...r, temp: '--', rain: '--', icon: '🌤️' }));

  container.innerHTML = `
    <div class="sticky-bento-hub">
      <!-- 模組 A：📌 智慧備忘錄（可提早預排某幾天、點擊即打勾消除） -->
      <div class="card bento-widget memo-widget">
        <div class="bw-head">
          <div class="bw-title-wrap">
            <span class="bw-icon">📌</span>
            <div>
              <h3 class="bw-title">隨手備忘錄 & 預排提醒</h3>
              <div class="bw-sub">正在檢視：<b>${fmtMD(targetDay)} (${weekdayZh(targetDay)})</b> ${upcomingCount ? `· 未來預排 ${upcomingCount} 筆` : ''}</div>
            </div>
          </div>
          <div class="bw-actions">
            <button type="button" class="btn small ${memoViewMode === 'day' ? 'primary' : 'ghost'}" data-memo-mode="day" title="只看當日與未完成">當日(${pendingCount})</button>
            <button type="button" class="btn small ${memoViewMode === 'all' ? 'primary' : 'ghost'}" data-memo-mode="all" title="查看所有預排日期的備忘">全部(${visibleMemos.length})</button>
          </div>
        </div>

        <!-- 一鍵快速新增備忘列（預設帶入目前選取日期，亦可直接改選未來任一天） -->
        <form class="memo-quick-form" id="memo-quick-form">
          <input type="date" name="date" value="${esc(targetDay)}" class="memo-date-pick" title="選擇備忘生效日期（可提早預排未來幾天的事項）" required>
          <select name="scope" class="memo-scope-pick" title="僅自己可見或全組共享">
            <option value="mine">🔒 個人</option>
            <option value="team">📢 全組</option>
          </select>
          <input type="text" name="text" placeholder="輸入待辦或備忘（如：早上記得寄合約、週五帶樣品）…" required maxlength="120" class="memo-text-in">
          <button type="submit" class="btn small primary">＋ 記下</button>
        </form>

        <!-- 備忘錄清單（點選即可打勾消除） -->
        <div class="memo-list-wrap">
          ${filteredMemos.length === 0 ? `
            <div class="bw-empty">✨ ${fmtMD(targetDay)} 尚無待辦備忘，可於上方提早建立今天或未來幾天的提醒！</div>
          ` : filteredMemos.map(m => {
            const isOverdue = !m.done && m.date < today;
            const isFuture = m.date > targetDay;
            return `
              <div class="memo-item-row ${m.done ? 'is-done' : ''} ${isOverdue ? 'is-overdue' : ''}" data-toggle-memo="${esc(m.id)}" title="點擊即可勾選完成 / 消除">
                <span class="memo-check-box">${m.done ? '✅' : '⬜'}</span>
                <div class="memo-item-body">
                  <div class="memo-item-text">${esc(m.text)}</div>
                  <div class="memo-item-meta">
                    <span class="memo-date-badge ${isOverdue ? 'overdue' : isFuture ? 'future' : ''}">📅 ${fmtMD(m.date)} (${weekdayZh(m.date)})</span>
                    <span class="memo-scope-badge">${m.scope === 'team' ? `📢 ${esc(m.authorName)} 共享` : '🔒 個人'}</span>
                  </div>
                </div>
                <button type="button" class="memo-del-btn" data-del-memo="${esc(m.id)}" title="直接刪除此備忘">✕</button>
              </div>
            `;
          }).join('')}
          ${visibleMemos.some(m => m.done) ? `
            <div style="text-align:right;margin-top:4px">
              <button type="button" class="link tiny" data-clear-done-memos>🧹 清除所有已勾選完成項目</button>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- 模組 B：🌤️ 五區外勤穿搭/天氣雷達 ＋ 📊 每日 5 秒微投票 -->
      <div class="card bento-widget weather-poll-widget">
        <div class="bw-head" style="margin-bottom:6px">
          <span class="bw-title">🌤️ 全台五區即時天氣雷達</span>
          <a href="#/tools" class="link tiny">詳細預報 ▸</a>
        </div>
        <div class="hub-weather-strip">
          ${weathers.map(w => `
            <div class="hub-w-pill ${Number(w.rain) >= 50 ? 'rainy' : ''}" title="${esc(w.name)}：氣溫 ${w.temp}°C / 降雨機率 ${w.rain}%">
              <span class="hw-name">${esc(w.name)}</span>
              <span class="hw-icon">${w.icon} ${w.temp}°</span>
              <span class="hw-rain">💧${w.rain}%</span>
            </div>
          `).join('')}
        </div>

        <div class="hub-divider"></div>

        <!-- 每日微投票 PK -->
        <div class="bw-head" style="margin-bottom:6px">
          <span class="bw-title">📊 今日隨手投 PK</span>
          <span class="muted tiny">已有 ${totalVotes} 人表態</span>
        </div>
        <div class="poll-question-text">${esc(pollInfo.q)}</div>
        <div class="poll-options-row">
          <button type="button" class="poll-opt-btn ${myVote === 'a' ? 'voted-a' : ''}" data-vote-poll="a">
            <div class="poll-opt-top">
              <span>${esc(pollInfo.a)}</span>
              <strong>${pctA}% (${votesA.length})</strong>
            </div>
            <div class="poll-bar-bg"><div class="poll-bar-fill fill-a" style="width:${pctA}%"></div></div>
          </button>
          <button type="button" class="poll-opt-btn ${myVote === 'b' ? 'voted-b' : ''}" data-vote-poll="b">
            <div class="poll-opt-top">
              <span>${esc(pollInfo.b)}</span>
              <strong>${pctB}% (${votesB.length})</strong>
            </div>
            <div class="poll-bar-bg"><div class="poll-bar-fill fill-b" style="width:${pctB}%"></div></div>
          </button>
        </div>
      </div>

      <!-- 模組 C：🧋 下午茶 / 午餐揪團小幫手 -->
      <div class="card bento-widget groupbuy-widget">
        <div class="bw-head">
          <div class="bw-title-wrap">
            <span class="bw-icon">🧋</span>
            <div>
              <h3 class="bw-title">下午茶 / 午餐揪團板</h3>
              <div class="bw-sub">${activeOrder ? `🔥 <b>${esc(activeOrder.storeName)}</b> 揪團中（${esc(activeOrder.deadline || '隨時結單')}）` : '辦公室訂飲料、訂便當一鍵統計不洗版'}</div>
            </div>
          </div>
          <div class="bw-actions">
            ${activeOrder ? `
              <button type="button" class="btn small primary" data-join-order>＋ 我要點餐</button>
              ${(activeOrder.hostUid === uid || isAdmin()) ? `<button type="button" class="btn small danger ghost" data-close-order title="結單或結束揪團">結束</button>` : ''}
            ` : `
              <button type="button" class="btn small primary" data-start-order>📣 發起揪團</button>
            `}
          </div>
        </div>

        ${!activeOrder ? `
          <div class="bw-empty">目前沒有進行中的揪團，想喝手搖飲或訂午餐嗎？點右上角「📣 發起揪團」召集大家！</div>
        ` : `
          <div class="gb-info-bar">
            <span>👑 主揪：<b>${esc(activeOrder.hostName)}</b></span>
            ${activeOrder.menuUrl ? `<a href="${esc(activeOrder.menuUrl)}" target="_blank" rel="noopener" class="gb-menu-link">📖 查看店家菜單 ↗</a>` : ''}
            <span class="gb-summary">共 <b>${orderItems.length}</b> 份 · 總計 <b>$${totalOrderAmount}</b></span>
          </div>
          <div class="gb-items-list">
            ${orderItems.length === 0 ? `<div class="muted tiny" style="padding:6px 0">主揪剛開團，快搶頭香點餐！</div>` : orderItems.map(it => `
              <div class="gb-item-chip">
                <span class="gb-who">${esc(it.userName)}</span>
                <span class="gb-what">${esc(it.item)}</span>
                ${it.price ? `<span class="gb-price">$${esc(it.price)}</span>` : ''}
                <button type="button" class="gb-paid-btn ${it.paid ? 'paid' : ''}" data-toggle-paid="${esc(it.id)}" title="點擊切換已付錢/未付錢">${it.paid ? '💰已付' : '未付'}</button>
                ${(it.uid === uid || activeOrder.hostUid === uid || isAdmin()) ? `<button type="button" class="memo-del-btn" data-del-order-item="${esc(it.id)}">✕</button>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- 模組 D：🏆 經營 Team 感謝貼紙牆 (Kudos 誇誇牆) -->
      <div class="card bento-widget kudos-widget">
        <div class="bw-head">
          <div class="bw-title-wrap">
            <span class="bw-icon">🏆</span>
            <div>
              <h3 class="bw-title">團隊感謝貼紙 (Kudos 誇誇牆)</h3>
              <div class="bw-sub">給神隊友一張暖心感謝貼紙，凝聚團隊向心力</div>
            </div>
          </div>
          <button type="button" class="btn small primary" data-add-kudos>💌 送出感謝</button>
        </div>

        <div class="kudos-wall-list">
          ${kudosList.length === 0 ? `
            <div class="bw-empty">今天有夥伴幫了你一個大忙，或外勤冒雨巡檢很辛苦嗎？點「💌 送出感謝」貼張暖心貼紙吧！</div>
          ` : kudosList.slice(0, 4).map(k => {
            const hearts = Array.isArray(k.hearts) ? k.hearts : [];
            const liked = hearts.includes(uid);
            return `
              <div class="kudos-note-card">
                <div class="kudos-note-top">
                  <span class="kudos-badge">${esc(k.sticker || '🌟 神隊友')}</span>
                  <span class="kudos-to">致 <b>@${esc(k.toName)}</b></span>
                  <span class="muted tiny" style="margin-left:auto">來自 ${esc(k.fromName)}</span>
                </div>
                <div class="kudos-note-msg">${esc(k.message)}</div>
                <div class="kudos-note-foot">
                  <span class="muted tiny">${esc((k.at || '').slice(5, 10))}</span>
                  <div style="display:flex;gap:4px;align-items:center">
                    <button type="button" class="kudos-heart-btn ${liked ? 'active' : ''}" data-heart-kudos="${esc(k.id)}">❤️ ${hearts.length}</button>
                    ${(k.fromUid === uid || isAdmin()) ? `<button type="button" class="memo-del-btn" data-del-kudos="${esc(k.id)}">✕</button>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  // ================= 事件綁定 =================
  // 1. 備忘錄模式切換与新增/勾選/刪除
  container.querySelectorAll('[data-memo-mode]').forEach(btn => {
    btn.onclick = () => {
      memoViewMode = btn.dataset.memoMode;
      renderStickyHub(container, selectedDay, onRerender);
    };
  });

  const memoForm = container.querySelector('#memo-quick-form');
  if (memoForm) {
    memoForm.onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(memoForm);
      const text = String(fd.get('text') || '').trim();
      const date = String(fd.get('date') || targetDay);
      const scope = String(fd.get('scope') || 'mine');
      if (!text) return;
      const newItem = {
        id: 'mm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
        uid,
        authorName: state.me?.displayName || '組員',
        date,
        scope,
        text,
        done: false,
        createdAt: new Date().toISOString(),
      };
      await saveToolsDoc('memos', { list: [newItem, ...allMemos] });
      toast(`已新增 ${fmtMD(date)} 備忘錄！`, 'success');
      renderStickyHub(container, selectedDay, onRerender);
    };
  }

  container.querySelectorAll('[data-toggle-memo]').forEach(row => {
    row.onclick = async e => {
      if (e.target.closest('[data-del-memo]')) return;
      const mid = row.dataset.toggleMemo;
      const nextList = allMemos.map(m => m.id === mid ? { ...m, done: !m.done } : m);
      await saveToolsDoc('memos', { list: nextList });
      renderStickyHub(container, selectedDay, onRerender);
    };
  });

  container.querySelectorAll('[data-del-memo]').forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      const mid = btn.dataset.delMemo;
      const nextList = allMemos.filter(m => m.id !== mid);
      await saveToolsDoc('memos', { list: nextList });
      toast('已移除備忘錄');
      renderStickyHub(container, selectedDay, onRerender);
    };
  });

  const clearDoneBtn = container.querySelector('[data-clear-done-memos]');
  if (clearDoneBtn) {
    clearDoneBtn.onclick = async () => {
      const nextList = allMemos.filter(m => !(m.done && (m.uid === uid || isAdmin())));
      await saveToolsDoc('memos', { list: nextList });
      toast('已清理完成項目');
      renderStickyHub(container, selectedDay, onRerender);
    };
  }

  // 2. 每日微投票
  container.querySelectorAll('[data-vote-poll]').forEach(btn => {
    btn.onclick = async () => {
      const choice = btn.dataset.votePoll; // 'a' | 'b'
      const allPolls = { ...(pollsDoc.votes || {}) };
      const setA = new Set(votesA);
      const setB = new Set(votesB);
      setA.delete(uid);
      setB.delete(uid);
      if (choice === 'a') setA.add(uid);
      else setB.add(uid);
      allPolls[today] = { a: [...setA], b: [...setB] };
      await saveVibeDoc('polls', { votes: allPolls });
      renderStickyHub(container, selectedDay, onRerender);
    };
  });

  // 3. 下午茶/午餐揪團
  const startOrderBtn = container.querySelector('[data-start-order]');
  if (startOrderBtn) {
    startOrderBtn.onclick = () => openStartOrderModal(() => renderStickyHub(container, selectedDay, onRerender));
  }
  const joinOrderBtn = container.querySelector('[data-join-order]');
  if (joinOrderBtn && activeOrder) {
    joinOrderBtn.onclick = () => openJoinOrderModal(activeOrder, () => renderStickyHub(container, selectedDay, onRerender));
  }
  const closeOrderBtn = container.querySelector('[data-close-order]');
  if (closeOrderBtn) {
    closeOrderBtn.onclick = async () => {
      await saveVibeDoc('groupBuy', { activeOrder: null });
      toast('已結束本次揪團');
      renderStickyHub(container, selectedDay, onRerender);
    };
  }
  container.querySelectorAll('[data-toggle-paid]').forEach(btn => {
    btn.onclick = async () => {
      if (!activeOrder) return;
      const itemId = btn.dataset.togglePaid;
      const nextItems = orderItems.map(it => it.id === itemId ? { ...it, paid: !it.paid } : it);
      await saveVibeDoc('groupBuy', { activeOrder: { ...activeOrder, items: nextItems } });
      renderStickyHub(container, selectedDay, onRerender);
    };
  });
  container.querySelectorAll('[data-del-order-item]').forEach(btn => {
    btn.onclick = async () => {
      if (!activeOrder) return;
      const itemId = btn.dataset.delOrderItem;
      const nextItems = orderItems.filter(it => it.id !== itemId);
      await saveVibeDoc('groupBuy', { activeOrder: { ...activeOrder, items: nextItems } });
      renderStickyHub(container, selectedDay, onRerender);
    };
  });

  // 4. 團隊感謝貼紙 (Kudos)
  const addKudosBtn = container.querySelector('[data-add-kudos]');
  if (addKudosBtn) {
    addKudosBtn.onclick = () => openAddKudosModal(kudosList, () => renderStickyHub(container, selectedDay, onRerender));
  }
  container.querySelectorAll('[data-heart-kudos]').forEach(btn => {
    btn.onclick = async () => {
      const kid = btn.dataset.heartKudos;
      const nextList = kudosList.map(k => {
        if (k.id !== kid) return k;
        const s = new Set(Array.isArray(k.hearts) ? k.hearts : []);
        if (s.has(uid)) s.delete(uid);
        else s.add(uid);
        return { ...k, hearts: [...s] };
      });
      await saveVibeDoc('kudos', { list: nextList });
      renderStickyHub(container, selectedDay, onRerender);
    };
  });
  container.querySelectorAll('[data-del-kudos]').forEach(btn => {
    btn.onclick = async () => {
      const kid = btn.dataset.delKudos;
      const nextList = kudosList.filter(k => k.id !== kid);
      await saveVibeDoc('kudos', { list: nextList });
      renderStickyHub(container, selectedDay, onRerender);
    };
  });
}

function openStartOrderModal(onDone) {
  openModal(`
    <div class="modal-head">
      <h3>🧋 發起下午茶 / 午餐揪團</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="start-gb-form">
      <label class="field"><span>店家名稱 <em>*</em></span>
        <input type="text" name="storeName" required placeholder="例如：50嵐、得正、八方雲集">
      </label>
      <label class="field"><span>結單時間 / 備註</span>
        <input type="text" name="deadline" placeholder="例如：14:30 準時收單">
      </label>
      <label class="field"><span>菜單連結（選填）</span>
        <input type="url" name="menuUrl" placeholder="https://...">
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">開始揪團</button>
      </div>
    </form>
  `);
  document.getElementById('start-gb-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const activeOrder = {
      id: 'gb_' + Date.now().toString(36),
      storeName: f.storeName.value.trim(),
      deadline: f.deadline.value.trim(),
      menuUrl: f.menuUrl.value.trim(),
      hostUid: myUid(),
      hostName: state.me?.displayName || '組員',
      items: [],
      createdAt: new Date().toISOString(),
    };
    await saveVibeDoc('groupBuy', { activeOrder });
    closeModal();
    toast('已發起揪團！快招呼大家點餐吧！', 'success');
    onDone?.();
  };
}

function openJoinOrderModal(activeOrder, onDone) {
  openModal(`
    <div class="modal-head">
      <h3>🧋 跟團點餐：${esc(activeOrder.storeName)}</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="join-gb-form">
      <label class="field"><span>品項與甜度冰塊 <em>*</em></span>
        <input type="text" name="item" required placeholder="例如：四季春青茶 微糖微冰 加波霸">
      </label>
      <label class="field"><span>金額（元）</span>
        <input type="number" name="price" min="0" max="5000" placeholder="例如：45">
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">送出點餐</button>
      </div>
    </form>
  `);
  document.getElementById('join-gb-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const items = Array.isArray(activeOrder.items) ? [...activeOrder.items] : [];
    items.push({
      id: 'gbi_' + Date.now().toString(36),
      uid: myUid(),
      userName: state.me?.displayName || '組員',
      item: f.item.value.trim(),
      price: Number(f.price.value) || 0,
      paid: false,
    });
    await saveVibeDoc('groupBuy', { activeOrder: { ...activeOrder, items } });
    closeModal();
    toast('已加入點餐清單！', 'success');
    onDone?.();
  };
}

function openAddKudosModal(kudosList, onDone) {
  const users = activeUsers();
  const stickers = ['🌟 神隊友救援', '🚲 外勤超給力', '☕ 暖心好夥伴', '⚡ 效率天花板', '🙌 感謝大幫忙'];
  openModal(`
    <div class="modal-head">
      <h3>💌 送出團隊感謝貼紙 (Kudos)</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="kudos-form">
      <label class="field"><span>想感謝哪位夥伴？ <em>*</em></span>
        <select name="toName" required>
          <option value="全體經營 Team">💖 全體經營 Team</option>
          ${users.map(u => `<option value="${esc(u.displayName)}">${esc(u.displayName)}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>選擇榮譽貼紙 <em>*</em></span>
        <select name="sticker">
          ${stickers.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>感謝的話 <em>*</em></span>
        <textarea name="message" rows="3" required placeholder="例如：謝謝幫忙緊急處理場站報表、今天大雨出外勤辛苦了！"></textarea>
      </label>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">貼上感謝牆</button>
      </div>
    </form>
  `);
  document.getElementById('kudos-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const newKudos = {
      id: 'kd_' + Date.now().toString(36),
      fromUid: myUid(),
      fromName: state.me?.displayName || '組員',
      toName: f.toName.value,
      sticker: f.sticker.value,
      message: f.message.value.trim(),
      hearts: [myUid()],
      at: new Date().toISOString(),
    };
    await saveVibeDoc('kudos', { list: [newKudos, ...kudosList] });
    closeModal();
    toast('已將感謝貼紙張貼至首頁！', 'success');
    onDone?.();
  };
}
