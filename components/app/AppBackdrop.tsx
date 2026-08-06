"use client";

import { useEffect, useRef } from "react";

function LiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colors = ["157, 126, 255", "61, 218, 199", "226, 91, 210"];
    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrame = 0;
    let reducedMotion = motionPreference.matches;
    let pointerX = -1000;
    let pointerY = -1000;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      phase: number;
    }> = [];
    let comets: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      length: number;
      thickness: number;
      color: string;
    }> = [];

    const createParticles = () => {
      const count = Math.min(88, Math.max(38, Math.floor((width * height) / 22000)));
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.44,
        vy: (Math.random() - 0.5) * 0.38,
        radius: 0.8 + Math.random() * 1.7,
        color: colors[index % colors.length],
        phase: Math.random() * Math.PI * 2,
      }));
      comets = Array.from({ length: 4 }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 1.05 + Math.random() * 1.1,
        vy: (Math.random() - 0.5) * 0.5,
        length: 75 + Math.random() * 105,
        thickness: 0.7 + Math.random() * 0.8,
        color: colors[index % colors.length],
      }));
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      createParticles();
    };

    const drawRibbon = (
      time: number,
      baseY: number,
      amplitude: number,
      speed: number,
      color: string,
      offset: number,
    ) => {
      const gradient = context.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "rgba(" + color + ", 0)");
      gradient.addColorStop(0.22, "rgba(" + color + ", 0.08)");
      gradient.addColorStop(0.55, "rgba(" + color + ", 0.18)");
      gradient.addColorStop(0.82, "rgba(" + color + ", 0.07)");
      gradient.addColorStop(1, "rgba(" + color + ", 0)");

      context.beginPath();
      for (let x = -40; x <= width + 40; x += 24) {
        const y = baseY
          + Math.sin(x * 0.0045 + time * speed + offset) * amplitude
          + Math.sin(x * 0.009 - time * speed * 0.7 + offset) * amplitude * 0.34;
        if (x === -40) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = gradient;
      context.lineWidth = Math.max(28, Math.min(58, width * 0.035));
      context.shadowBlur = 42;
      context.shadowColor = "rgba(" + color + ", 0.2)";
      context.stroke();
      context.shadowBlur = 0;
    };

    const draw = (timestamp: number) => {
      const time = timestamp * 0.001;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";

      drawRibbon(time, height * 0.24, height * 0.065, 0.34, colors[0], 0.4);
      drawRibbon(time, height * 0.58, height * 0.085, -0.28, colors[1], 2.1);
      drawRibbon(time, height * 0.83, height * 0.055, 0.25, colors[2], 4.2);

      if (pointerX > -500) {
        const pointerGlow = context.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, 145);
        pointerGlow.addColorStop(0, "rgba(149, 119, 255, 0.07)");
        pointerGlow.addColorStop(0.5, "rgba(65, 214, 198, 0.025)");
        pointerGlow.addColorStop(1, "rgba(65, 214, 198, 0)");
        context.beginPath();
        context.arc(pointerX, pointerY, 145, 0, Math.PI * 2);
        context.fillStyle = pointerGlow;
        context.fill();
      }

      comets.forEach((comet) => {
        if (!reducedMotion) {
          comet.x += comet.vx;
          comet.y += comet.vy;
          if (comet.x - comet.length > width || comet.y < -80 || comet.y > height + 80) {
            comet.x = -comet.length - Math.random() * width * 0.3;
            comet.y = Math.random() * height;
            comet.vx = 1.05 + Math.random() * 1.1;
            comet.vy = (Math.random() - 0.5) * 0.5;
          }
        }

        const tailX = comet.x - comet.vx * comet.length;
        const tailY = comet.y - comet.vy * comet.length;
        const trail = context.createLinearGradient(tailX, tailY, comet.x, comet.y);
        trail.addColorStop(0, "rgba(" + comet.color + ", 0)");
        trail.addColorStop(0.72, "rgba(" + comet.color + ", 0.12)");
        trail.addColorStop(1, "rgba(" + comet.color + ", 0.68)");
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(comet.x, comet.y);
        context.strokeStyle = trail;
        context.lineWidth = comet.thickness;
        context.shadowBlur = 12;
        context.shadowColor = "rgba(" + comet.color + ", 0.45)";
        context.stroke();
        context.shadowBlur = 0;
      });

      particles.forEach((particle, index) => {
        if (!reducedMotion) {
          particle.x += particle.vx + Math.sin(time * 0.76 + particle.phase) * 0.075;
          particle.y += particle.vy + Math.cos(time * 0.66 + particle.phase) * 0.065;

          const pointerDistanceX = pointerX - particle.x;
          const pointerDistanceY = pointerY - particle.y;
          const pointerDistance = Math.hypot(pointerDistanceX, pointerDistanceY);
          if (pointerDistance < 190 && pointerDistance > 1) {
            const influence = (1 - pointerDistance / 190) * 0.006;
            particle.x += pointerDistanceX * influence;
            particle.y += pointerDistanceY * influence;
          }

          if (particle.x < -20) particle.x = width + 20;
          if (particle.x > width + 20) particle.x = -20;
          if (particle.y < -20) particle.y = height + 20;
          if (particle.y > height + 20) particle.y = -20;
        }

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const next = particles[nextIndex];
          const distance = Math.hypot(next.x - particle.x, next.y - particle.y);
          if (distance > 160) continue;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(next.x, next.y);
          context.strokeStyle = "rgba(150, 132, 220, " + ((1 - distance / 160) * 0.16) + ")";
          context.lineWidth = 0.65;
          context.stroke();
        }

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(" + particle.color + ", 0.68)";
        context.shadowBlur = 13;
        context.shadowColor = "rgba(" + particle.color + ", 0.58)";
        context.fill();
        context.shadowBlur = 0;

        if (index % 9 === 0) {
          const pulse = (time * 0.72 + particle.phase / (Math.PI * 2)) % 1;
          context.beginPath();
          context.arc(particle.x, particle.y, 8 + pulse * 26, 0, Math.PI * 2);
          context.strokeStyle = "rgba(" + particle.color + ", " + ((1 - pulse) * 0.16) + ")";
          context.lineWidth = 0.8;
          context.stroke();
        }
      });

      context.globalCompositeOperation = "source-over";
      if (!reducedMotion && !document.hidden) animationFrame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(draw);
    };
    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    };
    const handlePointerLeave = () => {
      pointerX = -1000;
      pointerY = -1000;
    };
    const handleVisibility = () => {
      if (document.hidden) window.cancelAnimationFrame(animationFrame);
      else start();
    };
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      start();
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("visibilitychange", handleVisibility);
    motionPreference.addEventListener("change", handleMotionPreference);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  return <canvas ref={canvasRef} className="live-background-canvas" aria-hidden="true" />;
}

