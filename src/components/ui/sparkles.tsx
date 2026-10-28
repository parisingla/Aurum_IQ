"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

interface SparklesCoreProps {
  /** Painted behind the particles; leave transparent on tinted surfaces. */
  background?: string;
  /** Smallest particle radius, in CSS pixels. */
  minSize?: number;
  /** Largest particle radius, in CSS pixels. */
  maxSize?: number;
  /** Rough density knob: canvas area ÷ this = particle count. Higher is sparser. */
  particleDensity?: number;
  /** One colour or a palette cycled across particles. */
  particleColor?: string | string[];
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  twinkle: number;
  color: string;
}

/**
 * Lightweight canvas particle field — a soft drift of dust used behind the
 * footer. Parks itself on a static frame under `prefers-reduced-motion`, pauses
 * when the tab is hidden, and sizes to its parent via ResizeObserver.
 */
export function SparklesCore({
  background = "transparent",
  minSize = 0.4,
  maxSize = 1,
  particleDensity = 1200,
  particleColor = "#FFFFFF",
  className,
}: SparklesCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fold array palettes into a stable key so inline literals do not reseed every render.
  const colorKey = Array.isArray(particleColor) ? particleColor.join("|") : particleColor;

  useEffect(() => {
    const canvasEl = canvasRef.current;
    const hostEl = canvasEl?.parentElement;
    const ctxMaybe = canvasEl?.getContext("2d");
    if (!canvasEl || !hostEl || !ctxMaybe) return;
    // Rebind to non-nullable consts so nested closures (resize, tick) stay narrowed.
    const canvas: HTMLCanvasElement = canvasEl;
    const host: HTMLElement = hostEl;
    const ctx: CanvasRenderingContext2D = ctxMaybe;

    const palette = Array.isArray(particleColor) ? particleColor : [particleColor];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let particles: Particle[] = [];
    let width = 1;
    let height = 1;
    let raf = 0;
    let running = false;

    function seed() {
      const count = Math.min(Math.max(Math.round((width * height) / particleDensity), 18), 420);
      particles = Array.from({ length: count }, (_, index) => {
        const radius = minSize + Math.random() * Math.max(maxSize - minSize, 0.01);
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.04 + Math.random() * 0.08;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.6 - 0.03,
          radius,
          phase: Math.random() * Math.PI * 2,
          twinkle: 0.0006 + Math.random() * 0.0012,
          color: palette[index % palette.length] ?? "#FFFFFF",
        };
      });
    }

    function paint(time: number) {
      ctx.clearRect(0, 0, width, height);
      if (background !== "transparent") {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
      }
      for (const particle of particles) {
        const glow = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * particle.twinkle * 1000 + particle.phase));
        ctx.globalAlpha = glow;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function tick(time: number) {
      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.y < -4) {
          particle.y = height + 4;
          particle.x = Math.random() * width;
        } else if (particle.y > height + 4) {
          particle.y = -4;
          particle.x = Math.random() * width;
        }
        if (particle.x < -4) particle.x = width + 4;
        else if (particle.x > width + 4) particle.x = -4;
      }
      paint(time);
      raf = window.requestAnimationFrame(tick);
    }

    function stop() {
      running = false;
      window.cancelAnimationFrame(raf);
    }

    function start() {
      if (running) return;
      running = true;
      raf = window.requestAnimationFrame(tick);
    }

    function reset() {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      if (reduceMotion.matches) {
        stop();
        paint(0);
      } else {
        start();
      }
    }

    function onVisibility() {
      if (document.hidden) stop();
      else if (!reduceMotion.matches) start();
    }

    const observer = new ResizeObserver(reset);
    observer.observe(host);
    document.addEventListener("visibilitychange", onVisibility);
    reduceMotion.addEventListener("change", reset);
    reset();

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMotion.removeEventListener("change", reset);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- particleColor is folded into colorKey
  }, [background, maxSize, minSize, colorKey, particleDensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none block", className)}
    />
  );
}
