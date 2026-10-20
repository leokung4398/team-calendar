// 資料層：登入、使用者建檔、即時同步、行程 CRUD、通知
import { APP, DEFAULT_TYPES } from './config.js';
import { auth, db, provider } from './firebase.js';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, orderBy, limit,
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
  cases: new Map(),        // id -> case tracking item
  wishes: new Map(),       // id -> wish item
  vents: new Map(),        // id -> vent (anonymous/named complaint) item
  chatMessages: [],        // sorted array of chat messages
  vibeShared: new Map(),   // id -> shared bike news / jokes / votes
  toolsData: new Map(),    // id -> shared bookmarks / tool settings
  loaded: { users: false, types: false, events: false, meetings: false, simulationDuties: false, dailyInspections: false, dailyReports: false, permissions: false, cases: false, wishes: false, vents: false, chat: false },
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

/** 判斷組員是否為常態外勤性質（支援後台設定 staffType === 'field'，或預設孔令淳、葉爵豪、陸逸群三位） */
export function isFieldStaff(u) {
  if (!u) return false;
  if (u.staffType === 'field') return true;
  if (u.staffType === 'office') return false;
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

/** 判斷組員是否為外勤品管三人的代理人（包于巧） */
export function isFieldDeputy(u) {
  if (!u) return false;
  const name = u.displayName || '';
  const email = (u.email || '').toLowerCase();
  return name.includes('包于巧') || email.startsWith('ciaopao@');
}

/** 判斷組員是否為隱藏管理員（系統設計者 孔令淳 Leo）— 表面角色顯示為一般組員，底層預設具備全系統最高管理與讀寫權限 */
export function isHiddenAdmin(u) {
  if (!u) return false;
  const name = u.displayName || '';
  const email = (u.email || '').toLowerCase();
  return (
    name.includes('孔令淳') ||
    email.startsWith('leokung@') ||
    email.startsWith('gb4398@')
  );
}

/** 判斷組員是否為系統最高管理員（隱藏管理員 孔令淳 Leo / 顯性管理員 Admin）— 預設具備全系統最高管理與讀寫權限 */
export function isSystemDesigner(u) {
  if (!u) return false;
  return isHiddenAdmin(u) || u.role === 'admin';
}

/** 判斷組員是否為需每日下班回報之內勤組員（排除外勤品管與代理副理） */
export function isOfficeReporter(u) {
  if (!u || !u.active) return false;
  if (isFieldStaff(u) || isSupervisor(u)) return false;
  return true;
}

/** 判斷組員是否為需每日下班回報之同仁（內勤 ＋ 外勤品管，僅排除代理副理 徐嘉鴻） */
export function isDailyReporter(u) {
  if (!u || !u.active) return false;
  return !isSupervisor(u);
}

/** 判斷組員是否免輪值會議紀錄人（主管：徐嘉鴻；外勤品管同仁） */
export function isExcludedFromRecorder(u) {
  if (!u) return false;
  return isSupervisor(u) || isFieldStaff(u);
}

export const canEdit = ev => !!ev && (ev.ownerUid === myUid() || isAdmin());

/** 檢查是否屬於公司允許的網域（@youbike.com.tw） */
export function isCompanyDomainEmail(email) {
  const e = String(email || '').toLowerCase().trim();
  return APP.allowedDomains.some(d => e.endsWith('@' + d));
}

export function isAllowedEmail(email) {
  const e = String(email || '').toLowerCase().trim();
  if (!isCompanyDomainEmail(e)) return false;
  if (APP.whitelistEmails && APP.whitelistEmails.includes(e)) return true;
  // 若記憶體中已載入該 Email（例如後台動態新增的組員），亦視為授權通過
  for (const u of state.users.values()) {
    if (String(u.email || '').toLowerCase().trim() === e) return true;
  }
  return false;
}

// ---------------- 登入 ----------------
export const watchAuth = cb => {
  if (demo) return demo.watchAuth(cb);
  // 僅在同源 firebaseapp.com 網域下處理 Redirect 結果
  const host = typeof location !== 'undefined' ? location.hostname : '';
  if (host.endsWith('.firebaseapp.com')) {
    getRedirectResult(auth).catch(err => console.warn('getRedirectResult:', err));
  }
  return onAuthStateChanged(auth, cb);
};
export async function login(loginHintEmail = '') {
  if (demo) return demo.login();
  const params = {
    hd: APP.allowedDomains[0],
    prompt: 'select_account',
  };
  const cleanHint = String(loginHintEmail || '').trim().toLowerCase();
  if (cleanHint && cleanHint.endsWith('@' + APP.allowedDomains[0])) {
    params.login_hint = cleanHint;
    try { localStorage.setItem('yb_login_hint_email', cleanHint); } catch {}
  } else {
    try {
      const saved = localStorage.getItem('yb_login_hint_email');
      if (saved && saved.endsWith('@' + APP.allowedDomains[0])) params.login_hint = saved;
    } catch {}
  }
  provider.setCustomParameters(params);

  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    // 若在非 firebaseapp.com 網域遇到手機阻擋 Popup，導向與 authDomain 完全同源的 https://team-calendar-93cb2.firebaseapp.com/
    // 既符合 Google Cloud 預設 Authorized Redirect URI（不會出現 400 redirect_uri_mismatch），也同源避開 iOS Storage Partitioning！
    const host = typeof location !== 'undefined' ? location.hostname : '';
    const isAuthDomainOrigin = host === 'team-calendar-93cb2.firebaseapp.com';
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
      if (isAuthDomainOrigin) {
        return signInWithRedirect(auth, provider);
      }
      const target = new URL('https://team-calendar-93cb2.firebaseapp.com/');
      if (params.login_hint) target.searchParams.set('hint', params.login_hint);
      location.href = target.toString();
      return;
    }
    throw e;
  }
}
export async function logout() {
  if (demo) return demo.logout();
  stopSync();
  await signOut(auth);
}

