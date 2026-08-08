"use client";

import { useEffect, useRef } from "react";

import {
  APP_MOTION_PAUSE_EVENT,
  APP_MOTION_RESUME_EVENT,
} from "@/lib/performance/motion";

const DARK_FRAME_RATE = 12;
const LIGHT_FRAME_RATE = 10;
const POWER_SAVER_FRAME_RATE = 6;
const DARK_FRAME_INTERVAL = 1000 / DARK_FRAME_RATE;
const LIGHT_FRAME_INTERVAL = 1000 / LIGHT_FRAME_RATE;
const POWER_SAVER_FRAME_INTERVAL = 1000 / POWER_SAVER_FRAME_RATE;
const FRAME_TOLERANCE = 1;
const FRAME_WAKE_AHEAD = 2;
const MAX_FRAME_DELTA = 250;
const SCROLL_RESUME_DELAY = 140;
const RESIZE_DELAY = 120;
const MAX_BACKING_SCALE = 0.58;
const MAX_CANVAS_PIXELS = 360_000;
const MESH_SPRITE_SIZE = 128;
const TAU = Math.PI * 2;

type PerformanceNavigator = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

type MeshBlobBlueprint = {
  color: string;
  anchorX: number;
  anchorY: number;
  driftX: number;
  driftY: number;
  radius: number;
  duration: number;
  phase: number;
  darkOpacity: number;
  lightOpacity: number;
};

type MeshBlob = MeshBlobBlueprint & {
  sprite: HTMLCanvasElement;
};

const MESH_BLOBS: readonly MeshBlobBlueprint[] = [
  {
    color: "133, 92, 246",
    anchorX: 0.2,
    anchorY: 0.22,
    driftX: 0.08,
    driftY: 0.07,
    radius: 0.34,
    duration: 64,
    phase: 0.2,
    darkOpacity: 0.34,
    lightOpacity: 0.3,
  },
  {
    color: "38, 202, 180",
    anchorX: 0.82,
    anchorY: 0.28,
    driftX: 0.07,
    driftY: 0.08,
    radius: 0.31,
    duration: 71,
    phase: 1.8,
    darkOpacity: 0.27,
    lightOpacity: 0.27,
  },
  {
    color: "211, 72, 205",
    anchorX: 0.66,
    anchorY: 0.82,
    driftX: 0.09,
    driftY: 0.06,
    radius: 0.36,
    duration: 76,
    phase: 3.6,
    darkOpacity: 0.26,
    lightOpacity: 0.25,
  },
  {
    color: "66, 139, 245",
    anchorX: 0.36,
    anchorY: 0.64,
    driftX: 0.06,
    driftY: 0.08,
    radius: 0.29,
    duration: 58,
    phase: 5.1,
    darkOpacity: 0.22,
    lightOpacity: 0.22,
  },
];

const createMeshSprite = (color: string) => {
  const sprite = document.createElement("canvas");
  sprite.width = MESH_SPRITE_SIZE;
  sprite.height = MESH_SPRITE_SIZE;

  const spriteContext = sprite.getContext("2d");
  if (!spriteContext) return sprite;

  const center = MESH_SPRITE_SIZE / 2;
  const gradient = spriteContext.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, `rgba(${color}, 0.92)`);
  gradient.addColorStop(0.3, `rgba(${color}, 0.58)`);
  gradient.addColorStop(0.68, `rgba(${color}, 0.17)`);
  gradient.addColorStop(1, `rgba(${color}, 0)`);
  spriteContext.fillStyle = gradient;
  spriteContext.fillRect(0, 0, MESH_SPRITE_SIZE, MESH_SPRITE_SIZE);
  return sprite;
};

function LiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lightThemePreference = window.matchMedia("(prefers-color-scheme: light)");
    const performanceNavigator = navigator as PerformanceNavigator;
    const powerSaver = Boolean(
      performanceNavigator.connection?.saveData
      || (performanceNavigator.deviceMemory !== undefined && performanceNavigator.deviceMemory <= 4)
      || (performanceNavigator.hardwareConcurrency > 0 && performanceNavigator.hardwareConcurrency <= 4),
    );
    const blobs: MeshBlob[] = MESH_BLOBS.map((blob) => ({
      ...blob,
      sprite: createMeshSprite(blob.color),
    }));

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrame = 0;
    let frameTimer = 0;
    let resizeTimer = 0;
    let scrollResumeTimer = 0;
    let lastDrawTime = 0;
    let sceneTime = 0;
    let staticMotion = motionPreference.matches;
    let isPrinting = false;
    let isScrolling = false;
    let themeTransitionPaused = false;
    let windowFocused = document.hasFocus();
    let canvasVisible = true;

    const lightThemeActive = () => {
      const themeOverride = document.documentElement.dataset.theme;
      return themeOverride ? themeOverride === "light" : lightThemePreference.matches;
    };

    const drawMesh = () => {
      context.clearRect(0, 0, width, height);
      const lightTheme = lightThemeActive();
      const longSide = Math.max(width, height);

      for (let index = 0; index < blobs.length; index += 1) {
        const blob = blobs[index];
        const angle = (sceneTime / blob.duration) * TAU + blob.phase;
        const x = (blob.anchorX + Math.sin(angle) * blob.driftX) * width;
        const y = (blob.anchorY + Math.cos(angle * 0.86) * blob.driftY) * height;
        const radius = longSide * blob.radius;

        context.globalAlpha = lightTheme ? blob.lightOpacity : blob.darkOpacity;
        context.drawImage(blob.sprite, x - radius, y - radius, radius * 2, radius * 2);
      }

      context.globalAlpha = 1;
    };

    const resize = () => {
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);

      const deviceScale = Math.min(window.devicePixelRatio || 1, MAX_BACKING_SCALE);
      const budgetScale = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height));
      const backingScale = Math.min(deviceScale, budgetScale);

      canvas.width = Math.max(1, Math.floor(width * backingScale));
      canvas.height = Math.max(1, Math.floor(height * backingScale));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(backingScale, 0, 0, backingScale, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "low";
    };

    const canRender = () => (
      canvasVisible
      && !document.hidden
      && windowFocused
      && !isPrinting
      && !isScrolling
      && !themeTransitionPaused
    );

    const stop = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (frameTimer) window.clearTimeout(frameTimer);
      animationFrame = 0;
      frameTimer = 0;
    };

    const frameInterval = () => {
      if (powerSaver) return POWER_SAVER_FRAME_INTERVAL;
      return lightThemeActive() ? LIGHT_FRAME_INTERVAL : DARK_FRAME_INTERVAL;
    };

    const scheduleNextFrame = (delay: number) => {
      if (frameTimer) window.clearTimeout(frameTimer);
      frameTimer = window.setTimeout(() => {
        frameTimer = 0;
        if (!canRender() || staticMotion) return;
        animationFrame = window.requestAnimationFrame(renderFrame);
      }, Math.max(0, delay - FRAME_WAKE_AHEAD));
    };

    const renderFrame = (timestamp: number) => {
      animationFrame = 0;
      if (!canRender()) return;

      if (lastDrawTime === 0) {
        lastDrawTime = timestamp;
        drawMesh();
        if (!staticMotion) scheduleNextFrame(frameInterval());
        return;
      }

      const interval = frameInterval();
      const elapsed = timestamp - lastDrawTime;
      if (!staticMotion && elapsed < interval - FRAME_TOLERANCE) {
        scheduleNextFrame(interval - elapsed);
        return;
      }

      lastDrawTime = timestamp;
      if (!staticMotion) sceneTime += Math.min(elapsed, MAX_FRAME_DELTA) / 1000;
      drawMesh();
      if (!staticMotion) scheduleNextFrame(interval);
    };

    const start = () => {
      stop();
      lastDrawTime = 0;
      if (canRender()) animationFrame = window.requestAnimationFrame(renderFrame);
    };

    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        start();
      }, RESIZE_DELAY);
    };
    const handleVisibility = () => {
      if (canRender()) start();
      else stop();
    };
    const handleWindowBlur = () => {
      windowFocused = false;
      stop();
    };
    const handleWindowFocus = () => {
      windowFocused = true;
      if (canRender()) start();
    };
    const handleScroll = () => {
      isScrolling = true;
      stop();
      window.clearTimeout(scrollResumeTimer);
      scrollResumeTimer = window.setTimeout(() => {
        isScrolling = false;
        if (canRender()) start();
      }, SCROLL_RESUME_DELAY);
    };
    const handlePageHide = () => {
      stop();
    };
    const handlePageShow = () => {
      windowFocused = document.hasFocus();
      if (canRender()) start();
    };
    const handleBeforePrint = () => {
      isPrinting = true;
      stop();
    };
    const handleAfterPrint = () => {
      isPrinting = false;
      if (canRender()) start();
    };
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      staticMotion = event.matches;
      start();
    };
    const handleThemePreference = () => {
      if (canRender()) start();
    };
    const handleThemeMotionPause = () => {
      themeTransitionPaused = true;
      stop();
    };
    const handleThemeMotionResume = () => {
      themeTransitionPaused = false;
      if (canRender()) start();
    };

    const intersectionObserver = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          const visible = entry?.isIntersecting ?? true;
          if (visible === canvasVisible) return;

          canvasVisible = visible;
          if (canRender()) start();
          else stop();
        });
    const themeObserver = typeof MutationObserver === "undefined"
      ? null
      : new MutationObserver(() => {
          if (!document.hidden && canvasVisible && !isPrinting) drawMesh();
        });

    resize();
    intersectionObserver?.observe(canvas);
    themeObserver?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    start();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    window.addEventListener(APP_MOTION_PAUSE_EVENT, handleThemeMotionPause);
    window.addEventListener(APP_MOTION_RESUME_EVENT, handleThemeMotionResume);
    document.addEventListener("visibilitychange", handleVisibility);
    motionPreference.addEventListener("change", handleMotionPreference);
    lightThemePreference.addEventListener("change", handleThemePreference);

    return () => {
      stop();
      intersectionObserver?.disconnect();
      themeObserver?.disconnect();
      window.clearTimeout(resizeTimer);
      window.clearTimeout(scrollResumeTimer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      window.removeEventListener(APP_MOTION_PAUSE_EVENT, handleThemeMotionPause);
      window.removeEventListener(APP_MOTION_RESUME_EVENT, handleThemeMotionResume);
      document.removeEventListener("visibilitychange", handleVisibility);
      motionPreference.removeEventListener("change", handleMotionPreference);
      lightThemePreference.removeEventListener("change", handleThemePreference);
    };
  }, []);

  return <canvas ref={canvasRef} className="live-background-canvas" aria-hidden="true" />;
}

export function AppBackdrop() {
  return (
    <div className="animated-backdrop" aria-hidden="true">
      <div className="backdrop-grid" />
      <LiveBackground />
    </div>
  );
}
