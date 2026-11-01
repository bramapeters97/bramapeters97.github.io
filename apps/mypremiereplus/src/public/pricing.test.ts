import { describe, it, expect } from "vitest";
import { quotePrice } from "../../shared/pricing";
describe("illustrative footage pricing", () => {
  it("includes the first ten hours and bills each started five-hour block", () => {
    expect(quotePrice(10).total).toBe(14.99);
    expect(quotePrice(10.01).total).toBe(17.49);
    expect(quotePrice(15).total).toBe(17.49);
    expect(quotePrice(15.01).total).toBe(19.99);
  });
  it("uses the corresponding annual total with no invented discount", () => {
    expect(quotePrice(10, "annual").total).toBe(179.88);
    expect(quotePrice(15, "annual").total).toBe(209.88);
    expect(quotePrice(20, "annual").total).toBe(239.88);
  });
  it("keeps empty or invalid footage values within the base plan", () => {
    for (const hours of [0, -5, NaN, Infinity])
      expect(quotePrice(hours).total).toBe(14.99);
  });
});
