// 行程檢視 / 編輯對話框
import {
  state, myUid, isAdmin, canEdit, userOf, userName, typeOf, activeTypes, activeUsers,
  eventList, saveEvent, deleteEvent, fetchEvent,
} from './data.js';
import { PERIODS, periodText, dateRangeText, findOverlaps } from './schedule.js';
import { esc, ymd, openModal, confirmDialog, toast, avatar, $, $$, timeAgo } from './utils.js';
import { openDayMemoModal } from './views/stickyHub.js?v=20261023v60';

const PHONE_KEY = 'team-cal-last-phone';

// ---------------- 檢視 ----------------
export async function openEventById(id) {
  const ev = await fetchEvent(id).catch(() => null);
  if (!ev) return toast('此行程已被刪除', 'warn');
  openEventViewer(ev);
}

export function openEventViewer(ev) {
  const t = typeOf(ev.typeId);
  const row = (label, value) => value ? `<div class="kv"><dt>${label}</dt><dd>${value}</dd></div>` : '';
  const people = ev.participantUids.map(u => `<span class="person">${avatar(userOf(u), 22)}${esc(userName(u))}${u === ev.ownerUid && ev.participantUids.length > 1 ? '<small>（登記人）</small>' : ''}</span>`).join('');
  const body = `
    <div class="ev-view">
      <div class="ev-type" style="--c:${esc(t.color)}">${esc(t.name)}</div>
      <dl>
        ${row('組員', `<div class="people">${people}</div>`)}
        ${row('日期', esc(dateRangeText(ev)))}
        ${row('時段', esc(periodText(ev)))}
        ${row('事由 / 備註', esc(ev.reason).replace(/\n/g, '<br>'))}
      </dl>
      <p class="meta">最後修改：${esc(userName(ev.updatedBy))} ${ev.updatedAt ? '・' + timeAgo(ev.updatedAt) : ''}</p>
    </div>`;
  const editable = canEdit(ev);
  const m = openModal({
    title: '行程內容',
    body,
    footer: editable
      ? `<button type="button" class="btn danger ghost" data-del>刪除</button><span class="spacer"></span><button type="button" class="btn" data-close>關閉</button><button type="button" class="btn primary" data-edit>編輯</button>`
      : `<span class="hint">只有登記人或管理員可以修改</span><span class="spacer"></span><button type="button" class="btn" data-close>關閉</button>`,
  });
  if (editable) {
    $('[data-edit]', m.el).onclick = () => { m.close(); openEventEditor({ ev }); };
    $('[data-del]', m.el).onclick = async () => { if (await confirmAndDelete(ev)) m.close(); };
  }
}

async function confirmAndDelete(ev) {
  const ok = await confirmDialog(`確定要刪除這筆行程嗎？<br><b>${esc(typeOf(ev.typeId).name)}｜${esc(dateRangeText(ev))}</b>`, { okText: '刪除', danger: true });
  if (!ok) return false;
  try {
    await deleteEvent(ev);
    toast('已刪除行程', 'success');
    return true;
  } catch (e) {
    console.error(e);
    toast('刪除失敗：' + (e.code || e.message), 'error');
    return false;
  }
}

// ---------------- 編輯 ----------------
/**
 * @param {{ev?:object, date?:string, ownerUid?:string}} opts
 */
