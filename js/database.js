// ========================================================
// IRONKNUCKLE DIAGNOSTICS // GLOBAL MASTER REFRESH (js/database.js)
// ========================================================

// 1. GLOBAL FAULT REPOSITORY: Add hundreds of codes here once, and they scale everywhere automatically!
export const globalFaultLibrary = {
  "P205B_64": {
    "spn": 3515, "fmi": 4, "p_code": "P205B-64",
    "description": "Reductant (DEF) Tank Temperature Sensor Circuit - Signal Missing / Shorted Low",
    "shared_circuits": ["circuit_5v_ems", "def_tank_bus"],
    "common_causes": [
      "CRITICAL BULLETIN NOTE: Internal circuit failure inside the DEF Level/Temp sensor assembly. High-probability replacement target.",
      "SERVICE ALERT: Corroded pins at the primary DEF tank multi-pin connector plug. ALWAYS install the updated OEM harness connector pigtail kit when replacing the sensor.",
      "DEF tank wiring loom rubbed raw against the sub-frame chassis mounting brackets."
    ],
    "required_tools": ["TOOL_DMM", "TOOL_MACK_BO_BOX"]
  },
  "P0401_00": {
    "spn": 3936, "fmi": 7, "p_code": "P0401-00",
    "description": "Exhaust Particulate Matter (PM) Sensor - Conversion Tracking Performance Failure",
    "shared_circuits": ["circuit_5v_ems"],
    "common_causes": [
      "CRITICAL PATTERN ACTION: Particulate Matter (PM) sensor internal ceramic element cracked or soot-blinded. Standard action requires a PM Sensor replacement kit.",
      "Moisture condensation forming in the tailpipe section causing cold-start sensor thermal shock.",
      "Upstream engine oil consumption coating the PM sensing face plate."
    ],
    "required_tools": ["TOOL_DMM"]
  },
  "P0201_00": {
    "spn": 651, "fmi": 5, "p_code": "P0201-00",
    "description": "Cylinder 1 Electronic Injector Circuit - Open Circuit / Low Current Flow",
    "shared_circuits": ["valve_cover_loom"],
    "common_causes": [
      "CRITICAL PATTERN: Under-valve-cover electronic injector harness pins oil-soaked or losing pin tension.",
      "Pass-through harness connector block terminal pins corroded at the cylinder head vault wall.",
      "Internal solenoid coil insulation layer shorted inside the fuel injector assembly."
    ],
    "required_tools": ["TOOL_DMM", "TOOL_PIN_TENSION_KIT"]
  },
  "P226E_00": {
    "spn": 3251, "fmi": 2, "p_code": "P226E-00",
    "description": "DPF Particulate Filter Differential Pressure - Data Erratic or Out of Range",
    "shared_circuits": ["turbo_boost_loop"],
    "common_causes": [
      "CRITICAL PATTERN: High torque load duty cycles splitting metal DPF differential sensing tubes near the exhaust manifold vault.",
      "DPF delta pressure sensor sensor internal element failing under high exhaust heat load conditions."
    ],
    "required_tools": ["TOOL_DMM", "TOOL_PRESSURE_MANOMETER"]
  }
};

