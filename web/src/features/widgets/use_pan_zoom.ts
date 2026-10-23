import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import type { Point } from "./constellation_layout";

/**
 * Pan, zoom and moving people about, for the one SVG inside the element the
 * returned ref is put on. Dragging the background pans, dragging an element
 * marked `data-person` moves that person, and the wheel, a pinch and `zoomBy`
 * zoom. Nothing is kept: `fit` puts everyone back, and so does closing.
 */

export interface View {
  x: number;
  y: number;
  k: number;
}

const FIT: View = { x: 0, y: 0, k: 1 };
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
export const ZOOM_STEP = 1.25;
// Zoom per pixel of wheel: a mouse notch of 100 is about a step.
const WHEEL_STEP = 1.002;

function zoomedAbout(view: View, factor: number, about: Point): View {
  const k = Math.min(Math.max(view.k * factor, MIN_ZOOM), MAX_ZOOM);
  const ratio = k / view.k;

  return { k, x: about.x - (about.x - view.x) * ratio, y: about.y - (about.y - view.y) * ratio };
}

/** A point on screen in the picture's own units, before pan and zoom. */
function inPicture(host: HTMLElement | null, client: { clientX: number; clientY: number }): Point {
  const matrix = host?.querySelector("svg")?.getScreenCTM();

  if (!matrix) {
    return { x: 0, y: 0 };
  }

  const point = new DOMPoint(client.clientX, client.clientY).matrixTransform(matrix.inverse());

  return { x: point.x, y: point.y };
}

const HALF = 0.5;

interface Gesture {
  pointers: Map<number, Point>;
  /** The person being moved; null while panning or pinching. */
  person: number | null;
}

type Step =
  | { kind: "zoom"; factor: number; about: Point }
  | { kind: "pan"; dx: number; dy: number }
  | { kind: "move"; person: number; dx: number; dy: number };

/** What one pointer moving to `now` does: a pinch with a second one down, else a drag. */
function stepOf(gesture: Gesture, pointer: number, now: Point): Step | null {
  const before = gesture.pointers.get(pointer);
  const other = [...gesture.pointers].find(([id]) => id !== pointer)?.[1];

  if (!before) {
    return null;
  }

  gesture.pointers.set(pointer, now);

  if (other) {
    const was = Math.hypot(before.x - other.x, before.y - other.y);
    const is = Math.hypot(now.x - other.x, now.y - other.y);
    const about = { x: (now.x + other.x) * HALF, y: (now.y + other.y) * HALF };

    return { kind: "zoom", factor: is / Math.max(was, 1), about };
  }

  const dx = now.x - before.x;
  const dy = now.y - before.y;

  return gesture.person === null
    ? { kind: "pan", dx, dy }
    : { kind: "move", person: gesture.person, dx, dy };
}

function personUnder(target: EventTarget): number | null {
  const found = target instanceof Element ? target.closest("[data-person]") : null;
  const value = found?.getAttribute("data-person");

  return value === null || value === undefined ? null : Number(value);
}

/** `host` is the element the gestures are read on; the picture is the SVG inside it. */
export function usePanZoom(host: RefObject<HTMLDivElement | null>, places: Point[]) {
  const gesture = useRef<Gesture>({ pointers: new Map(), person: null });
  const [view, setView] = useState<View>(FIT);
  const [moved, setMoved] = useState<Record<number, Point>>({});

  useEffect(() => {
    const element = host.current;
    // Not a React handler: those are passive, and the page must not scroll under a zoom.
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setView((now) => zoomedAbout(now, WHEEL_STEP ** -event.deltaY, inPicture(element, event)));
    };

    element?.addEventListener("wheel", onWheel, { passive: false });

    return () => element?.removeEventListener("wheel", onWheel);
  }, [host]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const { pointers } = gesture.current;

    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, inPicture(event.currentTarget, event));
    gesture.current.person = pointers.size === 1 ? personUnder(event.target) : null;
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const step = stepOf(gesture.current, event.pointerId, inPicture(event.currentTarget, event));

      if (step?.kind === "zoom") {
        setView((now) => zoomedAbout(now, step.factor, step.about));
      } else if (step?.kind === "pan") {
        setView((now) => ({ ...now, x: now.x + step.dx, y: now.y + step.dy }));
      } else if (step) {
        // The person lives inside the zoom, so a screen's worth of drag is less of theirs.
        setMoved((now) => {
          const from = now[step.person] ?? places[step.person];

          return {
            ...now,
            [step.person]: { x: from.x + step.dx / view.k, y: from.y + step.dy / view.k },
          };
        });
      }
    },
    [places, view.k],
  );

  const onPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    gesture.current.pointers.delete(event.pointerId);
    gesture.current.person = null;
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setView((current) => zoomedAbout(current, factor, { x: 0, y: 0 }));
  }, []);

  const fit = useCallback(() => {
    setView(FIT);
    setMoved({});
  }, []);

  return {
    at: places.map((place, person) => moved[person] ?? place),
    transform: `translate(${view.x} ${view.y}) scale(${view.k})`,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
    zoomBy,
    fit,
  };
}
