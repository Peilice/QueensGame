---
name: 刺蝟排排站
description: 無廣告、免登入的 LinkedIn Queens 風格邏輯解謎，手機優先的紙上謎題本。
colors:
  cream-paper: "#f6f0e5"
  sage-surface: "#e2e8da"
  oat-panel: "#d9c8ab"
  warm-brown: "#55483c"
  forest-title: "#6f795f"
  soft-taupe: "#8b7d6b"
  panel-hint: "#5e5144"
  button-text: "#46573d"
  warm-line: "#b8b09f"
  region-edge: "#7a6c5b"
  button-edge: "#a9b69b"
  forest: "#657a58"
  forest-text: "#ffffff"
  forest-deep: "#4f6145"
  terracotta: "#b8432e"
  terracotta-soft: "#eda898"
  disabled-bg: "#e5e0d7"
  piece: "#55483c"
  region-forest: "#acd4ac"
  region-oat: "#d3b591"
  region-mist: "#aad1e5"
  region-apricot: "#fecfbb"
  region-lavender: "#dccdef"
  region-moss: "#a8ac80"
  region-cream: "#f3e5a8"
  region-periwinkle: "#9daacb"
  region-rose: "#cca4b3"
  region-mint: "#b8e6dc"
typography:
  headline:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "clamp(3rem, 16vw, 4.75rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.02em"
  title:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
  body:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  rules:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.8
    letterSpacing: "0.05em"
  pack-heading:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  label:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "0.85rem"
    fontWeight: 400
rounded:
  board: "6px"
  control: "16px"
  card: "16px"
  pencil-ring: "12px"
  seal: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button:
    backgroundColor: "{colors.sage-surface}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.forest-text}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-ghost:
    textColor: "{colors.warm-brown}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "44px"
    width: "72px"
  level-tile:
    backgroundColor: "{colors.sage-surface}"
    textColor: "{colors.button-text}"
    rounded: "{rounded.card}"
  rules-card:
    backgroundColor: "{colors.oat-panel}"
    textColor: "{colors.warm-brown}"
    typography: "{typography.rules}"
    rounded: "{rounded.card}"
    padding: "14px 12px"
  win-seal:
    textColor: "{colors.forest}"
    rounded: "{rounded.seal}"
    size: "84px"
---

# Design System: 刺蝟排排站

## Overview

**Creative North Star: "紙上謎題本"**

這套系統的意象是一本放在手邊的謎題小冊，配色走日系手繪的森林繪本（依《配色設計.md》v1.1）。奶油紙底、暖灰米線條、低彩度色塊，棋盤就是印在紙上的那一頁。所有介面都是這本冊子的延伸：按鈕和關卡格是夾在書頁間的小卡片，規則在桌面版用直書排在頁邊，像書頁上的旁註。

畫面密度低，一次只做一件事。關卡列表就是一頁目錄，遊戲畫面就是一道題。棋盤佔據視覺重心，其他元素都退到旁邊。整體氣質安靜、溫和、有紙的質地，不搶玩家的注意力。

元件要有**實體觸感**，像桌遊配件，按下去要有回饋、有重量。按鈕和關卡格用加厚的底緣邊框表現紙卡厚度，按下時厚度壓扁、整張往下沉；格子按下時會閃一圈深森林綠內框，刺蝟落下時像蓋章一樣壓下去。明確拒絕兩個方向：手遊風的花俏特效（金幣、爆炸、閃光），以及科技風的深色霓虹。

**Key Characteristics:**
- 奶油紙底配暖灰棕文字和暖灰米線條，整體低彩度、不用純黑。只有淺色，沒有深色模式。
- 十色低彩度色塊是唯一大面積的色彩來源。
- 深森林綠是唯一的強調色，只用在主要動作、焦點環、選取格和完成標記。
- 刺蝟維持單色剪影（暖灰棕），不做彩色角色。
- 桌面版的直書規則旁註是這套系統的招牌；手機版改橫書，方便快速掃讀。
- 系統字體堆疊，沒有自訂字體，維持零建置。

