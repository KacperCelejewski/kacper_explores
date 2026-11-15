// Stan funkcji wyjazdów grupowych. Włączenie klucza to jedna linia w PR danej części.
export type FeatureKey = "invites" | "datePoll" | "groupFlights" | "groupPlan" | "settlements" | "tripMap";

export const FEATURES: Record<FeatureKey, boolean> = {
  invites: false,
  datePoll: false,
  groupFlights: false,
  groupPlan: false,
  settlements: false,
  tripMap: false,
};

export function isOn(key: FeatureKey): boolean {
  return FEATURES[key];
}
