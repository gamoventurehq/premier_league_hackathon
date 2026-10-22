/**
 * Multilingual narrative generation.
 *
 * Every line the studio shows is produced here from live telemetry — the
 * player on the ball, the Pass Difficulty Rating of the release, the Control
 * vs. Chaos Index at that instant. Nothing is a pre-written string, so the
 * narrative cannot drift out of step with the pitch.
 *
 * This module is the *rule-based fallback* path described in ADR 0004: it
 * runs without any model in the loop. When the backend agent swarm is
 * connected, its generated narrative supersedes this one and the studio
 * labels the source accordingly.
 *
 * Canonical metric names (Pitch Control, Pass Difficulty Rating, Control vs.
 * Chaos Index, Tactical Inflection Point) are left in English in every
 * language: they are the fixed terms in CONTEXT.md and a broadcast graphic
 * would carry them untranslated.
 */

import { MultilingualNarrative, NarrativeEvent, TeamSide } from '../types/telemetry';

export type NarrativeKind = 'shot' | 'goal' | 'turnover' | 'duel' | 'inflection';

export type InflectionCause =
  | 'press_intensified'
  | 'defensive_block_set'
  | 'transition_opened'
  | 'possession_chain_broken';

export interface NarrativeSlots {
  player: string;
  opponent: string;
  team: string;
  opponentTeam: string;
  clock: string;
  /** Where on the pitch the moment happened. */
  zone: ZoneDescriptor;
  xg: string;
  pdr: string;
  chaos: string;
  rhythm: string;
  pitchControl: string;
  cause?: string;
}

/** A position on the pitch, in words. */
export interface ZoneDescriptor {
  third: 'defensive' | 'middle' | 'final';
  channel: 'left' | 'central' | 'right';
}

const ZONE_TEXT: Record<keyof MultilingualNarrative, (z: ZoneDescriptor) => string> = {
  en: (z) =>
    `${z.channel === 'left' ? 'left channel' : z.channel === 'right' ? 'right channel' : 'central corridor'} in the ${z.third} third`,
  es: (z) =>
    `${z.channel === 'left' ? 'canal izquierdo' : z.channel === 'right' ? 'canal derecho' : 'corredor central'} en el ${z.third === 'defensive' ? 'tercio defensivo' : z.third === 'middle' ? 'tercio medio' : 'tercio final'}`,
  fr: (z) =>
    `${z.channel === 'left' ? 'couloir gauche' : z.channel === 'right' ? 'couloir droit' : 'couloir central'} dans le ${z.third === 'defensive' ? 'tier défensif' : z.third === 'middle' ? 'tier médian' : 'tier offensif'}`,
  ja: (z) =>
    `${z.channel === 'left' ? '左サイド' : z.channel === 'right' ? '右サイド' : '中央'}\、${z.third === 'defensive' ? '自衛ライン' : z.third === 'middle' ? '中盤' : 'フォアライン'}`,
  ar: (z) =>
    `${z.channel === 'left' ? 'المسار الأيسر' : z.channel === 'right' ? 'المسار الأيمن' : 'المسار الأوسط'} في ${z.third === 'defensive' ? 'الثلث الدفاعي' : z.third === 'middle' ? 'الثلث الأوسط' : 'الثلث الأخير'}`,
};

export const TEAM_NAMES: Record<TeamSide, string> = {
  home: 'Manchester City',
  away: 'Arsenal',
};

/* ------------------------------------------------------------------ */
/* Localised cause phrases                                             */
/* ------------------------------------------------------------------ */

