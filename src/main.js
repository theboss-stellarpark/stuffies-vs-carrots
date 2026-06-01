import { Game } from './Game.js?v=3';
import { HomeScreen } from './HomeScreen.js';
import { getMeta, SAVE_KEY } from './Items.js?v=3';

// sessionStorage keys are tab-scoped and never touch the real meta
const debugLevel = sessionStorage.getItem('debug_level');
const debugChar  = sessionStorage.getItem('debug_char');

if (debugLevel) {
  sessionStorage.removeItem('debug_level');
  sessionStorage.removeItem('debug_char');
  const level = parseInt(debugLevel);
  const char  = debugChar || getMeta().selectedChar;
  const diff  = parseInt(sessionStorage.getItem('debug_difficulty') || '1');
  const save  = (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } })();
  new Game(level, save, char, diff);
} else {
  // Normal path — sessionStorage debug keys are cleared on tab close,
  // so the home screen always reflects only real localStorage meta.
  sessionStorage.removeItem('debug_char');
  new HomeScreen((level, save, difficulty) => {
    new Game(level, save, getMeta().selectedChar, difficulty);
  });
}
