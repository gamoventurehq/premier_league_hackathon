import { useSyncExternalStore } from "react";
import {
  FrameTelemetry,
  TacticalBlackboard,
  PersonaMode,
  SupportedLanguage,
  PlayerKinematics,
  BallKinematics,
  PassingLane,
  PitchControlCell,
  MatchMetrics,
  NarrativeEvent,
  AgentTrace,
  MatchEvent,
  ShotRecord,
  PlayerMatchStats,
} from "../types/telemetry";

export type { SupportedLanguage, MatchEvent };

export interface ServerStatus {
  isConnected: boolean;
  latencyMs: number;
  lastSyncTime: number;
}

export interface MatchScore {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
}

export type ThemeMode = "dark" | "light";

export interface TacticalInflectionItem {
  time: string;
  timeSec: number;
  title: string;
  detail: string;
  impact: string;
}

export interface SwarmCommentaryItem {
  time: string;
  timeSec: number;
  agent: string;
  role: string;
  text: string;
}

export interface BaseMemoryState {
  matchClock: number;
  score: MatchScore;
  currentFrame: FrameTelemetry | null;
  blackboard: TacticalBlackboard;
  selectedPersona: PersonaMode;
  selectedLanguage: SupportedLanguage;
  selectedPlayerId: string | null;
  serverStatus: ServerStatus;
  theme: ThemeMode;
  tacticalInflections: TacticalInflectionItem[];
  swarmCommentary: SwarmCommentaryItem[];
  activeScenario: string | null;
  matchEvents: MatchEvent[];
}

const initialTacticalInflections: TacticalInflectionItem[] = [
  {
    time: "42'",
    timeSec: 2520,
    title: "Low-Block Breakthrough",
    detail: "Haaland finished from 11m following a 14-pass sequence. Shot xG: 0.74, Pass Difficulty Rating: 88%.",
    impact: "Home Momentum +28%",
  },
  {
    time: "69'",
    timeSec: 4140,
    title: "Flank Overload Adjustment",
    detail: "Guardiola introduced Grealish to stretch Arsenal's 4-2-3-1, creating space for De Bruyne's curling strike.",
    impact: "Control Index 74%",
  },
  {
    time: "84'",
    timeSec: 5040,
    title: "Rapid Counter-Transition",
    detail: "Saka broke City's rest-defense in 4 touches, punishing high line positioning with an equalizer.",
    impact: "Game Rhythm Shift",
  },
];

const initialSwarmCommentary: SwarmCommentaryItem[] = [
  { time: "88'", timeSec: 5280, agent: "Tactical Agent", role: "Shape Analyst", text: "Arsenal shifted into a narrow 4-4-2 block to restrict central progression, forcing City wide." },
  { time: "84'", timeSec: 5040, agent: "Narrative Agent", role: "Story Synthesizer", text: "Saka's clinical counter-attack punctures City's momentum and restores emotional equilibrium." },
  { time: "69'", timeSec: 4140, agent: "Telemetry Agent", role: "Spatial Tracking", text: "Centroid compression detected: City squeezed Arsenal's defensive line within 18 meters." },
  { time: "42'", timeSec: 2520, agent: "Personalization Agent", role: "Casual Focus", text: "Haaland's lethal instinct on display! 10th Premier League goal of the campaign in emphatic fashion." },
];

export function sanitizeText(val: unknown, fallback = "", activeLang: SupportedLanguage = "en"): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") {
    const rec = val as Record<string, unknown>;
    const langVal = rec[activeLang] ?? rec.en;
    if (typeof langVal === "string") return sanitizeText(langVal, fallback, activeLang);
    return fallback;
  }
  const s = String(val).trim();
  if (s.includes("NarrativeDraft(") || s.includes("[object Object]")) {
    return fallback;
  }
  return s;
}

const initialNarrativeMultilingual = {
  headline: {
    en: "Man City sustained possession pinning Arsenal in low defensive block.",
    es: "Posesión sostenida del Man City encerrando al Arsenal en bloque bajo defensivo.",
    fr: "Possession soutenue de Man City enfermant Arsenal dans un bloc bas défensif.",
    ja: "マンチェスター・シティがポゼッションを維持し、アーセナルを低位ブロックに封じ込める。",
    ar: "مانشستر سيتي يفرض حصار الاستحواذ ويجبر أرسنال على التراجع في كتلة دفاعية منخفضة.",
  },
  tacticalExplanation: {
    en: "High territorial compression in the central corridor with Pass Difficulty Rating at 0.42.",
    es: "Alta compresión territorial en el pasillo interior con Índice de Dificultad de Pase en 0.42.",
    fr: "Forte compression territoriale dans l'axe avec indice de difficulté de passe à 0,42.",
    ja: "中央レーンでの高い陣形圧縮、パス難易度レーティングは0.42を記録。",
    ar: "ضغط مساحي مكثف في الممر المركزي مع مؤشر صعوبة تمرير يبلغ 0.42.",
  },
};

