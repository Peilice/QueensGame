# 刺蝟排排站

排好位置，別互相傷害！

LinkedIn Queens 風格的邏輯解謎遊戲（棋子換成刺蝟），純 HTML／CSS／JavaScript，不需建置工具。

## 規則

- 每一列、每一行、每個色塊恰好放一隻刺蝟
- 刺蝟靠太近會被刺到，任兩隻不可相鄰（含斜角）

## 操作

- 點一下標 ✕，再點一下放刺蝟，再點一下清空
- 按住拖曳可連續標 ✕（只會標在空格上）；從 ✕ 開始拖曳則是連續擦掉 ✕（刺蝟不受影響）
- 「上一步」可撤銷上一個操作（一次拖曳、一次重來都算一步）
- 拿不定時按「標記」先試放：之後畫的都是虛線，按「留下」就算數，按「擦掉」回到試放之前
- 列表最上面的「怎麼玩」是一分鐘的互動教學，在 5×5 小盤上照著引導做一遍
- 每一頁右上角的喇叭點開是聲音設定，音效和背景音樂分開開關，都預設打開；音效和音樂全部用 Web Audio 當場合成，沒有音檔
- 「怎麼玩」下面的「解題技巧」（`#tips`）用 9 張小盤圖解，由淺到深介紹常用的推理；遊戲中「規則」最後一行也連得到

