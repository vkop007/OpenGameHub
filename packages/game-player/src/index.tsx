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
  RotateCcw,
  Pause,
  Play,
  Volume2,
  VolumeX,
  ShieldCheck
} from "lucide-react";

export interface UniversalGamePlayerProps {
  game: PublishedGameEntry;
  backHref?: string;
  showHeader?: boolean;
  showControlsFooter?: boolean;
}

export function UniversalGamePlayer({
  game,
  backHref = "/games",
  showHeader = true,
  showControlsFooter = true
}: UniversalGamePlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControlsGuide, setShowControlsGuide] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
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
    setIsPaused(false);
    setIframeKey((prev) => prev + 1);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      const iframeWin = iframeRef.current?.contentWindow;
      if (iframeWin) {
        iframeWin.postMessage(
          {
            namespace: OPENGAMEHUB_BRIDGE_NAMESPACE,
            type: next ? "PAUSE_GAME" : "RESUME_GAME"
          },
          "*"
        );
      }
      return next;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const iframeWin = iframeRef.current?.contentWindow;
      if (iframeWin) {
        iframeWin.postMessage(
          {
            namespace: OPENGAMEHUB_BRIDGE_NAMESPACE,
            type: next ? "MUTE_AUDIO" : "UNMUTE_AUDIO"
          },
          "*"
        );
      }
      return next;
    });
  }, []);

  const toolbarButton =
    "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]";

  return (
    <div className="flex w-full flex-col gap-5">
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href={backHref}
              data-testid="player-back-link"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[13px] font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Library</span>
            </a>
            <h1
              data-testid="player-game-title"
              className="text-lg font-semibold tracking-tight text-white"
            >
              {game.name}
            </h1>
            <span className="text-xs text-white/50">v{game.version}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowControlsGuide((prev) => !prev)}
            data-testid="player-toggle-info"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-[13px] font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
          >
            <Info className="h-3.5 w-3.5" />
            <span>{showControlsGuide ? "Hide controls" : "Controls"}</span>
          </button>
        </div>
      ) : (
        <div className="sr-only">
          <span data-testid="player-game-title">{game.name}</span>
          <a href={backHref} data-testid="player-back-link">
            Back
          </a>
        </div>
      )}

      {/* Stage */}
      <div
        ref={containerRef}
        data-testid="player-stage-container"
        className="flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_32px_80px_-24px_rgba(0,0,0,0.9)]"
      >
        <div
          className={`relative flex w-full items-center justify-center overflow-hidden bg-black ${
            isFullscreen ? "min-h-0 flex-1" : ""
          }`}
          style={isFullscreen ? undefined : { aspectRatio: game.aspectRatio.replace(":", "/") || "16/9" }}
        >
          {isLoading && (
            <div
              data-testid="player-loading-overlay"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 overflow-hidden bg-black text-white"
            >
              {game.thumbnail && (
                <img
                  src={game.thumbnail}
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-xl"
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-4">
                <Loader2 className="h-7 w-7 animate-spin text-[var(--color-accent)]" />
                <p className="text-sm text-white/70">Loading {game.name}</p>
                {loadingProgress !== null && (
                  <div className="h-1 w-44 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-200"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              data-testid="player-error-overlay"
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black/95 p-6 text-center"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h2 className="text-base font-semibold text-white">This game could not start</h2>
                <p className="text-sm leading-relaxed text-white/60">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-sm font-medium text-[var(--color-accent-ink)] transition-colors hover:bg-[var(--color-accent-strong)]"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Try again</span>
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

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0c0c0f] px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={togglePause}
              aria-pressed={isPaused}
              className={toolbarButton}
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4 fill-current" />
                  <span>Pause</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRestart}
              data-testid="player-restart-button"
              className={toolbarButton}
            >
              <RotateCcw className="h-4 w-4" />
              <span>Restart</span>
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-pressed={isMuted}
              className={toolbarButton}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {gameStatus?.score !== undefined && (
              <span
                data-testid="player-live-score"
                className="inline-flex h-7 items-center rounded-full bg-[var(--color-accent-soft)] px-3 text-xs font-semibold tabular-nums text-[var(--color-accent)]"
              >
                Score {gameStatus.score}
              </span>
            )}
            <button
              type="button"
              onClick={handleFullscreenToggle}
              data-testid="player-fullscreen-button"
              className={toolbarButton}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4" />
                  <span>Exit fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Controls guide */}
      {showControlsFooter && showControlsGuide ? (
        <div
          data-testid="player-controls-guide"
          className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] font-medium text-white/60">Controls</span>
            {game.controls.map((ctrl) => (
              <span
                key={ctrl}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/80"
              >
                {ctrl}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[13px] text-white/50">
            <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
            <span>Runs in a sandboxed iframe</span>
          </div>
        </div>
      ) : !showControlsFooter ? (
        <div className="sr-only" data-testid="player-controls-guide">
          {game.controls.join(", ")}
        </div>
      ) : null}
    </div>
  );
}
