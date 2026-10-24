import { describe, it, expect } from "vitest";
import { baseMemory, normalizeFrame, normalizeBlackboard } from "./baseMemory";

describe("baseMemory Normalization & Contract Synchronization", () => {
  it("normalizes backend Pydantic TelemetryFrame into Studio FrameTelemetry without errors", () => {
    const wireFrame = {
      frameId: 101,
      matchClock: "24:18",
      matchSeconds: 1458.0,
      scenario: "high_possession",
      score: { home: 2, away: 1 },
      ball: {
        x: 55.0,
        y: 35.0,
        z: 0.2,
        vx: 3.0,
        vy: 4.0,
        speedKmH: 18.0,
        possessionTeam: "home",
        possessionPlayerId: "p_7",
      },
      players: [
        {
          id: "p_7",
          name: "Kevin De Bruyne",
          shortName: "De Bruyne",
          number: 17,
          team: "home",
          role: "MF",
          position: "AM",
          x: 62.0,
          y: 40.0,
          vx: 3.0,
          vy: 4.0,
          speedKmH: 18.0,
          distanceMeters: 4500,
          touches: 42,
          homeX: 60.0,
          homeY: 40.0,
          onBall: true,
        },
        {
          id: "p_10",
          name: "Martin Odegaard",
          shortName: "Odegaard",
          number: 8,
          team: "away",
          role: "MF",
          position: "AM",
          x: 58.0,
          y: 38.0,
          vx: 0.0,
          vy: 0.0,
          speedKmH: 0.0,
          distanceMeters: 4200,
          touches: 28,
          homeX: 55.0,
          homeY: 35.0,
          onBall: false,
        },
      ],
      metrics: {
        controlVsChaosIndex: 72.4,
        passDifficultyRating: 48.0,
        gameRhythm: "structured_possession",
        pitchControl: { home: 65, away: 30, contested: 5 },
      },
      latestNarrative: {
        headline: "Manchester City pinning Arsenal in low defensive block",
        tacticalExplanation: "High territorial compression",
        isTacticalInflectionPoint: true,
      },
    };

    const normalized = normalizeFrame(wireFrame);

    // Frame identifiers & clock
    expect(normalized.frame_id).toBe(101);
    expect(normalized.match_clock_sec).toBe(1458.0);
    expect(normalized.game_rhythm).toBe("structured_possession");
    expect(normalized.active_tactical_inflection).toBe(true);

    // Control vs Chaos: from metrics.controlVsChaosIndex
    expect(normalized.control_chaos.control).toBe(72);
    expect(normalized.control_chaos.chaos).toBe(28);

    // Ball normalization
    expect(normalized.ball.x).toBe(55.0);
    expect(normalized.ball.y).toBe(35.0);
    expect(normalized.ball.velocity_mps).toBe(5.0); // hypot(3, 4)
    expect(normalized.ball.carrier_player_id).toBe("p_7");

    // Player 1 (Moving, ball carrier)
    const p1 = normalized.players[0];
    expect(p1.player_id).toBe("p_7");
    expect(p1.id).toBe("p_7");
    expect(p1.shirt_number).toBe(17);
    expect(p1.number).toBe(17);
    expect(p1.is_ball_carrier).toBe(true);
    expect(p1.onBall).toBe(true);
    expect(p1.velocity_mps).toBe(5.0); // hypot(3, 4)
    expect(p1.speed_kmh).toBe(18.0);
    expect(p1.heading_deg).toBeCloseTo(53.13, 1); // atan2(4, 3) * 180 / PI

    // Player 2 (Stationary)
    const p2 = normalized.players[1];
    expect(p2.player_id).toBe("p_10");
    expect(p2.shirt_number).toBe(8);
    expect(p2.is_ball_carrier).toBe(false);
    expect(p2.velocity_mps).toBe(0.0);
    expect(p2.heading_deg).toBe(0.0); // atan2(0, 0)
    expect(isNaN(p2.heading_deg)).toBe(false);

    // Updating baseMemory store
    baseMemory.updateFrame(wireFrame);
    const state = baseMemory.getState();
    expect(state.currentFrame?.frame_id).toBe(101);
    expect(state.blackboard.control_index).toBe(72);
    expect(state.blackboard.chaos_index).toBe(28);
    expect(state.blackboard.active_tactical_inflection).toBe(true);
    expect(state.score.homeScore).toBe(2);
    expect(state.score.awayScore).toBe(1);
  });

  it("normalizes backend tactical blackboard snapshot into TacticalBlackboard state", () => {
    const backendSnapshot = {
      analyst_context: "Overload on right half-space with 84% pass completion",
      casual_context: "Relentless pressure on the penalty box!",
      player_cam_context: "Tracking Haaland sprint burst into central lane",
      club_centric_context: {
        homeFrame: "City dominance 68%",
        awayFrame: "Arsenal compact block",
      },
      pass_difficulty_rating: 46.5,
      narrative: {
        headline: {
          en: "City sustained siege on the low block",
          es: "Asedio sostenido del City",
        },
        tacticalExplanation: {
          en: "Tactical breakdown",
        },
      },
      control_vs_chaos: 32.0,
      game_rhythm: "structured_possession",
      inflection_candidates: [{ id: 1 }],
    };

    const current = baseMemory.getState().blackboard;
    const normalized = normalizeBlackboard(backendSnapshot, current);

    expect(normalized.persona_overviews.analyst).toBe("Overload on right half-space with 84% pass completion");
    expect(normalized.persona_overviews.casual).toBe("Relentless pressure on the penalty box!");
    expect(normalized.persona_overviews.player_cam).toBe("Tracking Haaland sprint burst into central lane");
    expect(normalized.persona_overviews.club_centric).toContain("City dominance 68%");
    expect(normalized.persona_overviews.club_centric).toContain("Arsenal compact block");
    expect(normalized.latest_pdr).toBeCloseTo(0.465, 3);
    expect(normalized.narrative_headline).toBe("City sustained siege on the low block");
    expect(normalized.control_index).toBe(68);
    expect(normalized.chaos_index).toBe(32);
    expect(normalized.active_tactical_inflection).toBe(true);

    // Update through baseMemory
    baseMemory.updateBlackboard(backendSnapshot);
    const updated = baseMemory.getState().blackboard;
    expect(updated.latest_pdr).toBeCloseTo(0.465, 3);
    expect(updated.persona_overviews.analyst).toBe("Overload on right half-space with 84% pass completion");
  });

  it("handles degraded and empty payloads safely without crashing", () => {
    const emptyFrame = {
      players: [],
    };

    const normalized = normalizeFrame(emptyFrame);
    expect(normalized.control_chaos.control).toBe(50);
    expect(normalized.control_chaos.chaos).toBe(50);
    expect(normalized.players).toEqual([]);
    expect(normalized.ball.x).toBe(52.5);

    expect(() => baseMemory.updateFrame(null)).not.toThrow();
    expect(() => baseMemory.updateBlackboard(null)).not.toThrow();
  });
});
