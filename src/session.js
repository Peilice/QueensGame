// 一局：拼圖的一片（固定題）、隨機題、教學三種，同一時間只會有一局。
// 這裡決定網址要打開什麼、每一步之後存什麼、有沒有多出新的衝突、過關後下一步去哪；
// 畫面怎麼畫、聲音怎麼響交給 main.js。
import { parsePuzzle, findConflicts } from './rules.js';
import { Game } from './game.js';
import { PUZZLES } from './puzzles.js';
import { PICTURES } from './pictures.js';
import * as album from './album.js';
import { generate, newSeed } from './generator.js';
import * as storage from './storage.js';
import { LESSON, STEPS, currentStep } from './tutorial.js';

export const levelId = (size, index) => `${size}-${index + 1}`;
// 隨機題的網址：r 加尺寸再加 base36 的種子，例如 r7-1k2f9x；同一個網址永遠是同一題
export const randomId = (size, seed) => `r${size}-${seed.toString(36)}`;

const SIZES = Object.keys(PICTURES).map(Number);

/** 某尺寸已破關的題目編號集合 */
export function solvedIn(size, solved = storage.getSolved()) {
  return new Set(PUZZLES[size].flatMap((_, i) => (solved.has(levelId(size, i)) ? [i] : [])));
}

/** 某尺寸存著盤面、玩到一半的題目編號集合 */
export function startedIn(size, boards = storage.getBoards()) {
  return new Set(PUZZLES[size].flatMap((_, i) => (boards[levelId(size, i)]?.some((v) => v !== 0) ? [i] : [])));
}

/**
 * 網址 → 要打開什麼。#6-3 是 6×6 第 3 題（在哪一幅的第幾片由 src/pictures.js 決定），#r6-xxxx 是隨機題，
 * #learn 是教學，#tips 是解題技巧；列表分兩頁：空白是「拼圖」，#random 是「隨機難度」。
 * 回傳 { view: 'tips' }、{ view: 'list', tab, invalid } 或 { view: 'game', target }；
 * invalid 代表網址指到不能玩的地方（例如別人分享的、還沒打開的那一幅），該把網址清掉。
 */
