// js/database.js
export const faultCodeDatabase = {
  "engines": {
    "mack_mp7": {
      "name": "Mack MP7 (11L Platform)",
      "fault_codes": {
        "SPN_4364_FMI_18": {
          "spn": 4364, "fmi": 18,
          "description": "SCR Catalyst NOx Conversion Efficiency Low - 11L Flow Profile",
          "shared_circuits": ["circuit_5v_ems", "exhaust_stream_mp7"],
          "common_causes": [
            "Biased inlet/outlet NOx sensors due to moisture accumulation in short stack",
            "DEF injector face crystallization or poor atomization pressure",
            "EGR valve carbon binding causing excessive diesel soot loading"
          ],
          "required_tools": ["TOOL_DEF_REFRACTOMETER", "TOOL_DMM"]
        },
        "SPN_3513_FMI_4": {
          "spn": 3513, "fmi": 4,
          "description": "Sensor Supply Voltage #4 (EMS 5V) Short to Ground",
          "shared_circuits": ["circuit_5v_ems"],
          "common_causes": [
            "Exhaust NOx wiring harness rubbed raw against transmission support brackets",
            "Internal short inside Crankcase Pressure or Oil Temp sensor sub-assemblies"
          ],
          "required_tools": ["TOOL_DMM", "TOOL_MACK_BO_BOX"]
        }
      },
      "circuit_intersections": {
        "circuit_5v_ems": {
          "name": "EMS 5-Volt Reference Bus Loop #4",
          "triage_tip": "Common MP7 Rub Point: Inspect the main trunk line where it wraps tightly over the bell housing."
        },
        "exhaust_stream_mp7": {
          "name": "MP7 Compact Exhaust Thermal Management Loop",
          "triage_tip": "The 11L running colder can drop exhaust temps quickly. Verify Seventh Injector (Hydrocarbon Valve) actuation integrity."
        }
      }
    },
    "mack_mp8": {
      "name": "Mack MP8 (13L Platform)",
      "fault_codes": {
        "SPN_5246_FMI_0": {
          "spn": 5246, "fmi": 0,
          "description": "Regulatory Derate Active - SCR Emissions System Failure Action",
          "shared_circuits": ["scr_efficiency_loop"],
          "common_causes": [
            "DEF dosing pump mechanical internal pressure failure",
            "Severely contaminated or old DEF fluid supplies",
            "SCR Catalyst substrate face melted or choked with fuel"
          ],
          "required_tools": ["TOOL_DEF_REFRACTOMETER", "TOOL_DEF_VOLUME_TESTER"]
        },
        "SPN_4364_FMI_18": {
          "spn": 4364, "fmi": 18,
          "description": "SCR Catalyst NOx Conversion Efficiency - Below Normal Operating Range",
          "shared_circuits": ["scr_efficiency_loop", "circuit_5v_ems"],
          "common_causes": [
            "Leaking or sticking DEF dosing valve spray tips",
            "Out-of-calibration Inlet or Outlet exhaust gas NOx sensors",
            "Upstream exhaust leaks leaking air into the pre-catalyst stream"
          ],
          "required_tools": ["TOOL_DEF_REFRACTOMETER", "TOOL_DMM"]
        },
        "SPN_3513_FMI_4": {
          "spn": 3513, "fmi": 4,
          "description": "Sensor Supply Voltage #4 Circuit - Voltage Below Normal / Grounded",
          "shared_circuits": ["circuit_5v_ems"],
          "common_causes": [
            "NOx sensor pigtail loom tracking raw against frame rail bolts",
            "Internal circuit bridge short inside the Oil Level/Temp sensor"
          ],
          "required_tools": ["TOOL_DMM", "TOOL_MACK_BO_BOX"]
        }
      },
      "circuit_intersections": {
        "circuit_5v_ems": {
          "name": "EMS 5-Volt Reference Bus Loop #4",
          "triage_tip": "If stacked with NOx efficiency faults, isolate the Outlet NOx sensor power line first before swapping components."
        },
        "scr_efficiency_loop": {
          "name": "MP8 Production SCR Efficiency Tracking Node",
          "triage_tip": "Always measure actual DEF dosing fluid delivery weight volume using a graduated test tube before condemnation."
        }
      }
    },
    "mack_mp10": {
      "name": "Mack MP10 (16L Heavy-Haul Platform)",
      "fault_codes": {
        "SPN_4364_FMI_18": {
          "spn": 4364, "fmi": 18,
          "description": "SCR Catalyst NOx Conversion Deficiency - Dual-Catalyst Balance Node",
          "shared_circuits": ["circuit_5v_ems", "heavy_scr_vault"],
          "common_causes": [
            "Dual-bank DEF doser delivery synchronization imbalance",
            "Biased high-capacity Outlet NOx monitoring module sensors",
            "Internal structural bypass leaks inside the heavy-haul SCR catalyst casing"
          ],
          "required_tools": ["TOOL_DEF_REFRACTOMETER", "TOOL_DEF_VOLUME_TESTER"]
        },
        "SPN_3513_FMI_4": {
          "spn": 3513, "fmi": 4,
          "description": "Sensor Supply Voltage #4 Circuit - High Capacity Bus Low Source Short",
          "shared_circuits": ["circuit_5v_ems"],
          "common_causes": [
            "Heavy frame configuration wire rail harness rubbing near the intermediate steering shaft",
            "Dual-NOx module circuit wire bundle damage"
          ],
          "required_tools": ["TOOL_DMM", "TOOL_MACK_BO_BOX"]
        }
      },
      "circuit_intersections": {
        "circuit_5v_ems": {
          "name": "EMS 5-Volt Reference Bus Loop #4 (High Capacity Layout)",
          "triage_tip": "The MP10 harness is longer and maps through high-torque flex corridors. Inspect structural frame clamps carefully."
        },
        "heavy_scr_vault": {
          "name": "MP10 Dual-Volume Catalyst Assembly Group",
          "triage_tip": "Heavy-duty load cycling means catalyst cracks are more probable than sensor failure modes if codes persist under boost."
        }
      }
    }
  },
  "tools": {
    "TOOL_DEF_REFRACTOMETER": { "name": "Precision Optical DEF Quality Fluid Refractometer", "affiliate_url": "https://amazon.com" },
    "TOOL_DEF_VOLUME_TESTER": { "name": "Volvo/Mack Official DEF Doser Fluid Volume Delivery Kit", "affiliate_url": "https://amazon.com" },
    "TOOL_DMM": { "name": "Fluke 88V Professional Automotive Digital Multimeter", "affiliate_url": "https://amazon.com" },
    "TOOL_MACK_BO_BOX": { "name": "Mack Engine Wiring Harness Breakout Interceptor Box", "affiliate_url": "https://amazon.com" }
  }
};