const SCENARIO_MULTILINGUAL: Record<
  string,
  { headline: Record<SupportedLanguage, string>; tacticalExplanation: Record<SupportedLanguage, string> }
> = {
  low_block_siege: {
    headline: {
      en: "Man City sustained siege: 82% territorial control compressing Arsenal into 18m depth",
      es: "Asedio total: Man City asfixia al Arsenal en su propio tercio defensivo con 82% de control",
      fr: "Siège implacable : Man City accule Arsenal dans ses 18 mètres avec 82% de contrôle",
      ja: "完全な包囲網：マンチェスター・シティが82%の支配率でアーセナルを自陣深くに釘付けにする",
      ar: "حصار مطبق: مانشستر سيتي يخنق أرسنال في مناطقه الدفاعية بنسبة سيطرة 82%",
    },
    tacticalExplanation: {
      en: "Central corridor compacted to 21.2m. City generating 1.84 xG via De Bruyne half-space delivery, Rest-Defense resting on halfway line.",
      es: "Pasillo central compactado a 21.2m. City generando 1.84 xG por el medio espacio, repliegue defensivo en mediocampo.",
      fr: "Axe central compacté à 21,2 m. City génère 1,84 xG par le demi-espace, bloc défensif calé sur la ligne médiane.",
      ja: "中央レーンが21.2mに凝縮。デ・ブライネのハーフスペース供給から1.84 xGを創出、ハーフウェーラインに構えるレストディフェンス。",
      ar: "الممر المركزي مضغوط حتى 21.2 م. سيتي يولد 1.84 xG عبر تمريرات دي بروين في نصف المساحة، مع وقوف الدفاع على خط المنتصف.",
    },
  },
  rapid_counter: {
    headline: {
      en: "Arsenal rapid counter-attack: Saka breakaway punishing high defensive line in 3 touches",
      es: "¡Contragolpe letal! Saka rompe las líneas a velocidad supersónica castigando la línea alta",
      fr: "Attaque éclair ! Saka transperce les lignes sur un contre supersonique en 3 touches",
      ja: "電光石火のカウンター！サカが縦への鋭い推進力で3タッチでハイラインを切り裂く",
      ar: "صاعقة مرتدة! ساكا يمزق الخطوط بانطلاقة خاطفة ويعاقب الدفاع المتقدم في 3 لمسات",
    },
    tacticalExplanation: {
      en: "Transition Frenzy triggered: City rest-defense fractured by vertical channel pass. Saka sprint velocity clocked at 33.2 km/h.",
      es: "Frenesí de transición activado: repliegue del City fracturado por pase vertical. Saka registra 33.2 km/h.",
      fr: "Frénésie de transition déclenchée : repli de City fracturé par une passe verticale. Sprint de Saka chronométré à 33,2 km/h.",
      ja: "トランジションフレンジー発生：縦パスでシティの守備陣が分断。サカのスプリント速度は33.2 km/hを記録。",
      ar: "فوضى التحولات السريعة: دفاع سيتي يتفكك بتمريرة عمودية، وسرعة انطلاق ساكا بلغت 33.2 كم/ساعة.",
    },
  },
  red_card_crisis: {
    headline: {
      en: "Red Card Crisis: Arsenal down to 10 men, forced into emergency 5-3-1 bunker",
      es: "Crisis de tarjeta roja: Arsenal con 10 hombres, obligado a atrincherarse en un 5-3-1 de emergencia",
      fr: "Crise du carton rouge : Arsenal réduit à 10, forcé à un bunker d'urgence en 5-3-1",
      ja: "レッドカードの危機：アーセナルが10人となり、緊急の5-3-1要塞へ移行",
      ar: "أزمة بطاقة حمراء: أرسنال يلعب بـ 10 لاعبين ومجبر على تكتل دفاعي طارئ 5-3-1",
    },
    tacticalExplanation: {
      en: "Numerical asymmetry alters pitch control surface: City now control 84% of pitch space with 2-man overload on flanks.",
      es: "La asimetría numérica altera el control del campo: City domina el 84% del espacio con superioridad en bandas.",
      fr: "L'asymétrie numérique modifie le contrôle du terrain : City contrôle désormais 84% de l'espace avec surcharge sur les ailes.",
      ja: "数的非対称によりピッチコントロールが激変：シティがサイドの数的優位でピッチの84%を支配。",
      ar: "النقص العددي يغير خارطة السيطرة على الملعب: سيتي يسيطر على 84% من المساحة بتفوق عددي على الأطراف.",
    },
  },
  box_scramble: {
    headline: {
      en: "Total Chaos: 6 players contesting rebound in 6-yard box with 0.82 xG goalmouth scramble",
      es: "Caos absoluto: 6 jugadores disputan el rechace en el área pequeña con 0.82 xG en un remate frenético",
      fr: "Chaos absolu : 6 joueurs se disputent le ballon dans les six mètres avec 0,82 xG de cafouillage",
      ja: "ゴール前大混戦！6ヤードボックス内で6選手がリバウンドを争う0.82 xGの激闘",
      ar: "فوضى عارمة: 6 لاعبين يتصارعون على الكرة المرتدة داخل الست ياردات بفرصة 0.82 xG",
    },
    tacticalExplanation: {
      en: "Maximum volatility state: Chaos index 85%. Ball velocity 0 mps with 8 defenders within 4m radius of goal line.",
      es: "Estado de máxima volatilidad: Índice de caos al 85%. Balón suelto con 8 defensores a 4m de la línea.",
      fr: "Volatilité maximale : Indice de chaos à 85%. Vitesse du ballon nulle avec 8 défenseurs à moins de 4m de la ligne.",
      ja: "最大ボラティリティ状態：カオス指数85%。ゴールラインから4m以内に8人の守備陣が密集。",
      ar: "أعلى درجات الفوضى التكتيكية: مؤشر الفوضى 85%، مع تمركز 8 مدافعين على بعد 4 أمتار من خط المرمى.",
    },
  },
};

