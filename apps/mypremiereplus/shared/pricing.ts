/** Illustrative demo pricing. No payment processor or actual subscription is created. */
export const PRICING = {
  includedHours: 10,
  blockHours: 5,
  monthly: 14.99,
  annual: 179.88,
  extraBlockMonthly: 2.5,
  extraBlockAnnual: 30,
  currency: "EUR",
} as const;
export function quotePrice(
  hours: number,
  period: "monthly" | "annual" = "monthly",
) {
  const footage = Number.isFinite(hours)
    ? Math.max(0, hours)
    : PRICING.includedHours;
  const extraBlocks = Math.ceil(
    Math.max(0, footage - PRICING.includedHours) / PRICING.blockHours,
  );
  const monthlyTotal =
    Math.round(
      (PRICING.monthly + extraBlocks * PRICING.extraBlockMonthly) * 100,
    ) / 100;
  const annualTotal =
    Math.round(
      (PRICING.annual + extraBlocks * PRICING.extraBlockAnnual) * 100,
    ) / 100;
  return {
    hours: footage,
    includedHours: PRICING.includedHours,
    extraBlocks,
    extraHours: extraBlocks * PRICING.blockHours,
    total: period === "annual" ? annualTotal : monthlyTotal,
    base: period === "annual" ? PRICING.annual : PRICING.monthly,
    period,
    monthlyTotal,
    annualTotal,
  };
}
