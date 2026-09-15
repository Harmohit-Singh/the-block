import { describe, expect, it } from "vitest";
import {
  formatConditionGrade,
  formatCurrency,
  formatOdometer,
  formatTimeRemaining,
} from "./format";

describe("formatCurrency", () => {
  it("renders whole dollars with no cents", () => {
    expect(formatCurrency(22_800)).toBe("$22,800");
  });
});

describe("formatOdometer", () => {
  it("groups thousands and labels the unit", () => {
    expect(formatOdometer(47_731)).toBe("47,731 km");
  });
});

describe("formatConditionGrade", () => {
  it("always shows one decimal place, out of five", () => {
    expect(formatConditionGrade(4)).toBe("4.0 / 5");
    expect(formatConditionGrade(3.85)).toBe("3.9 / 5");
  });
});

describe("formatTimeRemaining", () => {
  const now = new Date(2026, 8, 14, 12, 0, 0);

  it("drops to finer units as the close approaches", () => {
    expect(formatTimeRemaining(new Date(2026, 8, 16, 16, 0, 0), now)).toBe("2d 4h");
    expect(formatTimeRemaining(new Date(2026, 8, 14, 15, 30, 0), now)).toBe("3h 30m");
    expect(formatTimeRemaining(new Date(2026, 8, 14, 12, 8, 30), now)).toBe("8m 30s");
  });

  it("reports a closed lot instead of counting backwards", () => {
    expect(formatTimeRemaining(new Date(2026, 8, 14, 11, 0, 0), now)).toBe("Closed");
    expect(formatTimeRemaining(now, now)).toBe("Closed");
  });
});
