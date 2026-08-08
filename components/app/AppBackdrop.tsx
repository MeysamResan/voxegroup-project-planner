"use client";

import { useEffect, useRef } from "react";

import {
  APP_MOTION_PAUSE_EVENT,
  APP_MOTION_RESUME_EVENT,
} from "@/lib/performance/motion";

const ACTIVE_FRAME_RATE = 30;
const IDLE_FRAME_RATE = 18;
const LIGHT_IDLE_FRAME_RATE = 15;
const OBSCURED_FRAME_RATE = 8;
const ACTIVE_FRAME_INTERVAL = 1000 / ACTIVE_FRAME_RATE;
const IDLE_FRAME_INTERVAL = 1000 / IDLE_FRAME_RATE;
const LIGHT_IDLE_FRAME_INTERVAL = 1000 / LIGHT_IDLE_FRAME_RATE;
const OBSCURED_FRAME_INTERVAL = 1000 / OBSCURED_FRAME_RATE;
const BASE_FRAME_INTERVAL = 1000 / 60;
const MAX_DELTA_SCALE = 5;
const FRAME_TOLERANCE = 1;
const FRAME_WAKE_AHEAD = 4;
const ACTIVE_WINDOW = 900;
const MAX_CANVAS_PIXELS = 2_400_000;
const MAX_PARTICLE_CONNECTIONS = 2;
const PARTICLE_GRID_SIZE = 158;
const CONNECTION_ALPHA_LEVELS = [0.012, 0.034, 0.056, 0.078, 0.1, 0.122];

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  phase: number;
  sprite: HTMLCanvasElement;
};

type Comet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  thickness: number;
  color: string;
  angle: number;
  headOffset: number;
  sprite: HTMLCanvasElement;
};

type AmbientGlow = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  fromX: number;
  fromY: number;
  fromScale: number;
  fromOpacity: number;
  targetX: number;
  targetY: number;
  targetScale: number;
  targetOpacity: number;
  elapsed: number;
  duration: number;
  radius: number;
  sprite: HTMLCanvasElement;
};

const createRadialSprite = (color: string, size: number, coreOpacity: number) => {
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const spriteContext = sprite.getContext("2d");
  if (!spriteContext) return sprite;

  const center = size / 2;
  const gradient = spriteContext.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, `rgba(${color}, ${coreOpacity})`);
  gradient.addColorStop(0.24, `rgba(${color}, ${coreOpacity * 0.62})`);
  gradient.addColorStop(0.58, `rgba(${color}, ${coreOpacity * 0.2})`);
  gradient.addColorStop(1, `rgba(${color}, 0)`);
  spriteContext.fillStyle = gradient;
  spriteContext.fillRect(0, 0, size, size);
  return sprite;
};

const createParticleSprite = (color: string, radius: number, backingScale: number) => {
  const size = 48;
  const sprite = createRadialSprite(color, size, 0.66);
  const spriteContext = sprite.getContext("2d");
  if (!spriteContext) return sprite;

  const haloRadius = 9 + radius * 4.5;
  const visibleRadius = Math.max(radius, 0.82 / Math.max(0.1, backingScale));
  const coreRadius = visibleRadius * (size / 2) / haloRadius;
  spriteContext.beginPath();
  spriteContext.arc(size / 2, size / 2, coreRadius, 0, Math.PI * 2);
  spriteContext.fillStyle = `rgba(${color}, 0.76)`;
  spriteContext.fill();
  return sprite;
};

