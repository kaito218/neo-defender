import { useEffect, useRef } from 'react';
import type { Mode, Save, ShipId } from '../game/model';
import { ships, shipById } from '../data/ships';
import { allies } from '../data/allies';
import { drawShip } from '../game/Renderer';

function ShipPreview({ id }: { id: ShipId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext('2d');
    if (c) { c.clearRect(0, 0, 250, 100); drawShip(c, 130, 50, id, 2.2); }
  }, [id]);
  return <canvas ref={ref} width={250} height={100} className="ship-preview" aria-label={`${shipById(id).name}の機体デザイン`} />;
}

type Props = { save: Save; mode: Mode | null; onBack: () => void; onSelect: (id: ShipId) => void; onLaunch: (mode: Mode, stage?: number) => void };
export function Hangar({ save, mode, onBack, onSelect, onLaunch }: Props) {
  const selected = shipById(save.selected);
  return <section className="panel sub-panel hangar-panel">
    <header>
      <div><div className="kicker">FLEET MANAGEMENT</div><h2>HANGAR<span>機体を選んで、下の「出撃する」をタップ</span></h2></div>
      <button onClick={onBack}>← BACK</button>
    </header>
    <div className="hangar-content">
      <div className="ship-grid">{ships.map(ship => {
        const unlocked = save.unlocked.includes(ship.id);
        return <button key={ship.id} disabled={!unlocked} className={`ship-card ${save.selected === ship.id ? 'selected' : ''}`} onClick={() => onSelect(ship.id)}>
          <small>TYPE {ship.id} <span>{unlocked ? save.selected === ship.id ? 'SELECTED' : 'AVAILABLE' : 'LOCKED'}</span></small>
          <ShipPreview id={ship.id} /><h3>{ship.name}</h3><p>{ship.role}</p>
          <div className="ship-spec">HP {ship.hp} · SPD {ship.speed}<br />{ship.weapon}</div>
          <p className="unlock-note">{unlocked ? ship.detail : ship.unlock}</p>
        </button>;
      })}</div>
      <section className="wingmates"><h3>WINGMATES <span>加入済みパイロット</span></h3>
        <div className="ally-list">{Object.entries(allies).map(([id, ally]) => <div key={id} className={save.allies.includes(id as keyof typeof allies) ? 'available' : ''}>
          <b>{ally.name}</b> {ally.role}<small>{ally.detail}</small>
        </div>)}</div>
      </section>
    </div>
    {/* Outside the scroll region: always reachable, even with Safari toolbars in landscape. */}
    <footer className="hangar-launch" aria-label="出撃操作">
      <div className="launch-selection"><small>出撃準備完了</small><strong>{selected.name}</strong><span>{mode === 'attack' ? 'SCORE ATTACK' : `STORY / STAGE ${save.nextStage}`}</span></div>
      <div className="launch-actions">
        {mode !== 'attack' && save.nextStage > 1 && <button className="new-sortie" onClick={() => onLaunch('story', 1)}>STAGE 1から</button>}
        <button className="primary launch-primary" onClick={() => onLaunch(mode ?? 'story', mode === 'attack' ? 1 : save.nextStage)}>
          <span>出撃する</span><small>{mode === 'attack' ? 'SCORE ATTACK' : save.nextStage > 1 ? `続きから / STAGE ${save.nextStage}` : 'LAUNCH / STAGE 1'}</small><b aria-hidden="true">→</b>
        </button>
      </div>
    </footer>
  </section>;
}
