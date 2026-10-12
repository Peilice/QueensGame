---
name: Queens 皇后解謎
description: 無廣告、免登入的 LinkedIn Queens 風格邏輯解謎，手機優先的紙上謎題本。
colors:
  paper: "#f6f3ee"
  card-white: "#ffffff"
  ink: "#22201c"
  pencil-gray: "#6b665d"
  ink-line: "#2a2723"
  grid-hairline: "rgba(42, 39, 35, 0.18)"
  board-frame: "#2a2723"
  card-edge: "rgba(42, 39, 35, 0.18)"
  ink-blue: "#3d5a80"
  ink-blue-text: "#ffffff"
  ink-blue-deep: "#2c4260"
  error-red: "#c62828"
  seal-cinnabar: "#a9443b"
  queen-ink: "#1f1d1a"
  region-rose: "#ec9496"
  region-sky: "#b5d4f0"
  region-sprout: "#c6e3ac"
  region-butter: "#f5da94"
  region-lilac: "#d2bfea"
  region-apricot: "#f7ac6a"
  region-mint: "#a6ddd2"
  region-blush: "#e8b5d4"
  region-stone: "#d4d3c4"
typography:
  headline:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
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
    fontSize: "1.15rem"
    fontWeight: 700
  label:
    fontFamily: "system-ui, -apple-system, \"Segoe UI\", \"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif"
    fontSize: "0.85rem"
    fontWeight: 400
rounded:
  board: "6px"
  control: "10px"
  card: "12px"
  pencil-ring: "8px"
  seal: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-primary:
    backgroundColor: "{colors.ink-blue}"
    textColor: "{colors.ink-blue-text}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "44px"
    width: "72px"
  level-tile:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  rules-card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    typography: "{typography.rules}"
    rounded: "{rounded.card}"
    padding: "14px 12px"
  win-seal:
    textColor: "{colors.seal-cinnabar}"
    rounded: "{rounded.seal}"
    size: "92px"
---

# Design System: Queens 皇后解謎

## Overview

**Creative North Star: "紙上謎題本"**

這套系統的意象是一本放在手邊的謎題小冊。米白紙底、墨色粗線、粉彩色塊，棋盤就是印在紙上的那一頁。所有介面都是這本冊子的延伸：按鈕和關卡格是夾在書頁間的小卡片，規則用直書排在頁邊，像書頁上的旁註。

畫面密度低，一次只做一件事。關卡列表就是一頁目錄，遊戲畫面就是一道題。棋盤佔據視覺重心，其他元素都退到旁邊。整體氣質安靜、溫和、有紙的質地，不搶玩家的注意力。

元件要有**實體觸感**，像桌遊配件，按下去要有回饋、有重量。按鈕和關卡格用加厚的底緣邊框表現紙卡厚度，按下時厚度壓扁、整張往下沉；格子按下時會閃一圈墨色內框，皇后落下時像蓋章一樣壓下去。明確拒絕兩個方向：手遊風的花俏特效（金幣、爆炸、閃光），以及科技風的深色霓虹。

**Key Characteristics:**
- 米白紙底配墨色線條，深色模式是「夜間閱讀的紙」，不是螢光螢幕。
- 九色粉彩色塊是唯一大面積的色彩來源。
- 墨藍是唯一的強調色，只用在主要動作、焦點環和已完成標記。
- 直書規則旁註是這套系統的招牌。
- 系統字體堆疊，沒有自訂字體，維持零建置。

## Colors

整體是低彩度的紙墨基調，色彩集中在棋盤的粉彩色塊上。

### Primary
- **墨藍 Ink Blue**：唯一的強調色。用在主要按鈕（「下一關」）、鍵盤焦點環、關卡列表上圈起「下一關」的虛線，以及已完成關卡的勾。深色模式會換成較亮的淡墨藍。

### Neutral
- **紙 Paper**：頁面底色，帶一點暖意的米白。
- **卡片白 Card White**：按鈕、關卡格、規則卡、過關卡的底色，是浮在紙上的一層。
- **墨 Ink**：主要文字。
- **鉛筆灰 Pencil Gray**：次要文字（關卡尺寸、操作提示）和 hover 時的邊框。
- **墨線 Ink Line**：色塊邊界的粗線，也是格子按下時的內框。
- **外框 Board Frame**：棋盤外框和過關時加粗的那一圈。淺色模式和墨線同色；深色模式改用暖灰 #77716a，因為外框疊在紙上而不是色塊上，跟著紙一起變暗就會消失。
- **格線 Grid Hairline**：格子之間的細線。
- **卡緣 Card Edge**：按鈕和關卡格的預設邊框（含加厚的底緣）。淺色模式和格線同值；深色模式改用 #45413c，讓紙卡的厚度在夜裡仍看得出來。
- **皇后墨 Queen Ink**：皇后圖示和 ✕ 標記。
- **印泥朱 Seal Cinnabar**：只用在過關印章。偏磚色、不鮮豔，像真的印泥；刻意和錯誤紅區隔，讓玩家不會把過關誤讀成錯誤。深色模式換成稍亮的 #c46a5c。
- **錯誤紅 Error Red**：衝突時的皇后顏色，以及 45° 斜紋的底色來源。

