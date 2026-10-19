// 資料層：登入、使用者建檔、即時同步、行程 CRUD、通知
import { APP, DEFAULT_TYPES } from './config.js';
import { auth, db, provider } from './firebase.js';
import { signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where, orderBy, limit,
  onSnapshot, writeBatch, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import { dateRangeText, periodShort } from './schedule.js';
import { ymd } from './utils.js';
import { DEMO, createDemoBackend } from './demo.js';

export { DEMO };

const G = APP.groupId;
const groupCol = (...segs) => collection(db, 'groups', G, ...segs);
const groupDoc = (...segs) => doc(db, 'groups', G, ...segs);

// ---------------- 狀態 ----------------
export const state = {
  authUser: null,
  me: null,
  users: new Map(),      // uid -> user
  types: [],             // [{id,name,color,order,active}]
  events: new Map(),     // id -> event
  meetings: new Map(),   // id -> meeting
  simulationDuties: new Map(), // month -> duty plan
  meetingSettings: null, // { defaultMeetUrl, defaultLocation, defaultStartTime, defaultEndTime, rotationOrder: [uid...], lastRecorderUid }
  modulePermissions: {}, // uid -> { simulation: bool, bulletin: bool }
  activities: [],
  notifications: [],
  eventsFrom: null,
  dailyInspections: new Map(),
  dailyReports: new Map(), // date (YYYY-MM-DD) -> { id, isTyphoonDay, typhoonNote, reports: { [uid]: {...} } }
  loaded: { users: false, types: false, events: false, meetings: false, simulationDuties: false, dailyInspections: false, dailyReports: false, permissions: false },
};

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
let queued = false;
function emit() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  });
}

// 示範模式（localhost?demo）：所有資料操作改由記憶體中的假資料處理
const demo = DEMO ? createDemoBackend(state, emit, describeEvent) : null;

// ---------------- 查詢輔助 ----------------
export const isAdmin = () =>
  state.me?.active === true && (state.me?.role === 'admin' || isSystemDesigner(state.me));
export const myUid = () => state.authUser?.uid;
export const userOf = uid => state.users.get(uid);
export const userName = uid => state.users.get(uid)?.displayName || '（已離職組員）';
export const typeOf = id => state.types.find(t => t.id === id) || { id, name: '（已刪除類型）', color: '#94a3b8' };
export const activeTypes = () => state.types.filter(t => t.active !== false);
export const eventList = () => [...state.events.values()];
export const meetingList = () => [...state.meetings.values()].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
export const meetingOn = day => [...state.meetings.values()].find(m => m.date === day);

/** 啟用中的組員，自己排第一，其餘依自訂順序（或姓名）排序 */
export function activeUsers() {
  const me = myUid();
  const customOrder = state.meetingSettings?.userOrder || [];
  const orderMap = new Map(customOrder.map((uid, idx) => [uid, idx]));
  return [...state.users.values()]
    .filter(u => u.active)
    .sort((a, b) => {
      if (a.uid === me) return -1;
      if (b.uid === me) return 1;
      const idxA = orderMap.has(a.uid) ? orderMap.get(a.uid) : 999;
      const idxB = orderMap.has(b.uid) ? orderMap.get(b.uid) : 999;
      if (idxA !== idxB) return idxA - idxB;
      return (a.displayName || '').localeCompare(b.displayName || '', 'zh-Hant');
    });
}

/** 判斷組員是否為常態外勤性質（嚴格限定：孔令淳、葉爵豪、陸逸群 三位） */
export function isFieldStaff(u) {
  if (!u) return false;
  const name = u.displayName || '';
  return ['孔令淳', '葉爵豪', '陸逸群'].some(n => name.includes(n));
}
export const isFieldUser = isFieldStaff;

/** 判斷組員是否為代理副理/主管（徐嘉鴻） */
export function isSupervisor(u) {
  if (!u) return false;
  const name = u.displayName || '';
  return name.includes('徐嘉鴻') || (u.title || '').includes('副理');
}

