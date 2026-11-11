export const OPENGAMEHUB_BRIDGE_NAMESPACE = "opengamehub:bridge:v1" as const;

export type GameToPlatformMessageType =
  | "GAME_READY"
  | "LOADING_PROGRESS"
  | "GAME_ERROR"
  | "REQUEST_FULLSCREEN"
  | "GAME_STATUS";

export interface GameToPlatformMessage {
  namespace: typeof OPENGAMEHUB_BRIDGE_NAMESPACE;
  type: GameToPlatformMessageType;
  payload?: {
    progress?: number;
    message?: string;
    score?: number;
    level?: string | number;
    state?: "menu" | "playing" | "paused" | "gameover";
  };
}

export type PlatformToGameMessageType =
  | "BRIDGE_INIT"
  | "PAUSE_REQUEST"
  | "RESUME_REQUEST";

export interface PlatformToGameMessage {
  namespace: typeof OPENGAMEHUB_BRIDGE_NAMESPACE;
  type: PlatformToGameMessageType;
}

const VALID_GAME_MESSAGE_TYPES = new Set<GameToPlatformMessageType>([
  "GAME_READY",
  "LOADING_PROGRESS",
  "GAME_ERROR",
  "REQUEST_FULLSCREEN",
  "GAME_STATUS"
]);

export function validateGameMessage(raw: unknown): GameToPlatformMessage | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }
  const msg = raw as Record<string, unknown>;
  if (msg.namespace !== OPENGAMEHUB_BRIDGE_NAMESPACE) {
    return null;
  }
  if (
    typeof msg.type !== "string" ||
    !VALID_GAME_MESSAGE_TYPES.has(msg.type as GameToPlatformMessageType)
  ) {
    return null;
  }

  const sanitizedPayload: NonNullable<GameToPlatformMessage["payload"]> = {};
  if (msg.payload && typeof msg.payload === "object" && !Array.isArray(msg.payload)) {
    const p = msg.payload as Record<string, unknown>;
    if (typeof p.progress === "number" && Number.isFinite(p.progress)) {
      sanitizedPayload.progress = Math.max(0, Math.min(100, p.progress));
    }
    if (typeof p.message === "string") {
      sanitizedPayload.message = p.message.slice(0, 300);
    }
    if (typeof p.score === "number" && Number.isFinite(p.score)) {
      sanitizedPayload.score = p.score;
    }
    if (typeof p.level === "string" || typeof p.level === "number") {
      sanitizedPayload.level = String(p.level).slice(0, 48);
    }
    if (
      p.state === "menu" ||
      p.state === "playing" ||
      p.state === "paused" ||
      p.state === "gameover"
    ) {
      sanitizedPayload.state = p.state;
    }
  }

  return {
    namespace: OPENGAMEHUB_BRIDGE_NAMESPACE,
    type: msg.type as GameToPlatformMessageType,
    payload: sanitizedPayload
  };
}

/**
 * Optional client SDK for games that want to emit status/events to OpenGameHub.
 * Games do NOT need to import or use this helper to run in the Universal Game Player.
 */
export class OpenGameHubClientBridge {
  private port: MessagePort | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("message", (event: MessageEvent) => {
        const data = event.data as Partial<PlatformToGameMessage> | undefined;
        if (
          data &&
          data.namespace === OPENGAMEHUB_BRIDGE_NAMESPACE &&
          data.type === "BRIDGE_INIT" &&
          event.ports &&
          event.ports[0]
        ) {
          this.port = event.ports[0];
        }
      });
    }
  }

  private send(type: GameToPlatformMessageType, payload?: GameToPlatformMessage["payload"]): void {
    const msg: GameToPlatformMessage = {
      namespace: OPENGAMEHUB_BRIDGE_NAMESPACE,
      type,
      payload
    };
    if (this.port) {
      this.port.postMessage(msg);
    } else if (typeof window !== "undefined" && window.parent && window.parent !== window) {
      window.parent.postMessage(msg, "*");
    }
  }

  public ready(): void {
    this.send("GAME_READY");
  }

  public reportProgress(progress: number): void {
    this.send("LOADING_PROGRESS", { progress });
  }

  public reportError(message: string): void {
    this.send("GAME_ERROR", { message });
  }

  public requestFullscreen(): void {
    this.send("REQUEST_FULLSCREEN");
  }

  public updateStatus(status: {
    score?: number;
    level?: string | number;
    state?: "menu" | "playing" | "paused" | "gameover";
  }): void {
    this.send("GAME_STATUS", status);
  }
}
