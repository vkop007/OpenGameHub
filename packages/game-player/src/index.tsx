"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { PublishedGameEntry } from "@opengamehub/game-registry";
import {
  OPENGAMEHUB_BRIDGE_NAMESPACE,
  validateGameMessage,
  type GameToPlatformMessage
} from "@opengamehub/game-bridge";
import {
  AlertTriangle,
  ArrowLeft,
  Info,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw
} from "lucide-react";

export interface UniversalGamePlayerProps {
  game: PublishedGameEntry;
  backHref?: string;
}

export function UniversalGamePlayer({
  game,
  backHref = "/games"
}: UniversalGamePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControlsGuide, setShowControlsGuide] = useState<boolean>(true);
  const [gameStatus, setGameStatus] = useState<{
    score?: number;
    level?: string | number;
    state?: string;
  } | null>(null);

  const handleFullscreenToggle = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore fullscreen denial in restricted environments
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  const handleMessagePayload = useCallback(
    (validated: GameToPlatformMessage) => {
      switch (validated.type) {
        case "GAME_READY":
          setIsLoading(false);
          setLoadingProgress(100);
          break;
        case "LOADING_PROGRESS":
          if (typeof validated.payload?.progress === "number") {
            setLoadingProgress(validated.payload.progress);
          }
          break;
        case "GAME_ERROR":
          setErrorMessage(
            validated.payload?.message ?? "The game reported a runtime error."
          );
          setIsLoading(false);
          break;
        case "REQUEST_FULLSCREEN":
          void handleFullscreenToggle();
          break;
        case "GAME_STATUS":
          if (validated.payload) {
            setGameStatus({
              score: validated.payload.score,
              level: validated.payload.level,
              state: validated.payload.state
            });
          }
          break;
      }
    },
    [handleFullscreenToggle]
  );

  useEffect(() => {
    const onWindowMessage = (event: MessageEvent) => {
      if (
        iframeRef.current &&
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }
      const validated = validateGameMessage(event.data);
      if (validated) {
        handleMessagePayload(validated);
      }
    };

    window.addEventListener("message", onWindowMessage);
    return () => {
      window.removeEventListener("message", onWindowMessage);
    };
  }, [handleMessagePayload]);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);

    const iframeWin = iframeRef.current?.contentWindow;
    if (iframeWin && typeof MessageChannel !== "undefined") {
      try {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event: MessageEvent) => {
          const validated = validateGameMessage(event.data);
          if (validated) {
            handleMessagePayload(validated);
          }
        };
        iframeWin.postMessage(
          {
            namespace: OPENGAMEHUB_BRIDGE_NAMESPACE,
            type: "BRIDGE_INIT"
          },
          "*",
          [channel.port2]
        );
      } catch {
        // Ignore if browser blocks port transfer to opaque sandbox origin
      }
    }

    try {
      iframeRef.current?.focus();
    } catch {
      // ignore
    }
  }, [handleMessagePayload]);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setErrorMessage("Failed to load game frame. Please try restarting the game.");
  }, []);

  const handleRestart = useCallback(() => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingProgress(null);
    setGameStatus(null);
    setIframeKey((prev) => prev + 1);
  }, []);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Clean Unboxed Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <a
            href={backHref}
            data-testid="player-back-link"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Library</span>
          </a>
          <span className="text-zinc-700">/</span>
          <div className="flex items-baseline gap-2.5">
            <h1
              data-testid="player-game-title"
              className="text-lg font-bold tracking-tight text-white"
            >
              {game.name}
            </h1>
            <span className="text-xs text-zinc-500">by {game.author}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {gameStatus?.score !== undefined && (
            <span
              data-testid="player-live-score"
              className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300"
            >
              Score: {gameStatus.score}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowControlsGuide((prev) => !prev)}
            data-testid="player-toggle-info"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.1] hover:text-white"
          >
            <Info className="h-3.5 w-3.5" />
            <span>{showControlsGuide ? "Hide Info" : "Controls"}</span>
          </button>
          <button
            type="button"
            onClick={handleRestart}
            data-testid="player-restart-button"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.1] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restart</span>
          </button>
          <button
            type="button"
            onClick={handleFullscreenToggle}
            data-testid="player-fullscreen-button"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sandboxed Responsive Game Stage (The primary visual frame) */}
      <div
        ref={containerRef}
        data-testid="player-stage-container"
        className="relative w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/10 shadow-2xl"
        style={{ aspectRatio: game.aspectRatio.replace(":", "/") || "16/9" }}
      >
        {isLoading && (
          <div
            data-testid="player-loading-overlay"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-300"
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-xs font-medium tracking-wide text-zinc-400">
              Launching {game.name}...
            </p>
            {loadingProgress !== null && (
              <div className="h-1 w-40 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-white transition-all duration-200"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <div
            data-testid="player-error-overlay"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-zinc-950/95 p-6 text-center"
          >
            <AlertTriangle className="h-9 w-9 text-amber-400" />
            <div className="max-w-md space-y-1">
              <h2 className="text-sm font-semibold text-zinc-100">
                Unable to load game
              </h2>
              <p className="text-xs text-zinc-400">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restart</span>
            </button>
          </div>
        )}

        <iframe
          key={iframeKey}
          ref={iframeRef}
          data-testid="game-iframe"
          src={game.playUrl}
          title={game.name}
          sandbox="allow-scripts allow-pointer-lock"
          allow="fullscreen; gamepad"
          allowFullScreen
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          className="h-full w-full border-0"
        />
      </div>

      {/* Unboxed Subtle Controls & Description Footer */}
      {showControlsGuide && (
        <div
          data-testid="player-controls-guide"
          className="flex flex-col justify-between gap-6 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 mr-1">Controls:</span>
            {game.controls.map((ctrl) => (
              <span
                key={ctrl}
                className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-mono text-zinc-300"
              >
                {ctrl}
              </span>
            ))}
          </div>

          <p className="text-xs text-zinc-500">
            Engine: <span className="text-zinc-300 uppercase">{game.engine}</span> • Sandboxed iframe
          </p>
        </div>
      )}
    </div>
  );
}
