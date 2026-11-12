import test from 'node:test';
import assert from 'node:assert/strict';
import { NutshellGame } from '../games/nutshell.mjs';
import { QUESTIONS, QUESTION_BANKS } from '../games/nutshell-questions.mjs';
import { Room } from '../room.mjs';

function reveal(game, indices = [0]) { game.act(game.giver, {type:'reveal-words',indices}); }
function finish(game, answer = game.snapshot(game.giver).answer) { reveal(game); game.act(game.guesser, {type:'answer',text:answer}); }

test('50 original questions have usable answers, with no duplicate questions', () => {
  assert.equal(QUESTIONS.length, 50);
  assert.equal(QUESTION_BANKS.B.length, 50);
  assert.equal(new Set(QUESTION_BANKS.B.map(card => card.question)).size, 50);
  assert.ok(QUESTION_BANKS.B.every(card => card.answers.length && card.answers.every(answer => answer.trim())));
  assert.equal(new Set(QUESTIONS.map(card => card.question)).size, 50);
  assert.ok(QUESTIONS.every(card => card.question.split(/\s+/).length > 1 && card.answers.length && card.answers.every(answer => answer.trim())));
});
test('guesser receives only locked visible words and no answer until the reveal', () => {
  const game = new NutshellGame(), picker = game.snapshot('A');
  const hidden = game.snapshot('B');
  assert.ok(hidden.words.every(word => word === null)); assert.equal(hidden.answer, null); assert.equal(hidden.questionIndex, undefined);
  reveal(game, [1, 3]);
  const partial = game.snapshot('B');
  assert.deepEqual(partial.words, picker.words.map((word,i) => [1,3].includes(i) ? word : null));
  assert.equal(partial.answer, null); assert.equal(partial.result, null);
  game.act('B', {type:'answer',text:picker.answer});
  assert.deepEqual(game.snapshot('B').words, picker.words); assert.equal(game.snapshot('B').answer, picker.answer);
});
test('correct answer ignores case, spaces and punctuation and credits the Nut Picker once', () => {
  const game = new NutshellGame(), card = game.snapshot('A');
  reveal(game, [0,1]);
  game.act('B', {type:'answer',text:`  ${card.answer.toUpperCase()}!  `});
  assert.equal(game.result.correct, true); assert.equal(game.scores.A, card.words.length - 2); assert.equal(game.scores.B, 0);
  assert.throws(() => game.act('B', {type:'answer',text:card.answer}));
  assert.equal(game.history.length, 1);
  game.act('A', {type:'next'}); assert.equal(game.round, 2); assert.equal(game.giver, 'B'); assert.equal(game.guesser, 'A');
});
test('wrong answer scores zero and showing every word also scores zero', () => {
  const game = new NutshellGame(); finish(game, 'certainly not the answer');
  assert.equal(game.result.correct, false); assert.deepEqual(game.scores, {A:0,B:0});
  game.act('B', {type:'next'}); const card = game.snapshot('B');
  reveal(game, card.words.map((_,i) => i)); game.act('A', {type:'answer',text:card.answer});
  assert.equal(game.result.correct, true); assert.equal(game.result.points, 0);
});
test('roles, word selections, answer validation and locked selections are enforced', () => {
  const game = new NutshellGame();
  assert.throws(() => game.act('B', {type:'reveal-words',indices:[0]}));
  assert.throws(() => game.act('A', {type:'next'}));
  for (const indices of [[], [0,0], [-1], [500], [0.5], ['0'], null]) assert.throws(() => reveal(game, indices));
  assert.equal(game.stage, 'pick');
  reveal(game);
  assert.throws(() => reveal(game, [1]));
  assert.throws(() => game.act('A', {type:'answer',text:'something'}));
  for (const text of ['', '   ', '!!!', null, 'a'.repeat(121)]) assert.throws(() => game.act('B', {type:'answer',text}));
  assert.equal(game.stage, 'guess');
});
test('each guesser gets their own difficulty with no repeats until all 50 questions are used', () => {
  const game = new NutshellGame(), seen = { A: new Set(), B: new Set() };
  for (let i = 0; i < 100; i++) {
    const question = game.snapshot(game.giver).words.join(' ');
    assert.ok(QUESTION_BANKS[game.guesser].some(card => card.question === question));
    assert.ok(!seen[game.guesser].has(question));
    seen[game.guesser].add(question);
    finish(game); game.act(game.giver, {type:'next'});
  }
  assert.equal(seen.A.size, 50); assert.equal(seen.B.size, 50); assert.equal(game.round, 101); assert.equal(game.stage, 'pick');
  game.act('B', {type:'restart'});
  assert.equal(game.round, 1); assert.equal(game.giver, 'A'); assert.equal(game.stage, 'pick');
  assert.deepEqual(game.scores, {A:0,B:0}); assert.deepEqual(game.history, []); assert.equal(game.decks.B.length, 49); assert.equal(game.decks.A.length, 50);
});
test('Nutshell and Hues sessions resume independently and resetting one preserves the other', () => {
  const room = new Room();
  room.act('A', {type:'select-game',gameId:'hues-and-cues'});
  const hues = room.games.get('hues-and-cues'), target = hues.choices[0];
  room.act('A', {type:'choose',cell:target}); room.act('A', {type:'show-games'});
  room.act('B', {type:'select-game',gameId:'in-a-nutshell'});
  finish(room.games.get('in-a-nutshell'));
  const scores = {...room.snapshot('B').scores};
  room.act('B', {type:'show-games'}); room.act('A', {type:'select-game',gameId:'hues-and-cues'});
  assert.equal(room.snapshot('A').target, target); assert.equal(room.snapshot('A').stage, 'hint1');
  assert.throws(() => room.act('A', {type:'restart',gameId:'in-a-nutshell'}));
  room.act('A', {type:'restart'}); room.act('A', {type:'show-games'});
  room.act('A', {type:'select-game',gameId:'in-a-nutshell'});
  assert.deepEqual(room.snapshot('B').scores, scores); assert.equal(room.snapshot('B').stage, 'reveal');
  room.act('B', {type:'restart'}); assert.deepEqual(room.snapshot('A').scores, {A:0,B:0});
});
