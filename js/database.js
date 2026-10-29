// js/database.js
export const faultCodeDatabase = {
  "engines": {
    "mack_mp8": {
      "name": "Mack MP8 (13L Platform)",
      "emission_levels": {
        "us10_us14": "EPA10 / GHG14 (Legacy Catalysts)",
        "ghg17_plus": "GHG17 / GHG21+ (Common Rail / Wave Catalyst)"
      },
      // js/database.js - Updated fault_codes section for mack_mp8
      "fault_codes": {
        "SPN_4364_FMI_18": {
          "spn": 4364, "fmi": 18, "p_code": "N/A",
          "emission_level": "us10_us14",
          "description": "SCR Catalyst NOx Conversion Efficiency Low - Legacy Unit",
          "shared_circuits": ["scr_efficiency_loop"],
          "common_causes": [
            "DEF dosing valve face-plugged or crystalized",
            "Biased upstream Exhaust NOx sensor reading out of calibration range",
            "Exhaust flex pipe leakage upstream of the SCR catalyst inlet box"
          ],
          "required_tools": ["TOOL_DEF_REFRACTOMETER", "TOOL_DMM"]
        },
        "P205B_64": {
          "spn": 3515, "fmi": 4, "p_code": "P205B-64",
          "emission_level": "ghg17_plus",
          "description": "Reductant (DEF) Tank Temperature Sensor Circuit - Signal Missing / Shorted Low",
          "shared_circuits": ["circuit_5v_ems", "def_tank_bus"],
          "common_causes": [
            "CRITICAL BULLETIN NOTE: Internal circuit failure inside the DEF Level/Temp sensor assembly. High-probability replacement target.",
            "SERVICE ALERT: Corroded pins at the primary DEF tank multi-pin connector plug. ALWAYS install the updated OEM harness connector pigtail kit when replacing the sensor.",
            "DEF tank wiring loom rubbed raw against the sub-frame chassis mounting brackets"
          ],
          "required_tools": ["TOOL_DMM", "TOOL_MACK_BO_BOX"]
        },
        "P0401_00": {
          "spn": 3936, "fmi": 7, "p_code": "P0401-00",
          "emission_level": "ghg17_plus",
          "description": "Exhaust Particulate Matter (PM) Sensor - Conversion Tracking Performance Failure",
          "shared_circuits": ["circuit_5v_ems"],
          "common_causes": [
            "CRITICAL PATTERN ACTION: Particulate Matter (PM) sensor internal ceramic element cracked or soot-blinded. Standard action requires a PM Sensor replacement kit.",
            "Moisture condensation forming in the tailpipe section causing cold-start sensor thermal shock",
            "Upstream engine oil consumption coating the PM sensing face plate"
          ],
          "required_tools": ["TOOL_DMM"]
        }
      },
      "circuit_intersections": {
        "circuit_5v_ems": {
          "name": "EMS 5-Volt Reference Bus Loop",
          "triage_tip": "GHG17 Rub Point: Track the sensor harness routing down the left frame rail next to the DEF lines. Salt/road spray locks inside the conduit here."
        },
        "def_tank_bus": {
          "name": "DEF Tank Quality / Temperature Node Network",
          "triage_tip": "Before condemning the tank sensor module, run a quick pin-drag test on the power and ground feeds at the connector shell face."
        },
        "scr_efficiency_loop": {
          "name": "SCR Catalytic Exchange Circuit",
          "triage_tip": "On US10/US14 setups, verify the mechanical DEF injection dosing weight parameter manually before checking sensors."
        }
      }
    },
    "mack_mp7": {
      "name": "Mack MP7 (11L Platform)",
      "emission_levels": { "us10_us14": "EPA10 / GHG14", "ghg17_plus": "GHG17 / GHG21+" },
      "fault_codes": {}, "circuit_intersections": {}
    },
    "mack_mp10": {
      "name": "Mack MP10 (16L Platform)",
      "emission_levels": { "us10_us14": "EPA10 / GHG14", "ghg17_plus": "GHG17+" },
      "fault_codes": {}, "circuit_intersections": {}
    }
  },
  "tools": {
    "TOOL_DEF_REFRACTOMETER": { "name": "Precision Optical DEF Quality Fluid Refractometer", "affiliate_url": "https://amazon.com" },
    "TOOL_DMM": { "name": "Fluke 88V Professional Automotive Digital Multimeter", "affiliate_url": "https://amazon.com" },
    "TOOL_MACK_BO_BOX": { "name": "Mack Engine Wiring Harness Breakout Interceptor Box", "affiliate_url": "https://amazon.com" }
  }
};
