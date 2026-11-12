import { randomInt } from 'node:crypto';
import { QUESTION_BANKS } from './nutshell-questions.mjs';

export const normalizeAnswer = value => value.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().replace(/\s+/g, ' ');
const shuffledDeck = questions => {
  const deck = questions.map((_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) { const j = randomInt(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
};
export class NutshellGame {
  constructor() { this.restart(); }
  restart() {
    this.scores = { A: 0, B: 0 }; this.round = 1; this.giver = 'A'; this.history = []; this.decks = { A: shuffledDeck(QUESTION_BANKS.A), B: shuffledDeck(QUESTION_BANKS.B) }; this.previousQuestions = {}; this.begin();
  }
  get guesser() { return this.giver === 'A' ? 'B' : 'A'; }
  get questions() { return QUESTION_BANKS[this.guesser]; }
  get deck() { return this.decks[this.guesser]; }
  begin() {
    if (!this.deck.length) {
      this.decks[this.guesser] = shuffledDeck(this.questions);
      if (this.deck.at(-1) === this.previousQuestions[this.guesser]) [this.deck[0], this.deck[this.deck.length - 1]] = [this.deck.at(-1), this.deck[0]];
    }
    this.questionIndex = this.deck.pop();
    this.previousQuestions[this.guesser] = this.questionIndex;
    this.words = this.questions[this.questionIndex].question.split(/\s+/);
    this.revealed = []; this.stage = 'pick'; this.result = null;
  }
  act(seat, message) {
    if (message.type === 'restart') { this.restart(); return; }
    if (message.type === 'next') {
      if (this.stage !== 'reveal') throw new Error('Finish this question first.');
      this.round++; this.giver = this.guesser; this.begin(); return;
    }
    if (message.type === 'reveal-words') {
      if (seat !== this.giver || this.stage !== 'pick') throw new Error('Only the Nut Picker can choose the words before guessing.');
      const indices = message.indices;
      if (!Array.isArray(indices) || indices.length < 1 || indices.length > this.words.length || new Set(indices).size !== indices.length || !indices.every(i => Number.isInteger(i) && i >= 0 && i < this.words.length)) throw new Error('Choose at least one word to reveal.');
      this.revealed = [...indices].sort((a, b) => a - b); this.stage = 'guess'; return;
    }
    if (message.type === 'answer') {
      if (seat !== this.guesser || this.stage !== 'guess') throw new Error('Wait for your turn to answer.');
      if (typeof message.text !== 'string' || !normalizeAnswer(message.text) || message.text.length > 120) throw new Error('Type an answer using 1 to 120 characters.');
      const card = this.questions[this.questionIndex];
      const correct = card.answers.some(answer => normalizeAnswer(answer) === normalizeAnswer(message.text));
      const hidden = this.words.length - this.revealed.length;
      this.result = { correct, guess: message.text.trim(), answer: card.answers[0], points: correct ? hidden : 0, scorer: this.giver, hidden };
      this.scores[this.giver] += this.result.points; this.stage = 'reveal';
      this.history.unshift({ round: this.round, question: card.question, ...this.result });
      this.history = this.history.slice(0, 20); return;
    }
    throw new Error('Unknown In a Nutshell action.');
  }
  snapshot(seat) {
    const picker = seat === this.giver, finished = this.stage === 'reveal';
    return { type: 'state', seat, round: this.round, giver: this.giver, guesser: this.guesser, stage: this.stage,
      scores: this.scores, words: this.words.map((word, i) => picker || finished || (this.stage === 'guess' && this.revealed.includes(i)) ? word : null),
      revealed: this.stage === 'pick' && !picker ? [] : this.revealed,
      answer: picker || finished ? this.questions[this.questionIndex].answers[0] : null,
      result: this.result, history: this.history, deckSize: this.questions.length,
    };
  }
}
