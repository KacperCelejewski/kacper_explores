// Skyscanner entity IDs for airports — used by Sky Scrapper RapidAPI
// entityId: Skyscanner's internal numeric ID
// skyId: Skyscanner's place code (may differ from IATA for cities with multiple airports)

export interface SkyEntry {
  entityId: string;
  skyId: string;
}

export const SKY_IDS: Record<string, SkyEntry> = {
  // ── Polish departure airports ──────────────────────────────────────────────
  WRO: { entityId: "95674155",  skyId: "WRO"  },
  KTW: { entityId: "95673614",  skyId: "KTW"  },
  KRK: { entityId: "95673613",  skyId: "KRK"  },
  WAW: { entityId: "27547454",  skyId: "WARS" },
  WMI: { entityId: "27547454",  skyId: "WARS" },
  POZ: { entityId: "128667756", skyId: "POZ"  },
  GDN: { entityId: "95673773",  skyId: "GDN"  },

  // ── European hubs ──────────────────────────────────────────────────────────
  AMS: { entityId: "95565044",  skyId: "AMS"  },
  BER: { entityId: "95673383",  skyId: "BER"  },
  BUD: { entityId: "95673439",  skyId: "BUD"  },
  CDG: { entityId: "27539733",  skyId: "PARI" },
  CPH: { entityId: "95565053",  skyId: "CPH"  },
  DUB: { entityId: "95565049",  skyId: "DUB"  },
  EDI: { entityId: "95565058",  skyId: "EDI"  },
  IST: { entityId: "27542903",  skyId: "ISTA" },
  LGW: { entityId: "27544008",  skyId: "LOND" },
  VIE: { entityId: "95673444",  skyId: "VIE"  },

  // ── Spain & Portugal ───────────────────────────────────────────────────────
  AGP: { entityId: "95565082",  skyId: "AGP"  },
  ALC: { entityId: "95565083",  skyId: "ALC"  },
  BCN: { entityId: "95565085",  skyId: "BCN"  },
  FAO: { entityId: "95566291",  skyId: "FAO"  },
  FUE: { entityId: "95673839",  skyId: "FUE"  },
  FNC: { entityId: "95565116",  skyId: "FNC"  },
  IBZ: { entityId: "95565087",  skyId: "IBZ"  },
  LIS: { entityId: "95565055",  skyId: "LIS"  },
  MAD: { entityId: "95565077",  skyId: "MAD"  },
  OPO: { entityId: "95566290",  skyId: "OPO"  },
  PMI: { entityId: "95565111",  skyId: "PMI"  },
  SVQ: { entityId: "95565088",  skyId: "SVQ"  },
  TFS: { entityId: "27547165",  skyId: "TENE" },
  VLC: { entityId: "95565090",  skyId: "VLC"  },

  // ── Greece ─────────────────────────────────────────────────────────────────
  ATH: { entityId: "95673624",  skyId: "ATH"  },
  CFU: { entityId: "95674252",  skyId: "CFU"  },
  HER: { entityId: "95674142",  skyId: "HER"  },
  RHO: { entityId: "104120264", skyId: "RHO"  },
  SKG: { entityId: "95673847",  skyId: "SKG"  },

  // ── Italy ──────────────────────────────────────────────────────────────────
  CTA: { entityId: "95673893",  skyId: "CTA"  },
  FCO: { entityId: "27539793",  skyId: "ROME" },
  FLR: { entityId: "95673830",  skyId: "FLR"  },
  MXP: { entityId: "27544068",  skyId: "MILA" },
  NAP: { entityId: "95673535",  skyId: "NAP"  },
  NCE: { entityId: "95673827",  skyId: "NCE"  },
  VCE: { entityId: "27547373",  skyId: "VENI" },

  // ── Eastern Europe & Balkans ───────────────────────────────────────────────
  BEG: { entityId: "95673488",  skyId: "BEG"  },
  BTS: { entityId: "95673445",  skyId: "BTS"  },
  DBV: { entityId: "95674145",  skyId: "DBV"  },
  PRG: { entityId: "95673502",  skyId: "PRG"  },
  RIX: { entityId: "95673617",  skyId: "RIX"  },
  SOF: { entityId: "95673503",  skyId: "SOF"  },
  SPU: { entityId: "95674071",  skyId: "SPU"  },
  TBS: { entityId: "128668220", skyId: "TBS"  },
  TLL: { entityId: "128667052", skyId: "TLL"  },
  VNO: { entityId: "95673717",  skyId: "VNO"  },
  ZAD: { entityId: "95674072",  skyId: "ZAD"  },

  // ── Middle East & Africa ───────────────────────────────────────────────────
  AYT: { entityId: "95673840",  skyId: "AYT"  },
  CAI: { entityId: "128668236", skyId: "CAI"  },
  DXB: { entityId: "128668239", skyId: "DXB"  },
  RAK: { entityId: "128669652", skyId: "RAK"  },
  TLV: { entityId: "128669793", skyId: "TLV"  },

  // ── Nordic & Atlantic ──────────────────────────────────────────────────────
  KEF: { entityId: "95565059",  skyId: "KEF"  },

  // ── Asia & Far East ────────────────────────────────────────────────────────
  BKK: { entityId: "128669667", skyId: "BKKK" },
  DPS: { entityId: "128668166", skyId: "DPS"  },
  NRT: { entityId: "128668020", skyId: "TYOA" },
  SIN: { entityId: "128668175", skyId: "SIN"  },

  // ── Americas ───────────────────────────────────────────────────────────────
  JFK: { entityId: "27537542",  skyId: "NYCA" },
};
