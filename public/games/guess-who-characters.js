// Shared, original character roster. Only the server stores each player's choice.
const names = ['Alex','Bea','Cleo','Dev','Eli','Finn','Gia','Hugo','Iris','Jules','Kai','Lena','Milo','Nia','Omar','Pia','Quinn','Remy','Sage','Tess','Uma','Vic','Wren','Zoe'];
const hairColors = ['black','brown','blond','red','gray','bald'];
export const CHARACTERS = names.map((name, i) => ({
  id: name.toLowerCase(), name,
  hair: hairColors[i % 6], longHair: i % 6 !== 5 && Math.floor(i / 6) % 2 === 1,
  glasses: i % 2 === 0, hat: i % 3 === 0,
  beard: [1,4,9,12,17,22].includes(i), earrings: i % 3 === 2,
  skin: ['#f1c7a2','#c58c66','#8b5c43'][Math.floor(i / 2) % 3],
  shirt: ['#725eac','#2b8d85','#ce6b77','#c28a37'][Math.floor(i / 6)],
}));
export const characterById = id => CHARACTERS.find(character => character.id === id);
export const characterTraits = character => [
  character.hair === 'bald' ? 'Bald' : `${character.longHair ? 'Long' : 'Short'} ${character.hair} hair`,
  character.glasses && 'glasses', character.hat && 'hat', character.beard && 'beard', character.earrings && 'earrings',
].filter(Boolean).join(' · ');

// Small geometric portraits: the drawn accessories match the roster exactly.
export function portrait(character) {
  const hair = {black:'#302c30',brown:'#70452e',blond:'#dfb85f',red:'#b85a3c',gray:'#a2a7ae',bald:'transparent'}[character.hair];
  return `<svg viewBox="0 0 120 128" fill="none" aria-hidden="true" focusable="false">
    <rect width="120" height="128" rx="12" fill="#ece6da"/>
    ${character.longHair ? `<rect x="25" y="23" width="70" height="85" rx="30" fill="${hair}"/>` : ''}
    <path d="M15 128v-6c0-20 20-31 45-31s45 11 45 31v6" fill="${character.shirt}"/>
    <rect x="49" y="80" width="22" height="22" rx="8" fill="${character.skin}"/>
    <circle cx="28" cy="61" r="7" fill="${character.skin}"/><circle cx="92" cy="61" r="7" fill="${character.skin}"/>
    <rect x="30" y="23" width="60" height="70" rx="28" fill="${character.skin}"/>
    ${character.hair !== 'bald' ? `<path d="M29 52V42c0-19 11-28 31-28s31 9 31 28v10c-9-4-16-11-20-19-10 12-24 17-42 19Z" fill="${hair}"/>` : ''}
    <circle cx="47" cy="59" r="3" fill="#332d2b"/><circle cx="73" cy="59" r="3" fill="#332d2b"/>
    <path d="m60 63-3 9h6" stroke="#78513f" stroke-width="2" stroke-linecap="round"/>
    ${character.beard ? `<path d="M33 72c3 17 13 24 27 24s24-7 27-24c-7 3-11 4-15 4-8-5-16-5-24 0-4 0-8-1-15-4Z" fill="${character.hair === 'bald' ? '#70452e' : hair}"/>` : ''}
    <path d="M51 79q9 7 18 0" stroke="${character.beard ? '#f3c5a3' : '#78513f'}" stroke-width="2.5" stroke-linecap="round"/>
    ${character.glasses ? `<g stroke="#343b45" stroke-width="3"><rect x="33" y="50" width="23" height="19" rx="7"/><rect x="64" y="50" width="23" height="19" rx="7"/><path d="M56 57h8m-37-1h6m54 0h6"/></g>` : ''}
    ${character.earrings ? `<g stroke="#f4cf65" stroke-width="3"><circle cx="29" cy="74" r="5"/><circle cx="91" cy="74" r="5"/></g>` : ''}
    ${character.hat ? `<path d="M32 29v-9c0-9 8-14 28-14s28 5 28 14v9" fill="#396b73"/><rect x="23" y="26" width="74" height="9" rx="4" fill="#254d54"/>` : ''}
  </svg>`;
}
