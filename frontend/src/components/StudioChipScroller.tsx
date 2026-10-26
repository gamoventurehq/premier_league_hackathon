import React, { useRef, useState, useEffect, useCallback } from "react";

interface StudioChipScrollerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  gap?: string | number;
  paddingBottom?: string | number;
  marginTopTrack?: string | number;
  alwaysShowTrack?: boolean;
  showTrack?: boolean;
  enableEdgeFade?: boolean;
  thumbColor?: string;
  trackColor?: string;
}

/**
 * StudioChipScroller:
 * Provides an ultra-smooth, horizontally scrollable chip/button container with:
 * 1. Dynamic two-way edge fade masks (left fade appears when scrolled right, right fade appears when more content can be reached, disappears at ends).
 * 2. Draggable & scrubbable scroll track & thumb (can be hidden with showTrack=false).
 * 3. Mouse grab-and-drag support across chips.
 * 4. Horizontal mouse wheel support.
 */
export const StudioChipScroller: React.FC<StudioChipScrollerProps> = ({
  children,
  className = "",
  style = {},
  gap = "6px",
  paddingBottom = "2px",
  marginTopTrack = "8px",
  alwaysShowTrack = false,
  showTrack = false,
  enableEdgeFade = true,
  thumbColor = "#94a3b8",
  trackColor = "rgba(255, 255, 255, 0.14)",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [thumbWidthPercent, setThumbWidthPercent] = useState(30);
  const [isScrollable, setIsScrollable] = useState(alwaysShowTrack);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDraggingThumb, setIsDraggingThumb] = useState(false);
  const [isHoveringTrack, setIsHoveringTrack] = useState(false);

  // Content drag state for mouse grab-and-drag in full screen desktop
  const isContentDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasMovedContentRef = useRef(false);

  const updateScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    const scrollLeft = el.scrollLeft;

    const overflows = maxScroll > 1 || scrollLeft > 0;
    const shouldShow = overflows || alwaysShowTrack;
    setIsScrollable(shouldShow);

    // Dynamic edge-fade detection with 2px tolerance
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(maxScroll - scrollLeft > 2);

    const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, scrollLeft / maxScroll)) : 0;
    setScrollProgress(ratio);

    const calculatedThumbWidth = maxScroll > 0
      ? Math.max(16, Math.min(65, (el.clientWidth / el.scrollWidth) * 100))
      : (alwaysShowTrack ? 100 : 30);
    setThumbWidthPercent(calculatedThumbWidth);
  }, [alwaysShowTrack]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateScroll();

    const rafId = requestAnimationFrame(updateScroll);
    const t1 = setTimeout(updateScroll, 100);
    const t2 = setTimeout(updateScroll, 350);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateScroll();
      });
      resizeObserver.observe(el);
      Array.from(el.children).forEach((child) => {
        resizeObserver?.observe(child);
      });
    }

    window.addEventListener("resize", updateScroll);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener("resize", updateScroll);
    };
  }, [updateScroll, children]);

  // Scroll to position corresponding to clientX on track
  const scrollToClientX = useCallback((clientX: number) => {
    const track = trackRef.current;
    const el = containerRef.current;
    if (!track || !el) return;

    const rect = track.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, clickX / rect.width));

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll > 0) {
      el.scrollLeft = ratio * maxScroll;
    }
  }, []);

  // Handle pointer down on track or thumb to drag left/right
  const handlePointerDownTrack = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingThumb(true);
    scrollToClientX(e.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      scrollToClientX(moveEvent.clientX);
    };

    const handlePointerUp = () => {
      setIsDraggingThumb(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  // Mouse wheel horizontal scrolling
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
    } else if (e.deltaX !== 0) {
      el.scrollLeft += e.deltaX;
    }
  };

  // Mouse grab-and-drag across the chips row
  const handleMouseDownContent = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with left click
    if (e.button !== 0) return;
    const el = containerRef.current;
    if (!el) return;

    isContentDraggingRef.current = true;
    hasMovedContentRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    startScrollLeftRef.current = el.scrollLeft;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isContentDraggingRef.current || !containerRef.current) return;
      const x = moveEvent.pageX - containerRef.current.offsetLeft;
      const walk = x - startXRef.current;
      if (Math.abs(walk) > 4) {
        hasMovedContentRef.current = true;
      }
      containerRef.current.scrollLeft = startScrollLeftRef.current - walk;
    };

    const handleMouseUp = () => {
      isContentDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    // Prevent accidental button clicks when user was dragging the row
    if (hasMovedContentRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasMovedContentRef.current = false;
    }
  };

  const thumbLeftPercent = scrollProgress * (100 - thumbWidthPercent);

  // Compute dynamic two-way fade mask
  const getMaskImage = () => {
    if (!enableEdgeFade) return undefined;
    if (canScrollLeft && canScrollRight) {
      return "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)";
    }
    if (canScrollLeft && !canScrollRight) {
      return "linear-gradient(to right, transparent 0%, black 7%, black 100%)";
    }
    if (!canScrollLeft && canScrollRight) {
      return "linear-gradient(to right, black 0%, black 93%, transparent 100%)";
    }
    return undefined;
  };

  const dynamicMask = getMaskImage();

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        userSelect: isDraggingThumb ? "none" : "auto",
        position: "relative",
      }}
    >
      {/* Scrollable Content Row with Dynamic Fade & Mouse Grab & Wheel Support */}
      <div
        ref={containerRef}
        onScroll={updateScroll}
        onWheel={handleWheel}
        onMouseDown={handleMouseDownContent}
        onClickCapture={handleClickCapture}
        className={`hide-scrollbar ${className}`}
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "nowrap",
          overflowX: "auto",
          overflowY: "hidden",
          WebkitOverflowScrolling: "touch",
          gap: typeof gap === "number" ? `${gap}px` : gap,
          paddingBottom: typeof paddingBottom === "number" ? `${paddingBottom}px` : paddingBottom,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          cursor: "grab",
          maskImage: dynamicMask,
          WebkitMaskImage: dynamicMask,
          transition: "mask-image 0.2s ease, -webkit-mask-image 0.2s ease",
          ...style,
        }}
      >
        {children}
      </div>

      {/* Interactive, Draggable Grey Scroll Line (Only rendered when showTrack is true) */}
      {showTrack && isScrollable && (
        <div
          ref={trackRef}
          onPointerDown={handlePointerDownTrack}
          onMouseEnter={() => setIsHoveringTrack(true)}
          onMouseLeave={() => setIsHoveringTrack(false)}
          title="Drag or click to scroll options"
          style={{
            width: "100%",
            paddingTop: "6px",
            paddingBottom: "6px",
            marginTop: typeof marginTopTrack === "number" ? `${Math.max(0, Number(marginTopTrack) - 6)}px` : marginTopTrack,
            marginBottom: "2px",
            cursor: isDraggingThumb ? "grabbing" : "grab",
            flexShrink: 0,
            touchAction: "none",
            boxSizing: "border-box",
          }}
        >
          {/* Visual Track (4.5px thick, grey with rounded ends) */}
          <div
            style={{
              width: "100%",
              height: "4.5px",
              backgroundColor: isHoveringTrack || isDraggingThumb ? "rgba(255, 255, 255, 0.2)" : trackColor,
              borderRadius: "9999px",
              position: "relative",
              overflow: "hidden",
              transition: "background-color 0.15s ease",
            }}
          >
            {/* Visual Thumb Line */}
            <div
              style={{
                position: "absolute",
                left: `${thumbLeftPercent}%`,
                width: `${thumbWidthPercent}%`,
                height: "100%",
                borderRadius: "9999px",
                backgroundColor: isDraggingThumb ? "#f1f5f9" : isHoveringTrack ? "#cbd5e1" : thumbColor,
                boxShadow: isDraggingThumb || isHoveringTrack
                  ? "0 0 6px rgba(255, 255, 255, 0.6)"
                  : "0 0 4px rgba(148, 163, 184, 0.4)",
                transition: isDraggingThumb ? "none" : "left 0.05s ease-out, background-color 0.15s ease",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
