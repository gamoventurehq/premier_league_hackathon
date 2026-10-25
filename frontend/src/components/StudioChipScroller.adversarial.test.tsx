import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StudioChipScroller } from "./StudioChipScroller";
import { StudioRecapModal } from "./broadcast/StudioRecapModal";
import { AttackingShapeCard } from "./dashboard/AttackingShapeCard";
import { FormationPitchCard } from "./dashboard/FormationPitchCard";
import { MatchScoreCard } from "./dashboard/MatchScoreCard";
import { PlayerSpotlightCard } from "./dashboard/PlayerSpotlightCard";
import { MediaTimelinePanel } from "./dashboard/MediaTimelinePanel";
import { DashboardPage } from "../pages/DashboardPage";

// Ensure PointerEvent exists in JSDOM
if (typeof window !== "undefined" && !window.PointerEvent) {
  class JSDOMPointerEvent extends MouseEvent {
    pointerId: number;
    width: number;
    height: number;
    pressure: number;
    pointerType: string;
    constructor(type: string, params: MouseEventInit & { pointerId?: number; width?: number; height?: number; pressure?: number; pointerType?: string } = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
      this.width = params.width ?? 1;
      this.height = params.height ?? 1;
      this.pressure = params.pressure ?? 0;
      this.pointerType = params.pointerType ?? "mouse";
    }
  }
  // @ts-expect-error polyfill for JSDOM
  window.PointerEvent = JSDOMPointerEvent;
  // @ts-expect-error polyfill for JSDOM
  globalThis.PointerEvent = JSDOMPointerEvent;
}

