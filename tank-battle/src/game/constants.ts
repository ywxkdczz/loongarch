import type { Direction } from "./types";

export const TILE = 32; // 每格像素
export const MAP_COLS = 15;
export const MAP_ROWS = 15;
export const GAME_WIDTH = TILE * MAP_COLS; // 480
export const GAME_HEIGHT = TILE * MAP_ROWS; // 480

export const TANK_SIZE = 26;
export const BULLET_SIZE = 6;

export const PLAYER_SPEED = 1.9;
export const ENEMY_SPEED = 1.15;
export const BULLET_SPEED = 5.5;

export const PLAYER_FIRE_COOLDOWN = 22; // 帧
export const ENEMY_FIRE_COOLDOWN = 70;

export const PLAYER_START_LIVES = 3;
export const TOTAL_LEVELS = 3;

/** 玩家出生点（像素坐标，坦克左上角） */
export const PLAYER_SPAWN = {
  x: GAME_WIDTH / 2 - TANK_SIZE / 2,
  y: GAME_HEIGHT - TILE * 2,
};

/** 敌人出生点（像素坐标） */
export const ENEMY_SPAWNS: { x: number; y: number }[] = [
  { x: TILE * 1, y: TILE * 1 },
  { x: GAME_WIDTH / 2 - TANK_SIZE / 2, y: TILE * 1 },
  { x: GAME_WIDTH - TILE * 1 - TANK_SIZE, y: TILE * 1 },
];

export const DIR_VECTORS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const ALL_DIRS: Direction[] = ["up", "down", "left", "right"];

export type LevelLayout = string[];

/**
 * 每关地图布局。
 * '#'=砖块  '@'=钢块  'B'=基地(老鹰)  '.'=空地
 */
export const LEVELS: LevelLayout[] = [
  [
    "...............",
    "..###.....###..",
    "..###.....###..",
    "...............",
    ".#.#.#.#.#.#.#.",
    ".#.#.#.#.#.#.#.",
    "...............",
    "###..#####..###",
    "...............",
    ".#.#.#.#.#.#.#.",
    ".#.#.#.#.#.#.#.",
    "...............",
    "..###.....###..",
    ".......B.......",
    "......###......",
  ],
  [
    "...............",
    ".#...........#.",
    ".#.#########.#.",
    ".#.#.......#.#.",
    "...#.#####.#...",
    ".#.#.#...#.#.#.",
    ".#...#...#...#.",
    ".#.#.#...#.#.#.",
    "...#.#####.#...",
    ".#.#.......#.#.",
    ".#.#########.#.",
    ".#...........#.",
    "......###......",
    ".......B.......",
    "......###......",
  ],
  [
    "...............",
    "##...........##",
    "##.@.#####.@.##",
    "...#.......#...",
    ".#.#.#####.#.#.",
    ".#.#.......#.#.",
    ".#.#######.#.#.",
    ".#.........#.#.",
    ".#.#######.#.#.",
    ".#.#.......#.#.",
    ".#.#.#####.#.#.",
    "...#.......#...",
    "##.@.#####.@.##",
    ".......B.......",
    "......###......",
  ],
];
