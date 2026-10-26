import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { JudgeQuickTourModal } from "./JudgeQuickTourModal";
import { JudgeQuickTourPill } from "./JudgeQuickTourPill";
import { baseMemory } from "../store/baseMemory";

describe("Judge Quick Tour & Hero Tech Architecture Modal", () => {
  beforeEach(() => {
    baseMemory.resetScenario();
    baseMemory.closeJudgeTour();
  });

  it("does not render when isOpen is false", () => {
    render(<JudgeQuickTourModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders modal with title, rubric badges, and hero tech items when isOpen is true", () => {
    render(<JudgeQuickTourModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(/Hero Tech Stack & Architecture Tour/i)).toBeDefined();
    expect(screen.getByText(/Pillar 1: Technical Implementation/i)).toBeDefined();
    expect(screen.getByText(/Pillar 2: Agentic Design & Innovation/i)).toBeDefined();
    expect(screen.getByText(/Pillar 4: UX & Polish/i)).toBeDefined();

    // Check Hero Tech Stack badges
    expect(screen.getByText("Azure AI Foundry")).toBeDefined();
    expect(screen.getByText("Azure MCP (7 Tools)")).toBeDefined();
    expect(screen.getByText("Azure Event Hubs")).toBeDefined();
    expect(screen.getByText("Azure Cosmos DB")).toBeDefined();
    expect(screen.getByText("4-Agent Swarm")).toBeDefined();
  });

  it("displays Live Latency SLA performance meters", () => {
    render(<JudgeQuickTourModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Live Latency SLA Performance Meters/i)).toBeDefined();
    expect(screen.getByText(/Fast-Path Physics & Mesh/i)).toBeDefined();
    expect(screen.getByText(/96% HEADROOM/i)).toBeDefined();
    expect(screen.getByText(/99% HEADROOM/i)).toBeDefined();
  });

  it("triggers scenario demo buttons and updates baseMemory state", () => {
    render(<JudgeQuickTourModal isOpen={true} onClose={vi.fn()} />);

    // 1. Low Block Siege
    const lowBlockBtn = screen.getByText(/Low Block Siege/i);
    act(() => {
      fireEvent.click(lowBlockBtn);
    });
    expect(baseMemory.getState().activeScenario).toBe("low_block_siege");
    expect(screen.getByText(/Triggered "Low Block Siege"!/i)).toBeDefined();

    // 2. Counter Attack Blitz
    const counterBtn = screen.getByText(/Counter Attack Blitz/i);
    act(() => {
      fireEvent.click(counterBtn);
    });
    expect(baseMemory.getState().activeScenario).toBe("counter_attack_blitz");
    expect(screen.getByText(/Triggered "Counter Attack Blitz"!/i)).toBeDefined();

    // 3. Final Minutes Desperation
    const desperationBtn = screen.getByText(/Final Minutes Desperation/i);
    act(() => {
      fireEvent.click(desperationBtn);
    });
    expect(baseMemory.getState().activeScenario).toBe("final_minutes_desperation");
    expect(screen.getByText(/Triggered "Final Minutes Desperation"!/i)).toBeDefined();

    // 4. Reset Baseline
    const resetBtn = screen.getByText(/Reset Baseline/i);
    act(() => {
      fireEvent.click(resetBtn);
    });
    expect(baseMemory.getState().activeScenario).toBeNull();
  });

  it("calls onClose when close button or Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(<JudgeQuickTourModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText(/Close Judge Quick Tour modal/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("JudgeQuickTourPill opens judge tour when clicked", () => {
    render(<JudgeQuickTourPill />);
    const pill = screen.getByRole("button", { name: /Judge Quick Tour and Hero Tech Stack/i });
    expect(pill).toBeDefined();

    act(() => {
      fireEvent.click(pill);
    });
    expect(baseMemory.getState().isJudgeTourOpen).toBe(true);
  });
});