const CAUSE_TEXT: Record<InflectionCause, MultilingualNarrative> = {
  press_intensified: {
    en: 'the press has been turned up',
    es: 'la presión ha subido el ritmo',
    fr: 'le pressing a été intensifié',
    ja: 'プレスの強度が上がった',
    ar: 'تم رفع وتيرة الضغط',
  },
  defensive_block_set: {
    en: 'the defensive block has been set',
    es: 'el bloque defensivo se ha colocado',
    fr: 'le bloc défensif est en place',
    ja: '守備ブロックが固まった',
    ar: 'تم وضع الكتلة الدفاعية',
  },
  transition_opened: {
    en: 'the game has opened up',
    es: 'el partido se ha abierto',
    fr: "le match s'est ouvert",
    ja: '試合が開放された',
    ar: 'انفتحت المباراة',
  },
  possession_chain_broken: {
    en: 'the possession chain keeps breaking',
    es: 'la cadena de posesión se rompe una y otra vez',
    fr: 'la chaîne de possession ne cesse de se rompre',
    ja: 'ポゼッションの連鎖が繰り返し途切れている',
    ar: 'سلسلة الاستحواذ تنكسر مراراً',
  },
};

/* ------------------------------------------------------------------ */
/* Per-kind templates                                                  */
/* ------------------------------------------------------------------ */

/** Slots as a template sees them: the zone is already a localised phrase. */
type RenderSlots = Omit<NarrativeSlots, 'zone'> & { zone: string };

type Template = (s: RenderSlots) => string;

interface KindTemplate {
  headline: Record<keyof MultilingualNarrative, Template>;
  explanation: Record<keyof MultilingualNarrative, Template>;
}

