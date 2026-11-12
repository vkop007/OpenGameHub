import { useCallback, useEffect, useRef, useState } from "react";
import { Game } from "@/game/render";
import { CHARACTERS, HudState } from "@/game/core";
import { LEVELS } from "@/game/levels";

const initialHud: HudState = {
  phase: "title",
  countdown: 0,
  time: 0,
  place: 1,
  total: 8,
  splashes: 0,
  zaps: 0,
  banner: "",
  bannerTone: "none",
  progress: 0,
  section: "Start",
  finished: false,
  results: null,
  playerPlace: 1,
  playerTime: 0,
  checkpointFlash: 0,
  splashFlash: 0,
  zapFlash: 0,
  levelId: "cove",
  levelName: "Cove Classic",
  inRedLight: false,
};

const BEST_KEY = "tumble-club-best-v1";
const LEVEL_KEY = "tumble-club-level-v1";
const readBest = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || "{}");
  } catch {
    return {};
  }
};

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const fmt = (t: number) => {
  if (!t || t <= 0) return "—";
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
};

function Crown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M3 8.5l4.2 3.2L12 5l4.8 6.7L21 8.5l-1.6 9.2H4.6L3 8.5z" fill="currentColor" />
      <circle cx="12" cy="4" r="1.6" fill="currentColor" />
      <circle cx="3.4" cy="7.6" r="1.4" fill="currentColor" />
      <circle cx="20.6" cy="7.6" r="1.4" fill="currentColor" />
    </svg>
  );
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M8 5.5v13a1 1 0 001.53.85l10-6.5a1 1 0 000-1.7l-10-6.5A1 1 0 008 5.5z" />
    </svg>
  );
}

function Speaker({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5h3.2L12 5.5v13L7.2 14.5H4z" fill="currentColor" stroke="none" />
      {muted ? (
        <>
          <path d="M16 9.5l4 5M20 9.5l-4 5" />
        </>
      ) : (
        <>
          <path d="M15.5 9a4.2 4.2 0 010 6" />
          <path d="M18 6.5a7.5 7.5 0 010 11" />
        </>
      )}
    </svg>
  );
}

function Key({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <span
      className={`inline-flex h-7 items-center justify-center rounded-lg border border-b-[3px] border-[#d9cbb4] bg-white px-2 font-display text-[11px] font-semibold text-[var(--navy)] shadow-sm ${
        wide ? "min-w-[3.6rem]" : "min-w-[1.75rem]"
      }`}
    >
      {children}
    </span>
  );
}

function BeanDots() {
  return (
    <div className="flex items-center gap-1.5">
      {CHARACTERS.map((c) => (
        <span
          key={c.name}
          title={c.name}
          className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
          style={{ background: hex(c.color), boxShadow: `inset 0 -3px 0 rgba(0,0,0,0.12), 0 0 0 2px ${hex(c.hatColor)}55` }}
        />
      ))}
    </div>
  );
}

