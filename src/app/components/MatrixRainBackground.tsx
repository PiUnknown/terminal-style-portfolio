import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface MatrixRainBackgroundProps {
  isActive: boolean;
  themeDot?: string;
  onToggle: () => void;
}

const GLYPHS =
  "日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>+*#=~§±";

export function MatrixRainBackground({ isActive, themeDot = "#00ff41", onToggle }: MatrixRainBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keyboard Escape listener to turn off matrix wallpaper
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onToggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onToggle]);

  // Canvas Animation Loop
  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const fontSize = 15;
    const columns = Math.floor(width / fontSize);
    const drops: number[] = [];
    const speeds: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -height);
      speeds[i] = Math.random() * 0.5 + 0.65;
    }

    let lastDrawTime = performance.now();

    const draw = (currentTime: number) => {
      const elapsed = currentTime - lastDrawTime;

      // 30 FPS target for background ambient rain (low power usage)
      if (elapsed >= 33) {
        lastDrawTime = currentTime;

        // Semi-transparent fade background
        ctx.fillStyle = "rgba(10, 15, 10, 0.15)";
        ctx.fillRect(0, 0, width, height);

        ctx.font = `${fontSize}px 'JetBrains Mono', monospace`;

        for (let i = 0; i < drops.length; i++) {
          const char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;

          // Bright leader glyph
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = themeDot;
          ctx.shadowBlur = 6;
          ctx.fillText(char, x, y);
          ctx.shadowBlur = 0;

          // Fading trailing glyph
          if (y > fontSize) {
            ctx.fillStyle = themeDot;
            const prevChar = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            ctx.fillText(prevChar, x, y - fontSize);
          }

          if (y > height && Math.random() > 0.98) {
            drops[i] = 0;
          }

          drops[i] += speeds[i];
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, themeDot]);

  if (!isActive) return null;

  return (
    <>
      {/* Background Canvas Layer */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-35 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Floating Active Matrix HUD Badge */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25 }}
          className="fixed bottom-14 right-4 z-40 hidden sm:flex items-center gap-2 px-3 py-1.5 border border-primary/40 bg-background/90 backdrop-blur-md text-xs shadow-lg"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full animate-ping"
            style={{ backgroundColor: themeDot }}
          />
          <span className="text-foreground text-[11px]">MATRIX WALLPAPER ACTIVE</span>
          <button
            onClick={onToggle}
            className="ml-2 text-[10px] text-primary hover:underline px-1.5 py-0.5 border border-primary/30 bg-primary/10"
          >
            DISMISS [ESC]
          </button>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
