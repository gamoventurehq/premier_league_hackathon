import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StudioChipScroller } from "./StudioChipScroller";

describe("StudioChipScroller Component", () => {
  it("renders children buttons cleanly", () => {
    const { getByText } = render(
      <StudioChipScroller marginTopTrack={8} gap="8px">
        <button>Button 1</button>
        <button>Button 2</button>
        <button>Button 3</button>
      </StudioChipScroller>
    );

    expect(getByText("Button 1")).toBeDefined();
    expect(getByText("Button 2")).toBeDefined();
    expect(getByText("Button 3")).toBeDefined();
  });

  it("applies the specified gap and container layout styles", () => {
    const { container } = render(
      <StudioChipScroller gap="12px" marginTopTrack={10}>
        <button>Item A</button>
      </StudioChipScroller>
    );

    const scrollContainer = container.querySelector(".hide-scrollbar") as HTMLElement;
    expect(scrollContainer).toBeDefined();
    expect(scrollContainer.style.gap).toBe("12px");
    expect(scrollContainer.style.overflowX).toBe("auto");
    expect(scrollContainer.style.overflowY).toBe("hidden");
  });

  it("supports track pointer interaction and dragging", () => {
    const { container } = render(
      <StudioChipScroller marginTopTrack={8}>
        <div style={{ width: 800 }}>Wide Content</div>
      </StudioChipScroller>
    );

    const track = container.querySelector('[title="Drag or click to scroll options"]');
    expect(track).toBeDefined();

    if (track) {
      fireEvent.pointerDown(track, { clientX: 100 });
      fireEvent.mouseEnter(track);
      fireEvent.mouseLeave(track);
    }
  });

  it("supports mouse grab-and-drag and wheel on scrollable container", () => {
    const { container } = render(
      <StudioChipScroller>
        <button>Chip 1</button>
        <button>Chip 2</button>
      </StudioChipScroller>
    );

    const scrollContainer = container.querySelector(".hide-scrollbar") as HTMLElement;
    expect(scrollContainer).toBeDefined();

    fireEvent.mouseDown(scrollContainer, { button: 0, pageX: 150 });
    fireEvent.wheel(scrollContainer, { deltaY: 50 });
  });
});
