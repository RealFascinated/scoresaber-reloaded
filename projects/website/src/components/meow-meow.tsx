"use client";

import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useRef } from "react";

type SpriteName =
  | "idle"
  | "alert"
  | "scratchSelf"
  | "scratchWallN"
  | "scratchWallS"
  | "scratchWallE"
  | "scratchWallW"
  | "tired"
  | "sleeping"
  | "N"
  | "NE"
  | "E"
  | "SE"
  | "S"
  | "SW"
  | "W"
  | "NW";

const spriteSets: Record<SpriteName, number[][]> = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [
    [-5, 0],
    [-6, 0],
    [-7, 0],
  ],
  scratchWallN: [
    [0, 0],
    [0, -1],
  ],
  scratchWallS: [
    [-7, -1],
    [-6, -2],
  ],
  scratchWallE: [
    [-2, -2],
    [-2, -3],
  ],
  scratchWallW: [
    [-4, 0],
    [-4, -1],
  ],
  tired: [[-3, -2]],
  sleeping: [
    [-2, 0],
    [-2, -1],
  ],
  N: [
    [-1, -2],
    [-1, -3],
  ],
  NE: [
    [0, -2],
    [0, -3],
  ],
  E: [
    [-3, 0],
    [-3, -1],
  ],
  SE: [
    [-5, -1],
    [-5, -2],
  ],
  S: [
    [-6, -3],
    [-7, -2],
  ],
  SW: [
    [-5, -3],
    [-6, -1],
  ],
  W: [
    [-4, -2],
    [-4, -3],
  ],
  NW: [
    [-1, 0],
    [-1, -1],
  ],
};

