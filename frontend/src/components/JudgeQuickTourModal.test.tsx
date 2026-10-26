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

  it("renders modal with title, all 5 rubric badges, and hero tech items when isOpen is true", () => {
    render(<JudgeQuickTourModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(/Real-Time Pitch Radar/i)).toBeDefined();

    // Verify all 5 official hackathon rubric pillars when expanding rubric
    const rubricBtn = screen.getByRole("button", { name: /Judging rubric/i });
    fireEvent.click(rubricBtn);

    expect(screen.getByText(/Pillar 1 \(20%\)/i)).toBeDefined();
    expect(screen.getAllByText(/Technical Implementation/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pillar 2 \(20%\)/i)).toBeDefined();
    expect(screen.getByText(/Agentic Design & MCP/i)).toBeDefined();
    expect(screen.getByText(/Pillar 3 \(20%\)/i)).toBeDefined();
    expect(screen.getByText(/Real-World Applicability/i)).toBeDefined();
    expect(screen.getByText(/Pillar 4 \(20%\)/i)).toBeDefined();
    expect(screen.getByText(/UX & Experience Polish/i)).toBeDefined();
    expect(screen.getByText(/Pillar 5 \(20%\)/i)).toBeDefined();
    expect(screen.getByText(/Category Adherence/i)).toBeDefined();
  });

  it("displays Live Latency SLA performance meters and supports progressive disclosure accordion", () => {
    render(<JudgeQuickTourModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/Live Latency & Physics SLA Details/i)).toBeDefined();
    expect(screen.queryByText(/Fast-Path Physics & Mesh/i)).toBeNull();

    // Test SLA accordion toggle
    const slaToggleBtn = screen.getByText(/Live Latency & Physics SLA Details/i);
    fireEvent.click(slaToggleBtn);
    expect(screen.getByText(/Fast-Path Physics & Mesh/i)).toBeDefined();
    expect(screen.getByText(/96% Headroom/i)).toBeDefined();
    expect(screen.getByText(/99% Headroom/i)).toBeDefined();

    // Toggle close again
    fireEvent.click(slaToggleBtn);
    expect(screen.queryByText(/Fast-Path Physics & Mesh/i)).toBeNull();
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

  it("navigates through all 4 steps of the guided walkthrough via Next, Previous, and step buttons", () => {
    render(<JudgeQuickTourModal isOpen={true} onClose={vi.fn()} />);

    // Starts on Step 1: Pitch Radar
    expect(screen.getByText(/Step 1 of 4/i)).toBeDefined();

    // Click Next -> Step 2: Agent Swarm
    const nextBtn = screen.getByText(/Next: Agent Swarm/i);
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Step 2 of 4/i)).toBeDefined();
    expect(screen.getByText(/Multi-Agent Blackboard Swarm/i)).toBeDefined();

    // Click Next -> Step 3: Personas
    const nextBtn2 = screen.getByText(/Next: Personas/i);
    fireEvent.click(nextBtn2);
    expect(screen.getByText(/Step 3 of 4/i)).toBeDefined();
    expect(screen.getByText(/Tactical Analyst Experience/i)).toBeDefined();
    expect(screen.getByText(/Casual Fan Experience/i)).toBeDefined();

    // Click Next -> Step 4: Architecture
    const nextBtn3 = screen.getByText(/Next: Architecture/i);
    fireEvent.click(nextBtn3);
    expect(screen.getByText(/Step 4 of 4/i)).toBeDefined();
    expect(screen.getByText(/Explore Studio Dashboard →/i)).toBeDefined();

    // Click Previous -> Back to Step 3
    const prevBtn = screen.getByText(/Previous/i);
    fireEvent.click(prevBtn);
    expect(screen.getByText(/Step 3 of 4/i)).toBeDefined();

    // Direct jump to Step 1 via stepper tab
    const step1Tab = screen.getByRole("button", { name: /Step 1: Pitch Radar/i });
    fireEvent.click(step1Tab);
    expect(screen.getByText(/Step 1 of 4/i)).toBeDefined();
  });

  it("supports keyboard navigation with arrow keys", () => {
    render(<JudgeQuickTourModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/Step 1 of 4/i)).toBeDefined();

    // Right Arrow advances step
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/Step 2 of 4/i)).toBeDefined();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/Step 3 of 4/i)).toBeDefined();

    // Left Arrow goes back
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText(/Step 2 of 4/i)).toBeDefined();
  });

  it("calls onClose when close button or Escape key is pressed", () => {
    const handleClose = vi.fn();
    render(<JudgeQuickTourModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText(/Close Judge Tour modal/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it("allows switching personas in Step 3 and triggers onNavigateTab", () => {
    const handleNavigate = vi.fn();
    render(<JudgeQuickTourModal isOpen={true} onClose={vi.fn()} onNavigateTab={handleNavigate} />);

    // Jump to Step 3
    const step3Tab = screen.getByRole("button", { name: /Step 3: Personas/i });
    fireEvent.click(step3Tab);

    // Switch to casual persona
    const casualBtn = screen.getByText(/Casual Fan Experience/i);
    act(() => {
      fireEvent.click(casualBtn);
    });
    expect(baseMemory.getState().selectedPersona).toBe("casual");

    // Click Jump to Fan Persona Studio
    const jumpBtn = screen.getByText(/Open Fan Persona Studio/i);
    fireEvent.click(jumpBtn);
    expect(handleNavigate).toHaveBeenCalledWith("personas");
  });

  it("JudgeQuickTourPill opens judge tour when clicked", () => {
    render(<JudgeQuickTourPill />);
    const pill = screen.getByRole("button", { name: /Judge Tour: 2 minute walkthrough/i });
    expect(pill).toBeDefined();

    act(() => {
      fireEvent.click(pill);
    });
    expect(baseMemory.getState().isJudgeTourOpen).toBe(true);
  });
});
