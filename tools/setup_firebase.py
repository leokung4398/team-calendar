"""
經營 Team 行事曆 - Firebase 自動設定腳本

前置（需在 Firebase 控制台手動完成）：
  1. 建立新專案
  2. Authentication → 登入方式 → 啟用 Google
  3. 專案設定 → 服務帳戶 → 產生新的私密金鑰 → 把下載的 JSON 放到本專案資料夾
     （檔名含 firebase-adminsdk，已被 .gitignore 排除，不會上傳）

本腳本會：
  - 建立 Firestore 資料庫（asia-east1，若尚未建立）
  - 部署 firestore.rules
  - 建立網頁應用程式並把 firebaseConfig 寫入 js/config.js
  - 把 localhost 與 GitHub Pages 網域加入授權網域
  - 檢查 Google 登入是否已啟用

用法：python tools/setup_firebase.py [--github-domain leokung4398.github.io]
金鑰內容只在記憶體中使用，不會印出。
"""
import glob
import json
import os
import re
import sys
import time

from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GITHUB_DOMAIN = "leokung4398.github.io"
if "--github-domain" in sys.argv:
    GITHUB_DOMAIN = sys.argv[sys.argv.index("--github-domain") + 1]
LOCATION = "asia-east1"
MAX_POLL = 30  # 輪詢上限（每次 2 秒）


def find_key():
    keys = glob.glob(os.path.join(ROOT, "*firebase-adminsdk*.json")) + glob.glob(os.path.join(ROOT, "*serviceAccount*.json"))
    if not keys:
        sys.exit("❌ 找不到服務帳戶金鑰：請把 Firebase 下載的 *firebase-adminsdk*.json 放到專案資料夾")
    if len(keys) > 1:
        sys.exit(f"❌ 找到多把金鑰，請只保留一把：{[os.path.basename(k) for k in keys]}")
    return keys[0]