## Colors

整體是低彩度的森林繪本基調，色值依《配色設計.md》v1.1，色彩集中在棋盤色塊上。只有淺色，沒有深色模式（`color-scheme: light`）。

### Primary
- **深森林綠 Forest** `#657A58`：唯一的強調色。用在主要按鈕（「下一關」）、鍵盤焦點環、按下格子時的內框、關卡列表上的「下一關」紙卡、已完成關卡的勾。按下時的深底緣是 `#4F6145`。
- **森林深綠 Forest Title** `#6F795F`：刊頭書名、尺寸組標題、關卡標題和「過關！」。

### Neutral
- **奶油紙白 Cream Paper** `#F6F0E5`：頁面底色。
- **淡鼠尾草 Sage Surface** `#E2E8DA`：按鈕和關卡格的底色（文件的「次要按鈕底色」），字色 `#46573D`。
- **燕麥米 Oat Panel** `#D9C8AB`：規則面板和刊頭下的分隔線。面板上的操作提示用 `#5E5144`，因為柔和棕灰在燕麥米上對比不足。
- **暖灰棕 Warm Brown** `#55483C`：主要文字，也是刺蝟和 ✕ 的顏色（token `--queen`）。
- **柔和棕灰 Soft Taupe** `#8B7D6B`：次要文字、hover 邊框、停用按鈕的字。
- **暖灰米 Warm Line** `#B8B09F`：同一色塊內的細格線。
- **深暖棕 Region Edge** `#7A6C5B`：色塊邊界和棋盤外框，比格線深一階，讓色塊輪廓一眼分得出來，但仍不用黑線。
- **按鈕外框 Button Edge** `#A9B69B`：按鈕和關卡格的邊框（含加厚的底緣）。
- **停用 Disabled** `#E5E0D7`：停用按鈕的底色。
- **磚紅 Terracotta** `#B8432E`：衝突格的外框。**磚粉** `#EDA898`：衝突格的 45° 斜紋。
- **朱紅印泥 Vermilion Seal** `#C0392B`：只用在過關印章（token `--seal`），比衝突的磚紅更亮、更偏朱色，像真的印泥。

### Region Palette
十個色塊色依序是森林淺綠、麥稈棕、霧感藍、杏桃粉、薰衣草灰、苔蘚橄欖、淡奶油黃、石板藍、乾燥玫瑰、淺薄荷綠（`--r0`～`--r9`）。題目最多用到九色。彩度維持低（OKLCH C 0.05–0.08），但明度刻意分成深淺兩組（L 0.73–0.92）：麥稈棕、苔蘚橄欖、石板藍、乾燥玫瑰較深，奶油黃、杏桃、薄荷、薰衣草較淺，任兩色的 OKLab 色差至少 0.066，刺蝟在每一色上的對比至少 3.7:1。調色時要保住這兩個下限；最近的一組是霧感藍和淺薄荷綠，新增題目時盡量別讓它們相鄰。

### Named Rules
**The One Green Rule.** 深森林綠是唯一的介面強調色，只能用在主要動作、焦點、選取和完成狀態。

**The Regions Own Color Rule.** 大面積的色彩只屬於棋盤色塊。介面元件一律用紙、淡鼠尾草、燕麥米和暖灰棕，不能跟色塊搶顏色。色塊色可以出現在棋盤以外，但只能是某一題真正的色塊（例如關卡列表上已破關卡的縮圖），不能拿來當裝飾或狀態色。

**The Fixed Hedgehog Rule.** 刺蝟永遠是同一個暖灰棕單色剪影，不隨色塊或狀態換色，以免玩家以為刺蝟顏色也代表規則。衝突由格子外框和斜紋表示。

## Typography

**Display / Body Font:** system-ui（fallback 依序為 -apple-system、Segoe UI、Noto Sans TC、PingFang TC、Microsoft JhengHei）

**Character:** 字體交給系統，讓中文在各平台都用最順眼的原生黑體。個性由排版方式表現，例如直書和字距，而不是靠自訂字體。

