// Skyscanner entity IDs for airports — used by RapidAPI Flights Scraper Sky
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
  BER: { entityId: "95673383",  skyId: "BER"  },
  BUD: { entityId: "95673439",  skyId: "BUD"  },
  VIE: { entityId: "95673444",  skyId: "VIE"  },
  AMS: { entityId: "95565044",  skyId: "AMS"  },
  LGW: { entityId: "27544008",  skyId: "LOND" },
  IST: { entityId: "27542903",  skyId: "ISTA" },

  // ── Destinations ──────────────────────────────────────────────────────────
  LIS: { entityId: "95565055",  skyId: "LIS"  },
  OPO: { entityId: "95566290",  skyId: "OPO"  },
  BCN: { entityId: "95565085",  skyId: "BCN"  },
  MAD: { entityId: "95565077",  skyId: "MAD"  },
  VLC: { entityId: "95565090",  skyId: "VLC"  },
  ALC: { entityId: "95565083",  skyId: "ALC"  },
  PMI: { entityId: "95565111",  skyId: "PMI"  },
  ATH: { entityId: "95673624",  skyId: "ATH"  },
  SKG: { entityId: "95673847",  skyId: "SKG"  },
  HER: { entityId: "95674142",  skyId: "HER"  },
  CFU: { entityId: "95674252",  skyId: "CFU"  },
  RHO: { entityId: "104120264", skyId: "RHO"  },
  FCO: { entityId: "27539793",  skyId: "ROME" },
  MXP: { entityId: "27544068",  skyId: "MILA" },
  FLR: { entityId: "95673830",  skyId: "FLR"  },
  VCE: { entityId: "27547373",  skyId: "VENI" },
  NAP: { entityId: "95673535",  skyId: "NAP"  },
  CTA: { entityId: "95673893",  skyId: "CTA"  },
  PRG: { entityId: "95673502",  skyId: "PRG"  },
  BTS: { entityId: "95673445",  skyId: "BTS"  },
  VNO: { entityId: "95673717",  skyId: "VNO"  },
  RIX: { entityId: "95673617",  skyId: "RIX"  },
  TLL: { entityId: "128667052", skyId: "TLL"  },
  SOF: { entityId: "95673503",  skyId: "SOF"  },
  BEG: { entityId: "95673488",  skyId: "BEG"  },
  DBV: { entityId: "95674145",  skyId: "DBV"  },
  SPU: { entityId: "95674071",  skyId: "SPU"  },
  ZAD: { entityId: "95674072",  skyId: "ZAD"  },
  TFS: { entityId: "27547165",  skyId: "TENE" },
};