const initialBlackboard: TacticalBlackboard = {
  latest_frame_id: 0,
  current_game_rhythm: "structured_possession",
  control_index: 64,
  chaos_index: 36,
  active_tactical_inflection: false,
  latest_pdr: 0.42,
  narrative_headline: initialNarrativeMultilingual.headline.en,
  narrative_explanation: initialNarrativeMultilingual.tacticalExplanation.en,
  narrative_multilingual: initialNarrativeMultilingual,
  persona_overviews: {
    analyst:
      "Defensive block compact in central corridor (width 26.4m). Passing network shows 82% ball progression via right half-space.",
    casual:
      "Total siege! City are relentless on the edge of the box, searching for the killer pass.",
    player_cam:
      "Tracking Home #7: 29.8 km/h sprint burst into the penalty box. Off-ball distance covered: 3.4 km.",
    club_centric:
      "City asserting complete control with 68% territorial dominance in the final third.",
  },
};

const initialState: BaseMemoryState = {
  matchClock: 1458, // 24:18 min
  score: {
    homeTeam: "MCI",
    awayTeam: "ARS",
    homeScore: 1,
    awayScore: 0,
    period: "1st Half",
  },
  currentFrame: null,
  blackboard: initialBlackboard,
  selectedPersona: "analyst",
  selectedLanguage: "en",
  selectedPlayerId: "home_7",
  serverStatus: {
    isConnected: false,
    latencyMs: 0,
    lastSyncTime: Date.now(),
  },
  theme: "dark",
  tacticalInflections: initialTacticalInflections,
  swarmCommentary: initialSwarmCommentary,
  activeScenario: null,
  matchEvents: [],
};