type GlowWaypoint = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

const glowTransform = (waypoint: GlowWaypoint) =>
  `translate3d(${waypoint.x}vw, ${waypoint.y}vh, 0) scale(${waypoint.scale})`;

function RandomAmbientGlows() {
  const glowRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations: Array<Animation | undefined> = [];
    const timers: Array<number | undefined> = [];
    let disposed = false;

    const randomWaypoint = (): GlowWaypoint => ({
      x: -4 + Math.random() * 104,
      y: -6 + Math.random() * 104,
      scale: 0.82 + Math.random() * 0.38,
      opacity: 0.22 + Math.random() * 0.13,
    });

    const placeGlow = (element: HTMLDivElement, waypoint: GlowWaypoint) => {
      element.style.transform = glowTransform(waypoint);
      element.style.opacity = String(waypoint.opacity);
    };

    const stopMotion = () => {
      timers.forEach((timer, index) => {
        if (timer !== undefined) window.clearTimeout(timer);
        timers[index] = undefined;
      });
      animations.forEach((animation, index) => {
        if (animation) {
          animation.onfinish = null;
          animation.cancel();
        }
        animations[index] = undefined;
      });
    };

    const travel = (element: HTMLDivElement, index: number, current: GlowWaypoint) => {
      if (disposed || motionPreference.matches) return;

      let next = randomWaypoint();
      let distance = Math.hypot(next.x - current.x, next.y - current.y);
      for (let attempt = 0; attempt < 4 && distance < 26; attempt += 1) {
        next = randomWaypoint();
        distance = Math.hypot(next.x - current.x, next.y - current.y);
      }

      const duration = Math.max(2200, Math.min(6200, distance * (55 + Math.random() * 20)));
      const animation = element.animate(
        [
          { transform: glowTransform(current), opacity: current.opacity },
          { transform: glowTransform(next), opacity: next.opacity },
        ],
        {
          duration,
          easing: "cubic-bezier(0.42, 0, 0.25, 1)",
          fill: "forwards",
        },
      );
      animations[index] = animation;

      animation.onfinish = () => {
        if (disposed) return;
        placeGlow(element, next);
        animation.cancel();
        animations[index] = undefined;
        timers[index] = window.setTimeout(
          () => travel(element, index, next),
          60 + Math.random() * 300,
        );
      };
    };

    const startMotion = () => {
      stopMotion();
      glowRefs.current.forEach((element, index) => {
        if (!element) return;
        const initial = randomWaypoint();
        placeGlow(element, initial);
        if (!motionPreference.matches) {
          timers[index] = window.setTimeout(
            () => travel(element, index, initial),
            80 + index * 110 + Math.random() * 240,
          );
        }
      });
    };

    const handleMotionPreference = () => startMotion();
    startMotion();
    motionPreference.addEventListener("change", handleMotionPreference);

    return () => {
      disposed = true;
      stopMotion();
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  const glowNames = ["one", "two", "three", "four", "five"];
  return (
    <>
      {glowNames.map((name, index) => (
        <div
          key={name}
          ref={(element) => {
            glowRefs.current[index] = element;
          }}
          className={`ambient ambient-${name}`}
        />
      ))}
    </>
  );
}

export function AppBackdrop() {
  return (
    <div className="animated-backdrop" aria-hidden="true">
      <div className="backdrop-grid" />
      <LiveBackground />
      <RandomAmbientGlows />
      <div className="backdrop-glow" />
    </div>
  );
}