### Hierarchy
- **Headline**（700, clamp(3rem, 16vw, 4.75rem), 行高 1, 字距 0.02em）：關卡列表的刊頭「刺蝟排排站」，像謎題本的封面書名，五個字在手機上排成一行。下方 10px 是橫排副題「排好位置，別互相傷害！」（700, clamp(1rem, 4.4vw, 1.15rem), 字距 0.04em）；刊頭下方一道 2px 燕麥米分隔線。刊頭、尺寸組標題、關卡標題和「過關！」都用森林深綠。
- **Title**（700, 1.25rem）：遊戲頁置中的關卡標題，格式是「6×6 第 N 關」。過關卡的「過關！」是 1.75rem。
- **Pack Heading**（700, 1.75rem, 字距 -0.01em, 等寬數字）：關卡列表裡各尺寸組的標題，例如「6×6」，用章名的份量寫。
- **Body**（400, 1rem, 行高 1.5）：按鈕和一般文字。
- **Rules**（400, 1rem, 行高 1.8, 字距 0.05em, 手機橫書、桌面直書 vertical-rl）：規則旁註。桌面放大到 1.05rem，操作提示縮成 0.9rem、`#5E5144`。
- **Label**（400, 0.85rem, 柔和棕灰）：尺寸組標題右側的進度，例如「已完成 3 / 10」。關卡格裡只有編號，700、1.5rem；未解鎖格縮成 400、1.15rem。

### Named Rules
**The Marginalia Rule.** 桌面版規則直書、由右往左換行，像書頁旁註。手機版改為橫書，收成棋盤下方一張可翻開的「規則」頁邊籤，還沒破過任何一關時預設展開；桌面版一律展開，放在棋盤右側，頂端和棋盤上緣對齊。

## Layout

單欄、置中，以手機為主。內容最寬 560px，左右留 16px，底部預留 safe-area。

- **遊戲頁（手機）**：由上到下依序是棋盤、操作按鈕、規則頁邊籤，最常按的「上一步」落在拇指好按的位置。棋盤寬度是 `min(100%, 520px)`，維持正方形。
- **遊戲頁（≥760px）**：內容最寬 760px，改成兩欄 grid（520px 棋盤 + 剩餘寬度的規則欄，規則面板靠左貼著棋盤），欄距 16px。標題列和棋盤同寬，關卡名稱置中在棋盤正上方。操作按鈕在棋盤下方，規則高 520px，和棋盤同列、頂端對齊。
- **關卡列表**：關卡依棋盤尺寸分成 6×6、7×7、8×8、9×9 四組，每組 10 關。每組的標題列左邊是尺寸、右邊是進度，下方間距 12px。關卡格是固定 5 欄的 grid（每組剛好兩列），間距 10px，每格是正方形。組與組之間相隔 36px。刊頭上方 8px、下方 28px，分隔線和書名相隔 12px。
- **間距節奏**：8 / 12 / 16 / 24px。頂部標題列最矮 48px，下方間距 12px。

## Elevation & Depth

紙面基本上是平的。層次主要靠「淡鼠尾草卡片疊在奶油紙上」的色調差和 1.5px 邊框表現。厚度用加厚的底緣邊框表現；按鈕和可點的關卡格再加一層低透明度的暖灰棕陰影（`0 2px 6px rgba(85, 72, 60, 0.12)`），未解鎖格和返回鍵沒有。過關時棋盤外框用 2px 深暖棕再加粗一圈。

**The Soft Shadow Rule.** 只用低透明度的暖灰棕陰影，不用厚重的黑色陰影；棋盤、規則面板等書頁本身不加陰影。實體觸感仍以底緣邊框厚度、按壓位移和邊框加深為主。

## Shapes

圓角圓潤：棋盤 6px，按鈕、關卡格和規則卡 16px，印章是正圓。關卡格內側的鉛筆圈用 12px，和卡片圓角同心。棋盤外框和色塊邊界都是 2.5px 深暖棕，疊在格子上、不影響格子尺寸。格子之間是 0.5px 的內陰影細線。