// 2. MASTER ENGINE PLATFORM REFERENCE INDEX
export const faultCodeDatabase = {
  "engines": {
    "mack_mp7": {
      "name": "Mack MP7 (11L Platform)",
      "emission_levels": { "us10_us14": "EPA10 / GHG14", "ghg17_plus": "GHG17 / GHG21+" },
      // Simply declare which global codes apply to this engine & what emission tier they live on!
      "code_manifest": [
        { "code_id": "P0201_00", "emission_level": "ghg17_plus" },
        { "code_id": "P205B_64", "emission_level": "ghg17_plus" },
        { "code_id": "P0401_00", "emission_level": "ghg17_plus" }
      ],
      "circuit_intersections": {
        "valve_cover_loom": { "name": "Under-Valve-Cover High-Torque Electronic Loom", "triage_tip": "MP7 Specific: Check harness clips holding lines clear of the valvetrain rocking frame." },
        "circuit_5v_ems": { "name": "EMS 5-Volt Reference Bus Loop", "triage_tip": "Inspect common trunk routing right where the harness leaves the block conduit shroud near the oil module." }
      }
    },
    "mack_mp8": {
      "name": "Mack MP8 (13L Platform)",
      "emission_levels": { "us10_us14": "EPA10 / GHG14", "ghg17_plus": "GHG17 / GHG21+" },
      "code_manifest": [
        { "code_id": "P205B_64", "emission_level": "ghg17_plus" },
        { "code_id": "P0401_00", "emission_level": "ghg17_plus" }
      ],
      "circuit_intersections": {
        "circuit_5v_ems": { "name": "EMS 5-Volt Reference Bus Loop", "triage_tip": "GHG17 Rub Point: Unplug the outlet NOx sensor first. The harness rubs raw directly against frame rail bolts." },
        "def_tank_bus": { "name": "DEF Tank Quality Node Network", "triage_tip": "Perform a standard connector cavity pin-drag test at the sensor harness plug before component condemnation." }
      }
    },
    "mack_mp10": {
      "name": "Mack MP10 (16L Heavy-Haul)",
      "emission_levels": { "us10_us14": "EPA10 / GHG14", "ghg17_plus": "GHG17+" },
      "code_manifest": [
        { "code_id": "P226E_00", "emission_level": "ghg17_plus" },
        { "code_id": "P205B_64", "emission_level": "ghg17_plus" },
        { "code_id": "P0401_00", "emission_level": "ghg17_plus" }
      ],
      "circuit_intersections": {
        "turbo_boost_loop": { "name": "MP10 High-Volume Air Management Loop", "triage_tip": "The 16L engine produces severe exhaust heat soak. Check backpressure lines for hairline cracks." }
      }
    }
  },
  
  // 3. MASTER SYMPTOM TREES (INCORPORATING MASTER-TECH SHOP INSIGHTS)
  "symptom_trees": {
    "cranks_no_start": {
      "title": "Engine Cranks But Won't Start (Zero Active Codes)",
      "triage_priority": "CRITICAL MASTER FIX // CHECK FUEL ORIFICE RESTRICTIONS FIRST",
      "steps": [
        "PATTERN CRITICAL CHECK: Remove the low-pressure fuel line fuel gallery inlet banjo bolt fitting. Inspect the inner bore orifices for debris plugs, composite fuel cap plastic fragments, or shredding hose line liner material.",
        "Check ECM system status sync speed parameters using active diagnostic tools while cranking. Must see at least 150 RPM for injector pulses to unlock.",
        "Verify low-pressure fuel delivery supply gallery pressure output. Target parameter sequence needs a minimum of 45-60 PSI during cranking speeds.",
        "Inspect clear fuel sight-glass block lines for immediate signs of massive aerated fuel foaming or total suction draw cavitation loops."
      ],
      "required_tools": ["TOOL_FUEL_PRESS_KIT", "TOOL_SIGHT_GLASS"]
    },
    "progressive_power_loss": {
      "title": "Progressive Power Loss Under High Boost Load Conditions",
      "triage_priority": "PERFORMANCE DEFICIENCY // CHARGE AIR MATRIX CHECKS",
      "steps": [
        "CRITICAL BANJO ENTRY: Inspect fuel return flow banjo check valves mounted at the rear of the cylinder head. Dirt particles wedged in the spring-loaded ball seat will dump rail fuel bypass tracking limits.",
        "Execute a comprehensive charge air cooler (CAC) high-pressure smoke pressure decay test down the induction tracts.",
        "Check boost air pressure sensor reading tracking alignment limits manually against real-time mechanical dashboard gauge outputs."
      ],
      "required_tools": ["TOOL_SMOKE_MACHINE", "TOOL_FUEL_PRESS_KIT"]
    }
  },

  "tools": {
    "TOOL_DEF_REFRACTOMETER": { "name": "Precision Optical DEF Quality Fluid Refractometer", "affiliate_url": "https://amazon.com" },
    "TOOL_DMM": { "name": "Fluke 88V Professional Automotive Digital Multimeter", "affiliate_url": "https://amazon.com" },
    "TOOL_MACK_BO_BOX": { "name": "Mack Engine Wiring Harness Breakout Interceptor Box", "affiliate_url": "https://amazon.com" },
    "TOOL_PIN_TENSION_KIT": { "name": "Terminal Multi-Pin Wire Pull & De-Pin Drag Tension Kit", "affiliate_url": "https://amazon.com" },
    "TOOL_PRESSURE_MANOMETER": { "name": "Digital Differential Gas Line Pressure Manometer Gauge", "affiliate_url": "https://amazon.com" },
    "TOOL_FUEL_PRESS_KIT": { "name": "Mechanical Diesel Engine Low Fuel Pressure Test Kit Gauge", "affiliate_url": "https://amazon.com" },
    "TOOL_SIGHT_GLASS": { "name": "Clear Inline Diesel Fuel Aeration Diagnostic Sight Glass Tube", "affiliate_url": "https://amazon.com" },
    "TOOL_SMOKE_MACHINE": { "name": "Heavy-Duty Heavy Truck Intake System Exhaust Evap Smoke Machine", "affiliate_url": "https://amazon.com" }
  }
};
