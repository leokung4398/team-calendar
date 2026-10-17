// 採購佈告欄業務模組視圖
// 整合微笑單車採購週報前台與管理後台，無縫串接採購 Firebase 資料庫與權限體系
import { state, myUid, isAdmin, hasModulePermission } from '../data.js';
import { esc, avatar, toast } from '../utils.js';

export function mountBulletin(el) {
  const me = state.me || {};
  const canAccess = hasModulePermission(me, 'bulletin');

  if (!canAccess) {
    el.innerHTML = `
      <div class="empty" style="padding:60px 20px; text-align:center;">
        <div style="font-size:48px; margin-bottom:12px;">🔒</div>
        <h2 style="color:var(--text); margin-bottom:8px;">無存取權限</h2>
        <p class="muted" style="max-width:420px; margin:0 auto 20px;">
          您尚未被開通「📢 採購佈告欄」模組存取權限。如需查閱每週採購重點與交期異動，請聯絡系統管理員協助配置。
        </p>
        <a href="#/today" class="btn primary">返回今日動態</a>
      </div>
    `;
    return {};
  }

  // 取得採購後台白名單資訊或當前使用者資訊
  const userEmail = (me.email || '').toLowerCase();
  const userName = me.displayName || me.email || '同仁';

  el.innerHTML = `
    <div class="toolbar">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:22px;">📢</span>
        <h2 class="view-title" style="text-align:left;">採購佈告欄</h2>
      </div>
      <div style="font-size:13px; color:var(--muted); font-weight:500;">
        微笑單車採購電子週報 · 營運處閱讀打卡
      </div>
      <div class="toolbar-end" style="display:flex; gap:8px; justify-content:flex-end;">
        <a href="https://leokung4398.github.io/procurement-board/admin" target="_blank" rel="noopener noreferrer" class="btn primary" style="font-weight:600; text-decoration:none;" title="前往採購週報管理後台（發布週報、閱讀打卡統計、設定中心）">
          <span>⚙️ 前往佈告欄後台</span>
          <span style="font-size:12px; opacity:0.8;">↗</span>
        </a>
        <a href="https://leokung4398.github.io/procurement-board/" target="_blank" rel="noopener noreferrer" class="btn ghost" style="text-decoration:none;" title="在新分頁開啟全螢幕佈告欄">
          <span>↗ 另開新視窗</span>
        </a>
      </div>
    </div>

    <!-- 採購前台沉浸式全螢幕大畫面容器 -->
    <div class="card bulletin-frame-card" style="padding:0; overflow:hidden; border-radius:12px; height:calc(100vh - 150px); min-height:720px; position:relative; box-shadow:0 4px 20px rgba(15, 23, 42, 0.06); border:1px solid #e2e8f0;">
      <iframe
        id="bulletin-iframe"
        src="https://leokung4398.github.io/procurement-board/"
        style="width:100%; height:100%; border:none; display:block; background:#f8fafc;"
        title="微笑單車採購佈告欄"
        allow="clipboard-write; clipboard-read"
      ></iframe>
    </div>
  `;

  return {};
}
