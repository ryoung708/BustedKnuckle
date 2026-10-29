// ========================================================
// IRONKNUCKLE DIAGNOSTICS // MASTER PLATFORM DATABASE V2
// ========================================================
export const faultCodeDatabase = {
  "engines": {
    "mack_mp7": {
      "name": "Mack MP7 (11L Platform)",
      "emission_levels": {
        "us10_us14": "EPA10 / GHG14 (Legacy Catalysts)",
        "ghg17_plus": "GHG17 / GHG21+ (Common Rail Platform)"
      },
      "fault_codes": {
        "P0201_00": {
          "spn": 651, "fmi": 5, "p_code": "P0201-00",
          "emission_level": "ghg17_plus",
          "description": "Cylinder 1 Electronic Injector Circuit - Open Circuit / Low Current Flow",
          "shared_circuits": ["mp7_valve_cover_loom"],
          "common_causes": [
            "CRITICAL PATTERN: Under-valve-cover electronic injector harness pins oil-soaked or losing pin tension.",
            "Pass-through harness connector block terminal pins corroded at the cylinder head vault wall.",
            "Internal solenoid coil insulation layer shorted inside the fuel injector assembly."
          ],
          "required_tools": ["TOOL_DMM", "TOOL_PIN_TENSION_KIT"]
        }
      },
      "circuit_intersections": {
        "mp7_valve_cover_loom": {
          "name": "MP7 Under-Valve-Cover High-Torque Electronic Loom",
          "triage_tip": "MP7 Pattern: Constant oil temperature cycles degrade plastic clips on this internal loom. Inspect for wire rubbing directly against the engine rocker bridge."
        }
      }
    },
    "mack_mp8": {
      "name": "Mack MP8 (13L Platform)",
      "emission_levels": {
        "us10_us14": "EPA10 / GHG14 (Legacy Catalysts)",
        "ghg17_plus": "GHG17 / GHG21+ (Common Rail / Wave Catalyst)"
      },
      "fault_codes": {
        "SPN_4364_FMI_18": {
          "spn": 4364, "fmi": 18, "p_code": "N/A",
          "emission_level": "us10_us14",
          "description": "SCR Catalyst NOx Conversion Efficiency Low - Legacy Unit",
          "shared_circuits": ["scr_efficiency_loop"],
          "common_causes": [
            "DEF dosing valve face-plugged or crystalized.",
            "Biased upstream Exhaust NOx sensor reading out of calibration range.",
            "Exhaust flex pipe leakage upstream of the SCR catalyst inlet box."
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
            "DEF tank wiring loom rubbed raw against the sub-frame chassis mounting brackets."
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
            "Moisture condensation forming in the tailpipe section causing cold-start sensor thermal shock.",
            "Upstream engine oil consumption coating the PM sensing face plate."
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
    "mack_mp10": {
      "name": "Mack MP10 (16L Heavy-Haul Platform)",
      "emission_levels": {
        "us10_us14": "EPA10 / GHG14 (Legacy Layout)",
        "ghg17_plus": "GHG17 Heavy Duty Management"
      },
      "fault_codes": {
        "P226E_00": {
          "spn": 3251, "fmi": 2, "p_code": "P226E-00",
          "emission_level": "ghg17_plus",
          "description": "DPF Particulate Filter Differential Pressure - Data Erratic or Out of Range",
          "shared_circuits": ["mp10_turbo_boost_loop"],
          "common_causes": [
            "CRITICAL PATTERN: Heavy-haul duty cycles splitting metal DPF differential sensing tubes near the exhaust manifold vault.",
            "DPF delta pressure sensor sensor internal element failing under high exhaust heat load conditions.",
            "Severe internal DPF substrate breakdown or ash plug saturation."
          ],
          "required_tools": ["TOOL_DMM", "TOOL_PRESSURE_MANOMETER"]
        }
      },
      "circuit_intersections": {
        "mp10_turbo_boost_loop": {
          "name": "MP10 High-Volume Air Management / Exhaust Circuit",
          "triage_tip": "The 16L engine produces severe exhaust manifold heat soak. Thoroughly check backpressure tubes for hairline exhaust gas cracks before swapping out sensors."
        }
      }
    }
  },
  
  // NEW SYSTEM SECTION: NON-CODE SYMPTOM ENGINE
  "symptom_trees": {
    "cranks_no_start": {
      "title": "Engine Cranks But Won't Start (Zero Active Codes)",
      "triage_priority": "HIGH SEVERITY // MECHANICAL LOW PRESSURE FUEL CHECKS",
      "steps": [
        "Check ECM system status sync speed parameters using active diagnostic tools while cranking. Must see at least 150 RPM for injector pulses to unlock.",
        "Verify low-pressure fuel delivery supply gallery pressure output. Target parameter sequence needs a minimum of 45-60 PSI during cranking speeds.",
        "Inspect clear fuel sight-glass block lines for immediate signs of massive aerated fuel foaming or total suction draw cavitation loops.",
        "Check mechanical fuel gear pump lift pressure relief safety bypass valve seating. A stuck-open seat dumps primary rail pressure straight back to the fuel saddle tanks."
      ],
      "required_tools": ["TOOL_FUEL_PRESS_KIT", "TOOL_SIGHT_GLASS"]
    },
    "progressive_power_loss": {
      "title": "Progressive Power Loss Under High Boost Load Conditions",
      "triage_priority": "PERFORMANCE DEFICIENCY // CHARGE AIR MATRIX CHECKS",
      "steps": [
        "Execute a comprehensive charge air cooler (CAC) high-pressure smoke pressure decay test down the induction tracts.",
        "Check boost air pressure sensor reading tracking alignment limits manually against real-time mechanical dashboard gauge outputs.",
        "Inspect the variable geometry turbocharger (VGT) electronic sector arm actuator lever for carbon binding or physical hitch binding layout points."
      ],
      "required_tools": ["TOOL_SMOKE_MACHINE", "TOOL_PRESSURE_MANOMETER"]
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
