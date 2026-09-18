export type Direction = "up" | "down" | "left" | "right";

export interface Tank {
  id: number;
  x: number;
  y: number;
  size: number;
  dir: Direction;
  speed: number;
  cooldown: number; // 距离下次可开火的剩余帧数
  isPlayer: boolean;
  hp: number;
  /** 敌人 AI：决定接下来往哪个方向走的剩余帧数 */
  moveTimer?: number;
  /** 敌人 AI：当前想要移动的方向 */
  aiDir?: Direction;
  /** 敌人生成动画剩余帧数（>0 时无敌且不参与碰撞） */
  spawnTimer?: number;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  size: number;
  dir: Direction;
  speed: number;
  isPlayer: boolean;
  ownerId: number;
}

export type TileType = "empty" | "brick" | "steel" | "base";

export interface Tile {
  type: TileType;
  /** 砖块被击碎前的耐久 */
  hp: number;
}

export interface GameMap {
  cols: number;
  rows: number;
  tileSize: number;
  tiles: Tile[][]; // tiles[row][col]
}

export type GameStatus = "ready" | "playing" | "paused" | "levelclear" | "gameover" | "win";

export interface GameState {
  width: number;
  height: number;
  player: Tank;
  enemies: Tank[];
  bullets: Bullet[];
  map: GameMap;
  status: GameStatus;
  score: number;
  lives: number;
  level: number;
  enemiesRemaining: number; // 本关还需消灭的敌人总数（含场上）
  maxEnemiesOnField: number;
  spawnCooldown: number; // 距下次生成敌人剩余帧数
  explosionTimer: number;
  message: string;
}
