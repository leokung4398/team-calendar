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
      await logout();
      return showLogin(`請使用 @${APP.allowedDomains[0]} 公司帳號登入（目前為 ${user.email}）`);
    }
    if (started) return;
    app.innerHTML = `<div class="boot">${yb.wheelSpinner(44)}<span>登入中…</span></div>`;
    try {
      state.authUser = user;
      const me = await ensureProfile(user);
      if (!me.active) return showDisabled(user.email);
      state.me = me;
      started = true;
      startSync(err => {
        if (err?.code === 'permission-denied') toast('讀取資料被拒絕，帳號可能已被停用', 'error');
      });
      ensureEventsFrom(ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1 - 7)));
      showShell(data);
    } catch (e) {
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
    app.innerHTML = `
      <div class="center-page login-page">
        <div class="card pad narrow login-card">
          <div class="login-hero"><span class="rider">${yb.bike(132, { spin: true })}</span><div class="road"></div></div>
          <h1>經營 Team 營運協同平台</h1>
          <p class="muted">出差外勤行程、品管巡檢規劃、團隊會議與協同作業管理</p>
          <button class="btn primary big" data-login>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width="18" height="18"> 使用公司 Google 帳號登入
          </button>
          <p class="hint">僅限經營 Team 授權成員登入存取（@${esc(APP.allowedDomains.join(', @'))}）</p>
          ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
        </div>
      </div>`;
    $('[data-login]').onclick = async () => {
      try { await login(); } catch (e) {
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
    const [{ mountToday }, { mountSchedule }, { mountAdmin }, ef] = await Promise.all([
      import('./views/today.js'), import('./views/schedule.js'), import('./views/admin.js'), import('./eventForm.js'),
    ]);
    const { mountMeeting } = await import('./views/meeting.js');
    const { mountSimulation } = await import('./views/simulation.js');
    const { mountBulletin } = await import('./views/bulletin.js');
    const { mountDailyReport, initDailyReportFloatingWidget } = await import('./views/dailyReport.js');
    const routes = {
      today: { label: '今日動態', icon: '🧭', mount: mountToday },
      schedule: { label: '行事曆', icon: '🗓️', mount: mountSchedule },
      meeting: { label: '月會', icon: '💼', mount: mountMeeting },
      simulation: { label: '模擬體驗', icon: '🚲', mount: mountSimulation, permission: 'simulation' },
      dailyReport: { label: '每日回報', icon: '📝', mount: mountDailyReport, permission: 'dailyReport' },
      bulletin: { label: '採購佈告欄', icon: '📢', mount: mountBulletin, permission: 'bulletin' },
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
            <button class="btn guide-btn" data-guide title="系統操作指引">📖 <span class="hide-sm">功能導覽</span></button>
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
      $('[data-tabs]').innerHTML = Object.entries(routes)
        .filter(([, r]) => {
          if (r.admin && !d.isAdmin()) return false;
          if (r.permission && !d.hasModulePermission(d.state.me, r.permission)) return false;
          return true;
        })
        .map(([k, r]) => {
          const showDot = k === 'dailyReport' && hasPendingDailyReport;
          return `<a href="#/${k}" class="${k === currentRoute ? 'active' : ''}">${r.label}${showDot ? '<span class="dr-tab-dot" title="今日尚未填寫每日回報"></span>' : ''}</a>`;
        }).join('');
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

    const KIND = { deputy: '將你設為代理人', companion: '將你加入同行組員', onbehalf: '幫你登記了行程', recorder: '指派你為月會紀錄人' };
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
      offChange?.();
      current?.destroy?.();
    };
  }
}
