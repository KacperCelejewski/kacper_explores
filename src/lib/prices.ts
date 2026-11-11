// Jedno źródło cen do wyświetlania. Kwoty muszą zgadzać się z cenami w Stripe i z regulaminem.
export const PRICES = {
  pack: { amount: "14.99", label: "14,99 zł" },
  proMonthly: { amount: "19.99", label: "19,99 zł" },
  proYearly: { amount: "149.99", label: "149,99 zł", perMonth: "12,50 zł", savings: "90 zł" },
} as const;

// Kwota brutto w PLN dla klucza planu (do zdarzeń analitycznych)
export function planPrice(planKey: string): number | undefined {
  switch (planKey) {
    case "pack_5": return Number(PRICES.pack.amount);
    case "pro_monthly": return Number(PRICES.proMonthly.amount);
    case "pro_yearly": return Number(PRICES.proYearly.amount);
    default: return undefined;
  }
}
