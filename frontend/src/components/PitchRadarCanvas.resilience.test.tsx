import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { PitchRadarCanvas } from "./PitchRadarCanvas";
import { baseMemory } from "../store/baseMemory";

describe("PitchRadarCanvas Resilience & Stress Test Suite", () => {
  let mockContext: Record<string, unknown>;
  let resizeObserverCallback: ((entries: ResizeObserverEntry[], observer: ResizeObserver) => void) | null = null;

  beforeEach(() => {
    mockContext = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
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

    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;

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

    // Mock ResizeObserver to capture its callback
    global.ResizeObserver = class MockResizeObserver implements ResizeObserver {
      callback: (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;
      constructor(cb: (entries: ResizeObserverEntry[], observer: ResizeObserver) => void) {
        this.callback = cb;
        resizeObserverCallback = cb;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resizeObserverCallback = null;
  });

  // -------------------------------------------------------------
  // 1. Zero-dimension and Extreme Dimension Handling
  // -------------------------------------------------------------
  describe("1. Zero-dimension and Extreme Dimension Handling", () => {
    const extremeDimensions = [
      { name: "0x0 collapsed", width: 0, height: 0 },
      { name: "negative dimensions", width: -100, height: -50 },
      { name: "sub-threshold dimensions (< 10px)", width: 8, height: 8 },
      { name: "constrained pitch area (< 20px draw area)", width: 35, height: 35 },
      { name: "non-finite NaN", width: NaN, height: NaN },
    ];

    extremeDimensions.forEach(({ name, width, height }) => {
      it(`gracefully handles ${name} without throwing exceptions`, () => {
        HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
          width,
          height,
          top: 0,
          left: 0,
          bottom: height,
          right: width,
          x: 0,
          y: 0,
          toJSON: () => {},
        }));

        expect(() => {
          const { unmount } = render(<PitchRadarCanvas />);
          unmount();
        }).not.toThrow();
      });
    });

    it("handles click on 0x0 collapsed canvas without throwing", () => {
      HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      const { container } = render(<PitchRadarCanvas />);
      const canvas = container.querySelector("canvas");
      expect(canvas).not.toBeNull();
      if (!canvas) return;

      expect(() => {
        act(() => {
          fireEvent.click(canvas, { clientX: 0, clientY: 0 });
        });
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------
  // 2. Rapid Resize Stress
  // -------------------------------------------------------------
  describe("2. Rapid Resize Stress", () => {
    it("survives rapid transitions across standard breakpoints (1920x1080 -> 0x0 -> 330x680 -> 850x608)", () => {
      const dimensionsSequence = [
        { width: 1920, height: 1080 },
        { width: 0, height: 0 },
        { width: 330, height: 213 },
        { width: 850, height: 550 },
        { width: 1200, height: 777 },
        { width: 0, height: 0 },
        { width: 480, height: 310 },
      ];

      const { container } = render(<PitchRadarCanvas />);
      const canvas = container.querySelector("canvas");
      expect(canvas).not.toBeNull();
      if (!canvas) return;

      expect(() => {
        dimensionsSequence.forEach(({ width, height }) => {
          HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
            width,
            height,
            top: 0,
            left: 0,
            bottom: height,
            right: width,
            x: 0,
            y: 0,
            toJSON: () => {},
          }));

          act(() => {
            if (resizeObserverCallback) {
              resizeObserverCallback([{ target: canvas, contentRect: { width, height } as DOMRectReadOnly } as unknown as ResizeObserverEntry], {} as ResizeObserver);
            }
            window.dispatchEvent(new Event("resize"));
          });
        });
      }).not.toThrow();
    });

    it("handles burst of 50 consecutive resize events without unhandled rejection", () => {
      const { container } = render(<PitchRadarCanvas />);
      const canvas = container.querySelector("canvas");
      expect(canvas).not.toBeNull();
      if (!canvas) return;

      expect(() => {
        act(() => {
          for (let i = 0; i < 50; i++) {
            const width = (i % 2 === 0) ? 0 : 300 + (i * 10);
            const height = (i % 2 === 0) ? 0 : 200 + (i * 6);
            HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
              width,
              height,
              top: 0,
              left: 0,
              bottom: height,
              right: width,
              x: 0,
              y: 0,
              toJSON: () => {},
            }));

            if (resizeObserverCallback) {
              resizeObserverCallback([{ target: canvas } as unknown as ResizeObserverEntry], {} as ResizeObserver);
            }
            window.dispatchEvent(new Event("resize"));
          }
        });
      }).not.toThrow();
    });

    it("verifies RAF loop scheduling and teardown cleanup on unmount", () => {
      const activeRafCallbacks = new Map<number, FrameRequestCallback>();
      let nextRafId = 1;

      vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback) => {
        const id = nextRafId++;
        activeRafCallbacks.set(id, cb);
        return id;
      });

      vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id: number) => {
        activeRafCallbacks.delete(id);
      });

      const { unmount } = render(<PitchRadarCanvas />);
      expect(activeRafCallbacks.size).toBeGreaterThan(0);

      // Trigger resize events
      act(() => {
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new Event("resize"));
      });

      // Now unmount
      act(() => {
        unmount();
      });

      // After unmount, any remaining RAF callbacks should exit immediately if triggered
      activeRafCallbacks.forEach((cb) => {
        expect(() => cb(performance.now())).not.toThrow();
      });
    });
  });

  // -------------------------------------------------------------
  // 3. RAF Loop Resilience & Telemetry Anomaly Survival
  // -------------------------------------------------------------
  describe("3. RAF Loop Resilience & Telemetry Anomaly Survival", () => {
    it("survives null/empty telemetry frames in baseMemory without crashing", () => {
      const { container } = render(<PitchRadarCanvas />);
      const canvas = container.querySelector("canvas");

      // Simulate baseMemory with null currentFrame
      act(() => {
        const mem = baseMemory as unknown as { state: { currentFrame: unknown } };
        mem.state = {
          ...mem.state,
          currentFrame: null,
        };
        window.dispatchEvent(new Event("resize"));
      });

      // Simulate baseMemory with empty players array
      act(() => {
        baseMemory.updateFrame({
          frameId: 1,
          matchClock: "24:12",
          players: [],
          metrics: { controlVsChaosIndex: 58 },
        });
        window.dispatchEvent(new Event("resize"));
      });

      expect(canvas).toBeDefined();
    });

    it("survives telemetry frames with extreme or NaN coordinates", () => {
      act(() => {
        baseMemory.updateFrame({
          frameId: 2,
          matchClock: "30:00",
          ball: { x: NaN, y: Infinity, z: -5, vx: NaN, vy: NaN },
          players: [
            {
              id: "p1",
              name: "Erratic Player",
              number: 9,
              team: "home",
              x: NaN,
              y: 500,
              vx: 25,
              vy: NaN,
              onBall: true,
            },
            {
              id: "p2",
              name: "Out of Bounds",
              number: 10,
              team: "away",
              x: -999,
              y: -999,
              vx: 0,
              vy: 0,
              onBall: false,
            },
          ],
          metrics: { controlVsChaosIndex: 50 },
        });
        window.dispatchEvent(new Event("resize"));
      });

      expect(() => {
        render(<PitchRadarCanvas />);
      }).not.toThrow();
    });

    it("survives canvas context draw errors via try/catch/finally loop", () => {
      // Intentionally cause context.fillRect to throw an error on 1st call
      let throwCount = 1;
      mockContext.fillRect = vi.fn(() => {
        if (throwCount > 0) {
          throwCount--;
          throw new Error("Simulated intermittent GPU context error");
        }
      });

      expect(() => {
        act(() => {
          render(<PitchRadarCanvas />);
          window.dispatchEvent(new Event("resize"));
        });
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------
  // 4. Dominance Badge Coordinates vs FPS Counter Positioning
  // -------------------------------------------------------------
  describe("4. Dominance Badge Coordinates vs FPS Counter Positioning", () => {
    it("draws FPS counter at top-left and dominance badge at lower-left with zero overlap", () => {
      baseMemory.updateFrame({
        frameId: 10,
        matchClock: "45:00",
        players: [],
        metrics: { controlVsChaosIndex: 62 },
      });

      render(<PitchRadarCanvas />);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      const fillTextMock = mockContext.fillText as ReturnType<typeof vi.fn>;
      const fillTextCalls = fillTextMock.mock.calls;

      const fpsTextCall = fillTextCalls.find((call) => typeof call[0] === "string" && call[0].includes("FPS"));
      const pcTextCall = fillTextCalls.find((call) => typeof call[0] === "string" && call[0].includes("Pitch Control"));

      expect(fpsTextCall).toBeDefined();
      expect(pcTextCall).toBeDefined();

      const fpsCenterY = fpsTextCall ? (fpsTextCall[2] as number) : 0;
      const pcCenterY = pcTextCall ? (pcTextCall[2] as number) : 0;

      // FPS badge must be in the top area (fpsCenterY < 100)
      expect(fpsCenterY).toBeLessThan(100);

      // Dominance badge must be in the lower area (pcCenterY > 400 on a 550h canvas)
      expect(pcCenterY).toBeGreaterThan(400);

      // Vertical separation between FPS counter and Pitch Control Dominance badge must be > 300px
      const verticalDistance = pcCenterY - fpsCenterY;
      expect(verticalDistance).toBeGreaterThan(300);
    });

    it("maintains vertical separation even on compact mobile dimensions (330x213)", () => {
      HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 330,
        height: 213,
        top: 0,
        left: 0,
        bottom: 213,
        right: 330,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      baseMemory.updateFrame({
        frameId: 11,
        matchClock: "12:00",
        players: [],
        metrics: { controlVsChaosIndex: 55 },
      });

      render(<PitchRadarCanvas />);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      const fillTextMock = mockContext.fillText as ReturnType<typeof vi.fn>;
      const fillTextCalls = fillTextMock.mock.calls;
      const fpsTextCall = fillTextCalls.find((call) => typeof call[0] === "string" && call[0].includes("FPS"));
      const pcTextCall = fillTextCalls.find((call) => typeof call[0] === "string" && call[0].includes("Pitch Control"));

      expect(fpsTextCall).toBeDefined();
      expect(pcTextCall).toBeDefined();

      const fpsCenterY = fpsTextCall ? (fpsTextCall[2] as number) : 0;
      const pcCenterY = pcTextCall ? (pcTextCall[2] as number) : 0;

      // Even on 213px height, dominance badge must be significantly below FPS badge
      expect(pcCenterY).toBeGreaterThan(fpsCenterY + 100);
    });
  });

  // -------------------------------------------------------------
  // 5. Canvas Tooltip & Zero-Clutter Compliance
  // -------------------------------------------------------------
  describe("5. Canvas Tooltip & Zero-Clutter Compliance", () => {
    it("renders clean tooltip title without instructional copy", () => {
      const { container } = render(<PitchRadarCanvas />);
      const canvas = container.querySelector("canvas");
      expect(canvas).not.toBeNull();
      if (!canvas) return;

      const title = canvas.getAttribute("title");
      expect(title).toBe("Premier League Pitch Radar (105m × 68m)");

      // Banned words check
      const bannedWords = ["click", "drag", "scrub", "hover", "press", "select", "tap"];
      bannedWords.forEach((word) => {
        expect(title?.toLowerCase()).not.toContain(word);
      });
    });
  });
});