describe("StudioChipScroller Adversarial & Stress Harness", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // 1. Draggable Scroller Interactions
  // ---------------------------------------------------------------------------
  describe("1. Draggable Scroller Interactions", () => {
    it("handles mouse grab-and-drag only with left click (button 0)", () => {
      const { container } = render(
        <StudioChipScroller>
          <div style={{ width: 1000 }}>Wide Row</div>
        </StudioChipScroller>
      );

      const scrollContainer = container.querySelector(".hide-scrollbar") as HTMLElement;
      expect(scrollContainer).toBeDefined();

      Object.defineProperty(scrollContainer, "scrollWidth", { value: 1200, configurable: true });
      Object.defineProperty(scrollContainer, "clientWidth", { value: 400, configurable: true });
      Object.defineProperty(scrollContainer, "offsetLeft", { value: 0, configurable: true });
      scrollContainer.scrollLeft = 0;

      // Right click should NOT initiate drag
      fireEvent.mouseDown(scrollContainer, { button: 2, clientX: 100, pageX: 100 });
      fireEvent.mouseMove(window, { clientX: 50, pageX: 50 });
      expect(scrollContainer.scrollLeft).toBe(0);

      // Left click should initiate drag
      fireEvent.mouseDown(scrollContainer, { button: 0, clientX: 100, pageX: 100 });
      fireEvent.mouseMove(window, { clientX: 50, pageX: 50 }); // Dragged left by 50px -> scroll moves right by 50px
      expect(scrollContainer.scrollLeft).toBe(50);

      // MouseUp terminates drag
      fireEvent.mouseUp(window);
      fireEvent.mouseMove(window, { clientX: 10, pageX: 10 });
      expect(scrollContainer.scrollLeft).toBe(50);
    });

    it("suppresses accidental child click when dragged > 4px", () => {
      const handleClick = vi.fn();
      const { getByText, container } = render(
        <StudioChipScroller>
          <button onClick={handleClick}>Action Button</button>
        </StudioChipScroller>
      );

      const scrollContainer = container.querySelector(".hide-scrollbar") as HTMLElement;
      const button = getByText("Action Button");

      // Small drag <= 4px does NOT suppress click
      fireEvent.mouseDown(scrollContainer, { button: 0, clientX: 100, pageX: 100 });
      fireEvent.mouseMove(window, { clientX: 102, pageX: 102 }); // walk = 2px
      fireEvent.mouseUp(window);
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Significant drag > 4px suppresses click
      handleClick.mockClear();
      fireEvent.mouseDown(scrollContainer, { button: 0, clientX: 100, pageX: 100 });
      fireEvent.mouseMove(window, { clientX: 150, pageX: 150 }); // walk = 50px
      fireEvent.mouseUp(window);
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(0);
    });

    it("verifies horizontal wheel redirection on mousewheel events", () => {
      const { container } = render(
        <StudioChipScroller>
          <div style={{ width: 1000 }}>Wide Row</div>
        </StudioChipScroller>
      );

      const scrollContainer = container.querySelector(".hide-scrollbar") as HTMLElement;
      scrollContainer.scrollLeft = 100;

      // Vertical wheel deltaY > deltaX redirects to scrollLeft
      fireEvent.wheel(scrollContainer, { deltaY: 80, deltaX: 0 });
      expect(scrollContainer.scrollLeft).toBe(180);

      // Negative deltaY scrolls back left
      fireEvent.wheel(scrollContainer, { deltaY: -50, deltaX: 0 });
      expect(scrollContainer.scrollLeft).toBe(130);

      // Horizontal wheel deltaX redirects directly
      fireEvent.wheel(scrollContainer, { deltaY: 0, deltaX: 45 });
      expect(scrollContainer.scrollLeft).toBe(175);
    });

    it("checks neutral grey styling, track hit area, and checks .studio-chip-scroller-thumb class presence", () => {
      const { container } = render(
        <StudioChipScroller thumbColor="#94a3b8" alwaysShowTrack={true}>
          <div style={{ width: 800 }}>Content</div>
        </StudioChipScroller>
      );

      const track = container.querySelector('[title="Drag or click to scroll options"]') as HTMLElement;
      expect(track).toBeDefined();

      // Check hit area padding (top & bottom padding should be generous: 6px + 6px + 4.5px = 16.5px)
      expect(track.style.paddingTop).toBe("6px");
      expect(track.style.paddingBottom).toBe("6px");

      // Check thumb element and color
      const visualTrack = track.firstElementChild as HTMLElement;
      expect(visualTrack).toBeDefined();
      const visualThumb = visualTrack.firstElementChild as HTMLElement;
      expect(visualThumb).toBeDefined();
      expect(visualThumb.style.backgroundColor).toBe("rgb(148, 163, 184)"); // #94a3b8

      // Critic adversarial check: Check whether .studio-chip-scroller-thumb class exists on the thumb
      const thumbWithClass = container.querySelector(".studio-chip-scroller-thumb");
      expect(thumbWithClass).toBeNull(); // Empirically confirms .studio-chip-scroller-thumb class is missing
    });

    it("adversarially audits momentum / inertia after fast pointer drag release", () => {
      const { container } = render(
        <StudioChipScroller>
          <div style={{ width: 2000 }}>Super Wide Row</div>
        </StudioChipScroller>
      );

      const scrollContainer = container.querySelector(".hide-scrollbar") as HTMLElement;
      Object.defineProperty(scrollContainer, "scrollWidth", { value: 2000, configurable: true });
      Object.defineProperty(scrollContainer, "clientWidth", { value: 400, configurable: true });
      Object.defineProperty(scrollContainer, "offsetLeft", { value: 0, configurable: true });
      scrollContainer.scrollLeft = 0;

      // Simulate rapid flick swipe: start at 300, swipe fast to 100
      fireEvent.mouseDown(scrollContainer, { button: 0, clientX: 300, pageX: 300 });
      fireEvent.mouseMove(window, { clientX: 100, pageX: 100 });
      const scrollPosAtRelease = scrollContainer.scrollLeft;
      expect(scrollPosAtRelease).toBe(200);

      // Release swipe
      fireEvent.mouseUp(window);

      // Advance timers by 200ms to see if momentum continues sliding scrollLeft
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Empirical finding: In current implementation, momentum/inertia decay loop is NOT present
      const scrollPosAfterDecay = scrollContainer.scrollLeft;
      const hasMomentumInertia = scrollPosAfterDecay > scrollPosAtRelease;
      expect(hasMomentumInertia).toBe(false); // Verified: no inertial coasting
    });

    it("verifies track pointer dragging and ratio calculation", () => {
      const { container } = render(
        <StudioChipScroller alwaysShowTrack={true}>
          <div style={{ width: 1000 }}>Wide Row</div>
        </StudioChipScroller>
      );

      const scrollContainer = container.querySelector(".hide-scrollbar") as HTMLElement;
      const track = container.querySelector('[title="Drag or click to scroll options"]') as HTMLElement;

      Object.defineProperty(scrollContainer, "scrollWidth", { value: 1000, configurable: true });
      Object.defineProperty(scrollContainer, "clientWidth", { value: 200, configurable: true });
      // maxScroll = 800

      // Mock track dimensions: left 100, width 400
      track.getBoundingClientRect = () => ({
        left: 100,
        right: 500,
        width: 400,
        top: 0,
        bottom: 20,
        height: 20,
        x: 100,
        y: 0,
        toJSON: () => {},
      });

      // Pointer down at clientX = 200 (25% along the track)
      fireEvent.pointerDown(track, { clientX: 200 });
      // ratio = (200 - 100) / 400 = 0.25 -> scrollLeft = 0.25 * 800 = 200
      expect(scrollContainer.scrollLeft).toBe(200);

      // Move pointer to clientX = 300 (50% along track)
      fireEvent.pointerMove(window, { clientX: 300 });
      // ratio = (300 - 100) / 400 = 0.5 -> scrollLeft = 0.5 * 800 = 400
      expect(scrollContainer.scrollLeft).toBe(400);

      // Pointer up ends track dragging
      fireEvent.pointerUp(window);
      fireEvent.pointerMove(window, { clientX: 400 });
      expect(scrollContainer.scrollLeft).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Boundary Stress Tests (0 chips, 1 chip, 100 chips, rapid dragging past bounds)
  // ---------------------------------------------------------------------------
  describe("2. Boundary Stress Tests", () => {
    it("safely handles 0 chips without NaN or exceptions", () => {
      const { container } = render(
        <StudioChipScroller alwaysShowTrack={true}>
          {[]}
        </StudioChipScroller>
      );

      const scrollContainer = container.querySelector(".hide-scrollbar");
      expect(scrollContainer).toBeDefined();
      expect(container.textContent).toBe("");
    });

    it("safely handles 1 chip without divide-by-zero errors", () => {
      const { container, getByText } = render(
        <StudioChipScroller alwaysShowTrack={true}>
          <button>Single Solitary Chip</button>
        </StudioChipScroller>
      );

      expect(getByText("Single Solitary Chip")).toBeDefined();
      const track = container.querySelector('[title="Drag or click to scroll options"]');
      expect(track).toBeDefined();
    });

    it("safely handles 100 chips under rapid scroll updates", () => {
      const chips = Array.from({ length: 100 }, (_, i) => (
        <button key={i}>Chip #{i + 1}</button>
      ));

      const { container, getByText } = render(
        <StudioChipScroller gap="4px">
          {chips}
        </StudioChipScroller>
      );

      expect(getByText("Chip #1")).toBeDefined();
      expect(getByText("Chip #100")).toBeDefined();

      const scrollContainer = container.querySelector(".hide-scrollbar") as HTMLElement;
      expect(scrollContainer.children.length).toBe(100);

      // Rapidly fire 50 scroll and wheel events
      for (let i = 0; i < 50; i++) {
        fireEvent.wheel(scrollContainer, { deltaY: 20 });
        fireEvent.scroll(scrollContainer);
      }
    });

    it("clamps rapid pointer dragging past bounds without NaN or overflow", () => {
      const { container } = render(
        <StudioChipScroller alwaysShowTrack={true}>
          <div style={{ width: 800 }}>Content</div>
        </StudioChipScroller>
      );

      const scrollContainer = container.querySelector(".hide-scrollbar") as HTMLElement;
      const track = container.querySelector('[title="Drag or click to scroll options"]') as HTMLElement;

      Object.defineProperty(scrollContainer, "scrollWidth", { value: 1000, configurable: true });
      Object.defineProperty(scrollContainer, "clientWidth", { value: 200, configurable: true });

      track.getBoundingClientRect = () => ({
        left: 100,
        right: 500,
        width: 400,
        top: 0,
        bottom: 20,
        height: 20,
        x: 100,
        y: 0,
        toJSON: () => {},
      });

      // Pointer down far left (clientX = -9999) -> clamps to 0
      fireEvent.pointerDown(track, { clientX: -9999 });
      expect(scrollContainer.scrollLeft).toBe(0);

      // Move pointer far right (clientX = +99999) -> clamps to maxScroll (800)
      fireEvent.pointerMove(window, { clientX: 99999 });
      expect(scrollContainer.scrollLeft).toBe(800);

      fireEvent.pointerUp(window);
    });

    it("cleans up window event listeners on unmount while dragging", () => {
      const { container, unmount } = render(
        <StudioChipScroller alwaysShowTrack={true}>
          <div style={{ width: 800 }}>Content</div>
        </StudioChipScroller>
      );

      const scrollContainer = container.querySelector(".hide-scrollbar") as HTMLElement;
      fireEvent.mouseDown(scrollContainer, { button: 0, clientX: 100, pageX: 100 });

      // Unmount while dragging
      expect(() => unmount()).not.toThrow();

      // Triggering window mousemove or mouseup after unmount should not throw
      expect(() => {
        fireEvent.mouseMove(window, { clientX: 50, pageX: 50 });
        fireEvent.mouseUp(window);
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Responsive Layout Adaptation & Viewports
  // ---------------------------------------------------------------------------
  describe("3. Responsive Layout Adaptation", () => {
    it("verifies StudioRecapModal has exactly single visible grey scrollbar per active tab", () => {
      const { getByText } = render(
        <StudioRecapModal isOpen={true} onClose={() => {}} />
      );

      // TAB 1: Teleprompter
      let scrollbars = document.body.querySelectorAll(".studio-visible-scrollbar");
      expect(scrollbars.length).toBe(1);

      // Switch to TAB 2: Chapters
      const chaptersBtn = getByText("Chapters");
      fireEvent.click(chaptersBtn);
      scrollbars = document.body.querySelectorAll(".studio-visible-scrollbar");
      expect(scrollbars.length).toBe(1);

      // Switch to TAB 3: Publication
      const pubBtn = getByText("Publication");
      fireEvent.click(pubBtn);
      scrollbars = document.body.querySelectorAll(".studio-visible-scrollbar");
      expect(scrollbars.length).toBe(1);
    });

    it("verifies StudioRecapModal header wraps badges cleanly without truncating", () => {
      render(<StudioRecapModal isOpen={true} onClose={() => {}} />);

      const modalHeader = document.body.querySelector(".studio-recap-modal-body")?.previousElementSibling as HTMLElement;
      expect(modalHeader).toBeDefined();

      const gamoventureBadge = document.body.querySelector("span[style*='background-color: rgb(124, 58, 237)']") as HTMLElement;
      expect(gamoventureBadge).toBeDefined();
      expect(gamoventureBadge.style.flexShrink).toBe("0");
    });

    it("verifies all 5 dashboard cards render within compact 330px width without crashing", () => {
      const renderInCompactViewport = (component: React.ReactNode) => {
        return render(
          <div style={{ width: "330px", maxWidth: "330px", overflow: "hidden", boxSizing: "border-box" }}>
            {component}
          </div>
        );
      };

      // 1. AttackingShapeCard
      expect(() => renderInCompactViewport(<AttackingShapeCard />)).not.toThrow();

      // 2. FormationPitchCard
      expect(() => renderInCompactViewport(<FormationPitchCard />)).not.toThrow();

      // 3. MatchScoreCard
      expect(() => renderInCompactViewport(<MatchScoreCard />)).not.toThrow();

      // 4. PlayerSpotlightCard
      expect(() => renderInCompactViewport(<PlayerSpotlightCard />)).not.toThrow();

      // 5. MediaTimelinePanel
      expect(() => renderInCompactViewport(<MediaTimelinePanel />)).not.toThrow();
    });

    it("verifies mobile segmented pills (Match, Video, Maps, All) switch visible columns in DashboardPage", () => {
      const { getByText, container } = render(<DashboardPage />);

      const matchPill = getByText("Match");
      const videoPill = getByText("Video");
      const mapsPill = getByText("Maps");
      const allPill = getByText("All");

      expect(matchPill).toBeDefined();
      expect(videoPill).toBeDefined();
      expect(mapsPill).toBeDefined();
      expect(allPill).toBeDefined();

      const videoCol = container.querySelector(".studio-col-video") as HTMLElement;
      const matchCol = container.querySelector(".studio-col-match") as HTMLElement;
      const spotlightCol = container.querySelector(".studio-col-spotlight") as HTMLElement;

      // Default state is 'all': none of the columns should have ion-hide-md-down
      expect(videoCol.className).not.toContain("ion-hide-md-down");
      expect(matchCol.className).not.toContain("ion-hide-md-down");
      expect(spotlightCol.className).not.toContain("ion-hide-md-down");

      // Click "Match" pill: video and spotlight columns get ion-hide-md-down, matchCol remains visible
      fireEvent.click(matchPill);
      expect(videoCol.className).toContain("ion-hide-md-down");
      expect(spotlightCol.className).toContain("ion-hide-md-down");
      expect(matchCol.className).not.toContain("ion-hide-md-down");

      // Click "Video" pill: match and spotlight get ion-hide-md-down, videoCol remains visible
      fireEvent.click(videoPill);
      expect(matchCol.className).toContain("ion-hide-md-down");
      expect(spotlightCol.className).toContain("ion-hide-md-down");
      expect(videoCol.className).not.toContain("ion-hide-md-down");

      // Click "Maps" pill: video and match get ion-hide-md-down, spotlightCol remains visible
      fireEvent.click(mapsPill);
      expect(videoCol.className).toContain("ion-hide-md-down");
      expect(matchCol.className).toContain("ion-hide-md-down");
      expect(spotlightCol.className).not.toContain("ion-hide-md-down");

      // Click "All" pill: resets all columns to visible
      fireEvent.click(allPill);
      expect(videoCol.className).not.toContain("ion-hide-md-down");
      expect(matchCol.className).not.toContain("ion-hide-md-down");
      expect(spotlightCol.className).not.toContain("ion-hide-md-down");
    });
  });
});
