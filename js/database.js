// ========================================================
// IRONKNUCKLE DIAGNOSTICS // DATABASE.JS SECTION 1 OF 4  
// GLOBAL REGISTER FAULT REGISTRY POOL MASTER STORAGE - PART A   
// ========================================================

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
  },
  "P0046_00": {
    "spn": 641, "fmi": 7, "p_code": "P0046-00",
    "description": "Turbocharger Variable Geometry Actuator (VGT) Control Circuit - Performance Failure",
    "shared_circuits": ["circuit_5v_ems"],
    "common_causes": [
      "CRITICAL PATTERN: Mechanical VGT sector arm actuator lever binding or locking up due to heavy exhaust soot and carbon packing.",
      "Internal sector gear teeth stripped or worn out inside the electronic VGT actuator gear drive housing.",
      "Actuator wire bundle pigtail linkage rubbed raw against the coolant return tube structural framework."
    ],
    "required_tools": ["TOOL_DMM"]
  },
    // ========================================================
  // IRONKNUCKLE DIAGNOSTICS // DATABASE.JS SECTION 2 OF 4  
  // GLOBAL REGISTER FAULT REGISTRY POOL MASTER STORAGE - PART B   
  // ========================================================
  "P228F_00": {
    "spn": 5418, "fmi": 15, "p_code": "P228F-00",
    "description": "Fuel Pressure Regulator 1 Exceeded Learning Limits - Too High",
    "shared_circuits": ["low_pressure_fuel"],
    "common_causes": [
      "CRITICAL SHOP FIX: Mechanical fuel overflow valve (PRV) mounted on the fuel gallery has a weakened internal spring or debris on the seat.",
      "High-pressure common rail fuel control actuator (FCA/MPROP) sticking or responding sluggishly.",
      "Internal bypass leakage inside one or more high-pressure electronic fuel injectors."
    ],
    "required_tools": ["TOOL_FUEL_PRESS_KIT", "TOOL_SIGHT_GLASS"]
  },
  "P20AA_00": {
    "spn": 5246, "fmi": 7, "p_code": "P20AA-00",
    "description": "Reductant Dosing Valve Circuit - Performance Malfunction or Stuck Closed",
    "shared_circuits": ["scr_efficiency_loop"],
    "common_causes": [
      "CRITICAL PATTERN: DEF injector face plate completely blocked with solid DEF crust or hard carbon exhaust deposits.",
      "DEF pressure line linking line pinched, kinked, or crushed behind the transmission harness mounting tray.",
      "Internal solenoid mechanical coil binding or opening up inside the DEF doser nozzle unit itself."
    ],
    "required_tools": ["TOOL_DEF_VOLUME_TESTER", "TOOL_DEF_REFRACTOMETER"]
  },
  "P1026_00": {
    "spn": 3659, "fmi": 5, "p_code": "P1026-00",
    "description": "Engine Variable Valve Timing Control Solenoid (Booster Valve) - Open Circuit",
    "shared_circuits": ["valve_cover_loom"],
    "common_causes": [
      "CRITICAL PATTERN: Internal brake assembly/rocker control valve (Rocker Arm Shaft Solenoid) harness wire break right at the solenoid connector tail under the valve cover.",
      "Oil intrusion bridging the pins inside the internal pass-through connector housing terminal block."
    ],
    "required_tools": ["TOOL_DMM", "TOOL_PIN_TENSION_KIT"]
  },
  "P1031_00": {
    "spn": 3511, "fmi": 4, "p_code": "P1031-00",
    "description": "Sensor Supply Voltage #2 Circuit (EMS 5V Ref B) - Voltage Below Normal / Shorted Low",
    "shared_circuits": ["circuit_5v_ems"],
    "common_causes": [
      "CRITICAL PATTERN: Variable Geometry Turbocharger (VGT) actuator internal 5V circuit shorted to ground internally.",
      "EGR Valve position sensor harness rubbed raw against the hot metal EGR crossover pipe shield casting."
    ],
    "required_tools": ["TOOL_DMM", "TOOL_MACK_BO_BOX"]
  },
  "P204B_00": {
    "spn": 4331, "fmi": 2, "p_code": "P204B-00",
    "description": "Reductant Pressure Sensor Circuit - Erratic, Intermittent, or Incorrect Signal",
    "shared_circuits": ["def_pump_bus"],
    "common_causes": [
      "CRITICAL SHOP FIX: DEF pump internal ceramic pressure sensor element cracked due to trapped freezing fluid/moisture expansion.",
      "Debris or crystallized DEF particles restriction inside the main pump filter element cartridge loop.",
      "Harness pins corroded or pushed out inside the main 12-pin DEF pump assembly electrical connector housing."
    ],
    "required_tools": ["TOOL_DMM", "TOOL_DEF_VOLUME_TESTER"]
  },
      // ========================================================
  // IRONKNUCKLE DIAGNOSTICS // DATABASE.JS SECTION 3 OF 4  
  // GLOBAL REGISTER FAULT REGISTRY POOL MASTER STORAGE - PART C   
  // ========================================================
  "P1496_00": {
    "spn": 2791, "fmi": 7, "p_code": "P1496-00",
    "description": "EGR Valve Actuator - Mechanism Performance / Response Sluggish or Stuck",
    "shared_circuits": ["circuit_5v_ems"],
    "common_causes": [
      "CRITICAL PATTERN: Heavy soot carbon loading binding the internal exhaust gas butterfly shaft mechanism.",
      "Internal sector gear fracture or motor winding burning up inside the electronic EGR valve actuator housing assembly.",
      "Coolant tracking internally across the actuator electrical pins due to a leaking internal actuator housing gasket."
    ],
    "required_tools": ["TOOL_DMM"]
  },
  "P2080_00": {
    "spn": 3242, "fmi": 2, "p_code": "P2080-00",
    "description": "Exhaust Gas Temperature (EGT) Sensor 1 Circuit (DPF Inlet) - Range/Performance Failure",
    "shared_circuits": ["aftertreatment_temp_loop"],
    "common_causes": [
      "CRITICAL PATTERN: EGT sensor tip coated or heavily glazed by upstream unburned fuel from a leaking 7th injector/hydrocarbon valve.",
      "Sensor wire lead thermal fatigue or fracture inside the mineral-insulated metal shielding jacket near the exhaust manifold tube.",
      "High resistance or loose pins inside the intermediate chassis breakout harness barrel connector block."
    ],
    "required_tools": ["TOOL_DMM"]
  },
  "P0108_00": {
    "spn": 102, "fmi": 3, "p_code": "P0108-00",
    "description": "Boost Pressure Sensor Circuit - Voltage Above Normal or Shorted High",
    "shared_circuits": ["circuit_5v_ems"],
    "common_causes": [
      "CRITICAL SHOP FIX: Intake manifold pressure (boost) sensor sensing port completely plugged solid with thick carbon/EGR soot mud.",
      "5V reference circuit shorted to the signal return line inside the sensor harness trunk wrapper near the intake horn.",
      "Internal sensor circuit board failure due to constant engine vibration harmonics."
    ],
    "required_tools": ["TOOL_DMM"]
  },
  "P205C_00": {
    "spn": 4354, "fmi": 4, "p_code": "P205C-00",
    "description": "Reductant Tank Temperature Sensor Circuit - Voltage Below Normal or Shorted Low",
    "shared_circuits": ["def_tank_bus"],
    "common_causes": [
      "CRITICAL PATTERN: Internal heating element or temperature thermistor circuit failure inside the combined DEF pickup tank unit module.",
      "DEF tank harness layout rub point: Wiring loom rubbing raw against the sharp upper edges of the aluminum fuel tank support brackets.",
      "Moisture tracking or road salt bridging pins inside the intermediate 4-pin tank connector shell casing."
    ],
    "required_tools": ["TOOL_DMM"]
  },
  "P0263_00": {
    "spn": 5214, "fmi": 7, "p_code": "P0263-00",
    "description": "Cylinder 1 Contribution/Balance Fault - Mechanical Component Failure",
    "shared_circuits": ["low_pressure_fuel"],
    "common_causes": [
      "CRITICAL PATTERN: High-pressure common rail fuel injector internal nozzle tip spray holes partially blocked or carbonized.",
      "Cylinder allocation balancing values failing due to mechanical valvetrain adjustment dropouts.",
      "Combustion gas blowing past the copper injector sleeve sealing washer face down into the fuel galley rail channel."
    ],
    "required_tools": ["TOOL_PIN_TENSION_KIT", "TOOL_DMM"]
  },
  "P102A_00": {
    "spn": 3480, "fmi": 16, "p_code": "P102A-00",
    "description": "Fuel Pressure After Fuel Filter - Data Valid But Below Normal Range - Moderately Severe",
    "shared_circuits": ["low_pressure_fuel"],
    "common_causes": [
      "CRITICAL SHOP FIX: Primary water separator or secondary fuel filter elements plugged. Always replace filters before checking fuel lines.",
      "Air induction sucking past a cracked or distorted primary fuel filter clear bowl seal gasket track.",
      "Gear-driven low pressure transfer pump internal gear face clearance out of spec, losing priming volume."
    ],
    "required_tools": ["TOOL_FUEL_PRESS_KIT", "TOOL_SIGHT_GLASS"]
  },
  "P24A4_00": {
    "spn": 3936, "fmi": 18, "p_code": "P24A4-00",
    "description": "Particulate Matter (PM) Sensor Regeneration Incomplete - Soot Accumulation Failure",
    "shared_circuits": ["circuit_5v_ems"],
    "common_causes": [
      "CRITICAL PATTERN: Downstream PM sensor face heavily masked with heavy soot due to an upstream micro-crack split inside the DPF ceramic brick filter core.",
      "The PM sensor internal heating element failed, preventing the module from completing its self-cleaning burn off routine.",
      "Frequent short-trip operational duty cycles preventing the exhaust system from sustaining required catalyst threshold temperatures."
    ],
    "required_tools": ["TOOL_DMM"]
  },
  "P20E8_00": {
    "spn": 4334, "fmi": 18, "p_code": "P20E8-00",
    "description": "Reductant Pressure Too Low - Mechanical Component Malfunction",
    "shared_circuits": ["def_pump_bus"],
    "common_causes": [
      "CRITICAL SHOP FIX: Main air extraction block valve or internal check valve leaking pressure straight back to the tank reservoir lines.",
      "DEF tank suction line internal wall collapsed or drawing air at the quick-disconnect lock collar interface.",
      "DEF dosing fluid filter completely plugged with solid contaminants or crystallized chemical salts."
    ],
    "required_tools": ["TOOL_DEF_VOLUME_TESTER", "TOOL_DEF_REFRACTOMETER"]
  },
  "P0117_00": {
    "spn": 110, "fmi": 4, "p_code": "P0117-00",
    "description": "Engine Coolant Temperature (ECT) Sensor Circuit - Voltage Below Normal or Shorted Low",
    "shared_circuits": ["circuit_5v_ems"],
    "common_causes": [
      "ECT sensor wiring loom rubbed raw against the sharp radius corner of the thermostat housing casting frame block.",
      "Internal short to sensor body ground inside the thermistor probe assembly casing.",
      "Corrosion track bridging pins inside the main engine block coolant temp sensor breakout plug body."
    ],
    "required_tools": ["TOOL_DMM"]
  },
  "SPN_4364_FMI_18": {
    "spn": 4364, "fmi": 18, "p_code": "N/A",
    "description": "SCR Catalyst NOx Conversion Efficiency Low - Legacy Unit Layout",
    "shared_circuits": ["scr_efficiency_loop"],
    "common_causes": [
      "DEF dosing valve face-plugged or crystalized loop restrictions.",
      "Biased upstream Exhaust NOx sensor reading out of calibration tracking profiles.",
      "Exhaust flex pipe leakage upstream of the SCR catalyst inlet box shroud joints."
    ],
    "required_tools": ["TOOL_DEF_REFRACTOMETER", "TOOL_DMM"]
  },
      // ========================================================
  // IRONKNUCKLE DIAGNOSTICS // DATABASE.JS SECTION 4 OF 4  
  // ENGINE MAP INDEXES & DYNAMIC SYMPTOM LOGIC PLATFORMS   
  // ========================================================
}; // Closes the globalFaultLibrary master pool registry cleanly!

