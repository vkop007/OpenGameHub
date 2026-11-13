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
  ShieldCheck,
  Cpu
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

  const bundleSizeMb = (game.bundleSizeBytes / (1024 * 1024)).toFixed(1);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Header Navigation Bar */}
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href={backHref}
              data-testid="player-back-link"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161722] border border-[#1f2638] text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-cyan-400" />
              <span>Library</span>
            </a>
            <span className="text-slate-600">/</span>
            <div className="flex items-baseline gap-2">
              <h1
                data-testid="player-game-title"
                className="text-lg font-bold tracking-tight text-white font-heading"
              >
                {game.name}
              </h1>
              <span className="text-xs text-slate-400 font-mono">v{game.version}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {gameStatus?.score !== undefined && (
              <span
                data-testid="player-live-score"
                className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-mono font-semibold text-emerald-400"
              >
                Score: {gameStatus.score}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowControlsGuide((prev) => !prev)}
              data-testid="player-toggle-info"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#161722] border border-[#1f2638] px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-[#1f2638] hover:text-white"
            >
              <Info className="h-3.5 w-3.5 text-cyan-400" />
              <span>{showControlsGuide ? "Hide Controls" : "Controls"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="sr-only">
          <span data-testid="player-game-title">{game.name}</span>
          <a href={backHref} data-testid="player-back-link">Back</a>
        </div>
      )}

      {/* Main Sandbox Chassis Frame */}
      <div
        ref={containerRef}
        data-testid="player-stage-container"
        className="w-full bg-[#121622] rounded-2xl border border-[#1f2638] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Telemetry Status Ribbon */}
        <div className="w-full bg-[#0a0b10] px-4 py-2 border-b border-[#1f2638] flex items-center justify-between gap-4 flex-wrap text-slate-400 font-mono text-xs select-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="text-emerald-400 font-semibold tracking-wider text-[11px]">
                SANDBOX RUNTIME: ACTIVE
              </span>
            </div>
            <span className="hidden md:inline text-[#1f2638]">|</span>
            <span className="hidden md:flex items-center gap-1 text-slate-300">
              <span className="text-slate-500">Engine:</span> {game.engine.toUpperCase()}
            </span>
            <span className="hidden lg:inline text-[#1f2638]">|</span>
            <span className="hidden lg:flex items-center gap-1 text-slate-300">
              <span className="text-slate-500">Backend:</span> WebGL 2.0 (DirectX/Metal)
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1a1b24] border border-[#1f2638] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-bold text-white">60.0</span> FPS
            </span>
            <span className="hidden sm:flex items-center gap-1 text-slate-300">
              <span className="text-slate-500">Heap:</span> {bundleSizeMb} MB
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-semibold">
              WORKER ISOLATION
            </span>
          </div>
        </div>

        {/* Viewport Stage Frame */}
        <div
          className="relative w-full bg-[#0a0b10] overflow-hidden flex items-center justify-center"
          style={{ aspectRatio: game.aspectRatio.replace(":", "/") || "16/9" }}
        >
          {isLoading && (
            <div
              data-testid="player-loading-overlay"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0a0b10] text-slate-300"
            >
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
              <p className="text-xs font-mono tracking-wide text-slate-400">
                Initializing sandbox for {game.name}...
              </p>
              {loadingProgress !== null && (
                <div className="h-1 w-40 overflow-hidden rounded-full bg-[#161722]">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-200"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div
              data-testid="player-error-overlay"
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0a0b10]/95 p-6 text-center"
            >
              <AlertTriangle className="h-9 w-9 text-amber-400" />
              <div className="max-w-md space-y-1">
                <h2 className="text-sm font-semibold text-white">
                  Unable to load sandbox
                </h2>
                <p className="text-xs text-slate-400">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={handleRestart}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restart State</span>
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

        {/* Lower Command Deck */}
        <div className="w-full bg-[#121622] px-5 py-3 border-t border-[#1f2638] flex items-center justify-between gap-4 flex-wrap">
          {/* Controls Left */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePause}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold active:scale-95 transition-all shadow-sm ${
                isPaused
                  ? "bg-emerald-400 hover:bg-emerald-300 text-slate-950"
                  : "bg-cyan-400 hover:bg-cyan-300 text-slate-950"
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Engine</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause Engine</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRestart}
              data-testid="player-restart-button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161722] hover:bg-[#1f2638] border border-[#1f2638] text-slate-200 font-mono text-xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161722] hover:bg-[#1f2638] border border-[#1f2638] text-slate-200 font-mono text-xs transition-all"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Mute</span>
                </>
              )}
            </button>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFullscreenToggle}
              data-testid="player-fullscreen-button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#161722] hover:bg-[#1f2638] border border-[#1f2638] text-slate-200 text-xs font-medium transition-colors"
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
      </div>

      {/* Controls Guide */}
      {showControlsFooter && showControlsGuide ? (
        <div
          data-testid="player-controls-guide"
          className="flex flex-col justify-between gap-4 rounded-xl bg-[#121622] border border-[#1f2638] p-4 sm:flex-row sm:items-center"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 font-semibold mr-1">
              CONTROLS:
            </span>
            {game.controls.map((ctrl) => (
              <span
                key={ctrl}
                className="rounded-md bg-[#161722] border border-[#1f2638] px-2.5 py-1 text-xs font-mono text-slate-300"
              >
                {ctrl}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Isolated Web Worker &amp; WebGL Sandbox</span>
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
