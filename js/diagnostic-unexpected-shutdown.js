// Older-platform-safe unexpected engine shutdown workflow.
// This is a diagnostic sequence, not an N14-specific service procedure.
// Never infer pinouts, sensor type, thresholds, fuel pressure or control architecture.
export const unexpectedShutdownWorkflow = Object.freeze({
  title:"Unexpected engine shutdown / stalls while running",
  category:"Engine performance",
  caution:"Identify the exact engine, control system and wiring before testing. Older engines may use different electronic or mechanical fuel-control architectures. Do not assume CELECT/CELECT Plus, sensor type, pinout, voltage, resistance, fuel pressure or shutdown logic. Use authorized service information for the exact configuration. Do not bypass shutdown circuits or operate an unsafe vehicle.",
  steps:[
    {
      id:"shutdown_pattern",
      title:"Characterize the shutdown",
      instruction:"Capture the event before choosing a component. Record cold or warm state, time to failure, RPM/load, vibration, weather, whether it hesitates or cuts cleanly, whether the dash/gauges reset, warning lamps, restart behavior and whether it restarts immediately. Reproduce only in a safe stationary or controlled setting.",
      choices:["Instant clean shutdown; dash stays powered","Instant shutdown; dash or gauges reset","Brief hesitation / miss, then shuts off","Pattern follows temperature, vibration or moisture","Not yet reproduced / behavior unclear"]
    },
    {
      id:"engine_architecture",
      title:"Identify the exact engine and control architecture",
      instruction:"Confirm engine serial number/model, model year, fuel system and ECM/control-system family from the engine data plate and authorized service information. Determine whether the engine uses electronic control (and which system) or a mechanical/PT-style arrangement. Record the source used. If this is unknown, stop before using system-specific pinouts, specifications or component tests.",
      choices:["Engine and electronic control system positively identified","Mechanical fuel/control architecture positively identified","Engine identified; control architecture still unknown","Identification or authorized service information unavailable"]
    },
    {
      id:"shutdown_fault_scan",
      title:"Capture controller faults and event information",
      instruction:"Before clearing anything, scan the engine controller and relevant vehicle controllers with compatible equipment. Save exact active and inactive faults, controller identity, occurrence counts, snapshots and available event data. Note whether the controller remains online during or immediately after the shutdown. No warning lamp does not prove there are no stored faults.",
      choices:["Relevant engine speed / timing / synchronization fault","ECM power, ignition, voltage or communication fault","Fuel-control / shutdown-device fault","No relevant faults found; scan completed","Controller unavailable or scan incomplete"]
    },
    {
      id:"power_ground_integrity",
      title:"Verify battery, engine and controller power / grounds",
      instruction:"Inspect battery terminals and eyelets, battery-to-engine grounds, engine-to-frame bonds, ECM grounds, fuses, relays and switched feeds using the exact wiring diagram. Check terminal retention, corrosion, heat damage and cable condition. Perform loaded voltage-drop checks during cranking and under the applicable operating load; monitor controller supply if the approved tool/procedure permits. Record meter leads, test points, load, voltage and OEM limit. A visual inspection or unloaded continuity test alone is not a pass.",
      choices:["Ground path abnormal / excessive drop or unstable","Positive or switched ECM supply abnormal / unstable","Power and ground paths verified within exact OEM limits under load","Connection repaired; repeat loaded test now passes","Not tested / exact test points or limits unavailable"]
    },
    {
      id:"engine_speed_timing_signal",
      title:"Evaluate engine speed / timing signal during the event",
      instruction:"Using the correct engine-specific diagnostic procedure, monitor engine RPM, synchronization and the applicable timing/position signal during cranking, warm-up and (if safely reproducible) the shutdown. Inspect the previously disturbed sensor connector and harness for terminal fit, pin retention, corrosion, oil/water intrusion, rub-through and heat damage. Identify whether the sensor is inductive or powered before selecting a test method. Do not apply a generic resistance or pinout.",
      choices:["RPM / timing / synchronization drops out or becomes implausible","Signal remains stable through the shutdown event","Connector, terminal or harness defect physically found","Data unavailable or event not reproduced"]
    },
    {
      id:"fuel_control_delivery",
      title:"Check fuel-control and delivery only after electrical integrity is established",
      instruction:"Follow the confirmed fuel-system architecture. For electronic systems, compare commanded and actual fuel-control/shutdown-device operation and verify its supply/actuation using the correct diagram and OEM procedure. For mechanical systems, use the applicable mechanical shutdown and fuel-delivery procedure. Check filters, restriction, air ingress, supply pressure and drain-back only with the exact engine specification. Do not bypass a shutdown device or assume a fuel-pressure value.",
      choices:["Fuel-control command / actuation drops out","Fuel delivery outside exact OEM specification","Fuel-control and delivery remain stable within applicable criteria","Not tested / architecture or specification unavailable"]
    },
    {
      id:"shutdown_repair_verification",
      title:"Confirm the cause and verify the repair",
      instruction:"Record the physical failure and evidence linking it to the shutdown. Document each repair separately, including the timing-sensor connector and any power/ground repairs. Repeat the original cold-start and warm-up conditions and the same loaded electrical checks. Re-scan controllers and record whether the symptom returns. A repair that appears successful before the original failure conditions are repeated remains pending verification.",
      choices:["Original shutdown condition no longer occurs; repair verified","Symptom still occurs","Retest incomplete / original conditions not repeated","Cause remains unconfirmed"],
      terminal:true
    }
  ]
});
