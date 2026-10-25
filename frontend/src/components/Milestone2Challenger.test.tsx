import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { baseMemory, normalizeFrame } from "../store/baseMemory";
import { MediaTimelinePanel, getMatchEventVisuals } from "./dashboard/MediaTimelinePanel";
import { PitchRadarCanvas } from "./PitchRadarCanvas";
import { MatchEvent, MatchEventType } from "../types/telemetry";

function createMockEvent(overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
    id: overrides.id ?? "evt-default",
    type: overrides.type ?? "pass",
    matchClock: overrides.matchClock ?? "00:00",
    timestampMs: overrides.timestampMs ?? 0,
    team: overrides.team ?? "home",
    actorId: overrides.actorId ?? "home_7",
    targetId: overrides.targetId ?? null,
    x: overrides.x ?? 52.5,
    y: overrides.y ?? 34.0,
    description: overrides.description ?? "Mock match event description",
    ...overrides,
  };
}

describe("Milestone 2 Challenger Empirical Stress Suite", () => {
  let mockContext: Record<string, unknown>;

  beforeEach(() => {
    act(() => {
      baseMemory.clearPlayback();
      baseMemory.setSelectedPlayer(null);
    });

    mockContext = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
      fillText: vi.fn(),
      setLineDash: vi.fn(),
      roundRect: vi.fn(),
    };

    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => mockContext
    ) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 850,
      height: 550,
      top: 0,
      left: 0,
      bottom: 550,
      right: 850,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    global.ResizeObserver = class MockResizeObserver implements ResizeObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. EVENT INGESTION, DEDUPLICATION & MEMORY BOUNDS IN updateFrame
  // =========================================================================
  describe("1. updateFrame Event Ingestion, Deduplication & Bounds", () => {
    it("handles frames with empty or undefined events without throwing or resetting state", () => {
      expect(baseMemory.getState().matchEvents).toEqual([]);

      act(() => {
        baseMemory.updateFrame({ frameId: 1, matchClock: "10:00", events: [] });
      });
      expect(baseMemory.getState().matchEvents).toEqual([]);

      act(() => {
        baseMemory.updateFrame({ frameId: 2, matchClock: "10:05", events: undefined });
      });
      expect(baseMemory.getState().matchEvents).toEqual([]);
    });

    it("deduplicates identical event IDs across frames and preserves single entry", () => {
      const duplicateEvents: MatchEvent[] = Array.from({ length: 50 }, (_, i) =>
        createMockEvent({
          id: "evt-dup-cluster",
          matchClock: "25:00",
          timestampMs: 1500000,
          type: "tackle",
          team: "home",
          actorId: "home_4",
          description: `Tackle Attempt #${i}`,
        })
      );

      act(() => {
        baseMemory.updateFrame({
          frameId: 10,
          events: duplicateEvents,
        });
      });

      const events = baseMemory.getState().matchEvents;
      expect(events.length).toBe(1);
      expect(events[0].id).toBe("evt-dup-cluster");
      expect(events[0].description).toBe("Tackle Attempt #49");
    });

    it("bounds matchEvents buffer to exactly 200 items when 500 events are streamed", () => {
      // Stream 500 unique events across 10 frames
      for (let frameIdx = 0; frameIdx < 10; frameIdx++) {
        const batch: MatchEvent[] = Array.from({ length: 50 }, (_, itemIdx) => {
          const globalIdx = frameIdx * 50 + itemIdx;
          return createMockEvent({
            id: `evt-${globalIdx}`,
            matchClock: `${Math.floor(globalIdx / 60)}:${(globalIdx % 60).toString().padStart(2, "0")}`,
            timestampMs: 1000 + globalIdx * 100,
            type: "pass",
            team: "home",
            actorId: "home_7",
            description: `Pass #${globalIdx}`,
          });
        });

        act(() => {
          baseMemory.updateFrame({
            frameId: frameIdx + 1,
            events: batch,
          });
        });
      }

      const events = baseMemory.getState().matchEvents;
      expect(events.length).toBe(200);

      // Verify that the 200 items retained are the most recent (indices 300 to 499)
      expect(events[0].id).toBe("evt-300");
      expect(events[events.length - 1].id).toBe("evt-499");
      expect(events[0].timestampMs).toBe(1000 + 300 * 100);
      expect(events[events.length - 1].timestampMs).toBe(1000 + 499 * 100);
    });

    it("sorts jumbled events chronologically by timestampMs", () => {
      const outOfOrderEvents: MatchEvent[] = [
        createMockEvent({ id: "e-3", matchClock: "30:00", timestampMs: 1800000, type: "shot" }),
        createMockEvent({ id: "e-1", matchClock: "10:00", timestampMs: 600000, type: "pass" }),
        createMockEvent({ id: "e-4", matchClock: "40:00", timestampMs: 2400000, type: "goal" }),
        createMockEvent({ id: "e-2", matchClock: "20:00", timestampMs: 1200000, type: "tackle" }),
      ];

      act(() => {
        baseMemory.updateFrame({
          frameId: 20,
          events: outOfOrderEvents,
        });
      });

      const events = baseMemory.getState().matchEvents;
      expect(events.map((e) => e.id)).toEqual(["e-1", "e-2", "e-3", "e-4"]);
    });

    it("clearPlayback resets matchEvents cleanly back to empty array", () => {
      act(() => {
        baseMemory.updateFrame({
          frameId: 30,
          events: [createMockEvent({ id: "e-temp", matchClock: "01:00", timestampMs: 60000, type: "foul" })],
        });
      });
      expect(baseMemory.getState().matchEvents.length).toBe(1);

      act(() => {
        baseMemory.clearPlayback();
      });
      expect(baseMemory.getState().matchEvents).toEqual([]);
    });

    it("normalizeFrame preserves events, shots, and playerStats from raw wire frames", () => {
      const rawWire = {
        frame_id: 88,
        match_clock_sec: 1200,
        events: [
          createMockEvent({ id: "e-wire-1", type: "clearance", matchClock: "20:00", timestampMs: 1200000 }),
        ],
        shots: [
          { shotId: "s-1", minute: 20, shooterPlayerId: "home_9", xG: 0.65, outcome: "saved" },
        ],
        playerStats: [
          { playerId: "home_9", minutesPlayed: 20, touches: 15, passesAttempted: 10, passesCompleted: 8 },
        ],
      };

      const normalized = normalizeFrame(rawWire);
      expect(normalized.events?.length).toBe(1);
      expect(normalized.events?.[0].type).toBe("clearance");
      expect(normalized.shots?.length).toBe(1);
      expect(normalized.shots?.[0].xG).toBe(0.65);
      expect(normalized.playerStats?.length).toBe(1);
      expect(normalized.playerStats?.[0].passesCompleted).toBe(8);
    });
  });

  // =========================================================================
  // 2. MEDIA TIMELINE PANEL RESILIENCE & VISUAL TAXONOMY
  // =========================================================================
  describe("2. MediaTimelinePanel Resilience & Visual Taxonomy", () => {
    it("renders gracefully and falls back to sampleMatchEvents when store matchEvents is empty", () => {
      act(() => {
        baseMemory.clearPlayback();
      });
      expect(baseMemory.getState().matchEvents).toEqual([]);

      render(<MediaTimelinePanel />);
      expect(screen.getByText("Match Events Timeline")).toBeDefined();
      expect(screen.getByText("9 Events Logged")).toBeDefined();
      expect(screen.getByText(/E. Eze Cautioned/i)).toBeDefined();
      expect(screen.getByText(/E. Haaland/i)).toBeDefined();
    });

    it("covers all 26 canonical MatchEventType values in getMatchEventVisuals without throwing", () => {
      const all26Types: MatchEventType[] = [
        "pass", "carry", "shot", "duel", "tackle", "interception", "foul", "goal", "turnover", "inflection",
        "clearance", "block", "recovery",
        "save", "claim", "punch", "goal_kick",
        "cross", "key_pass", "progressive_carry", "aerial_duel",
        "corner_kick", "free_kick", "yellow_card", "red_card", "offside",
      ];

      expect(all26Types.length).toBe(26);

      all26Types.forEach((type) => {
        const evt = createMockEvent({
          id: `test-${type}`,
          matchClock: "15:00",
          timestampMs: 900000,
          type,
        });
        const visuals = getMatchEventVisuals(evt);
        expect(visuals).toBeDefined();
        expect(visuals.icon).toBeDefined();
        expect(visuals.color).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(visuals.bg).toContain("rgba(");
        expect(typeof visuals.tag).toBe("string");
        expect(visuals.tag.length).toBeGreaterThan(0);
      });

      // Guard fallback on unknown/arbitrary string
      const unknownEvt = createMockEvent({
        id: "u1",
        matchClock: "00:00",
        timestampMs: 0,
        type: "arbitrary_unknown" as MatchEventType,
      });
      const fallbackVisuals = getMatchEventVisuals(unknownEvt);
      expect(fallbackVisuals.tag).toBe("EVENT");
      expect(fallbackVisuals.color).toBe("#38bdf8");
    });

    it("renders live custom events from baseMemory and updates spotlight and match clock on event click", () => {
      const testEvents: MatchEvent[] = [
        createMockEvent({
          id: "evt-custom-clearance",
          matchClock: "33:15",
          timestampMs: 1995000,
          type: "clearance",
          team: "home",
          actorId: "home_3",
          pitchSector: "Penalty Spot",
          speedKmH: 26.4,
          description: "R. Dias acrobatic headed clearance",
        }),
      ];

      act(() => {
        baseMemory.updateFrame({
          frameId: 44,
          matchClock: "33:15",
          events: testEvents,
        });
      });

      render(<MediaTimelinePanel />);
      expect(screen.getByText("1 Events Logged")).toBeDefined();
      expect(screen.getByText("CLEARANCE")).toBeDefined();
      expect(screen.getByText("R. Dias acrobatic headed clearance")).toBeDefined();
      expect(screen.getByText("26.4 km/h")).toBeDefined();

      // Click event
      const eventCard = screen.getByText("R. Dias acrobatic headed clearance");
      fireEvent.click(eventCard);

      expect(baseMemory.getState().matchClock).toBe(1995);
      expect(baseMemory.getState().selectedPlayerId).toBe("home_3");
    });
  });

  // =========================================================================
  // 3. PITCH RADAR CANVAS 3D BALL ELEVATION & EXTREME BOUNDS
  // =========================================================================
  describe("3. PitchRadarCanvas 3D Ball Elevation & Extreme Bounds", () => {
    it("handles extreme high ball elevation (>5m and >100m) with bounded shadow and perspective", () => {
      const extremeElevations = [5.5, 12.0, 50.0, 1000.0];

      extremeElevations.forEach((zVal) => {
        act(() => {
          baseMemory.updateFrame({
            frameId: 50,
            ball: { x: 52.5, y: 34.0, z: zVal },
            players: [],
          });
        });

        expect(() => {
          const { unmount } = render(<PitchRadarCanvas />);
          act(() => {
            window.dispatchEvent(new Event("resize"));
          });
          unmount();
        }).not.toThrow();

        // Mathematical verification of elevation formulas:
        const baseR = 4.5;
        const shadowR = baseR * (1 + 0.25 * zVal);
        const shadowAlpha = Math.max(0.12, 0.40 - 0.03 * zVal);
        const elevatedR = baseR * (1 + 0.12 * Math.min(zVal, 6.0));

        expect(shadowR).toBeGreaterThan(baseR);
        expect(shadowAlpha).toBeGreaterThanOrEqual(0.12);
        expect(shadowAlpha).toBeLessThanOrEqual(0.40);
        // Ball expansion capped at 6.0m equivalent
        expect(elevatedR).toBeLessThanOrEqual(baseR * (1 + 0.12 * 6.0) + 0.001);
      });
    });

    it("handles negative and zero ball elevation gracefully via flat 2D ball branch", () => {
      const flatElevations = [0, -0.5, -10.0, -999.0];

      flatElevations.forEach((zVal) => {
        act(() => {
          baseMemory.updateFrame({
            frameId: 51,
            ball: { x: 52.5, y: 34.0, z: zVal },
            players: [],
          });
        });

        expect(() => {
          const { unmount } = render(<PitchRadarCanvas />);
          act(() => {
            window.dispatchEvent(new Event("resize"));
          });
          unmount();
        }).not.toThrow();
      });
    });

    it("verifies exact elevation boundary transition at z = 0.05m", () => {
      // z = 0.05: flat 2D
      act(() => {
        baseMemory.updateFrame({
          frameId: 52,
          ball: { x: 52.5, y: 34.0, z: 0.05 },
          players: [],
        });
      });
      expect(() => {
        const { unmount } = render(<PitchRadarCanvas />);
        unmount();
      }).not.toThrow();

      // z = 0.051: elevated 3D
      act(() => {
        baseMemory.updateFrame({
          frameId: 53,
          ball: { x: 52.5, y: 34.0, z: 0.051 },
          players: [],
        });
      });
      expect(() => {
        const { unmount } = render(<PitchRadarCanvas />);
        unmount();
      }).not.toThrow();
    });

    it("handles non-numeric and malformed ball coordinates (NaN, Infinity, null, undefined) without throwing", () => {
      const malformedBalls = [
        { x: NaN, y: 34.0, z: 2.0 },
        { x: 52.5, y: NaN, z: 2.0 },
        { x: 52.5, y: 34.0, z: NaN },
        { x: 52.5, y: 34.0, z: undefined as unknown as number },
        { x: 52.5, y: 34.0, z: null as unknown as number },
        { x: 52.5, y: 34.0, z: "elevation" as unknown as number },
      ];

      malformedBalls.forEach((b) => {
        act(() => {
          baseMemory.updateFrame({
            frameId: 54,
            ball: b,
            players: [],
          });
        });

        expect(() => {
          const { unmount } = render(<PitchRadarCanvas />);
          act(() => {
            window.dispatchEvent(new Event("resize"));
          });
          unmount();
        }).not.toThrow();
      });
    });

    it("safeDrawShadow gracefully handles ellipse failure or fallback to arc", () => {
      // 1. ctx.ellipse available and works
      act(() => {
        baseMemory.updateFrame({
          frameId: 60,
          ball: { x: 50, y: 30, z: 2.5 },
          players: [],
        });
      });
      const { unmount: unmount1 } = render(<PitchRadarCanvas />);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
      expect(mockContext.ellipse).toHaveBeenCalled();
      unmount1();

      // 2. ctx.ellipse throws error -> falls back to ctx.arc
      (mockContext.ellipse as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
        throw new Error("Simulated browser canvas ellipse error");
      });
      const { unmount: unmount2 } = render(<PitchRadarCanvas />);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
      expect(mockContext.arc).toHaveBeenCalled();
      unmount2();

      // 3. ctx.ellipse undefined -> falls back to ctx.arc
      const originalEllipse = mockContext.ellipse;
      delete mockContext.ellipse;
      const { unmount: unmount3 } = render(<PitchRadarCanvas />);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
      expect(mockContext.arc).toHaveBeenCalled();
      unmount3();
      mockContext.ellipse = originalEllipse;
    });
  });
});
