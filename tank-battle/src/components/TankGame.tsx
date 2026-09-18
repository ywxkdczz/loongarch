"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createInitialState,
  goToNextLevel,
  playerInput,
  restartGame,
  startGame,
  update,
} from "@/game/engine";
import type { Direction, GameState, Tank, Tile } from "@/game/types";

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

const COLORS = {
  bg: "#0b0f14",
  border: "#3b4a5a",
  player: "#4ade80",
  playerDark: "#166534",
  enemy: "#f87171",
  enemyDark: "#7f1d1d",
  bulletPlayer: "#fef08a",
  bulletEnemy: "#fdba74",
  brick: "#b45309",
  brickLine: "#7c2d12",
  steel: "#94a3b8",
  steelLine: "#475569",
  base: "#facc15",
};

function drawTank(ctx: CanvasRenderingContext2D, t: Tank) {
  const body = t.isPlayer ? COLORS.player : COLORS.enemy;
  const dark = t.isPlayer ? COLORS.playerDark : COLORS.enemyDark;

  // 出生闪烁
  if ((t.spawnTimer ?? 0) > 0 && Math.floor((t.spawnTimer ?? 0) / 5) % 2 === 0) {
    return;
  }

  ctx.save();
  ctx.translate(t.x + t.size / 2, t.y + t.size / 2);
  const angle =
    t.dir === "up" ? 0 : t.dir === "right" ? Math.PI / 2 : t.dir === "down" ? Math.PI : -Math.PI / 2;
  ctx.rotate(angle);

  const s = t.size;
  // 履带
  ctx.fillStyle = dark;
  ctx.fillRect(-s / 2, -s / 2, s * 0.22, s);
  ctx.fillRect(s / 2 - s * 0.22, -s / 2, s * 0.22, s);
  // 车身
  ctx.fillStyle = body;
  ctx.fillRect(-s * 0.3, -s * 0.42, s * 0.6, s * 0.84);
  // 炮塔
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  // 炮管
  ctx.fillStyle = body;
  ctx.fillRect(-s * 0.08, -s / 2 - s * 0.28, s * 0.16, s * 0.5);

  ctx.restore();
}

function drawTile(ctx: CanvasRenderingContext2D, tile: Tile, px: number, py: number, size: number) {
  if (tile.type === "brick") {
    ctx.fillStyle = COLORS.brick;
    ctx.fillRect(px, py, size, size);
    ctx.strokeStyle = COLORS.brickLine;
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(px, py + (size / 4) * i);
      ctx.lineTo(px + size, py + (size / 4) * i);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(px + size / 2, py);
    ctx.lineTo(px + size / 2, py + size / 4);
    ctx.moveTo(px + size / 4, py + size / 4);
    ctx.lineTo(px + size / 4, py + size / 2);
    ctx.moveTo(px + (size * 3) / 4, py + size / 4);
    ctx.lineTo(px + (size * 3) / 4, py + size / 2);
    ctx.moveTo(px + size / 2, py + size / 2);
    ctx.lineTo(px + size / 2, py + (size * 3) / 4);
    ctx.moveTo(px + size / 4, py + (size * 3) / 4);
    ctx.lineTo(px + size / 4, py + size);
    ctx.moveTo(px + (size * 3) / 4, py + (size * 3) / 4);
    ctx.lineTo(px + (size * 3) / 4, py + size);
    ctx.stroke();
  } else if (tile.type === "steel") {
    ctx.fillStyle = COLORS.steel;
    ctx.fillRect(px, py, size, size);
    ctx.strokeStyle = COLORS.steelLine;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
    ctx.beginPath();
    ctx.moveTo(px, py + size / 2);
    ctx.lineTo(px + size, py + size / 2);
    ctx.moveTo(px + size / 2, py);
    ctx.lineTo(px + size / 2, py + size);
    ctx.stroke();
  } else if (tile.type === "base") {
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(px, py, size, size);
    ctx.fillStyle = COLORS.base;
    // 老鹰简笔
    const cx = px + size / 2;
    const cy = py + size / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.35);
    ctx.lineTo(cx + size * 0.3, cy - size * 0.05);
    ctx.lineTo(cx + size * 0.12, cy - size * 0.05);
    ctx.lineTo(cx + size * 0.3, cy + size * 0.35);
    ctx.lineTo(cx, cy + size * 0.12);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.35);
    ctx.lineTo(cx - size * 0.12, cy - size * 0.05);
    ctx.lineTo(cx - size * 0.3, cy - size * 0.05);
    ctx.closePath();
    ctx.fill();
  }
}