/** 判斷組員是否為系統最高管理員（孔令淳 Leo / Admin）— 預設具備全系統最高管理與讀寫權限 */
export function isSystemDesigner(u) {
  if (!u) return false;
  const name = u.displayName || '';
  const email = (u.email || '').toLowerCase();
  return (
    name.includes('孔令淳') ||
    email.startsWith('leokung@') ||
    email.startsWith('gb4398@') ||
    u.role === 'admin'
  );
}

/** 判斷組員是否為需每日下班回報之內勤組員（排除 3 位外勤品管與代理副理） */
export function isOfficeReporter(u) {
  if (!u || !u.active) return false;
  if (isFieldStaff(u) || isSupervisor(u)) return false;
  return true;
}

/** 判斷組員是否為需每日下班回報之同仁（6 位內勤 ＋ 3 位外勤品管，僅排除代理副理 徐嘉鴻） */
export function isDailyReporter(u) {
  if (!u || !u.active) return false;
  return !isSupervisor(u);
}

/** 判斷組員是否免輪值會議紀錄人（主管：徐嘉鴻；外勤：孔令淳、葉爵豪、陸逸群） */
export function isExcludedFromRecorder(u) {
  if (!u) return false;
  return isSupervisor(u) || isFieldStaff(u);
}

export const canEdit = ev => !!ev && (ev.ownerUid === myUid() || isAdmin());

export function isAllowedEmail(email) {
  const e = String(email || '').toLowerCase().trim();
  if (!APP.allowedDomains.some(d => e.endsWith('@' + d))) return false;
  if (APP.whitelistEmails && APP.whitelistEmails.length > 0) {
    return APP.whitelistEmails.includes(e);
  }
  return true;
}

// ---------------- 登入 ----------------
export const watchAuth = cb => (demo ? demo.watchAuth(cb) : onAuthStateChanged(auth, cb));
export const login = () => (demo ? demo.login() : signInWithPopup(auth, provider));
export async function logout() {
  if (demo) return demo.logout();
  stopSync();
  await signOut(auth);
}

/** 取得（或建立）自己的使用者資料；第一位登入者自動成為管理員 */
export async function ensureProfile(u) {
  if (!isAllowedEmail(u.email)) {
    throw new Error('not-in-whitelist');
  }
  if (demo) return demo.ensureProfile(u);
  const ref = doc(db, 'users', u.uid);
  const profile = { displayName: u.displayName || u.email.split('@')[0], photoURL: u.photoURL || '' };
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data();
    if (d.active && (d.displayName !== profile.displayName || d.photoURL !== profile.photoURL)) {
      await updateDoc(ref, profile).catch(e => console.warn('profile sync', e));
      Object.assign(d, profile);
    }
    return d;
  }

  // 檢查是否有預建的同名/同 Email 資料（例如先前系統預先建檔的職位）
  let preTitle = '';
  let preseededDocId = null;
  try {
    const preDocRef = doc(db, 'users', 'user_' + u.email.split('@')[0]);
    const preSnap = await getDoc(preDocRef);
    if (preSnap.exists() && preSnap.data().isPreseeded) {
      preTitle = preSnap.data().title || '';
      preseededDocId = preDocRef;
    }
  } catch (err) {
    console.warn('check preseeded user error:', err);
  }

  const base = {
    uid: u.uid, email: u.email, ...profile,
    title: preTitle,
    groupId: G, role: 'member', active: true,
    createdAt: serverTimestamp(), lastSeenActivityAt: serverTimestamp(),
  };
  const cfg = await getDoc(doc(db, 'config', 'app'));
  if (!cfg.exists()) {
    try {
      const b = writeBatch(db);
      b.set(ref, { ...base, role: 'admin' });
      b.set(doc(db, 'config', 'app'), { bootstrappedBy: u.uid, createdAt: serverTimestamp() });
      b.set(groupDoc(), { name: APP.groupName, createdAt: serverTimestamp() });
      DEFAULT_TYPES.forEach((t, i) => b.set(groupDoc('eventTypes', t.id), { name: t.name, color: t.color, order: i, active: true }));
      if (preseededDocId) b.delete(preseededDocId);
      await b.commit();
      return { ...base, role: 'admin' };
    } catch (e) {
      console.warn('初始化管理員失敗，改以一般組員加入', e);
    }
  }
  
  if (preseededDocId) {
    const b = writeBatch(db);
    b.set(ref, base);
    b.delete(preseededDocId);
    await b.commit();
  } else {
    await setDoc(ref, base);
  }
  return base;
}

