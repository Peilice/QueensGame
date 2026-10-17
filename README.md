# 刺蝟排排站

排好位置，別互相傷害！

LinkedIn Queens 風格的邏輯解謎遊戲（棋子換成刺蝟），純 HTML／CSS／JavaScript，不需建置工具。

## 規則

- 每一列、每一行、每個色塊恰好放一隻刺蝟
- 刺蝟靠太近會被刺到，任兩隻不可相鄰（含斜角）

## 操作

- 點一下標 ✕，再點一下放刺蝟，再點一下清空
- 按住拖曳可連續標 ✕（只會標在空格上）
- 「上一步」可撤銷上一個操作（一次拖曳、一次重來都算一步）
- 關卡列表最上面的「怎麼玩」是一分鐘的互動教學，在 5×5 小盤上照著引導做一遍
- 「怎麼玩」下面的「解題技巧」（`#tips`）用 9 張小盤圖解，由淺到深介紹常用的推理；遊戲中「規則」最後一行也連得到

關卡依棋盤尺寸分成 6×6、7×7、8×8、9×9 四組，每組 20 關，由易到難排列。各組獨立解鎖，可直接從任一尺寸的第 1 關開始；組內須破前一關才能玩下一關。列表上方分成「關卡」和「隨機難度」兩頁。「隨機難度」選一個尺寸，瀏覽器當場出一題唯一解的新題目，網址（如 `#r7-1k2f9x`）帶著種子，分享出去對方玩到的是同一題。

進度與未完成的盤面存在瀏覽器的 `localStorage`。

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
npm run verify    # 驗證題庫（含教學題）每題皆為唯一解且色塊連通
npm run icons     # 重新產生主畫面圖示與 favicon（需要電腦上有 Chrome 或 Edge）
```

## 專案結構

```
index.html             頁面骨架
style.css              樣式（只有淺色）
src/rules.js           規則判定：衝突偵測、過關判定
src/solver.js          回溯解題器
src/generator.js       隨機出題：依尺寸＋種子產生唯一解的題目
src/game.js            盤面狀態、Undo、解鎖規則
src/puzzles.js         題庫（依尺寸分組，每題 N 個字串，字元代表色塊）
src/tutorial.js        教學題目與每一步的引導、提示格、完成條件
src/tips.js            解題技巧的說明與圖解（色塊、墨跡、提示格都用字串畫）
src/storage.js         localStorage 進度存取
src/main.js            畫面與操作
scripts/verify-puzzles.js  題庫驗證
scripts/build-icons.js     由 src/main.js 的刺蝟產生 icons/ 的 SVG 與 PNG 圖示
test/                  node --test 單元測試
```

新增題目時，加到 `src/puzzles.js` 對應尺寸的陣列後執行 `npm run verify` 確認為唯一解。

## 部署到 GitHub Pages

1. 在 GitHub 建立新的 repository
2. 推送程式碼：
   ```sh
   git remote add origin https://github.com/<帳號>/<repo>.git
   git push -u origin main
   ```
3. 到 repository 的 **Settings → Pages**，Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)`，儲存
4. 約一分鐘後即可在 `https://<帳號>.github.io/<repo>/` 遊玩
