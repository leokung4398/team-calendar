// 每日品管巡檢區域規劃模組（北區：Leo / Hao 雙北與外縣市巡檢；南區：南部各縣市巡檢）
import { state, myUid, dailyInspectionOf, saveDailyInspectionPlan } from '../data.js';
import { esc, avatar, ymd, toast } from '../utils.js';
import { INITIAL_DAILY_INSPECTION_DATA } from '../dailyInspectionData.js';

// 巡檢地點標籤色系（依 Excel 經典調色並融入精緻質感）
export function getLocationBadgeStyle(loc) {
  if (!loc) return { bg: '#ffffff', border: '#e2e8f0', text: '#64748b', icon: '' };
  
  // 1. 辦公室 / 會議 / 月會（Excel 亮紫底白字：#9333ea / #8b5cf6）
  if (loc.includes('辦公室') || loc.includes('月會') || loc.includes('開會')) {
    return { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff', icon: '🏢' };
  }
  // 2. 假 / 放假 / 特休（Excel 柔粉淡紅：#fecaca / #ffe4e6）
  if (loc.includes('假') || loc.includes('特休')) {
    return { bg: '#fecdd3', border: '#fda4af', text: '#9f1239', icon: '🏖️' };
  }
  // 3. 上課（淡紫薰衣草）
  if (loc.includes('上課')) {
    return { bg: '#f5d0fe', border: '#f0abfc', text: '#86198f', icon: '📖' };
  }
  // 4. 台中（Excel 亮青綠/湖水綠：#2dd4bf / #06b6d4）
  if (loc.includes('台中')) {
    return { bg: '#38bdf8', border: '#0284c7', text: '#0c4a6e', icon: '🚄' };
  }
  // 5. 桃園 / 新竹 / 台南 / 嘉義 / 屏東 / 台東（Excel 外縣市亮橘：#fb923c / #f97316）
  if (['桃園', '新竹', '台南', '嘉義', '屏東', '台東', '苗栗'].some(c => loc.includes(c))) {
    return { bg: '#fb923c', border: '#ea580c', text: '#431407', icon: '🚄' };
  }
  // 6. 高雄（高）或 雙北各行政區（Excel 天藍色：#93c5fd / #60a5fa）
  return { bg: '#93c5fd', border: '#60a5fa', text: '#1e3a8a', icon: '📍' };
}

export function renderDailyInspectionView(containerEl, zone = 'north', curMonth = '2026-10', onMonthChange = null) {
  const isNorth = zone === 'north';
  const defaultData = INITIAL_DAILY_INSPECTION_DATA[zone] || {};
  // 深度拷貝預設排程，避免淺層參照互相污染
  const defaultSchedules = JSON.parse(JSON.stringify(defaultData.schedules || {}));
  const defaultRules = JSON.parse(JSON.stringify(defaultData.rules || {}));
  
  // 優先採用 Firestore 雲端同步資料，若尚未載入或離線則以 LocalStorage 作為備援
  let localData = null;
  try {
    const raw = localStorage.getItem(`daily_inspection_${zone}`);
    if (raw) localData = JSON.parse(raw);
  } catch (e) {}

  const cloudData = dailyInspectionOf(zone);
  const savedData = (cloudData && Object.keys(cloudData).length > 0) ? cloudData : (localData || {});
  
  // 合併儲存與預設資料
  const rules = { ...defaultRules, ...(savedData.rules || {}) };
  const schedules = {};
  
  // 深度合併每個組員的排程
  const allMemberKeys = new Set([...Object.keys(defaultSchedules), ...Object.keys(savedData.schedules || {})]);
  allMemberKeys.forEach(k => {
    schedules[k] = {
      ...(defaultSchedules[k] || {}),
      ...((savedData.schedules && savedData.schedules[k]) || {})
    };
  });

  // 取得當前月份的第一天與最後一天
  const [yearNum, monthNum] = curMonth.split('-').map(Number);
  const firstDayOfMonth = new Date(yearNum, monthNum - 1, 1);
  const lastDayOfMonth = new Date(yearNum, monthNum, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // 決定日曆網格範圍（從該月第一週的週日到最後一週的週六）
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun
  const calStartDate = new Date(firstDayOfMonth);
  calStartDate.setDate(firstDayOfMonth.getDate() - startDayOfWeek);

  const endDayOfWeek = lastDayOfMonth.getDay();
  const calEndDate = new Date(lastDayOfMonth);
  calEndDate.setDate(lastDayOfMonth.getDate() + (6 - endDayOfWeek));

  // 產生整個月曆的所有日期陣列
  const calendarDates = [];
  const curIter = new Date(calStartDate);
  while (curIter <= calEndDate) {
    const y = curIter.getFullYear();
    const m = String(curIter.getMonth() + 1).padStart(2, '0');
    const d = String(curIter.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    calendarDates.push({
      dateStr,
      dayNum: curIter.getDate(),
      isCurrentMonth: curIter.getMonth() === monthNum - 1,
      dayOfWeek: curIter.getDay(),
      isWeekend: curIter.getDay() === 0 || curIter.getDay() === 6,
    });
    curIter.setDate(curIter.getDate() + 1);
  }

  // 人員名單：北區 Leo (孔令淳) & Hao (葉爵豪)；南區 Chun (陸逸群)
  const members = isNorth 
    ? [
        { key: 'Leo', name: '孔令淳 (Leo)', role: '北區品質檢驗主責' },
        { key: 'Hao', name: '葉爵豪 (Hao)', role: '北區品質檢驗主責' }
      ]
    : [
        { key: 'Chun', name: '陸逸群 (Chun)', role: '南區品質檢驗主責' }
      ];

  // 計算每人的當月統計指標
  const memberStats = {};
  members.forEach(m => {
    const sched = schedules[m.key] || {};
    let totalDutyDays = 0;
    let localDays = 0; // 雙北或高雄市區
    let travelDays = 0; // 外縣市
    let officeDays = 0;
    let leaveDays = 0;
    const regionCounts = {};

    Object.entries(sched).forEach(([dStr, loc]) => {
      if (dStr.startsWith(curMonth) && loc) {
        totalDutyDays++;
        if (loc.includes('辦公室') || loc.includes('月會') || loc.includes('開會')) {
          officeDays++;
        } else if (loc.includes('假') || loc.includes('特休')) {
          leaveDays++;
        } else if (['台中', '苗栗', '新竹', '桃園', '嘉義', '台南', '屏東', '台東'].some(c => loc.includes(c))) {
          travelDays++;
        } else {
          localDays++;
        }

        // 行政區頻率計數
        regionCounts[loc] = (regionCounts[loc] || 0) + 1;
      }
    });

    memberStats[m.key] = {
      totalDutyDays,
      localDays,
      travelDays,
      officeDays,
      leaveDays,
      regionCounts,
      // 出差申請單估計：雙北每 3 日一張
      localTripForms: Math.ceil(localDays / 3),
    };
  });

  const weekDayHeaders = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  containerEl.innerHTML = `
    <div class="daily-inspection-wrapper" style="display:flex; flex-direction:column; gap:12px;">
      
      <!-- 圖3 輕量化：頂部規則與行政區範圍（預設收合，點擊展開/收合） -->
      <details class="card insp-collapsible-card" style="background:linear-gradient(135deg, ${isNorth ? '#f0f9ff' : '#f0fdf4'} 0%, #ffffff 100%); border-left:4px solid ${isNorth ? '#0284c7' : '#16a34a'}; padding:10px 16px;">
        <summary class="insp-collapsible-summary">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:18px;">${isNorth ? '🧭' : '🌴'}</span>
            <h3 style="margin:0; font-size:15.5px; color:#0f172a;">
              ${isNorth ? '北區每日品管區域範圍' : '南區每日品管區域範圍'}（${yearNum} 年 ${monthNum} 月）
            </h3>
            <span class="badge-tag ${isNorth ? 'info' : 'ok'} small">${isNorth ? 'Leo & Hao 雙人協同' : '南部各縣市巡檢'}</span>
            <span class="insp-expand-hint">▸ 展開規則與行政區範圍</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;" onclick="event.stopPropagation()">
            <button type="button" class="btn primary small" data-save-daily-insp style="background:${isNorth ? '#0284c7' : '#16a34a'};">
              💾 儲存${isNorth ? '北區' : '南區'}每日排程
            </button>
          </div>
        </summary>

        <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #cbd5e1; font-size:12.5px; color:#334155;">
          <p style="margin:0 0 8px 0; color:#475569; line-height:1.5;">
            📌 <b>出差申請單規則：</b>${esc(rules.tripForm || '雙北 3 日申請一張，其他區域連續 2 日申請一張')} ｜ 
            🏢 <b>辦公室：</b>${esc(rules.office || '兩週一次、會議')}
          </p>
          ${isNorth ? `
            <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
              <b style="color:#0284c7;">🏙️ 新北市區：</b>
              <span style="color:#475569;">${rules.urban?.['新北市']?.join('、') || '中和、永和、新店、淡水、林口、蘆洲、土城、板橋、三重、新莊、樹林'}</span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:4px;">
              <b style="color:#0369a1;">🏛️ 台北市區：</b>
              <span style="color:#475569;">${rules.urban?.['台北市']?.join('、') || '松山、信義、大安、中山、中正、大同、萬華、文山、南港、內湖、士林、北投'}</span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:4px;">
              <b style="color:#d97706;">🏞️ 郊區範圍：</b>
              <span style="color:#64748b;">${rules.suburban?.join('、') || '深坑、鶯歌、三峽、汐止、八里、五股、泰山...'}</span>
              <span class="badge-tag warn tiny" style="margin-left:4px;">台大校區</span>
            </div>
          ` : `
            <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
              <b style="color:#16a34a;">🏙️ 高雄市區：</b>
              <span style="color:#475569;">${rules.urban?.['高雄市區']?.join('、') || '左營、鹽埕、前金、新興、苓雅、三民、鳳山'}</span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:4px;">
              <b style="color:#0284c7;">⚓ 台南三大線：</b>
              <span style="color:#475569;"><b>北門線：</b>${rules.subareas?.['台南北門線']?.slice(0, 5).join('、')}等 ｜ <b>七股線：</b>${rules.subareas?.['台南七股線']?.slice(0, 5).join('、')}等 ｜ <b>安平線：</b>${rules.subareas?.['台南安平線']?.slice(0, 5).join('、')}等</span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:4px;">
              <b style="color:#ea580c;">☀️ 屏東分區：</b>
              <span style="color:#475569;"><b>市區：</b>屏東、麟洛、竹田 ｜ <b>潮州：</b>潮州、東港、林邊 ｜ <b>恆春：</b>車城、恆春</span>
            </div>
          `}
        </div>
      </details>

      <!-- 組員排程日曆卡片 (並排或分卡) -->
      ${members.map(m => {
        const stats = memberStats[m.key] || {};
        const memberSchedule = schedules[m.key] || {};

        return `
          <div class="daily-compare-card" data-member-key="${m.key}">
            <div class="daily-user-header">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:32px; height:32px; border-radius:8px; background:${isNorth ? '#e0f2fe' : '#dcfce7'}; color:${isNorth ? '#0369a1' : '#15803d'}; font-weight:800; font-size:14px; display:flex; align-items:center; justify-content:center;">
                  ${m.key}
                </div>
                <div>
                  <h4 style="margin:0; font-size:14.5px; color:#1e293b;">${esc(m.name)}</h4>
                </div>
              </div>

              <!-- 輕量化單行統計膠囊 -->
              <div class="compact-kpi-strip">
                <span class="kpi-chip">雙北/在地 <b style="color:#15803d">${stats.localDays}</b>天</span>
                <span class="kpi-chip">外縣市 <b style="color:#2563eb">${stats.travelDays}</b>天</span>
                <span class="kpi-chip">進辦 <b style="color:#475569">${stats.officeDays}</b>天</span>
                <span class="kpi-chip" style="background:#fefce8;border-color:#fef08a;color:#854d0e">建議出差單 <b>${stats.localTripForms}</b>張</span>
              </div>
            </div>

            <!-- 星期標頭（高度還原 Excel 淡粉綠色調 #dcfce7） -->
            <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:8px; margin-bottom:8px; text-align:center; font-size:13px; font-weight:800;">
              ${weekDayHeaders.map((w, idx) => `
                <div style="padding:6px 0; background:${idx === 0 || idx === 6 ? '#fee2e2' : '#dcfce7'}; border:1px solid ${idx === 0 || idx === 6 ? '#fca5a5' : '#bbf7d0'}; border-radius:6px; color:${idx === 0 || idx === 6 ? '#b91c1c' : '#14532d'};">
                  ${w}
                </div>
              `).join('')}
            </div>

            <!-- 7欄日曆網格 -->
            <div class="daily-insp-grid">
              ${calendarDates.map(cell => {
                const val = memberSchedule[cell.dateStr] || '';
                const style = getLocationBadgeStyle(val);
                const isToday = cell.dateStr === ymd();

                return `
                  <div class="daily-insp-cell ${cell.isWeekend ? 'is-weekend' : ''} ${isToday ? 'is-today' : ''}" 
                       data-date="${cell.dateStr}" 
                       data-member="${m.key}"
                       style="${cell.isCurrentMonth ? '' : 'opacity:0.35;'} padding:4px;">
                    
                    <!-- 日期列（Excel 標頭：平日淡黃 #fef3c7，週末亮紅 #ef4444 白字） -->
                    <div class="cell-date-bar" style="margin-bottom:4px; padding:3px 6px; border-radius:4px; background:${cell.isWeekend ? '#ef4444' : '#fef9c3'}; border:1px solid ${cell.isWeekend ? '#dc2626' : '#fef08a'};">
                      <span class="cell-day-num" style="font-size:12px; font-weight:800; color:${cell.isWeekend ? '#ffffff' : '#78350f'};">
                        ${cell.dateStr.slice(5).replace('-', '/')}
                      </span>
                      ${isToday ? '<span class="badge-tag warn tiny" style="font-size:9px; padding:0 3px; background:#fff; color:#b45309; border:none;">今日</span>' : ''}
                    </div>

                    ${val ? `
                      <div class="cell-val-badge" 
                           data-loc-badge 
                           style="background:${style.bg}; border:1px solid ${style.border}; color:${style.text}; font-weight:800; font-size:13px; padding:8px 4px; border-radius:5px; box-shadow:0 1px 2px rgba(0,0,0,0.05);"
                           title="點擊編輯或清除：${esc(val)}">
                        <span>${esc(val)}</span>
                      </div>
                    ` : `
                      <button class="cell-empty-btn" data-add-loc-btn title="點選安排巡檢行政區或行程" style="border:1px dashed #cbd5e1; border-radius:5px; font-size:12px;">
                        ＋排定
                      </button>
                    `}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}

    </div>
  `;

  // 綁定儲存按鈕
  containerEl.querySelector('[data-save-daily-insp]')?.addEventListener('click', async () => {
    const btn = containerEl.querySelector('[data-save-daily-insp]');
    btn.disabled = true;
    btn.textContent = '儲存中…';

    // 儲存至本地快取與雲端
    try {
      const payload = { rules, schedules };
      localStorage.setItem(`daily_inspection_${zone}`, JSON.stringify(payload));
      
      try {
        await saveDailyInspectionPlan(zone, payload);
      } catch (cloudErr) {
        console.warn('雲端儲存略過（以本地為準）：', cloudErr);
      }
      
      toast(`已成功儲存${isNorth ? '北區' : '南區'}每日品管排程！`, 'ok');
    } catch (err) {
      console.error(err);
      toast('儲存失敗：' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = `💾 儲存${isNorth ? '北區' : '南區'}每日排程`;
    }
  });

  // 點擊新增或修改巡檢地點（彈出輸入與推薦選項）
  containerEl.querySelectorAll('.daily-insp-cell').forEach(cell => {
    const dateStr = cell.dataset.date;
    const memberKey = cell.dataset.member;

    const triggerEdit = () => {
      const currentVal = schedules[memberKey]?.[dateStr] || '';
      
      // 常用快選清單
      const recommendations = isNorth
        ? ['新店', '中正', '大安', '永和', '中和', '萬華', '板橋', '三重', '蘆洲', '士林', '北投', '林口', '三峽', '五股', '大同', '內湖', '文山', '桃園', '新竹', '台中', '苗栗', '辦公室', '辦公室/月會', '假', '特休']
        : ['左營', '三民', '前金', '新興', '苓雅', '鹽埕', '鳳山', '台南', '嘉義', '屏東', '台東', '開會/高', '辦公室/高', '放假'];

      const promptHtml = `
        <div style="font-size:14px; margin-bottom:12px;">
          請設定 <b>${esc(memberKey)}</b> 於 <b>${dateStr}</b> 的巡檢區域或行程：
        </div>
        <div style="margin-bottom:12px;">
          <input type="text" id="dlg-insp-loc" value="${esc(currentVal)}" class="input" style="width:100%; font-size:15px; padding:8px 12px;" placeholder="輸入行政區或行程（例如：新店、永和、辦公室、台中）">
        </div>
        <div style="font-size:12px; font-weight:700; color:#64748b; margin-bottom:6px;">⚡ 常用快選：</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px; max-height:160px; overflow-y:auto; padding:4px;">
          ${recommendations.map(r => `
            <button type="button" class="quick-chip-btn" data-chip="${esc(r)}">${esc(r)}</button>
          `).join('')}
        </div>
      `;

      // 簡易彈跳視窗
      const modalRoot = document.getElementById('modal-root') || document.body;
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-backdrop';
      modalOverlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;';
      
      modalOverlay.innerHTML = `
        <div class="modal" style="background:#fff; border-radius:12px; width:100%; max-width:440px; padding:20px; box-shadow:0 10px 25px rgba(0,0,0,0.15);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h3 style="margin:0; font-size:16px;">📍 設定巡檢地點</h3>
            <button type="button" class="btn icon ghost" data-dlg-close style="font-size:18px;">✕</button>
          </div>
          <div>${promptHtml}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; pt-3; border-top:1px solid #f1f5f9;">
            ${currentVal ? `<button type="button" class="btn danger small" data-dlg-clear>清空此日</button>` : '<div></div>'}
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn ghost small" data-dlg-close>取消</button>
              <button type="button" class="btn primary small" data-dlg-save>確定套用</button>
            </div>
          </div>
        </div>
      `;

      modalRoot.appendChild(modalOverlay);

      const locInput = modalOverlay.querySelector('#dlg-insp-loc');
      locInput.focus();
      locInput.select();

      modalOverlay.querySelectorAll('[data-chip]').forEach(chip => {
        chip.addEventListener('click', () => {
          locInput.value = chip.dataset.chip;
        });
      });

      const closeModal = () => modalOverlay.remove();
      modalOverlay.querySelectorAll('[data-dlg-close]').forEach(b => b.addEventListener('click', closeModal));

      const persistAndRerender = async () => {
        const payload = { rules, schedules };
        try {
          localStorage.setItem(`daily_inspection_${zone}`, JSON.stringify(payload));
        } catch (e) {}
        try {
          await saveDailyInspectionPlan(zone, payload);
        } catch (cloudErr) {
          console.warn('雲端儲存略過（以本地為準）：', cloudErr);
        }
        closeModal();
        renderDailyInspectionView(containerEl, zone, curMonth, onMonthChange);
      };

      modalOverlay.querySelector('[data-dlg-clear]')?.addEventListener('click', () => {
        if (!schedules[memberKey]) schedules[memberKey] = {};
        schedules[memberKey][dateStr] = ''; // 明確設為空字串，防止被預設值覆蓋
        persistAndRerender();
      });

      modalOverlay.querySelector('[data-dlg-save]').addEventListener('click', () => {
        const val = locInput.value.trim();
        if (!schedules[memberKey]) schedules[memberKey] = {};
        schedules[memberKey][dateStr] = val; // 設為新地點或空字串
        persistAndRerender();
      });
    };

    cell.querySelector('[data-loc-badge]')?.addEventListener('click', triggerEdit);
    cell.querySelector('[data-add-loc-btn]')?.addEventListener('click', triggerEdit);
  });
}
