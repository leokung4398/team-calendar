// 🧰 辦公室＆外勤百寶箱小工具（天氣預報、火車高鐵交通查詢、旅費/工作日計算機、團隊共用書籤捷徑）
import { state, myUid, isAdmin, saveToolsDoc } from '../data.js';
import { esc, ymd, toast, openModal, closeModal } from '../utils.js';

const WEATHER_REGIONS = [
  {
    id: 'north', label: '雙北基宜',
    cities: [
      { name: '台北市', lat: 25.0330, lon: 121.5654 },
      { name: '新北市', lat: 25.0120, lon: 121.4657 },
      { name: '基隆市', lat: 25.1276, lon: 121.7392 },
    ],
  },
  {
    id: 'taoyuan', label: '桃竹苗',
    cities: [
      { name: '桃園市', lat: 24.9936, lon: 121.3010 },
      { name: '新竹市', lat: 24.8138, lon: 120.9675 },
      { name: '苗栗縣', lat: 24.5602, lon: 120.8214 },
    ],
  },
  {
    id: 'central', label: '中彰投',
    cities: [
      { name: '台中市', lat: 24.1477, lon: 120.6736 },
      { name: '彰化縣', lat: 24.0518, lon: 120.5161 },
      { name: '南投縣', lat: 23.9610, lon: 120.9719 },
    ],
  },
  {
    id: 'south1', label: '雲嘉南',
    cities: [
      { name: '雲林縣', lat: 23.7092, lon: 120.4313 },
      { name: '嘉義市', lat: 23.4801, lon: 120.4491 },
      { name: '台南市', lat: 22.9997, lon: 120.2270 },
    ],
  },
  {
    id: 'south2', label: '高屏台東',
    cities: [
      { name: '高雄市', lat: 22.6273, lon: 120.3014 },
      { name: '屏東縣', lat: 22.6761, lon: 120.4929 },
      { name: '台東縣', lat: 22.7583, lon: 121.1444 },
    ],
  },
];

const DEFAULT_BOOKMARKS = [
  { id: 'bm_1', title: 'YouBike 官方場站地圖', url: 'https://www.youbike.com.tw/region/main/stations/', tag: '場站查詢', icon: '🚲' },
  { id: 'bm_2', title: '中央氣象署－鄉鎮天氣預報', url: 'https://www.cwa.gov.tw/V8/C/W/Town/Town.html?TID=6300100', tag: '天氣雷達', icon: '🌦️' },
  { id: 'bm_3', title: '台鐵列車時刻／誤點即時查詢', url: 'https://tip.railway.gov.tw/tra-tip-web/tip/tip001/tip112/gobytime', tag: '交通時刻', icon: '🚆' },
  { id: 'bm_4', title: '台灣高鐵時刻表與票價查詢', url: 'https://www.thsrc.com.tw/ArticleContent/a3b630bb-1066-4352-a1ef-58c7b4e8ef7c', tag: '交通時刻', icon: '🚄' },
  { id: 'bm_5', title: '1968 高速公路即時路況影像', url: 'https://1968.freeway.gov.tw/', tag: '外勤路況', icon: '🛣️' },
  { id: 'bm_6', title: '微笑單車採購電子佈告欄', url: 'https://leokung4398.github.io/procurement-board/', tag: '內部系統', icon: '📢' },
];

const STATIONS = ['南港', '台北', '板橋', '桃園', '中壢', '新竹', '竹南', '苗栗', '豐原', '台中', '新烏日', '彰化', '員林', '斗六', '嘉義', '新營', '台南', '新左營', '高雄', '屏東', '潮州'];

let weatherCache = new Map(); // city.name -> data

function weatherCodeToText(code) {
  if (code === 0) return { icon: '☀️', text: '晴朗' };
  if (code <= 3) return { icon: '⛅', text: '多雲時晴' };
  if (code <= 48) return { icon: '🌫️', text: '有霧/陰' };
  if (code <= 67) return { icon: '🌧️', text: '陣雨' };
  if (code <= 82) return { icon: '⛈️', text: '強陣雨' };
  return { icon: '🌩️', text: '雷雨' };
}