export default function MeowMeow() {
  const database = useDatabase();
  const showKitty = useLiveQuery(async () => database.getShowKitty());
  const nekoElRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseMoveListenerRef = useRef<((event: MouseEvent) => void) | null>(null);

  // State refs to avoid re-renders
  const stateRef = useRef({
    lastFrameTimestamp: null as number | null,
    idleTime: 0,
    idleAnimation: null as string | null,
    idleAnimationFrame: 0,
    frameCount: 0,
    nekoPosX: 32,
    nekoPosY: 32,
    mousePosX: 0,
    mousePosY: 0,
  });

  const nekoSpeed = 10;

  const setSprite = useCallback((name: SpriteName, frame: number) => {
    if (!nekoElRef.current) return;
    const sprite = spriteSets[name][frame % spriteSets[name].length];
    nekoElRef.current.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  }, []);

  const resetIdleAnimation = useCallback(() => {
    stateRef.current.idleAnimation = null;
    stateRef.current.idleAnimationFrame = 0;
  }, []);

  const idle = useCallback(() => {
    const state = stateRef.current;
    state.idleTime += 1;

    if (
      state.idleTime > 10 &&
      Math.floor(Math.random() * 200) === 0 &&
      state.idleAnimation == null
    ) {
      const availableIdleAnimations = ["sleeping", "scratchSelf"];
      if (state.nekoPosX < 32) {
        availableIdleAnimations.push("scratchWallW");
      }
      if (state.nekoPosY < 32) {
        availableIdleAnimations.push("scratchWallN");
      }
      if (state.nekoPosX > window.innerWidth - 32) {
        availableIdleAnimations.push("scratchWallE");
      }
      if (state.nekoPosY > window.innerHeight - 32) {
        availableIdleAnimations.push("scratchWallS");
      }
      state.idleAnimation =
        availableIdleAnimations[Math.floor(Math.random() * availableIdleAnimations.length)];
    }

    switch (state.idleAnimation) {
      case "sleeping":
        if (state.idleAnimationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
        setSprite("sleeping", Math.floor(state.idleAnimationFrame / 4));
        if (state.idleAnimationFrame > 192) {
          resetIdleAnimation();
        }
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(state.idleAnimation as SpriteName, state.idleAnimationFrame);
        if (state.idleAnimationFrame > 9) {
          resetIdleAnimation();
        }
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    state.idleAnimationFrame += 1;
  }, [setSprite, resetIdleAnimation]);

  const frame = useCallback(() => {
    if (!nekoElRef.current) return;

    const state = stateRef.current;
    state.frameCount += 1;
    const diffX = state.nekoPosX - state.mousePosX;
    const diffY = state.nekoPosY - state.mousePosY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    if (distance < nekoSpeed || distance < 48) {
      idle();
      return;
    }

    state.idleAnimation = null;
    state.idleAnimationFrame = 0;

    if (state.idleTime > 1) {
      setSprite("alert", 0);
      state.idleTime = Math.min(state.idleTime, 7);
      state.idleTime -= 1;
      return;
    }

    let direction = "";
    direction = diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    setSprite(direction as SpriteName, state.frameCount);

    state.nekoPosX -= (diffX / distance) * nekoSpeed;
    state.nekoPosY -= (diffY / distance) * nekoSpeed;

    state.nekoPosX = Math.min(Math.max(16, state.nekoPosX), window.innerWidth - 16);
    state.nekoPosY = Math.min(Math.max(16, state.nekoPosY), window.innerHeight - 16);

    nekoElRef.current.style.left = `${state.nekoPosX - 16}px`;
    nekoElRef.current.style.top = `${state.nekoPosY - 16}px`;
  }, [idle, setSprite]);

  const onAnimationFrame = useCallback(
    (timestamp: number) => {
      if (!nekoElRef.current) {
        return;
      }
      const state = stateRef.current;
      if (!state.lastFrameTimestamp) {
        state.lastFrameTimestamp = timestamp;
      }
      if (timestamp - state.lastFrameTimestamp > 100) {
        state.lastFrameTimestamp = timestamp;
        frame();
      }
      animationFrameRef.current = window.requestAnimationFrame(onAnimationFrame);
    },
    [frame]
  );

  const init = useCallback(() => {
    const nekoEl = document.createElement("div");
    nekoElRef.current = nekoEl;
    nekoEl.id = "oneko";
    nekoEl.ariaHidden = "true";
    nekoEl.style.width = "32px";
    nekoEl.style.height = "32px";
    nekoEl.style.position = "fixed";
    nekoEl.style.pointerEvents = "none";
    nekoEl.style.imageRendering = "pixelated";

    const state = stateRef.current;
    nekoEl.style.left = `${state.nekoPosX - 16}px`;
    nekoEl.style.top = `${state.nekoPosY - 16}px`;
    nekoEl.style.zIndex = "2147483647";

    let nekoFile = "https://cdn.fascinated.cc/assets/oneko.gif";
    const curScript = document.currentScript;
    if (curScript && curScript.dataset.cat) {
      nekoFile = curScript.dataset.cat;
    }
    nekoEl.style.backgroundImage = `url(${nekoFile})`;

    document.body.appendChild(nekoEl);

    // Create mouse move listener
    const mouseMoveListener = (event: MouseEvent) => {
      stateRef.current.mousePosX = event.clientX;
      stateRef.current.mousePosY = event.clientY;
    };
    mouseMoveListenerRef.current = mouseMoveListener;
    document.addEventListener("mousemove", mouseMoveListener);

    animationFrameRef.current = window.requestAnimationFrame(onAnimationFrame);
  }, [onAnimationFrame]);

  const cleanup = useCallback(() => {
    // Clean up animation frame
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clean up mouse move listener
    if (mouseMoveListenerRef.current) {
      document.removeEventListener("mousemove", mouseMoveListenerRef.current);
      mouseMoveListenerRef.current = null;
    }

    // Clean up DOM element
    if (nekoElRef.current && nekoElRef.current.isConnected) {
      document.body.removeChild(nekoElRef.current);
    }
    nekoElRef.current = null;

    // Reset state
    stateRef.current = {
      lastFrameTimestamp: null,
      idleTime: 0,
      idleAnimation: null,
      idleAnimationFrame: 0,
      frameCount: 0,
      nekoPosX: 32,
      nekoPosY: 32,
      mousePosX: 0,
      mousePosY: 0,
    };
  }, []);

  // Memoize the showKitty value to prevent unnecessary re-renders
  const shouldShowKitty = useMemo(() => {
    return showKitty === true;
  }, [showKitty]);

  useEffect(() => {
    if (!shouldShowKitty) {
      cleanup();
      return;
    }

    init();

    return cleanup;
  }, [shouldShowKitty, init, cleanup]);

  // Return null to avoid rendering anything in the DOM
  return null;
}
