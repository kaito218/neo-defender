import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import './App.css';
import { W, H } from './game/model';
import type { Action, Mode, Save, Settings, Snapshot, ShipId } from './game/model';
import { Game } from './game/Game';
import { InputManager } from './game/InputManager';
import { AudioManager } from './game/Audio';
import { drawShip, render } from './game/Renderer';
import { loadSave, writeSave } from './game/SaveData';
import { ships, shipById } from './data/ships';
import { stages } from './data/stages';
import { allies } from './data/allies';
import { weaponOrder, weapons } from './data/weapons';
import { choices, endingText } from './data/story';

type Screen = 'title' | 'hangar' | 'stages' | 'how' | 'settings' | 'game' | 'pause';
const formatTime = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function ShipPreview({ id }: { id: ShipId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = ref.current?.getContext('2d'); if (c) { c.clearRect(0, 0, 250, 100); drawShip(c, 130, 50, id, 2.2); } }, [id]);
  return <canvas ref={ref} width={250} height={100} className="ship-preview" aria-label={`${shipById(id).name}の機体デザイン`} />;
}
function Meter({ label, value, color }: { label: string; value: number; color?: string }) { return <div className="meter"><span>{label}</span><i><b style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></i></div>; }

export default function App() {
  const [save, setSave] = useState<Save>(loadSave);
  const saveRef = useRef(save);
  const [screen, setScreen] = useState<Screen>('title');
  const screenRef = useRef<Screen>('title');
  const backRef = useRef<Screen>('title');
  const [pending, setPending] = useState<Mode | null>(null);
  const [hud, setHud] = useState<Snapshot | null>(null);
  const [toast, setToast] = useState('');
  const [device, setDevice] = useState('keyboard');
  const [full, setFull] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const input = useRef<InputManager | null>(null);
  const audio = useRef<AudioManager | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (text: string) => { setToast(text); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3500); };
  const persist = () => { if (!writeSave(saveRef.current)) notify('保存できません。ブラウザの保存設定を確認してください。'); setSave({ ...saveRef.current }); };
  const navigate = (next: Screen) => { input.current?.reset(); screenRef.current = next; setScreen(next); };
  const updateSettings = (patch: Partial<Settings>) => { saveRef.current.settings = { ...saveRef.current.settings, ...patch }; if (audio.current) audio.current.settings = saveRef.current.settings; persist(); };
  const refresh = () => { input.current?.reset(); if (game.current) setHud(game.current.snapshot()); };
  const launch = (mode: Mode, stage = 1) => {
    audio.current?.unlock(); if (!audio.current) return;
    game.current = new Game(mode, stage, saveRef.current, audio.current, persist);
    setHud(game.current.snapshot()); setPending(null); navigate('game');
  };
  const quit = () => {
    if (game.current) { const g = game.current; saveRef.current.highs[g.mode] = Math.max(saveRef.current.highs[g.mode], Math.floor(g.score)); persist(); }
    game.current = null; setHud(null); audio.current?.setTrack('title'); navigate('title');
  };
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else notify('このブラウザは全画面API非対応です。ホーム画面に追加すると広く表示できます。');
    } catch { notify('全画面を開始できません。ブラウザの表示設定を確認してください。'); }
  };
  useEffect(() => {
    const controls = new InputManager(text => { setToast(text); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 3500); });
    const sound = new AudioManager(saveRef.current.settings); input.current = controls; audio.current = sound;
    const detach = controls.attach();
    let raf = 0, last = 0, elapsed = 0, publish = 0, menuWait = 0, wasShot = false;
    const pause = () => { if (screenRef.current === 'game' && game.current?.status === 'playing') { controls.reset(); screenRef.current = 'pause'; setScreen('pause'); sound.muted = true; } };
    const visibility = () => { if (document.hidden) pause(); last = 0; controls.reset(); };
    const fullChange = () => { setFull(!!document.fullscreenElement); controls.reset(); };
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', visibility); document.addEventListener('fullscreenchange', fullChange);
    const tick = (now: number) => {
      const dt = last ? Math.min(.04, (now - last) / 1000) : 0; last = now; elapsed += dt; publish += dt; menuWait -= dt;
      const state = controls.sample();
      if (state.pause && (screenRef.current === 'game' || screenRef.current === 'pause')) {
        const next = screenRef.current === 'pause' ? 'game' : 'pause'; controls.reset(); screenRef.current = next; setScreen(next);
      }
      sound.muted = screenRef.current === 'pause' || (screenRef.current === 'settings' && game.current !== null) || document.hidden;
      if (screenRef.current === 'game') game.current?.update(dt, state);
      const inMenu = screenRef.current !== 'game' || game.current?.status !== 'playing';
      if (inMenu && controls.device === 'gamepad') {
        const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('.panel button:not(:disabled), .dialog-card button:not(:disabled)') ?? []);
        if (buttons.length && menuWait <= 0 && (Math.abs(state.moveY) > .5 || Math.abs(state.moveX) > .5)) {
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const direction = state.moveY || state.moveX; buttons[(index + (direction > 0 ? 1 : -1) + buttons.length) % buttons.length]?.focus(); menuWait = .24;
        }
        if (state.shoot && !wasShot) { const active = document.activeElement; if (active instanceof HTMLButtonElement && buttons.includes(active)) active.click(); else buttons[0]?.focus(); }
      }
      wasShot = state.shoot;
      sound.update(dt);
      const ctx = canvas.current?.getContext('2d'); if (ctx) render(ctx, game.current, elapsed);
      if (publish > .1) { publish = 0; setDevice(controls.device); if (game.current) setHud(game.current.snapshot()); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); detach(); sound.dispose(); clearTimeout(toastTimer.current); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('fullscreenchange', fullChange); };
  }, []);
  const point = (e: ReactPointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  const moveStart = (e: ReactPointerEvent<HTMLCanvasElement>) => { if (screen !== 'game' || hud?.status !== 'playing') return; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); input.current?.beginMove(e.pointerId, point(e)); };
  const actionProps = (action: Action) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); input.current?.button(e.pointerId, action); },
    onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => input.current?.release(e.pointerId),
    onPointerCancel: (e: ReactPointerEvent<HTMLButtonElement>) => input.current?.release(e.pointerId),
    onLostPointerCapture: (e: ReactPointerEvent<HTMLButtonElement>) => input.current?.release(e.pointerId),
  });
  const selected = shipById(save.selected);
  const choice = hud ? choices[hud.stage as 2 | 4] : undefined;
  const ending = endingText(game.current?.route ?? {});
  return <div className="app" ref={root} onPointerDown={() => audio.current?.unlock()}>
    <div className="viewport">
      <canvas ref={canvas} width={W} height={H} className="game-canvas" aria-label="NEO DEFENDER 横スクロールゲーム画面" onPointerDown={moveStart} onPointerMove={e => input.current?.move(e.pointerId, point(e))} onPointerUp={e => input.current?.release(e.pointerId)} onPointerCancel={e => input.current?.release(e.pointerId)} onLostPointerCapture={e => input.current?.release(e.pointerId)} />
      <div className="vignette" />
      {screen === 'title' && <main className="panel title-panel">
        <div className="eyebrow"><span className="status-light" /> ORBITAL DEFENSE DIVISION <span className="edition">EST. 2186</span></div>
        <div className="title-copy"><div className="kicker">THE LAST LINE OF TOMORROW</div><h1>NEO<br /><em>DEFENDER</em><span className="title-dot">.</span></h1><p>その声を、見失うな。<br /><span>7つの戦域。選び取る未来。</span></p></div>
        <nav className="main-menu">
          <button className="primary" onClick={() => { setPending('story'); navigate('hangar'); }}><span>01</span> STORY MODE <b>↗</b></button>
          <button onClick={() => { setPending('attack'); navigate('hangar'); }}><span>02</span> SCORE ATTACK <b>↗</b></button>
          <div className="menu-grid"><button onClick={() => { setPending(null); navigate('hangar'); }}>HANGAR</button><button onClick={() => navigate('stages')}>STAGE SELECT</button><button onClick={() => navigate('how')}>HOW TO PLAY</button><button onClick={() => { backRef.current = 'title'; navigate('settings'); }}>SETTINGS</button></div>
          <button className="full-button" onClick={fullscreen}>⛶ {full ? 'EXIT FULL SCREEN' : 'FULL SCREEN'}</button>
        </nav>
        <footer className="title-footer"><span><i /> ALL SYSTEMS READY</span><span>HI SCORE <strong>{save.highs.attack.toLocaleString().padStart(7, '0')}</strong></span><span>HORIZONTAL / v2.0</span></footer>
        <div className="hero-label"><span>YOUR NEXT SORTIE</span><b>KESTREL</b><small>TYPE A · MULTIROLE INTERCEPTOR</small></div>
      </main>}
      {screen === 'hangar' && <section className="panel sub-panel"><header><div><div className="kicker">FLEET MANAGEMENT</div><h2>HANGAR<span>機体格納庫</span></h2></div><button onClick={() => navigate('title')}>← BACK</button></header>
        <div className="ship-grid">{ships.map(ship => { const unlocked = save.unlocked.includes(ship.id); return <button key={ship.id} disabled={!unlocked} className={`ship-card ${save.selected === ship.id ? 'selected' : ''}`} onClick={() => { saveRef.current.selected = ship.id; persist(); }}><small>TYPE {ship.id} <span>{unlocked ? save.selected === ship.id ? 'SELECTED' : 'AVAILABLE' : 'LOCKED'}</span></small><ShipPreview id={ship.id} /><h3>{ship.name}</h3><p>{ship.role}</p><div className="ship-spec">HP {ship.hp} · SPD {ship.speed}<br />{ship.weapon}</div><p className="unlock-note">{unlocked ? ship.detail : ship.unlock}</p></button>; })}</div>
        <div className="hangar-bottom"><div><h3>WINGMATES <span>加入済みパイロット</span></h3><div className="ally-list">{Object.entries(allies).map(([id, ally]) => <div key={id} className={save.allies.includes(id as keyof typeof allies) ? 'available' : ''}><b>{ally.name}</b> {ally.role}<small>{ally.detail}</small></div>)}</div></div><div className="launch-box"><p>SELECTED / <strong>{selected.name}</strong></p>{pending === 'story' && <><button className="primary" onClick={() => launch('story', save.nextStage)}>{save.nextStage > 1 ? `CONTINUE / STAGE ${save.nextStage}` : 'LAUNCH / 出撃'} →</button>{save.nextStage > 1 && <button onClick={() => launch('story', 1)}>NEW SORTIE / STAGE 1</button>}</>}{pending === 'attack' && <button className="primary" onClick={() => launch('attack')}>SCORE ATTACK / 出撃 →</button>}{!pending && <button className="primary" onClick={() => launch('story', save.nextStage)}>STORY / 出撃 →</button>}</div></div>
      </section>}
      {screen === 'stages' && <section className="panel sub-panel"><header><div><div className="kicker">OPERATION CHART</div><h2>STAGE SELECT<span>到達した戦域へ</span></h2></div><button onClick={() => navigate('title')}>← BACK</button></header><div className="stage-list">{stages.map(stage => <button key={stage.id} disabled={stage.id > 1 && !save.cleared.includes(stage.id - 1) && !save.cleared.includes(stage.id)} onClick={() => launch('story', stage.id)}><span className="stage-number">{String(stage.id).padStart(2, '0')}</span><span><b>{stage.name}</b><small>{stage.area}</small></span><span>{save.cleared.includes(stage.id) ? 'CLEARED ✓' : '→'}</span></button>)}</div><p className="muted">機体はHANGARで選択。各ステージの開始地点から出撃します。</p></section>}
      {screen === 'how' && <section className="panel sub-panel"><header><div><div className="kicker">PILOT FIELD MANUAL</div><h2>HOW TO PLAY<span>飛ぶ、選ぶ、生き抜く。</span></h2></div><button onClick={() => navigate('title')}>← BACK</button></header><div className="manual-grid"><article><h3>01 / KEYBOARD</h3><dl><dt>WASD / 方向キー</dt><dd>上下左右に移動</dd><dt>SPACE</dt><dd>射撃</dd><dt>SHIFT / X</dt><dd>ダッシュ / ボム</dd><dt>Z / C</dt><dd>スロー（長押し）/ ハイパー</dd><dt>Q・E / ESC</dt><dd>武器切替 / ポーズ</dd></dl></article><article><h3>02 / TOUCH</h3><p>画面を触れた方向へ、機体が速度を保って移動。指を離すと停止します。</p><p>右下の特殊ボタンは、移動と同時に押せます。AUTO SHOTは設定から変更できます。</p><p>横向き推奨。追従オフセットは設定で調整できます。</p></article><article><h3>03 / GAMEPAD</h3><dl><dt>左スティック / 十字キー</dt><dd>移動</dd><dt>A / B / X / Y</dt><dd>射撃 / ボム / ダッシュ / ハイパー</dd><dt>LB / RB / START</dt><dd>スロー / 武器切替 / ポーズ</dd></dl><p>メニューはスティックで選択、Aで決定。接続後にボタンを押して認識させてください。</p></article></div><div className="manual-tips"><b>TACTICS</b> 自機中央の白点が敵弾の当たり判定。ダッシュ中は無敵。敵弾の近くを回避すると加点。撃破をつないでコンボを維持し、ゲージ100%でHYPERを発動。仲間は被弾すると7秒後に帰還します。</div><div className="weapon-guide">{weaponOrder.map(w => <div key={w}><b style={{ color: weapons[w].color }}>{w}</b><span>{weapons[w].detail}</span></div>)}</div></section>}
      {screen === 'settings' && <section className="panel sub-panel settings-panel"><header><div><div className="kicker">SYSTEM CONFIGURATION</div><h2>SETTINGS<span>設定は自動保存されます</span></h2></div><button onClick={() => navigate(backRef.current)}>← BACK</button></header><div className="settings-grid"><label>AUTO SHOT<span>通常射撃を自動化</span><button aria-pressed={save.settings.autoShot} onClick={() => updateSettings({ autoShot: !save.settings.autoShot })}>{save.settings.autoShot ? 'ON' : 'OFF'}</button></label><label>TOUCH OFFSET<span>指の右側への距離：{save.settings.touchOffset}</span><input aria-label="タッチ追従オフセット" type="range" min="0" max="100" step="4" value={save.settings.touchOffset} onChange={e => updateSettings({ touchOffset: +e.target.value })} /></label><label>MUSIC<span>BGM：{Math.round(save.settings.music * 100)}%</span><input aria-label="BGM音量" type="range" min="0" max="1" step=".01" value={save.settings.music} onChange={e => updateSettings({ music: +e.target.value })} /></label><label>SOUND EFFECTS<span>効果音：{Math.round(save.settings.sfx * 100)}%</span><input aria-label="効果音音量" type="range" min="0" max="1" step=".01" value={save.settings.sfx} onChange={e => updateSettings({ sfx: +e.target.value })} /></label><label>REDUCED MOTION<span>画面揺れ・フラッシュを抑える</span><button aria-pressed={save.settings.reducedMotion} onClick={() => updateSettings({ reducedMotion: !save.settings.reducedMotion })}>{save.settings.reducedMotion ? 'ON' : 'OFF'}</button></label><label>STORY DIFFICULTY<span>ストーリーの敵耐久・速度</span><select aria-label="難易度" value={save.settings.difficulty} onChange={e => updateSettings({ difficulty: e.target.value as Settings['difficulty'] })}><option>EASY</option><option>NORMAL</option><option>HARD</option></select></label></div><p className="muted">入力方式は自動切替。セーブはこのブラウザに保存されます。ストーリーはステージ開始地点から再開できます。</p></section>}
      {(screen === 'game' || screen === 'pause') && hud && <>
        <div className="hud"><div className="hud-left"><div className="hud-label">{game.current?.ship.name} <span>HP {hud.hp}/{hud.maxHp}</span></div><div className="hp-segments">{Array.from({ length: hud.maxHp }, (_, i) => <i key={i} className={i < hud.hp ? 'lit' : ''} />)}</div><span className="weapon-name" style={{ color: weapons[hud.weapon].color }}>{hud.weapon} <small>LV.{hud.level}</small></span></div><div className="hud-center"><span>{hud.mode === 'story' ? `STAGE 0${hud.stage} / ${hud.title}` : `SCORE ATTACK / ${hud.tier}`}</span><b>{hud.score.toLocaleString().padStart(7, '0')}</b></div><div className="hud-right"><span>{formatTime(hud.time)} <strong>{hud.combo > 1 ? `×${hud.combo} COMBO` : ''}</strong></span><button aria-label="ポーズ" onClick={() => navigate('pause')}>Ⅱ</button></div></div>
        {hud.boss && <div className="boss-hud"><div>{hud.boss.name}<span>PHASE {hud.boss.phase}</span></div><i><b style={{ width: `${hud.boss.hp * 100}%` }} /></i></div>}
        <div className="bottom-hud"><span>BOMB <b>{'◆'.repeat(hud.bombs) || '—'}</b></span><Meter label="SLOW" value={hud.slow} /><Meter label={hud.hyperTime > 0 ? 'HYPER ON' : 'HYPER'} value={hud.hyperTime > 0 ? hud.hyperTime / 8 * 100 : hud.hyper} color="#edbd80" /><span className="wing-status">{hud.allies}</span><span>{hud.barrier > 0 ? 'SHIELD' : hud.dash > 0 ? `DASH ${hud.dash.toFixed(1)}` : 'DASH READY'}</span></div>
        {hud.warning && screen === 'game' && <div className="warning"><small>HOSTILE SIGNATURE DETECTED</small><strong>WARNING</strong><span>{game.current?.bossData.name}</span></div>}
        {screen === 'game' && hud.status === 'playing' && <>
          {hud.dialogue && <div className="radio"><span className="radio-icon">⌁</span><div><b>{hud.dialogue.name}</b><p>{hud.dialogue.text}</p></div></div>}
          <div className={`touch-actions ${device === 'touch' ? 'active' : ''}`} aria-label="タッチ特殊操作">
            {!save.settings.autoShot && <button className="shot-action" {...actionProps('shoot')}>SHOT</button>}
            <button {...actionProps('weapon')}>WEAPON</button><button {...actionProps('bomb')}>BOMB<small>{hud.bombs}</small></button><button {...actionProps('dash')}>DASH<small>{hud.dash > 0 ? hud.dash.toFixed(1) : 'READY'}</small></button><button {...actionProps('slow')}>SLOW</button><button className={hud.hyper >= 100 ? 'charged' : ''} {...actionProps('hyper')}>HYPER<small>{Math.floor(hud.hyper)}%</small></button>
          </div>
        </>}
        {screen === 'game' && hud.status === 'intro' && <div className="modal"><section className="dialog-card"><div className="kicker">OPERATION 0{hud.stage} / {game.current?.data.area}</div><h2>{hud.title}</h2><b className="speaker">{hud.dialogue?.name}</b><p>{hud.dialogue?.text}</p><button className="primary" autoFocus onClick={() => { game.current?.begin(); refresh(); }}>出撃する / ENGAGE →</button></section></div>}
        {screen === 'game' && hud.status === 'choice' && choice && <div className="modal"><section className="dialog-card wide"><div className="kicker">DECISION POINT / 通信受信</div><h2>{choice.title}</h2><p>{choice.text}</p><div className="choice-grid">{choice.options.map(o => <button key={o.id} onClick={() => { game.current?.choose(o.id); refresh(); }}><b>{o.label} →</b><small>{o.detail}</small></button>)}</div></section></div>}
        {screen === 'game' && hud.status === 'clear' && <div className="modal"><section className="dialog-card"><div className="kicker">OPERATION COMPLETE</div><h2>STAGE CLEAR<span>STAGE {hud.stage} / {hud.title}</span></h2><p>{hud.dialogue?.text}</p><div className="clear-score">{hud.score.toLocaleString()} <small>PTS</small></div><p className="muted">{game.current?.stageDamage === 0 ? 'NO DAMAGE BONUS +5,000' : '機体を修復し、ボムを補給します。'}</p><button className="primary" onClick={() => { game.current?.nextStage(); refresh(); }}>{hud.stage === stages.length ? 'ENDING →' : 'NEXT STAGE →'}</button><button onClick={quit}>SAVE & RETURN / 帰還</button></section></div>}
        {screen === 'game' && (hud.status === 'over' || hud.status === 'ending') && <div className="modal"><section className="dialog-card wide result-card"><div className="kicker">{hud.status === 'ending' ? 'ALL OPERATIONS COMPLETE' : 'SIGNAL LOST / MISSION REPORT'}</div><h2>{hud.status === 'ending' ? 'GAME CLEAR' : 'MISSION FAILED'}</h2>{hud.status === 'ending' && <><h3>{ending.title}</h3><p>{ending.text}</p></>}<div className="result-score"><small>TOTAL SCORE</small>{hud.score.toLocaleString()}</div><div className="result-grid"><div><small>SURVIVAL TIME</small><b>{formatTime(hud.time)}</b></div><div><small>ENEMIES DESTROYED</small><b>{hud.kills}</b></div><div><small>MAX COMBO</small><b>{hud.maxCombo}</b></div><div><small>BOSSES DESTROYED</small><b>{hud.bosses}</b></div><div><small>USED SHIP</small><b>{game.current?.ship.name}</b></div><div><small>HIGH SCORE</small><b>{save.highs[hud.mode].toLocaleString()}</b></div></div><div className="row-actions"><button className="primary" onClick={() => launch(hud.mode, game.current?.startStage ?? 1)}>RETRY</button><button onClick={quit}>RETURN TO BASE</button></div></section></div>}
      </>}
      {screen === 'pause' && <div className="modal"><section className="panel pause-panel"><div className="kicker">FLIGHT SUSPENDED</div><h2>PAUSED</h2><button className="primary" onClick={() => navigate('game')}>CONTINUE</button><button onClick={() => launch(game.current?.mode ?? 'story', game.current?.stage ?? 1)}>RESTART STAGE</button><button onClick={() => { backRef.current = 'pause'; navigate('settings'); }}>SETTINGS</button><button onClick={fullscreen}>{full ? 'EXIT FULL SCREEN' : 'FULL SCREEN'}</button><button onClick={quit}>QUIT / 帰還</button></section></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
      <span className="input-indicator">{device.toUpperCase()}</span>
    </div>
    <div className="portrait-hint">端末を横向きにすると、より快適にプレイできます。</div>
  </div>;
}