async function fetchRegionWeather(region, onDone) {
  let updated = false;
  await Promise.all(region.cities.map(async c => {
    if (weatherCache.has(c.name)) return;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTaipei&forecast_days=3`;
      const res = await fetch(url);
      if (res.ok) {
        const j = await res.json();
        weatherCache.set(c.name, j);
        updated = true;
      }
    } catch {}
  }));
  if (updated) onDone?.();
}

export function mountTools(el) {
  let activeRegionId = 'north';
  let fromStation = '台北';
  let toStation = '台中';
  let travelDate = ymd();
  let calcKm = 35;
  let calcRate = 3; // 油資/津貼每公里試算
  let calcToll = 0;
  let dateStart = ymd();
  let dateEnd = ymd();

  function render() {
    const region = WEATHER_REGIONS.find(r => r.id === activeRegionId) || WEATHER_REGIONS[0];
    fetchRegionWeather(region, render);

    const bmDoc = state.toolsData.get('bookmarks');
    const customBms = Array.isArray(bmDoc?.list) ? bmDoc.list : [];
    const allBookmarks = [...customBms, ...DEFAULT_BOOKMARKS];

    el.innerHTML = `
      <div class="toolbar">
        <div style="display:flex;align-items:center;gap:10px">
          <h2 class="view-title" style="margin:0">🧰 實用小工具百寶箱</h2>
          <span class="info-pill-tip" data-tip="整合外勤與內勤常用的即時天氣、台鐵高鐵查詢、里程旅費與工作日計算機，以及團隊共用書籤">ⓘ 說明</span>
        </div>
        <div class="toolbar-end">
          <button class="btn primary sm" data-add-bm>＋ 新增常用網站捷徑</button>
        </div>
      </div>

      <div class="tools-grid">
        <!-- 1. 全台各縣市即時天氣與降雨機率預報 -->
        <div class="card pad">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px">
            <h3 style="margin:0;font-size:15px">🌤️ 全台各區即時天氣與降雨機率</h3>
            <div class="seg">
              ${WEATHER_REGIONS.map(r => `<button class="${r.id === activeRegionId ? 'active' : ''}" data-w-region="${r.id}">${esc(r.label)}</button>`).join('')}
            </div>
          </div>
          <div class="weather-cards-row">
            ${region.cities.map(c => {
              const w = weatherCache.get(c.name);
              if (!w) {
                return `<div class="weather-mini-card"><div style="font-weight:700">${esc(c.name)}</div><div class="muted" style="font-size:12px;margin-top:8px">載入即時氣象中…</div></div>`;
              }
              const cur = w.current || {};
              const daily = w.daily || {};
              const wc = weatherCodeToText(cur.weather_code ?? 1);
              const pop = daily.precipitation_probability_max?.[0] ?? cur.precipitation_probability ?? 0;
              const tMax = daily.temperature_2m_max?.[0] ?? '--';
              const tMin = daily.temperature_2m_min?.[0] ?? '--';
              return `
                <div class="weather-mini-card">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong style="font-size:14.5px">${esc(c.name)}</strong>
                    <span style="font-size:22px">${wc.icon}</span>
                  </div>
                  <div style="font-size:22px;font-weight:800;margin:4px 0;color:var(--text)">
                    ${Math.round(cur.temperature_2m ?? 24)}°C
                    <span style="font-size:12px;font-weight:600;color:var(--muted)">(${esc(wc.text)})</span>
                  </div>
                  <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)">
                    <span>🌡️ ${Math.round(tMin)}° ~ ${Math.round(tMax)}°</span>
                    <span style="color:${pop >= 50 ? '#DC2626' : '#2563EB'};font-weight:700">☔ 降雨 ${pop}%</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 2. 台鐵／高鐵／交通時刻與場站快查 -->
        <div class="card pad">
          <h3 style="margin:0 0 10px;font-size:15px">🚆 台鐵／高鐵／交通與場站快查</h3>
          <div style="display:grid;grid-template-columns:1fr auto 1fr 1.2fr;gap:8px;align-items:center;margin-bottom:12px">
            <select data-st-from style="padding:7px 8px;border-radius:8px;border:1px solid var(--border);font-weight:600">
              ${STATIONS.map(s => `<option value="${s}" ${s === fromStation ? 'selected' : ''}>起點：${s}</option>`).join('')}
            </select>
            <button class="btn sm ghost" data-st-swap title="交換起訖站">⇄</button>
            <select data-st-to style="padding:7px 8px;border-radius:8px;border:1px solid var(--border);font-weight:600">
              ${STATIONS.map(s => `<option value="${s}" ${s === toStation ? 'selected' : ''}>終點：${s}</option>`).join('')}
            </select>
            <input type="date" data-st-date value="${esc(travelDate)}" style="padding:6px 8px;border-radius:8px;border:1px solid var(--border)">
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <a href="https://www.google.com/maps/dir/${encodeURIComponent(fromStation + '車站')}/${encodeURIComponent(toStation + '車站')}" target="_blank" rel="noopener" class="btn sm primary" style="text-decoration:none">🗺️ Google 大眾運輸路線 (${esc(fromStation)}→${esc(toStation)}) ↗</a>
            <a href="https://tip.railway.gov.tw/tra-tip-web/tip/tip001/tip112/gobytime" target="_blank" rel="noopener" class="btn sm" style="text-decoration:none">🚆 台鐵時刻表 ↗</a>
            <a href="https://www.thsrc.com.tw/ArticleContent/a3b630bb-1066-4352-a1ef-58c7b4e8ef7c" target="_blank" rel="noopener" class="btn sm" style="text-decoration:none">🚄 高鐵時刻表 ↗</a>
            <a href="https://www.youbike.com.tw/region/main/stations/" target="_blank" rel="noopener" class="btn sm" style="text-decoration:none">🚲 YouBike 全台場站即時車位 ↗</a>
          </div>
        </div>

        <!-- 3. 辦公室＆外勤雙合一計算機（出差里程試算 + 工作日天數計算） -->
        <div class="card pad">
          <h3 style="margin:0 0 10px;font-size:15px">🧮 出差里程試算 ＆ 日期工作日計算機</h3>
          <div class="grid2" style="gap:14px">
            <div style="background:#F8FAFC;padding:10px 12px;border-radius:10px;border:1px solid var(--border)">
              <div style="font-size:12.5px;font-weight:700;margin-bottom:6px">🛵 外勤里程／油資津貼試算</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
                <label style="font-size:11px;color:var(--muted)">公里數(km)
                  <input type="number" data-calc-km value="${calcKm}" min="0" style="width:100%;padding:5px;border-radius:6px;border:1px solid var(--border)">
                </label>
                <label style="font-size:11px;color:var(--muted)">每km補貼(元)
                  <input type="number" data-calc-rate value="${calcRate}" min="0" step="0.5" style="width:100%;padding:5px;border-radius:6px;border:1px solid var(--border)">
                </label>
                <label style="font-size:11px;color:var(--muted)">過路/停車費
                  <input type="number" data-calc-toll value="${calcToll}" min="0" style="width:100%;padding:5px;border-radius:6px;border:1px solid var(--border)">
                </label>
              </div>
              <div style="margin-top:8px;font-size:13px;font-weight:700;color:var(--primary)" data-calc-result>
                預估合計：NT$ ${Math.round(calcKm * calcRate + calcToll).toLocaleString()} 元
              </div>
            </div>

            <div style="background:#F8FAFC;padding:10px 12px;border-radius:10px;border:1px solid var(--border)">
              <div style="font-size:12.5px;font-weight:700;margin-bottom:6px">📅 區間天數／工作日計算</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
                <label style="font-size:11px;color:var(--muted)">起始日
                  <input type="date" data-d-start value="${esc(dateStart)}" style="width:100%;padding:4px;border-radius:6px;border:1px solid var(--border)">
                </label>
                <label style="font-size:11px;color:var(--muted)">結束日
                  <input type="date" data-d-end value="${esc(dateEnd)}" style="width:100%;padding:4px;border-radius:6px;border:1px solid var(--border)">
                </label>
              </div>
              <div style="margin-top:8px;font-size:12.5px;font-weight:700;color:var(--text)" data-d-result>
                ${calcDateDiffText(dateStart, dateEnd)}
              </div>
            </div>
          </div>
        </div>

        <!-- 4. 團隊常用網站＆表單捷徑區 -->
        <div class="card pad">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <h3 style="margin:0;font-size:15px">🔖 團隊常用系統與表單捷徑</h3>
            <button class="btn sm ghost" data-add-bm>＋ 新增書籤</button>
          </div>
          <div class="bookmarks-grid">
            ${allBookmarks.map(b => {
              const isCustom = String(b.id || '').startsWith('cbm_');
              const canDel = isCustom && (b.uid === myUid() || isAdmin());
              return `
                <div class="bm-chip-card">
                  <a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer" class="bm-chip-link">
                    <span class="bm-chip-icon">${esc(b.icon || '🔗')}</span>
                    <div style="min-width:0;flex:1">
                      <div class="bm-chip-title">${esc(b.title)}</div>
                      <div class="bm-chip-tag">${esc(b.tag || '常用連結')} ↗</div>
                    </div>
                  </a>
                  ${canDel ? `<button class="icon-btn" data-del-bm="${esc(b.id)}" title="移除書籤" style="font-size:11px;color:var(--danger)">✕</button>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // 綁定天氣區域切換
    el.querySelectorAll('[data-w-region]').forEach(btn => {
      btn.onclick = () => {
        activeRegionId = btn.dataset.wRegion;
        render();
      };
    });

    // 綁定車站切換
    const stFrom = el.querySelector('[data-st-from]');
    const stTo = el.querySelector('[data-st-to]');
    const stDate = el.querySelector('[data-st-date]');
    const stSwap = el.querySelector('[data-st-swap]');
    if (stFrom) stFrom.onchange = () => { fromStation = stFrom.value; render(); };
    if (stTo) stTo.onchange = () => { toStation = stTo.value; render(); };
    if (stDate) stDate.onchange = () => { travelDate = stDate.value; };
    if (stSwap) stSwap.onclick = () => { const tmp = fromStation; fromStation = toStation; toStation = tmp; render(); };

    // 綁定里程試算
    const kmIn = el.querySelector('[data-calc-km]');
    const rateIn = el.querySelector('[data-calc-rate]');
    const tollIn = el.querySelector('[data-calc-toll]');
    const resEl = el.querySelector('[data-calc-result]');
    const updateCalc = () => {
      calcKm = Number(kmIn?.value || 0);
      calcRate = Number(rateIn?.value || 0);
      calcToll = Number(tollIn?.value || 0);
      if (resEl) resEl.textContent = `預估合計：NT$ ${Math.round(calcKm * calcRate + calcToll).toLocaleString()} 元`;
    };
    if (kmIn) kmIn.oninput = updateCalc;
    if (rateIn) rateIn.oninput = updateCalc;
    if (tollIn) tollIn.oninput = updateCalc;

    // 綁定日期區間試算
    const dsIn = el.querySelector('[data-d-start]');
    const deIn = el.querySelector('[data-d-end]');
    const dRes = el.querySelector('[data-d-result]');
    const updateDateCalc = () => {
      dateStart = dsIn?.value || ymd();
      dateEnd = deIn?.value || ymd();
      if (dRes) dRes.textContent = calcDateDiffText(dateStart, dateEnd);
    };
    if (dsIn) dsIn.onchange = updateDateCalc;
    if (deIn) deIn.onchange = updateDateCalc;

    // 綁定書籤新增/刪除
    el.querySelectorAll('[data-add-bm]').forEach(btn => {
      btn.onclick = () => openAddBookmarkModal(customBms, render);
    });
    el.querySelectorAll('[data-del-bm]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.delBm;
        const next = customBms.filter(x => x.id !== id);
        await saveToolsDoc('bookmarks', { list: next });
        toast('已移除書籤');
        render();
      };
    });
  }

  render();
  return { onData: render };
}

function calcDateDiffText(s1, s2) {
  if (!s1 || !s2) return '請選擇日期';
  const d1 = new Date(s1 + 'T00:00:00');
  const d2 = new Date(s2 + 'T00:00:00');
  const diffDays = Math.round((d2 - d1) / 86400000);
  const absDays = Math.abs(diffDays) + 1;
  let workdays = 0;
  const start = d1 <= d2 ? new Date(d1) : new Date(d2);
  const end = d1 <= d2 ? new Date(d2) : new Date(d1);
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) workdays++;
  }
  return `共 ${absDays} 個日曆天（含約 ${workdays} 個平日工作天）`;
}

function openAddBookmarkModal(customBms, onDone) {
  openModal(`
    <div class="modal-head">
      <h3>🔖 新增團隊共用書籤捷徑</h3>
      <button class="icon-btn" data-close>✕</button>
    </div>
    <form class="form" id="bm-form">
      <label>網站或表單名稱 <span class="req">*</span>
        <input type="text" name="title" required placeholder="例如：營運處月報雲端資料夾">
      </label>
      <label>網址連結 (URL) <span class="req">*</span>
        <input type="url" name="url" required placeholder="https://...">
      </label>
      <div class="grid2">
        <label>分類標籤
          <input type="text" name="tag" value="團隊共用" placeholder="例如：常用表單">
        </label>
        <label>圖示 Emoji
          <input type="text" name="icon" value="🔗" maxlength="4">
        </label>
      </div>
      <div class="modal-foot">
        <button type="button" class="btn" data-close>取消</button>
        <button type="submit" class="btn primary">儲存捷徑</button>
      </div>
    </form>
  `);
  document.getElementById('bm-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const next = [
      {
        id: 'cbm_' + Date.now().toString(36),
        title: f.title.value.trim(),
        url: f.url.value.trim(),
        tag: f.tag.value.trim() || '團隊共用',
        icon: f.icon.value.trim() || '🔗',
        uid: myUid(),
      },
      ...customBms,
    ];
    await saveToolsDoc('bookmarks', { list: next });
    closeModal();
    toast('已新增共用書籤捷徑！');
    onDone?.();
  };
}
