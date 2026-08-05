export interface TaxBracket {
  /** Upper bound of cumulative annual tax base for this bracket, in TL. null = no upper bound. */
  upTo: number | null;
  /** Marginal rate, e.g. 0.15 for 15%. */
  rate: number;
}

export interface PayrollParams {
  /** Constant gross monthly salary applied to every month of the year, in TL. */
  grossMonthly: number;
  /** Gross monthly minimum wage, used for the minimum-wage income tax & stamp duty exemption. */
  minWageGross: number;
  /** Monthly SGK premium ceiling (tavan ücret) — premiums are capped at this base. */
  sgkCeiling: number;
  /** Employee-paid SGK (social security) rate, e.g. 0.14 for 14%. */
  sgkRate: number;
  /** Employee-paid unemployment insurance rate, e.g. 0.01 for 1%. */
  unemploymentRate: number;
  /** Stamp duty rate applied to gross salary, e.g. 0.00759 for 0.759%. */
  stampDutyRate: number;
  /** Cumulative annual income tax brackets, in ascending order. */
  brackets: TaxBracket[];
}

export interface MonthlyPayrollResult {
  month: number; // 1-12
  gross: number;
  sgkDeduction: number;
  incomeTax: number;
  stampDuty: number;
  net: number;
  totalDeductions: number;
}

export const DEFAULT_PAYROLL_PARAMS: PayrollParams = {
  grossMonthly: 0,
  minWageGross: 33030,
  sgkCeiling: 297270,
  sgkRate: 0.14,
  unemploymentRate: 0.01,
  stampDutyRate: 0.00759,
  brackets: [
    { upTo: 190000, rate: 0.15 },
    { upTo: 400000, rate: 0.2 },
    { upTo: 1500000, rate: 0.27 },
    { upTo: 5300000, rate: 0.35 },
    { upTo: null, rate: 0.4 },
  ],
};

/** Cumulative progressive income tax owed on a cumulative annual tax base. */
function cumulativeTax(base: number, brackets: TaxBracket[]): number {
  if (base <= 0) return 0;
  let tax = 0;
  let prevThreshold = 0;
  for (const bracket of brackets) {
    const upTo = bracket.upTo ?? Infinity;
    if (base <= prevThreshold) break;
    const taxableInBracket = Math.min(base, upTo) - prevThreshold;
    if (taxableInBracket > 0) tax += taxableInBracket * bracket.rate;
    prevThreshold = upTo;
    if (base <= upTo) break;
  }
  return tax;
}

/**
 * Turkish gross-to-net payroll for all 12 months of a year, assuming a constant
 * gross monthly salary. Income tax uses the cumulative annual tax-base method
 * (net pay drifts down through the year as cumulative earnings cross brackets),
 * with the minimum-wage income tax & stamp duty exemption applied each month.
 */
export function calcYearlyPayroll(params: PayrollParams): MonthlyPayrollResult[] {
  const { grossMonthly, minWageGross, sgkCeiling, sgkRate, unemploymentRate, stampDutyRate, brackets } = params;

  const employeeRate = sgkRate + unemploymentRate;
  const sgkBase = Math.min(grossMonthly, sgkCeiling);
  const sgkDeduction = sgkBase * employeeRate;
  const monthlyMatrah = grossMonthly - sgkDeduction;
  const minWageMatrah = minWageGross * (1 - employeeRate);
  const stampDutyExemption = minWageGross * stampDutyRate;

  const results: MonthlyPayrollResult[] = [];
  let cumulativeMatrah = 0;
  let cumulativeMinWageMatrah = 0;

  for (let month = 1; month <= 12; month++) {
    const prevCumulativeMatrah = cumulativeMatrah;
    const prevCumulativeMinWageMatrah = cumulativeMinWageMatrah;
    cumulativeMatrah += monthlyMatrah;
    cumulativeMinWageMatrah += minWageMatrah;

    const grossTaxThisMonth = cumulativeTax(cumulativeMatrah, brackets) - cumulativeTax(prevCumulativeMatrah, brackets);
    const exemptionThisMonth =
      cumulativeTax(cumulativeMinWageMatrah, brackets) - cumulativeTax(prevCumulativeMinWageMatrah, brackets);
    const incomeTax = Math.max(0, grossTaxThisMonth - exemptionThisMonth);

    const stampDutyGross = grossMonthly * stampDutyRate;
    const stampDuty = Math.max(0, stampDutyGross - stampDutyExemption);

    const totalDeductions = sgkDeduction + incomeTax + stampDuty;
    const net = grossMonthly - totalDeductions;

    results.push({
      month,
      gross: grossMonthly,
      sgkDeduction,
      incomeTax,
      stampDuty,
      net,
      totalDeductions,
    });
  }

  return results;
}
