import {
  ALL_DIRS,
  BULLET_SIZE,
  BULLET_SPEED,
  DIR_VECTORS,
  ENEMY_FIRE_COOLDOWN,
  ENEMY_SPAWNS,
  ENEMY_SPEED,
  GAME_HEIGHT,
  GAME_WIDTH,
  LEVELS,
  MAP_COLS,
  MAP_ROWS,
  PLAYER_FIRE_COOLDOWN,
  PLAYER_SPAWN,
  PLAYER_SPEED,
  PLAYER_START_LIVES,
  TANK_SIZE,
  TILE,
  TOTAL_LEVELS,
} from "./constants";
import type {
  Bullet,
  Direction,
  GameMap,
  GameState,
  Tank,
  Tile,
  TileType,
} from "./types";

let idSeq = 1;
const nextId = () => idSeq++;

/** 生成本关地图 */
export function buildMap(level: number): GameMap {
  const layout = LEVELS[(level - 1) % LEVELS.length];
  const tiles: Tile[][] = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    const row: Tile[] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      const ch = layout[r]?.[c] ?? ".";
      let type: TileType = "empty";
      if (ch === "#") type = "brick";
      else if (ch === "@") type = "steel";
      else if (ch === "B") type = "base";
      row.push({ type, hp: type === "brick" ? 1 : type === "steel" ? 999 : 1 });
    }
    tiles.push(row);
  }
  return { cols: MAP_COLS, rows: MAP_ROWS, tileSize: TILE, tiles };
}

function createTank(
  x: number,
  y: number,
  dir: Direction,
  isPlayer: boolean,
  level: number,
): Tank {
  const speed = isPlayer ? PLAYER_SPEED : ENEMY_SPEED + (level - 1) * 0.15;
  return {
    id: nextId(),
    x,
    y,
    size: TANK_SIZE,
    dir,
    speed,
    cooldown: 0,
    isPlayer,
    hp: 1,
    moveTimer: 0,
    aiDir: "down",
    spawnTimer: isPlayer ? 0 : 40,
  };
}

export function createInitialState(level = 1): GameState {
  const total = 4 + level * 2; // 本关敌人总数
  return {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    player: createTank(PLAYER_SPAWN.x, PLAYER_SPAWN.y, "up", true, level),
    enemies: [],
    bullets: [],
    map: buildMap(level),
    status: "ready",
    score: 0,
    lives: PLAYER_START_LIVES,
    level,
    enemiesRemaining: total,
    maxEnemiesOnField: Math.min(4, 2 + level),
    spawnCooldown: 90,
    explosionTimer: 0,
    message: "",
  };
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

/** 判断坦克在给定位置是否与地图/其他坦克发生碰撞 */
function tankBlocked(
  state: GameState,
  x: number,
  y: number,
  size: number,
  selfId: number,
): boolean {
  // 边界
  if (x < 0 || y < 0 || x + size > state.width || y + size > state.height) {
    return true;
  }
  // 与地图碰撞（只考虑砖块/钢块/基地）
  const map = state.map;
  const c0 = Math.floor(x / map.tileSize);
  const c1 = Math.floor((x + size - 1) / map.tileSize);
  const r0 = Math.floor(y / map.tileSize);
  const r1 = Math.floor((y + size - 1) / map.tileSize);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const t = map.tiles[r]?.[c];
      if (t && t.type !== "empty") return true;
    }
  }
  // 与其他坦克碰撞
  const others = [state.player, ...state.enemies];
  for (const o of others) {
    if (o.id === selfId) continue;
    if ((o.spawnTimer ?? 0) > 0) continue;
    if (rectsOverlap(x, y, size, size, o.x, o.y, o.size, o.size)) return true;
  }
  return false;
}

function tryMove(state: GameState, tank: Tank, dir: Direction) {
  tank.dir = dir;
  const v = DIR_VECTORS[dir];
  const nx = tank.x + v.x * tank.speed;
  const ny = tank.y + v.y * tank.speed;
  if (!tankBlocked(state, nx, ny, tank.size, tank.id)) {
    tank.x = nx;
    tank.y = ny;
  }
}

