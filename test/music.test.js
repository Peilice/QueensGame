import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHORDS, climb, notesIn, planBar, hz } from '../src/music.js';

test('音樂沒在播時，過關音階和原本一樣是從 C5 起的五聲音階', () => {
  const freqs = climb(CHORDS[0], 10).map((m) => Math.round(hz(m) * 100) / 100);
  assert.deepEqual(freqs, [523.25, 587.33, 659.26, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760]);
});

test('過關音階從和弦的根音起跳、一路往上，9×9 的九隻刺蝟也夠用', () => {
  for (const chord of CHORDS) {
    const notes = climb(chord, 9);
    assert.equal(notes.length, 9, chord.name);
    assert.equal(notes[0] % 12, chord.root, chord.name);
    for (let i = 1; i < notes.length; i++) assert.ok(notes[i] > notes[i - 1], chord.name);
    for (const m of notes) assert.ok(chord.pc.includes(m % 12), `${chord.name} 的 ${m} 不在五聲音階裡`);
  }
});

test('旋律只用和弦自己的五聲音階，第一拍落在和弦內音', () => {
  let seed = 1;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let last = null;
  for (let round = 0; round < 50; round++) {
    for (const chord of CHORDS) {
      const { plan, last: next } = planBar(chord, [0, 2, 3, 4, 6], last, false, random);
      assert.deepEqual([...plan.keys()], [0, 2, 3, 4, 6]);
      for (const m of plan.values()) assert.ok(chord.pc.includes(m % 12), `${chord.name} 的 ${m} 不在五聲音階裡`);
      assert.ok([chord.root, chord.pc[1], chord.pc[2]].includes(plan.get(0) % 12), `${chord.name} 第一拍不是和弦內音`);
      last = next;
    }
  }
});

test('標記中旋律只留第 1、3 拍', () => {
  const { plan } = planBar(CHORDS[0], [0, 1, 2, 4, 6, 7], null, true);
  assert.deepEqual([...plan.keys()], [0, 4]);
});

test('notesIn 只挑音名在音階裡的音', () => {
  assert.deepEqual(notesIn([0, 4, 7], 60, 72), [60, 64, 67, 72]);
});
