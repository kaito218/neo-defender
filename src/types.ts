export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 800;
export const PLAYER_SIZE = 60;
export const PLAYER_SPEED = 7;
export const DASH_SPEED = 20;
export const BULLET_SPEED = 14;
export const ENEMY_BULLET_SPEED = 4;
export const ENEMY_SPAWN_RATE = 0.035;

export type WeaponType = 'TWIN' | 'SPREAD' | 'LASER' | 'HOMING';
export type EnemyType = 'SCOUT' | 'STRIKER' | 'MOTHER' | 'DEFENDER' | 'BOSS';
export type ItemType = 'W_TWIN' | 'W_SPREAD' | 'W_LASER' | 'W_HOMING' | 'BARRIER' | 'HEAL' | 'BOMB' | 'DRONE' | 'HYPER';

export type GameObject = { x: number; y: number; width: number; height: number; };
export type Bullet = GameObject & { 
    type: WeaponType; 
    vx: number; 
    vy: number; 
    power: number; 
    isPlayer: boolean;
    target?: number; // Index of the target enemy for homing missiles
};

export type Enemy = GameObject & { 
    type: EnemyType; 
    hp: number; 
    maxHp: number; 
    speed: number; 
    color: string; 
    rotation: number; 
    lastFireTime: number; 
    eyeY: number; 
    shield?: number; // For DEFENDER type
};

export type Item = GameObject & { type: ItemType; speed: number; pulse: number; };
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number; };
export type Drone = { offsetX: number; offsetY: number; };

export type Dialogue = { portrait: 'PILOT' | 'COMMANDER' | 'BOSS'; text: string; name: string; };