## Components

### Buttons
- **Shape:** 圓角 16px，最矮 44px，左右 padding 18px。
- **Default:** 淡鼠尾草底、`#46573D` 深綠字、1.5px `#A9B69B` 邊框、淡暖棕陰影。操作列的按鈕最窄 108px。
- **Primary:** 深森林綠底、白字（對比 4.69），只用在過關卡的「下一關」。
- **Ghost:** 透明、無邊框、無陰影、暖灰棕字、寬 72px、文字靠左，用在「‹ 關卡」返回鍵。
- **Press:** 底緣邊框 3.5px 是紙卡厚度；按下時變成 1.5px、整張下沉 2px，邊框加深為柔和棕灰（主要按鈕用 `#4F6145`）。關卡格也一樣。
- **Hover / Focus:** hover 時邊框加深為柔和棕灰。焦點是 3px 深森林綠外框，偏移 2px。disabled 時改成 `#E5E0D7` 底、柔和棕灰字。

### Level Pack
- 一個尺寸一組：森林深綠的粗體尺寸標題（如「6×6」）配柔和棕灰的「已完成 n / 10」，下面接 5 欄關卡格。各組獨立解鎖。

### Level Tile
- 正方形淡鼠尾草卡、16px 圓角、深綠字，中間只有大號粗體編號。尺寸由所屬的組表示，不寫在格子裡。
- 已完成：卡片內側 5px 處印上這一題的色塊縮圖（12px 圓角，和下一關的虛線圈同一位置），加上 35% 深暖棕的色塊邊界，整張淡印（不透明度 60%）。破得越多，目錄就越滿越彩，像把做完的題目印回目錄頁。編號加一圈 4px 卡片色描邊；右上角 14px 深森林綠線條勾也有卡片色襯底，在任何色塊上都看得清楚。
- 下一關：每組最前面還沒破的那一關，整張換成深森林綠紙卡（和主要按鈕同一種：深森林綠底、底緣 `#4F6145` 厚邊、白色編號），卡片內側 5px 處再一圈 2px 虛線（白色 65%），像用筆在目錄上圈起來。這是每一章唯一該按的那一格，所以是整頁最重的一格。
- 玩到一半：有存檔盤面的關卡，底部中央（距底 6px）一個 6px 柔和棕灰圓點；在下一關的綠卡上改用白色，並下移到虛線圈上（距底 3px、帶一圈深森林綠襯底），像圈線上點了一筆。
- 未解鎖：還不是一張卡，只是印在頁面上的空框：沒有底色、1px 邊框、沒有底緣厚度和陰影，柔和棕灰編號，整格透明度 0.6，右上角一個 14px 線條鎖頭，不能點。能拿起來的卡才有厚度，所以一眼分得出哪些格子能按。
- 右上角的勾和鎖頭是同一套線條圖示（stroke 2.5、圓角端點），位置相同。

### Board（招牌元件）
- 印在紙上的謎題頁：低彩度色塊、0.5px 暖灰米格線、2.5px 深暖棕色塊邊界與外框。
- ✕ 標記是 34% 大小的暖灰棕細描邊，不透明度 60%。刺蝟是 64% 大小的暖灰棕實心側面剪影（頭朝右、背上一排刺、挖空的眼睛、圓鼻頭、兩隻小腳）；身形扁長，所以比格子的 58% 再放大一點。
- 按下格子時閃一圈 3px 深森林綠內框。
- 衝突時，格子加上 4px 磚紅內框和磚粉 45° 斜紋，刺蝟本身不換色。外框和斜紋一起表示衝突，不只靠顏色。
- 過關後盤面鎖定，游標恢復預設。