const TEMPLATES: Record<NarrativeKind, KindTemplate> = {
  shot: {
    headline: {
      en: (s) => `${s.player} shoots from the ${s.zone}.`,
      es: (s) => `${s.player} dispara desde la ${s.zone}.`,
      fr: (s) => `${s.player} tire depuis la ${s.zone}.`,
      ja: (s) => `${s.player}が${s.zone}からシュート。`,
      ar: (s) => `${s.player} يسدد من ${s.zone}.`,
    },
    explanation: {
      en: (s) =>
        `Expected goals of ${s.xg} with ${s.opponent} closing the angle. The Control vs. Chaos Index reads ${s.chaos} (${s.rhythm}), with ${s.team} holding ${s.pitchControl} of Pitch Control.`,
      es: (s) =>
        `Goles esperados de ${s.xg} con ${s.opponent} cerrando el ángulo. El Control vs. Chaos Index marca ${s.chaos} (${s.rhythm}), con ${s.team} manteniendo ${s.pitchControl} de Pitch Control.`,
      fr: (s) =>
        `${s.xg} buts attendus, ${s.opponent} fermant l'angle. Le Control vs. Chaos Index s'établit à ${s.chaos} (${s.rhythm}), ${s.team} conservant ${s.pitchControl} de Pitch Control.`,
      ja: (s) =>
        `期待得点${s.xg}、${s.opponent}が角度を塞ぐ。Control vs. Chaos Indexは${s.chaos}（${s.rhythm}）、${s.team}のPitch Controlは${s.pitchControl}。`,
      ar: (s) =>
        `${s.xg} هدف متوقع مع ${s.opponent} يغلق الزاوية. Control vs. Chaos Index يقرأ ${s.chaos} (${s.rhythm})، و${s.team} يحتفظ بـ ${s.pitchControl} من Pitch Control.`,
    },
  },
  goal: {
    headline: {
      en: (s) => `GOAL — ${s.player} finishes from the ${s.zone}.`,
      es: (s) => `GOL — ${s.player} define desde la ${s.zone}.`,
      fr: (s) => `BUT — ${s.player} conclut depuis la ${s.zone}.`,
      ja: (s) => `ゴール — ${s.player}が${s.zone}で仕留める。`,
      ar: (s) => `هدف — ${s.player} يسجل من ${s.zone}.`,
    },
    explanation: {
      en: (s) =>
        `A release rated ${s.pdr} on the Pass Difficulty Rating found ${s.player} in space. The move pushed the Control vs. Chaos Index to ${s.chaos} (${s.rhythm}).`,
      es: (s) =>
        `Un pase con una dificultad de ${s.pdr} en el Pass Difficulty Rating encontró a ${s.player} en el espacio. La jugada elevó el Control vs. Chaos Index a ${s.chaos} (${s.rhythm}).`,
      fr: (s) =>
        `Une passe cotée ${s.pdr} au Pass Difficulty Rating a trouvé ${s.player} dans le vide. Le mouvement a porté le Control vs. Chaos Index à ${s.chaos} (${s.rhythm}).`,
      ja: (s) =>
        `Pass Difficulty Rating ${s.pdr}のパスが${s.player}をスペースで捉えた。Control vs. Chaos Indexは${s.chaos}（${s.rhythm}）まで上昇。`,
      ar: (s) =>
        `تمريرة بتقييم ${s.pdr} في Pass Difficulty Rating وجدت ${s.player} في المساحة. رفعت الهجمة Control vs. Chaos Index إلى ${s.chaos} (${s.rhythm}).`,
    },
  },
  turnover: {
    headline: {
      en: (s) => `${s.player} loses it to ${s.opponent} in the ${s.zone}.`,
      es: (s) => `${s.player} la pierde ante ${s.opponent} en la ${s.zone}.`,
      fr: (s) => `${s.player} la perd face à ${s.opponent} dans la ${s.zone}.`,
      ja: (s) => `${s.zone}で${s.player}が${s.opponent}にボールを奪われる。`,
      ar: (s) => `${s.player} يفقد الكرة أمام ${s.opponent} في ${s.zone}.`,
    },
    explanation: {
      en: (s) =>
        `The pass was rated ${s.pdr} on the Pass Difficulty Rating, and ${s.opponent} read it. The turnover rate is now pulling the Control vs. Chaos Index to ${s.chaos} (${s.rhythm}).`,
      es: (s) =>
        `El pase fue catalogado con ${s.pdr} en el Pass Difficulty Rating y ${s.opponent} lo leyó. La tasa de pérdida está llevando el Control vs. Chaos Index a ${s.chaos} (${s.rhythm}).`,
      fr: (s) =>
        `La passe était cotée ${s.pdr} au Pass Difficulty Rating et ${s.opponent} l'a lue. Le taux de perte de balle porte le Control vs. Chaos Index à ${s.chaos} (${s.rhythm}).`,
      ja: (s) =>
        `そのパスのPass Difficulty Ratingは${s.pdr}で、${s.opponent}が読み切った。失球率がControl vs. Chaos Indexを${s.chaos}（${s.rhythm}）まで押し上げている。`,
      ar: (s) =>
        `تم تقييم التمريرة بـ ${s.pdr} في Pass Difficulty Rating وقرأها ${s.opponent}. ارتفاع معدل فقدان الكرة يدفع Control vs. Chaos Index إلى ${s.chaos} (${s.rhythm}).`,
    },
  },
  duel: {
    headline: {
      en: (s) => `${s.player} wins the duel against ${s.opponent}.`,
      es: (s) => `${s.player} gana el duelo a ${s.opponent}.`,
      fr: (s) => `${s.player} gagne le duel face à ${s.opponent}.`,
      ja: (s) => `${s.player}が${s.opponent}とのデュエルを制する。`,
      ar: (s) => `${s.player} يفوز بالثنائية أمام ${s.opponent}.`,
    },
    explanation: {
      en: (s) =>
        `A contested moment in the ${s.zone}: ${s.player} separated ${s.opponent} from the ball in ${s.team}'s favour. The Control vs. Chaos Index stands at ${s.chaos} (${s.rhythm}).`,
      es: (s) =>
        `Un momento disputado en la ${s.zone}: ${s.player} separó a ${s.opponent} del balón a favor de ${s.team}. El Control vs. Chaos Index se sitúa en ${s.chaos} (${s.rhythm}).`,
      fr: (s) =>
        `Un moment disputé dans la ${s.zone} : ${s.player} a séparé ${s.opponent} du ballon pour ${s.team}. Le Control vs. Chaos Index s'établit à ${s.chaos} (${s.rhythm}).`,
      ja: (s) =>
        `${s.zone}の競り合い。${s.player}がボールを${s.opponent}から分離し、${s.team}に有利に働いた。Control vs. Chaos Indexは${s.chaos}（${s.rhythm}）。`,
      ar: (s) =>
        `لحظة متنازع عليها في ${s.zone}: فصل ${s.player} الكرة عن ${s.opponent} لصالح ${s.team}. Control vs. Chaos Index يستقر عند ${s.chaos} (${s.rhythm}).`,
    },
  },
  inflection: {
    headline: {
      en: (s) => `Tactical Inflection Point — ${s.cause}.`,
      es: (s) => `Punto de inflexión táctica — ${s.cause}.`,
      fr: (s) => `Point d'inflexion tactique — ${s.cause}.`,
      ja: (s) => `戦術的転換点 — ${s.cause}。`,
      ar: (s) => `نقطة انعطاف تكتيكية — ${s.cause}.`,
    },
    explanation: {
      en: (s) =>
        `The shape of the match changed in the ${s.zone}. The Control vs. Chaos Index moved to ${s.chaos} (${s.rhythm}), with ${s.team} on ${s.pitchControl} of Pitch Control.`,
      es: (s) =>
        `La forma del partido cambió en la ${s.zone}. El Control vs. Chaos Index se movió a ${s.chaos} (${s.rhythm}), con ${s.team} en ${s.pitchControl} de Pitch Control.`,
      fr: (s) =>
        `Le profil du match a changé dans la ${s.zone}. Le Control vs. Chaos Index est passé à ${s.chaos} (${s.rhythm}), ${s.team} détenant ${s.pitchControl} de Pitch Control.`,
      ja: (s) =>
        `${s.zone}で試合の形状が変化。Control vs. Chaos Indexは${s.chaos}（${s.rhythm}）へ、${s.team}のPitch Controlは${s.pitchControl}。`,
      ar: (s) =>
        `تغيّر شكل المباراة في ${s.zone}. تحوّل Control vs. Chaos Index إلى ${s.chaos} (${s.rhythm})، و${s.team} يتحكم بـ ${s.pitchControl} من Pitch Control.`,
    },
  },
};