/** 輔助：為 Promise 加上逾時保護，避免手機網路切換（Google 驗證切回瀏覽器）時 getDoc 無限卡住 */
function withTimeout(promise, ms, label = 'timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ]);
}

/** 取得（或建立）自己的使用者資料；支援後台預先建檔（user_<prefix>）於首次登入時自動無縫認領，並具備手機端網路逾時離線降級保護 */
export async function ensureProfile(u) {
  const cleanEmail = String(u.email || '').toLowerCase().trim();
  if (!isCompanyDomainEmail(cleanEmail)) {
    throw new Error('not-in-whitelist');
  }
  if (demo) return demo.ensureProfile(u);

  const profile = { displayName: u.displayName || cleanEmail.split('@')[0], photoURL: u.photoURL || '' };
  const fallbackProfile = {
    uid: u.uid,
    email: cleanEmail,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    title: '',
    staffType: ['孔令淳', '葉爵豪', '陸逸群'].some(n => profile.displayName.includes(n)) ? 'field' : 'office',
    groupId: G,
    role: isSupervisor({ email: cleanEmail, displayName: profile.displayName }) ? 'admin' : 'member',
    active: true,
  };

  try {
    return await withTimeout(_ensureProfileCore(u, cleanEmail, profile), 6500, 'firestore-profile-timeout');
  } catch (err) {
    if (err?.message === 'not-in-whitelist') throw err;
    console.warn('ensureProfile 逾時或暫時連線異常，啟用快速登入降級保護：', err);
    // 若已在預設白名單內，直接放行進入系統主畫面（背景 onSnapshot 會在連線恢復後自動補齊最新資料）
    if (isAllowedEmail(cleanEmail)) {
      return fallbackProfile;
    }
    throw err;
  }
}

