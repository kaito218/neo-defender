import { H, W } from './model';
import type { ShipId } from './model';
import type { Game } from './Game';
import { ships } from '../data/ships';
import { weapons } from '../data/weapons';
import { enemies } from '../data/enemies';
import { allies } from '../data/allies';

function polygon(c: CanvasRenderingContext2D, points: number[], fill: string, stroke?: string) {
  c.beginPath(); c.moveTo(points[0], points[1]); for (let i = 2; i < points.length; i += 2) c.lineTo(points[i], points[i + 1]); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = .7; c.stroke(); }
}
export function drawShip(c: CanvasRenderingContext2D, x: number, y: number, id: ShipId, scale = 1, time = 0) {
  const ship = ships.find(s => s.id === id) ?? ships[0];
  c.save(); c.translate(x, y); c.scale(scale, scale);
  const flame = 15 + Math.sin(time * 40) * 7;
  polygon(c, [-24, -7, -45 - flame, 0, -24, 7], '#4196dd66');
  polygon(c, [-25, -4, -39 - flame * .7, 0, -25, 4], ship.color);
  const heavy = id === 'C', swift = id === 'B';
  polygon(c, [-22, -9, -33, heavy ? -27 : -22, -6, -18, 18, -4, 9, 5, -27, 7], '#344f6b', '#8398b2');
  polygon(c, [-24, 6, -36, heavy ? 29 : 23, -5, 19, 22, 6, 5, -3], '#46607c', '#8293ac');
  if (id === 'D') { c.fillStyle = ship.color; c.fillRect(-20, -28, 28, 4); c.fillRect(-20, 24, 28, 4); }
  if (id === 'E') { c.fillStyle = '#c6d1e2'; c.fillRect(-4, 8, 40, 4); c.fillStyle = ship.color; c.fillRect(22, 8, 19, 3); }
  polygon(c, [-30, -7, -5, -12, swift ? 43 : 35, -1, 21, 7, -23, 11], '#c6d4e6', '#eaf4ff');
  polygon(c, [-24, 3, 29, 0, 16, 9, -24, 12], '#647c9a');
  polygon(c, [-3, -9, 12, -7, 20, -2, -1, -2, -10, -5], '#132b49');
  polygon(c, [-1, -8, 11, -6, 14, -4, -3, -4], ship.color);
  c.fillStyle = '#243b54'; c.fillRect(-28, -7, 8, 14);
  c.fillStyle = ship.color; c.fillRect(-29, -5, 3, 10); c.fillRect(-10, 14, 13, 2); c.fillRect(-16, -18, 10, 2);
  c.fillStyle = '#e4eef9'; c.fillRect(6, 8, 22, 3); c.fillStyle = ship.color; c.fillRect(26, 8, 6, 2);
  if (heavy) { c.fillStyle = '#76889d'; c.fillRect(-13, -23, 27, 7); c.fillRect(-15, 20, 33, 6); }
  c.restore();
}
export function background(c: CanvasRenderingContext2D, scroll: number, theme = 'earth', accent = '#56bfd4') {
  c.fillStyle = '#060d1a'; c.fillRect(0, 0, W, H);
  const glow = c.createRadialGradient(900, 290, 30, 870, 330, 660);
  glow.addColorStop(0, `${accent}28`); glow.addColorStop(1, '#060d1a00'); c.fillStyle = glow; c.fillRect(0, 0, W, H);
  for (let layer = 0; layer < 3; layer++) {
    c.fillStyle = ['#63738c', '#a0b8cf', '#e9f7ff'][layer];
    for (let i = 0; i < 65 - layer * 17; i++) { const x = ((i * 197 + layer * 71 - scroll * (.14 + layer * .3)) % W + W) % W; const y = (i * 131 + layer * 79) % H; c.globalAlpha = .35 + layer * .2; c.fillRect(x, y, layer === 2 ? 2 : 1, layer === 2 ? 2 : 1); }
  }
  c.globalAlpha = 1;
  if (theme === 'earth' || theme === 'dust') {
    c.save(); c.translate(830 - scroll * .018 % 100, 820); c.rotate(-.24);
    const planet = c.createRadialGradient(-80, -390, 0, 0, 0, 570); planet.addColorStop(0, theme === 'earth' ? '#477898' : '#937251'); planet.addColorStop(.75, '#132f45'); planet.addColorStop(1, '#091322');
    c.fillStyle = planet; c.beginPath(); c.arc(0, 0, 570, 0, Math.PI * 2); c.fill(); c.strokeStyle = `${accent}88`; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.arc(0, 0, 581, Math.PI, Math.PI * 2); c.strokeStyle = `${accent}22`; c.lineWidth = 12; c.stroke();
    c.globalAlpha = .22; for (let i = 0; i < 8; i++) { c.beginPath(); c.ellipse(-40 + i * 19, -370 + i * 23, 210 - i * 17, 8, -.13, 0, Math.PI * 2); c.fillStyle = '#c3eaff'; c.fill(); }
    c.restore();
  } else if (theme === 'colony' || theme === 'relay') {
    c.save(); c.translate(950 - scroll * .06 % 190, 340); c.rotate(-.35);
    c.strokeStyle = '#58738855'; c.lineWidth = 35; c.beginPath(); c.ellipse(0, 0, 160, 250, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = `${accent}44`; c.lineWidth = 2; c.stroke();
    for (let i = -2; i <= 2; i++) { c.fillStyle = '#223449'; c.fillRect(-290, i * 70 - 20, 580, 14); c.fillStyle = `${accent}55`; c.fillRect(-260, i * 70 - 19, 45, 2); }
    c.fillStyle = '#182a3f'; c.fillRect(-35, -310, 70, 610); c.restore();
  } else if (theme === 'fortress') {
    for (let i = 0; i < 9; i++) { const x = i * 180 - scroll % 180; c.fillStyle = '#25303b'; c.fillRect(x, 0, 100, 54); c.fillRect(x, H - 40, 100, 40); c.strokeStyle = '#485363'; c.strokeRect(x + 4, 4, 92, 40); c.fillStyle = accent; c.fillRect(x + 12, 44, 30, 3); c.fillRect(x + 12, H - 39, 30, 3); }
  } else {
    c.save(); c.translate(1000, 330); c.rotate(scroll * .0004); c.strokeStyle = `${accent}28`;
    for (let i = 0; i < 6; i++) { c.lineWidth = i === 0 ? 40 : 2; c.beginPath(); c.ellipse(0, 0, 90 + i * 40, 130 + i * 45, i * .3, 0, Math.PI * 2); c.stroke(); }
    c.restore();
  }
  c.fillStyle = '#050a1433'; c.fillRect(0, 0, W, H);
}
function drawEnemy(c: CanvasRenderingContext2D, e: Game['enemies'][number], game: Game) {
  const color = e.kind === 'boss' ? game.bossData.color : enemies[e.kind].color;
  c.save(); c.translate(e.x + e.w / 2, e.y + e.h / 2); c.scale(e.w / 100, e.h / 70);
  if (e.kind === 'boss' || e.kind === 'midboss' || e.kind === 'cruiser' || e.kind === 'mother') {
    const final = e.kind === 'boss' && game.bossData.name === 'THE CHOIR';
    if (final) {
      c.save(); c.rotate(e.age * .15); c.strokeStyle = color; c.lineWidth = .7;
      for (let i = 0; i < 8 + e.phase * 2; i++) { c.rotate(Math.PI * 2 / (8 + e.phase * 2)); polygon(c, [20, -3, 42 + e.phase * 2, -7, 49, 0, 40, 5, 20, 3], '#443451', color); }
      c.restore();
    }
    polygon(c, [-49, -15, -34, -29, 37, -33, 50, -16, 44, 27, -26, 29, -43, 12, -29, 0], '#344053', '#8390a6');
    polygon(c, [-31, -23, 15, -29, 40, -21, 25, -9, -35, -8], '#596278');
    polygon(c, [-35, 10, 34, 10, 42, 25, -28, 26], '#222c41', '#64758d');
    c.fillStyle = '#111d31'; c.fillRect(-25, -7, 64, 16);
    c.fillStyle = color; c.fillRect(-30, -24, 23, 2); c.fillRect(-28, 20, 36, 2);
    for (let i = 0; i < 4; i++) { c.fillStyle = '#66748c'; c.fillRect(-38 + i * 19, -17, 9, 8); c.fillStyle = color; c.fillRect(-39 + i * 19, -16, 3, 6); }
    c.fillStyle = '#12182c'; c.beginPath(); c.ellipse(3, 0, 14 + e.phase * 2, 17, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = color; c.beginPath(); c.ellipse(3, 0, 8 + Math.sin(e.age * 5), 10, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff0ee'; c.fillRect(-2, -2, 9, 4);
    for (const y of [-27, 22]) { c.fillStyle = '#182337'; c.fillRect(-46, y, 22, 6); c.fillStyle = color; c.fillRect(-47, y + 1, 3, 4); }
    c.fillStyle = '#bca7e877'; c.fillRect(45, -15, 7 + Math.sin(e.age * 30) * 3, 30);
    if (e.kind === 'boss') {
      const form = game.mode === 'story' ? game.stage : game.bossIndex % 7 + 1;
      if (form === 1 || form === 4) {
        polygon(c, [25, -22, 45, -40, -22, -34, -44, -18], '#384b64', color);
        polygon(c, [25, 22, 45, 40, -22, 34, -44, 18], '#384b64', color);
      }
      if (form === 2) { c.strokeStyle = color; c.lineWidth = 2; c.beginPath(); c.ellipse(12, 0, 22, 34, 0, 0, Math.PI * 2); c.stroke(); }
      if (form === 3 || form === 6) { for (const y of [-27, 23]) { c.fillStyle = '#8794a4'; c.fillRect(-53, y, 52, 7); c.fillStyle = color; c.fillRect(-55, y + 2, 10, 3); } }
      if (form === 5) {
        for (const y of [-27, 27]) { polygon(c, [-53, y, -31, y - 11, 43, y - 9, 49, y, 26, y + 9, -32, y + 11], '#654a70', color); c.fillStyle = color; c.fillRect(-40, y - 2, 46, 3); }
      }
    }
  } else if (e.kind === 'drone') {
    polygon(c, [-48, 0, -15, -28, 30, -25, 47, 0, 30, 25, -15, 28], '#3d3f62', color);
    c.strokeStyle = color; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 19, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#e9d9ff'; c.fillRect(-10, -5, 14, 10);
  } else {
    const narrow = e.kind === 'fast' || e.kind === 'sniper';
    polygon(c, [-48, 0, -8, -14, 22, -32, 38, -28, 25, -8, 48, -5, 48, 9, 22, 12, 38, 29, 17, 30, -9, 14], '#574254', '#9e8197');
    polygon(c, [-48, 0, -7, -11, 35, -6, 35, 6, -7, 10], '#9b8490');
    c.fillStyle = color; c.fillRect(-18, -4, 21, 7); c.fillRect(30, -9, 8, 4); c.fillRect(30, 7, 8, 4);
    c.fillStyle = '#fcb89577'; c.fillRect(41, -4, 17, 7);
    if (narrow) { c.fillStyle = color; c.fillRect(-60, 11, 70, 3); }
    if (e.kind === 'missile') { c.fillStyle = '#d4a3b9'; c.fillRect(-25, -25, 50, 6); c.fillRect(-25, 20, 50, 6); }
    if (e.kind === 'turret') { c.fillStyle = '#526071'; c.fillRect(-13, 16, 64, 18); c.fillStyle = color; c.fillRect(-48, -5, 42, 6); }
  }
  c.restore();
  if (e.shield > 0) { c.strokeStyle = '#77e5ff'; c.lineWidth = 2; c.beginPath(); c.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w * .64, e.h * .68, 0, 0, Math.PI * 2); c.stroke(); }
  if ((e.kind === 'sniper' || e.kind === 'laser') && e.fire < .7) { c.strokeStyle = '#ff708477'; c.setLineDash([8, 12]); c.beginPath(); c.moveTo(e.x, e.y + e.h / 2); c.lineTo(game.player.x + 28, game.player.y + 14); c.stroke(); c.setLineDash([]); }
  if (e.kind !== 'boss' && e.hp < e.maxHp) { c.fillStyle = '#192b3e'; c.fillRect(e.x, e.y - 9, e.w, 3); c.fillStyle = color; c.fillRect(e.x, e.y - 9, e.w * Math.max(0, e.hp / e.maxHp), 3); }
}
export function render(c: CanvasRenderingContext2D, game: Game | null, time: number) {
  c.save();
  if (game && !game.save.settings.reducedMotion && game.shake > 0) c.translate((Math.random() - .5) * game.shake, (Math.random() - .5) * game.shake);
  background(c, game?.scroll ?? time * 35, game?.data.theme, game?.data.color);
  if (!game) {
    // Hangar-scale hero drawn with the same original ship geometry used in play.
    c.save(); c.translate(925, 360); c.rotate(-.11); drawShip(c, 0, 0, 'A', 6.4, time); c.restore();
    c.strokeStyle = '#72d7e830'; c.lineWidth = 1; c.beginPath(); c.arc(930, 358, 238, -.65, 4.4); c.stroke();
    c.setLineDash([3, 12]); c.beginPath(); c.arc(930, 358, 262, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#99b8d0'; c.font = '12px monospace'; c.fillText('ND–01 / KESTREL', 950, 600); c.fillText('ORBITAL DEFENSE DIVISION', 950, 621);
    c.restore(); return;
  }
  for (const o of game.obstacles) { c.fillStyle = '#293646'; c.fillRect(o.x, o.y, o.w, o.h); c.strokeStyle = '#e5a96b'; c.lineWidth = 3; c.strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4); c.fillStyle = '#e5a96b66'; for (let y = o.y + 12; y < o.y + o.h; y += 25) c.fillRect(o.x + 10, y, o.w - 20, 5); }
  for (const e of game.enemies) drawEnemy(c, e, game);
  for (const item of game.items) {
    const color = weapons[item.kind as keyof typeof weapons]?.color ?? '#f5dbaa';
    c.fillStyle = '#122940'; c.fillRect(item.x, item.y, 30, 30); c.strokeStyle = color; c.strokeRect(item.x, item.y, 30, 30); c.fillStyle = color; c.font = 'bold 17px monospace'; c.textAlign = 'center'; c.fillText(item.kind === 'HEAL' ? '+' : item.kind === 'BARRIER' ? '◇' : item.kind[0], item.x + 15, item.y + 21); c.textAlign = 'left';
  }
  for (const a of game.allies) if (a.cooldown <= 0) { drawShip(c, a.x, a.y, a.id === 'mira' ? 'D' : a.id === 'gale' ? 'B' : 'E', .55, time); c.fillStyle = allies[a.id].color; c.font = '10px monospace'; c.fillText(allies[a.id].name, a.x - 16, a.y + 26); }
  const p = game.player;
  if (game.invincible <= 0 || Math.floor(time * 15) % 2 === 0) drawShip(c, p.x + 28, p.y + 14, game.ship.id, 1, time);
  for (let i = 0; i < game.droneCount; i++) drawShip(c, p.x + 12, p.y + (i === 0 ? -30 : 58), 'D', .33, time);
  if (game.barrier > 0 || game.hyperTime > 0 || game.dashTime > 0) { c.strokeStyle = game.hyperTime > 0 ? '#ffd88b' : '#9aefff'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x + 28, p.y + 14, 47, 33, 0, 0, Math.PI * 2); c.stroke(); }
  c.fillStyle = '#fff'; c.fillRect(p.x + 26, p.y + 12, 4, 4);
  for (const b of game.bullets) {
    c.fillStyle = b.friendly ? weapons[b.weapon].color : '#ffb777';
    if (b.friendly) { c.fillRect(b.x, b.y, b.w, b.h); c.fillStyle = '#f0ffff'; c.fillRect(b.x + 3, b.y + 1, b.w - 6, 2); }
    else { c.beginPath(); c.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 2, b.h / 2 + 2, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff2d8'; c.fillRect(b.x + 3, b.y + 3, Math.max(3, b.w - 6), 3); }
  }
  for (const p of game.particles) { c.globalAlpha = Math.min(1, p.life * 2); c.fillStyle = p.color; c.fillRect(p.x, p.y, p.size, p.size); } c.globalAlpha = 1;
  if (game.slowing) { c.fillStyle = '#74a8ff0b'; c.fillRect(0, 0, W, H); }
  if (game.flash > 0 && !game.save.settings.reducedMotion) { c.fillStyle = `rgba(173,228,255,${game.flash})`; c.fillRect(0, 0, W, H); }
  c.restore();
}
