export type WeekKey = string; // format YYYY-Www

export interface WeekendVariant {
  label: "czw-nd" | "pt-nd" | "pt-pn";
  depart: string; // YYYY-MM-DD
  return: string; // YYYY-MM-DD
}

export interface TpOffer {
  origin: string;
  destination: string;
  price: number;
  airline: string;
  departure_at: string;
  return_at: string;
  transfers: number;
  return_transfers: number;
  link: string;
}

export interface CityInfo {
  code: string;
  name: string;
  country_code: string;
}

export interface DropDeal {
  week: WeekKey;
  origin: string;
  city_code: string;
  city_name: string;
  price: number;
  departure_at: string;
  return_at: string;
  airline: string;
  transfers: number;
  link: string;
  fetched_at: string;
}

export interface CityTeaser {
  week: WeekKey;
  city_code: string;
  teaser: string;
  local_budget: string;
}

export interface DropSubscriber {
  id: string;
  email: string;
  airports: string[];
  max_price: number;
  unsubscribe_token: string;
}
