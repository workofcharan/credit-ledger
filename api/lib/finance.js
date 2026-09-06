/**
 * Financial structuring helpers
 */

function buildAmortizationSchedule({ principal, annualRatePct, tenureMonths, moratoriumMonths = 0 }) {
  const monthlyRate = annualRatePct / 12 / 100;
  const repayMonths = Math.max(tenureMonths - moratoriumMonths, 1);

  let emi = 0;
  if (monthlyRate > 0) {
    emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, repayMonths)) /
          (Math.pow(1 + monthlyRate, repayMonths) - 1);
  } else {
    emi = principal / repayMonths;
  }

  const schedule = [];
  let balance = principal;
  let totalInterest = 0;

  for (let m = 1; m <= tenureMonths; m++) {
    if (m <= moratoriumMonths) {
      const interest = balance * monthlyRate;
      totalInterest += interest;
      schedule.push({
        month: m,
        payment: Math.round(interest),
        principalPaid: 0,
        interestPaid: Math.round(interest),
        balance: Math.round(balance),
        phase: 'moratorium',
      });
    } else {
      const interest = balance * monthlyRate;
      let principalPaid = emi - interest;
      if (m === tenureMonths || balance - principalPaid < 0) {
        principalPaid = balance;
      }
      balance = Math.max(balance - principalPaid, 0);
      totalInterest += interest;
      schedule.push({
        month: m,
        payment: Math.round(principalPaid + interest),
        principalPaid: Math.round(principalPaid),
        interestPaid: Math.round(interest),
        balance: Math.round(balance),
        phase: 'repayment',
      });
    }
  }

  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(principal + totalInterest),
    schedule,
  };
}

function breakEven({ monthlyRevenue, monthlyExpenses, marginPct }) {
  const margin = marginPct / 100;
  const fixedCostShare = monthlyExpenses * 0.4;
  const variableCostShare = monthlyExpenses - fixedCostShare;
  const contributionMargin = Math.max(margin, 0.05);
  const breakEvenRevenue = fixedCostShare / contributionMargin;
  const currentProfit = monthlyRevenue - monthlyExpenses;
  return {
    breakEvenRevenue: Math.round(breakEvenRevenue),
    fixedCostShare: Math.round(fixedCostShare),
    variableCostShare: Math.round(variableCostShare),
    currentProfit: Math.round(currentProfit),
    bufferAboveBreakEven: Math.round(monthlyRevenue - breakEvenRevenue),
  };
}

module.exports = { buildAmortizationSchedule, breakEven };