async function _ensureProfileCore(u, cleanEmail, profile) {
  const ref = doc(db, 'users', u.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data();
    const patch = {};
    if (d.active && (d.displayName !== profile.displayName || d.photoURL !== profile.photoURL)) {
      patch.displayName = profile.displayName;
      patch.photoURL = profile.photoURL;
    }
    // 隱藏管理員（孔令淳）表面角色自動設為 'member'（組員），將顯性管理員交接予副理
    if (isHiddenAdmin({ ...d, ...profile, email: cleanEmail }) && d.role !== 'member') {
      patch.role = 'member';
    }
    // 代理副理（徐嘉鴻）自動確保具備顯性 'admin'（管理員）角色
    if (isSupervisor({ ...d, ...profile, email: cleanEmail }) && d.role !== 'admin') {
      patch.role = 'admin';
    }
    if (Object.keys(patch).length > 0) {
      updateDoc(ref, patch).catch(e => console.warn('profile sync', e));
      Object.assign(d, patch);
    }
    return d;
  }

  // 檢查是否有管理員於後台預建的同 Email 資料（user_<帳號前綴>）
  const prefix = cleanEmail.split('@')[0];
  const preseededId = 'user_' + prefix;
  let preData = null;
  let preseededDocRef = null;
  try {
    const preDocRef = doc(db, 'users', preseededId);
    const preSnap = await getDoc(preDocRef);
    if (preSnap.exists() && preSnap.data().isPreseeded) {
      preData = preSnap.data();
      preseededDocRef = preDocRef;
    }
  } catch (err) {
    console.warn('check preseeded user error:', err);
  }

  // 若既不在預設白名單內，且管理員也未在後台預先建檔，則拒絕登入
  if (!preData && !isAllowedEmail(cleanEmail)) {
    throw new Error('not-in-whitelist');
  }

  const base = {
    uid: u.uid,
    email: cleanEmail,
    // 優先保留管理員預先建檔時設定的中文姓名，但同步 Google 頭像
    displayName: (preData?.displayName && preData.displayName.trim()) ? preData.displayName.trim() : profile.displayName,
    photoURL: profile.photoURL || preData?.photoURL || '',
    title: preData?.title || '',
    staffType: preData?.staffType || (['孔令淳', '葉爵豪', '陸逸群'].some(n => (preData?.displayName || profile.displayName).includes(n)) ? 'field' : 'office'),
    groupId: G,
    role: preData?.role === 'admin' ? 'admin' : 'member',
    active: preData?.active !== false,
    createdAt: preData?.createdAt || serverTimestamp(),
    lastSeenActivityAt: serverTimestamp(),
  };

  const cfg = await getDoc(doc(db, 'config', 'app'));
  if (!cfg.exists()) {
    try {
      const b = writeBatch(db);
      b.set(ref, { ...base, role: 'admin' });
      b.set(doc(db, 'config', 'app'), { bootstrappedBy: u.uid, createdAt: serverTimestamp() });
      b.set(groupDoc(), { name: APP.groupName, createdAt: serverTimestamp() });
      DEFAULT_TYPES.forEach((t, i) => b.set(groupDoc('eventTypes', t.id), { name: t.name, color: t.color, order: i, active: true }));
      if (preseededDocRef) b.delete(preseededDocRef);
      await b.commit();
      return { ...base, role: 'admin' };
    } catch (e) {
      console.warn('初始化管理員失敗，改以一般組員加入', e);
    }
  }

  if (preseededDocRef) {
    const b = writeBatch(db);
    b.set(ref, base);
    b.delete(preseededDocRef);
    await b.commit();
    // 嘗試將預建 ID 的模組權限與自訂排序無縫轉移至正式 uid
    try {
      const permRef = groupDoc('settings', 'permissions');
      const permSnap = await getDoc(permRef);
      if (permSnap.exists() && permSnap.data()?.[preseededId]) {
        const permData = { ...permSnap.data() };
        permData[u.uid] = permData[preseededId];
        delete permData[preseededId];
        await setDoc(permRef, permData);
      }
      const meetRef = groupDoc('settings', 'meeting');
      const meetSnap = await getDoc(meetRef);
      if (meetSnap.exists()) {
        const mData = meetSnap.data();
        let changed = false;
        const patch = {};
        if (Array.isArray(mData.userOrder) && mData.userOrder.includes(preseededId)) {
          patch.userOrder = mData.userOrder.map(id => (id === preseededId ? u.uid : id));
          changed = true;
        }
        if (Array.isArray(mData.rotationOrder) && mData.rotationOrder.includes(preseededId)) {
          patch.rotationOrder = mData.rotationOrder.map(id => (id === preseededId ? u.uid : id));
          changed = true;
        }
        if (changed) await setDoc(meetRef, patch, { merge: true });
      }
    } catch (migErr) {
      console.warn('preseeded settings migration skipped:', migErr);
    }
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

  let roleSyncedOnce = false;
  unsubs.push(onSnapshot(doc(db, 'users', uid), s => {
    const d = s.data();
    if (!d) return;
    const prev = state.me;
    state.me = d;
    if (prev && (prev.active !== d.active || (prev.role !== d.role && !isHiddenAdmin(d)))) location.reload();
    emit();
  }, fail('me')));

  unsubs.push(onSnapshot(query(collection(db, 'users'), where('groupId', '==', G)), s => {
    state.users = new Map(s.docs.map(d => [d.id, { uid: d.id, ...d.data() }]));
    state.loaded.users = true;
    // 自動交接校正：確保「孔令淳」在資料庫表面角色為 member（組員），並將「徐嘉鴻（副理）」升級為 admin（管理員）
    if (!roleSyncedOnce && isAdmin()) {
      roleSyncedOnce = true;
      for (const u of state.users.values()) {
        if (!u.active) continue;
        if (isHiddenAdmin(u) && u.role !== 'member') {
          updateDoc(doc(db, 'users', u.uid), { role: 'member' }).catch(e => console.warn('sync hidden admin role', e));
        } else if (isSupervisor(u) && u.role !== 'admin') {
          updateDoc(doc(db, 'users', u.uid), { role: 'admin' }).catch(e => console.warn('sync supervisor admin role', e));
        }
      }
    }
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

  unsubs.push(onSnapshot(groupCol('cases'), s => {
    state.cases = new Map(s.docs.map(d => [d.id, { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }]));
    state.loaded.cases = true;
    emit();
  }, fail('cases')));

  unsubs.push(onSnapshot(groupCol('wishes'), s => {
    state.wishes = new Map(s.docs.map(d => [d.id, { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }]));
    state.loaded.wishes = true;
    emit();
  }, fail('wishes')));

  unsubs.push(onSnapshot(groupCol('vents'), s => {
    state.vents = new Map(s.docs.map(d => [d.id, { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }]));
    state.loaded.vents = true;
    emit();
  }, fail('vents')));

  unsubs.push(onSnapshot(query(groupCol('chatMessages'), orderBy('createdAt', 'desc'), limit(150)), s => {
    state.chatMessages = s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })).reverse();
    state.loaded.chat = true;
    emit();
  }, fail('chatMessages')));

  unsubs.push(onSnapshot(groupCol('vibeShared'), s => {
    state.vibeShared = new Map(s.docs.map(d => [d.id, { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }]));
    emit();
  }, fail('vibeShared')));

  unsubs.push(onSnapshot(groupCol('toolsData'), s => {
    state.toolsData = new Map(s.docs.map(d => [d.id, { id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }]));
    emit();
  }, fail('toolsData')));
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

/**
 * 供管理員於後台「新增組員（預先授權建檔）」：
 * - 自動正規化 Email（轉小寫、去空白、若僅填帳號自動補齊 @youbike.com.tw）
 * - 防呆檢查是否與既有組員 Email 重複
 * - 建立 `users/user_<prefix>`（標記 `isPreseeded: true`），待新人首次登入時自動無縫認領
 */
export async function createPreseededUser({ displayName, email, title = '', staffType = 'office', role = 'member' }) {
  if (!isAdmin()) throw new Error('只有管理員可以新增組員');
  const cleanName = String(displayName || '').trim();
  if (!cleanName) throw new Error('請輸入新進組員姓名');

  let cleanEmail = String(email || '').toLowerCase().trim();
  if (!cleanEmail) throw new Error('請輸入公司 Email 帳號');
  if (!cleanEmail.includes('@')) {
    cleanEmail = `${cleanEmail}@${APP.allowedDomains[0]}`;
  }
  if (!isCompanyDomainEmail(cleanEmail)) {
    throw new Error(`Email 必須為公司網域（@${APP.allowedDomains.join(' 或 @')}）`);
  }

  const prefix = cleanEmail.split('@')[0].replace(/[^a-z0-9._-]/g, '');
  if (!prefix) throw new Error('Email 帳號格式不正確');

  // 檢查是否已存在相同 Email 的組員
  for (const existing of state.users.values()) {
    if (String(existing.email || '').toLowerCase().trim() === cleanEmail) {
      throw new Error(`此 Email（${cleanEmail}）已在組員名單中（${existing.displayName}）`);
    }
  }

  const preUid = `user_${prefix}`;
  const payload = {
    uid: preUid,
    displayName: cleanName,
    email: cleanEmail,
    title: String(title || '').trim(),
    staffType: staffType === 'field' ? 'field' : 'office',
    role: role === 'admin' ? 'admin' : 'member',
    groupId: G,
    active: true,
    isPreseeded: true,
    photoURL: '',
  };

  if (demo) {
    return demo.createPreseededUser(payload);
  }

  await setDoc(doc(db, 'users', preUid), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return payload;
}

/** 供管理員刪除尚未登入認領的預建組員資料（例如建錯帳號時直接清理） */
export async function deletePreseededUser(uid) {
  if (!isAdmin()) throw new Error('只有管理員可以移除預建組員');
  const u = state.users.get(uid);
  if (!u || !u.isPreseeded) throw new Error('僅能直接移除尚未登入認領的預建組員');
  if (demo) return demo.deletePreseededUser(uid);
  await deleteDoc(doc(db, 'users', uid));
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
      summary: `會議紀錄發布｜${m?.date || ''} 經營 Team 月會會議紀錄已發布`,
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

// ============================================================
// 📌 例案追蹤（長期專案進度管理）CRUD
// ============================================================
export function caseList() {
  return [...state.cases.values()].sort((a, b) => {
    const pOrder = { high: 0, medium: 1, low: 2 };
    const sOrder = { blocked: 0, active: 1, planning: 2, done: 3 };
    const sa = sOrder[a.status || 'active'] ?? 1;
    const sb = sOrder[b.status || 'active'] ?? 1;
    if (sa !== sb) return sa - sb;
    const pa = pOrder[a.priority || 'medium'] ?? 1;
    const pb = pOrder[b.priority || 'medium'] ?? 1;
    if (pa !== pb) return pa - pb;
    return String(b.updatedAtIso || '').localeCompare(String(a.updatedAtIso || ''));
  });
}

export async function saveCaseItem(data, prev = null) {
  const me = myUid();
  const nowIso = new Date().toISOString();
  const id = prev?.id || ('case_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6));
  const payload = {
    ...(prev || {}),
    ...data,
    id,
    createdBy: prev?.createdBy || me,
    createdAtIso: prev?.createdAtIso || nowIso,
    updatedBy: me,
    updatedAtIso: nowIso,
  };
  if (demo) {
    state.cases = new Map(state.cases).set(id, payload);
    emit();
    return id;
  }
  await setDoc(groupDoc('cases', id), {
    ...payload,
    updatedAt: serverTimestamp(),
    ...(prev ? {} : { createdAt: serverTimestamp() }),
  }, { merge: true });
  return id;
}

export async function appendCaseTimeline(caseId, { note, progress, status }) {
  const me = myUid();
  const meName = state.me?.displayName || '組員';
  const existing = state.cases.get(caseId);
  if (!existing) return;
  const nowIso = new Date().toISOString();
  const timeline = Array.isArray(existing.timeline) ? [...existing.timeline] : [];
  timeline.unshift({
    id: 'tl_' + Date.now().toString(36),
    uid: me,
    authorName: meName,
    note: String(note || '').trim(),
    progress: progress !== undefined ? Number(progress) : existing.progress,
    status: status || existing.status,
    at: nowIso,
  });
  const patch = {
    timeline: timeline.slice(0, 60),
    progress: progress !== undefined ? Number(progress) : (existing.progress || 0),
    status: status || existing.status || 'active',
    updatedBy: me,
    updatedAtIso: nowIso,
  };
  return saveCaseItem(patch, existing);
}

export async function deleteCaseItem(caseId) {
  if (demo) {
    const m = new Map(state.cases);
    m.delete(caseId);
    state.cases = m;
    emit();
    return;
  }
  await deleteDoc(groupDoc('cases', caseId));
}

// ============================================================
// 🌠 許願池（具名提議與 +1 附議）CRUD
// ============================================================
export function wishList() {
  return [...state.wishes.values()].sort((a, b) => {
    const va = Array.isArray(a.votes) ? a.votes.length : 0;
    const vb = Array.isArray(b.votes) ? b.votes.length : 0;
    if (vb !== va) return vb - va;
    return String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || ''));
  });
}

export async function saveWishItem(data, prev = null) {
  const me = myUid();
  const meName = state.me?.displayName || '組員';
  const nowIso = new Date().toISOString();
  const id = prev?.id || ('wish_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6));
  const payload = {
    ...(prev || {}),
    ...data,
    id,
    createdBy: prev?.createdBy || me,
    authorName: prev?.authorName || meName,
    votes: prev?.votes || [me],
    status: data.status || prev?.status || 'open', // open | reviewing | building | done
    comments: prev?.comments || [],
    createdAtIso: prev?.createdAtIso || nowIso,
    updatedAtIso: nowIso,
  };
  if (demo) {
    state.wishes = new Map(state.wishes).set(id, payload);
    emit();
    return id;
  }
  await setDoc(groupDoc('wishes', id), {
    ...payload,
    updatedAt: serverTimestamp(),
    ...(prev ? {} : { createdAt: serverTimestamp() }),
  }, { merge: true });
  return id;
}

export async function toggleWishVote(wishId) {
  const me = myUid();
  const w = state.wishes.get(wishId);
  if (!w || !me) return;
  const votes = new Set(Array.isArray(w.votes) ? w.votes : []);
  if (votes.has(me)) votes.delete(me);
  else votes.add(me);
  await saveWishItem({ votes: [...votes] }, w);
}

export async function deleteWishItem(wishId) {
  if (demo) {
    const m = new Map(state.wishes);
    m.delete(wishId);
    state.wishes = m;
    emit();
    return;
  }
  await deleteDoc(groupDoc('wishes', wishId));
}

// ============================================================
// 🗣️ 意見箱 / 抱怨箱（支援完全匿名吐苦水與打氣）CRUD
// ============================================================
export function ventList() {
  return [...state.vents.values()].sort((a, b) =>
    String(b.createdAtIso || '').localeCompare(String(a.createdAtIso || ''))
  );
}

export async function createVentItem({ content, category = 'general', isAnonymous = true, mood = '😤' }) {
  const me = myUid();
  const meName = state.me?.displayName || '組員';
  const nowIso = new Date().toISOString();
  const id = 'vent_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  // 匿名模式：完全不寫入真實姓名與真實 createdBy UID（僅標記 'anonymous'），連管理員與資料庫都無法反查是誰寫的，確保 100% 安心吐苦水！
  const aliases = ['匿名單車客 🚲', '微笑小騎士 ヘルメット', '夜騎追風者 🌙', '補胎小精靈 🔧', '滿站守護者 🚏', '茶水間觀察家 ☕'];
  const randomAlias = aliases[Math.floor(Math.random() * aliases.length)];
  const payload = {
    id,
    content: String(content || '').trim(),
    category,
    mood,
    isAnonymous: !!isAnonymous,
    createdBy: isAnonymous ? 'anonymous' : me,
    authorName: isAnonymous ? randomAlias : meName,
    reactions: { hug: [], cry: [], cheer: [] },
    replies: [],
    createdAtIso: nowIso,
  };
  if (demo) {
    state.vents = new Map(state.vents).set(id, payload);
    emit();
    return id;
  }
  await setDoc(groupDoc('vents', id), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function toggleVentReaction(ventId, type = 'hug') {
  const me = myUid();
  const v = state.vents.get(ventId);
  if (!v || !me) return;
  const reactions = { hug: [], cry: [], cheer: [], ...(v.reactions || {}) };
  const arr = new Set(Array.isArray(reactions[type]) ? reactions[type] : []);
  if (arr.has(me)) arr.delete(me);
  else arr.add(me);
  reactions[type] = [...arr];
  const next = { ...v, reactions };
  if (demo) {
    state.vents = new Map(state.vents).set(ventId, next);
    emit();
    return;
  }
  await setDoc(groupDoc('vents', ventId), { reactions }, { merge: true });
}

export async function addVentReply(ventId, { text, isAnonymous = true }) {
  const me = myUid();
  const meName = state.me?.displayName || '組員';
  const v = state.vents.get(ventId);
  if (!v || !text.trim()) return;
  const replies = Array.isArray(v.replies) ? [...v.replies] : [];
  replies.push({
    id: 'vr_' + Date.now().toString(36),
    authorName: isAnonymous ? '匿名夥伴 🤝' : meName,
    isAnonymous: !!isAnonymous,
    text: text.trim(),
    at: new Date().toISOString(),
  });
  if (demo) {
    state.vents = new Map(state.vents).set(ventId, { ...v, replies });
    emit();
    return;
  }
  await setDoc(groupDoc('vents', ventId), { replies }, { merge: true });
}

export async function deleteVentItem(ventId) {
  if (demo) {
    const m = new Map(state.vents);
    m.delete(ventId);
    state.vents = m;
    emit();
    return;
  }
  await deleteDoc(groupDoc('vents', ventId));
}

// ============================================================
// 💬 團隊即時聊天室 CRUD
// ============================================================
export async function sendChatMessage({ channel = 'general', text = '', imageData = '', replyTo = null, mentions = [], sticker = '' }) {
  const me = myUid();
  const meObj = state.me || {};
  const id = 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  const nowIso = new Date().toISOString();
  const payload = {
    id,
    channel,
    uid: me,
    authorName: meObj.displayName || '組員',
    photoURL: meObj.photoURL || '',
    text: String(text || '').trim(),
    imageData: imageData || '',
    sticker: sticker || '',
    replyTo: replyTo || null,
    mentions: Array.isArray(mentions) ? mentions : [],
    reactions: {},
    createdAtIso: nowIso,
  };
  if (demo) {
    state.chatMessages = [...state.chatMessages, payload];
    emit();
    return id;
  }
  const b = writeBatch(db);
  b.set(groupDoc('chatMessages', id), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  // 若有 @標註組員，發送個人通知
  for (const targetUid of payload.mentions) {
    if (!targetUid || targetUid === me) continue;
    b.set(doc(collection(db, 'users', targetUid, 'notifications')), {
      kind: 'chat_mention',
      actorUid: me,
      summary: `💬 ${payload.authorName} 在聊天室標註了你：「${payload.text.slice(0, 35)}」`,
      read: false,
      createdAt: serverTimestamp(),
    });
  }
  await b.commit();
  return id;
}

export async function toggleChatReaction(msgId, emoji) {
  const me = myUid();
  const msg = state.chatMessages.find(m => m.id === msgId);
  if (!msg || !me) return;
  const reactions = { ...(msg.reactions || {}) };
  const list = new Set(Array.isArray(reactions[emoji]) ? reactions[emoji] : []);
  if (list.has(me)) list.delete(me);
  else list.add(me);
  reactions[emoji] = [...list];
  if (demo) {
    msg.reactions = reactions;
    emit();
    return;
  }
  await setDoc(groupDoc('chatMessages', msgId), { reactions }, { merge: true });
}

export async function deleteChatMessage(msgId) {
  if (demo) {
    state.chatMessages = state.chatMessages.filter(m => m.id !== msgId);
    emit();
    return;
  }
  await deleteDoc(groupDoc('chatMessages', msgId));
}

// ============================================================
// ☕ 晨間補給站（延伸話題分享 / 笑話投稿與投票）& 🧰 小工具共用書籤
// ============================================================
export async function saveVibeDoc(docId, data) {
  if (demo) {
    const prev = state.vibeShared.get(docId) || { id: docId };
    state.vibeShared = new Map(state.vibeShared).set(docId, { ...prev, ...data });
    emit();
    return;
  }
  await setDoc(groupDoc('vibeShared', docId), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function saveToolsDoc(docId, data) {
  if (demo) {
    const prev = state.toolsData.get(docId) || { id: docId };
    state.toolsData = new Map(state.toolsData).set(docId, { ...prev, ...data });
    emit();
    return;
  }
  await setDoc(groupDoc('toolsData', docId), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

