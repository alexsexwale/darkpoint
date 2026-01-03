"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export type ParticlePreset = "fire" | "sparkle" | "gold-dust" | "crown-jewels" | "confetti" | "magic";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
  shape: "circle" | "square" | "star" | "diamond";
}

interface ParticleConfig {
  colors: string[];
  particleCount: number;
  speed: number;
  sizeRange: [number, number];
  lifeRange: [number, number];
  gravity: number;
  spread: number;
  shapes: Array<"circle" | "square" | "star" | "diamond">;
  glow: boolean;
  glowIntensity: number;
}

const PRESETS: Record<ParticlePreset, ParticleConfig> = {
  fire: {
    colors: ["#ff6600", "#ff3300", "#ffaa00", "#ff0000", "#ffcc00"],
    particleCount: 30,
    speed: 2,
    sizeRange: [2, 6],
    lifeRange: [30, 60],
    gravity: -0.05, // Float upward
    spread: 0.5,
    shapes: ["circle"],
    glow: true,
    glowIntensity: 15,
  },
  sparkle: {
    colors: ["#ffffff", "#fff700", "#ffd700", "#ffffaa"],
    particleCount: 25,
    speed: 1.5,
    sizeRange: [1, 4],
    lifeRange: [20, 50],
    gravity: 0.02,
    spread: 1,
    shapes: ["star", "circle"],
    glow: true,
    glowIntensity: 10,
  },
  "gold-dust": {
    colors: ["#daa520", "#ffd700", "#b8860b", "#ffdf00", "#fff8dc"],
    particleCount: 40,
    speed: 0.8,
    sizeRange: [1, 3],
    lifeRange: [40, 80],
    gravity: 0.03,
    spread: 0.8,
    shapes: ["circle", "diamond"],
    glow: true,
    glowIntensity: 8,
  },
  "crown-jewels": {
    colors: ["#ff0000", "#00ff00", "#0000ff", "#ffd700", "#ff00ff", "#00ffff"],
    particleCount: 20,
    speed: 1,
    sizeRange: [3, 6],
    lifeRange: [50, 90],
    gravity: 0.01,
    spread: 1.2,
    shapes: ["diamond", "star"],
    glow: true,
    glowIntensity: 12,
  },
  confetti: {
    colors: ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dfe6e9", "#fd79a8"],
    particleCount: 100,
    speed: 3,
    sizeRange: [4, 10],
    lifeRange: [80, 150],
    gravity: 0.1,
    spread: 2,
    shapes: ["square", "circle"],
    glow: false,
    glowIntensity: 0,
  },
  magic: {
    colors: ["#9b59b6", "#8e44ad", "#e74c3c", "#3498db", "#1abc9c", "#f39c12"],
    particleCount: 35,
    speed: 1.2,
    sizeRange: [2, 5],
    lifeRange: [40, 70],
    gravity: -0.02,
    spread: 1.5,
    shapes: ["star", "circle", "diamond"],
    glow: true,
    glowIntensity: 12,
  },
};

interface ParticleEmitterProps {
  preset?: ParticlePreset;
  customConfig?: Partial<ParticleConfig>;
  width?: number;
  height?: number;
  active?: boolean;
  burst?: boolean; // One-time burst mode
  burstCount?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function ParticleEmitter({
  preset = "sparkle",
  customConfig,
  width = 200,
  height = 200,
  active = true,
  burst = false,
  burstCount = 50,
  className,
  style,
}: ParticleEmitterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const hasBurst = useRef(false);

  const config: ParticleConfig = {
    ...PRESETS[preset],
    ...customConfig,
  };

  const createParticle = useCallback(
    (centerX: number, centerY: number): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 0.5 + 0.5) * config.speed;
      const [minSize, maxSize] = config.sizeRange;
      const [minLife, maxLife] = config.lifeRange;
      const life = minLife + Math.random() * (maxLife - minLife);

      return {
        x: centerX + (Math.random() - 0.5) * 20,
        y: centerY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed * config.spread,
        vy: Math.sin(angle) * speed * config.spread,
        size: minSize + Math.random() * (maxSize - minSize),
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        life: life,
        maxLife: life,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        shape: config.shapes[Math.floor(Math.random() * config.shapes.length)],
      };
    },
    [config]
  );

  const drawStar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    rotation: number
  ) => {
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();

    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.closePath();
    ctx.restore();
  };

  const drawDiamond = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    rotation: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.7, 0);
    ctx.closePath();
    ctx.restore();
  };

  const drawParticle = useCallback(
    (ctx: CanvasRenderingContext2D, particle: Particle) => {
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;

      if (config.glow) {
        ctx.shadowBlur = config.glowIntensity;
        ctx.shadowColor = particle.color;
      }

      ctx.fillStyle = particle.color;

      switch (particle.shape) {
        case "circle":
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "square":
          ctx.save();
          ctx.translate(particle.x, particle.y);
          ctx.rotate(particle.rotation);
          ctx.fillRect(
            -particle.size,
            -particle.size,
            particle.size * 2,
            particle.size * 2
          );
          ctx.restore();
          break;
        case "star":
          drawStar(ctx, particle.x, particle.y, particle.size, particle.rotation);
          ctx.fill();
          break;
        case "diamond":
          drawDiamond(ctx, particle.x, particle.y, particle.size, particle.rotation);
          ctx.fill();
          break;
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    },
    [config.glow, config.glowIntensity]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = width / 2;
    const centerY = height / 2;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Add new particles (continuous mode)
      if (active && !burst && Math.random() < 0.3) {
        if (particlesRef.current.length < config.particleCount) {
          particlesRef.current.push(createParticle(centerX, centerY));
        }
      }

      // Burst mode - create all particles at once
      if (burst && !hasBurst.current && active) {
        hasBurst.current = true;
        for (let i = 0; i < burstCount; i++) {
          particlesRef.current.push(createParticle(centerX, centerY));
        }
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += config.gravity;
        particle.life -= 1;
        particle.rotation += particle.rotationSpeed;

        if (particle.life > 0) {
          drawParticle(ctx, particle);
          return true;
        }
        return false;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, burst, burstCount, config, createParticle, drawParticle, width, height]);

  // Reset burst state when active changes
  useEffect(() => {
    if (!active) {
      hasBurst.current = false;
    }
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn("pointer-events-none", className)}
      style={style}
    />
  );
}

// Confetti Burst Hook - For celebrations
export function useConfettiBurst() {
  const triggerConfetti = useCallback((element?: HTMLElement) => {
    const container = element || document.body;
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];
    const config = PRESETS.confetti;

    // Create burst of particles
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 0.5 + 0.5) * config.speed * 3;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: Math.cos(angle) * speed * 2,
        vy: Math.sin(angle) * speed * 2 - 5,
        size: 4 + Math.random() * 8,
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        life: 100 + Math.random() * 100,
        maxLife: 200,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        shape: Math.random() > 0.5 ? "square" : "circle",
      });
    }

    let frame = 0;
    const maxFrames = 200;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // Gravity
        p.life -= 1;
        p.rotation += p.rotationSpeed;
        p.vx *= 0.99; // Air resistance

        if (p.life > 0) {
          ctx.globalAlpha = p.life / p.maxLife;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        } else {
          particles.splice(i, 1);
        }
      });

      frame++;
      if (frame < maxFrames && particles.length > 0) {
        requestAnimationFrame(animate);
      } else {
        container.removeChild(canvas);
      }
    };

    animate();
  }, []);

  return { triggerConfetti };
}

