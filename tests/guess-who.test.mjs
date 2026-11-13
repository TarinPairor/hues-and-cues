import test from 'node:test';
import assert from 'node:assert/strict';
import { GuessWhoGame } from '../games/guess-who.mjs';
import { CHARACTERS, portrait, characterTraits } from '../public/games/guess-who-characters.js';
import { Room } from '../room.mjs';
const choose = game => {
  game.act('A',{type:'choose-character',characterId:'alex'});
  game.act('B',{type:'choose-character',characterId:'zoe'});
};

test('24 distinct original characters have matching portrait and trait data', () => {
  assert.equal(CHARACTERS.length,24); assert.equal(new Set(CHARACTERS.map(c => c.id)).size,24);
  assert.equal(new Set(CHARACTERS.map(({id,name,...traits}) => JSON.stringify(traits))).size,24);
  for (const character of CHARACTERS) { assert.match(portrait(character), /<svg/); assert.ok(characterTraits(character)); }
});
test('both secrets lock before play and only the owner sees their character', () => {
  const game = new GuessWhoGame();
  game.act('A',{type:'choose-character',characterId:'alex'});
  assert.equal(game.stage,'choose');
  assert.equal(game.snapshot('A').secret,'alex'); assert.equal(game.snapshot('B').secret,null);
  assert.equal(game.snapshot('B').secrets,null); assert.deepEqual(game.snapshot('B').ready,{A:true,B:false});
  assert.throws(() => game.act('A',{type:'choose-character',characterId:'bea'}));
  assert.throws(() => game.act('A',{type:'ask-question',text:'Glasses?'}));
  game.act('B',{type:'choose-character',characterId:'zoe'});
  assert.equal(game.stage,'ask'); assert.equal(game.turn,'A');
  assert.equal(game.snapshot('A').secrets,null); assert.equal(game.snapshot('B').secret,'zoe');
});
test('question and answer turns alternate and eliminations stay private and reversible', () => {
  const game = new GuessWhoGame(); choose(game);
  game.act('B',{type:'toggle-character',characterId:'cleo'});
  assert.deepEqual(game.snapshot('B').eliminated,['cleo']); assert.deepEqual(game.snapshot('A').eliminated,[]);
  game.act('A',{type:'ask-question',text:'  Do they wear glasses?  '});
  assert.equal(game.stage,'answer'); assert.equal(game.snapshot('B').pending.text,'Do they wear glasses?');
  assert.throws(() => game.act('A',{type:'answer-question',answer:true}));
  assert.throws(() => game.act('B',{type:'answer-question',answer:'yes'}));
  assert.throws(() => game.act('A',{type:'guess-character',characterId:'zoe'}));
  game.act('B',{type:'answer-question',answer:false});
  assert.equal(game.turn,'B'); assert.equal(game.stage,'ask'); assert.equal(game.pending,null);
  assert.deepEqual(game.questions,[{asker:'A',text:'Do they wear glasses?',answer:false}]);
  game.act('B',{type:'toggle-character',characterId:'cleo'}); assert.deepEqual(game.snapshot('B').eliminated,[]);
  game.act('B',{type:'ask-question',text:'Do they have black hair?'});
  game.act('A',{type:'answer-question',answer:true}); assert.equal(game.turn,'A');
});
test('a correct final guess reveals both secrets, scores exactly once, and alternates the starter', () => {
  const game = new GuessWhoGame(); choose(game);
  assert.throws(() => game.act('B',{type:'guess-character',characterId:'alex'}));
  game.act('A',{type:'guess-character',characterId:'zoe'});
  assert.equal(game.stage,'reveal'); assert.equal(game.result.correct,true); assert.equal(game.result.winner,'A');
  assert.deepEqual(game.scores,{A:1,B:0}); assert.deepEqual(game.snapshot('B').secrets,{A:'alex',B:'zoe'});
  assert.throws(() => game.act('A',{type:'guess-character',characterId:'zoe'})); assert.equal(game.scores.A,1);
  game.act('B',{type:'next'}); assert.equal(game.round,2); assert.equal(game.turn,'B'); assert.equal(game.stage,'choose');
  assert.deepEqual(game.secrets,{A:null,B:null}); assert.equal(game.questions.length,0); assert.equal(game.history.length,1);
});
test('a wrong final guess awards the opponent and reset clears only this game state', () => {
  const game = new GuessWhoGame(); choose(game);
  game.act('A',{type:'guess-character',characterId:'bea'});
  assert.equal(game.result.correct,false); assert.equal(game.result.winner,'B'); assert.deepEqual(game.scores,{A:0,B:1});
  game.act('B',{type:'restart'});
  assert.equal(game.stage,'choose'); assert.equal(game.round,1); assert.equal(game.turn,'A');
  assert.deepEqual(game.scores,{A:0,B:0}); assert.deepEqual(game.history,[]); assert.deepEqual(game.snapshot('A').eliminated,[]);
});
test('invalid characters, questions and stages cannot change the round', () => {
  const game = new GuessWhoGame();
  assert.throws(() => game.act('A',{type:'choose-character',characterId:'missing'}));
  assert.throws(() => game.act('A',{type:'toggle-character',characterId:'alex'}));
  assert.throws(() => game.act('A',{type:'next'})); choose(game);
  for (const text of ['', '   ', null, 'a'.repeat(161)]) assert.throws(() => game.act('A',{type:'ask-question',text}));
  assert.throws(() => game.act('B',{type:'ask-question',text:'A hat?'}));
  assert.throws(() => game.act('A',{type:'guess-character',characterId:'missing'}));
  assert.equal(game.stage,'ask'); assert.deepEqual(game.scores,{A:0,B:0});
});
test('Guess Who resumes its secrets and private board independently of other games', () => {
  const room = new Room(); room.act('A',{type:'select-game',gameId:'guess-who'});
  room.act('A',{type:'choose-character',characterId:'alex'}); room.act('B',{type:'choose-character',characterId:'zoe'});
  room.act('A',{type:'toggle-character',characterId:'bea'}); room.act('A',{type:'ask-question',text:'A hat?'});
  room.act('A',{type:'show-games'}); room.act('B',{type:'select-game',gameId:'hues-and-cues'});
  room.act('A',{type:'restart'}); room.act('B',{type:'show-games'}); room.act('B',{type:'select-game',gameId:'guess-who'});
  assert.equal(room.snapshot('A').secret,'alex'); assert.deepEqual(room.snapshot('A').eliminated,['bea']);
  assert.equal(room.snapshot('B').secret,'zoe'); assert.deepEqual(room.snapshot('B').eliminated,[]);
  assert.equal(room.snapshot('B').stage,'answer'); assert.equal(room.snapshot('B').pending.text,'A hat?');
  assert.throws(() => room.act('A',{type:'restart',gameId:'in-a-nutshell'}));
});
