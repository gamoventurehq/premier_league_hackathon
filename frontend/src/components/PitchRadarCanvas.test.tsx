import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { PitchRadarCanvas } from "./PitchRadarCanvas";

describe("PitchRadarCanvas Component", () => {
  beforeEach(() => {
    // Mock getBoundingClientRect
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 400,
      height: 260,
      top: 0,
      left: 0,
      bottom: 260,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
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
      measureText: vi.fn(() => ({ width: 60 })),
      fillText: vi.fn(),
      setLineDash: vi.fn(),
      roundRect: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders radar container and canvas element successfully", () => {
    const { container } = render(<PitchRadarCanvas />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeDefined();
    expect(canvas).not.toBeNull();
  });

  it("handles zero dimensions safely when page is hidden without throwing error", () => {
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

    expect(() => {
      render(<PitchRadarCanvas />);
    }).not.toThrow();
  });

  it("handles viewEpoch changes when entering the screen", () => {
    const { rerender } = render(<PitchRadarCanvas viewEpoch={0} />);
    expect(() => {
      rerender(<PitchRadarCanvas viewEpoch={1} />);
    }).not.toThrow();
  });

  it("allows canvas click without throwing", () => {
    const { container } = render(<PitchRadarCanvas />);
    const canvas = container.querySelector("canvas")!;

    expect(() => {
      act(() => {
        fireEvent.click(canvas, { clientX: 200, clientY: 130 });
      });
    }).not.toThrow();
  });
});
