"""Broadcast Narrative agent (ADR 0002) and the deterministic narrative
generator that backs it (ADR 0004 rule-based fallback).

The agent writes the Multilingual Broadcast Stream: a headline and a tactical
explanation produced simultaneously in five broadcast languages
(English, Spanish, French, Japanese, Arabic), plus the commentator cue that
drives the Broadcast Overlay.

When Microsoft Foundry is configured the agent may delegate the wording to the
model. When it is not configured - or when the model times out or fails - the
deterministic generator below produces the very same contract, so the service
never loses its broadcast feed.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass
from time import perf_counter

from ..models import AgentRole, AgentStatus, BroadcastLanguage, MultilingualNarrative
from .base import (
    K_COMMENTATOR_CUE,
    K_CONTROL_VS_CHAOS,
    K_INFLECTION_CANDIDATES,
    K_MATCH_CLOCK,
    K_MULTILINGUAL_STREAM,
    K_NARRATIVE,
    K_NARRATIVE_ARC,
    K_PASS_DIFFICULTY_RATING,
    K_PITCH_CONTROL_AWAY,
    K_PITCH_CONTROL_HOME,
    K_TACTICAL_PHASE,
    AgentContext,
    AgentOutcome,
)

logger = logging.getLogger(__name__)

HOME_CLUB = "Manchester City"
AWAY_CLUB = "Arsenal"

INFLECTION_PREFIX = {
    BroadcastLanguage.EN: "Tactical Inflection Point: ",
    BroadcastLanguage.ES: "Punto de inflexion tactico: ",
    BroadcastLanguage.FR: "Point d'inflexion tactique : ",
    BroadcastLanguage.JA: "戦術的変曲点：",
    BroadcastLanguage.AR: "نقطة تحول تكتيكية: ",
}

#: Headline templates per scenario and language. ``{home}``/``{away}`` are the
#: club names, the remaining placeholders are live metric values.
HEADLINE_TEMPLATES: dict[str, dict[str, list[str]]] = {
    "high_possession": {
        "en": [
            "{home} keep {away} pinned inside their own defensive third",
            "A patient {home} siege compresses the Pitch Space of {away}",
        ],
        "es": [
            "{home} mantiene a {away} atrapados en su propio tercio defensivo",
            "Un asedio paciente de {home} comprime el espacio de juego de {away}",
        ],
        "fr": [
            "{home} maintient {away} cantonne dans son propre tiers défensif",
            "Un siège patient de {home} comprime l'espace de jeu de {away}",
        ],
        "ja": [
            "{home}が{away}を自陣の深い位置まで封じ込める",
            "{home}の緩やかな包囲網が{away}のピッチスペースを圧縮する",
        ],
        "ar": [
            "{home}يقبس على {away} داخل ثلثه الدفاعي",
            "حصار صبور من {home} يضيق مساحة الملعب أمام {away}",
        ],
    },
    "counter_attack_transition": {
        "en": [
            "{away} turn the break into a vertical sprint through the middle",
            "{away} counter straight through the {home} recovery shape",
        ],
        "es": [
            "{away} convierten la recuperación en una carrera vertical por el centro",
            "{away} contraatacan en vertical y rompen la recuperación de {home}",
        ],
        "fr": [
            "{away} transforment la rupture en sprint vertical dans l'axe",
            "{away} contre-attaquent en vertical et percent le bloc de remontee de {home}",
        ],
        "ja": [
            "{away}がセンターからの縦の反撃へ振り切る",
            "{away}が{home}の復旧ブレイクを縦に突破する",
        ],
        "ar": [
            "{away}يحوّل الاستخلاص إلى هجمة عمودية عبر الوسط",
            "{away}يرد بسرعة عمودية ويخترق شكل استعادة {home}",
        ],
    },
    "low_block_siege": {
        "en": [
            "{away} shut the box down and force {home} to go wide",
            "A low block absorbs the {home} siege corridor by corridor",
        ],
        "es": [
            "{away} cierran el área y obligan a {home} a buscar los flancos",
            "El bloque bajo absorbe el asedio de {home} pasillo a pasillo",
        ],
        "fr": [
            "{away} ferment la surface et obligent {home} a jouer sur les cotes",
            "Le bloc bas absorbe le siège de {home} couloir par couloir",
        ],
        "ja": [
            "{away}がエリアを封鎖し、{home}をサイドへ誘導する",
            "低位ブロックが{home}の包囲をレーンごとに吸収する",
        ],
        "ar": [
            "{away}يسدّ منطقة الجزاء ويجبر {home}على الاعتماد على الأطراف",
            "كتلة منخفضة تمتص حصار {home} ممرًا تلو الآخر",
        ],
    },
    "box_scramble": {
        "en": [
            "Penalty area scramble: {home} ricochet the ball around the six-yard box",
            "Chaos breaks out inside the {away} area",
        ],
        "es": [
            "Batalla en el área: {home} hacen rebotar el balón alrededor de la línea de portería",
            "El caos estalla dentro del area de {away}",
        ],
        "fr": [
            "Bagarre dans la surface : {home} font rebondir le ballon sur la ligne de but",
            "Le chaos explose dans la surface de {away}",
        ],
        "ja": [
            "ペナルティエリアの乱戦：{home}がゴールライン周辺でボールを跳ね返す",
            "{away}のエリア内で混沌が爆発する",
        ],
        "ar": [
            "ارتباك داخل منطقة الجزاء: {home}يرتد الكرة على خط المرمى",
            "الفوضى تندلع داخل منطقة {away}",
        ],
    },
}

EXPLANATION_TEMPLATES: dict[str, dict[str, list[str]]] = {
    "high_possession": {
        "en": [
            "{home} recycle possession across the back line while {away} drop into a flat block; the Pass Difficulty Rating sits at {pdr} because every forward lane is contested.",
            "The away shape has slid deep into its own half, so {home} attack a narrow corridor: Pitch Control reads {pc_home}% and the Control vs. Chaos Index of {chaos} confirms a structured, low-risk rhythm.",
        ],
        "es": [
            "{home} recicla la posesión por la línea de defensa mientras {away} baja a un bloque plano; el Pass Difficulty Rating se sitúa en {pdr} porque cada pase vertical está disputado.",
            "La forma visitante se ha retirado al fondo de su campo, así que {home} ataca un pasillo estrecho: el Control del Campo marca {pc_home}% y el índice Control vs. Caos de {chaos} confirma un ritmo estructurado.",
        ],
        "fr": [
            "{home} fait tourner la possession sur la ligne de défense pendant que {away} recule en bloc bas ; le Pass Difficulty Rating s'établit à {pdr} car chaque passe en avant est disputée.",
            "Le bloc adverse a reculé au fond de son camp, {home} attaque donc un couloir étroit : le contrôle du terrain affiche {pc_home}% et l'indice Contrôle vs Chaos de {chaos} confirme un rythme structuré.",
        ],
        "ja": [
            "{home}は後衛線からボールを循環させ、{away}は低位ブロックで守る。前方のパッシングレーンはすべて争奪されているため、パスディフィカルティレーティングは{pdr}に達する。",
            "アウェイ側の形が自陣深くまで下がったため、{home}が攻撃できるのは狭い通路だけ。ピッチコントロールは{pc_home}%、コントロール対カオス指数{chaos}が構造化されたリズムを示す。",
        ],
        "ar": [
            "يدور {home}على الكرة في خط الدفاع بينما ينسحب {away} إلى كتلة منخفضة، ويبلغ تقييم صعوبة التمرير {pdr} لأن كل تمريرة أمامية متنازع عليها.",
            "تراجع شكل {away} إلى عمق ملعبه، فيهاجم {home} ممراً ضيقاً فقط؛ السيطرة على الملعب {pc_home}% ومؤشر التحكم مقابل الفوضى {chaos} يؤكد إيقاعاً منظماً.",
        ],
    },
    "counter_attack_transition": {
        "en": [
            "A {home} turnover releases {away} into space: the Control vs. Chaos Index has jumped to {chaos} and the transition runs at full stride.",
            "The recovery sprint is already out of shape - Pitch Control has flipped to {pc_away}% and the Pass Difficulty Rating of {pdr} shows how little time the defence has.",
        ],
        "es": [
            "Una pérdida de {home} libera a {away} hacia el espacio: el índice Control vs. Caos salta a {chaos} y la transición se recorre a plena velocidad.",
            "La carrera de recuperación ya está desordenada: el Control del Campo ha virado a {pc_away}% y el Pass Difficulty Rating de {pdr} muestra el poco tiempo que tiene la defensa.",
        ],
        "fr": [
            "Une perte de {home} libère {away} dans l'espace : l'indice Contrôle vs Chaos bondit à {chaos} et la transition se joue à pleine vitesse.",
            "La course de remontée est déjà désorganisée : le contrôle du terrain bascule à {pc_away}% et le Pass Difficulty Rating de {pdr} montre le peu de temps dont dispose la défense.",
        ],
        "ja": [
            "{home}のロストボールが{away}を空間へ解放し、コントロール対カオス指数は{chaos}へ急上昇。反撃はフルスピードで走る。",
            "復旧のスプリントがすでに崩れている：ピッチコントロールは{pc_away}%へ逆転し、パスディフィカルティレーティング{pdr}が守備側の時間的余裕の少なさを示す。",
        ],
        "ar": [
            "تُخسر {home}الكرة فتنفك {away} نحو المساحة؛ يقفز مؤشر التحكم مقابل الفوضى إلى {chaos} وتُنجَز الهجمة المرتدة بأقصى سرعة.",
            "اندفاع الاستعادة بات مشوّهاً: انقلبت السيطرة على الملعب إلى {pc_away}% ويظهر تقييم صعوبة التمرير {pdr} قلة الوقت المتاح للدفاع.",
        ],
    },
    "low_block_siege": {
        "en": [
            "The away block sits deep in the Pitch Space, so {home} recycle from side to side and the Pass Difficulty Rating climbs to {pdr}.",
            "Every central lane is covered inside 1.5m, so {home} attack with width; the Control vs. Chaos Index of {chaos} reflects a tense but controlled duel.",
        ],
        "es": [
            "El bloque visitante se sitúa al fondo del espacio de juego, así que {home} recirculan de lado a lado y el Pass Difficulty Rating sube a {pdr}.",
            "Cada lane central está cubierta en menos de 1.5m, así que {home} atacan por los extremos; el índice Control vs. Caos de {chaos} refleja un duelo tenso pero controlado.",
        ],
        "fr": [
            "Le bloc adverse se cale au fond de l'espace de jeu, {home} font donc circuler sur les côtés et le Pass Difficulty Rating monte à {pdr}.",
            "Chaque couloir central est couvert à moins de 1.5m, {home} attaquent donc par les côtés ; l'indice Contrôle vs Chaos de {chaos} traduit un duel tendu mais maîtrisé.",
        ],
        "ja": [
            "アウェイ側の低位ブロックがピッチスペースの深くにirebaseため、{home}は横へボールを循環させ、パスディフィカルティレーティングは{pdr}まで上昇する。",
            "中央のレーンはすべて1.5m以内でカバーされ、{home}はサイドから攻める。コントロール対カオス指数{chaos}は緊張感と統制の共存を示している。",
        ],
        "ar": [
            "تتراجع الكتلة الدفاعية إلى عمق مساحة الملعب، فيضطر {home} إلى التمرير العرضي ويرتفع تقييم صعوبة التمرير إلى {pdr}.",
            "كل ممر مركزي مغطى خلال أقل من 1.5 متر، فيهاجم {home} من العرض، ومؤشر التحكم مقابل الفوضى البالغ {chaos} يعكس مواجهة متوترة لكنها منضبطة.",
        ],
    },
    "box_scramble": {
        "en": [
            "Blocks, ricochets and a loose ball inside six yards: the xG spikes and the Control vs. Chaos Index reaches {chaos}.",
            "The defensive line has collapsed onto the penalty spot, leaving the Control vs. Chaos Index at {chaos} and a Pass Difficulty Rating of {pdr} on any clearance.",
        ],
        "es": [
            "Bloqueos, rebotes y un balón suelto dentro del área de seis metros: el xG se dispara y el índice Control vs. Caos alcanza {chaos}.",
            "La línea defensiva se ha hundido sobre el penalti, dejando el índice Control vs. Caos en {chaos} y un Pass Difficulty Rating de {pdr} en cualquier despeje.",
        ],
        "fr": [
            "Blocks, rebonds et ballon libre dans les six mètres : le xG explose et l'indice Contrôle vs Chaos atteint {chaos}.",
            "La ligne de défense s'est effondrée sur le point de penalty, laissant l'indice Contrôle vs Chaos à {chaos} et un Pass Difficulty Rating de {pdr} sur n'importe quelle clearance.",
        ],
        "ja": [
            "ブロック、リバウンド、6ヤード内の空きボール：xGが跳ね上がり、コントロール対カオス指数は{chaos}に到達する。",
            "守備ラインがペナルティスポットに潰れ、コントロール対カオス指数は{chaos}、クリア時のディフィカルティレーティングは{pdr}となる。",
        ],
        "ar": [
            "صدّات وارتدادات وكرة سائبة داخل منطقة الستة ياردات: يرتفع xG ويصل مؤشر التحكم مقابل الفوضى إلى {chaos}.",
            "انهار خط الدفاع فوق علامة الجزاء، تارك مؤشر التحكم مقابل الفوضى عند {chaos} وتقييم صعوبة التمرير {pdr} في أي إبعاد.",
        ],
    },
}

#: The tactical arc of each Synthetic Match Scenario.
NARRATIVE_ARCS = {
    "high_possession": "Sustained high-possession siege",
    "counter_attack_transition": "Vertical transition frenzy",
    "low_block_siege": "Low-block siege under sustained pressure",
    "box_scramble": "Penalty area scramble",
}

PHASE_LABELS = {
    "build_up": "build-up",
    "progression": "progression",
    "final_third": "final third",
    "defensive_block": "defensive block",
    "transition": "transition",
}


@dataclass(slots=True)
class NarrativeDraft:
    """The multilingual part of a Narrative Event, produced by the narrative agent."""

    id: str
    matchClock: str
    timestamp: int
    isTacticalInflectionPoint: bool
    headline: MultilingualNarrative
    tacticalExplanation: MultilingualNarrative
    commentatorCue: str


class RuleBasedNarrativeGenerator:
    """Deterministic, scenario aware narrative generator.

    It is both the local implementation of the Multilingual Broadcast Stream
    (when Foundry is not configured) and the ADR 0004 rule-based fallback.
    """

    def build(self, context: AgentContext, variant: int = 0) -> NarrativeDraft:
        frame = context.frame
        view = context.view
        scenario = frame.scenario.value
        language_keys = [language.value for language in BroadcastLanguage]

        clock = view.read(K_MATCH_CLOCK) or frame.matchClock
        chaos = float(view.read(K_CONTROL_VS_CHAOS) or frame.metrics.controlVsChaosIndex)
        pdr = float(view.read(K_PASS_DIFFICULTY_RATING) or frame.metrics.passDifficultyRating)
        home_control = float(view.read(K_PITCH_CONTROL_HOME) or frame.metrics.pitchControl.home)
        away_control = float(view.read(K_PITCH_CONTROL_AWAY) or frame.metrics.pitchControl.away)
        phase = str(view.read(K_TACTICAL_PHASE) or "progression")
        inflections = view.read(K_INFLECTION_CANDIDATES) or []
        is_inflection = bool(inflections)

        values = {
            "home": HOME_CLUB,
            "away": AWAY_CLUB,
            "clock": clock,
            "chaos": f"{chaos:.0f}",
            "pdr": f"{pdr:.0f}",
            "pc_home": f"{home_control:.0f}",
            "pc_away": f"{away_control:.0f}",
            "phase": PHASE_LABELS.get(phase, phase),
        }

        headline = MultilingualNarrative(
            **{
                language: self._render(
                    HEADLINE_TEMPLATES[scenario][language],
                    values,
                    variant,
                    is_inflection,
                    language,
                )
                for language in language_keys
            }
        )
        explanation = MultilingualNarrative(
            **{
                language: self._render(
                    EXPLANATION_TEMPLATES[scenario][language],
                    values,
                    variant + 1,
                    False,
                    language,
                )
                for language in language_keys
            }
        )

        cue = (
            f"{clock} | {NARRATIVE_ARCS[scenario]} | {PHASE_LABELS.get(phase, phase)} | "
            f"Control vs. Chaos {chaos:.0f} | PDR {pdr:.0f} | "
            f"Pitch Control {home_control:.0f}/{away_control:.0f}"
        )

        return NarrativeDraft(
            id=f"narr-{frame.frameId}",
            matchClock=clock,
            timestamp=int(frame.matchSeconds * 1000),
            isTacticalInflectionPoint=is_inflection,
            headline=headline,
            tacticalExplanation=explanation,
            commentatorCue=cue,
        )

    def _render(
        self,
        templates: list[str],
        values: dict[str, str],
        variant: int,
        is_inflection: bool,
        language: str,
    ) -> str:
        template = templates[variant % len(templates)]
        text = template.format(**values)
        if is_inflection and language == BroadcastLanguage.EN.value:
            prefix = INFLECTION_PREFIX[BroadcastLanguage.EN]
            if not text.startswith(prefix):
                text = prefix + text
        elif is_inflection:
            prefix = INFLECTION_PREFIX[BroadcastLanguage(language)]
            if not text.startswith(prefix):
                text = prefix + text
        return text


class BroadcastNarrativeAgent:
    """Writes the Broadcast Overlay narrative and the Multilingual Broadcast Stream."""

    role = AgentRole.BROADCAST_NARRATIVE
    label = "Broadcast Narrative"

    def __init__(
        self,
        generator: RuleBasedNarrativeGenerator | None = None,
        model_service: Callable[[AgentContext], NarrativeDraft] | None = None,
    ) -> None:
        self.generator = generator or RuleBasedNarrativeGenerator()
        self.model_service = model_service
        self._variant = 0

    def run(self, context: AgentContext) -> AgentOutcome:
        started = perf_counter()
        frame = context.frame
        view = context.view

        status = AgentStatus.COMPLETE
        source = "deterministic generator"
        draft: NarrativeDraft | None = None

        if self.model_service is not None:
            try:
                draft = self.model_service(context)
                source = "Microsoft Foundry model"
            except Exception as exc:  # noqa: BLE001 - the fallback must always engage
                logger.warning("Foundry narrative tier failed, using the rule-based fallback: %s", exc)
                draft = None
                status = AgentStatus.FALLBACK

        if draft is None:
            if status is not AgentStatus.FALLBACK:
                status = AgentStatus.COMPLETE
            draft = self.generator.build(context, variant=self._variant % 2)
            self._variant += 1

        view.write(K_NARRATIVE_ARC, NARRATIVE_ARCS.get(frame.scenario.value, frame.scenario.value))
        view.write(
            K_MULTILINGUAL_STREAM,
            {
                "headline": draft.headline.model_dump(),
                "tacticalExplanation": draft.tacticalExplanation.model_dump(),
            },
        )
        view.write(K_NARRATIVE, draft)
        view.write(K_COMMENTATOR_CUE, draft.commentatorCue)

        latency = (perf_counter() - started) * 1000.0
        summary = (
            f"Multilingual Broadcast Stream written in 5 languages via the {source}: "
            f'"{draft.headline.en[:72]}" at {draft.matchClock}.'
        )
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=status,
            latency_ms=latency,
            summary=summary,
            reads=list(view.reads),
            writes=list(view.writes),
        )

    def fallback(self, context: AgentContext) -> AgentOutcome:
        """ADR 0004 rule-based fallback - always produces a valid narrative."""
        started = perf_counter()
        view = context.view
        draft = self.generator.build(context, variant=self._variant % 2)
        self._variant += 1
        view.write(
            K_NARRATIVE_ARC, NARRATIVE_ARCS.get(context.frame.scenario.value, context.frame.scenario.value)
        )
        view.write(
            K_MULTILINGUAL_STREAM,
            {
                "headline": draft.headline.model_dump(),
                "tacticalExplanation": draft.tacticalExplanation.model_dump(),
            },
        )
        view.write(K_NARRATIVE, draft)
        view.write(K_COMMENTATOR_CUE, draft.commentatorCue)
        latency = (perf_counter() - started) * 1000.0
        return AgentOutcome(
            role=self.role,
            label=self.label,
            status=AgentStatus.FALLBACK,
            latency_ms=latency,
            summary=(
                "Rule-based fallback delivered the Multilingual Broadcast Stream "
                f"for {draft.matchClock} after the narrative agent failed."
            ),
            reads=list(view.reads),
            writes=list(view.writes),
        )


__all__ = [
    "AWAY_CLUB",
    "BroadcastNarrativeAgent",
    "HOME_CLUB",
    "INFLECTION_PREFIX",
    "NARRATIVE_ARCS",
    "NarrativeDraft",
    "PHASE_LABELS",
    "RuleBasedNarrativeGenerator",
]
