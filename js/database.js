// js/database.js
export const faultCodeDatabase = {
  "engines": {
    "mack_mp8": {
      "name": "Mack MP8 (US10 / US14 / GHG17)",
      "fault_codes": {
        "SPN_5246_FMI_0": {
          "spn": 5246,
          "fmi": 0,
          "description": "Regulatory Derate Active - SCR Emissions Most Severe Level",
          "shared_circuits": ["scr_efficiency_loop"],
          "common_causes": [
            "DEF dosing valve completely blocked or crystallized",
            "Contaminated DEF fluid (High concentration or water dilution)",
            "SCR Catalyst degraded or face-plugged with soot/unburned fuel"
          ],
          "required_tools": ["TOOL_DEF_REFRACTOMETER", "TOOL_DEF_VOLUME_TESTER"]
        },
        "SPN_4364_FMI_18": {
          "spn": 4364,
          "fmi": 18,
          "description": "SCR Catalyst NOx Conversion Efficiency - Below Normal Operating Range",
          "shared_circuits": ["scr_efficiency_loop", "circuit_5v_ems"],
          "common_causes": [
            "Degraded DEF fluid quality or failing DEF pump pressure",
            "Biased Exhaust NOx sensor (Inlet or Outlet)",
            "Upstream engine issues causing excessive PM (EGR sticking, leaking injectors)"
          ],
          "required_tools": ["TOOL_DEF_REFRACTOMETER", "TOOL_DMM"]
        },
        "SPN_3513_FMI_4": {
          "spn": 3513,
          "fmi": 4,
          "description": "Sensor Supply Voltage #4 Circuit (EMS 5V Ref) - Voltage Below Normal / Shorted to Ground",
          "shared_circuits": ["circuit_5v_ems"],
          "common_causes": [
            "Exhaust NOx Sensor harness rubbed through on transmission housing/frame rail",
            "Internal short inside the Engine Oil Level/Temp sensor",
            "Short to ground in Crankcase Pressure sensor circuit"
          ],
          "required_tools": ["TOOL_DMM", "TOOL_MACK_BO_HARNESS"]
        }
      },
      "circuit_intersections": {
        "circuit_5v_ems": {
          "name": "Engine Management 5-Volt Reference Circuit #4",
          "components": ["Inlet NOx Sensor", "Outlet NOx Sensor", "Engine Oil Level/Temp Sensor"],
          "triage_tip": "CRITICAL: A short here drops NOx communication and triggers immediate SCR efficiency codes. Unplug the Outlet NOx sensor first—the harness frequently rubs raw against the exhaust framing."
        },
        "scr_efficiency_loop": {
          "name": "SCR Efficiency Tracking Loop",
          "components": ["DEF Doser Valve", "SCR Catalyst", "NOx Sensors"],
          "triage_tip": "If stacked with an EMS 5V reference code, DO NOT replace the SCR catalyst or DEF pump. Fix the voltage drop first to bring the NOx sensors back online."
        }
      }
    }
  },
  "tools": {
    "TOOL_DEF_REFRACTOMETER": { "name": "Optical DEF Fluid Quality Refractometer", "affiliate_url": "https://amazon.com" },
    "TOOL_DEF_VOLUME_TESTER": { "name": "Mack/Volvo DEF Doser Flow Volume Test Kit", "affiliate_url": "https://amazon.com" },
    "TOOL_DMM": { "name": "Fluke 88V Digital Multimeter", "affiliate_url": "https://amazon.com" },
    "TOOL_MACK_BO_HARNESS": { "name": "Mack MP8 Engine Harness Breakout Box Lead", "affiliate_url": "https://amazon.com" }
  }
};