function fire(state: GameState, tank: Tank) {
  if (tank.cooldown > 0) return;
  // 场上限制玩家子弹数量
  const own = state.bullets.filter((b) => b.ownerId === tank.id).length;
  if (tank.isPlayer && own >= 2) return;
  if (!tank.isPlayer && own >= 1) return;

  const v = DIR_VECTORS[tank.dir];
  const cx = tank.x + tank.size / 2 + v.x * (tank.size / 2);
  const cy = tank.y + tank.size / 2 + v.y * (tank.size / 2);
  state.bullets.push({
    id: nextId(),
    x: cx - BULLET_SIZE / 2,
    y: cy - BULLET_SIZE / 2,
    size: BULLET_SIZE,
    dir: tank.dir,
    speed: BULLET_SPEED,
    isPlayer: tank.isPlayer,
    ownerId: tank.id,
  });
  tank.cooldown = tank.isPlayer ? PLAYER_FIRE_COOLDOWN : ENEMY_FIRE_COOLDOWN;
}

function explodeBase(state: GameState) {
  state.status = "gameover";
  state.message = "基地被摧毁！";
}

/** 子弹与地图/坦克的碰撞处理 */
function updateBullets(state: GameState) {
  const map = state.map;
  const remaining: Bullet[] = [];

  for (const b of state.bullets) {
    const v = DIR_VECTORS[b.dir];
    let steps = Math.ceil(b.speed);
    let alive = true;
    while (steps-- > 0 && alive) {
      b.x += v.x;
      b.y += v.y;

      // 边界
      if (b.x < 0 || b.y < 0 || b.x + b.size > state.width || b.y + b.size > state.height) {
        alive = false;
        break;
      }

      // 子弹之间的碰撞（玩家子弹可击落敌人子弹）
      for (const o of state.bullets) {
        if (o.id === b.id || !o.isPlayer === !b.isPlayer) continue;
        if (
          rectsOverlap(b.x, b.y, b.size, b.size, o.x, o.y, o.size, o.size)
        ) {
          o.x = -9999; // 标记移除
          alive = false;
          break;
        }
      }
      if (!alive) break;

      // 地图碰撞
      const cx = b.x + b.size / 2;
      const cy = b.y + b.size / 2;
      const c = Math.floor(cx / map.tileSize);
      const r = Math.floor(cy / map.tileSize);
      const tile = map.tiles[r]?.[c];
      if (tile && tile.type !== "empty") {
        if (tile.type === "brick") {
          tile.type = "empty";
          state.score += 0; // 砖块不得分
        } else if (tile.type === "steel") {
          // 钢块不摧毁
        } else if (tile.type === "base") {
          explodeBase(state);
        }
        alive = false;
        break;
      }

      // 坦克碰撞
      if (b.isPlayer) {
        for (const e of state.enemies) {
          if ((e.spawnTimer ?? 0) > 0) continue;
          if (rectsOverlap(b.x, b.y, b.size, b.size, e.x, e.y, e.size, e.size)) {
            e.hp -= 1;
            alive = false;
            state.explosionTimer = 12;
            if (e.hp <= 0) {
              state.enemies = state.enemies.filter((t) => t.id !== e.id);
              state.score += 100;
              state.enemiesRemaining = Math.max(0, state.enemiesRemaining - 1);
            }
            break;
          }
        }
      } else {
        const p = state.player;
        if (rectsOverlap(b.x, b.y, b.size, b.size, p.x, p.y, p.size, p.size)) {
          alive = false;
          hitPlayer(state);
        }
      }
    }
    if (alive) remaining.push(b);
  }

  state.bullets = remaining.filter((b) => b.x > -9000);
}

