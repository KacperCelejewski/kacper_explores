const PROMO_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePromoCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += PROMO_CODE_CHARS[Math.floor(Math.random() * PROMO_CODE_CHARS.length)];
  return `PACK10-${s}`;
}
