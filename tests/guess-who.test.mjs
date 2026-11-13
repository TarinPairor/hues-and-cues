import test from 'node:test';
import assert from 'node:assert/strict';
import { GuessWhoGame } from '../games/guess-who.mjs';
import { CHARACTERS, portrait, characterTraits } from '../public/games/guess-who-characters.js';
import { Room } from '../room.mjs';
const choose = game => {
  game.act('A',{type:'choose-character',characterId:'elon-musk'});
  game.act('B',{type:'choose-character',characterId:'jojo-siwa'});
};

test('24 public figures have real photo URLs, source credits, and requested roster entries', () => {
  assert.equal(CHARACTERS.length,24); assert.equal(new Set(CHARACTERS.map(c => c.id)).size,24);
  for (const id of ['jeffrey-epstein','elon-musk','donald-trump','jensen-huang','diddy','jojo-siwa']) assert.ok(CHARACTERS.some(character => character.id === id));
  for (const character of CHARACTERS) { assert.match(portrait(character), /<img/); assert.ok(characterTraits(character)); assert.match(character.photo, /^https:\/\/upload\.wikimedia\.org\//); assert.ok(character.author); assert.ok(character.license); assert.ok(character.source); assert.ok(character.licenseUrl); }
});
test('both secrets lock before play and only the owner sees their character', () => {
  const game = new GuessWhoGame();
  game.act('A',{type:'choose-character',characterId:'elon-musk'});
  assert.equal(game.stage,'choose');
  assert.equal(game.snapshot('A').secret,'elon-musk'); assert.equal(game.snapshot('B').secret,null);
  assert.equal(game.snapshot('B').secrets,null); assert.deepEqual(game.snapshot('B').ready,{A:true,B:false});
  assert.throws(() => game.act('A',{type:'choose-character',characterId:'donald-trump'}));
  assert.throws(() => game.act('A',{type:'ask-question',text:'Glasses?'}));
  game.act('B',{type:'choose-character',characterId:'jojo-siwa'});
  assert.equal(game.stage,'ask'); assert.equal(game.turn,'A');
  assert.equal(game.snapshot('A').secrets,null); assert.equal(game.snapshot('B').secret,'jojo-siwa');
});
test('question and answer turns alternate and eliminations stay private and reversible', () => {
  const game = new GuessWhoGame(); choose(game);
  game.act('B',{type:'toggle-character',characterId:'jensen-huang'});
  assert.deepEqual(game.snapshot('B').eliminated,['jensen-huang']); assert.deepEqual(game.snapshot('A').eliminated,[]);
  game.act('A',{type:'ask-question',text:'  Do they wear glasses?  '});
  assert.equal(game.stage,'answer'); assert.equal(game.snapshot('B').pending.text,'Do they wear glasses?');
  assert.throws(() => game.act('A',{type:'answer-question',answer:true}));
  assert.throws(() => game.act('B',{type:'answer-question',answer:'yes'}));
  assert.throws(() => game.act('A',{type:'guess-character',characterId:'jojo-siwa'}));
  game.act('B',{type:'answer-question',answer:false});
  assert.equal(game.turn,'B'); assert.equal(game.stage,'ask'); assert.equal(game.pending,null);
  assert.deepEqual(game.questions,[{asker:'A',text:'Do they wear glasses?',answer:false}]);
  game.act('B',{type:'toggle-character',characterId:'jensen-huang'}); assert.deepEqual(game.snapshot('B').eliminated,[]);
  game.act('B',{type:'ask-question',text:'Do they have black hair?'});
  game.act('A',{type:'answer-question',answer:true}); assert.equal(game.turn,'A');
});
test('a correct final guess reveals both secrets, scores exactly once, and alternates the starter', () => {
  const game = new GuessWhoGame(); choose(game);
  assert.throws(() => game.act('B',{type:'guess-character',characterId:'elon-musk'}));
  game.act('A',{type:'guess-character',characterId:'jojo-siwa'});
  assert.equal(game.stage,'reveal'); assert.equal(game.result.correct,true); assert.equal(game.result.winner,'A');
  assert.deepEqual(game.scores,{A:1,B:0}); assert.deepEqual(game.snapshot('B').secrets,{A:'elon-musk',B:'jojo-siwa'});
  assert.throws(() => game.act('A',{type:'guess-character',characterId:'jojo-siwa'})); assert.equal(game.scores.A,1);
  game.act('B',{type:'next'}); assert.equal(game.round,2); assert.equal(game.turn,'B'); assert.equal(game.stage,'choose');
  assert.deepEqual(game.secrets,{A:null,B:null}); assert.equal(game.questions.length,0); assert.equal(game.history.length,1);
});
test('a wrong final guess awards the opponent and reset clears only this game state', () => {
  const game = new GuessWhoGame(); choose(game);
  game.act('A',{type:'guess-character',characterId:'donald-trump'});
  assert.equal(game.result.correct,false); assert.equal(game.result.winner,'B'); assert.deepEqual(game.scores,{A:0,B:1});
  game.act('B',{type:'restart'});
  assert.equal(game.stage,'choose'); assert.equal(game.round,1); assert.equal(game.turn,'A');
  assert.deepEqual(game.scores,{A:0,B:0}); assert.deepEqual(game.history,[]); assert.deepEqual(game.snapshot('A').eliminated,[]);
});
test('invalid characters, questions and stages cannot change the round', () => {
  const game = new GuessWhoGame();
  assert.throws(() => game.act('A',{type:'choose-character',characterId:'missing'}));
  assert.throws(() => game.act('A',{type:'toggle-character',characterId:'elon-musk'}));
  assert.throws(() => game.act('A',{type:'next'})); choose(game);
  for (const text of ['', '   ', null, 'a'.repeat(161)]) assert.throws(() => game.act('A',{type:'ask-question',text}));
  assert.throws(() => game.act('B',{type:'ask-question',text:'A hat?'}));
  assert.throws(() => game.act('A',{type:'guess-character',characterId:'missing'}));
  assert.equal(game.stage,'ask'); assert.deepEqual(game.scores,{A:0,B:0});
});
test('Guess Who resumes its secrets and private board independently of other games', () => {
  const room = new Room(); room.act('A',{type:'select-game',gameId:'guess-who'});
  room.act('A',{type:'choose-character',characterId:'elon-musk'}); room.act('B',{type:'choose-character',characterId:'jojo-siwa'});
  room.act('A',{type:'toggle-character',characterId:'donald-trump'}); room.act('A',{type:'ask-question',text:'A hat?'});
  room.act('A',{type:'show-games'}); room.act('B',{type:'select-game',gameId:'hues-and-cues'});
  room.act('A',{type:'restart'}); room.act('B',{type:'show-games'}); room.act('B',{type:'select-game',gameId:'guess-who'});
  assert.equal(room.snapshot('A').secret,'elon-musk'); assert.deepEqual(room.snapshot('A').eliminated,['donald-trump']);
  assert.equal(room.snapshot('B').secret,'jojo-siwa'); assert.deepEqual(room.snapshot('B').eliminated,[]);
  assert.equal(room.snapshot('B').stage,'answer'); assert.equal(room.snapshot('B').pending.text,'A hat?');
  assert.throws(() => room.act('A',{type:'restart',gameId:'in-a-nutshell'}));
});
