// 匯出 Excel：指定月份、全組員（可篩選）的行程明細
import { activeUsers, fetchEventsInRange, typeOf, userName } from './data.js';
import { periodText } from './schedule.js';
import { esc, monthRange, openModal, toast, loadScript, $, $$ } from './utils.js';

const XLSX_SRC = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';

export function openExportDialog(month) {
  const users = activeUsers();
  const m = openModal({
    title: '匯出 Excel',
    body: `
      <form id="export-form" class="form">
        <label class="field"><span>月份</span><input type="month" name="month" value="${esc(month)}" required></label>
        <div class="field"><span>組員 <button type="button" class="link" data-all>全選</button> / <button type="button" class="link" data-none>全不選</button></span>
          <div class="chip-select">${users.map(u => `<label class="chip-opt"><input type="checkbox" name="uid" value="${esc(u.uid)}" checked><span>${esc(u.displayName)}</span></label>`).join('')}</div>
        </div>
        <p class="hint">每筆行程一列；同行組員會列在同一筆中。</p>
      </form>`,
    footer: `<span class="spacer"></span><button type="button" class="btn" data-close>取消</button><button type="submit" form="export-form" class="btn primary" data-go>下載</button>`,
  });
  $('[data-all]', m.el).onclick = () => $$('[name=uid]', m.el).forEach(c => { c.checked = true; });
  $('[data-none]', m.el).onclick = () => $$('[name=uid]', m.el).forEach(c => { c.checked = false; });

  $('#export-form', m.el).addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const ym = fd.get('month');
    const picked = new Set(fd.getAll('uid'));
    if (!ym) return toast('請選擇月份', 'warn');
    if (!picked.size) return toast('請至少選擇一位組員', 'warn');
    const btn = $('[data-go]', m.el);
    btn.disabled = true;
    btn.textContent = '產生中…';
    try {
      await loadScript(XLSX_SRC);
      const { from, to } = monthRange(ym);
      const events = (await fetchEventsInRange(from, to))
        .filter(ev => ev.participantUids.some(u => picked.has(u)))
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || userName(a.ownerUid).localeCompare(userName(b.ownerUid), 'zh-Hant'));
      const rows = events.map(ev => ({
        '開始日期': ev.startDate,
        '結束日期': ev.endDate,
        '時段': periodText(ev),
        '類型': typeOf(ev.typeId).name,
        '組員': userName(ev.ownerUid),
        '同行組員': (ev.companionUids || []).map(userName).join('、'),
        '地點/拜訪對象': ev.location || '',
        '事由/備註': ev.reason || '',
        '聯絡手機': ev.phone || '',
        '可接電話': ev.canAnswer === false ? '否' : '是',
        '代理人': ev.deputyUid ? userName(ev.deputyUid) : '',
        '預計回辦公室': (ev.returnAt || '').replace('T', ' '),
        '最後修改者': userName(ev.updatedBy),
      }));
      const XLSX = window.XLSX;
      const ws = XLSX.utils.json_to_sheet(rows, { header: ['開始日期', '結束日期', '時段', '類型', '組員', '同行組員', '地點/拜訪對象', '事由/備註', '聯絡手機', '可接電話', '代理人', '預計回辦公室', '最後修改者'] });
      ws['!cols'] = [12, 12, 18, 10, 10, 16, 22, 30, 14, 8, 10, 16, 10].map(wch => ({ wch }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, ym);
      XLSX.writeFile(wb, `經營Team行事曆_${ym}.xlsx`);
      toast(`已匯出 ${rows.length} 筆行程`, 'success');
      m.close();
    } catch (err) {
      console.error(err);
      toast('匯出失敗：' + (err.code || err.message), 'error');
      btn.disabled = false;
      btn.textContent = '下載';
    }
  });
}