### Ink（墨跡）
盤面上的每一筆都是畫出來的，不是貼上去的：
- **✕ 是兩筆鋼筆線**：先左上到右下、再右上到左下（第二筆在第一筆收尾前 40ms 接上），各 140ms。每筆都是略帶弧度的二次曲線，端點與中點隨機偏移，所以沒有兩個 ✕ 完全一樣。拖曳時手指經過一格就寫一格。
- **刺蝟是手蓋的章**：隨機微歪 ±3.5°，套三種印痕濾鏡之一（`#ink-0`～`#ink-2`：邊緣微糙、墨色深淺不均），從 1.35 倍壓下。
- **擦掉是倒帶**：✕ 從第二筆開始反向收回；刺蝟被提起（上移、放大、淡出）。點 ✕ 變刺蝟時不收筆，章直接蓋在上面。
- **整批變動沿對角線掃過**：重來、撤銷一次拖曳或重來時，墨跡依 (列＋行) 由左上往右下依序擦除或重寫，整趟最多約 380ms。
- 進入關卡、讀回存檔盤面時不重寫；reduced-motion 時一律立即出現或消失。

### Rules Card
- 手機版是 `<details>` 頁邊籤：柔和棕灰的「規則」加上會轉 90° 的箭頭，展開後是燕麥米底、16px 圓角的橫書旁註，高度隨內容。桌面版不顯示開關，改直書、高 520px。重點字用粗體，操作提示用 `#5E5144` 小字。每一點前有一個 20px 的深綠（`#46573D`）線條小圖示：九宮格（列、行、色塊）、刺蝟剪影（不可相鄰）、點按的手指（操作提示），高度對齊第一行，換行後文字和第一行對齊。「標 ✕」不可拆開換行。

### Win Stamp（過關）
- 不用對話框，盤面留在原地。刺蝟由上而下依序「蓋印」（壓到 0.72 倍再回彈，每顆間隔 90ms），棋盤外框加粗一圈深暖棕線。
- 接著操作列換成過關面板：左邊是標題「過關！」（1.15rem）加「下一關／回關卡列表」，靠左對齊。一組的最後一關完成時，標題改成「N×N 全部完成！」，主要按鈕變成「挑戰 7×7」，最後一組則只留「回關卡列表」。
- 最後在面板右側的頁邊蓋上一枚朱紅的圓形印章「過關」：直徑 84px、3px 外圈加 1px 內圈、旋轉 -14°、1.25rem 粗體，從 1.8 倍壓下。印章有自己的 grid 欄位，右緣和棋盤右緣對齊，永遠不壓到棋盤上的解或按鈕，像老師把章蓋在考卷的頁邊。印章不用 multiply 混色，朱紅在暖紙上才不會發灰。印章套 `#ink-seal` 濾鏡：邊緣毛、印泥有沒沾到的空隙。
- reduced-motion 時沒有動畫，印章和面板立即出現。

## Do's and Don'ts

### Do:
- **Do** 把顏色留給棋盤色塊，介面元件只用紙、淡鼠尾草、燕麥米和暖灰棕，強調色只用深森林綠。
- **Do** 桌面版規則維持直書旁註，頂端要和棋盤上緣對齊。
- **Do** 所有可點擊元素最矮 44px，焦點用 3px 深森林綠外框。
- **Do** 狀態不只靠顏色，例如衝突要同時有外框和斜紋。
- **Do** 實體觸感用底緣邊框厚度、按壓位移、邊框變化這類「紙卡被按下」的回饋。
- **Do** 重要時刻用「蓋章」語言收尾，讓盤面留在畫面上，不要用遮罩蓋住。
- **Do** 新增題目時在手機上確認相鄰色塊分得出來，必要時調整色塊順序。

### Don't:
- **Don't** 加入手遊風的花俏特效，例如金幣、爆炸、閃光、彩帶。
- **Don't** 做成科技風的深色霓虹，例如發光、光暈、高飽和螢光色。
- **Don't** 用純黑線條、厚重黑色陰影，或用全螢幕遮罩對話框蓋住盤面。
- **Don't** 讓刺蝟隨色塊或狀態換色，也不要在棋盤格內放紋理或插畫。
- **Don't** 引入需要建置的自訂字體或 CSS 框架。