export function openEventEditor({ ev = null, date = null, ownerUid = null } = {}) {
  const me = myUid();
  const admin = isAdmin();
  if (ev && !canEdit(ev)) return openEventViewer(ev);
  const types = activeTypes();
  if (!types.length) return toast('尚未設定行程類型，請管理員至「管理」頁新增', 'warn');

  const users = activeUsers();
  const owner = ev?.ownerUid || (admin && ownerUid) || me;
  const d = date || ymd();
  const v = ev || {
    ownerUid: owner, typeId: types[0].id, startDate: d, endDate: d, period: 'full',
    startTime: '08:30', endTime: '09:30', location: '', reason: '',
    phone: localStorage.getItem(PHONE_KEY) || '', canAnswer: true,
    deputyUid: '', companionUids: [], returnAt: '',
  };
  // 編輯既有行程時，若類型已停用仍需能顯示
  const typeChoices = types.some(t => t.id === v.typeId) ? types : [typeOf(v.typeId), ...types];

  const ownerField = admin
    ? `<label class="field"><span>組員 <em>*</em></span><select name="ownerUid">${users.map(u => `<option value="${esc(u.uid)}" ${u.uid === v.ownerUid ? 'selected' : ''}>${esc(u.displayName)}${u.uid === me ? '（我）' : ''}</option>`).join('')}</select><small class="hint">管理員可以代組員登記</small></label>`
    : `<div class="field"><span>組員</span><div class="static">${avatar(userOf(v.ownerUid), 22)} ${esc(userName(v.ownerUid))}</div><input type="hidden" name="ownerUid" value="${esc(v.ownerUid)}"></div>`;

  const initSt = v.period === 'am' ? '08:30' : v.period === 'pm' ? '13:00' : (v.startTime || '08:30');
  const initEt = v.period === 'am' ? '12:00' : v.period === 'pm' ? '17:30' : (v.endTime || '17:30');

  const modeSwitchBar = !ev ? `
    <div style="display:flex;align-items:center;justify-content:space-between;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:6px 10px;margin-bottom:12px">
      <span style="font-size:12.5px;font-weight:700;color:#334155">選擇要建立的項目：</span>
      <div style="display:flex;gap:6px">
        <button type="button" class="btn small primary" style="padding:4px 12px">差勤行程</button>
        <button type="button" class="btn small ghost" data-switch-to-memo style="padding:4px 12px;border-color:#FCD34D;background:#FFFBEB;color:#B45309;font-weight:700">備忘錄提醒</button>
      </div>
    </div>
  ` : '';

  const body = `
  ${modeSwitchBar}
  <form id="ev-form" class="form" novalidate>
    ${ownerField}
    <div class="field"><span>類型 <em>*</em></span>
      <div class="type-picker">${typeChoices.map(t => `
        <label class="type-opt" style="--c:${esc(t.color)}"><input type="radio" name="typeId" value="${esc(t.id)}" ${t.id === v.typeId ? 'checked' : ''}><span>${esc(t.name)}</span></label>`).join('')}
      </div>
    </div>
    <div class="row2">
      <label class="field"><span>開始日期 <em>*</em></span><input type="date" name="startDate" value="${esc(v.startDate)}" required></label>
      <label class="field"><span>結束日期 <em>*</em></span><input type="date" name="endDate" value="${esc(v.endDate)}" required></label>
    </div>
    <div class="field"><span>時段 <em>*</em></span>
      <div class="seg">${PERIODS.map(p => `<label><input type="radio" name="period" value="${p.id}" ${p.id === v.period ? 'checked' : ''}><span>${p.label}</span></label>`).join('')}</div>
      <div class="row2 custom-times" ${v.period === 'full' ? 'hidden' : ''} style="margin-top:8px">
        <label class="field"><span data-st>開始時間</span><input type="time" name="startTime" value="${esc(initSt)}"></label>
        <label class="field"><span data-et>結束時間</span><input type="time" name="endTime" value="${esc(initEt)}"></label>
      </div>
    </div>
    <label class="field"><span>事由 / 備註</span><textarea name="reason" rows="2" maxlength="500">${esc(v.reason)}</textarea></label>
    <div class="field"><span>同行組員 <small class="hint">（行程會同時出現在同行者的行事曆）</small></span>
      <div class="chip-select">${users.map(u => `
        <label class="chip-opt" data-uid="${esc(u.uid)}"><input type="checkbox" name="companionUids" value="${esc(u.uid)}" ${v.companionUids?.includes(u.uid) ? 'checked' : ''}><span>${esc(u.displayName)}</span></label>`).join('')}
      </div>
    </div>
    <p class="form-error" hidden></p>
  </form>`;

  const m = openModal({
    title: ev ? '編輯行程' : '新增行程',
    body,
    wide: true,
    footer: `${ev ? '<button type="button" class="btn danger ghost" data-del>刪除</button>' : ''}<span class="spacer"></span><button type="button" class="btn" data-close>取消</button><button type="submit" form="ev-form" class="btn primary" data-save>儲存</button>`,
  });
  const form = $('#ev-form', m.el);
  const errEl = $('.form-error', form);
  const switchMemoBtn = $('[data-switch-to-memo]', m.el);
  if (switchMemoBtn) {
    switchMemoBtn.onclick = () => {
      const pickedDate = form.startDate?.value || d;
      m.close();
      openDayMemoModal(pickedDate);
    };
  }

  // 互動：時段切換（上午自動帶入 08:30-12:00、下午自動帶入 13:00-17:30，若手動改時間則自動切至自訂時段）、日期連動、排除登記人自己
  const syncPeriod = (changedByRadio = false) => {
    const p = form.period.value;
    $('.custom-times', form).hidden = (p === 'full');
    if (changedByRadio) {
      if (p === 'am') {
        form.startTime.value = '08:30';
        form.endTime.value = '12:00';
      } else if (p === 'pm') {
        form.startTime.value = '13:00';
        form.endTime.value = '17:30';
      }
    }
    const multi = form.startDate.value !== form.endDate.value;
    $('[data-st]', form).textContent = multi ? '首日開始時間' : '開始時間';
    $('[data-et]', form).textContent = multi ? '末日結束時間' : '結束時間';
  };
  const syncTimeEdited = () => {
    const st = form.startTime.value;
    const et = form.endTime.value;
    const p = form.period.value;
    if (p === 'am' && (st !== '08:30' || et !== '12:00')) {
      form.period.value = 'custom';
    } else if (p === 'pm' && (st !== '13:00' || et !== '17:30')) {
      form.period.value = 'custom';
    }
  };
  const syncOwner = () => {
    const o = form.ownerUid.value;
    $$('.chip-opt', form).forEach(el => {
      const self = el.dataset.uid === o;
      el.hidden = self;
      if (self) el.querySelector('input').checked = false;
    });
  };
  form.addEventListener('change', e => {
    if (e.target.name === 'period') syncPeriod(true);
    if (e.target.name === 'startTime' || e.target.name === 'endTime') syncTimeEdited();
    if (e.target.name === 'ownerUid') syncOwner();
    if (e.target.name === 'startDate' && form.endDate.value < form.startDate.value) form.endDate.value = form.startDate.value;
    if (e.target.name === 'startDate' || e.target.name === 'endDate') syncPeriod(false);
  });
  syncPeriod(false);
  syncOwner();

  if (ev) $('[data-del]', m.el).onclick = async () => { if (await confirmAndDelete(ev)) m.close(); };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.hidden = true;
    const data = readForm(form);
    const err = validate(data);
    if (err) { errEl.textContent = err; errEl.hidden = false; return; }

    const cand = { ...data, id: ev?.id, participantUids: [data.ownerUid, ...data.companionUids] };
    const overlaps = findOverlaps(cand, eventList());
    if (overlaps.length) {
      const list = overlaps.slice(0, 5).map(o => `<li>${esc(o.participantUids.map(userName).join('、'))}：${esc(typeOf(o.typeId).name)}｜${esc(dateRangeText(o))} ${esc(periodText(o))}</li>`).join('');
      const ok = await confirmDialog(`這筆行程與以下行程時間重疊：<ul class="overlap-list">${list}</ul>仍要儲存嗎？`, { okText: '仍要儲存', title: '時間重疊提醒' });
      if (!ok) return;
    }

    const btn = $('[data-save]', m.el);
    btn.disabled = true;
    btn.textContent = '儲存中…';
    try {
      await saveEvent(data, ev);
      toast(ev ? '已更新行程' : '已新增行程', 'success');
      m.close();
    } catch (e2) {
      console.error(e2);
      errEl.textContent = '儲存失敗：' + (e2.code === 'permission-denied' ? '沒有權限' : (e2.code || e2.message));
      errEl.hidden = false;
      btn.disabled = false;
      btn.textContent = '儲存';
    }
  });
}