export function resolve(hash) {
  if (hash === '#tips') return { view: 'tips' };
  if (hash === '#learn') return { view: 'game', target: { kind: 'lesson' } };
  if (hash === '#random') return { view: 'list', tab: 'random', invalid: false };
  const [, rSize, rSeed] = hash.match(/^#r(\d+)-([0-9a-z]{1,7})$/) ?? [];
  const seed = parseInt(rSeed, 36);
  if (PUZZLES[rSize] && seed < 2 ** 32) return { view: 'game', target: { kind: 'random', size: Number(rSize), seed } };
  const [, n, k] = hash.match(/^#(\d+)-(\d+)$/) ?? [];
  const size = Number(n), index = k - 1;
  // 拼圖一次開一幅：還沒打開的那幅裡的題，退回列表
  if (PUZZLES[size] && index >= 0 && index < PUZZLES[size].length && album.canPlay(size, index, solvedIn(size), startedIn(size))) {
    return { view: 'game', target: { kind: 'level', size, index } };
  }
  return { view: 'list', tab: 'levels', invalid: hash !== '' };
}

/** 某尺寸接下來該拼的那一片的網址 id：最前面一幅沒拼完的裡面挑一片；整本拼完了回傳 null */
function nextPieceIn(size) {
  const solved = solvedIn(size);
  const started = startedIn(size);
  const index = album.nextPiece(size, album.currentPicture(size, solved, started), solved, started);
  return index === null ? null : levelId(size, index);
}

/**
 * 過關面板要寫什麼、主要按鈕去哪：
 * { title, seal, list, next: { label, hash } | null, note?, piece?: { size, picture, slot }, landed?: { size, index } }
 * piece 是面板上剛拿到的那一片，landed 是回到列表時要飛進拼圖的那一片。
 */
function levelWin(size, index) {
  const solved = solvedIn(size);
  const started = startedIn(size);
  const { picture, slot } = album.locate(size, index);
  const per = album.piecesOf(size);
  const got = album.progress(size, picture, solved);
  const base = {
    seal: '過關',
    list: '看拼圖',
    piece: { size, picture, slot },
    landed: { size, index },
    note: `第 ${slot + 1} 片拼上去了・${got} / ${per}`,
  };
  // 這一幅還沒拼完 → 下一片；拼完了 → 下一幅；整本拼完 → 挑戰下一個尺寸，最大的尺寸也拼完了就來隨機題
  if (got < per) {
    return { ...base, title: '過關！', next: { label: '下一片', hash: levelId(size, album.nextPiece(size, picture, solved, started)) } };
  }
  const next = nextPieceIn(size);
  if (next) return { ...base, title: `「${PICTURES[size][picture].title}」拼好了！`, seal: '拼好', next: { label: '下一幅', hash: next } };
  const nextSize = SIZES.find((s) => s > size && nextPieceIn(s));
  return {
    ...base,
    title: `${size}×${size} 全部拼好了！`,
    seal: '拼好',
    next: nextSize
      ? { label: `挑戰 ${nextSize}×${nextSize}`, hash: nextPieceIn(nextSize) }
      : { label: `隨機 ${size}×${size}`, hash: randomId(size, newSeed()) },
  };
}

/** 教學做完：直接帶去最小一本還沒拼完的拼圖，挑一片開始 */
function lessonWin() {
  const size = SIZES.find((s) => nextPieceIn(s));
  const fresh = storage.getSolved().size === 0;
  return {
    title: '學會了！',
    seal: '學會',
    list: '回列表',
    next: size ? { label: fresh ? '去拼第一片' : '去拼下一片', hash: nextPieceIn(size) } : null,
  };
}

/** 打開一局：target 是 resolve() 給的 { kind: 'level', size, index }、{ kind: 'random', size, seed } 或 { kind: 'lesson' } */
export function open(target) {
  return new Session(target);
}

class Session {
  #conflicts;
  #step = 0;

  constructor(target) {
    this.target = target;
    this.kind = target.kind;
    this.kicker = '';
    if (target.kind === 'level') {
      const { size, index } = target;
      const id = levelId(size, index);
      this.game = new Game(parsePuzzle(PUZZLES[size][index]), storage.getBoard(id), storage.getTrial(id));
      // 標題寫這是哪一幅的第幾片；幅名放在上面一行小字
      const { picture, slot } = album.locate(size, index);
      this.title = `第 ${slot + 1} 片`;
      this.kicker = PICTURES[size][picture].title;
    } else if (target.kind === 'random') {
      // 當場依種子出題。存著的盤面是同一個種子才接著玩，別人分享的網址從空盤開始
      const { size, seed } = target;
      const saved = storage.getRandom(size);
      this.game = new Game(parsePuzzle(generate(size, seed)), ...(saved?.seed === seed ? [saved.board, saved.trial] : []));
      this.title = `隨機 ${size}×${size}`;
    } else {
      // 教學不存盤面，每次都從頭開始
      this.game = new Game(parsePuzzle(LESSON));
      this.title = '怎麼玩';
    }
    this.#conflicts = this.#conflictCount();
  }

  #conflictCount() {
    return findConflicts(this.game.puzzle, this.game.board).size;
  }

  /** 教學中這一步的引導（STEPS 的一項：text、要亮的格子、要按的按鈕）；不是教學或已經過關則為 null */
  get hint() {
    return this.kind === 'lesson' && !this.game.solved ? STEPS[this.#step] : null;
  }

  /**
   * 盤面動過之後呼叫一次：存檔、教學往下一步、判斷過關。
   * 回傳 { conflict, win }：conflict 是這一步放下去刺到別人、多出新的衝突（過關的那一下不算）；
   * win 是過關面板的內容（見 levelWin），沒過關則為 null。
   */
  move() {
    const count = this.#conflictCount();
    const conflict = count > this.#conflicts && !this.game.solved;
    this.#conflicts = count;
    return { conflict, win: this.#settle() };
  }

  #settle() {
    const { game, target } = this;
    if (this.kind === 'lesson') {
      if (game.solved) return lessonWin();
      this.#step = currentStep(game.puzzle, game.board, this.#step, game.trial);
      return null;
    }
    if (this.kind === 'random') {
      const { size, seed } = target;
      if (!game.solved) {
        storage.saveRandom(size, seed, game.board, game.trial);
        return null;
      }
      storage.markRandomSolved(size);
      return { title: '過關！', seal: '過關', list: '回列表', next: { label: '再來一題', hash: randomId(size, newSeed()) } };
    }
    const id = levelId(target.size, target.index);
    if (!game.solved) {
      storage.saveBoard(id, game.board, game.trial);
      return null;
    }
    storage.markSolved(id);
    return levelWin(target.size, target.index);
  }

  /** 隨機題換一題：放掉這一盤，回傳同尺寸新題的網址 id */
  shuffle() {
    storage.clearRandom(this.target.size);
    return randomId(this.target.size, newSeed());
  }
}