### Region Palette
九個色塊色依序是玫瑰、天空、新芽、奶油、丁香、杏、薄荷、腮紅、石。這些顏色要柔和，彼此之間要容易分辨。深色模式另有一組壓暗的版本（見 `style.css`），亮度降低，但色相順序維持一樣。

### Named Rules
**The One Ink Rule.** 墨藍是唯一的介面強調色，只能用在主要動作、焦點和完成狀態。唯一的例外是過關印章的印泥朱，它只出現在蓋章那一刻。

**The Regions Own Color Rule.** 大面積的色彩只屬於棋盤色塊。介面元件一律用紙、白、墨，不能跟色塊搶顏色。

**The Night Paper Rule.** 深色模式是調暗的紙，不是霓虹螢幕。不能加發光、光暈或高飽和的色彩。

## Typography

**Display / Body Font:** system-ui（fallback 依序為 -apple-system、Segoe UI、Noto Sans TC、PingFang TC、Microsoft JhengHei）

**Character:** 字體交給系統，讓中文在各平台都用最順眼的原生黑體。個性由排版方式表現，例如直書和字距，而不是靠自訂字體。

### Hierarchy
- **Headline**（700, 1.5rem, 字距 0.02em）：關卡列表頁的「Queens」標題。
- **Title**（700, 1.25rem）：遊戲頁置中的關卡標題，格式是「6×6 第 N 關」。過關卡的「過關！」是 1.75rem。
- **Pack Heading**（700, 1.15rem）：關卡列表裡各尺寸組的標題，例如「6×6」。
- **Body**（400, 1rem, 行高 1.5）：按鈕和一般文字。
- **Rules**（400, 1rem, 行高 1.8, 字距 0.05em, 直書 vertical-rl）：規則旁註。桌面放大到 1.05rem，操作提示縮成 0.9rem 鉛筆灰。
- **Label**（400, 0.85rem, 鉛筆灰）：尺寸組標題右側的進度，例如「已完成 3 / 10」。關卡格裡只有編號，700、1.5rem。

### Named Rules
**The Marginalia Rule.** 規則一律直書、由右往左換行，像書頁旁註。手機版收成棋盤下方一張可翻開的「規則」頁邊籤，還沒破過任何一關時預設展開；桌面版一律展開，放在棋盤右側，頂端和棋盤上緣對齊。

## Layout

單欄、置中，以手機為主。內容最寬 560px，左右留 16px，底部預留 safe-area。

- **遊戲頁（手機）**：由上到下依序是棋盤、操作按鈕、規則頁邊籤，最常按的「上一步」落在拇指好按的位置。棋盤寬度是 `min(100%, 520px)`，維持正方形。
- **遊戲頁（≥760px）**：內容最寬 760px，改成兩欄 grid（520px 棋盤 + 自動寬度規則），欄距 16px。操作按鈕在棋盤下方，規則高 520px，和棋盤同列、頂端對齊。
- **關卡列表**：關卡依棋盤尺寸分成 6×6、7×7、8×8、9×9 四組，每組 10 關。每組的標題列左邊是尺寸、右邊是進度，下方間距 10px。關卡格是固定 5 欄的 grid（每組剛好兩列），間距 10px，每格是正方形。組與組之間相隔 28px。
- **間距節奏**：8 / 12 / 16 / 24px。頂部標題列最矮 48px，下方間距 12px。

## Elevation & Depth

紙面基本上是平的。層次主要靠「白卡片疊在米白紙上」的色調差和 1.5px 細邊框表現。系統裡沒有任何投影。厚度用加厚的底緣邊框表現，過關時棋盤外框用 2px 墨線再加粗一圈。

**The Flat Page Rule.** 書頁上的東西都是平的，不用投影。實體觸感一律用底緣邊框厚度、按壓位移和邊框加深來表現。

## Shapes

圓角溫和，而且依元件大小遞增：棋盤 6px，按鈕 10px，關卡格和規則卡 12px，印章是正圓。關卡格內側的鉛筆圈用 8px，和卡片圓角同心。棋盤外框是 2px 墨線，色塊邊界是 1.5px 墨線，疊在格子上、不影響格子尺寸。格子之間是 0.5px 的內陰影細線。

## Components

