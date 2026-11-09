import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const COLORS = JSON.parse(readFileSync(new URL('./public/colors.json', import.meta.url)));
export const SEATS = ['A', 'B'];
export const coordinate = cell => `${String.fromCharCode(65 + Math.floor(cell / 30))}${cell % 30 + 1}`;
export const validCell = cell => Number.isInteger(cell) && cell >= 0 && cell < 480;
export function scoreGuess(target, guess) {
  if (!validCell(target) || !validCell(guess)) return 0;
  const distance = Math.max(Math.abs(Math.floor(target / 30) - Math.floor(guess / 30)), Math.abs(target % 30 - guess % 30));
  return Math.max(0, 3 - distance);
}
export function validateHint(value, limit) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Type a hint first.');
  const text = value.trim().normalize('NFC');
  if (text.length > 80) throw new Error('Keep your hint under 80 characters.');
  // Hyphens and punctuation separate words too: “ocean-blue” is two words.
  const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || [];
  if (!words.length || words.length > limit) throw new Error(`Use ${limit === 1 ? 'one word' : 'one or two words'} for this hint.`);
  return text;
}
const rgb = cell => COLORS[cell].match(/[a-f\d]{2}/gi).map(x => parseInt(x, 16));
export function randomChoices() {
  const result = [];
  // Keep swatches visually and spatially different, as on a four-color card.
  for (let n = 0; n < 3000 && result.length < 4; n++) {
    const cell = randomInt(480), color = rgb(cell);
    if (result.every(other => {
      const previous = rgb(other);
      return Math.hypot(...color.map((v, i) => v - previous[i])) >= 105 &&
        Math.max(Math.abs(cell % 30 - other % 30), Math.abs(Math.floor(cell / 30) - Math.floor(other / 30))) >= 5;
    })) result.push(cell);
  }
  if (result.length < 4) return [0, 29, 240, 479];
  return result;
}
export class Game {
  constructor() { this.restart(); }
  restart() {
    this.scores = { A: 0, B: 0 }; this.round = 1; this.giver = 'A'; this.history = []; this.begin();
  }
  begin() {
    this.stage = 'choose'; this.choices = randomChoices(); this.target = null; this.hints = []; this.guesses = []; this.result = null;
  }
  get guesser() { return this.giver === 'A' ? 'B' : 'A'; }
  act(seat, message) {
    if (message.type === 'restart') { this.restart(); return; }
    if (message.type === 'next') {
      if (this.stage !== 'reveal') throw new Error('Finish this round first.');
      this.round++; this.giver = this.guesser; this.begin(); return;
    }
    if (message.type === 'reroll') {
      if (seat !== this.giver || this.stage !== 'choose') throw new Error('Only the clue giver can shuffle before choosing.');
      this.choices = randomChoices(); return;
    }
    if (message.type === 'choose') {
      if (seat !== this.giver || this.stage !== 'choose' || !this.choices.includes(message.cell)) throw new Error('Choose one of your four colors.');
      this.target = message.cell; this.stage = 'hint1'; return;
    }
    if (message.type === 'hint') {
      if (seat !== this.giver || !['hint1', 'hint2'].includes(this.stage)) throw new Error('It is not your turn to give a hint.');
      const limit = this.stage === 'hint1' ? 1 : 2;
      this.hints.push(validateHint(message.text, limit)); this.stage = limit === 1 ? 'guess1' : 'guess2'; return;
    }
    if (message.type === 'guess') {
      if (seat !== this.guesser || !['guess1', 'guess2'].includes(this.stage)) throw new Error('Wait for your turn to guess.');
      if (!validCell(message.cell)) throw new Error('Choose a color on the board.');
      this.guesses.push(message.cell);
      if (this.stage === 'guess1') { this.stage = 'hint2'; return; }
      this.stage = 'reveal';
      const points = this.guesses.map(cell => scoreGuess(this.target, cell));
      this.result = { points, total: points.reduce((sum, x) => sum + x, 0), guesser: this.guesser };
      this.scores[this.guesser] += this.result.total;
      this.history.unshift({ round: this.round, giver: this.giver, target: this.target, hints: [...this.hints], guesses: [...this.guesses], ...this.result });
      this.history = this.history.slice(0, 20); return;
    }
    throw new Error('Unknown game action.');
  }
  snapshot(seat) {
    const visible = seat === this.giver || this.stage === 'reveal';
    return { type: 'state', seat, scores: this.scores, round: this.round, giver: this.giver, guesser: this.guesser,
      stage: this.stage, choices: seat === this.giver && this.stage === 'choose' ? this.choices : [],
      target: visible ? this.target : null, hints: this.hints, guesses: this.guesses,
      result: this.result, history: this.history };
  }
}
