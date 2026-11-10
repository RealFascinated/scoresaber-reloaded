import { describe, expect, test } from "bun:test";
import {
  applyDelta,
  changeAnchor,
  clampScale,
  getAutoAnchor,
  getBounds,
  getOffsetForBounds,
  getScaleFromPointer,
  snapBounds,
} from "./layout-math";

const size = { w: 200, h: 100 };
const anchors = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
] as const;

describe("getBounds", () => {
  test("offsets are measured inward from the anchor", () => {
    expect(getBounds({ anchor: "top-left", offset: { x: 24, y: 24 } }, size)).toEqual({
      left: 24,
      top: 24,
      width: 200,
      height: 100,
    });
    expect(getBounds({ anchor: "bottom-right", offset: { x: 24, y: 24 } }, size)).toEqual({
      left: 1920 - 24 - 200,
      top: 1080 - 24 - 100,
      width: 200,
      height: 100,
    });
  });

  test("centred axes are signed from the centre line", () => {
    const bounds = getBounds({ anchor: "center", offset: { x: 10, y: -20 } }, size);
    expect(bounds.left + bounds.width / 2).toBe(960 + 10);
    expect(bounds.top + bounds.height / 2).toBe(540 - 20);
  });
});

describe("changeAnchor", () => {
  test("keeps the element where it is for every pair of anchors", () => {
    for (const from of anchors) {
      for (const to of anchors) {
        const placement = { anchor: from, offset: { x: 37, y: 61 } };
        const moved = changeAnchor(placement, size, to);
        expect(moved.anchor).toBe(to);
        const before = getBounds(placement, size);
        const after = getBounds(moved, size);
        expect(after.left).toBeCloseTo(before.left);
        expect(after.top).toBeCloseTo(before.top);
      }
    }
  });
});

describe("getOffsetForBounds", () => {
  test("is the inverse of getBounds", () => {
    for (const anchor of anchors) {
      const bounds = getBounds({ anchor, offset: { x: 12, y: 34 } }, size);
      expect(getOffsetForBounds(anchor, bounds)).toEqual({ x: 12, y: 34 });
    }
  });
});

describe("applyDelta", () => {
  test("moves right and bottom anchored elements the other way", () => {
    expect(applyDelta({ anchor: "top-left", offset: { x: 10, y: 10 } }, { x: 5, y: 5 })).toEqual({
      x: 15,
      y: 15,
    });
    expect(applyDelta({ anchor: "bottom-right", offset: { x: 10, y: 10 } }, { x: 5, y: 5 })).toEqual({
      x: 5,
      y: 5,
    });
    expect(applyDelta({ anchor: "center", offset: { x: 10, y: 10 } }, { x: 5, y: -5 })).toEqual({
      x: 15,
      y: 5,
    });
  });

  test("agrees with the bounds the element ends up in", () => {
    for (const anchor of anchors) {
      const placement = { anchor, offset: { x: 100, y: 100 } };
      const before = getBounds(placement, size);
      const after = getBounds({ anchor, offset: applyDelta(placement, { x: 30, y: -10 }) }, size);
      expect(after.left - before.left).toBeCloseTo(30);
      expect(after.top - before.top).toBeCloseTo(-10);
    }
  });
});

describe("getAutoAnchor", () => {
  test("picks the third of the canvas the centre is in", () => {
    expect(getAutoAnchor({ left: 0, top: 0, width: 100, height: 100 })).toBe("top-left");
    expect(getAutoAnchor({ left: 1800, top: 1000, width: 100, height: 70 })).toBe("bottom-right");
    expect(getAutoAnchor({ left: 900, top: 500, width: 100, height: 100 })).toBe("center");
    expect(getAutoAnchor({ left: 900, top: 0, width: 100, height: 100 })).toBe("top");
    expect(getAutoAnchor({ left: 0, top: 500, width: 100, height: 100 })).toBe("left");
  });
});

describe("scale", () => {
  test("clamps to the allowed range", () => {
    expect(clampScale(0)).toBe(0.1);
    expect(clampScale(99)).toBe(5);
    expect(clampScale(1.5)).toBe(1.5);
  });

  test("follows the ratio of the distances to the anchor point", () => {
    const anchor = { x: 0, y: 0 };
    expect(getScaleFromPointer(1, anchor, { x: 100, y: 0 }, { x: 200, y: 0 })).toBe(2);
    expect(getScaleFromPointer(2, anchor, { x: 100, y: 0 }, { x: 50, y: 0 })).toBe(1);
    expect(getScaleFromPointer(1, anchor, { x: 100, y: 0 }, { x: 130, y: 0 }, 0.25)).toBe(1.25);
    expect(getScaleFromPointer(1, anchor, { x: 100, y: 0 }, { x: 10000, y: 0 })).toBe(5);
  });
});

describe("snapBounds", () => {
  test("snaps to the canvas edge margins and centre", () => {
    const edge = snapBounds({ left: 20, top: 500, width: 100, height: 50 }, []);
    expect(edge.bounds.left).toBe(24);
    expect(edge.guides).toContainEqual({ axis: "x", position: 24 });

    const centre = snapBounds({ left: 905, top: 100, width: 100, height: 50 }, []);
    expect(centre.bounds.left + 50).toBe(960);
  });

  test("snaps to other elements and leaves far away bounds alone", () => {
    const other = { left: 300, top: 300, width: 100, height: 100 };
    const snapped = snapBounds({ left: 396, top: 700, width: 50, height: 50 }, [other]);
    expect(snapped.bounds.left).toBe(400);
    expect(snapped.bounds.top).toBe(700);
  });
});
