// Firebase 初始化（使用官方 CDN 的 ES Module，不需要 Node.js / npm）
import { firebaseConfig, APP } from './config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const provider = new GoogleAuthProvider();
// hd：讓 Google 登入畫面優先只顯示公司網域帳號（真正的限制在 firestore.rules）
provider.setCustomParameters({ hd: APP.allowedDomains[0], prompt: 'select_account' });
