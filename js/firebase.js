// Firebase 初始化（使用官方 CDN 的 ES Module，不需要 Node.js / npm）
import { firebaseConfig, APP } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { initializeFirestore } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// 啟用自動偵測 Long Polling：解決手機端瀏覽器（iOS Safari / Android Chrome / LINE 內建瀏覽器）與行動網路下 WebChannel 連線容易卡死在「登入中…」的問題
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});

export const provider = new GoogleAuthProvider();
// hd：讓 Google 登入畫面優先只顯示公司網域帳號（真正的限制在 firestore.rules）
provider.setCustomParameters({ hd: APP.allowedDomains[0], prompt: 'select_account' });