export function normalizeFrame(raw: unknown): FrameTelemetry {
  if (!raw || typeof raw !== "object") {
    return {
      frame_id: 0,
      timestamp_ms: Date.now(),
      match_clock_sec: 0,
      ball: {
        x: 52.5,
        y: 34.0,
        z: 0,
        velocity_mps: 0,
        speed_kmh: 0,
      },
      players: [],
      control_chaos: { control: 50, chaos: 50 },
      game_rhythm: "structured_possession",
      active_tactical_inflection: false,
      events: [],
      shots: [],
      playerStats: [],
    };
  }

  const r = raw as Record<string, unknown>;
  const metrics = r.metrics as Record<string, unknown> | undefined;
  const controlChaos = r.control_chaos as Record<string, unknown> | undefined;
  const latestNarrative = r.latestNarrative as Record<string, unknown> | undefined;

  // 1. Control vs Chaos
  // Read frame.metrics?.controlVsChaosIndex ?? frame.control_chaos?.control ?? 50 and chaos 100 - control
  const controlVal = metrics?.controlVsChaosIndex ?? controlChaos?.control ?? 50;
  const control = Math.round(Number(controlVal));
  const chaos = Math.round(
    Number(controlChaos?.chaos ?? (100 - control))
  );

  // 2. Ball
  const rawBall = (r.ball && typeof r.ball === "object" ? r.ball : {}) as Record<string, unknown>;
  const bvx = typeof rawBall.vx === "number" ? rawBall.vx : 0;
  const bvy = typeof rawBall.vy === "number" ? rawBall.vy : 0;
  const bVel = typeof rawBall.velocity_mps === "number"
    ? rawBall.velocity_mps
    : (rawBall.vx !== undefined && rawBall.vy !== undefined ? Math.hypot(bvx, bvy) : 0);
  const bSpeedKmh = typeof rawBall.speed_kmh === "number"
    ? rawBall.speed_kmh
    : (typeof rawBall.speedKmH === "number" ? Number(rawBall.speedKmH) : bVel * 3.6);
  const bCarrier = (rawBall.carrier_player_id ?? rawBall.possessionPlayerId ?? null) as string | null;

  const normalizedBall: BallKinematics = {
    x: typeof rawBall.x === "number" ? rawBall.x : 52.5,
    y: typeof rawBall.y === "number" ? rawBall.y : 34.0,
    z: typeof rawBall.z === "number" ? rawBall.z : 0,
    velocity_mps: bVel,
    speed_kmh: bSpeedKmh,
    carrier_player_id: bCarrier,
    vx: bvx,
    vy: bvy,
    vz: typeof rawBall.vz === "number" ? rawBall.vz : 0,
    speedKmH: bSpeedKmh,
    possessionTeam: (rawBall.possessionTeam as "home" | "away" | null) ?? null,
    possessionPlayerId: bCarrier,
  };

  // 3. Players
  const rawPlayers: unknown[] = Array.isArray(r.players) ? r.players : [];
  const normalizedPlayers: PlayerKinematics[] = rawPlayers.map((item) => {
    const p = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const pId = String(p.player_id ?? p.id ?? "");
    const pNum = Number(p.shirt_number ?? p.number ?? 0);
    const isCarrier = Boolean(p.is_ball_carrier ?? p.onBall ?? (bCarrier && bCarrier === pId));

    const vx = typeof p.vx === "number" ? p.vx : 0;
    const vy = typeof p.vy === "number" ? p.vy : 0;
    const hasCartesian = p.vx !== undefined && p.vy !== undefined;

    const velMps = typeof p.velocity_mps === "number"
      ? p.velocity_mps
      : (hasCartesian ? Math.hypot(vx, vy) : 0);
    const speedKmh = typeof p.speed_kmh === "number"
      ? p.speed_kmh
      : (typeof p.speedKmH === "number" ? Number(p.speedKmH) : velMps * 3.6);

    let headingDeg: number;
    if (typeof p.heading_deg === "number") {
      headingDeg = p.heading_deg;
    } else if (hasCartesian) {
      headingDeg = (Math.atan2(vy, vx) * 180) / Math.PI;
      if (isNaN(headingDeg)) headingDeg = 0;
    } else {
      headingDeg = 0;
    }

    return {
      player_id: pId,
      id: pId,
      name: String(p.name ?? ""),
      shortName: String(p.shortName ?? p.name ?? ""),
      team: p.team === "away" ? "away" : "home",
      shirt_number: pNum,
      number: pNum,
      position: String(p.position ?? "MID"),
      role: String(p.role ?? (p.position === "GK" ? "GK" : "MF")),
      x: typeof p.x === "number" ? p.x : 0,
      y: typeof p.y === "number" ? p.y : 0,
      vx,
      vy,
      velocity_mps: velMps,
      speed_kmh: speedKmh,
      speedKmH: speedKmh,
      heading_deg: headingDeg,
      is_ball_carrier: isCarrier,
      onBall: isCarrier,
      distanceMeters: typeof p.distanceMeters === "number" ? p.distanceMeters : 0,
      touches: typeof p.touches === "number" ? p.touches : 0,
      homeX: typeof p.homeX === "number" ? p.homeX : (typeof p.x === "number" ? p.x : 0),
      homeY: typeof p.homeY === "number" ? p.homeY : (typeof p.y === "number" ? p.y : 0),
      isDesignatedPlayerCam: Boolean(p.isDesignatedPlayerCam),
    };
  });

  const frameId = Number(r.frame_id ?? r.frameId ?? 0);
  const matchClockSec = Number(r.match_clock_sec ?? r.matchSeconds ?? 0);
  const gameRhythm = String(
    r.game_rhythm ??
    metrics?.gameRhythm ??
    (chaos < 45 ? "structured_possession" : "counter_attacking_transition")
  );
  const activeInflection = Boolean(
    r.active_tactical_inflection ??
    latestNarrative?.isTacticalInflectionPoint ??
    false
  );

  return {
    frame_id: frameId,
    timestamp_ms: Number(r.timestamp_ms ?? Date.now()),
    match_clock_sec: matchClockSec,
    ball: normalizedBall,
    players: normalizedPlayers,
    control_chaos: {
      control,
      chaos,
    },
    game_rhythm: gameRhythm,
    active_tactical_inflection: activeInflection,

    // Canonical fields compatibility
    frameId,
    matchClock: typeof r.matchClock === "string" ? r.matchClock : `${Math.floor(matchClockSec / 60)}:${Math.floor(matchClockSec % 60).toString().padStart(2, "0")}`,
    matchSeconds: matchClockSec,
    scenario: typeof r.scenario === "string" ? r.scenario : undefined,
    score: (r.score as { home: number; away: number }) ?? undefined,
    passingLanes: (r.passingLanes as PassingLane[]) ?? undefined,
    pitchControlCells: (r.pitchControlCells as PitchControlCell[]) ?? undefined,
    metrics: (metrics as unknown as MatchMetrics) ?? undefined,
    latestNarrative: (latestNarrative as unknown as NarrativeEvent) ?? undefined,
    agentTrace: (r.agentTrace as AgentTrace[]) ?? undefined,
    events: Array.isArray(r.events) ? (r.events as MatchEvent[]) : (r.events ? (r.events as MatchEvent[]) : []),
    shots: Array.isArray(r.shots) ? (r.shots as ShotRecord[]) : (r.shots ? (r.shots as ShotRecord[]) : []),
    playerStats: Array.isArray(r.playerStats) ? (r.playerStats as PlayerMatchStats[]) : (r.playerStats ? (r.playerStats as PlayerMatchStats[]) : []),
  };
}