// ---------------- 即時同步 ----------------
const unsubs = [];
let eventsUnsub = null;
let onFatal = () => {};

function fail(where) {
  return err => {
    console.error(`[sync:${where}]`, err);
    onFatal(err);
  };
}

export function startSync(fatalHandler) {
  if (demo) return demo.startSync();
  onFatal = fatalHandler || onFatal;
  const uid = myUid();

  unsubs.push(onSnapshot(doc(db, 'users', uid), s => {
    const d = s.data();
    if (!d) return;
    const prev = state.me;
    state.me = d;
    if (prev && (prev.active !== d.active || prev.role !== d.role)) location.reload();
    emit();
  }, fail('me')));

  unsubs.push(onSnapshot(query(collection(db, 'users'), where('groupId', '==', G)), s => {
    state.users = new Map(s.docs.map(d => [d.id, { uid: d.id, ...d.data() }]));
    state.loaded.users = true;
    emit();
  }, fail('users')));

  unsubs.push(onSnapshot(query(groupCol('eventTypes'), orderBy('order')), s => {
    state.types = s.docs.map(d => ({ id: d.id, ...d.data() }));
    state.loaded.types = true;
    emit();
  }, fail('types')));

  unsubs.push(onSnapshot(query(groupCol('activities'), orderBy('createdAt', 'desc'), limit(50)), s => {
    state.activities = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
    emit();
  }, fail('activities')));

  unsubs.push(onSnapshot(query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50)), s => {
    state.notifications = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
    emit();
  }, fail('notifications')));

  unsubs.push(onSnapshot(groupDoc('settings', 'meeting'), s => {
    state.meetingSettings = s.exists() ? s.data() : null;
    emit();
  }, fail('meetingSettings')));

  unsubs.push(onSnapshot(groupCol('meetings'), s => {
    state.meetings = new Map(s.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
    state.loaded.meetings = true;
    emit();
  }, fail('meetings')));

  unsubs.push(onSnapshot(groupCol('simulationDuties'), s => {
    state.simulationDuties = new Map(s.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
    state.loaded.simulationDuties = true;
    emit();
  }, fail('simulationDuties')));

  unsubs.push(onSnapshot(groupDoc('settings', 'permissions'), s => {
    state.modulePermissions = s.exists() ? s.data() : {};
    state.loaded.permissions = true;
    emit();
  }, fail('permissions')));

  unsubs.push(onSnapshot(groupCol('dailyInspections'), s => {
    state.dailyInspections = new Map(s.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
    state.loaded.dailyInspections = true;
    emit();
  }, fail('dailyInspections')));

  unsubs.push(onSnapshot(groupCol('dailyReports'), s => {
    state.dailyReports = new Map(s.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
    state.loaded.dailyReports = true;
    emit();
  }, fail('dailyReports')));
}

/** 確保已同步「結束日 >= from」的所有行程（往前翻月份時會擴大範圍） */
export function ensureEventsFrom(from) {
  if (demo) return demo.ensureEventsFrom(from);
  if (!myUid()) return;
  if (state.eventsFrom && state.eventsFrom <= from) return;
  state.eventsFrom = from;
  eventsUnsub?.();
  eventsUnsub = onSnapshot(query(groupCol('events'), where('endDate', '>=', from)), s => {
    state.events = new Map(s.docs.map(d => [d.id, { id: d.id, ...d.data() }]));
    state.loaded.events = true;
    emit();
  }, fail('events'));
}

export function stopSync() {
  if (demo) return demo.stopSync();
  unsubs.splice(0).forEach(u => u());
  eventsUnsub?.();
  eventsUnsub = null;
  state.eventsFrom = null;
}

export async function fetchEvent(id) {
  const cached = state.events.get(id);
  if (cached) return cached;
  if (demo) return demo.fetchEvent(id);
  const s = await getDoc(groupDoc('events', id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

export async function fetchEventsInRange(from, to) {
  if (demo) return demo.fetchEventsInRange(from, to);
  const s = await getDocs(query(groupCol('events'), where('endDate', '>=', from)));
  return s.docs.map(d => ({ id: d.id, ...d.data() })).filter(ev => ev.startDate <= to);
}

// ---------------- 行程 CRUD ----------------
export function describeEvent(ev) {
  const t = typeOf(ev.typeId).name;
  return `${t}｜${dateRangeText(ev)} ${periodShort(ev)}${ev.location ? '｜' + ev.location : ''}`;
}

/**
 * 新增 / 更新行程，同時寫入全組動態與個人通知（同一批次，確保一致）
 * @param data 表單資料（不含系統欄位）
 * @param prev 既有行程（更新時）
 */
export async function saveEvent(data, prev = null) {
  if (demo) return demo.saveEvent(data, prev);
  const me = myUid();
  const b = writeBatch(db);
  const ref = prev ? groupDoc('events', prev.id) : doc(groupCol('events'));
  const companionUids = [...new Set(data.companionUids)].filter(u => u !== data.ownerUid);
  const payload = {
    ...data,
    companionUids,
    participantUids: [data.ownerUid, ...companionUids],
    groupId: G,
    createdBy: prev ? prev.createdBy : me,
    createdAt: prev?.createdAt || serverTimestamp(),
    updatedBy: me,
    updatedAt: serverTimestamp(),
  };
  b.set(ref, payload);

  const summary = describeEvent(payload);
  b.set(doc(groupCol('activities')), {
    actorUid: me, action: prev ? 'update' : 'create', eventId: ref.id,
    ownerUid: data.ownerUid, summary, createdAt: serverTimestamp(),
  });

  // 個人通知：新被設為代理人 / 同行者 / 被管理員代為登記
  const targets = new Map();
  if (data.deputyUid && data.deputyUid !== (prev?.deputyUid || '')) targets.set(data.deputyUid, 'deputy');
  const prevComp = new Set(prev?.companionUids || []);
  companionUids.forEach(u => { if (!prevComp.has(u)) targets.set(u, 'companion'); });
  if (data.ownerUid !== me && (!prev || prev.ownerUid !== data.ownerUid)) targets.set(data.ownerUid, 'onbehalf');
  for (const [to, kind] of targets) {
    if (to === me) continue;
    b.set(doc(collection(db, 'users', to, 'notifications')), {
      kind, eventId: ref.id, actorUid: me, ownerUid: data.ownerUid, summary, read: false, createdAt: serverTimestamp(),
    });
  }
  await b.commit();
  return ref.id;
}

export async function deleteEvent(ev) {
  if (demo) return demo.deleteEvent(ev);
  const b = writeBatch(db);
  b.delete(groupDoc('events', ev.id));
  b.set(doc(groupCol('activities')), {
    actorUid: myUid(), action: 'delete', eventId: ev.id, ownerUid: ev.ownerUid,
    summary: describeEvent(ev), createdAt: serverTimestamp(),
  });
  await b.commit();
}

// ---------------- 通知 ----------------
export function unreadActivities() {
  const seen = state.me?.lastSeenActivityAt?.toMillis?.() ?? 0;
  return state.activities.filter(a => a.actorUid !== myUid() && (a.createdAt?.toMillis?.() ?? 0) > seen);
}
export const unreadNotifications = () => state.notifications.filter(n => !n.read);

export function markActivitiesSeen() {
  if (!unreadActivities().length) return;
  if (demo) return demo.markActivitiesSeen();
  return updateDoc(doc(db, 'users', myUid()), { lastSeenActivityAt: serverTimestamp() });
}
export async function markNotificationsRead(ids) {
  if (!ids.length) return;
  if (demo) return demo.markNotificationsRead(ids);
  const b = writeBatch(db);
  ids.forEach(id => b.update(doc(db, 'users', myUid(), 'notifications', id), { read: true }));
  await b.commit();
}

// ---------------- 管理 ----------------
export function updateUserAdmin(uid, patch) {
  if (demo) return demo.updateUserAdmin(uid, patch);
  // 停用時記錄停用時間（伺服器時間），重新啟用時清除
  if ('active' in patch) patch = { ...patch, deactivatedAt: patch.active ? null : serverTimestamp() };
  return updateDoc(doc(db, 'users', uid), patch);
}

/** 停用滿 purgeAfterDays 天的組員資料到期日（毫秒），未停用則回傳 null */
export function purgeDueAt(u) {
  const t = u?.deactivatedAt?.toMillis?.();
  return !u?.active && t ? t + APP.purgeAfterDays * 86400000 : null;
}

/**
 * 由管理員登入時執行：刪除停用已滿 purgeAfterDays 天的組員（含其個人通知）。
 * 伺服器端規則同樣檢查 90 天，未到期的刪除請求一律被拒絕。
 * @returns {Promise<string[]>} 被刪除的組員姓名
 */
export async function purgeExpiredUsers() {
  if (!isAdmin()) return [];
  if (demo) return demo.purgeExpiredUsers();
  const me = myUid();
  const removed = [];
  for (const u of state.users.values()) {
    if (u.uid === me || u.active) continue;
    // 舊資料沒有停用時間：補上（從現在起算 90 天）
    if (!u.deactivatedAt) {
      await updateDoc(doc(db, 'users', u.uid), { deactivatedAt: serverTimestamp() }).catch(e => console.warn('backfill', e));
      continue;
    }
    // 保留 1 小時緩衝，避免本機時鐘比伺服器快而被規則拒絕
    if (purgeDueAt(u) > Date.now() - 3600000) continue;
    try {
      const notes = await getDocs(collection(db, 'users', u.uid, 'notifications'));
      const refs = [...notes.docs.map(d => d.ref), doc(db, 'users', u.uid)];
      for (let i = 0; i < refs.length; i += 400) {
        const b = writeBatch(db);
        refs.slice(i, i + 400).forEach(r => b.delete(r));
        await b.commit();
      }
      removed.push(u.displayName);
    } catch (e) {
      console.warn('purge failed', u.uid, e);
    }
  }
  return removed;
}

export async function saveType(t) {
  if (demo) return demo.saveType(t);
  const ref = t.id ? groupDoc('eventTypes', t.id) : doc(groupCol('eventTypes'));
  await setDoc(ref, { name: t.name, color: t.color, order: Number(t.order) || 0, active: t.active !== false }, { merge: true });
}

// ---------------- 業務模組權限矩陣 ----------------
/** 檢查特定組員對業務模組的存取權限 */
export function hasModulePermission(user, moduleKey) {
  if (!user) return false;
  // 管理員與系統最高權限者擁有全域通行權限
  if (user.role === 'admin' || isSystemDesigner(user) || (user.uid === myUid() && isAdmin())) return true;
  // 核心協同模組全員預設通行
  if (['today', 'schedule', 'meeting'].includes(moduleKey)) return true;

  const perms = state.modulePermissions?.[user.uid];
  if (perms && typeof perms[moduleKey] === 'boolean') {
    return perms[moduleKey];
  }
  // 預設規則（未在矩陣設定前）：
  // simulation (模擬體驗)：預設 true
  // bulletin (採購佈告欄)：預設 false（僅勾選之採購相關同仁可進）
  if (moduleKey === 'simulation') return true;
  if (moduleKey === 'bulletin') return false;
  return true;
}

/** 供管理員儲存單一組員的業務模組權限 */
export async function saveUserModulePermission(uid, moduleKey, allowed) {
  if (demo) return demo.saveUserModulePermission(uid, moduleKey, allowed);
  const current = state.modulePermissions || {};
  const userPerms = { ...(current[uid] || {}) };
  userPerms[moduleKey] = allowed;
  const updated = { ...current, [uid]: userPerms };
  await setDoc(groupDoc('settings', 'permissions'), updated, { merge: true });
}

/** 供管理員批次更新模組權限（例如為全員開啟模擬體驗） */
export async function batchUpdateModulePermission(moduleKey, allowed) {
  if (demo) return demo.batchUpdateModulePermission(moduleKey, allowed);
  const current = state.modulePermissions || {};
  const updated = { ...current };
  for (const u of state.users.values()) {
    if (!u.active) continue;
    updated[u.uid] = { ...(updated[u.uid] || {}), [moduleKey]: allowed };
  }
  await setDoc(groupDoc('settings', 'permissions'), updated, { merge: true });
}

// ---------------- 月會模組 (Phase 1) ----------------
export async function saveMeetingSettings(patch) {
  if (demo) return demo.saveMeetingSettings(patch);
  await setDoc(groupDoc('settings', 'meeting'), patch, { merge: true });
}

/** 取得當前有效的「上次紀錄人」Uid：
 * 1. 優先取歷史已結束會議（日期 <= targetDate 或今天）之最近一場紀錄人
 * 2. 次之若無歷史會議，取管理員在 settings 中手動設定的 lastRecorderUid
 */
export function getEffectiveLastRecorderUid(targetDate = null) {
  const cutoff = targetDate || ymd();
  const pastMeetings = [...state.meetings.values()]
    .filter(m => m.date && m.date <= cutoff && m.recorderUid)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (pastMeetings.length > 0) {
    return pastMeetings[0].recorderUid;
  }
  return state.meetingSettings?.lastRecorderUid || '';
}

/** 依輪值順序推算建議的下一位紀錄人（自動跳過停用者、主管與常態外勤者、以及當天公休/出差者） */
export function suggestNextRecorder(targetDate, busyUids = new Set()) {
  // 紀錄人輪值排除已停用組員、主管（徐嘉鴻）與常態外勤組員（孔令淳、葉爵豪、陸逸群）
  const users = activeUsers().filter(u => !isExcludedFromRecorder(u));
  if (!users.length) return '';
  const settings = state.meetingSettings || {};
  let order = Array.isArray(settings.rotationOrder) ? [...settings.rotationOrder] : [];
  // 補齊不在順序中的輪值組員
  const existingSet = new Set(order);
  users.forEach(u => { if (!existingSet.has(u.uid)) order.push(u.uid); });
  // 過濾掉已停用組員、主管與常態外勤組員
  order = order.filter(uid => {
    const u = state.users.get(uid);
    return u?.active && !isExcludedFromRecorder(u);
  });

  if (!order.length) return users[0].uid;

  // 取得基準紀錄人：優先從目標日期之前的最近一場會議推算，若無則依手動/預設設定
  const baseUid = getEffectiveLastRecorderUid(targetDate);
  const lastIndex = order.indexOf(baseUid);

  // 依序尋找下一個沒被 busy 擋住的人
  for (let step = 1; step <= order.length; step++) {
    const idx = (lastIndex + step) % order.length;
    const uid = order[idx];
    if (!busyUids.has(uid)) return uid;
  }
  return order[(lastIndex + 1) % order.length] || users[0].uid;
}

export async function saveMeeting(meetingData, prev = null) {
  if (demo) return demo.saveMeeting(meetingData, prev);
  const me = myUid();
  const b = writeBatch(db);
  const ref = prev ? groupDoc('meetings', prev.id) : doc(groupCol('meetings'));
  const payload = {
    ...meetingData,
    groupId: G,
    updatedBy: me,
    updatedAt: serverTimestamp(),
  };
  if (!prev) {
    payload.createdBy = me;
    payload.createdAt = serverTimestamp();
    payload.status = payload.status || 'scheduled';
    payload.agenda = meetingData.agenda || [];
    payload.reads = payload.reads || [];
  } else if (meetingData.agenda !== undefined) {
    payload.agenda = meetingData.agenda;
  }
  b.set(ref, payload, { merge: true });

  // 若該場會議日期在今天或過去，更新 settings 的 lastRecorderUid 作為手動基準
  const today = ymd();
  if (payload.recorderUid && payload.date && payload.date <= today) {
    b.set(groupDoc('settings', 'meeting'), { lastRecorderUid: payload.recorderUid }, { merge: true });
  }

  // 通知紀錄人：被指定為紀錄人
  if (payload.recorderUid && payload.recorderUid !== me && (!prev || prev.recorderUid !== payload.recorderUid)) {
    b.set(doc(collection(db, 'users', payload.recorderUid, 'notifications')), {
      kind: 'recorder',
      meetingId: ref.id,
      actorUid: me,
      summary: `月會 ${payload.date}：你被指派為會議紀錄人`,
      read: false,
      createdAt: serverTimestamp(),
    });
  }

  // 全組動態
  const summary = `月會｜${payload.date} ${payload.startTime || ''}–${payload.endTime || ''}｜紀錄人：${userName(payload.recorderUid)}`;
  b.set(doc(groupCol('activities')), {
    actorUid: me,
    action: prev ? 'update' : 'create',
    meetingId: ref.id,
    summary,
    createdAt: serverTimestamp(),
  });

  await b.commit();
  return ref.id;
}

export async function deleteMeeting(mid) {
  if (demo) return demo.deleteMeeting(mid);
  const m = state.meetings.get(mid);
  const b = writeBatch(db);
  b.delete(groupDoc('meetings', mid));
  b.set(doc(groupCol('activities')), {
    actorUid: myUid(),
    action: 'delete',
    meetingId: mid,
    summary: `月會｜${m?.date || ''} 已取消`,
    createdAt: serverTimestamp(),
  });
  await b.commit();
}

/** 供報告人/紀錄人/管理員更新單一議題資料（例如報告連結、修改議題標題） */
export async function updateMeetingAgendaItem(meetingId, agendaIndex, patch, fallbackAgenda = null) {
  if (demo) return demo.updateMeetingAgendaItem(meetingId, agendaIndex, patch, fallbackAgenda);
  const m = state.meetings.get(meetingId);
  if (!m) return;
  const baseAgenda = (Array.isArray(m.agenda) && m.agenda.length)
    ? [...m.agenda]
    : (Array.isArray(fallbackAgenda) ? [...fallbackAgenda] : []);
  if (!baseAgenda[agendaIndex]) return;
  const newAgenda = [...baseAgenda];
  newAgenda[agendaIndex] = { ...newAgenda[agendaIndex], ...patch };
  await updateDoc(groupDoc('meetings', meetingId), {
    agenda: newAgenda,
    updatedBy: myUid(),
    updatedAt: serverTimestamp(),
  });
}

/** 供紀錄人/管理員儲存或發布會議紀錄 */
export async function saveMeetingMinutes(meetingId, minutesData, isPublish = false) {
  if (demo) return demo.saveMeetingMinutes(meetingId, minutesData, isPublish);
  const me = myUid();
  const b = writeBatch(db);
  const mRef = groupDoc('meetings', meetingId);
  const m = state.meetings.get(meetingId);

  const payload = {
    minutes: {
      ...minutesData,
      updatedBy: me,
      updatedAt: serverTimestamp(),
      ...(isPublish ? { publishedAt: serverTimestamp(), publishedBy: me } : {}),
    },
    status: isPublish ? 'published' : 'draft',
    updatedBy: me,
    updatedAt: serverTimestamp(),
  };

  b.set(mRef, payload, { merge: true });

  // 若發布紀錄，產生全組動態與通知
  if (isPublish) {
    b.set(doc(groupCol('activities')), {
      actorUid: me,
      action: 'publish_minutes',
      meetingId,
      summary: `會議紀錄發布｜${m?.date || ''} 經營組月會會議紀錄已發布`,
      createdAt: serverTimestamp(),
    });
  }

  await b.commit();
}

/** 取得特定月份的模擬體驗排班規劃 */
export function simulationDutyOf(month) {
  return state.simulationDuties.get(month);
}

/** 儲存特定月份的模擬體驗排班規劃（全組皆可協作或由管理員/主責人存檔） */
export async function saveSimulationDutyPlan(month, planData) {
  if (demo) {
    state.simulationDuties.set(month, { id: month, ...planData });
    emit();
    return;
  }
  const me = myUid();
  const ref = groupDoc('simulationDuties', month);
  await setDoc(ref, {
    ...planData,
    id: month,
    updatedBy: me,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/** 取得北區或南區特定區域/月份的每日品管巡檢安排 */
export function dailyInspectionOf(zone) {
  return state.dailyInspections.get(zone);
}

/** 儲存每日品管巡檢安排（zone: 'north' | 'south'） */
export async function saveDailyInspectionPlan(zone, planData) {
  if (demo) {
    state.dailyInspections.set(zone, { id: zone, ...planData });
    emit();
    return;
  }
  const me = myUid();
  const ref = groupDoc('dailyInspections', zone);
  await setDoc(ref, {
    ...planData,
    id: zone,
    updatedBy: me,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ---------------- 每日工作進度回報模組 ----------------
/** 取得特定日期的每日回報紀錄文件（YYYY-MM-DD） */
export function dailyReportDocOf(dateStr) {
  return state.dailyReports.get(dateStr) || { id: dateStr, isTyphoonDay: false, typhoonNote: '', reports: {} };
}

/** 儲存單一組員在特定日期的每日工作進度回報（一般組員嚴格限定僅能儲存本人回報，防止他人代填） */
export async function saveUserDailyReport(dateStr, targetUid, reportPayload) {
  const me = myUid();
  if (!me || (targetUid !== me && !isAdmin())) {
    throw new Error('每日工作回報僅限本人親自填寫，無法代他人填寫');
  }
  const existingDoc = dailyReportDocOf(dateStr);
  const prevReport = existingDoc.reports?.[targetUid] || {};
  const nextReport = {
    ...prevReport,
    ...reportPayload,
    uid: targetUid,
    updatedBy: me,
    updatedAt: new Date().toISOString(),
  };

  if (demo) {
    const updatedDoc = {
      ...existingDoc,
      id: dateStr,
      reports: {
        ...(existingDoc.reports || {}),
        [targetUid]: nextReport,
      },
    };
    state.dailyReports = new Map(state.dailyReports).set(dateStr, updatedDoc);
    emit();
    return nextReport;
  }

  const ref = groupDoc('dailyReports', dateStr);
  await setDoc(ref, {
    id: dateStr,
    reports: {
      [targetUid]: nextReport,
    },
    updatedBy: me,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return nextReport;
}

/** 切換特定日期是否為「🌀 颱風天停班停課（全員免回報）」 */
export async function toggleTyphoonDay(dateStr, isTyphoonDay, typhoonNote = '🌀 颱風停班停課（全員免回報）') {
  const me = myUid();
  const existingDoc = dailyReportDocOf(dateStr);

  if (demo) {
    const updatedDoc = {
      ...existingDoc,
      id: dateStr,
      isTyphoonDay: !!isTyphoonDay,
      typhoonNote: isTyphoonDay ? typhoonNote : '',
    };
    state.dailyReports = new Map(state.dailyReports).set(dateStr, updatedDoc);
    emit();
    return;
  }

  const ref = groupDoc('dailyReports', dateStr);
  await setDoc(ref, {
    id: dateStr,
    isTyphoonDay: !!isTyphoonDay,
    typhoonNote: isTyphoonDay ? typhoonNote : '',
    updatedBy: me,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/** 主管（代理副理 徐嘉鴻 或 管理員）對組員當日回報點選「👍 已閱」或留下主管回饋 */
export async function acknowledgeDailyReport(dateStr, targetUid, { ack = true, managerReply = undefined } = {}) {
  const me = myUid();
  const meName = state.me?.displayName || '主管';
  const existingDoc = dailyReportDocOf(dateStr);
  const prevReport = existingDoc.reports?.[targetUid] || { uid: targetUid };
  const prevAck = prevReport.ackBy || {};
  const nextAck = { ...prevAck };
  if (ack) {
    nextAck[me] = { uid: me, name: meName, at: new Date().toISOString() };
  } else {
    delete nextAck[me];
  }

  const nextReport = {
    ...prevReport,
    ackBy: nextAck,
    ...(managerReply !== undefined ? { managerReply, managerReplyBy: meName, managerReplyAt: new Date().toISOString() } : {}),
  };

  if (demo) {
    const updatedDoc = {
      ...existingDoc,
      id: dateStr,
      reports: {
        ...(existingDoc.reports || {}),
        [targetUid]: nextReport,
      },
    };
    state.dailyReports = new Map(state.dailyReports).set(dateStr, updatedDoc);
    emit();
    return;
  }

  const ref = groupDoc('dailyReports', dateStr);
  await setDoc(ref, {
    id: dateStr,
    reports: {
      [targetUid]: nextReport,
    },
    updatedBy: me,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