function readForm(form) {
  const fd = new FormData(form);
  let period = fd.get('period');
  const st = fd.get('startTime') || '';
  const et = fd.get('endTime') || '';
  // 若選了上午或下午，但微調過時間，自動歸為自訂時段以保留精確區間
  if (period === 'am' && (st !== '08:30' || et !== '12:00')) period = 'custom';
  if (period === 'pm' && (st !== '13:00' || et !== '17:30')) period = 'custom';
  return {
    ownerUid: fd.get('ownerUid'),
    typeId: fd.get('typeId') || '',
    startDate: fd.get('startDate') || '',
    endDate: fd.get('endDate') || '',
    period,
    startTime: period === 'custom' ? st : '',
    endTime: period === 'custom' ? et : '',
    location: '',
    reason: (fd.get('reason') || '').trim(),
    phone: '',
    canAnswer: true,
    deputyUid: '',
    companionUids: fd.getAll('companionUids').filter(u => u !== fd.get('ownerUid')),
    returnAt: '',
  };
}

function validate(d) {
  if (!d.ownerUid) return '請選擇組員';
  if (!d.typeId) return '請選擇類型';
  if (!d.startDate || !d.endDate) return '請填寫開始與結束日期';
  if (d.endDate < d.startDate) return '結束日期不可早於開始日期';
  if (d.period === 'custom') {
    if (!d.startTime || !d.endTime) return '請填寫開始與結束時間';
    if (d.startDate === d.endDate && d.endTime <= d.startTime) return '結束時間必須晚於開始時間';
  }
  return '';
}
