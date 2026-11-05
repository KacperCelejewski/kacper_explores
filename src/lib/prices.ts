// Jedno źródło cen do wyświetlania. Kwoty muszą zgadzać się z cenami w Stripe i z regulaminem.
export const PRICES = {
  pack: { amount: "14.99", label: "14,99 zł" },
  proMonthly: { amount: "19.99", label: "19,99 zł" },
  proYearly: { amount: "149.99", label: "149,99 zł", perMonth: "12,50 zł", savings: "90 zł" },
} as const;
