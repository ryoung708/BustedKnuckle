// ========================================================
// IRONKNUCKLE DIAGNOSTICS // VERIFIED BASELINE DATABASE
// ========================================================

export const globalFaultLibrary = {
  "P205B_64": {
    "spn": 3515, "fmi": 4, "p_code": "P205B-64",
    "description": "Reductant (DEF) Tank Temperature Sensor Circuit - Shorted Low",
    "shared_circuits": ["circuit_5v_ems"],
    "common_causes": [
      "Bulletin Alert: Internal failure inside the DEF tank sensor element group.",
      "Pattern Action: Install the updated harness connector pigtail kit along with the new sensor."
    ],
    "required_tools": ["TOOL_DMM"]
  },
  "P0401_00": {
    "spn": 3936, "fmi": 7, "p_code": "P0401-00",
    "description": "Exhaust PM Sensor - Conversion Tracking Performance Failure",
    "shared_circuits": ["circuit_5v_ems"],
    "common_causes": [
      "Pattern Action: Particulate Matter sensor ceramic element cracked or soot-blinded.",
      "Check upstream for unburned fuel glazing the active sensor element face panel."
    ],
    "required_tools": ["TOOL_DMM"]
  }
};

export const faultCodeDatabase = {
  "engines": {
    "mack_mp8": {
      "name": "Mack MP8 (13L Platform)",
      "emission_levels": { "us10_us14": "EPA10 / GHG14", "ghg17_plus": "GHG17 / GHG21+" },
      "code_manifest": [
        { "code_id": "P205B_64", "emission_level": "ghg17_plus" },
        { "code_id": "P0401_00", "emission_level": "ghg17_plus" }
      ],
      "circuit_intersections": {
        "circuit_5v_ems": { "name": "EMS 5-Volt Reference Bus Loop", "triage_tip": "GHG17 Rub Point: Unplug the outlet NOx sensor first. The harness rubs raw directly against frame rail bolts." }
      }
    },
    "mack_mp7": {
      "name": "Mack MP7 (11L Platform)",
      "emission_levels": { "us10_us14": "EPA10 / GHG14", "ghg17_plus": "GHG17 / GHG21+" },
      "code_manifest": [
        { "code_id": "P205B_64", "emission_level": "ghg17_plus" }
      ],
      "circuit_intersections": {
        "circuit_5v_ems": { "name": "EMS 5-Volt Reference Bus Loop", "triage_tip": "Check common trunk routing where harness leaves the block conduit shroud near the air pump." }
      }
    },
    "mack_mp10": {
      "name": "Mack MP10 (16L Heavy-Haul)",
      "emission_levels": { "us10_us14": "EPA10 / GHG14", "ghg17_plus": "GHG17+" },
      "code_manifest": [
        { "code_id": "P0401_00", "emission_level": "ghg17_plus" }
      ],
      "circuit_intersections": {}
    }
  },
  "symptom_trees": {
    "cranks_no_start": {
      "title": "Engine Cranks But Won't Start (Zero Active Codes)",
      "triage_priority": "CRITICAL FIXED // LOW LP GALLERY PRESSURE CODES MONITOR",
      "steps": [
        "CRITICAL BANJO CHECK: Remove the low-pressure fuel gallery inlet banjo fitting. Check inner orifices for debris plugs or shredding line hose debris.",
        "Verify ECM system speed parameters while cranking. Must register at least 150 RPM to unlock electronic injector pulses."
      ],
      "required_tools": ["TOOL_DMM"]
    }
  },
  "tools": {
    "TOOL_DMM": { "name": "Fluke 88V Professional Automotive Digital Multimeter", "affiliate_url": "https://amazon.com" }
  }
};