export function normalizeBlackboard(raw: unknown, current: TacticalBlackboard): TacticalBlackboard {
  if (!raw || typeof raw !== "object") return current;

  const r = raw as Record<string, unknown>;

  const latestFrameId = r.latest_frame_id !== undefined
    ? Number(r.latest_frame_id)
    : r.frame_id !== undefined
    ? Number(r.frame_id)
    : r.frameId !== undefined
    ? Number(r.frameId)
    : current.latest_frame_id;

  const currentGameRhythm = String(
    r.current_game_rhythm ?? r.game_rhythm ?? current.current_game_rhythm
  );

  let controlIndex = current.control_index;
  let chaosIndex = current.chaos_index;
  if (r.control_index !== undefined) {
    controlIndex = Math.round(Number(r.control_index));
    chaosIndex = Math.round(Number(r.chaos_index ?? (100 - controlIndex)));
  } else if (r.control_vs_chaos !== undefined) {
    chaosIndex = Math.round(Number(r.control_vs_chaos));
    controlIndex = 100 - chaosIndex;
  }

  let activeInflection = current.active_tactical_inflection;
  if (r.active_tactical_inflection !== undefined) {
    activeInflection = Boolean(r.active_tactical_inflection);
  } else if (Array.isArray(r.inflection_candidates)) {
    activeInflection = r.inflection_candidates.length > 0;
  }

  let latestPdr = current.latest_pdr;
  if (r.latest_pdr !== undefined) {
    latestPdr = Number(r.latest_pdr);
  } else if (r.pass_difficulty_rating !== undefined) {
    const rawPdr = Number(r.pass_difficulty_rating);
    latestPdr = rawPdr > 1.0 ? rawPdr / 100 : rawPdr;
  }

  let narrativeHeadline = current.narrative_headline;
  let narrativeExplanation = current.narrative_explanation || "";
  const narrative = r.narrative as Record<string, unknown> | string | undefined;
  const multiStream = r.multilingual_stream as Record<string, unknown> | undefined;
  const activeLang = baseMemory?.getState()?.selectedLanguage || "en";

  // Build multilingual narrative dictionary
  let multiHeadline: Record<string, string> | undefined = current.narrative_multilingual?.headline;
  let multiExplanation: Record<string, string> | undefined = current.narrative_multilingual?.tacticalExplanation;

  if (multiStream && typeof multiStream === "object") {
    if (multiStream.headline && typeof multiStream.headline === "object") {
      multiHeadline = { ...multiHeadline, ...(multiStream.headline as Record<string, string>) };
    }
    if (multiStream.tacticalExplanation && typeof multiStream.tacticalExplanation === "object") {
      multiExplanation = { ...multiExplanation, ...(multiStream.tacticalExplanation as Record<string, string>) };
    }
  }

  if (narrative && typeof narrative === "object") {
    const nHead = narrative.headline as Record<string, unknown> | string | undefined;
    const nExp = narrative.tacticalExplanation as Record<string, unknown> | string | undefined;
    if (nHead && typeof nHead === "object") {
      multiHeadline = { ...multiHeadline, ...(nHead as Record<string, string>) };
    }
    if (nExp && typeof nExp === "object") {
      multiExplanation = { ...multiExplanation, ...(nExp as Record<string, string>) };
    }
  }

  // Resolve headline in active language or fallback
  if (multiHeadline && multiHeadline[activeLang]) {
    narrativeHeadline = multiHeadline[activeLang];
  } else if (multiHeadline && multiHeadline.en) {
    narrativeHeadline = multiHeadline.en;
  } else if (typeof narrative === "string" && !narrative.startsWith("NarrativeDraft(")) {
    narrativeHeadline = narrative;
  } else if (typeof r.narrative_headline === "string" && !r.narrative_headline.startsWith("NarrativeDraft(")) {
    narrativeHeadline = r.narrative_headline;
  } else if (typeof r.headline === "string" && !r.headline.startsWith("NarrativeDraft(")) {
    narrativeHeadline = r.headline;
  } else if (typeof r.narrative_arc === "string" && !r.narrative_arc.startsWith("NarrativeDraft(")) {
    narrativeHeadline = r.narrative_arc;
  }

  // Resolve tactical explanation in active language
  if (multiExplanation && multiExplanation[activeLang]) {
    narrativeExplanation = multiExplanation[activeLang];
  } else if (multiExplanation && multiExplanation.en) {
    narrativeExplanation = multiExplanation.en;
  }

  // Defensive sanitization: never leak raw NarrativeDraft repr or [object Object]
  narrativeHeadline = sanitizeText(
    narrativeHeadline,
    current.narrative_headline && !current.narrative_headline.startsWith("NarrativeDraft(")
      ? current.narrative_headline
      : "Manchester City and Arsenal contest tactical space in high-tempo Premier League clash.",
    activeLang
  );

  if (narrativeExplanation) {
    narrativeExplanation = sanitizeText(narrativeExplanation, current.narrative_explanation || "", activeLang);
  }

  const personaOverviews = r.persona_overviews as Record<string, string> | undefined;

  const analyst = String(
    r.analyst_context ??
    personaOverviews?.analyst ??
    current.persona_overviews.analyst
  );

  const casual = String(
    r.casual_context ??
    personaOverviews?.casual ??
    current.persona_overviews.casual
  );

  const playerCam = String(
    r.player_cam_context ??
    personaOverviews?.player_cam ??
    current.persona_overviews.player_cam
  );

  let clubCentric =
    personaOverviews?.club_centric ??
    current.persona_overviews.club_centric ??
    "";

  if (r.club_centric_context !== undefined) {
    if (typeof r.club_centric_context === "string") {
      clubCentric = r.club_centric_context;
    } else if (typeof r.club_centric_context === "object" && r.club_centric_context !== null) {
      const cc = r.club_centric_context as Record<string, unknown>;
      const homeFrame = String(cc.homeFrame || "");
      const awayFrame = String(cc.awayFrame || "");
      clubCentric = homeFrame && awayFrame ? `${homeFrame} | ${awayFrame}` : (homeFrame || awayFrame);
    }
  }

  return {
    latest_frame_id: latestFrameId,
    current_game_rhythm: currentGameRhythm,
    control_index: controlIndex,
    chaos_index: chaosIndex,
    active_tactical_inflection: activeInflection,
    latest_pdr: latestPdr,
    narrative_headline: narrativeHeadline,
    narrative_explanation: narrativeExplanation,
    narrative_multilingual: {
      headline: multiHeadline,
      tacticalExplanation: multiExplanation,
    },
    persona_overviews: {
      analyst,
      casual,
      player_cam: playerCam,
      club_centric: clubCentric,
    },
  };
}

