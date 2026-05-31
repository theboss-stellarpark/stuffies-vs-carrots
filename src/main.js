import { Game } from './Game.js?v=3';
import { HomeScreen } from './HomeScreen.js';
import { SAVE_KEY } from './Items.js?v=3';

const screen = new HomeScreen(
  () => {
    localStorage.removeItem(SAVE_KEY);
    screen.remove();
    new Game(1, null);
  },
  () => {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY));
    screen.remove();
    new Game(save.level, save);
  }
);