/* ------------------------------------------------------------------ */
/* Persona framing                                                     */
/* ------------------------------------------------------------------ */

function analystContext(kind: NarrativeKind, s: RenderSlots): string {
  switch (kind) {
    case 'shot':
      return `Expected goals ${s.xg}; Pass Difficulty Rating of the supporting pass ${s.pdr}. Control vs. Chaos Index ${s.chaos} (${s.rhythm}).`;
    case 'goal':
      return `A ${s.pdr} Pass Difficulty Rating release. Pitch Control reads ${s.pitchControl} to ${s.team}.`;
    case 'turnover':
      return `A ${s.pdr} Pass Difficulty Rating pass turned over in the ${s.zone}.`;
    case 'duel':
      return `Contested possession in the ${s.zone}; Pitch Control ${s.pitchControl} to ${s.team}.`;
    case 'inflection':
      return `Structural change: ${s.cause}. Control vs. Chaos Index ${s.chaos} (${s.rhythm}).`;
  }
}

function casualContext(kind: NarrativeKind, s: RenderSlots): string {
  switch (kind) {
    case 'shot':
      return `${s.player} lets fly! ${s.team} are pushing for it.`;
    case 'goal':
      return `Goal! ${s.player} buries it. The noise here goes up.`;
    case 'turnover':
      return `Ouch — ${s.opponent} nicks it off ${s.player}.`;
    case 'duel':
      return `${s.player} wins that one. Proper commitment.`;
    case 'inflection':
      return `You can feel it — the game has turned.`;
  }
}

/**
 * The Player Cam persona reads the moment from the pitch, not from the
 * numbers. It answers the question a broadcast camera would answer:
 * what can the camera actually see right now?
 */
