import { NutshellGame } from './games/nutshell.mjs';
import { Game as HuesGame } from './games/hues.mjs';
import { MINIGAMES } from './public/games/catalog.js';

export const SEATS = ['A', 'B'];
const factories = new Map([['hues-and-cues', () => new HuesGame()], ['in-a-nutshell', () => new NutshellGame()]]);

// The room owns navigation and game sessions; each game owns its rules and scores.
export class Room {
  constructor() { this.activeGame = null; this.games = new Map(); }
  act(seat, message) {
    if (message.type === 'select-game') {
      if (!MINIGAMES.some(game => game.id === message.gameId) || !factories.has(message.gameId)) throw new Error('Choose a game from the list.');
      if (this.activeGame && this.activeGame !== message.gameId) throw new Error('Return to the game list first.');
      if (!this.games.has(message.gameId)) this.games.set(message.gameId, factories.get(message.gameId)());
      this.activeGame = message.gameId;
      return;
    }
    if (message.type === 'show-games') { this.activeGame = null; return; }
    if (!this.activeGame) throw new Error('Choose a minigame first.');
    if (message.gameId && message.gameId !== this.activeGame) throw new Error('This action belongs to another game.');
    this.games.get(this.activeGame).act(seat, message);
  }
  snapshot(seat) {
    const game = this.activeGame ? this.games.get(this.activeGame).snapshot(seat) : { type: 'state', seat };
    return { ...game, activeGame: this.activeGame, savedGames: [...this.games.keys()] };
  }
}