export default function GameView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudState>(initialHud);
  const [muted, setMuted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [glError, setGlError] = useState(false);
  const [levelIdx, setLevelIdx] = useState(0);
  const [best, setBest] = useState<Record<string, number>>({});
  const [newBest, setNewBest] = useState(false);
  const savedFinish = useRef<string>("");

  useEffect(() => {
    setIsTouch(typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    let game: Game | null = null;
    try {
      let start = 0;
      try {
        start = Math.max(0, Math.min(LEVELS.length - 1, Number(localStorage.getItem(LEVEL_KEY) || 0)));
      } catch {
        /* storage unavailable */
      }
      setLevelIdx(start);
      setBest(readBest());
      game = new Game(canvasRef.current, { onHud: setHud }, start);
      gameRef.current = game;
      (window as unknown as { __game?: Game }).__game = game;
    } catch (err) {
      console.error("Tumble Club failed to start", err);
      setGlError(true);
    }
    return () => {
      game?.dispose();
      gameRef.current = null;
    };
  }, []);

  const play = useCallback(() => {
    setNewBest(false);
    gameRef.current?.play();
  }, []);

  const selectLevel = useCallback((i: number) => {
    setLevelIdx(i);
    setNewBest(false);
    try {
      localStorage.setItem(LEVEL_KEY, String(i));
    } catch {
      /* ignore */
    }
    gameRef.current?.setLevel(i);
  }, []);

  // remember best times
  useEffect(() => {
    if (hud.phase !== "finished" || !hud.results) return;
    const mine = hud.results.find((r) => r.isPlayer);
    const key = `${hud.levelId}:${Math.round((mine?.time ?? 0) * 1000)}`;
    if (!mine || !mine.finished || savedFinish.current === key) return;
    savedFinish.current = key;
    const all = readBest();
    const prev = all[hud.levelId];
    if (!prev || mine.time < prev) {
      all[hud.levelId] = mine.time;
      setNewBest(true);
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(all));
      } catch {
        /* ignore */
      }
    }
    setBest(all);
  }, [hud.phase, hud.results, hud.levelId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Enter") return;
      if (hud.phase === "title" || hud.phase === "finished") {
        e.preventDefault();
        play();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hud.phase, play]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    gameRef.current?.setMuted(next);
  };

  const vkey = (key: "up" | "down" | "left" | "right" | "jump" | "dive" | "kick", down: boolean) => {
    gameRef.current?.setVirtual(key, down);
  };

  const showTitle = hud.phase === "title";
  const showCountdown = hud.phase === "countdown";
  const showRace = hud.phase === "racing" || hud.phase === "finished";
  const showGo = hud.phase === "racing" && hud.time < 0.85;
  const countNum = Math.max(1, Math.ceil(hud.countdown));
  const bannerVisible = hud.inRedLight && hud.bannerTone !== "none" && hud.phase !== "countdown";
  const toast =
    hud.zapFlash > 0
      ? { text: "Zapped! Freeze when it turns red", tone: "red" as const }
      : hud.splashFlash > 0
        ? { text: "Splash! Back to the last checkpoint", tone: "blue" as const }
        : hud.checkpointFlash > 0
          ? { text: "Checkpoint!", tone: "green" as const }
          : null;

  const results = hud.results ?? [];
  const playerResult = results.find((r) => r.isPlayer);
  const place = playerResult?.place ?? hud.playerPlace;
  const win = place === 1;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[var(--sky)] font-body text-[var(--navy)] select-none">
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />

      {glError && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-[var(--sky)] p-6 text-center">
          <div className="max-w-sm rounded-3xl border-4 border-white bg-[var(--cream)] p-6 shadow-xl">
            <div className="font-display text-2xl font-bold">Tumble Club needs WebGL</div>
            <p className="mt-2 text-sm font-semibold text-[var(--navy)]/60">
              Please enable hardware acceleration or try a recent version of Chrome, Edge, Firefox or Safari.
            </p>
          </div>
        </div>
      )}

      {/* soft vignette, strength follows the level's lighting */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(8,24,40,var(--vignette,0.2)) 100%)" }}
      />

      {/* progress line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1.5 bg-[var(--navy)]/10">
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-[var(--turquoise)] via-[var(--yellow)] to-[var(--coral)] transition-[width] duration-200"
          style={{ width: `${Math.max(2, hud.progress * 100)}%` }}
        />
      </div>

      {/* sound toggle */}
      {showTitle && (
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute right-3 top-4 z-40 grid h-10 w-10 place-items-center rounded-full border-2 border-white/70 bg-[var(--cream)]/90 text-[var(--navy)] shadow-md backdrop-blur transition hover:scale-105 active:scale-95"
        >
          <Speaker muted={muted} />
        </button>
      )}

      {/* ---------------- TITLE ---------------- */}
      {showTitle && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-start bg-gradient-to-r from-[var(--navy)]/25 via-transparent to-transparent p-5 sm:p-10">
          <div className="pointer-events-auto w-[min(92vw,430px)] animate-pop rounded-[2rem] border-4 border-white/80 bg-[var(--cream)]/95 p-5 shadow-[0_20px_50px_rgba(18,60,74,0.3)] backdrop-blur-sm sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 -rotate-6 place-items-center rounded-2xl bg-[var(--coral)] text-[var(--yellow)] shadow-[0_5px_0_var(--coral-dark)]">
                <Crown className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-[2.6rem] font-bold leading-[0.9] tracking-tight sm:text-5xl">
                  Tumble <span className="text-[var(--coral)]">Club</span>
                </h1>
                <p className="mt-1.5 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[var(--navy)]/45">
                  8 beans · 3 wild worlds
                </p>
              </div>
            </div>

            <p className="mt-4 text-[13px] font-semibold leading-snug text-[var(--navy)]/65">
              Bounce, dive and shove through three bizarre obstacle worlds — island, glacier and volcano. First bean to the arch takes the crown.
            </p>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--navy)]/40">
                <span>Course</span>
                <span className="flex items-center gap-1 normal-case tracking-normal text-[var(--navy)]/55">
                  {best[LEVELS[levelIdx].id] ? `Best ${fmt(best[LEVELS[levelIdx].id])}` : "No time yet"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {LEVELS.map((lv, i) => (
                  <button
                    key={lv.id}
                    onClick={() => selectLevel(i)}
                    aria-pressed={i === levelIdx}
                    className={`rounded-xl border-2 px-2 py-1.5 text-left transition ${
                      i === levelIdx ? "border-[var(--navy)] bg-white shadow-md" : "border-transparent bg-white/55 hover:bg-white/90"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ background: lv.accent }} />
                      <span className="font-display text-[12px] font-bold leading-none">{lv.name.split(" ")[0]}</span>
                    </span>
                    <span className="mt-1 flex gap-0.5">
                      {[1, 2, 3].map((d) => (
                        <span key={d} className={`h-1 w-3.5 rounded-full ${d <= lv.difficulty ? "bg-[var(--coral)]" : "bg-[var(--navy)]/12"}`} />
                      ))}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] font-bold text-[var(--navy)]/55">
                {LEVELS[levelIdx].name} · {LEVELS[levelIdx].tagline}
              </p>
            </div>

            <button
              onClick={play}
              className="group mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl border-b-[6px] border-[var(--coral-dark)] bg-[var(--coral)] px-6 py-3.5 font-display text-2xl font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-1 active:border-b-2"
            >
              <PlayIcon className="h-6 w-6 transition group-hover:scale-110" />
              Play
            </button>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-bold text-[var(--navy)]/60">
              <span className="flex items-center gap-1.5"><Key wide>WASD</Key> Move</span>
              <span className="flex items-center gap-1.5"><Key wide>Space</Key> Jump</span>
              <span className="flex items-center gap-1.5"><Key wide>Shift</Key> Dive</span>
              <span className="flex items-center gap-1.5"><Key>K</Key> Kick</span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--navy)]/10 pt-3">
              <BeanDots />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--navy)]/35">The club</span>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- COUNTDOWN ---------------- */}
      {showCountdown && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-between py-16">
          <div className="animate-pop text-center">
            <div className="font-display text-[7rem] font-bold leading-none text-white drop-shadow-[0_6px_0_rgba(18,60,74,0.35)] sm:text-[9rem]">
              {countNum}
            </div>
            <div className="mt-1 inline-block rounded-full bg-[var(--navy)]/75 px-4 py-1 font-display text-sm font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
              Ready, set, tumble
            </div>
          </div>

          <div className="w-[min(92vw,560px)] animate-pop rounded-[1.75rem] border-4 border-white/80 bg-[var(--cream)]/95 p-4 shadow-[0_16px_40px_rgba(18,60,74,0.28)] backdrop-blur-sm sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-lg font-bold">How to tumble</span>
              <span className="rounded-full bg-[var(--turquoise)]/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[var(--turquoise-dark)]">
                Controls
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { keys: ["W", "A", "S", "D"], label: "Move", sub: "or arrow keys" },
                { keys: ["Space"], label: "Jump", sub: "hold for higher" },
                { keys: ["Shift"], label: "Dive", sub: "belly-flop lunge" },
                { keys: ["K"], label: "Kick", sub: "shove rivals" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2 rounded-xl bg-white/70 p-2">
                  <div className="flex gap-1">
                    {row.keys.map((k) => (
                      <Key key={k} wide={k === "Space" || k === "Shift"}>{k}</Key>
                    ))}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-[13px] font-bold leading-tight">{row.label}</div>
                    <div className="truncate text-[10px] font-semibold text-[var(--navy)]/45">{row.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showGo && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
          <div className="animate-pop font-display text-[6rem] font-bold leading-none text-[var(--yellow)] drop-shadow-[0_6px_0_rgba(18,60,74,0.4)] sm:text-[8rem]">
            GO!
          </div>
        </div>
      )}

      {/* ---------------- RACE HUD ---------------- */}
      {showRace && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex items-start justify-between gap-2 px-3 sm:top-4 sm:px-5">
            <div className="flex items-center gap-2 rounded-2xl border-2 border-white/70 bg-[var(--cream)]/95 px-3 py-1.5 shadow-md backdrop-blur">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--coral)] font-display text-sm font-bold text-white">
                {hud.place}
              </div>
              <div className="leading-none">
                <div className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[var(--navy)]/40">Position</div>
                <div className="font-display text-sm font-bold">
                  {ordinal(hud.place)} <span className="text-[var(--navy)]/35">/ {hud.total}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="rounded-2xl border-2 border-white/70 bg-[var(--navy)]/85 px-4 py-1.5 text-center shadow-md backdrop-blur">
                <div className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-white/50">Time</div>
                <div className="font-display text-xl font-bold leading-none tabular-nums text-white">{fmt(hud.finished ? hud.playerTime : hud.time)}</div>
              </div>
              <div className="mt-1 rounded-full bg-[var(--cream)]/85 px-3 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[var(--navy)]/60 shadow-sm backdrop-blur">
                {hud.section}
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-2xl border-2 border-white/70 bg-[var(--cream)]/95 px-3 py-2 shadow-md backdrop-blur sm:flex">
              <span className="text-base">💦</span>
              <div className="leading-none">
                <div className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[var(--navy)]/40">Splashes</div>
                <div className="font-display text-sm font-bold">{hud.splashes}</div>
              </div>
            </div>
          </div>

          {bannerVisible && (
            <div className="pointer-events-none absolute inset-x-0 top-[5.6rem] z-20 flex justify-center px-4 sm:top-24">
              <div
                className={`animate-banner rounded-full border-4 border-white/80 px-5 py-2 text-center font-display text-base font-bold uppercase tracking-[0.12em] text-white shadow-lg backdrop-blur sm:text-xl ${
                  hud.bannerTone === "red"
                    ? "bg-[#e8453c]"
                    : hud.bannerTone === "yellow"
                      ? "bg-[#e8a91c]"
                      : "bg-[#1fae7a]"
                }`}
              >
                {hud.banner}
              </div>
            </div>
          )}

          {toast && (
            <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
              <div
                className={`animate-toast rounded-full border-2 border-white/70 px-4 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur ${
                  toast.tone === "red" ? "bg-[#e8453c]" : toast.tone === "blue" ? "bg-[#2b9fd8]" : "bg-[#1fae7a]"
                }`}
              >
                {toast.text}
              </div>
            </div>
          )}

          {!isTouch && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 hidden justify-center sm:flex">
              <div className="flex items-center gap-3 rounded-full border-2 border-white/25 bg-[var(--navy)]/70 px-4 py-1.5 text-[11px] font-bold text-white/90 shadow-md backdrop-blur">
                <span className="flex items-center gap-1"><Key>WASD</Key> Move</span>
                <span className="text-white/25">·</span>
                <span className="flex items-center gap-1"><Key wide>Space</Key> Jump</span>
                <span className="text-white/25">·</span>
                <span className="flex items-center gap-1"><Key wide>Shift</Key> Dive</span>
                <span className="text-white/25">·</span>
                <span className="flex items-center gap-1"><Key>K</Key> Kick</span>
              </div>
            </div>
          )}

          {isTouch && (
            <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between p-4">
              <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
                {[
                  ["", "up", ""],
                  ["left", "", "right"],
                  ["", "down", ""],
                ].map((row, ri) =>
                  row.map((dir, ci) =>
                    dir ? (
                      <button
                        key={`${ri}-${ci}`}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          vkey(dir as "up", true);
                        }}
                        onPointerUp={() => vkey(dir as "up", false)}
                        onPointerLeave={() => vkey(dir as "up", false)}
                        onPointerCancel={() => vkey(dir as "up", false)}
                        className="grid h-12 w-12 place-items-center rounded-xl border-2 border-white/60 bg-[var(--cream)]/85 text-lg font-bold text-[var(--navy)] shadow-md active:bg-[var(--yellow)]"
                      >
                        {dir === "up" ? "▲" : dir === "down" ? "▼" : dir === "left" ? "◀" : "▶"}
                      </button>
                    ) : (
                      <span key={`${ri}-${ci}`} />
                    ),
                  ),
                )}
              </div>
              <div className="flex items-end gap-2">
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    vkey("kick", true);
                  }}
                  onPointerUp={() => vkey("kick", false)}
                  onPointerLeave={() => vkey("kick", false)}
                  className="grid h-12 w-12 place-items-center rounded-full border-2 border-white/60 bg-[var(--purple)]/90 font-display text-[11px] font-bold text-white shadow-md active:scale-95"
                >
                  KICK
                </button>
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    vkey("dive", true);
                  }}
                  onPointerUp={() => vkey("dive", false)}
                  onPointerLeave={() => vkey("dive", false)}
                  className="grid h-12 w-12 place-items-center rounded-full border-2 border-white/60 bg-[var(--turquoise)]/90 font-display text-[11px] font-bold text-white shadow-md active:scale-95"
                >
                  DIVE
                </button>
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    vkey("jump", true);
                  }}
                  onPointerUp={() => vkey("jump", false)}
                  onPointerLeave={() => vkey("jump", false)}
                  className="grid h-16 w-16 place-items-center rounded-full border-2 border-white/60 bg-[var(--coral)] font-display text-xs font-bold text-white shadow-[0_5px_0_var(--coral-dark)] active:translate-y-1 active:shadow-none"
                >
                  JUMP
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------------- FINISH ---------------- */}
      {hud.phase === "finished" && results.length > 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--navy)]/35 p-4 backdrop-blur-[2px]">
          <div className="max-h-[92dvh] w-[min(94vw,470px)] animate-pop overflow-y-auto rounded-[2rem] border-4 border-white/80 bg-[var(--cream)] p-5 shadow-[0_24px_60px_rgba(18,60,74,0.4)] sm:p-6">
            <div className="flex items-center gap-3">
              <div
                className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl border-4 border-white font-display text-2xl font-bold text-white shadow-md ${
                  win ? "bg-[var(--yellow)] text-[var(--navy)]" : "bg-[var(--turquoise)]"
                }`}
              >
                {ordinal(place)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-[var(--navy)]/40">
                  {win ? "Club champion" : "Race complete"}
                  {newBest && <span className="rounded-full bg-[var(--yellow)] px-2 py-0.5 text-[9px] tracking-widest text-[var(--navy)]">New best</span>}
                </div>
                <h2 className="font-display text-3xl font-bold leading-none">
                  {win ? "You win!" : place <= 3 ? "Podium!" : "Nice tumble!"}
                </h2>
                <p className="mt-1 text-[12px] font-semibold text-[var(--navy)]/55">
                  {win ? "The crown is yours. Wear it proudly." : `You crossed the arch in ${ordinal(place)} place.`}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Time", value: fmt(playerResult?.time || hud.playerTime) },
                { label: "Splashes", value: String(hud.splashes) },
                { label: "Zaps", value: String(hud.zaps) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border-2 border-white bg-white/70 px-2 py-2 text-center">
                  <div className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[var(--navy)]/40">{s.label}</div>
                  <div className="font-display text-lg font-bold leading-tight tabular-nums">{s.value}</div>
                </div>
              ))}
            </div>

            <button
              onClick={play}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-b-[6px] border-[var(--coral-dark)] bg-[var(--coral)] px-5 py-3 font-display text-xl font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-1 active:border-b-2"
            >
              <PlayIcon className="h-5 w-5" />
              Race again
              <span className="ml-1 rounded-md bg-white/25 px-1.5 py-0.5 text-[10px] font-bold tracking-wider">ENTER</span>
            </button>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => selectLevel((levelIdx + 1) % LEVELS.length)}
                className="rounded-xl border-2 border-white bg-white/70 px-3 py-2 font-display text-[13px] font-bold transition hover:bg-white"
              >
                Next: {LEVELS[(levelIdx + 1) % LEVELS.length].name.split(" ")[0]} →
              </button>
              <button
                onClick={() => selectLevel(levelIdx)}
                className="rounded-xl border-2 border-white bg-white/70 px-3 py-2 font-display text-[13px] font-bold transition hover:bg-white"
              >
                Course select
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border-2 border-white bg-white/60">
              {results.map((r) => (
                <div
                  key={r.name}
                  className={`flex items-center gap-2 px-2.5 py-1.5 text-[12px] font-bold ${
                    r.isPlayer ? "bg-[var(--yellow)]/35" : ""
                  }`}
                >
                  <span className="w-5 text-center font-display text-[11px] text-[var(--navy)]/45">{r.place}</span>
                  <span className="h-3.5 w-3.5 rounded-full border border-white shadow-sm" style={{ background: hex(r.color) }} />
                  <span className="flex-1 truncate">
                    {r.name}
                    {r.isPlayer && <span className="ml-1 text-[9px] uppercase tracking-wider text-[var(--coral-dark)]">you</span>}
                  </span>
                  <span className="tabular-nums text-[var(--navy)]/55">{r.finished ? fmt(r.time) : "racing…"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* finish flash before results */}
      {hud.finished && hud.phase !== "finished" && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
          <div className="animate-pop rounded-3xl border-4 border-white/80 bg-[var(--yellow)] px-8 py-4 text-center shadow-2xl">
            <div className="font-display text-4xl font-bold text-[var(--navy)]">FINISH!</div>
            <div className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--navy)]/50">
              {ordinal(hud.playerPlace)} place · {fmt(hud.playerTime)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