function playerCamContext(kind: NarrativeKind, s: RenderSlots): string {
  switch (kind) {
    case 'shot':
      return `On the camera: ${s.player} in the ${s.zone}, ball at their feet, and the shot is away.`;
    case 'goal':
      return `On the camera: ${s.player} turns away with the finish. The bench is up.`;
    case 'turnover':
      return `On the camera: ${s.opponent} pokes it away from ${s.player}. The camera holds on the reaction.`;
    case 'duel':
      return `On the camera: ${s.player} and ${s.opponent} shoulder to shoulder for it.`;
    case 'inflection':
      return `On the camera: the shape has changed. ${s.cause}.`;
  }
}

function clubContext(
  kind: NarrativeKind,
  s: RenderSlots,
): { homeFrame: string; awayFrame: string } {
  const homeIsActor = s.team === 'Manchester City';
  if (kind === 'goal') {
    return {
      homeFrame: homeIsActor
        ? `Fifteen minutes of pressure, finished by ${s.player}.`
        : `Conceded from a ${s.pdr} Pass Difficulty Rating release. The block has to be reset.`,
      awayFrame: homeIsActor
        ? `Beaten by a ${s.pdr} Pass Difficulty Rating pass. The line was wrong.`
        : `${s.player} finishes the move. Clinical.`,
    };
  }
  if (kind === 'turnover') {
    return {
      homeFrame: homeIsActor
        ? `Lost in the ${s.zone}. Keep the ball, keep the shape.`
        : `Win the ball back — the press starts with the next pass.`,
      awayFrame: homeIsActor
        ? `Regain it. Do not let them settle.`
        : `Good pressure; hold it and go again.`,
    };
  }
  if (kind === 'inflection') {
    return {
      homeFrame: `Structural note: ${s.cause}.`,
      awayFrame: `Structural note: ${s.cause}.`,
    };
  }
  return {
    homeFrame: `Pitch Control ${s.pitchControl} to ${s.team}.`,
    awayFrame: `Pitch Control ${s.pitchControl} to ${s.team}.`,
  };
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export interface BuildNarrativeInput {
  kind: NarrativeKind;
  slots: NarrativeSlots;
  /** Present only for a Tactical Inflection Point. */
  cause?: InflectionCause;
  id: string;
  timestamp: number;
  isTacticalInflectionPoint: boolean;
}

export function buildNarrative(input: BuildNarrativeInput): NarrativeEvent {
  const { kind, slots } = input;
  const template = TEMPLATES[kind];

  const localisedCause = input.cause ? CAUSE_TEXT[input.cause] : undefined;

  const render = (lang: keyof MultilingualNarrative): RenderSlots => ({
    ...slots,
    zone: ZONE_TEXT[lang](slots.zone),
    cause: localisedCause?.[lang],
  });

  const headline: MultilingualNarrative = {
    en: template.headline.en(render('en')),
    es: template.headline.es(render('es')),
    fr: template.headline.fr(render('fr')),
    ja: template.headline.ja(render('ja')),
    ar: template.headline.ar(render('ar')),
  };

  const explanation: MultilingualNarrative = {
    en: template.explanation.en(render('en')),
    es: template.explanation.es(render('es')),
    fr: template.explanation.fr(render('fr')),
    ja: template.explanation.ja(render('ja')),
    ar: template.explanation.ar(render('ar')),
  };

  const club = clubContext(kind, render('en'));

  return {
    id: input.id,
    matchClock: slots.clock,
    timestamp: input.timestamp,
    isTacticalInflectionPoint: input.isTacticalInflectionPoint,
    headline,
    tacticalExplanation: explanation,
    analystContext: analystContext(kind, render('en')),
    casualContext: casualContext(kind, render('en')),
    playerCamContext: playerCamContext(kind, render('en')),
    clubCentricContext: club,
  };
}

/** The English headline is the default reading for the Broadcast Overlay. */
export function narrativeHeadline(narrative: NarrativeEvent): string {
  return narrative.headline.en;
}