function hitPlayer(state: GameState) {
  state.lives -= 1;
  state.explosionTimer = 20;
  const s = state.player;
  s.x = PLAYER_SPAWN.x;
  s.y = PLAYER_SPAWN.y;
  s.dir = "up";
  state.bullets = state.bullets.filter((b) => !b.isPlayer);
  if (state.lives <= 0) {
    state.status = "gameover";
    state.message = "游戏结束！";
  }
}

/** 敌人 AI：随机改变方向，倾向朝基地/玩家移动并射击 */
function updateEnemies(state: GameState) {
  for (const e of state.enemies) {
    if ((e.spawnTimer ?? 0) > 0) {
      e.spawnTimer = (e.spawnTimer ?? 0) - 1;
      continue;
    }
    if (e.cooldown > 0) e.cooldown -= 1;

    e.moveTimer = (e.moveTimer ?? 0) - 1;
    if ((e.moveTimer ?? 0) <= 0) {
      const dirs = ALL_DIRS.slice();
      // 50% 概率朝基地（向下）方向偏好
      if (Math.random() < 0.5) {
        e.aiDir = Math.random() < 0.6 ? "down" : dirs[Math.floor(Math.random() * dirs.length)];
      } else {
        e.aiDir = dirs[Math.floor(Math.random() * dirs.length)];
      }
      e.moveTimer = 30 + Math.floor(Math.random() * 60);
    }

    const dir = e.aiDir ?? "down";
    const beforeX = e.x;
    const beforeY = e.y;
    tryMove(state, e, dir);
    // 撞墙则立刻换方向
    if (Math.abs(e.x - beforeX) < 0.01 && Math.abs(e.y - beforeY) < 0.01) {
      e.moveTimer = 0;
    }

    if (Math.random() < 0.02) fire(state, e);
  }
}

export function update(state: GameState) {
  if (state.status !== "playing") return;

  if (state.explosionTimer > 0) state.explosionTimer -= 1;

  // 敌人炮塔冷却与玩家冷却
  if (state.player.cooldown > 0) state.player.cooldown -= 1;

  updateEnemies(state);
  updateBullets(state);

  // 生成敌人
  const onField = state.enemies.length;
  const spawned = state.enemiesRemaining; // 含场上剩余
  if (spawned > onField && onField < state.maxEnemiesOnField) {
    state.spawnCooldown -= 1;
    if (state.spawnCooldown <= 0) {
      const spawn = ENEMY_SPAWNS[Math.floor(Math.random() * ENEMY_SPAWNS.length)];
      const occupied = state.enemies.some(
        (e) =>
          Math.abs(e.x - spawn.x) < TANK_SIZE && Math.abs(e.y - spawn.y) < TANK_SIZE,
      );
      if (!occupied) {
        state.enemies.push(createTank(spawn.x, spawn.y, "down", false, state.level));
        state.spawnCooldown = 120;
      }
    }
  }

  // 通关判定：本关敌人全部消灭
  if (state.enemies.length === 0 && state.enemiesRemaining <= 0) {
    if (state.level >= TOTAL_LEVELS) {
      state.status = "win";
      state.message = "恭喜通关！";
    } else {
      state.status = "levelclear";
      state.message = `第 ${state.level} 关完成！`;
    }
  }
}

export function startGame(state: GameState) {
  if (state.status === "ready" || state.status === "paused") {
    state.status = "playing";
    state.message = "";
  }
}

export function goToNextLevel(state: GameState) {
  const next = createInitialState(state.level + 1);
  next.score = state.score;
  next.lives = state.lives;
  next.status = "playing";
  Object.assign(state, next);
}

export function restartGame(state: GameState) {
  Object.assign(state, createInitialState(1));
  state.status = "playing";
}

/** 玩家输入 */
export function playerInput(
  state: GameState,
  input: {
    dir?: Direction;
    fire?: boolean;
  },
) {
  if (state.status !== "playing") return;
  const p = state.player;
  if (input.dir) {
    tryMove(state, p, input.dir);
  }
  if (input.fire) {
    fire(state, p);
  }
}