function draw(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, state.width, state.height);

  // 地图
  const map = state.map;
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const tile = map.tiles[r][c];
      if (tile.type === "empty") continue;
      drawTile(ctx, tile, c * map.tileSize, r * map.tileSize, map.tileSize);
    }
  }

  drawTank(ctx, state.player);
  for (const e of state.enemies) drawTank(ctx, e);

  // 子弹
  for (const b of state.bullets) {
    ctx.fillStyle = b.isPlayer ? COLORS.bulletPlayer : COLORS.bulletEnemy;
    ctx.beginPath();
    ctx.arc(b.x + b.size / 2, b.y + b.size / 2, b.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 爆炸提示
  if (state.explosionTimer > 0) {
    ctx.fillStyle = `rgba(251, 146, 60, ${state.explosionTimer / 25})`;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  // 状态遮罩
  if (state.status !== "playing") {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 26px sans-serif";
    const { title, tip } = overlayText(state);
    ctx.fillText(title, state.width / 2, state.height / 2 - 18);
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(tip, state.width / 2, state.height / 2 + 22);
  }
}

function overlayText(state: GameState): { title: string; tip: string } {
  switch (state.status) {
    case "ready":
      return { title: "熙熙大战", tip: "按 回车/空格 开始 · 方向键/WASD 移动 · J/空格 开火" };
    case "paused":
      return { title: "已暂停", tip: "按 P 继续" };
    case "levelclear":
      return { title: state.message || "关卡完成", tip: "按 回车 进入下一关" };
    case "gameover":
      return { title: "游戏结束", tip: "按 回车 重新开始" };
    case "win":
      return { title: "胜利！", tip: `最终得分 ${state.score} · 按 回车 再玩一次` };
    default:
      return { title: "", tip: "" };
  }
}

export default function TankGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState(1));
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);

  const [, forceRender] = useState(0);

  // 键盘
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const key = e.key;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(key)) {
        e.preventDefault();
      }

      if (key === "Enter" || key === " ") {
        if (s.status === "ready") startGame(s);
        else if (s.status === "levelclear") goToNextLevel(s);
        else if (s.status === "gameover" || s.status === "win") restartGame(s);
      }
      if (key === "p" || key === "P") {
        if (s.status === "playing") s.status = "paused";
        else if (s.status === "paused") s.status = "playing";
      }

      keysRef.current.add(key);
      forceRender((n) => n + 1);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // 主循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      const s = stateRef.current;
      const keys = keysRef.current;

      if (s.status === "playing") {
        let dir: Direction | undefined;
        for (const [k, d] of Object.entries(KEY_MAP)) {
          if (keys.has(k)) {
            dir = d;
            break;
          }
        }
        const fire = keys.has("j") || keys.has("J") || keys.has(" ");
        if (dir || fire) playerInput(s, { dir, fire });
        update(s);
      }

      draw(ctx, s);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const touch = useCallback((dir: Direction) => {
    const s = stateRef.current;
    if (s.status === "ready") startGame(s);
    playerInput(s, { dir });
  }, []);

  const touchFire = useCallback(() => {
    const s = stateRef.current;
    if (s.status === "ready") startGame(s);
    playerInput(s, { fire: true });
  }, []);

  const state = stateRef.current;

  return (
    <div className="flex flex-col items-center gap-4 py-6 select-none">
      <div className="flex items-center justify-between w-full max-w-[480px] px-1 font-mono text-sm text-slate-300">
        <span>
          分数 <b className="text-emerald-400">{state.score}</b>
        </span>
        <span>
          关卡 <b className="text-sky-400">{state.level}</b>
        </span>
        <span>
          生命 <b className="text-rose-400">{Math.max(0, state.lives)}</b>
        </span>
        <span>
          剩余敌人 <b className="text-amber-400">{state.enemiesRemaining}</b>
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={state.width}
        height={state.height}
        className="rounded-lg border-4 border-slate-600 shadow-2xl shadow-black/50 touch-none"
        style={{ width: "min(480px, 92vw)", height: "auto", imageRendering: "pixelated" }}
      />

      <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-400">
        <span>移动：方向键 / WASD</span>
        <span>·</span>
        <span>开火：J / 空格</span>
        <span>·</span>
        <span>开始/继续：Enter</span>
        <span>·</span>
        <span>暂停：P</span>
      </div>

      {/* 移动端虚拟按键 */}
      <div className="flex items-center gap-8 md:hidden">
        <div className="grid grid-cols-3 grid-rows-3 gap-1">
          <button
            className="col-start-2 row-start-1 w-12 h-12 rounded bg-slate-700 text-white active:bg-slate-500"
            onPointerDown={() => touch("up")}
          >
            ▲
          </button>
          <button
            className="col-start-1 row-start-2 w-12 h-12 rounded bg-slate-700 text-white active:bg-slate-500"
            onPointerDown={() => touch("left")}
          >
            ◀
          </button>
          <button
            className="col-start-3 row-start-2 w-12 h-12 rounded bg-slate-700 text-white active:bg-slate-500"
            onPointerDown={() => touch("right")}
          >
            ▶
          </button>
          <button
            className="col-start-2 row-start-3 w-12 h-12 rounded bg-slate-700 text-white active:bg-slate-500"
            onPointerDown={() => touch("down")}
          >
            ▼
          </button>
        </div>
        <button
          className="w-16 h-16 rounded-full bg-amber-600 text-white font-bold active:bg-amber-400"
          onPointerDown={touchFire}
        >
          开火
        </button>
      </div>
    </div>
  );
}