export const faultCodeDatabase = {
  "engines": {
    "mack_mp7": {
      "name": "Mack MP7 (11L Platform)",
      "emission_levels": { "us10_us14": "EPA10 / GHG14", "ghg17_plus": "GHG17 / GHG21+" },
      "code_manifest": [
        { "code_id": "P0201_00", "emission_level": "ghg17_plus" },
        { "code_id": "P205B_64", "emission_level": "ghg17_plus" },
        { "code_id": "P0401_00", "emission_level": "ghg17_plus" },
        { "code_id": "P0046_00", "emission_level": "ghg17_plus" },
        { "code_id": "P228F_00", "emission_level": "ghg17_plus" },
        { "code_id": "P20AA_00", "emission_level": "ghg17_plus" },
        { "code_id": "P1026_00", "emission_level": "ghg17_plus" },
        { "code_id": "P1496_00", "emission_level": "ghg17_plus" },
        { "code_id": "P0108_00", "emission_level": "ghg17_plus" }
      ],
      "circuit_intersections": {
        "valve_cover_loom": { "name": "Under-Valve-Cover High-Torque Electronic Loom", "triage_tip": "MP7 Specific: Check harness clips holding lines clear of the valvetrain rocking frame layout." },
        "circuit_5v_ems": { "name": "EMS 5-Volt Reference Bus Loop", "triage_tip": "Inspect common trunk routing right where the harness leaves the block conduit shroud near the oil module." }
      }
    },
    "mack_mp8": {
      "name": "Mack MP8 (13L Platform)",
      "emission_levels": { "us10_us14": "EPA10 / GHG14", "ghg17_plus": "GHG17 / GHG21+" },
      "code_manifest": [
        { "code_id": "SPN_4364_FMI_18", "emission_level": "us10_us14" },
        { "code_id": "P205B_64", "emission_level": "ghg17_plus" },
        { "code_id": "P0401_00", "emission_level": "ghg17_plus" },
        { "code_id": "P0046_00", "emission_level": "ghg17_plus" },
        { "code_id": "P228F_00", "emission_level": "ghg17_plus" },
        { "code_id": "P20AA_00", "emission_level": "ghg17_plus" },
        { "code_id": "P1026_00", "emission_level": "ghg17_plus" },
        { "code_id": "P1031_00", "emission_level": "ghg17_plus" },
        { "code_id": "P204B_00", "emission_level": "ghg17_plus" },
        { "code_id": "P1496_00", "emission_level": "ghg17_plus" },
        { "code_id": "P2080_00", "emission_level": "ghg17_plus" },
        { "code_id": "P0108_00", "emission_level": "ghg17_plus" },
        { "code_id": "P205C_00", "emission_level": "ghg17_plus" },
        { "code_id": "P0263_00", "emission_level": "ghg17_plus" },
        { "code_id": "P102A_00", "emission_level": "ghg17_plus" },
        { "code_id": "P24A4_00", "emission_level": "ghg17_plus" },
        { "code_id": "P20E8_00", "emission_level": "ghg17_plus" },
        { "code_id": "P0117_00", "emission_level": "ghg17_plus" }
      ],
      "circuit_intersections": {
        "circuit_5v_ems": { "name": "EMS 5-Volt Reference Bus Loop", "triage_tip": "GHG17 Rub Point: Unplug the outlet NOx sensor first. The harness rubs raw directly against frame rail bolts." },
        "def_tank_bus": { "name": "DEF Tank Quality Node Network", "triage_tip": "Perform a standard connector cavity pin-drag test at the sensor harness plug before component condemnation." },
        "low_pressure_fuel": { "name": "Low-Pressure Supply Orifice Gallery", "triage_tip": "Always measure actual gallery supply pressure before condemning the high dollar common rail pump mechanics." },
        "def_pump_bus": { "name": "DEF Pressure Delivery Pump Loop", "triage_tip": "Before throwing a pump module at it, inspect the lower main block harness pins for green corrosion tracks." },
        "scr_efficiency_loop": { "name": "SCR Catalytic Exchange Circuit", "triage_tip": "On US10/US14 setups, verify the mechanical DEF injection dosing weight parameter manually before checking sensors." }
      }
    },
    "mack_mp10": {
      "name": "Mack MP10 (16L Heavy-Haul)",
      "emission_levels": { "us10_us14": "EPA10 / GHG14", "ghg17_plus": "GHG17+" },
      "code_manifest": [
        { "code_id": "P226E_00", "emission_level": "ghg17_plus" },
        { "code_id": "P205B_64", "emission_level": "ghg17_plus" },
        { "code_id": "P0401_00", "emission_level": "ghg17_plus" },
        { "code_id": "P0046_00", "emission_level": "ghg17_plus" },
        { "code_id": "P20AA_00", "emission_level": "ghg17_plus" },
        { "code_id": "P2080_00", "emission_level": "ghg17_plus" },
        { "code_id": "P20E8_00", "emission_level": "ghg17_plus" }
      ],
      "circuit_intersections": {
        "turbo_boost_loop": { "name": "MP10 High-Volume Air Management Loop", "triage_tip": "The 16L engine produces severe exhaust heat soak. Check backpressure lines for hairline cracks." }
      }
    }
  },
  
  "symptom_trees": {
    "cranks_no_start": {
      "title": "Engine Cranks But Won't Start (Zero Active Codes)",
      "triage_priority": "CRITICAL MASTER FIX // CHECK FUEL ORIFICE RESTRICTIONS FIRST",
      "steps": [
        "PATTERN CRITICAL CHECK: Remove the low-pressure fuel line fuel gallery inlet banjo bolt fitting. Inspect the inner orifices for debris plugs, composite fuel cap plastic fragments, or shredding hose line liner material.",
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



