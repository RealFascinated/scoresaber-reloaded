"use client";

import { useEffect, useRef } from "react";

export function LandingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let animationId: number;
    const particles: {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      // Built once: this is drawn on every frame for every particle
      color: string;
    }[] = [];

    // Assigning canvas.width reallocates the bitmap, so coalesce a resize drag into one change per frame
    let resizeFrame = 0;
    const applySize = () => {
      resizeFrame = 0;
      if (canvas.width !== window.innerWidth) {
        canvas.width = window.innerWidth;
      }
      if (canvas.height !== window.innerHeight) {
        canvas.height = window.innerHeight;
      }
    };
    const resize = () => {
      if (resizeFrame === 0) {
        resizeFrame = requestAnimationFrame(applySize);
      }
    };
    applySize();
    window.addEventListener("resize", resize);

    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        color: `rgba(255, 255, 255, ${Math.random() * 0.4 + 0.1})`,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) {
          p.x = canvas.width;
        }
        if (p.x > canvas.width) {
          p.x = 0;
        }
        if (p.y < 0) {
          p.y = canvas.height;
        }
        if (p.y > canvas.height) {
          p.y = 0;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 -z-40 select-none" />;
}
