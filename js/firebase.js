// Firebase 初始化（使用官方 CDN 的 ES Module，不需要 Node.js / npm）
import { firebaseConfig, APP } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 啟用自動偵測 Long Polling ＋ IndexedDB 多分頁本地快取（二次開啟 0ms 秒讀本地快取，若私密瀏覽模式不支援則平滑降級為記憶體快取）
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch {
  firestoreInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
}
export const db = firestoreInstance;

export const provider = new GoogleAuthProvider();
// hd：讓 Google 登入畫面優先只顯示公司網域帳號（真正的限制在 firestore.rules）
provider.setCustomParameters({ hd: APP.allowedDomains[0], prompt: 'select_account' });
