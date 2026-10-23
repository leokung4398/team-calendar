// 主程式：登入流程、版面、路由、通知中心
import { isConfigured, APP } from './config.js';
import { esc, avatar, toast, timeAgo, ymd, $ } from './utils.js';
import * as yb from './yb.js';

const app = document.getElementById('app');

if (!isConfigured) {
  app.innerHTML = `
    <div class="center-page"><div class="card pad narrow">
      <h2>⚙️ 尚未設定 Firebase</h2>
      <p>請開啟 <code>js/config.js</code>，將 Firebase 控制台中的 <code>firebaseConfig</code> 貼上後重新整理。</p>
      <p class="hint">詳細步驟請見專案中的 README.md。</p>
    </div></div>`;
} else {
  boot().catch(e => {
    console.error(e);
    app.innerHTML = `<div class="center-page"><div class="card pad narrow"><h2>載入失敗</h2><p>${esc(e.message)}</p></div></div>`;
  });
}

async function boot() {
  const data = await import('./data.js');
  const { watchAuth, login, logout, ensureProfile, isCompanyDomainEmail, startSync, ensureEventsFrom, state, onChange } = data;

  let started = false;
  watchAuth(async user => {
    if (!user) { started = false; return showLogin(); }
    if (!isCompanyDomainEmail(user.email)) {
      started = false;
      await logout();
      return showLogin(`請使用 @${APP.allowedDomains[0]} 公司帳號登入（目前為 ${user.email}）`);
    }
    if (started) return;
    started = true;
    app.innerHTML = `<div class="boot">${yb.wheelSpinner(44)}<span>登入中…</span></div>`;
    try {
      state.authUser = user;
      const me = await ensureProfile(user);
      if (!me.active) {
        started = false;
        return showDisabled(user.email);
      }
      state.me = me;
      startSync(err => {
        if (err?.code === 'permission-denied') toast('讀取資料被拒絕，帳號可能已被停用', 'error');
      });
      ensureEventsFrom(ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1 - 7)));
      await showShell(data);
    } catch (e) {
      started = false;
      console.error(e);
      if (e.message === 'not-in-whitelist') {
        showLogin(`此平台僅限經營 Team 同仁存取，您的帳號（${user.email}）不在授權名單中。如需權限請洽管理員於後台「＋ 新增組員」預先建檔。`);
      } else {
        showLogin(e.code === 'permission-denied'
          ? '沒有存取權限：請確認使用公司帳號，或請管理員於後台「＋ 新增組員」建檔授權。'
          : '登入時發生錯誤：' + (e.code || e.message));
      }
      await logout().catch(() => {});
    }
  });

  function showLogin(error = '') {
    const ua = navigator.userAgent || '';
    const isLineInApp = /Line\//i.test(ua);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    const host = location.hostname || '';

    // 1. 若手機從 github.io 或 .web.app 進入，自動無縫導向與 authDomain 完全同源的 https://team-calendar-93cb2.firebaseapp.com/
    //    既不會觸發 Google OAuth 400 redirect_uri_mismatch，也能徹底解決 iOS 跨網域 Storage Partitioning 造成的 "Unable to process request due to missing initial state"
    if (isMobile && (host.endsWith('github.io') || host.endsWith('.web.app'))) {
      const target = new URL('https://team-calendar-93cb2.firebaseapp.com/');
      if (isLineInApp) target.searchParams.set('openExternalBrowser', '1');
      location.replace(target.toString());
      return;
    }

    // 2. 若在 LINE 內建瀏覽器中開啟，且網址尚未加上 openExternalBrowser=1，自動跳轉喚起手機預設瀏覽器（Safari / Chrome）
    if (isLineInApp && !new URLSearchParams(location.search).has('openExternalBrowser')) {
      const u = new URL('https://team-calendar-93cb2.firebaseapp.com/');
      u.searchParams.set('openExternalBrowser', '1');
      location.replace(u.toString());
      return;
    }

    const externalUrl = 'https://team-calendar-93cb2.firebaseapp.com/?openExternalBrowser=1';

    // 預設成員快速選單（自動填入 @youbike.com.tw 帳號前綴，防呆避免手機誤用個人 @gmail.com）
    const memberPresets = [
      { name: '徐嘉鴻', prefix: 'jhsu' },
      { name: '孔令淳', prefix: 'leokung' },
      { name: '葉爵豪', prefix: 'chuehhaoyeh' },
      { name: '陸逸群', prefix: 'yichunlu' },
      { name: '張必忠', prefix: 'joshchang' },
      { name: '賴宜平', prefix: 'benlai' },
      { name: '包于巧', prefix: 'ciaopao' },
      { name: '陳麒任', prefix: 'aidpanchen' },
      { name: '丁美云', prefix: 'sunnyting' },
      { name: '蕭琮瀚', prefix: 'jackhsiao' },
    ];
    let savedEmail = '';
    try {
      savedEmail = new URLSearchParams(location.search).get('hint') || localStorage.getItem('yb_login_hint_email') || '';
    } catch {}
    const savedPrefix = savedEmail.endsWith('@youbike.com.tw') ? savedEmail.split('@')[0] : '';

    app.innerHTML = `
      <div class="center-page login-page">
        <div class="card pad narrow login-card">
          <div class="login-hero"><span class="rider">${yb.bike(132, { spin: true })}</span><div class="road"></div></div>
          <h1>經營 Team 營運協同平台</h1>
          <p class="muted">出差外勤行程、品管巡檢規劃、團隊會議與協同作業管理</p>
          ${isLineInApp ? `
            <div style="background:#FFFBEB;border:1px solid #F59E0B;color:#92400E;padding:12px 14px;border-radius:12px;font-size:13px;margin-bottom:14px;text-align:left;line-height:1.55">
              ⚠️ <b>偵測到 LINE 內建瀏覽器：</b><br>
              為避免手機登入被阻擋，請點選下方按鈕或右下角「<b>…</b>」→「<b>以預設瀏覽器開啟（Safari / Chrome）</b>」：
              <div style="margin-top:8px">
                <a href="${esc(externalUrl)}" target="_blank" rel="noopener" class="btn sm" style="display:inline-flex;background:#F59E0B;color:#fff;border:none;font-weight:700;text-decoration:none">🌐 點此以預設瀏覽器開啟</a>
              </div>
            </div>
          ` : ''}
          <div style="text-align:left;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:12px 14px;margin-bottom:14px">
            <label style="display:block;font-size:12.5px;font-weight:700;color:#334155;margin-bottom:6px">
              🛡️ 步驟 1：選擇您的姓名或輸入公司信箱（防呆避免誤登私人 Gmail）
            </label>
            <select data-member-select style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid #CBD5E1;font-size:14px;margin-bottom:8px;background:#fff;color:#0F172A;font-weight:600">
              <option value="">-- 點此快速選擇您的姓名（或於下方手動輸入） --</option>
              ${memberPresets.map(m => `<option value="${esc(m.prefix)}" ${m.prefix === savedPrefix ? 'selected' : ''}>${esc(m.name)}（${esc(m.prefix)}@youbike.com.tw）</option>`).join('')}
            </select>
            <div style="display:flex;align-items:center;background:#fff;border:1.5px solid #CBD5E1;border-radius:8px;overflow:hidden">
              <input type="text" data-email-prefix value="${esc(savedPrefix)}" placeholder="帳號前綴（例如 leokung）" autocapitalize="none" autocorrect="off" spellcheck="false" style="flex:1;border:none;padding:9px 10px;font-size:14px;outline:none;min-width:0;font-weight:600;color:#0F172A">
              <span style="background:#FEF3C7;color:#92400E;font-weight:700;font-size:13px;padding:9px 10px;border-left:1px solid #CBD5E1;white-space:nowrap">@youbike.com.tw</span>
            </div>
            <div style="font-size:11.5px;color:#64748B;margin-top:6px;line-height:1.4">
              💡 系統會自動帶入您的 <b>@youbike.com.tw</b> 帳號至 Google 驗證頁，防止手機自動跳去個人 <code>@gmail.com</code>。
            </div>
          </div>
          <button class="btn primary big" data-login style="width:100%;justify-content:center">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width="18" height="18"> 步驟 2：使用 YouBike 公司帳號登入
          </button>
          <p class="hint">僅限經營 Team 授權成員登入存取（@${esc(APP.allowedDomains.join(', @'))}）</p>
          ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
        </div>
      </div>`;

    const selEl = $('[data-member-select]');
    const prefixEl = $('[data-email-prefix]');
    if (selEl && prefixEl) {
      selEl.onchange = () => {
        if (selEl.value) prefixEl.value = selEl.value;
      };
      prefixEl.oninput = () => {
        const clean = prefixEl.value.trim().toLowerCase().replace(/@.*$/, '');
        if (prefixEl.value !== clean && prefixEl.value.includes('@')) {
          prefixEl.value = clean;
        }
        selEl.value = memberPresets.some(m => m.prefix === clean) ? clean : '';
      };
    }

    $('[data-login]').onclick = async () => {
      const rawPrefix = (prefixEl?.value || '').trim().toLowerCase().replace(/@.*$/, '');
      const hintEmail = rawPrefix ? `${rawPrefix}@${APP.allowedDomains[0]}` : '';
      try { await login(hintEmail); } catch (e) {
        if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
          showLogin('登入失敗：' + (e.code || e.message));
        }
      }
    };
  }

  function showDisabled(email) {
    app.innerHTML = `
      <div class="center-page"><div class="card pad narrow">
        <h2>帳號已停用</h2>
        <p>${esc(email)} 目前無法使用本系統，如有疑問請聯絡管理員。</p>
        <button class="btn" data-out>登出</button>
      </div></div>`;
    $('[data-out]').onclick = () => logout();
  }

  // 卸載舊的監聽器與計時器（重新登入或重新掛載時）
  let offChange = null;
  let shellCleanup = null;

  async function showShell(d) {
    shellCleanup?.();
    const V = '20261023v53';
    const [{ mountToday }, { mountSchedule }, { mountAdmin }, ef] = await Promise.all([
      import(`./views/today.js?v=${V}`), import(`./views/schedule.js?v=${V}`), import(`./views/admin.js?v=${V}`), import(`./eventForm.js?v=${V}`),
    ]);
    const { mountMeeting } = await import(`./views/meeting.js?v=${V}`);
    const { mountSimulation } = await import(`./views/simulation.js?v=${V}`);
    const { mountBulletin } = await import(`./views/bulletin.js?v=${V}`);
    const { mountDailyReport, initDailyReportFloatingWidget } = await import(`./views/dailyReport.js?v=${V}`);
    const { mountCases } = await import(`./views/cases.js?v=${V}`);
    const { mountTools } = await import(`./views/tools.js?v=${V}`);
    const { mountWishes, mountVents } = await import(`./views/feedback.js?v=${V}`);
    const { mountKaizen } = await import(`./views/kaizen.js?v=${V}`);
    const { initChatDrawer, toggleChatDrawer, getUnreadChatCount } = await import(`./chatDrawer.js?v=${V}`);

    const routes = {
      today: { label: '今日動態', icon: '🧭', mount: mountToday },
      schedule: { label: '行事曆', icon: '🗓️', mount: mountSchedule },
      meeting: { label: '月會', icon: '💼', mount: mountMeeting },
      cases: { label: '例案追蹤', icon: '📌', mount: mountCases },
      simulation: { label: '模擬體驗', icon: '🚲', mount: mountSimulation, permission: 'simulation' },
      dailyReport: { label: '每日回報', icon: '📝', mount: mountDailyReport, permission: 'dailyReport' },
      bulletin: { label: '採購佈告欄', icon: '📢', mount: mountBulletin, permission: 'bulletin' },
      tools: { label: '實用小工具', icon: '🧰', mount: mountTools, inMoreMenu: true },
      wishes: { label: '許願池', icon: '🌠', mount: mountWishes, inMoreMenu: true },
      vents: { label: '意見箱(抱怨箱)', icon: '🗣️', mount: mountVents, inMoreMenu: true },
      kaizen: { label: '改善提案', icon: '💡', mount: mountKaizen, inMoreMenu: true, admin: true },
      admin: { label: '管理', icon: '⚙️', mount: mountAdmin, admin: true },
    };
    const ctx = { month: ymd().slice(0, 7) };

    const { openGuideModal } = await import('./guideModal.js');

    app.innerHTML = `
      <header class="topbar">
        <div class="topbar-in">
          <a class="brand" href="#/today" title="Operations &amp; Collaboration Platform"><span class="brand-mark">${yb.bike(26)}</span><span>經營 Team 營運協同平台</span></a>
          <nav class="tabs" data-tabs></nav>
          <div class="top-actions">
            <button class="btn ghost chat-top-btn" data-open-chat-top title="開啟團隊即時聊天室" style="position:relative">
              💬 <span class="hide-sm">聊天室</span>
              <span class="badge" data-topbar-chat-badge hidden style="position:absolute;top:-5px;right:-5px"></span>
            </button>
            <button class="btn guide-btn" data-guide title="系統操作指引">📖 <span class="hide-sm">導覽</span></button>
            <button class="btn primary" data-new>＋ <span class="hide-sm">新增行程</span></button>
            <div class="bell-wrap">
              <button class="icon-btn bell" data-bell aria-label="通知">🔔<span class="badge" data-badge hidden></span></button>
              <div class="dropdown notif-panel" data-panel hidden></div>
            </div>
            <div class="user-wrap">
              <button class="icon-btn" data-user>${avatar(d.state.me, 30)}</button>
              <div class="dropdown user-menu" data-umenu hidden></div>
            </div>
          </div>
        </div>
      </header>
      ${d.DEMO ? '<div class="demo-ribbon">🧪 示範模式：9 位虛擬組員與自動產生的行程，資料只存在此頁面（不會寫入資料庫），重新整理即重置。<a href="./">離開示範模式</a></div>' : ''}
      <main class="main" data-main></main>
      <footer class="yb-foot">
        <div class="lane"><span class="rider">${yb.bike(40, { spin: true })}</span></div>
        <p>Have a nice ride・${esc(APP.groupName)}</p>
      </footer>`;

    const main = $('[data-main]');
    let current = null;
    let currentRoute = '';
    let hasPendingDailyReport = false;

    function renderTabs() {
      const moreKeys = ['tools', 'wishes', 'vents', 'kaizen'];
      const isMoreActive = moreKeys.includes(currentRoute);
      const activeMoreLabel = isMoreActive ? routes[currentRoute]?.label : '百寶箱';

      const mainLinksHtml = Object.entries(routes)
        .filter(([, r]) => {
          if (r.inMoreMenu) return false;
          if (r.admin && !d.isAdmin()) return false;
          if (r.permission && !d.hasModulePermission(d.state.me, r.permission)) return false;
          return true;
        })
        .map(([k, r]) => {
          const showDot = k === 'dailyReport' && hasPendingDailyReport;
          return `<a href="#/${k}" class="${k === currentRoute ? 'active' : ''}">${r.label}${showDot ? '<span class="dr-tab-dot" title="今日尚未填寫每日回報"></span>' : ''}</a>`;
        });

      const moreDropdownHtml = `
        <div class="nav-more-dropdown" tabindex="0">
          <span class="nav-more-trigger ${isMoreActive ? 'active' : ''}">✨ ${esc(activeMoreLabel)} ▾</span>
          <div class="nav-more-menu">
            <a href="#/tools" class="${currentRoute === 'tools' ? 'active' : ''}">🧰 實用小工具 <small>天氣/台鐵高鐵/試算</small></a>
            <a href="#/${currentRoute === 'vents' ? 'vents' : 'wishes'}" class="${(currentRoute === 'wishes' || currentRoute === 'vents') ? 'active' : ''}">⛲ 許願池 ＆ 解憂樹洞 <small>投幣許願 / 100%匿名樹洞</small></a>
            ${d.isAdmin() ? `<a href="#/kaizen" class="${currentRoute === 'kaizen' ? 'active' : ''}">💡 改善提案 <small>管理員專屬 · 圖卡與對照</small></a>` : ''}
          </div>
        </div>
      `;

      // 將「✨ 百寶箱」插在「管理」之前（若管理存在）或最後
      if (d.isAdmin()) {
        const adminLink = mainLinksHtml.pop();
        $('[data-tabs]').innerHTML = [...mainLinksHtml, moreDropdownHtml, adminLink].join('');
      } else {
        $('[data-tabs]').innerHTML = [...mainLinksHtml, moreDropdownHtml].join('');
      }
    }

    function route() {
      let key = (location.hash.match(/^#\/(\w+)/) || [])[1] || 'today';
      // 支援舊版連結轉向
      if (key === 'calendar' || key === 'grid') {
        localStorage.setItem('preferred_sched_view', key);
        location.hash = '#/schedule';
        return;
      }
      const targetRoute = routes[key];
      // 權限檢查：若無權限轉向 today
      if (!targetRoute || (targetRoute.admin && !d.isAdmin()) || (targetRoute.permission && !d.hasModulePermission(d.state.me, targetRoute.permission))) {
        key = 'today';
      }
      if (key === currentRoute) return;
      current?.destroy?.();
      currentRoute = key;
      main.innerHTML = '';
      const view = document.createElement('div');
      view.className = `view view-${key}`;
      main.appendChild(view);
      current = routes[key].mount(view, ctx) || {};
      renderTabs();
    }

    window.addEventListener('hashchange', route);
    route();

    $('[data-new]').onclick = () => ef.openEventEditor();
    $('[data-guide]').onclick = () => openGuideModal();
    $('[data-open-chat-top]').onclick = () => toggleChatDrawer();
    const destroyChat = initChatDrawer();

    // ---- 使用者選單 ----
    const umenu = $('[data-umenu]');
    $('[data-user]').onclick = e => {
      e.stopPropagation();
      panel.hidden = true;
      umenu.hidden = !umenu.hidden;
      const showAsAdmin = d.isAdmin() && !d.isHiddenAdmin?.(d.state.me);
      umenu.innerHTML = `
        <div class="um-head">${avatar(d.state.me, 40)}<div><b>${esc(d.state.me.displayName)}</b><div class="muted small-text">${esc(d.state.me.email)}</div><div class="small-text">${showAsAdmin ? '管理員' : '組員'}</div></div></div>
        <button class="menu-item" data-logout>登出</button>`;
      $('[data-logout]', umenu).onclick = () => { shellCleanup?.(); d.logout(); };
    };

    // ---- 通知中心 ----
    const panel = $('[data-panel]');
    let tab = 'mine';
    $('[data-bell]').onclick = e => {
      e.stopPropagation();
      umenu.hidden = true;
      panel.hidden = !panel.hidden;
      if (!panel.hidden) {
        tab = d.unreadNotifications().length || !d.unreadActivities().length ? 'mine' : 'team';
        renderPanel();
        if (tab === 'team') d.markActivitiesSeen();
      }
    };
    const onDocClick = e => {
      if (!panel.hidden && !e.target.closest('.bell-wrap') && !e.target.closest('.modal-backdrop')) panel.hidden = true;
      if (!umenu.hidden && !e.target.closest('.user-wrap')) umenu.hidden = true;
    };
    document.addEventListener('click', onDocClick);
    panel.addEventListener('click', e => {
      const t = e.target.closest('[data-tab]');
      if (t) {
        tab = t.dataset.tab;
        renderPanel();
        if (tab === 'team') d.markActivitiesSeen();
        return;
      }
      if (e.target.closest('[data-readall]')) {
        d.markNotificationsRead(d.unreadNotifications().map(n => n.id));
        return;
      }
      const item = e.target.closest('[data-event], [data-meeting]');
      if (item) {
        if (item.dataset.nid) d.markNotificationsRead([item.dataset.nid]);
        panel.hidden = true;
        if (item.dataset.meeting) {
          location.hash = '#/meeting';
          return;
        }
        if (item.dataset.action === 'delete') return toast('此行程已被刪除', 'info');
        if (item.dataset.event) ef.openEventById(item.dataset.event);
      }
    });

    const KIND = { deputy: '將你設為代理人', companion: '將你加入同行組員', onbehalf: '幫你登記了行程', recorder: '指派你為月會紀錄人', chat_mention: '在聊天室標註了你' };
    const ACTION = { create: '新增了', update: '修改了', delete: '刪除了', publish_minutes: '發布了' };

    function renderPanel() {
      const s = d.state;
      const unreadN = d.unreadNotifications().length;
      const unreadA = d.unreadActivities().length;
      const seen = s.me?.lastSeenActivityAt?.toMillis?.() ?? 0;
      let list;
      if (tab === 'mine') {
        list = s.notifications.length ? s.notifications.map(n => `
          <div class="notif ${n.read ? '' : 'unread'}" ${n.meetingId ? `data-meeting="${esc(n.meetingId)}"` : `data-event="${esc(n.eventId || '')}"`} data-nid="${esc(n.id)}">
            ${avatar(d.userOf(n.actorUid), 32)}
            <div><div><b>${esc(d.userName(n.actorUid))}</b> ${KIND[n.kind] || ''}</div><div class="muted small-text">${esc(n.summary)}</div><div class="muted tiny">${timeAgo(n.createdAt)}</div></div>
          </div>`).join('') : '<div class="empty small">沒有通知</div>';
      } else {
        list = s.activities.length ? s.activities.map(a => {
          const isMeetingAct = !!a.meetingId;
          const owner = !isMeetingAct && a.ownerUid && a.ownerUid !== a.actorUid ? `${esc(d.userName(a.ownerUid))} 的` : '';
          const targetNoun = isMeetingAct ? (a.action === 'publish_minutes' ? '會議紀錄' : '月會資訊') : `${owner}行程`;
          const isNew = a.actorUid !== s.me.uid && (a.createdAt?.toMillis?.() ?? 0) > seen;
          return `
          <div class="notif ${isNew ? 'unread' : ''}" ${isMeetingAct ? `data-meeting="${esc(a.meetingId)}"` : `data-event="${esc(a.eventId || '')}"`} data-action="${esc(a.action)}">
            ${avatar(d.userOf(a.actorUid), 32)}
            <div><div><b>${esc(d.userName(a.actorUid))}</b> ${ACTION[a.action] || ''}${targetNoun}</div><div class="muted small-text ${a.action === 'delete' ? 'strike' : ''}">${esc(a.summary)}</div><div class="muted tiny">${timeAgo(a.createdAt)}</div></div>
          </div>`;
        }).join('') : '<div class="empty small">尚無動態</div>';
      }
      panel.innerHTML = `
        <div class="np-tabs">
          <button data-tab="mine" class="${tab === 'mine' ? 'active' : ''}">與我相關${unreadN ? ` <span class="badge inline">${unreadN}</span>` : ''}</button>
          <button data-tab="team" class="${tab === 'team' ? 'active' : ''}">全組動態${unreadA ? ` <span class="badge inline">${unreadA}</span>` : ''}</button>
        </div>
        ${tab === 'mine' && unreadN ? '<div class="np-actions"><button class="link" data-readall>全部標為已讀</button></div>' : ''}
        <div class="np-list">${list}</div>`;
    }

    function renderBadge() {
      const n = d.unreadNotifications().length + d.unreadActivities().length;
      const b = $('[data-badge]');
      b.hidden = !n;
      b.textContent = n > 99 ? '99+' : n;
      document.title = `${n ? `(${n}) ` : ''}經營 Team 營運協同平台`;
    }

    const drWidget = initDailyReportFloatingWidget(isPending => {
      if (hasPendingDailyReport !== isPending) {
        hasPendingDailyReport = isPending;
        renderTabs();
      }
    });

    offChange?.();
    let purgeChecked = false;
    offChange = onChange(() => {
      renderBadge();
      drWidget?.refresh?.();
      renderTabs();
      // 若使用者目前的模組權限被管理員即時移除，自動導回今日動態
      const curTarget = routes[currentRoute];
      if (curTarget && ((curTarget.admin && !d.isAdmin()) || (curTarget.permission && !d.hasModulePermission(d.state.me, curTarget.permission)))) {
        location.hash = '#/today';
      }
      if (!panel.hidden) renderPanel();
      current?.update?.();
      current?.onData?.();
      // 管理員登入時，自動刪除停用已滿期限的組員（每次登入只檢查一次）
      if (!purgeChecked && d.isAdmin() && d.state.loaded.users) {
        purgeChecked = true;
        d.purgeExpiredUsers()
          .then(names => names.length && toast(`已自動刪除停用滿 ${APP.purgeAfterDays} 天的組員：${names.join('、')}`, 'info'))
          .catch(e => console.warn('purge', e));
      }
    });
    renderBadge();

    // ---- 月會開會前 10 分鐘貼心提醒 ----
    let remindedMeetings = new Set();
    const checkMeetingReminder = () => {
      const today = ymd();
      const nowMin = d.nowMinutes ? d.nowMinutes() : (new Date().getHours() * 60 + new Date().getMinutes());
      const m = d.meetingOn(today);
      if (m && m.startTime && !remindedMeetings.has(m.id)) {
        const [h, min] = m.startTime.split(':').map(Number);
        const mStartMin = h * 60 + min;
        // 開會前 10 分鐘至開始後 5 分鐘內提醒
        if (nowMin >= mStartMin - 10 && nowMin <= mStartMin + 5) {
          remindedMeetings.add(m.id);
          toast(`📢 月會即將於 ${m.startTime} 開始！請記得加入 Meet（麥克風靜音、關閉喇叭）`, 'warn');
        }
      }
    };
    const meetInterval = setInterval(checkMeetingReminder, 30000);
    checkMeetingReminder();

    shellCleanup = () => {
      window.removeEventListener('hashchange', route);
      document.removeEventListener('click', onDocClick);
      clearInterval(meetInterval);
      drWidget?.destroy?.();
      destroyChat?.();
      offChange?.();
      current?.destroy?.();
    };
  }
}
