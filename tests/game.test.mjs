import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, COLORS, scoreGuess, validateHint, randomChoices } from '../game.mjs';

test('board contains 480 screenshot colors', () => {
  assert.equal(COLORS.length, 480);
  assert.ok(COLORS.every(color => /^#[a-f\d]{6}$/.test(color)));
});
test('scoring matches square rings, including diagonals and board edges', () => {
  const target = 8 * 30 + 15;
  for (let dr = -4; dr <= 4; dr++) for (let dc = -4; dc <= 4; dc++) {
    assert.equal(scoreGuess(target, target + dr * 30 + dc), Math.max(0, 3 - Math.max(Math.abs(dr), Math.abs(dc))));
  }
  assert.equal(scoreGuess(0, 31), 2); assert.equal(scoreGuess(0, 62), 1);
  assert.equal(scoreGuess(29, 30), 0); // adjacent indices wrap rows, not colors
  assert.equal(scoreGuess(0, -1), 0); assert.equal(scoreGuess(0, 480), 0);
});
test('hints support Unicode, whitespace, apostrophes and enforce both word limits', () => {
  assert.equal(validateHint('  sunshine  ', 1), 'sunshine');
  assert.equal(validateHint('夏天', 1), '夏天');
  assert.equal(validateHint("robin’s egg", 2), 'robin’s egg');
  assert.equal(validateHint('blue', 2), 'blue');
  for (const hint of ['', '   ', '!!!', 'blue sky', 'blue-green', 'a'.repeat(81), null]) assert.throws(() => validateHint(hint, 1));
  for (const hint of ['bright blue sky', 'bright/blue/sky', 'bright—blue—sky']) assert.throws(() => validateHint(hint, 2));
});
test('four random choices are distinct and visually spread out', () => {
  for (let i = 0; i < 100; i++) {
    const choices = randomChoices(); assert.equal(new Set(choices).size, 4);
    for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
      const rgb = cell => COLORS[cell].match(/\w\w/g).map(value => parseInt(value, 16));
      assert.ok(Math.hypot(...rgb(choices[a]).map((value, channel) => value - rgb(choices[b])[channel])) >= 105);
    }
  }
});
function choose(game) { const target = game.choices[0]; game.act(game.giver, { type: 'choose', cell: target }); return target; }
test('full round reveals only after two hints and guesses, scores once and swaps roles', () => {
  const game = new Game();
  assert.deepEqual(game.snapshot('B').choices, []);
  const target = choose(game);
  assert.equal(game.snapshot('B').target, null); assert.equal(game.snapshot('A').target, target);
  game.act('A', { type: 'hint', text: 'sunshine' });
  game.act('B', { type: 'guess', cell: target });
  assert.equal(game.stage, 'hint2'); assert.equal(game.snapshot('B').target, null);
  assert.deepEqual(game.scores, { A: 0, B: 0 });
  game.act('A', { type: 'hint', text: 'bright sunshine' });
  game.act('B', { type: 'guess', cell: target });
  assert.equal(game.stage, 'reveal'); assert.equal(game.snapshot('B').target, target);
  assert.deepEqual(game.result.points, [3, 3]); assert.equal(game.scores.B, 6);
  assert.throws(() => game.act('B', { type: 'guess', cell: target })); assert.equal(game.scores.B, 6);
  assert.equal(game.history.length, 1);
  game.act('A', { type: 'next' }); assert.equal(game.giver, 'B'); assert.equal(game.guesser, 'A'); assert.equal(game.round, 2); assert.equal(game.target, null);
  assert.deepEqual(game.snapshot('A').choices, []); assert.equal(game.scores.B, 6);
  game.act('B', { type: 'restart' }); assert.equal(game.round, 1); assert.equal(game.giver, 'A'); assert.deepEqual(game.scores, { A: 0, B: 0 }); assert.equal(game.history.length, 0);
});
test('illegal roles, stages and malformed guesses cannot advance the round', () => {
  const game = new Game();
  assert.throws(() => game.act('B', { type: 'choose', cell: game.choices[0] }));
  assert.throws(() => game.act('A', { type: 'next' }));
  assert.throws(() => game.act('A', { type: 'choose', cell: -1 }));
  choose(game);
  assert.throws(() => game.act('A', { type: 'reroll' }));
  assert.throws(() => game.act('B', { type: 'hint', text: 'red' }));
  assert.throws(() => game.act('A', { type: 'hint', text: 'two words' }));
  assert.equal(game.stage, 'hint1'); assert.equal(game.hints.length, 0);
  game.act('A', { type: 'hint', text: 'red' });
  for (const cell of [-1, 480, 1.5, '22', null]) assert.throws(() => game.act('B', { type: 'guess', cell }));
  assert.throws(() => game.act('A', { type: 'guess', cell: 22 }));
  assert.equal(game.stage, 'guess1');
});
