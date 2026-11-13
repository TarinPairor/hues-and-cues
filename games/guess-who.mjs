import { characterById } from '../public/games/guess-who-characters.js';
const other = seat => seat === 'A' ? 'B' : 'A';
export class GuessWhoGame {
  constructor() { this.restart(); }
  restart() { this.scores = {A:0,B:0}; this.round = 1; this.history = []; this.begin(); }
  begin() {
    this.stage = 'choose'; this.turn = this.round % 2 ? 'A' : 'B';
    this.secrets = {A:null,B:null}; this.eliminated = {A:new Set(),B:new Set()};
    this.pending = null; this.questions = []; this.result = null;
  }
  act(seat, message) {
    if (message.type === 'restart') { this.restart(); return; }
    if (message.type === 'next') {
      if (this.stage !== 'reveal') throw new Error('Finish this round first.');
      this.round++; this.begin(); return;
    }
    if (message.type === 'choose-character') {
      if (this.stage !== 'choose' || this.secrets[seat]) throw new Error('Your character is already locked.');
      if (!characterById(message.characterId)) throw new Error('Choose a character from the board.');
      this.secrets[seat] = message.characterId;
      if (this.secrets.A && this.secrets.B) this.stage = 'ask';
      return;
    }
    if (message.type === 'toggle-character') {
      if (!['ask','answer'].includes(this.stage) || !characterById(message.characterId)) throw new Error('You can eliminate characters once both players have chosen.');
      const board = this.eliminated[seat];
      if (board.has(message.characterId)) board.delete(message.characterId); else board.add(message.characterId);
      return;
    }
    if (message.type === 'ask-question') {
      if (this.stage !== 'ask' || seat !== this.turn) throw new Error('Wait for your turn to ask.');
      if (typeof message.text !== 'string' || !message.text.trim() || message.text.trim().length > 160) throw new Error('Type a yes/no question using 1 to 160 characters.');
      this.pending = {asker:seat,text:message.text.trim()}; this.stage = 'answer'; return;
    }
    if (message.type === 'answer-question') {
      if (this.stage !== 'answer' || seat !== other(this.turn)) throw new Error('Only the other player can answer this question.');
      if (typeof message.answer !== 'boolean') throw new Error('Answer Yes or No.');
      this.questions.push({...this.pending,answer:message.answer});
      this.questions = this.questions.slice(-50); this.pending = null;
      this.turn = other(this.turn); this.stage = 'ask'; return;
    }
    if (message.type === 'guess-character') {
      if (this.stage !== 'ask' || seat !== this.turn) throw new Error('Make a final guess on your turn, before asking a question.');
      if (!characterById(message.characterId)) throw new Error('Choose a character for your final guess.');
      const correct = message.characterId === this.secrets[other(seat)];
      const winner = correct ? seat : other(seat);
      this.result = {winner,guesser:seat,characterId:message.characterId,correct};
      this.scores[winner]++; this.stage = 'reveal';
      this.history.unshift({round:this.round,secrets:{...this.secrets},...this.result});
      this.history = this.history.slice(0,20); return;
    }
    throw new Error('Unknown Guess Who action.');
  }
  snapshot(seat) {
    return {type:'state',seat,round:this.round,stage:this.stage,turn:this.turn,scores:this.scores,
      secret:this.secrets[seat],ready:{A:Boolean(this.secrets.A),B:Boolean(this.secrets.B)},
      secrets:this.stage === 'reveal' ? {...this.secrets} : null,
      eliminated:[...this.eliminated[seat]],pending:this.pending,questions:this.questions,result:this.result,history:this.history};
  }
}
