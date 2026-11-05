import Stripe from "stripe";
import { PRICES } from "./prices";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export const PLANS = {
  pack_5: {
    priceId: process.env.STRIPE_PRICE_PACK_5!,
    credits: 5,
    label: "Pack 5 planów",
    price: PRICES.pack.label,
    type: "payment" as const,
  },
  pro_monthly: {
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    credits: 0,
    label: "Pro — unlimited",
    price: `${PRICES.proMonthly.label}/mies.`,
    type: "subscription" as const,
  },
  pro_yearly: {
    priceId: process.env.STRIPE_PRICE_PRO_YEARLY!,
    credits: 0,
    label: "Pro Roczny — unlimited",
    price: `${PRICES.proYearly.label}/rok`,
    type: "subscription" as const,
  },
} as const;

export type PlanKey = keyof typeof PLANS;
