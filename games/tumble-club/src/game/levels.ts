/* Level and theme definitions. Sections are assembled in order by the course builder. */

export type SectionType =
  | "sweep"
  | "seesaw"
  | "hammer"
  | "redlight"
  | "ballramp"
  | "tiles"
  | "walls"
  | "climb"
  | "bounce"
  | "treadmill"
  /* Frostbite Falls + Magma Forge challenges */
  | "ice"
  | "snow"
  | "wind"
  | "floes"
  | "lavahop"
  | "pistons"
  | "geysers"
  | "bumpers"
  | "firebars";

export type LevelStyle = "cove" | "frost" | "forge";

export interface Theme {
  id: "day" | "frost" | "forge";
  sunElevation: number; // degrees above horizon
  sunAzimuth: number; // degrees, 0 = +z (behind the runners), 90 = +x
  turbidity: number;
  rayleigh: number;
  mie: number;
  mieG: number;
  exposure: number;
  sunColor: number;
  sunIntensity: number;
  fillColor: number;
  fillIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  envIntensity: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  waterColor: number;
  waterDeep: number;
  cloudTint: number;
  stars: boolean;
  glow: number; // emissive boost on strips and lamps
  vignette: number;
  /** Elevation used for the key light (the moon at night). */
  lightElevation: number;
}

export interface LevelMods {
  sweepSpeed: number;
  hammerSpeed: number;
  ballInterval: number;
  greenTime: number;
  redTime: number;
  treadSpeed: number;
  seesawTilt: number;
}

export interface LevelDef {
  id: string;
  name: string;
  tagline: string;
  difficulty: 1 | 2 | 3;
  accent: string;
  style: LevelStyle;
  theme: Theme;
  sections: SectionType[];
  mods: LevelMods;
}

export const SECTION_LABELS: Record<SectionType, string> = {
  sweep: "SWEEPERS",
  seesaw: "SEESAWS",
  hammer: "HAMMERS",
  redlight: "RED LIGHT",
  ballramp: "BALL RAMP",
  tiles: "TIP TOE",
  walls: "WALL SQUEEZE",
  climb: "THE CLIMB",
  bounce: "BOUNCY BAY",
  treadmill: "TREADMILLS",
  ice: "GLACIER SLIDE",
  snow: "AVALANCHE",
  wind: "BLIZZARD BRIDGE",
  floes: "BREAKING FLOES",
  lavahop: "MAGMA HOPS",
  pistons: "PISTON ALLEY",
  geysers: "LAVA GEYSERS",
  bumpers: "BUMPER FIELD",
  firebars: "FIRE SPINNERS",
};

const DAY: Theme = {
  id: "day",
  sunElevation: 46,
  sunAzimuth: 62,
  turbidity: 3.2,
  rayleigh: 1.25,
  mie: 0.004,
  mieG: 0.8,
  exposure: 0.58,
  sunColor: 0xfff1d6,
  sunIntensity: 3.0,
  fillColor: 0xcfe9ff,
  fillIntensity: 0.12,
  hemiSky: 0xcfeaff,
  hemiGround: 0x3aa8a4,
  hemiIntensity: 0.3,
  envIntensity: 0.3,
  fogColor: 0xc4e4ee,
  fogNear: 90,
  fogFar: 330,
  waterColor: 0x1fb3b6,
  waterDeep: 0x0e7f93,
  cloudTint: 0xffffff,
  stars: false,
  glow: 0.7,
  vignette: 0.16,
  lightElevation: 46,
};

const FROST: Theme = {
  id: "frost",
  sunElevation: 30,
  sunAzimuth: 115,
  turbidity: 2.2,
  rayleigh: 0.9,
  mie: 0.003,
  mieG: 0.75,
  exposure: 0.62,
  sunColor: 0xeaf6ff,
  sunIntensity: 2.9,
  fillColor: 0xd6ecff,
  fillIntensity: 0.5,
  hemiSky: 0xd8ecff,
  hemiGround: 0x8fb8d8,
  hemiIntensity: 0.55,
  envIntensity: 0.45,
  fogColor: 0xcfe4f2,
  fogNear: 80,
  fogFar: 320,
  waterColor: 0x8fc3dd,
  waterDeep: 0x4e86ad,
  cloudTint: 0xf2f8ff,
  stars: false,
  glow: 0.5,
  vignette: 0.14,
  lightElevation: 30,
};

const FORGE: Theme = {
  id: "forge",
  sunElevation: 3,
  sunAzimuth: 250,
  turbidity: 9,
  rayleigh: 3.2,
  mie: 0.02,
  mieG: 0.9,
  exposure: 0.8,
  sunColor: 0xffb07a,
  sunIntensity: 2.2,
  fillColor: 0xffc2a0,
  fillIntensity: 1.15,
  hemiSky: 0x8a5a44,
  hemiGround: 0x3a1a10,
  hemiIntensity: 0.95,
  envIntensity: 0.5,
  fogColor: 0x38160e,
  fogNear: 55,
  fogFar: 270,
  waterColor: 0x7a1e05,
  waterDeep: 0x2a0a04,
  cloudTint: 0x8a4a34,
  stars: true,
  glow: 2.4,
  vignette: 0.34,
  lightElevation: 34,
};

export const LEVELS: LevelDef[] = [
  {
    id: "cove",
    name: "Cove Classic",
    tagline: "Sunny lagoon · 8 classic obstacles",
    difficulty: 1,
    accent: "#2ec9bd",
    style: "cove",
    theme: DAY,
    sections: ["sweep", "seesaw", "hammer", "redlight", "ballramp", "tiles", "walls", "climb"],
    mods: { sweepSpeed: 1, hammerSpeed: 1, ballInterval: 1, greenTime: 1, redTime: 1, treadSpeed: 1, seesawTilt: 1 },
  },
  {
    id: "frost",
    name: "Frostbite Falls",
    tagline: "Glacier storm · slides, avalanche & sinking floes",
    difficulty: 2,
    accent: "#7fd4f2",
    style: "frost",
    theme: FROST,
    sections: ["ice", "snow", "wind", "floes", "bumpers", "climb"],
    mods: { sweepSpeed: 1.05, hammerSpeed: 1, ballInterval: 0.95, greenTime: 1, redTime: 1, treadSpeed: 1, seesawTilt: 1 },
  },
  {
    id: "forge",
    name: "Magma Forge",
    tagline: "Volcano factory · pistons, geysers & lava hops",
    difficulty: 3,
    accent: "#ff7a2a",
    style: "forge",
    theme: FORGE,
    sections: ["pistons", "firebars", "geysers", "lavahop", "bumpers", "climb"],
    mods: { sweepSpeed: 1.18, hammerSpeed: 1.1, ballInterval: 0.9, greenTime: 0.95, redTime: 1.05, treadSpeed: 1, seesawTilt: 1 },
  },
];
