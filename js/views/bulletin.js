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
        <h2 style="color:var(--text); margin-bottom:8px;">無存取權限</h2>
        <p class="muted" style="max-width:420px; margin:0 auto 20px;">
          您尚未被開通「採購佈告欄」模組存取權限。如需查閱每週採購重點與交期異動，請聯絡系統管理員協助配置。
        </p>
        <a href="#/today" class="btn primary">返回今日動態</a>
      </div>
    `;
    return {};
  }

  const BOARD_URL = 'https://leokung4398.github.io/procurement-board/';
  const ADMIN_URL = 'https://leokung4398.github.io/procurement-board/admin';
  const isMobile = window.matchMedia('(max-width: 860px)').matches;

  el.innerHTML = `
    <div class="toolbar">
      <h2 class="view-title">採購佈告欄</h2>
      <div style="font-size:13px; color:var(--muted); font-weight:500;">
        微笑單車採購電子週報 · 營運處閱讀打卡
      </div>
      <div class="toolbar-end" style="display:flex; gap:8px; flex-wrap:wrap;">
        <a href="${ADMIN_URL}" target="_blank" rel="noopener noreferrer" class="btn primary" style="font-weight:600; text-decoration:none;" title="前往採購週報管理後台（發布週報、閱讀打卡統計、設定中心）">
          <span>前往佈告欄後台</span>
          <span style="font-size:12px; opacity:0.8;">↗</span>
        </a>
        <a href="${BOARD_URL}" target="_blank" rel="noopener noreferrer" class="btn ghost" style="text-decoration:none;" title="在新分頁開啟全螢幕佈告欄">
          <span>↗ 另開新視窗</span>
        </a>
      </div>
    </div>

    ${isMobile ? `
      <!-- 行動端專屬啟動卡：徹底避免跨網域 iframe OAuth 封鎖與三層捲動陷阱 -->
      <div class="card pad bulletin-mobile-card">
        <div class="bmc-badge">📱 行動端最佳閱讀模式</div>
        <h3 style="margin:6px 0 8px;font-size:18px">微笑單車採購電子週報</h3>
        <p class="muted" style="font-size:13.5px;line-height:1.6;margin:0 0 16px">
          因手機瀏覽器安全政策會限制內嵌視窗進行 Google 企業帳號驗證，建議直接以全螢幕分頁開啟閱讀與完成打卡，順暢不卡頓！
        </p>
        <div style="display:flex;flex-direction:column;gap:10px">
          <a href="${BOARD_URL}" target="_blank" rel="noopener noreferrer" class="btn primary big" style="width:100%;text-decoration:none">
            📰 全螢幕開啟採購電子週報 ↗
          </a>
          <a href="${ADMIN_URL}" target="_blank" rel="noopener noreferrer" class="btn" style="width:100%;text-decoration:none">
            ⚙️ 前往採購佈告欄管理後台 ↗
          </a>
        </div>
        <details style="margin-top:16px;border-top:1px dashed var(--line);padding-top:12px" data-mobile-embed-toggle>
          <summary style="cursor:pointer;font-size:13px;font-weight:700;color:var(--muted)">仍想在此頁展開內嵌預覽 ▾</summary>
          <div data-mobile-iframe-host style="margin-top:10px"></div>
        </details>
      </div>
    ` : `
      <!-- 桌面端沉浸式大畫面容器 + 載入骨架提示 -->
      <div class="card bulletin-frame-card" style="padding:0; overflow:hidden; border-radius:12px; height:calc(100dvh - 150px); min-height:560px; position:relative; box-shadow:0 4px 20px rgba(15, 23, 42, 0.06); border:1px solid var(--line);">
        <div class="bulletin-loading-mask" data-bulletin-loading>
          <div>正在載入微笑單車採購佈告欄…</div>
          <a href="${BOARD_URL}" target="_blank" rel="noopener noreferrer" class="btn sm ghost" data-bulletin-fallback hidden style="margin-top:10px;text-decoration:none">載入較慢？點此直接另開新分頁 ↗</a>
        </div>
        <iframe
          id="bulletin-iframe"
          src="${BOARD_URL}?embed=1"
          style="width:100%; height:100%; border:none; display:block; background:#f8fafc;"
          title="微笑單車採購佈告欄"
          allow="clipboard-write; clipboard-read"
        ></iframe>
      </div>
    `}
  `;

  if (isMobile) {
    const det = el.querySelector('[data-mobile-embed-toggle]');
    const host = el.querySelector('[data-mobile-iframe-host]');
    if (det && host) {
      det.addEventListener('toggle', () => {
        if (det.open && !host.querySelector('iframe')) {
          host.innerHTML = `<iframe src="${BOARD_URL}?embed=1" style="width:100%;height:70dvh;border:1px solid var(--line);border-radius:10px;background:#f8fafc" title="微笑單車採購佈告欄預覽"></iframe>`;
        }
      });
    }
  } else {
    const iframe = el.querySelector('#bulletin-iframe');
    const mask = el.querySelector('[data-bulletin-loading]');
    const fb = el.querySelector('[data-bulletin-fallback]');
    const fbTimer = setTimeout(() => { if (fb) fb.hidden = false; }, 4500);
    if (iframe && mask) {
      iframe.onload = () => {
        clearTimeout(fbTimer);
        mask.remove();
      };
    }
  }

  return {};
}
