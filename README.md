# Queens 皇后解謎

LinkedIn Queens 風格的邏輯解謎遊戲，純 HTML／CSS／JavaScript，不需建置工具。

## 規則

- 每一列、每一行、每個色塊恰好放一個皇后
- 任兩個皇后不可相鄰（含斜角）

## 操作

- 點一下標 ✕，再點一下放皇后，再點一下清空
- 按住拖曳可連續標 ✕（只會標在空格上）
- 「復原」可撤銷上一步（一次拖曳、一次重來都算一步）

關卡依序解鎖，進度與未完成的盤面存在瀏覽器的 `localStorage`。

## 本機執行

使用 ES modules，瀏覽器不允許從 `file://` 載入，需透過靜態伺服器開啟，例如：

```sh
npx serve .
```

或使用 VS Code 的 Live Server 擴充套件。

## 測試

需要 Node.js 18 以上，不需安裝任何套件。

```sh
npm test          # 單元測試
npm run verify    # 驗證題庫每題皆為唯一解且色塊連通
```

## 專案結構

```
index.html             頁面骨架
style.css              樣式（含深色模式）
src/rules.js           規則判定：衝突偵測、過關判定
src/solver.js          回溯解題器
src/game.js            盤面狀態、Undo、解鎖規則
src/puzzles.js         題庫（每題 N 個字串，字元代表色塊）
src/storage.js         localStorage 進度存取
src/main.js            畫面與操作
scripts/verify-puzzles.js  題庫驗證
test/                  node --test 單元測試
```

新增題目時，加到 `src/puzzles.js` 後執行 `npm run verify` 確認為唯一解。

## 部署到 GitHub Pages

1. 在 GitHub 建立新的 repository
2. 推送程式碼：
   ```sh
   git remote add origin https://github.com/<帳號>/<repo>.git
   git push -u origin main
   ```
3. 到 repository 的 **Settings → Pages**，Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)`，儲存
4. 約一分鐘後即可在 `https://<帳號>.github.io/<repo>/` 遊玩