const createCometSprite = (color: string, length: number, thickness: number) => {
  const padding = 7;
  const sprite = document.createElement("canvas");
  sprite.width = Math.ceil(length + padding * 2);
  sprite.height = Math.max(14, Math.ceil(thickness * 7 + padding * 2));
  const spriteContext = sprite.getContext("2d");
  if (!spriteContext) return { sprite, headOffset: length + padding };

  const centerY = sprite.height / 2;
  const headX = sprite.width - padding;
  const trail = spriteContext.createLinearGradient(padding, centerY, headX, centerY);
  trail.addColorStop(0, `rgba(${color}, 0)`);
  trail.addColorStop(0.72, `rgba(${color}, 0.11)`);
  trail.addColorStop(1, `rgba(${color}, 0.68)`);
  spriteContext.beginPath();
  spriteContext.moveTo(padding, centerY);
  spriteContext.lineTo(headX, centerY);
  spriteContext.strokeStyle = trail;
  spriteContext.lineCap = "round";
  spriteContext.globalAlpha = 0.3;
  spriteContext.lineWidth = thickness * 5;
  spriteContext.stroke();
  spriteContext.globalAlpha = 1;
  spriteContext.lineWidth = thickness;
  spriteContext.stroke();
  spriteContext.beginPath();
  spriteContext.arc(headX, centerY, thickness * 1.5, 0, Math.PI * 2);
  spriteContext.fillStyle = `rgba(${color}, 0.78)`;
  spriteContext.fill();
  return { sprite, headOffset: headX };
};

const easeInOut = (progress: number) =>
  progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - ((-2 * progress + 2) * (-2 * progress + 2) * (-2 * progress + 2)) / 2;

function LiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lightThemePreference = window.matchMedia("(prefers-color-scheme: light)");
    const colors = ["157, 126, 255", "61, 218, 199", "226, 91, 210"];
    const glowColors = [
      "129, 87, 255",
      "240, 84, 214",
      "35, 205, 187",
      "66, 156, 255",
      "217, 106, 255",
    ];
    const glowSprites = glowColors.map((color) => createRadialSprite(color, 192, 0.82));
    const pointerSprite = createRadialSprite("130, 112, 255", 160, 0.3);

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrame = 0;
    let frameTimer = 0;
    let resizeTimer = 0;
    let scrollResumeTimer = 0;
    let lastDrawTime = 0;
    let lastRenderTime = 0;
    let sceneTime = 0;
    let activeUntil = window.performance.now() + ACTIVE_WINDOW;
    let backingScale = 1;
    let reducedMotion = motionPreference.matches;
    let isPrinting = false;
    let isScrolling = false;
    let themeTransitionPaused = false;
    let windowFocused = document.hasFocus();
    let pointerX = -1000;
    let pointerY = -1000;
    let particles: Particle[] = [];
    let comets: Comet[] = [];
    let ambientGlows: AmbientGlow[] = [];
    let ribbonGradients: CanvasGradient[] = [];
    let gridColumns = 1;
    let gridRows = 1;
    let gridHead = new Int16Array(1);
    let gridNext = new Int16Array(1);
    let edgeFlags = new Uint8Array(1);
    let connectionFrom = new Int16Array(1);
    let connectionTo = new Int16Array(1);
    let connectionAlphaBin = new Uint8Array(1);

    const randomGlowX = () => -width * 0.06 + Math.random() * width * 1.12;
    const randomGlowY = () => -height * 0.08 + Math.random() * height * 1.16;

    const setGlowTarget = (glow: AmbientGlow) => {
      glow.fromX = glow.x;
      glow.fromY = glow.y;
      glow.fromScale = glow.scale;
      glow.fromOpacity = glow.opacity;

      let targetX = randomGlowX();
      let targetY = randomGlowY();
      const minimumDistanceSquared = Math.pow(Math.min(width, height) * 0.24, 2);
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const distanceX = targetX - glow.x;
        const distanceY = targetY - glow.y;
        if (distanceX * distanceX + distanceY * distanceY >= minimumDistanceSquared) break;
        targetX = randomGlowX();
        targetY = randomGlowY();
      }

      glow.targetX = targetX;
      glow.targetY = targetY;
      glow.targetScale = 0.82 + Math.random() * 0.38;
      glow.targetOpacity = 0.16 + Math.random() * 0.1;
      glow.elapsed = 0;
      glow.duration = 2400 + Math.random() * 3400;
    };

    const createScene = () => {
      const particleCount = Math.min(72, Math.max(38, Math.floor((width * height) / 30000)));
      particles = Array.from({ length: particleCount }, (_, index) => {
        const radius = 0.8 + Math.random() * 1.7;
        const color = colors[index % colors.length];
        return {
          id: index,
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.44,
          vy: (Math.random() - 0.5) * 0.38,
          radius,
          color,
          phase: Math.random() * Math.PI * 2,
          sprite: createParticleSprite(color, radius, backingScale),
        };
      });

      comets = Array.from({ length: 3 }, (_, index) => {
        const vx = 1.05 + Math.random() * 1.1;
        const vy = (Math.random() - 0.5) * 0.5;
        const length = 75 + Math.random() * 105;
        const thickness = 0.7 + Math.random() * 0.8;
        const color = colors[index % colors.length];
        const cometSprite = createCometSprite(color, length, thickness);
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx,
          vy,
          length,
          thickness,
          color,
          angle: Math.atan2(vy, vx),
          headOffset: cometSprite.headOffset,
          sprite: cometSprite.sprite,
        };
      });

      const sceneSize = Math.min(width, height);
      ambientGlows = glowSprites.map((sprite, index) => {
        const x = randomGlowX();
        const y = randomGlowY();
        const glow: AmbientGlow = {
          x,
          y,
          scale: 0.86 + Math.random() * 0.3,
          opacity: 0.17 + Math.random() * 0.08,
          fromX: x,
          fromY: y,
          fromScale: 1,
          fromOpacity: 0.2,
          targetX: x,
          targetY: y,
          targetScale: 1,
          targetOpacity: 0.2,
          elapsed: 0,
          duration: 3000,
          radius: Math.min(390, Math.max(245, sceneSize * (0.25 + index * 0.018))),
          sprite,
        };
        setGlowTarget(glow);
        return glow;
      });

      gridColumns = Math.max(1, Math.ceil(width / PARTICLE_GRID_SIZE));
      gridRows = Math.max(1, Math.ceil(height / PARTICLE_GRID_SIZE));
      gridHead = new Int16Array(gridColumns * gridRows);
      gridNext = new Int16Array(particleCount);
      edgeFlags = new Uint8Array(particleCount * particleCount);
      connectionFrom = new Int16Array(particleCount * MAX_PARTICLE_CONNECTIONS);
      connectionTo = new Int16Array(particleCount * MAX_PARTICLE_CONNECTIONS);
      connectionAlphaBin = new Uint8Array(particleCount * MAX_PARTICLE_CONNECTIONS);
    };

    const createRibbonGradients = () => {
      ribbonGradients = colors.map((color) => {
        const gradient = context.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, `rgba(${color}, 0)`);
        gradient.addColorStop(0.22, `rgba(${color}, 0.07)`);
        gradient.addColorStop(0.55, `rgba(${color}, 0.17)`);
        gradient.addColorStop(0.82, `rgba(${color}, 0.065)`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        return gradient;
      });
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      // Cap both density and total backing-store area. Abstract light and particles
      // tolerate modest upscaling, while 4K and ultrawide displays stay predictable.
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 1);
      const pixelBudgetRatio = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height));
      const pixelRatio = Math.min(devicePixelRatio, pixelBudgetRatio);
      backingScale = pixelRatio;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "low";
      createRibbonGradients();
      createScene();
    };

    const drawAmbientGlows = (deltaMilliseconds: number) => {
      for (let index = 0; index < ambientGlows.length; index += 1) {
        const glow = ambientGlows[index];
        if (!reducedMotion) {
          glow.elapsed += deltaMilliseconds;
          const progress = Math.min(1, glow.elapsed / glow.duration);
          const easedProgress = easeInOut(progress);
          glow.x = glow.fromX + (glow.targetX - glow.fromX) * easedProgress;
          glow.y = glow.fromY + (glow.targetY - glow.fromY) * easedProgress;
          glow.scale = glow.fromScale + (glow.targetScale - glow.fromScale) * easedProgress;
          glow.opacity = glow.fromOpacity + (glow.targetOpacity - glow.fromOpacity) * easedProgress;
          if (progress >= 1) setGlowTarget(glow);
        }

        const radius = glow.radius * glow.scale;
        context.globalAlpha = glow.opacity;
        context.drawImage(glow.sprite, glow.x - radius, glow.y - radius, radius * 2, radius * 2);
      }
      context.globalAlpha = 1;
    };

    const drawRibbon = (
      time: number,
      baseY: number,
      amplitude: number,
      speed: number,
      gradient: CanvasGradient,
      offset: number,
    ) => {
      context.beginPath();
      const pathStep = 30 / Math.max(0.5, backingScale);
      for (let x = -40; x <= width + 40; x += pathStep) {
        const y = baseY
          + Math.sin(x * 0.0045 + time * speed + offset) * amplitude
          + Math.sin(x * 0.009 - time * speed * 0.7 + offset) * amplitude * 0.34;
        if (x === -40) context.moveTo(x, y);
        else context.lineTo(x, y);
      }

      const ribbonWidth = Math.max(26, Math.min(54, width * 0.033));
      context.strokeStyle = gradient;
      context.lineCap = "round";
      context.globalAlpha = 0.34;
      context.lineWidth = ribbonWidth * 1.55;
      context.stroke();
      context.globalAlpha = 0.88;
      context.lineWidth = ribbonWidth * 0.62;
      context.stroke();
      context.globalAlpha = 1;
    };

    const drawComets = (deltaScale: number) => {
      for (let index = 0; index < comets.length; index += 1) {
        const comet = comets[index];
        if (!reducedMotion) {
          comet.x += comet.vx * deltaScale;
          comet.y += comet.vy * deltaScale;
          if (comet.x - comet.length > width || comet.y < -80 || comet.y > height + 80) {
            comet.x = -comet.length - Math.random() * width * 0.3;
            comet.y = Math.random() * height;
            comet.vx = 1.05 + Math.random() * 1.1;
            comet.vy = (Math.random() - 0.5) * 0.5;
            comet.angle = Math.atan2(comet.vy, comet.vx);
          }
        }

        context.save();
        context.translate(comet.x, comet.y);
        context.rotate(comet.angle);
        context.drawImage(comet.sprite, -comet.headOffset, -comet.sprite.height / 2);
        context.restore();
      }
    };

    const drawParticles = (time: number, deltaScale: number) => {
      const connectionDistanceSquared = PARTICLE_GRID_SIZE * PARTICLE_GRID_SIZE;
      const particleCount = particles.length;
      gridHead.fill(-1);
      gridNext.fill(-1);
      edgeFlags.fill(0);

      for (let index = 0; index < particleCount; index += 1) {
        const particle = particles[index];
        if (!reducedMotion) {
          particle.x += (particle.vx + Math.sin(time * 0.76 + particle.phase) * 0.075) * deltaScale;
          particle.y += (particle.vy + Math.cos(time * 0.66 + particle.phase) * 0.065) * deltaScale;

          if (pointerX > -500) {
            const pointerDistanceX = pointerX - particle.x;
            const pointerDistanceY = pointerY - particle.y;
            const pointerDistanceSquared =
              pointerDistanceX * pointerDistanceX + pointerDistanceY * pointerDistanceY;
            if (pointerDistanceSquared < 190 * 190 && pointerDistanceSquared > 1) {
              const pointerDistance = Math.sqrt(pointerDistanceSquared);
              const influence = (1 - pointerDistance / 190) * 0.006 * deltaScale;
              particle.x += pointerDistanceX * influence;
              particle.y += pointerDistanceY * influence;
            }
          }

          if (particle.x < -20) particle.x = width + 20;
          if (particle.x > width + 20) particle.x = -20;
          if (particle.y < -20) particle.y = height + 20;
          if (particle.y > height + 20) particle.y = -20;
        }

        const cellX = Math.max(
          0,
          Math.min(gridColumns - 1, Math.floor(particle.x / PARTICLE_GRID_SIZE)),
        );
        const cellY = Math.max(
          0,
          Math.min(gridRows - 1, Math.floor(particle.y / PARTICLE_GRID_SIZE)),
        );
        const cellIndex = cellY * gridColumns + cellX;
        gridNext[index] = gridHead[cellIndex];
        gridHead[cellIndex] = index;
      }

      let connectionCount = 0;
      for (let index = 0; index < particleCount; index += 1) {
        const particle = particles[index];
        const cellX = Math.max(
          0,
          Math.min(gridColumns - 1, Math.floor(particle.x / PARTICLE_GRID_SIZE)),
        );
        const cellY = Math.max(
          0,
          Math.min(gridRows - 1, Math.floor(particle.y / PARTICLE_GRID_SIZE)),
        );
        let nearestIndex = -1;
        let nearestDistanceSquared = Number.POSITIVE_INFINITY;
        let secondIndex = -1;
        let secondDistanceSquared = Number.POSITIVE_INFINITY;

        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
            const nearbyCellX = cellX + offsetX;
            const nearbyCellY = cellY + offsetY;
            if (
              nearbyCellX < 0 ||
              nearbyCellX >= gridColumns ||
              nearbyCellY < 0 ||
              nearbyCellY >= gridRows
            ) continue;

            let candidateIndex = gridHead[nearbyCellY * gridColumns + nearbyCellX];
            while (candidateIndex !== -1) {
              if (candidateIndex === index) {
                candidateIndex = gridNext[candidateIndex];
                continue;
              }
              const candidate = particles[candidateIndex];
              const distanceX = candidate.x - particle.x;
              const distanceY = candidate.y - particle.y;
              const distanceSquared = distanceX * distanceX + distanceY * distanceY;
              if (distanceSquared <= connectionDistanceSquared) {
                if (distanceSquared < nearestDistanceSquared) {
                  secondIndex = nearestIndex;
                  secondDistanceSquared = nearestDistanceSquared;
                  nearestIndex = candidateIndex;
                  nearestDistanceSquared = distanceSquared;
                } else if (distanceSquared < secondDistanceSquared) {
                  secondIndex = candidateIndex;
                  secondDistanceSquared = distanceSquared;
                }
              }
              candidateIndex = gridNext[candidateIndex];
            }
          }
        }

        for (let connectionIndex = 0; connectionIndex < MAX_PARTICLE_CONNECTIONS; connectionIndex += 1) {
          const nextIndex = connectionIndex === 0 ? nearestIndex : secondIndex;
          const distanceSquared = connectionIndex === 0
            ? nearestDistanceSquared
            : secondDistanceSquared;
          if (nextIndex === -1) continue;

          const lowerIndex = Math.min(index, nextIndex);
          const upperIndex = Math.max(index, nextIndex);
          const edgeIndex = lowerIndex * particleCount + upperIndex;
          if (edgeFlags[edgeIndex]) continue;
          edgeFlags[edgeIndex] = 1;

          const strength = 1 - distanceSquared / connectionDistanceSquared;
          connectionFrom[connectionCount] = index;
          connectionTo[connectionCount] = nextIndex;
          connectionAlphaBin[connectionCount] = Math.min(
            CONNECTION_ALPHA_LEVELS.length - 1,
            Math.floor(strength * CONNECTION_ALPHA_LEVELS.length),
          );
          connectionCount += 1;
        }
      }

      for (let alphaIndex = 0; alphaIndex < CONNECTION_ALPHA_LEVELS.length; alphaIndex += 1) {
        const alpha = CONNECTION_ALPHA_LEVELS[alphaIndex];
        context.beginPath();
        let hasConnections = false;
        for (let connectionIndex = 0; connectionIndex < connectionCount; connectionIndex += 1) {
          if (connectionAlphaBin[connectionIndex] !== alphaIndex) continue;
          const from = particles[connectionFrom[connectionIndex]];
          const to = particles[connectionTo[connectionIndex]];
          context.moveTo(from.x, from.y);
          context.lineTo(to.x, to.y);
          hasConnections = true;
        }
        if (!hasConnections) continue;
        context.strokeStyle = `rgba(150, 132, 220, ${alpha})`;
        context.lineWidth = 0.65;
        context.stroke();
      }

      for (let index = 0; index < particleCount; index += 1) {
        const particle = particles[index];
        const haloRadius = 9 + particle.radius * 4.5;
        context.drawImage(
          particle.sprite,
          particle.x - haloRadius,
          particle.y - haloRadius,
          haloRadius * 2,
          haloRadius * 2,
        );

        if (index % 9 === 0) {
          const pulse = (time * 0.72 + particle.phase / (Math.PI * 2)) % 1;
          context.beginPath();
          context.arc(particle.x, particle.y, 8 + pulse * 26, 0, Math.PI * 2);
          context.strokeStyle = `rgba(${particle.color}, ${(1 - pulse) * 0.14})`;
          context.lineWidth = 0.8;
          context.stroke();
        }
      }
    };

    const draw = (deltaScale: number) => {
      const deltaMilliseconds = deltaScale * BASE_FRAME_INTERVAL;
      sceneTime += deltaMilliseconds * 0.001;
      const time = sceneTime;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "screen";

      drawAmbientGlows(deltaMilliseconds);
      drawRibbon(time, height * 0.24, height * 0.065, 0.34, ribbonGradients[0], 0.4);
      drawRibbon(time, height * 0.58, height * 0.085, -0.28, ribbonGradients[1], 2.1);
      drawRibbon(time, height * 0.83, height * 0.055, 0.25, ribbonGradients[2], 4.2);

      if (pointerX > -500) {
        const pointerRadius = 145;
        context.globalAlpha = 0.58;
        context.drawImage(
          pointerSprite,
          pointerX - pointerRadius,
          pointerY - pointerRadius,
          pointerRadius * 2,
          pointerRadius * 2,
        );
        context.globalAlpha = 1;
      }

      drawComets(deltaScale);
      drawParticles(time, deltaScale);
      context.globalCompositeOperation = "source-over";
    };

    const frameIntervalFor = (timestamp: number) => {
      if (document.body.style.overflow === "hidden") return OBSCURED_FRAME_INTERVAL;
      const isIdle = canvas.width * canvas.height > 2_000_000 || timestamp >= activeUntil;
      if (!isIdle) return ACTIVE_FRAME_INTERVAL;

      const themeOverride = document.documentElement.dataset.theme;
      const lightGlassActive = themeOverride
        ? themeOverride === "light"
        : lightThemePreference.matches;
      return lightGlassActive ? LIGHT_IDLE_FRAME_INTERVAL : IDLE_FRAME_INTERVAL;
    };

    const stop = () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(frameTimer);
      animationFrame = 0;
      frameTimer = 0;
    };

    const scheduleNextFrame = (delay: number) => {
      window.clearTimeout(frameTimer);
      frameTimer = window.setTimeout(() => {
        animationFrame = window.requestAnimationFrame(renderFrame);
      }, Math.max(0, delay - FRAME_WAKE_AHEAD));
    };

    const renderFrame = (timestamp: number) => {
      if (
        document.hidden
        || !windowFocused
        || isPrinting
        || isScrolling
        || themeTransitionPaused
      ) return;

      if (lastDrawTime === 0) {
        lastDrawTime = timestamp;
        lastRenderTime = timestamp;
        draw(1);
        if (!reducedMotion) scheduleNextFrame(frameIntervalFor(timestamp));
        return;
      }

      const frameInterval = frameIntervalFor(timestamp);
      const elapsed = timestamp - lastDrawTime;
      if (!reducedMotion && elapsed < frameInterval - FRAME_TOLERANCE) {
        scheduleNextFrame(frameInterval - elapsed);
        return;
      }

      const elapsedSinceRender = timestamp - lastRenderTime;
      lastDrawTime = timestamp;
      lastRenderTime = timestamp;
      draw(Math.min(elapsedSinceRender / BASE_FRAME_INTERVAL, MAX_DELTA_SCALE));
      if (!reducedMotion) scheduleNextFrame(frameIntervalFor(timestamp));
    };

    const start = () => {
      stop();
      lastDrawTime = 0;
      lastRenderTime = 0;
      if (
        !document.hidden
        && windowFocused
        && !isPrinting
        && !isScrolling
        && !themeTransitionPaused
      ) {
        animationFrame = window.requestAnimationFrame(renderFrame);
      }
    };

    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        start();
      }, 120);
    };
    const handlePointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      activeUntil = window.performance.now() + ACTIVE_WINDOW;
    };
    const handlePointerLeave = () => {
      pointerX = -1000;
      pointerY = -1000;
    };
    const handleVisibility = () => {
      const paused = document.hidden || !windowFocused || isPrinting || themeTransitionPaused;
      if (paused) stop();
      else start();
    };
    const handleWindowBlur = () => {
      windowFocused = false;
      stop();
    };
    const handleWindowFocus = () => {
      windowFocused = true;
      activeUntil = window.performance.now() + ACTIVE_WINDOW;
      const paused = document.hidden || isPrinting || themeTransitionPaused;
      if (!paused) start();
    };
    const handleScroll = () => {
      isScrolling = true;
      stop();
      window.clearTimeout(scrollResumeTimer);
      scrollResumeTimer = window.setTimeout(() => {
        isScrolling = false;
        activeUntil = window.performance.now() + ACTIVE_WINDOW;
        const paused = document.hidden || !windowFocused || isPrinting || themeTransitionPaused;
        if (!paused) start();
      }, 110);
    };
    const handlePageHide = () => {
      stop();
    };
    const handlePageShow = () => {
      windowFocused = document.hasFocus();
      const paused = document.hidden || !windowFocused || isPrinting || themeTransitionPaused;
      if (!paused) start();
    };
    const handleBeforePrint = () => {
      isPrinting = true;
      stop();
    };
    const handleAfterPrint = () => {
      isPrinting = false;
      const paused = document.hidden || !windowFocused || themeTransitionPaused;
      if (!paused) start();
    };
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      start();
    };
    const handleThemeMotionPause = () => {
      themeTransitionPaused = true;
      stop();
    };
    const handleThemeMotionResume = () => {
      themeTransitionPaused = false;
      if (!document.hidden && windowFocused && !isPrinting && !isScrolling) start();
    };

    resize();
    start();
    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    window.addEventListener(APP_MOTION_PAUSE_EVENT, handleThemeMotionPause);
    window.addEventListener(APP_MOTION_RESUME_EVENT, handleThemeMotionResume);
    document.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("visibilitychange", handleVisibility);
    motionPreference.addEventListener("change", handleMotionPreference);

    return () => {
      stop();
      window.clearTimeout(resizeTimer);
      window.clearTimeout(scrollResumeTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      window.removeEventListener(APP_MOTION_PAUSE_EVENT, handleThemeMotionPause);
      window.removeEventListener(APP_MOTION_RESUME_EVENT, handleThemeMotionResume);
      document.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  return <canvas ref={canvasRef} className="live-background-canvas" aria-hidden="true" />;
}

export function AppBackdrop() {
  return (
    <div className="animated-backdrop" aria-hidden="true">
      <div className="backdrop-grid" />
      <LiveBackground />
      <div className="backdrop-glow" />
    </div>
  );
}