### Buttons
- **Shape:** 溫和圓角（10px），最矮 44px，左右 padding 18px。
- **Default:** 白底、墨字、1.5px 格線邊框。操作列的按鈕最窄 108px。
- **Primary:** 墨藍底、白字，只用在過關卡的「下一關」。
- **Ghost:** 透明、無邊框、寬 72px、文字靠左，用在「‹ 關卡」返回鍵。
- **Press:** 底緣邊框 3.5px 是紙卡厚度；按下時變成 1.5px、整張下沉 2px，邊框加深為鉛筆灰（主要按鈕用深墨藍）。關卡格也一樣。
- **Hover / Focus:** hover 時邊框加深為鉛筆灰。焦點是 3px 墨藍外框，偏移 2px。disabled 時透明度 0.4。

### Level Pack
- 一個尺寸一組：粗體尺寸標題（如「6×6」）配鉛筆灰的「已完成 n / 10」，下面接 5 欄關卡格。各組獨立解鎖。

### Level Tile
- 正方形白卡、12px 圓角，中間只有大號粗體編號。尺寸由所屬的組表示，不寫在格子裡。
- 已完成：退到背景。一般紙卡邊緣，編號改成鉛筆灰，右上角一個 14px 墨藍線條勾。
- 下一關：每組最前面還沒破的那一關，卡片內側 5px 處多一圈 2px 墨藍虛線，像用筆在目錄上圈起來；卡片本身的邊框和厚度不變。這是列表上唯一該按的那一格，所以視覺權重最高。
- 玩到一半：有存檔盤面的關卡，底部中央一個 6px 鉛筆點。
- 未解鎖：透明度 0.35，右上角一個 14px 線條鎖頭，不能點。
- 右上角的勾和鎖頭是同一套線條圖示（stroke 2.5、圓角端點），位置相同。

### Board（招牌元件）
- 印在紙上的謎題頁：粉彩色塊、0.5px 格線、1.5px 色塊邊界、2px 外框。
- ✕ 標記是 34% 大小的細描邊，不透明度淺色 60%、深色 75%（深色色塊較暗，60% 會不夠清楚）。皇后是 58% 大小的實心皇冠。
- 衝突時，格子蓋上錯誤紅 45° 斜紋（`--danger` 的 30%，兩種模式各自跟著錯誤紅變化），皇后變成錯誤紅並加一圈皇后墨描邊。描邊讓皇冠在任何色塊上都有足夠的明暗對比，紅色和斜紋負責表示衝突，不只靠顏色。
- 過關後盤面鎖定，游標恢復預設。

### Rules Card
- 手機版是 `<details>` 頁邊籤：鉛筆灰的「規則」加上會轉 90° 的箭頭，展開後是白底、12px 圓角的直書旁註。桌面版不顯示開關。手機高 10.5em，桌面高 520px。重點字用粗體，操作提示用鉛筆灰小字。

### Win Stamp（過關）
- 不用對話框，盤面留在原地。皇后由上而下依序「蓋印」（壓到 0.72 倍再回彈，每顆間隔 90ms），棋盤外框加粗一圈墨線。
- 接著操作列換成過關面板：左邊是標題「過關！」（1.15rem）加「下一關／回關卡列表」，靠左對齊。一組的最後一關完成時，標題改成「N×N 全部完成！」，主要按鈕變成「挑戰 7×7」，最後一組則只留「回關卡列表」。
- 最後在面板右側的頁邊蓋上一枚印泥朱的圓形印章「過關」：直徑 84px、3px 外圈加 1px 內圈、旋轉 -14°、1.25rem 粗體，從 1.8 倍壓下。印章有自己的 grid 欄位，右緣和棋盤右緣對齊，永遠不壓到棋盤上的解或按鈕，像老師把章蓋在考卷的頁邊。淺色模式用 multiply 混色，像真的墨印在紙上。
- reduced-motion 時沒有動畫，印章和面板立即出現。

## Do's and Don'ts

### Do:
- **Do** 把顏色留給棋盤色塊，介面元件只用紙、白、墨，強調色只用墨藍。
- **Do** 規則維持直書旁註，桌面版頂端要和棋盤上緣對齊。
- **Do** 所有可點擊元素最矮 44px，焦點用 3px 墨藍外框。
- **Do** 狀態不只靠顏色，例如衝突要加斜紋。
- **Do** 實體觸感用底緣邊框厚度、按壓位移、邊框變化這類「紙卡被按下」的回饋。
- **Do** 重要時刻用「蓋章」語言收尾，讓盤面留在畫面上，不要用遮罩蓋住。
- **Do** 深色模式和淺色模式同步調整，每個色票都要有對應的深色值。

### Don't:
- **Don't** 加入手遊風的花俏特效，例如金幣、爆炸、閃光、彩帶。
- **Don't** 做成科技風的深色霓虹，例如發光、光暈、高飽和螢光色。
- **Don't** 加投影或用全螢幕遮罩對話框蓋住盤面。
- **Don't** 引入需要建置的自訂字體或 CSS 框架。
