export const $ = selector => document.querySelector(selector);
export const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const playerName = seat => `Player ${seat === 'A' ? 1 : 2}`;
