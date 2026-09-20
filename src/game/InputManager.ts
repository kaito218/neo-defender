import type { Action, Input, Point } from './model';
export const emptyInput = (): Input => ({ moveX: 0, moveY: 0, target: null, shoot: false, bomb: false, dash: false, slow: false, hyper: false, pause: false, weapon: false });
const keys: Record<Action, string[]> = { shoot: ['Space'], bomb: ['KeyX'], dash: ['ShiftLeft', 'ShiftRight'], slow: ['KeyZ'], hyper: ['KeyC'], pause: ['Escape'], weapon: ['KeyQ', 'KeyE'] };
const padButtons: Record<Action, number> = { shoot: 0, bomb: 1, dash: 2, hyper: 3, slow: 4, pause: 9, weapon: 5 };
export class InputManager {
  held = new Set<string>();
  touch = new Map<number, Action>();
  pending = new Set<Action>();
  target: Point | null = null;
  pointer: number | null = null;
  device: 'keyboard' | 'touch' | 'gamepad' = 'keyboard';
  previous = emptyInput();
  connected = false;
  suppressedPad = false;
  notify: (text: string) => void;
  constructor(notify: (text: string) => void) { this.notify = notify; }
  down = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    if (Object.values(keys).flat().includes(event.code) || ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      event.preventDefault();
      if (event.repeat) return;
      if (!this.held.has(event.code)) for (const action of ['bomb', 'dash', 'hyper', 'pause', 'weapon'] as Action[]) {
        if (keys[action].includes(event.code)) this.pending.add(action);
      }
      this.held.add(event.code); this.device = 'keyboard';
    }
  };
  up = (event: KeyboardEvent) => { this.held.delete(event.code); };
  reset = () => { this.held.clear(); this.touch.clear(); this.pending.clear(); this.target = null; this.pointer = null; this.previous = emptyInput(); this.suppressedPad = true; };
  attach() { window.addEventListener('keydown', this.down); window.addEventListener('keyup', this.up); window.addEventListener('blur', this.reset); return () => { window.removeEventListener('keydown', this.down); window.removeEventListener('keyup', this.up); window.removeEventListener('blur', this.reset); }; }
  beginMove(id: number, p: Point) { if (this.pointer === null) { this.pointer = id; this.target = p; this.device = 'touch'; } }
  move(id: number, p: Point) { if (this.pointer === id) { this.target = p; this.device = 'touch'; } }
  release(id: number) { this.touch.delete(id); if (this.pointer === id) { this.pointer = null; this.target = null; } }
  button(id: number, action: Action) {
    this.touch.set(id, action); this.device = 'touch';
    if (action !== 'shoot' && action !== 'slow') this.pending.add(action);
  }
  sample(): Input {
    const input = emptyInput();
    const pressed = (codes: string[]) => codes.some(c => this.held.has(c));
    input.moveX = Number(pressed(['KeyD', 'ArrowRight'])) - Number(pressed(['KeyA', 'ArrowLeft']));
    input.moveY = Number(pressed(['KeyS', 'ArrowDown'])) - Number(pressed(['KeyW', 'ArrowUp']));
    for (const action of Object.keys(keys) as Action[]) input[action] = pressed(keys[action]) || [...this.touch.values()].includes(action);
    let pad: Gamepad | undefined;
    try { pad = Array.from(navigator.getGamepads?.() ?? []).find((p): p is Gamepad => !!p && p.connected); } catch { /* API may be disabled by browser policy. */ }
    if (!!pad !== this.connected) { this.connected = !!pad; this.notify(pad ? 'GAMEPAD CONNECTED' : 'GAMEPAD DISCONNECTED'); }
    if (pad) {
      const rawX = pad.axes[0] ?? 0, rawY = pad.axes[1] ?? 0;
      const dead = (v: number) => Math.abs(v) < .18 ? 0 : Math.sign(v) * (Math.abs(v) - .18) / .82;
      const x = dead(rawX), y = dead(rawY);
      const active = Math.abs(x) + Math.abs(y) > 0 || pad.buttons.some(b => b.pressed);
      if (!active) this.suppressedPad = false;
      if (active && !this.suppressedPad) {
        this.device = 'gamepad'; input.moveX += x; input.moveY += y;
        input.moveX += Number(pad.buttons[15]?.pressed ?? false) - Number(pad.buttons[14]?.pressed ?? false);
        input.moveY += Number(pad.buttons[13]?.pressed ?? false) - Number(pad.buttons[12]?.pressed ?? false);
        for (const action of Object.keys(padButtons) as Action[]) input[action] ||= pad.buttons[padButtons[action]]?.pressed ?? false;
      }
    }
    if (this.target && this.device === 'touch') input.target = { ...this.target };
    const length = Math.hypot(input.moveX, input.moveY);
    if (length > 1) { input.moveX /= length; input.moveY /= length; }
    const result = { ...input };
    for (const action of ['bomb', 'dash', 'hyper', 'pause', 'weapon'] as Action[]) result[action] = this.pending.has(action) || (input[action] && !this.previous[action]);
    this.pending.clear();
    this.previous = input;
    return result;
  }
}
