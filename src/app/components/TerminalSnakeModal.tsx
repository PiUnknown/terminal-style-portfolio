import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { triggerHaptic } from "../utils/haptics";

interface TerminalSnakeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };
type Difficulty = "normal" | "fast" | "glitch";
type WallMode = "wrap" | "solid";

const GRID_SIZE = 20;

const DIFFICULTY_SETTINGS: Record<Difficulty, { label: string; speed: number; scoreMult: number }> = {
  normal: { label: "NORMAL", speed: 105, scoreMult: 1 },
  fast: { label: "TURBO", speed: 70, scoreMult: 1.5 },
  glitch: { label: "OVERCLOCK", speed: 45, scoreMult: 2 },
};

const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

// 8-bit Retro Audio Synthesizer (Zero external audio files needed)
class SoundFX {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playEat() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {
      // Ignore audio context errors
    }
  }

  playDie() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.26);
    } catch {
      // Ignore audio context errors
    }
  }

  playStart() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [330, 440, 660];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        const startTime = this.ctx.currentTime + idx * 0.06;
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.06);
      });
    } catch {
      // Ignore audio context errors
    }
  }
}

const sfx = new SoundFX();

export function TerminalSnakeModal({ isOpen, onClose }: TerminalSnakeModalProps) {
  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const [direction, setDirection] = useState<Direction>("UP");
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [gameState, setGameState] = useState<"IDLE" | "PLAYING" | "PAUSED" | "GAMEOVER">("IDLE");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [wallMode, setWallMode] = useState<WallMode>("wrap");
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [isNewHighScore, setIsNewHighScore] = useState<boolean>(false);

  const directionQueueRef = useRef<Direction[]>([]);
  const currentDirectionRef = useRef<Direction>("UP");
  const moveIntervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load high score from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("terminal_snake_highscore");
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const spawnFood = useCallback((currentSnake: Point[]): Point => {
    while (true) {
      const candidate: Point = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const hit = currentSnake.some((seg) => seg.x === candidate.x && seg.y === candidate.y);
      if (!hit) return candidate;
    }
  }, []);

  const startGame = useCallback(() => {
    const initialSnake: Point[] = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    setSnake(initialSnake);
    setDirection("UP");
    currentDirectionRef.current = "UP";
    directionQueueRef.current = [];
    setFood(spawnFood(initialSnake));
    setScore(0);
    setIsNewHighScore(false);
    setGameState("PLAYING");
    sfx.playStart();
    triggerHaptic("selection");
  }, [spawnFood]);

  const queueDirection = useCallback((newDir: Direction) => {
    const lastQueued = directionQueueRef.current.length > 0
      ? directionQueueRef.current[directionQueueRef.current.length - 1]
      : currentDirectionRef.current;

    if (newDir !== lastQueued && newDir !== OPPOSITE_DIRECTIONS[lastQueued]) {
      if (directionQueueRef.current.length < 2) {
        directionQueueRef.current.push(newDir);
      }
    }
  }, []);

  // Handle Game Loop
  useEffect(() => {
    if (gameState !== "PLAYING") {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
      return;
    }

    const currentSpeed = DIFFICULTY_SETTINGS[difficulty].speed;

    moveIntervalRef.current = window.setInterval(() => {
      setSnake((prevSnake) => {
        // Dequeue next direction if available
        if (directionQueueRef.current.length > 0) {
          const nextDir = directionQueueRef.current.shift()!;
          currentDirectionRef.current = nextDir;
          setDirection(nextDir);
        }

        const head = prevSnake[0];
        const dir = currentDirectionRef.current;

        let rawX = head.x;
        let rawY = head.y;

        switch (dir) {
          case "UP":
            rawY = head.y - 1;
            break;
          case "DOWN":
            rawY = head.y + 1;
            break;
          case "LEFT":
            rawX = head.x - 1;
            break;
          case "RIGHT":
            rawX = head.x + 1;
            break;
        }

        let newHead: Point;

        if (wallMode === "wrap") {
          // Wrap around to parallel opposite side
          newHead = {
            x: (rawX + GRID_SIZE) % GRID_SIZE,
            y: (rawY + GRID_SIZE) % GRID_SIZE,
          };
        } else {
          // Solid walls collision
          if (rawX < 0 || rawX >= GRID_SIZE || rawY < 0 || rawY >= GRID_SIZE) {
            handleGameOver();
            return prevSnake;
          }
          newHead = { x: rawX, y: rawY };
        }

        const isEating = newHead.x === food.x && newHead.y === food.y;

        // Check Self Collision (ignoring the tail segment if it is about to move away)
        const bodyToCheck = isEating ? prevSnake : prevSnake.slice(0, -1);
        if (bodyToCheck.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
          handleGameOver();
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check Food Collision
        if (isEating) {
          sfx.playEat();
          triggerHaptic("medium");
          const gained = Math.round(10 * DIFFICULTY_SETTINGS[difficulty].scoreMult);
          setScore((s) => {
            const nextScore = s + gained;
            setHighScore((currHigh) => {
              if (nextScore > currHigh) {
                try {
                  localStorage.setItem("terminal_snake_highscore", nextScore.toString());
                } catch {
                  // ignore
                }
                setIsNewHighScore(true);
                return nextScore;
              }
              return currHigh;
            });
            return nextScore;
          });
          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, currentSpeed);

    return () => {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, [gameState, food, difficulty, wallMode, spawnFood]);

  const handleGameOver = () => {
    sfx.playDie();
    triggerHaptic("warning");
    setGameState("GAMEOVER");
    if (isNewHighScore) {
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#00ff41", "#00d4ff", "#ff2a8d"],
        });
      } catch {
        // ignore
      }
    }
  };

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "m" || e.key === "M") {
        if (gameState !== "IDLE") {
          setGameState("IDLE");
          return;
        }
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (gameState === "IDLE" || gameState === "GAMEOVER") {
          startGame();
        } else if (gameState === "PLAYING") {
          setGameState("PAUSED");
        } else if (gameState === "PAUSED") {
          setGameState("PLAYING");
        }
        return;
      }

      if (gameState !== "PLAYING") return;

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        queueDirection("UP");
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        queueDirection("DOWN");
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault();
        queueDirection("LEFT");
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault();
        queueDirection("RIGHT");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, gameState, queueDirection, startGame, onClose]);

  // Touch/D-Pad controller
  const handleDirectionPress = (dir: Direction) => {
    triggerHaptic("light");
    if (gameState === "IDLE" || gameState === "GAMEOVER") {
      startGame();
    }
    queueDirection(dir);
  };

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cellSize = width / GRID_SIZE;

    // Clear background
    ctx.fillStyle = "#070c07";
    ctx.fillRect(0, 0, width, height);

    // Draw subtle grid lines
    ctx.strokeStyle = "rgba(0, 255, 65, 0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(width, i * cellSize);
      ctx.stroke();
    }

    // Draw food with glowing pulse
    const fx = food.x * cellSize;
    const fy = food.y * cellSize;

    ctx.fillStyle = "rgba(0, 255, 65, 0.25)";
    ctx.fillRect(fx - 2, fy - 2, cellSize + 4, cellSize + 4);

    ctx.fillStyle = "#00ff41";
    ctx.shadowColor = "#00ff41";
    ctx.shadowBlur = 10;
    ctx.fillRect(fx + 2, fy + 2, cellSize - 4, cellSize - 4);
    ctx.shadowBlur = 0;

    // Draw snake body
    snake.forEach((seg, idx) => {
      const sx = seg.x * cellSize;
      const sy = seg.y * cellSize;

      if (idx === 0) {
        // Snake Head
        ctx.fillStyle = "#00ff41";
        ctx.shadowColor = "#00ff41";
        ctx.shadowBlur = 12;
        ctx.fillRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);
        ctx.shadowBlur = 0;

        // Draw small eye pixels
        ctx.fillStyle = "#050a05";
        if (direction === "UP" || direction === "DOWN") {
          ctx.fillRect(sx + 3, sy + (direction === "UP" ? 3 : cellSize - 5), 2, 2);
          ctx.fillRect(sx + cellSize - 5, sy + (direction === "UP" ? 3 : cellSize - 5), 2, 2);
        } else {
          ctx.fillRect(sx + (direction === "LEFT" ? 3 : cellSize - 5), sy + 3, 2, 2);
          ctx.fillRect(sx + (direction === "LEFT" ? 3 : cellSize - 5), sy + cellSize - 5, 2, 2);
        }
      } else {
        // Snake Body segment with fading opacity towards tail
        const alpha = Math.max(0.4, 1 - (idx / snake.length) * 0.55);
        ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
        ctx.fillRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4);
      }
    });
  }, [snake, food, direction]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg border border-primary/40 bg-card text-foreground shadow-2xl overflow-hidden flex flex-col"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-border bg-secondary/80 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-destructive/80" />
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary/80" />
              <span className="text-muted-foreground ml-2">~/arcade/snake.sh</span>
              <span className="text-primary font-bold hidden sm:inline">
                [{gameState}]
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {gameState !== "IDLE" && (
                <button
                  onClick={() => setGameState("IDLE")}
                  className="text-xs text-primary hover:underline px-1.5 py-0.5 border border-primary/40 bg-primary/10 transition-colors"
                  title="Return to Main Menu & Settings [M]"
                >
                  ⚙ MENU
                </button>
              )}
              <button
                onClick={() => {
                  const nextMute = !soundMuted;
                  setSoundMuted(nextMute);
                  sfx.enabled = !nextMute;
                }}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                title={soundMuted ? "Unmute sound" : "Mute sound"}
              >
                {soundMuted ? "🔇" : "🔊"}
              </button>
              <button
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 py-0.5 border border-border transition-colors"
              >
                ESC / ✕
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-2 border-b border-border bg-background/60 p-2.5 text-center text-xs">
            <div>
              <div className="text-muted-foreground text-[10px]">SCORE</div>
              <div className="text-primary font-bold text-sm">
                {score.toString().padStart(4, "0")}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-[10px]">HIGH SCORE</div>
              <div className="text-yellow-400 font-bold text-sm">
                {highScore.toString().padStart(4, "0")}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-[10px]">WALLS</div>
              <button
                onClick={() => setWallMode((m) => (m === "wrap" ? "solid" : "wrap"))}
                className="text-[10px] text-accent font-bold hover:underline"
                title="Click to toggle wrap-around vs solid walls"
              >
                {wallMode === "wrap" ? "WRAP-THRU" : "SOLID"}
              </button>
            </div>
            <div>
              <div className="text-muted-foreground text-[10px]">SPEED</div>
              <button
                onClick={() => {
                  const modes: Difficulty[] = ["normal", "fast", "glitch"];
                  const nextIdx = (modes.indexOf(difficulty) + 1) % modes.length;
                  setDifficulty(modes[nextIdx]);
                }}
                className="text-primary font-bold text-xs uppercase mt-0.5 hover:underline"
                title="Click to cycle difficulty"
              >
                {DIFFICULTY_SETTINGS[difficulty].label}
              </button>
            </div>
          </div>

          {/* Canvas Viewport Container */}
          <div className="relative flex items-center justify-center p-3 bg-black/40">
            <canvas
              ref={canvasRef}
              width={360}
              height={360}
              className="w-full max-w-[340px] aspect-square border border-primary/30 bg-[#060a06] shadow-inner"
            />

            {/* Overlay Screens */}
            {gameState === "IDLE" && (
              <div className="absolute inset-0 m-3 flex flex-col items-center justify-center bg-black/85 text-center p-4">
                <div
                  className="text-2xl font-bold text-primary mb-1 tracking-wider"
                  style={{ fontFamily: "'VT323', monospace" }}
                >
                  TERMINAL SNAKE v1.1
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  Pass through boundaries freely • Avoid biting tail
                </div>

                {/* Settings Selectors */}
                <div className="flex flex-col gap-2 mb-4 items-center">
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[10px] text-muted-foreground mr-1">SPEED:</span>
                    {(["normal", "fast", "glitch"] as Difficulty[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setDifficulty(mode)}
                        className={`text-[10px] px-2 py-0.5 border transition-colors ${
                          difficulty === mode
                            ? "border-primary bg-primary/20 text-primary font-bold"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {DIFFICULTY_SETTINGS[mode].label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-1.5 items-center">
                    <span className="text-[10px] text-muted-foreground mr-1">WALLS:</span>
                    <button
                      onClick={() => setWallMode("wrap")}
                      className={`text-[10px] px-2 py-0.5 border transition-colors ${
                        wallMode === "wrap"
                          ? "border-primary bg-primary/20 text-primary font-bold"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      WRAP-THROUGH (CLASSIC)
                    </button>
                    <button
                      onClick={() => setWallMode("solid")}
                      className={`text-[10px] px-2 py-0.5 border transition-colors ${
                        wallMode === "solid"
                          ? "border-primary bg-primary/20 text-primary font-bold"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      SOLID
                    </button>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="px-4 py-2 border border-primary bg-primary/10 text-primary hover:bg-primary hover:text-black font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                >
                  [ PRESS SPACE OR CLICK TO START ]
                </button>
              </div>
            )}

            {gameState === "PAUSED" && (
              <div className="absolute inset-0 m-3 flex flex-col items-center justify-center bg-black/80 text-center p-4">
                <div
                  className="text-2xl font-bold text-yellow-400 mb-2"
                  style={{ fontFamily: "'VT323', monospace" }}
                >
                  PROCESS SUSPENDED
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                  SIGSTOP received. Press SPACE to resume.
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => setGameState("PLAYING")}
                    className="px-3 py-1.5 border border-primary bg-primary/20 text-primary text-xs font-bold hover:bg-primary hover:text-black transition-colors"
                  >
                    RESUME [SPACE]
                  </button>
                  <button
                    onClick={() => setGameState("IDLE")}
                    className="px-3 py-1.5 border border-border bg-secondary text-muted-foreground text-xs font-bold hover:text-primary hover:border-primary transition-colors"
                  >
                    ⚙ MAIN MENU [M]
                  </button>
                </div>
              </div>
            )}

            {gameState === "GAMEOVER" && (
              <div className="absolute inset-0 m-3 flex flex-col items-center justify-center bg-black/90 text-center p-4">
                <div
                  className="text-3xl font-bold text-destructive mb-1 animate-pulse"
                  style={{ fontFamily: "'VT323', monospace" }}
                >
                  SEGMENTATION FAULT
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  Self-collision detected: memory corrupted
                </div>

                <div className="bg-secondary/60 border border-border p-2 mb-4 w-48 text-center text-xs">
                  <div className="text-muted-foreground text-[10px]">FINAL SCORE</div>
                  <div className="text-primary font-bold text-lg">{score}</div>
                  {isNewHighScore && (
                    <div className="text-yellow-400 text-[10px] font-bold mt-0.5">
                      ★ NEW RECORD ACHIEVED ★
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap justify-center">
                  <button
                    onClick={startGame}
                    className="px-3 py-2 border border-primary bg-primary/20 text-primary hover:bg-primary hover:text-black font-bold text-xs transition-all"
                  >
                    REBOOT [SPACE]
                  </button>
                  <button
                    onClick={() => setGameState("IDLE")}
                    className="px-3 py-2 border border-border bg-secondary text-muted-foreground hover:text-primary hover:border-primary font-bold text-xs transition-all"
                  >
                    ⚙ MAIN MENU [M]
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Touch / D-Pad on-screen controls for mobile */}
          <div className="p-3 border-t border-border bg-secondary/30 flex flex-col items-center gap-2">
            <div className="text-[10px] text-muted-foreground text-center hidden sm:block">
              Controls: <span className="text-primary">[W A S D]</span> or{" "}
              <span className="text-primary">[Arrow Keys]</span> •{" "}
              <span className="text-primary">[SPACE]</span> pause •{" "}
              <span className="text-primary">[M]</span> menu •{" "}
              <span className="text-primary">[ESC]</span> exit
            </div>

            {/* Mobile D-Pad */}
            <div className="flex flex-col items-center gap-1 sm:hidden">
              <button
                onClick={() => handleDirectionPress("UP")}
                className="w-12 h-9 border border-border bg-secondary active:bg-primary active:text-black text-xs font-bold"
              >
                ▲
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDirectionPress("LEFT")}
                  className="w-12 h-9 border border-border bg-secondary active:bg-primary active:text-black text-xs font-bold"
                >
                  ◀
                </button>
                <button
                  onClick={() => {
                    if (gameState === "PLAYING") setGameState("PAUSED");
                    else if (gameState === "PAUSED") setGameState("PLAYING");
                    else startGame();
                  }}
                  className="w-12 h-9 border border-primary/50 bg-primary/10 text-primary active:bg-primary active:text-black text-[10px] font-bold"
                >
                  {gameState === "PLAYING" ? "❚❚" : "▶"}
                </button>
                <button
                  onClick={() => handleDirectionPress("RIGHT")}
                  className="w-12 h-9 border border-border bg-secondary active:bg-primary active:text-black text-xs font-bold"
                >
                  ▶
                </button>
              </div>
              <button
                onClick={() => handleDirectionPress("DOWN")}
                className="w-12 h-9 border border-border bg-secondary active:bg-primary active:text-black text-xs font-bold"
              >
                ▼
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
