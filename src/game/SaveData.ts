import { stages } from '../data/stages';
import { clamp } from './model';
import type { Save, Settings, ShipId, AllyId } from './model';
export const SAVE_KEY = 'neo-defender-v2';
export const defaultSettings = (): Settings => ({ autoShot: typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0, touchOffset: 48, music: .22, sfx: .38, reducedMotion: false, difficulty: 'NORMAL' });
export const freshSave = (): Save => ({ version: 2, cleared: [], unlocked: ['A'], selected: 'A', allies: [], choices: {}, nextStage: 1, highs: { story: 0, attack: 0 }, settings: defaultSettings() });
const number = (x: unknown, fallback: number, min: number, max: number) => typeof x === 'number' && Number.isFinite(x) ? clamp(x, min, max) : fallback;
export function parseSave(raw: string | null): Save {
  const s = freshSave();
  try {
    const d = JSON.parse(raw ?? 'null');
    if (!d || d.version !== 2) return s;
    s.cleared = Array.isArray(d.cleared) ? [...new Set<number>(d.cleared.filter((x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= stages.length))] : [];
    s.unlocked = ['A', ...(['B', 'C', 'D', 'E'] as ShipId[]).filter(id => Array.isArray(d.unlocked) && d.unlocked.includes(id))];
    s.selected = s.unlocked.includes(d.selected) ? d.selected : 'A';
    s.allies = (['mira', 'gale', 'noa'] as AllyId[]).filter(id => Array.isArray(d.allies) && d.allies.includes(id));
    if (['rescue', 'pursue'].includes(d.choices?.signal)) s.choices.signal = d.choices.signal;
    if (['trust', 'secure'].includes(d.choices?.trust)) s.choices.trust = d.choices.trust;
    const reachable = s.cleared.length ? Math.min(stages.length, Math.max(...s.cleared) + 1) : 1;
    s.nextStage = Math.floor(number(d.nextStage, 1, 1, reachable));
    s.highs.story = Math.floor(number(d.highs?.story, 0, 0, 1e12));
    s.highs.attack = Math.floor(number(d.highs?.attack, 0, 0, 1e12));
    const t = d.settings ?? {};
    s.settings = { autoShot: typeof t.autoShot === 'boolean' ? t.autoShot : s.settings.autoShot, touchOffset: number(t.touchOffset, 48, 0, 100), music: number(t.music, .22, 0, 1), sfx: number(t.sfx, .38, 0, 1), reducedMotion: t.reducedMotion === true, difficulty: ['EASY', 'NORMAL', 'HARD'].includes(t.difficulty) ? t.difficulty : 'NORMAL' };
  } catch { /* Corrupt or unavailable storage falls back to a playable fresh save. */ }
  return s;
}
export function loadSave(): Save {
  try {
    const s = parseSave(localStorage.getItem(SAVE_KEY));
    s.highs.attack = Math.max(s.highs.attack, number(Number(localStorage.getItem('highScore')), 0, 0, 1e12));
    return s;
  } catch { return freshSave(); }
}
export function writeSave(save: Save) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch { return false; }
}

