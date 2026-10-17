// 行程檢視 / 編輯對話框
import {
  state, myUid, isAdmin, canEdit, userOf, userName, typeOf, activeTypes, activeUsers,
  eventList, saveEvent, deleteEvent, fetchEvent,
} from './data.js';
import { PERIODS, periodText, dateRangeText, findOverlaps } from './schedule.js';
import { esc, ymd, openModal, confirmDialog, toast, avatar, $, $$, timeAgo } from './utils.js';

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
  const phone = ev.phone
    ? `<a href="tel:${esc(ev.phone)}">${esc(ev.phone)}</a> ${ev.canAnswer ? '<span class="tag ok">可接電話</span>' : '<span class="tag no">不方便接聽</span>'}`
    : (ev.canAnswer === false ? '<span class="tag no">不方便接聽</span>' : '');
  const body = `
    <div class="ev-view">
      <div class="ev-type" style="--c:${esc(t.color)}">${esc(t.name)}</div>
      <dl>
        ${row('組員', `<div class="people">${people}</div>`)}
        ${row('日期', esc(dateRangeText(ev)))}
        ${row('時段', esc(periodText(ev)))}
        ${row('地點 / 對象', esc(ev.location))}
        ${row('事由 / 備註', esc(ev.reason).replace(/\n/g, '<br>'))}
        ${row('聯絡方式', phone)}
        ${row('代理人', ev.deputyUid ? esc(userName(ev.deputyUid)) : '')}
        ${row('預計回辦公室', ev.returnAt ? esc(ev.returnAt.replace('T', ' ')) : '')}
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

  const body = `
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
      <div class="row2 custom-times" ${v.period === 'custom' ? '' : 'hidden'}>
        <label class="field"><span data-st>開始時間</span><input type="time" name="startTime" value="${esc(v.startTime || '08:30')}"></label>
        <label class="field"><span data-et>結束時間</span><input type="time" name="endTime" value="${esc(v.endTime || '09:30')}"></label>
      </div>
    </div>
    <label class="field"><span>地點 / 拜訪對象</span><input name="location" maxlength="100" placeholder="例：台中・XX 公司" value="${esc(v.location)}"></label>
    <label class="field"><span>事由 / 備註</span><textarea name="reason" rows="2" maxlength="500">${esc(v.reason)}</textarea></label>
    <div class="row2 align-end">
      <label class="field"><span>聯絡手機</span><input name="phone" type="tel" maxlength="30" placeholder="09xx-xxx-xxx" value="${esc(v.phone)}"></label>
      <label class="field check"><input type="checkbox" name="canAnswer" ${v.canAnswer !== false ? 'checked' : ''}> 可接電話</label>
    </div>
    <label class="field"><span>代理人（不在時找誰）</span>
      <select name="deputyUid"><option value="">（無）</option>${users.map(u => `<option value="${esc(u.uid)}" ${u.uid === v.deputyUid ? 'selected' : ''}>${esc(u.displayName)}</option>`).join('')}</select>
    </label>
    <div class="field"><span>同行組員 <small class="hint">（行程會同時出現在同行者的行事曆）</small></span>
      <div class="chip-select">${users.map(u => `
        <label class="chip-opt" data-uid="${esc(u.uid)}"><input type="checkbox" name="companionUids" value="${esc(u.uid)}" ${v.companionUids?.includes(u.uid) ? 'checked' : ''}><span>${esc(u.displayName)}</span></label>`).join('')}
      </div>
    </div>
    <label class="field"><span>預計回辦公室時間</span><input type="datetime-local" name="returnAt" value="${esc(v.returnAt)}"></label>
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

  // 互動：時段切換、日期連動、排除登記人自己
  const syncPeriod = () => {
    const isCustom = form.period.value === 'custom';
    $('.custom-times', form).hidden = !isCustom;
    const multi = form.startDate.value !== form.endDate.value;
    $('[data-st]', form).textContent = multi ? '首日開始時間' : '開始時間';
    $('[data-et]', form).textContent = multi ? '末日結束時間' : '結束時間';
  };
  const syncOwner = () => {
    const o = form.ownerUid.value;
    $$('.chip-opt', form).forEach(el => {
      const self = el.dataset.uid === o;
      el.hidden = self;
      if (self) el.querySelector('input').checked = false;
    });
    [...form.deputyUid.options].forEach(op => { op.disabled = op.value === o && o !== ''; });
    if (form.deputyUid.value === o) form.deputyUid.value = '';
  };
  form.addEventListener('change', e => {
    if (e.target.name === 'period') syncPeriod();
    if (e.target.name === 'ownerUid') syncOwner();
    if (e.target.name === 'startDate' && form.endDate.value < form.startDate.value) form.endDate.value = form.startDate.value;
    if (e.target.name === 'startDate' || e.target.name === 'endDate') syncPeriod();
  });
  syncPeriod();
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
      if (data.phone && data.ownerUid === myUid()) localStorage.setItem(PHONE_KEY, data.phone);
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
  const period = fd.get('period');
  return {
    ownerUid: fd.get('ownerUid'),
    typeId: fd.get('typeId') || '',
    startDate: fd.get('startDate') || '',
    endDate: fd.get('endDate') || '',
    period,
    startTime: period === 'custom' ? fd.get('startTime') || '' : '',
    endTime: period === 'custom' ? fd.get('endTime') || '' : '',
    location: (fd.get('location') || '').trim(),
    reason: (fd.get('reason') || '').trim(),
    phone: (fd.get('phone') || '').trim(),
    canAnswer: fd.get('canAnswer') === 'on',
    deputyUid: fd.get('deputyUid') || '',
    companionUids: fd.getAll('companionUids').filter(u => u !== fd.get('ownerUid')),
    returnAt: fd.get('returnAt') || '',
  };
}

function validate(d) {
  if (!d.ownerUid) return '請選擇組員';
  if (!d.typeId) return '請選擇類型';
  if (!d.startDate || !d.endDate) return '請填寫開始與結束日期';
  if (d.endDate < d.startDate) return '結束日期不可早於開始日期';
  if (d.period === 'custom') {
    if (!d.startTime || !d.endTime) return '請填寫自訂時段的開始與結束時間';
    if (d.startDate === d.endDate && d.endTime <= d.startTime) return '結束時間必須晚於開始時間';
  }
  if (d.deputyUid && d.deputyUid === d.ownerUid) return '代理人不能是自己';
  return '';
}