def main():
    key = find_key()
    creds = service_account.Credentials.from_service_account_file(
        key, scopes=["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"])
    s = AuthorizedSession(creds)
    P = creds.project_id
    print(f"🔑 使用金鑰：{os.path.basename(key)}（專案 {P}）")
    if P == "procurement-board":
        sys.exit("❌ 這是採購佈告欄的金鑰，請使用新專案的金鑰")

    def call(method, url, ok=(200,), **kw):
        r = s.request(method, url, timeout=30, **kw)
        body = r.json() if r.text and r.headers.get("content-type", "").startswith("application/json") else {}
        return r.status_code, body

    def wait_op(op_url_or_name, base):
        name = op_url_or_name
        for _ in range(MAX_POLL):
            c, op = call("GET", f"{base}/{name}")
            if op.get("done"):
                if "error" in op:
                    raise RuntimeError(op["error"])
                return op.get("response", {})
            time.sleep(2)
        raise TimeoutError(f"等待逾時：{name}")

    problems = []

    # 1. Firestore 資料庫
    c, db = call("GET", f"https://firestore.googleapis.com/v1/projects/{P}/databases/(default)")
    if c == 200:
        print(f"✅ Firestore 已存在（{db.get('locationId')}）")
    else:
        print(f"⏳ 建立 Firestore（{LOCATION}）…")
        c, op = call("POST", f"https://firestore.googleapis.com/v1/projects/{P}/databases?databaseId=(default)",
                     json={"locationId": LOCATION, "type": "FIRESTORE_NATIVE"})
        if c in (200, 201) and "name" in op:
            try:
                wait_op(op["name"], "https://firestore.googleapis.com/v1")
                print("✅ Firestore 建立完成")
            except Exception as e:
                problems.append(f"Firestore 建立失敗：{e}")
        else:
            problems.append(f"Firestore 建立失敗（{c}）：{op.get('error', {}).get('message', op)}。請在控制台手動建立（asia-east1、正式版模式）後重跑")

    # 2. 部署規則
    with open(os.path.join(ROOT, "firestore.rules"), encoding="utf-8") as f:
        rules = f.read()
    c, rs = call("POST", f"https://firebaserules.googleapis.com/v1/projects/{P}/rulesets",
                 json={"source": {"files": [{"name": "firestore.rules", "content": rules}]}})
    if c == 200:
        release = {"name": f"projects/{P}/releases/cloud.firestore", "rulesetName": rs["name"]}
        c2, _ = call("PATCH", f"https://firebaserules.googleapis.com/v1/projects/{P}/releases/cloud.firestore", json={"release": release})
        if c2 != 200:
            c2, err = call("POST", f"https://firebaserules.googleapis.com/v1/projects/{P}/releases", json=release)
        print("✅ 安全規則已部署" if c2 == 200 else f"⚠️ 規則發布失敗（{c2}）")
        if c2 != 200:
            problems.append("規則發布失敗，請手動把 firestore.rules 貼到控制台")
    else:
        msg = rs.get("error", {}).get("message", rs)
        problems.append(f"規則編譯/上傳失敗（{c}）：{msg}")

    # 3. 網頁應用程式與設定
    c, apps = call("GET", f"https://firebase.googleapis.com/v1beta1/projects/{P}/webApps")
    app_list = apps.get("apps", []) if c == 200 else []
    if not app_list and c == 200:
        print("⏳ 建立網頁應用程式…")
        c, op = call("POST", f"https://firebase.googleapis.com/v1beta1/projects/{P}/webApps", json={"displayName": "team-calendar"})
        if "name" in op:
            app_list = [wait_op(op["name"], "https://firebase.googleapis.com/v1beta1")]
    if app_list:
        app_id = app_list[0]["appId"]
        c, cfg = call("GET", f"https://firebase.googleapis.com/v1beta1/projects/{P}/webApps/{app_id}/config")
        if c == 200:
            write_config(cfg)
            print(f"✅ 已寫入 js/config.js（appId {app_id}）")
        else:
            problems.append(f"取得網頁設定失敗（{c}）")
    else:
        problems.append(f"無法建立/讀取網頁應用程式（{c}）")

    # 4. 授權網域 & Google 登入
    c, auth = call("GET", f"https://identitytoolkit.googleapis.com/admin/v2/projects/{P}/config")
    if c == 200:
        domains = auth.get("authorizedDomains", [])
        want = [d for d in ("localhost", GITHUB_DOMAIN) if d not in domains]
        if want:
            c2, _ = call("PATCH", f"https://identitytoolkit.googleapis.com/admin/v2/projects/{P}/config?updateMask=authorizedDomains",
                         json={"authorizedDomains": domains + want})
            print(f"✅ 已加入授權網域：{want}" if c2 == 200 else f"⚠️ 授權網域更新失敗（{c2}）")
        else:
            print(f"✅ 授權網域已包含 localhost 與 {GITHUB_DOMAIN}")
    else:
        problems.append("尚未啟用 Authentication：請到控制台 Authentication → 開始使用")

    c, idp = call("GET", f"https://identitytoolkit.googleapis.com/admin/v2/projects/{P}/defaultSupportedIdpConfigs")
    enabled = any(x.get("name", "").endswith("google.com") and x.get("enabled") for x in idp.get("defaultSupportedIdpConfigs", []))
    if enabled:
        print("✅ Google 登入已啟用")
    else:
        problems.append("Google 登入尚未啟用：控制台 Authentication → 登入方式 → Google → 啟用")

    print()
    if problems:
        print("⚠️ 以下項目需要處理後重新執行本腳本：")
        for p in problems:
            print("  -", p)
        sys.exit(1)
    print("🎉 全部設定完成！執行 python serve.py 開始使用")


def write_config(cfg):
    path = os.path.join(ROOT, "js", "config.js")
    with open(path, encoding="utf-8") as f:
        src = f.read()
    keys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"]
    block = "export const firebaseConfig = {\n" + "".join(f'  {k}: {json.dumps(cfg.get(k, ""))},\n' for k in keys) + "};"
    new = re.sub(r"export const firebaseConfig = \{.*?\};", block, src, count=1, flags=re.S)
    if new != src:
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(new)


if __name__ == "__main__":
    main()