class BaseMemoryStore {
  private state: BaseMemoryState = initialState;
  private listeners: Set<() => void> = new Set();

  getState = (): BaseMemoryState => {
    return this.state;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  // --- Actions to update Base Memory from Server or UI ---

  updateFrame = (rawFrame: unknown) => {
    const frame = normalizeFrame(rawFrame);

    // Also sync match score if available in frame
    let updatedScore = this.state.score;
    if (frame.score && typeof frame.score.home === "number" && typeof frame.score.away === "number") {
      updatedScore = {
        ...this.state.score,
        homeScore: frame.score.home,
        awayScore: frame.score.away,
      };
    }

    const ctrl = this.state.activeScenario ? this.state.blackboard.control_index : frame.control_chaos.control;
    const chs = this.state.activeScenario ? this.state.blackboard.chaos_index : frame.control_chaos.chaos;
    const rhythm = this.state.activeScenario ? this.state.blackboard.current_game_rhythm : frame.game_rhythm;
    const activeInflection = this.state.activeScenario ? true : frame.active_tactical_inflection;

    let updatedEvents = this.state.matchEvents;
    if (frame.events && frame.events.length > 0) {
      const eventMap = new Map<string, MatchEvent>();
      for (const e of this.state.matchEvents) {
        eventMap.set(e.id, e);
      }
      for (const e of frame.events) {
        eventMap.set(e.id, e);
      }
      updatedEvents = Array.from(eventMap.values())
        .sort((a, b) => a.timestampMs - b.timestampMs)
        .slice(-200);
    }

    this.state = {
      ...this.state,
      currentFrame: frame,
      matchClock: frame.match_clock_sec,
      score: updatedScore,
      matchEvents: updatedEvents,
      blackboard: {
        ...this.state.blackboard,
        latest_frame_id: frame.frame_id,
        current_game_rhythm: rhythm,
        control_index: ctrl,
        chaos_index: chs,
        active_tactical_inflection: activeInflection,
      },
    };
    this.notify();
  };

  clearPlayback = () => {
    this.state = {
      ...this.state,
      matchEvents: [],
    };
    this.notify();
  };

  updateBlackboard = (blackboardUpdates: unknown) => {
    this.state = {
      ...this.state,
      blackboard: normalizeBlackboard(blackboardUpdates, this.state.blackboard),
    };
    this.notify();
  };

  get language(): SupportedLanguage {
    return this.state.selectedLanguage;
  }

  setPersona = (persona: PersonaMode) => {
    this.state = {
      ...this.state,
      selectedPersona: persona,
    };
    this.notify();
  };

  setLanguage = (language: SupportedLanguage) => {
    let updatedBlackboard = this.state.blackboard;
    const multi = this.state.blackboard.narrative_multilingual;
    if (multi) {
      const newHead = multi.headline?.[language] || multi.headline?.en || updatedBlackboard.narrative_headline;
      const newExp = multi.tacticalExplanation?.[language] || multi.tacticalExplanation?.en || updatedBlackboard.narrative_explanation;
      updatedBlackboard = {
        ...updatedBlackboard,
        narrative_headline: sanitizeText(newHead, updatedBlackboard.narrative_headline, language),
        narrative_explanation: sanitizeText(newExp, updatedBlackboard.narrative_explanation || "", language),
      };
    }

    this.state = {
      ...this.state,
      selectedLanguage: language,
      blackboard: updatedBlackboard,
    };
    this.notify();
  };

  setSelectedPlayer = (playerId: string | null) => {
    this.state = {
      ...this.state,
      selectedPlayerId: playerId,
    };
    this.notify();
  };

  setServerStatus = (status: Partial<ServerStatus>) => {
    this.state = {
      ...this.state,
      serverStatus: {
        ...this.state.serverStatus,
        ...status,
      },
    };
    this.notify();
  };

  setMatchClock = (sec: number) => {
    this.state = {
      ...this.state,
      matchClock: sec,
    };
    this.notify();
  };

  updateScore = (updates: Partial<MatchScore>) => {
    this.state = {
      ...this.state,
      score: {
        ...this.state.score,
        ...updates,
      },
    };
    this.notify();
  };

  setTheme = (theme: ThemeMode) => {
    this.state = {
      ...this.state,
      theme,
    };
    if (typeof document !== "undefined") {
      const isDark = theme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("ion-palette-dark", isDark);
      document.documentElement.setAttribute("data-theme", theme);
    }
    this.notify();
  };

  toggleTheme = () => {
    const nextTheme = this.state.theme === "dark" ? "light" : "dark";
    this.setTheme(nextTheme);
  };

  injectScenario = (scenarioId: string) => {
    let blackboardUpdate: Partial<TacticalBlackboard> = {};
    let inflectionTitle = "";
    let inflectionDetail = "";
    let inflectionImpact = "";

    const activeLang = this.state.selectedLanguage;
    const scenarioMulti = SCENARIO_MULTILINGUAL[scenarioId];

    if (scenarioId === "low_block_siege") {
      blackboardUpdate = {
        control_index: 82,
        chaos_index: 18,
        current_game_rhythm: "sustained_possession",
        latest_pdr: 0.68,
        active_tactical_inflection: true,
        narrative_headline: scenarioMulti?.headline[activeLang] || scenarioMulti?.headline.en || "Man City sustained siege: 82% territorial control compressing Arsenal into 18m depth",
        narrative_explanation: scenarioMulti?.tacticalExplanation[activeLang] || scenarioMulti?.tacticalExplanation.en,
        narrative_multilingual: scenarioMulti,
        persona_overviews: {
          analyst: "Central corridor compacted to 21.2m. City generating 1.84 xG via De Bruyne half-space delivery, Rest-Defense resting on halfway line.",
          casual: "Total siege! City are relentless on the edge of the box, searching for the killer pass.",
          player_cam: "Tracking Home #17 (De Bruyne): 42 passes completed, hovering in the right half-space channel with 94% execution.",
          club_centric: "City asserting complete territorial authority with 82% control in Arsenal's defensive third.",
        },
      };
      inflectionTitle = "Low-Block Siege Injected";
      inflectionDetail = "Arsenal compressed to 18m block depth. City holding 82% pitch control.";
      inflectionImpact = "Home Control 82%";
    } else if (scenarioId === "rapid_counter") {
      blackboardUpdate = {
        control_index: 26,
        chaos_index: 74,
        current_game_rhythm: "transition_frenzy",
        latest_pdr: 0.35,
        active_tactical_inflection: true,
        narrative_headline: scenarioMulti?.headline[activeLang] || scenarioMulti?.headline.en || "Arsenal rapid counter-attack: Saka breakaway punishing high defensive line in 3 touches",
        narrative_explanation: scenarioMulti?.tacticalExplanation[activeLang] || scenarioMulti?.tacticalExplanation.en,
        narrative_multilingual: scenarioMulti,
        persona_overviews: {
          analyst: "Transition Frenzy triggered: City rest-defense fractured by vertical channel pass. Saka sprint velocity clocked at 33.2 km/h.",
          casual: "Lightning breakaway! Saka bursts down the right wing with only the goalkeeper to beat!",
          player_cam: "Tracking Away #8 (Saka): Sprint burst peaked at 33.2 km/h across 48 meters in open transition.",
          club_centric: "Arsenal executing textbook vertical counter-strike, catching City's fullbacks stranded upfield.",
        },
      };
      inflectionTitle = "Rapid Counter Injected";
      inflectionDetail = "Saka sprint burst clocked at 33.2 km/h, breaking rest-defense.";
      inflectionImpact = "Transition Chaos 74%";
    } else if (scenarioId === "red_card_crisis") {
      blackboardUpdate = {
        control_index: 88,
        chaos_index: 42,
        current_game_rhythm: "numerical_asymmetry",
        latest_pdr: 0.76,
        active_tactical_inflection: true,
        narrative_headline: scenarioMulti?.headline[activeLang] || scenarioMulti?.headline.en || "Red Card Crisis: Arsenal down to 10 men, forced into emergency 5-3-1 bunker",
        narrative_explanation: scenarioMulti?.tacticalExplanation[activeLang] || scenarioMulti?.tacticalExplanation.en,
        narrative_multilingual: scenarioMulti,
        persona_overviews: {
          analyst: "Numerical asymmetry (-1 player) alters pitch control surface: City now control 84% of pitch space with 2-man overload on flanks.",
          casual: "Red card drama! Arsenal are down to 10 men and fighting desperately to hold on to the point!",
          player_cam: "Tracking Away #7 (Rice): High-strain defensive shift covering 4.8 km to bridge the missing midfield pivot.",
          club_centric: "Arsenal in heroic defensive resistance, throwing bodies on the line to preserve the draw.",
        },
      };
      inflectionTitle = "Red Card Crisis Injected";
      inflectionDetail = "Arsenal down to 10 men. Emergency 5-3-1 bunker engaged.";
      inflectionImpact = "Numerical Asymmetry -1";
    } else if (scenarioId === "box_scramble") {
      blackboardUpdate = {
        control_index: 15,
        chaos_index: 85,
        current_game_rhythm: "penalty_box_chaos",
        latest_pdr: 0.88,
        active_tactical_inflection: true,
        narrative_headline: scenarioMulti?.headline[activeLang] || scenarioMulti?.headline.en || "Total Chaos: 6 players contesting rebound in 6-yard box with 0.82 xG goalmouth scramble",
        narrative_explanation: scenarioMulti?.tacticalExplanation[activeLang] || scenarioMulti?.tacticalExplanation.en,
        narrative_multilingual: scenarioMulti,
        persona_overviews: {
          analyst: "Maximum volatility state: Chaos index 85%. Ball velocity 0 mps with 8 defenders within 4m radius of goal line.",
          casual: "Heart-in-mouth moment! Desperate goal-line clearances and blocks inside the 6-yard box!",
          player_cam: "Tracking Home #10 (Haaland): 2 consecutive close-range attempts blocked by desperate sliding challenges.",
          club_centric: "City inches away from the winner! Agonizing scramble on the goal-line!",
        },
      };
      inflectionTitle = "Penalty Box Scramble Injected";
      inflectionDetail = "Chaos Index spiked to 85% with 6 players contesting rebound in 6-yard box.";
      inflectionImpact = "Max Chaos 85%";
    }

    const newInflection: TacticalInflectionItem = {
      time: "Live",
      timeSec: this.state.matchClock,
      title: inflectionTitle,
      detail: inflectionDetail,
      impact: inflectionImpact,
    };

    this.state = {
      ...this.state,
      activeScenario: scenarioId,
      blackboard: {
        ...this.state.blackboard,
        ...blackboardUpdate,
      },
      tacticalInflections: [newInflection, ...this.state.tacticalInflections],
    };

    this.notify();
  };

  resetScenario = () => {
    const lang = this.state.selectedLanguage;
    const localizedHeadline = initialNarrativeMultilingual.headline[lang] || initialNarrativeMultilingual.headline.en;
    const localizedExplanation = initialNarrativeMultilingual.tacticalExplanation[lang] || initialNarrativeMultilingual.tacticalExplanation.en;

    this.state = {
      ...this.state,
      activeScenario: null,
      blackboard: {
        ...initialBlackboard,
        narrative_headline: localizedHeadline,
        narrative_explanation: localizedExplanation,
        narrative_multilingual: initialNarrativeMultilingual,
        latest_frame_id: this.state.blackboard.latest_frame_id,
      },
    };

    this.notify();
  };
}

export const baseMemory = new BaseMemoryStore();

/**
 * Universal React Hook connecting any screen or component to Single Base Memory
 */
export function useBaseMemory<T>(selector: (state: BaseMemoryState) => T): T {
  return useSyncExternalStore(
    baseMemory.subscribe,
    () => selector(baseMemory.getState()),
    () => selector(baseMemory.getState())
  );
}