固定題目做成蒐集拼圖：6×6、7×7、8×8、9×9 四個尺寸各是一本拼圖冊，每本有好幾幅公有領域的插畫，一幅切成 3×3（6×6）、4×4（7×7）或 5×5（8×8、9×9）片，一片就是一題，解完就拼上那一片。目前共 85 幅、1445 題。題目不照難度排，每一幅都是難易混著。一次開一幅：拼完一幅才打開同一本的下一幅，四本各自獨立；打開的那一幅裡哪一片都能先拼。列表上方分成「拼圖」和「隨機難度」兩頁。「隨機難度」選一個尺寸，瀏覽器當場出一題唯一解的新題目，網址（如 `#r7-1k2f9x`）帶著種子，分享出去對方玩到的是同一題。

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
npm run font      # 重新產生自帶字型（需要 Python 與 fontTools：pip install fonttools brotli）
```

## 專案結構

```
index.html             頁面骨架
style.css              樣式（只有淺色）
fonts/                 自帶字型：粉圓的子集 hedgehog-round.woff2、收了哪些字、OFL 授權
src/rules.js           規則判定：衝突偵測、過關判定
src/solver.js          回溯解題器
src/generator.js       隨機出題：依尺寸＋種子產生唯一解的題目
src/game.js            盤面狀態、Undo
src/album.js           拼圖冊的規則：哪一幅打開了、拼到哪裡、下一片拼哪一片
src/pictures.js        拼圖：每一幅的名稱、出處、每一片對到哪一題
src/jigsaw.js          拼圖片的形狀（凸耳由幅的 id 決定）
pictures/              插圖：<id>.webp 大圖（900px）與 <id>-s.webp 縮圖
src/puzzles.js         題庫（依尺寸分組，每題 N 個字串，字元代表色塊）
src/tutorial.js        教學題目與每一步的引導、提示格、完成條件
src/tips.js            解題技巧的說明與圖解（色塊、墨跡、提示格都用字串畫）
src/storage.js         localStorage 進度存取
src/sound.js           音效：Web Audio 合成，不用音檔
src/music.js           背景音樂：Web Audio 合成的輕快小曲，和音效共用 AudioContext
sw.js                  service worker：離線遊玩（新增檔案時要加進 PRECACHE，npm test 會檢查）
src/session.js         一局（拼圖的一片、隨機題、教學）：網址要打開什麼、每一步存什麼、過關後去哪
src/main.js            畫面與操作（照 session 的結果畫、出聲）
scripts/verify-puzzles.js  題庫驗證
scripts/rate-puzzles.js    題目難度評分（照人解題的招式一步步推）
scripts/add-puzzles.js     擴充題庫：出題、評分，從易到難平均挑題，接在每組最後面
scripts/build-pictures.js  把題目分進新的拼圖（難易分層、位置洗亂），已經分好的不動
scripts/build-icons.js     由 src/main.js 的刺蝟產生 icons/ 的 SVG 與 PNG 圖示
scripts/build-font.js      從粉圓只留畫面上用到的字，產生 fonts/ 的字型（收字規則在 scripts/font-chars.js）
test/                  node --test 單元測試
```

要加一幅新拼圖時：

1. `npm run add-puzzles -- 6=9`（尺寸=題數，題數是一幅的片數：6×6 是 9、7×7 是 16、8×8 和 9×9 是 25），新題接在 `src/puzzles.js` 那一組最後面，舊題編號不變。
2. 把插圖裁成正方形，存成 `pictures/<id>.webp`（900px）和 `pictures/<id>-s.webp`（200px）。
3. 在 `src/pictures.js` 那個尺寸的最後面加一筆 `{ id, title, book, levels: [] }`（出處不在 `BOOKS` 裡就一起加）。
4. `node scripts/build-pictures.js` 替新拼圖分題，同時更新 `test/pictures-lock.json`。
5. `npm run verify` 與 `npm test`。已經分好的拼圖不能改，否則玩家的碎片會換位置，測試會擋下來。

插圖不預先存進離線快取（太多張），看過的會在抓的時候順便存起來；沒存到的插圖離線時畫不出來，拼圖照樣是紙上的虛線碎片，照樣能玩。

## 字型

字型是 justfont 的 [jf open 粉圓](https://github.com/justfont/open-huninn-font) 2.1（SIL Open Font License 1.1，授權全文在 `fonts/OFL.txt`），自己放在 `fonts/`，不連外部字型服務，離線第一次打開也有。只留 index.html、style.css、src/*.js 裡出現的字（註解不算）和可列印的 ASCII，所以只有 85 KB 左右。OFL 規定修改過的字型不能沿用保留名稱「huninn」「open huninn」，子集算修改，所以字型改名叫 Hedgehog Round，版權與授權說明照舊留在字型裡。

改了畫面上的文字或幅名、多了新的字，就要重跑 `npm run font`，否則新字會退回系統字；`npm test` 會檢查有沒有漏字。字串裡不要寫 `/*`、`*/` 或「空白 // 空白」，收字時會被當成註解。

## 插圖出處

拼圖的插圖都是公有領域的插畫，從 Wikimedia Commons 與 Internet Archive 的早期版本掃描裁成正方形：

- Sibylle von Olfers（1881–1916）：*Etwas von den Wurzelkindern*（1906）、*Prinzesschen im Walde*（1909，1929 年波蘭文版掃描）、*Mapje en Papje in het Hazenbosch*（1906，1916 年荷蘭文版掃描）
- Elsa Beskow（1874–1953）：*Tomtebobarnen*（1910）的彩圖與明信片、*Sov du lilla videung*、*Puttes äventyr i blåbärsskogen*（1901，德文版 *Hänschen im Blaubeerenwald* 掃描）
- Ernst Kreidolf（1863–1956）：*Alpenblumenmärchen*（1922）。台灣、美國已是公有領域，歐盟要到 2027 年
- Ida Rentoul Outhwaite（1888–1960）：*Fairyland*（1926）。台灣、美國已是公有領域，澳洲、英國、歐盟要到 2031 年
- Beatrix Potter（1866–1943）：*The Tale of Squirrel Nutkin*（1903）、*The Tale of Benjamin Bunny*（1904）、*The Tale of Tom Kitten*（1907）、*The Tale of Jemima Puddle-Duck*（1908），多倫多大學圖書館的早期版本掃描。角色名稱是出版社的商標，遊戲裡的幅名不用角色名

## 部署到 GitHub Pages

1. 在 GitHub 建立新的 repository
2. 推送程式碼：
   ```sh
   git remote add origin https://github.com/<帳號>/<repo>.git
   git push -u origin main
   ```
3. 到 repository 的 **Settings → Pages**，Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)`，儲存
4. 約一分鐘後即可在 `https://<帳號>.github.io/<repo>/` 遊玩

離線遊玩：第一次連網打開後，service worker 會把整個遊戲存起來，之後沒網路也能打開（含加到主畫面的版本）。有網路時一律抓最新版，部署後不必改版號。service worker 只在 https 或 localhost 下運作，直接開 `file://` 不會啟用。
