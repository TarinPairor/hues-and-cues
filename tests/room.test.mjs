import test from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../room.mjs';

test('room opens on the shelf and rejects game actions before selection', () => {
  const room = new Room();
  assert.equal(room.snapshot('A').activeGame, null);
  assert.deepEqual(room.snapshot('A').savedGames, []);
  assert.throws(() => room.act('A', {type:'select-game',gameId:'missing'}), /Choose a game/);
  assert.throws(() => room.act('A', {type:'hint',text:'red'}), /Choose a minigame/);
  assert.equal(room.games.size, 0);
});

test('both players follow selection, retain private state and resume the same round and scores', () => {
  const room = new Room();
  room.act('B', {type:'select-game',gameId:'hues-and-cues'});
  const game = room.games.get('hues-and-cues'), target = game.choices[0];
  assert.equal(room.snapshot('A').activeGame, 'hues-and-cues');
  assert.equal(room.snapshot('B').activeGame, 'hues-and-cues');
  room.act('A', {type:'choose',cell:target});
  assert.equal(room.snapshot('B').target, null);
  assert.deepEqual(room.snapshot('B').choices, []);
  room.act('A', {type:'hint',text:'red'});
  room.act('B', {type:'guess',cell:target});
  room.act('A', {type:'hint',text:'bright red'});
  room.act('B', {type:'guess',cell:target});
  room.act('B', {type:'show-games'});
  assert.equal(room.snapshot('A').activeGame, null);
  assert.equal(room.snapshot('B').target, undefined);
  assert.deepEqual(room.snapshot('A').savedGames, ['hues-and-cues']);
  assert.throws(() => room.act('B', {type:'restart'}), /Choose a minigame/);
  room.act('A', {type:'select-game',gameId:'hues-and-cues'});
  assert.equal(room.games.get('hues-and-cues'), game);
  assert.equal(room.snapshot('B').scores.B, 6);
  assert.equal(room.snapshot('B').stage, 'reveal');
  assert.throws(() => room.act('A', {type:'restart',gameId:'another-game'}), /another game/);
});
