import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export const PLANS = {
  pack_5: {
    priceId: process.env.STRIPE_PRICE_PACK_5!,
    credits: 5,
    label: "Pack 5 planów",
    price: "5 PLN",
    type: "payment" as const,
  },
  pro_monthly: {
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    credits: 0, // unlimited via subscription
    label: "Pro — unlimited",
    price: "19 PLN/mies",
    type: "subscription" as const,
  },
} as const;

export type PlanKey = keyof typeof PLANS;
