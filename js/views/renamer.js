// AI 採購單據自動辨識與改名業務模組視圖
// 採用同源 iframe 內嵌 ./renamer.html?embed=1，搭配雲端 Firestore 金鑰保險箱與後台權限矩陣控管
import { state, hasModulePermission } from '../data.js';

export function mountRenamer(el) {
  const me = state.me || {};
  const canAccess = hasModulePermission(me, 'renamer');

  if (!canAccess) {
    el.innerHTML = `
      <div class="empty" style="padding:60px 20px; text-align:center;">
        <h2 style="color:var(--text); margin-bottom:8px;">無存取權限</h2>
        <p class="muted" style="max-width:440px; margin:0 auto 20px;">
          您尚未被開通「AI 單據辨識改名」模組存取權限。如需使用採購單據自動辨識與批次重新命名工具，請聯絡系統管理員於「管理 → 業務模組權限矩陣」協助配置。
        </p>
        <a href="#/today" class="btn primary">返回今日動態</a>
      </div>
    `;
    return {};
  }

  const RENAMER_URL = './renamer.html';
  const isMobile = window.matchMedia('(max-width: 860px)').matches;

  el.innerHTML = `
    <div class="toolbar">
      <h2 class="view-title">AI 單據辨識改名</h2>
      <div style="font-size:13px; color:var(--muted); font-weight:500;">
        AI 採購單據自動辨識與批次重新命名 · 雲端金鑰保險箱零暴露保護
      </div>
      <div class="toolbar-end" style="display:flex; gap:8px; flex-wrap:wrap;">
        <a href="${RENAMER_URL}" target="_blank" rel="noopener noreferrer" class="btn primary" style="font-weight:600; text-decoration:none;" title="在新分頁開啟完整獨立大視窗進行批次單據改名">
          <span>↗ 另開獨立大視窗</span>
        </a>
      </div>
    </div>

    ${isMobile ? `
      <div class="card pad bulletin-mobile-card">
        <div class="bmc-badge">💻 電腦版專屬檔案系統工具</div>
        <h3 style="margin:6px 0 8px;font-size:18px">請改用電腦版 Chrome / Edge 開啟操作</h3>
        <p class="muted" style="font-size:13.5px;line-height:1.65;margin:0 0 16px">
          「AI 採購單據自動辨識與改名工具」需透過桌面瀏覽器原生的本機資料夾讀寫介面（<code>File System Access API</code>）直接批次重新命名電腦資料夾內的單據照片。因手機與平板瀏覽器受作業系統沙盒限制不支援直接改寫本機資料夾檔名，請於電腦端使用 <b>Google Chrome</b> 或 <b>Microsoft Edge</b> 開啟本頁操作！
        </p>
        <div style="display:flex;flex-direction:column;gap:10px">
          <a href="${RENAMER_URL}" target="_blank" rel="noopener noreferrer" class="btn ghost" style="width:100%;text-decoration:none">
            🔎 仍想在新分頁預覽介面與金鑰狀態 ↗
          </a>
          <a href="#/today" class="btn primary" style="width:100%;text-decoration:none">
            返回今日動態
          </a>
        </div>
      </div>
    ` : `
      <div class="card bulletin-frame-card" style="padding:0; overflow:hidden; border-radius:12px; height:calc(100dvh - 150px); min-height:560px; position:relative; box-shadow:0 4px 20px rgba(15, 23, 42, 0.06); border:1px solid var(--line);">
        <div class="bulletin-loading-mask" data-renamer-loading>
          <div>正在載入 AI 採購單據辨識改名工具…</div>
          <a href="${RENAMER_URL}" target="_blank" rel="noopener noreferrer" class="btn sm ghost" data-renamer-fallback hidden style="margin-top:10px;text-decoration:none">載入較慢？點此直接另開獨立大視窗 ↗</a>
        </div>
        <iframe
          id="renamer-iframe"
          src="${RENAMER_URL}?embed=1"
          style="width:100%; height:100%; border:none; display:block; background:#f8fafc;"
          title="AI 採購單據自動辨識與改名工具"
          allow="clipboard-write; clipboard-read"
        ></iframe>
      </div>
    `}
  `;

  if (!isMobile) {
    const iframe = el.querySelector('#renamer-iframe');
    const mask = el.querySelector('[data-renamer-loading]');
    const fb = el.querySelector('[data-renamer-fallback]');
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
