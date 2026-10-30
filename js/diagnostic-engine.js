// IronKnuckle Diagnostic Engine v1
// Evidence-first workflow rules. This module never declares a component failed from
// a single reading; vehicle-specific specifications and topology must be verified.

export const workflows = {
  j1939_dropout: {
    title: "J1939 communication dropout",
    category: "Network / communication",
    caution: "Confirm the exact vehicle network topology, approved test points, module isolation procedure and OEM specifications. Never use resistance mode on an energized circuit.",
    steps: [
      { id:"baseline", title:"Establish the baseline", instruction:"Confirm the complaint, active/inactive communication faults, affected modules, key state and whether the problem is constant or intermittent.", choices:["Multiple modules offline","One module offline","Intermittent communication","Complaint not reproduced"], next:"voltage" },
      { id:"voltage", title:"Measure CAN legs to a known-good ground", instruction:"With the circuit in the prescribed powered state, measure CAN High and CAN Low individually to the same verified ground. Record actual values, key state and test point. Compare only with the correct vehicle specification.", choices:["Both legs collapse / drop out","Only one leg is abnormal","Both readings appear stable","Readings fluctuate"], next:"isolate_addon" },
      { id:"isolate_addon", title:"Check add-on equipment", instruction:"Identify ELDs, telematics, data loggers, aftermarket devices and recent additions on the network. Isolate only using the approved procedure, then repeat the same observation.", choices:["Communication returns","No change","No add-on equipment","Result uncertain"], next:"module_isolation" },
      { id:"module_isolation", title:"Isolate modules methodically", instruction:"Use the vehicle-specific procedure to isolate one module/branch at a time. Record exactly what was disconnected and whether the symptom changed. Do not assume one platform's VECU or gateway arrangement applies to another.", choices:["Symptom clears after one isolation","Symptom remains through isolation","Unable to isolate safely","Result not repeatable"], next:"resistance" },
      { id:"resistance", title:"Perform key-off resistance checks", instruction:"Only after confirming the network is de-energized and the OEM procedure permits it, measure across the specified network test points. Record topology and connected modules. Values such as 60Ω are topology-dependent clues, not universal pass/fail limits.", choices:["Matches vehicle-specific expectation","Higher / open compared with specification","Lower than specification","Unstable / changes"], next:"segment" },
      { id:"segment", title:"Divide the network into segments", instruction:"Separate branches at approved connectors/junctions. Repeat the same test on each isolated segment. Record which segment retains the abnormal behavior.", choices:["Cab branch isolated as suspect","Chassis branch isolated as suspect","One module branch isolated as suspect","No segment isolated yet"], next:"harness" },
      { id:"harness", title:"Localize the physical fault", instruction:"Inspect routing, clamps, pass-throughs, rub points, moisture paths and prior repairs. With the circuit safely isolated, carefully manipulate accessible harness sections while monitoring the same measurement.", choices:["Reading changes at a repeatable location","Visible damage / corrosion found","No change during inspection","Intermittent location not isolated"], next:"verify" },
      { id:"verify", title:"Confirm cause and verify repair", instruction:"Document physical evidence and repair. Repeat the original tests under the same conditions, confirm communication recovery and verify related faults do not return.", choices:["Repair verified under original conditions","Physical cause found; verification pending","Cause remains unconfirmed"], terminal:true }
    ]
  },
  short_ground: {
    title:"Suspected short to ground", category:"Electrical / short circuit",
    caution:"Use the correct wiring diagram, fuse protection and OEM isolation procedure. Never measure resistance on an energized circuit or apply power to an unknown circuit.",
    steps:[
      {id:"scope",title:"Define the affected circuit",instruction:"Identify the exact circuit, fuse/protection, affected loads, fault conditions and whether the fault is constant or intermittent.",choices:["Fuse opens immediately","Fuse opens only under certain conditions","Load is pulled low / inoperative","Intermittent symptom"]},
      {id:"powerdown",title:"Make the circuit safe",instruction:"Power down and isolate the circuit according to the vehicle procedure. Confirm absence of voltage before resistance testing.",choices:["Circuit confirmed de-energized","Voltage remains / isolation incomplete","Procedure or circuit identity uncertain"]},
      {id:"loads",title:"Separate loads and branches",instruction:"Disconnect loads and branch connectors methodically. Record whether the abnormal condition changes after each isolation. A change identifies a branch to investigate, not automatically a failed load.",choices:["Condition clears at a load","Condition clears at a harness branch","Condition remains with loads isolated","Not safely isolated"]},
      {id:"segment",title:"Inspect and test the isolated branch",instruction:"Use the wiring diagram to identify legitimate ground paths. Inspect abrasion, pinch points, moisture, connector damage and prior repairs. Compare measurements with the circuit-specific specification.",choices:["Physical contact / damage found","Unexpected continuity remains","No abnormality reproduced","More circuit information needed"]},
      {id:"verify",title:"Repair and verify",instruction:"Repair using approved methods, restore connectors and protection, then verify operation and confirm the original fault no longer occurs.",choices:["Repair verified","Verification pending","Cause unconfirmed"],terminal:true}
    ]
  },
  short_power: {
    title:"Suspected short to power",category:"Electrical / cross-circuit",
    caution:"Confirm circuit identity and safe isolation. Unexpected voltage can be caused by backfeed, shared circuits or module paths; do not assume insulation failure without isolating the circuit.",
    steps:[
      {id:"scope",title:"Identify the circuit and condition",instruction:"Record the circuit, expected state, actual voltage, key state, connected loads and whether the voltage is constant or intermittent.",choices:["Voltage present when circuit should be off","Unexpected voltage under load","Multiple circuits affected","Intermittent voltage"]},
      {id:"isolate",title:"Isolate connected loads and modules",instruction:"Follow the wiring diagram and approved procedure to isolate connected devices one at a time. Record whether the unexpected voltage disappears.",choices:["Voltage disappears after device isolation","Voltage remains with devices isolated","Voltage changes but does not disappear","Isolation incomplete"]},
      {id:"branches",title:"Separate branches",instruction:"Divide the circuit at documented connectors and compare each segment using the prescribed method. Account for shared feeds and normal backfeed paths.",choices:["One branch contains unexpected voltage","Multiple branches affected","No branch isolated","Normal shared-feed behavior identified"]},
      {id:"inspect",title:"Inspect for cross-contact",instruction:"Inspect harness routing, melted insulation, connector bridging, moisture and aftermarket splices. Confirm against the circuit diagram.",choices:["Physical cross-contact found","Connector contamination found","No physical evidence","Further testing needed"]},
      {id:"verify",title:"Repair and verify",instruction:"Restore the circuit and verify voltage behavior in the original operating states. Confirm all related functions operate correctly.",choices:["Repair verified","Verification pending","Cause unconfirmed"],terminal:true}
    ]
  },
  open_circuit: {
    title:"Suspected open circuit",category:"Electrical / open circuit",
    caution:"Use the correct circuit diagram and test procedure. A continuity result alone does not prove a circuit can carry its required load.",
    steps:[
      {id:"scope",title:"Define the failure",instruction:"Record the inoperative load, operating state, related faults and whether the failure is constant or intermittent.",choices:["Load completely inoperative","Intermittent operation","Multiple loads in same branch","Fault appears under vibration / heat"]},
      {id:"supply",title:"Verify power and ground",instruction:"At the specified test points, verify supply and ground under the prescribed load. Record actual values and conditions; do not infer a pass from an unloaded continuity check.",choices:["Supply missing","Ground path abnormal","Both appear correct under load","Not tested yet"]},
      {id:"connectors",title:"Inspect connectors and terminals",instruction:"Inspect terminal retention, pin fit, corrosion, water intrusion, fretting and prior repairs. Use approved terminal test tools.",choices:["Terminal / connector fault found","Connector appears sound","Intermittent when manipulated","Not yet inspected"]},
      {id:"segment",title:"Divide the circuit",instruction:"Use the diagram to test progressively between documented connectors and components until the failed segment is isolated.",choices:["Open isolated to one segment","High resistance localized","No abnormality reproduced","Segment boundaries unknown"]},
      {id:"verify",title:"Repair and verify",instruction:"Repair the conductor or connection using approved methods. Verify loaded operation and repeat the original symptom test.",choices:["Repair verified","Verification pending","Cause unconfirmed"],terminal:true}
    ]
  },
  voltage_drop: {
    title:"Voltage drop / high resistance",category:"Electrical / power and ground",
    caution:"Voltage-drop testing requires the circuit to be operating under the specified load. Compare with OEM limits for the exact circuit; no universal threshold is assumed here.",
    steps:[
      {id:"conditions",title:"Establish test conditions",instruction:"Identify circuit, load, operating state, battery/system voltage and exact measurement points. Record the complaint and reproduce the load.",choices:["Failure reproduced under load","Failure not reproduced","Load cannot be safely applied","Conditions unclear"]},
      {id:"positive",title:"Test the positive path",instruction:"Measure voltage drop across documented positive-side segments while the circuit is loaded. Record each segment and the applicable specification.",choices:["Drop localized to positive segment","Positive path within specification","Multiple segments questionable","Not measured"]},
      {id:"ground",title:"Test the ground path",instruction:"Measure voltage drop across the ground return under the same load. Verify ground attachment, surface condition and shared ground paths.",choices:["Drop localized to ground segment","Ground path within specification","Multiple grounds involved","Not measured"]},
      {id:"repair",title:"Inspect and correct connection",instruction:"Inspect the identified cable, splice, terminal, stud or ground attachment. Repair only the verified defect and repeat the same loaded test.",choices:["Connection defect found","No defect confirmed","Repair completed; retest pending"]},
      {id:"verify",title:"Verify under original load",instruction:"Repeat the original loaded test and confirm normal operation under the same conditions.",choices:["Repair verified","Verification pending","Cause unconfirmed"],terminal:true}
    ]
  },
  intermittent: {
    title:"Intermittent electrical fault",category:"Electrical / intermittent",
    caution:"Do not disturb the harness before documenting the baseline. Follow safety procedures around moving parts, hot surfaces and energized circuits.",
    steps:[
      {id:"pattern",title:"Capture the failure pattern",instruction:"Record when it occurs: temperature, vibration, moisture, engine movement, road condition, key cycle, load and duration.",choices:["Heat-related pattern","Vibration / movement pattern","Moisture-related pattern","Random / not yet repeatable"]},
      {id:"baseline",title:"Capture baseline measurements",instruction:"Choose the relevant circuit measurement and test points. Record stable and failed-state values with conditions.",choices:["Baseline captured","Failure state captured","Cannot reproduce"]},
      {id:"manipulate",title:"Controlled harness and connector inspection",instruction:"Safely manipulate one accessible section at a time while monitoring the selected signal or measurement. Avoid pulling on wires or creating a new fault.",choices:["Repeatable change at one location","Connector movement changes symptom","No change","Location remains broad"]},
      {id:"isolate",title:"Narrow the affected segment",instruction:"Use the diagram and repeatable test to separate branches, connectors and loads. Change one variable at a time.",choices:["Specific segment isolated","Specific connector isolated","No segment isolated","Need vehicle-specific diagram"]},
      {id:"verify",title:"Confirm repair across failure conditions",instruction:"Repair the verified defect and repeat the conditions that originally triggered the failure. Record duration and result.",choices:["Failure no longer occurs","Failure reduced but still present","Verification period incomplete","Cause unconfirmed"],terminal:true}
    ]
  },
  crank_no_start: {
    title:"Cranks but will not start",category:"Engine performance",
    caution:"Use OEM-specific cranking, fuel pressure, synchronization and enable criteria. This workflow intentionally does not supply universal pressure or RPM thresholds.",
    steps:[
      {id:"codes",title:"Scan all relevant controllers",instruction:"Record active and inactive faults, controller communication status and freeze-frame or event data where available.",choices:["Relevant active faults present","No relevant faults found","One or more controllers not communicating","Scan incomplete"]},
      {id:"enable",title:"Check start authorization and synchronization",instruction:"Using approved diagnostic data, verify start enable, engine speed signal, synchronization and relevant interlocks against the exact engine specification.",choices:["Start enable missing","Engine speed / sync data abnormal","Enable and sync appear valid","Data unavailable"]},
      {id:"fuel",title:"Verify fuel supply and delivery",instruction:"Test low-pressure supply and required fuel conditions using the engine-specific procedure and specifications. Inspect for air ingress or restriction where applicable.",choices:["Supply outside specification","Air / restriction evidence","Fuel supply meets specification","Not tested"]},
      {id:"air_exhaust",title:"Check air, exhaust and mechanical prerequisites",instruction:"Assess intake restriction, exhaust restriction, valve/mechanical concerns and sensor plausibility only where symptoms or data support them.",choices:["Restriction or mechanical concern found","Data points to another system","No abnormality identified","Further evidence needed"]},
      {id:"verify",title:"Confirm root cause",instruction:"Document the confirmed cause, repair and successful restart verification. Preserve before/after measurements.",choices:["Cause and repair verified","Repair pending verification","Cause unconfirmed"],terminal:true}
    ]
  },
  power_loss: {
    title:"Low power / derate",category:"Engine performance",
    caution:"Use engine-specific limits and OEM procedures. Do not substitute generic boost, fuel pressure or temperature thresholds.",
    steps:[
      {id:"conditions",title:"Define operating conditions",instruction:"Record load, RPM, speed, ambient conditions, symptom onset, derate messages and whether the complaint is repeatable.",choices:["Only under high load","Across operating range","Intermittent","Complaint not reproduced"]},
      {id:"codes",title:"Review faults and derate requests",instruction:"Scan all relevant controllers and identify active faults, torque limits and derate requests. Record source controller and status.",choices:["Active derate request identified","Relevant fault without derate","No active faults","Controller data unavailable"]},
      {id:"airfuel",title:"Compare air and fuel data",instruction:"Compare commanded and actual values using OEM specifications. Verify supply, leaks, sensor plausibility and restrictions only where data indicates.",choices:["Air-path discrepancy","Fuel delivery discrepancy","Sensor plausibility issue","No discrepancy identified"]},
      {id:"exhaust",title:"Evaluate exhaust / aftertreatment",instruction:"Review relevant temperatures, pressure measurements, regeneration status and aftertreatment faults against engine-specific criteria.",choices:["Aftertreatment issue supported by data","Exhaust restriction suspected","Values within specification","More data required"]},
      {id:"verify",title:"Verify performance restoration",instruction:"Record the confirmed cause and repair. Repeat the original operating conditions and verify normal power and no returning faults.",choices:["Repair verified under load","Verification pending","Cause unconfirmed"],terminal:true}
    ]
  }
};

export function createSession(input={}) {
  const now=new Date().toISOString();
  return {
    id: input.id || (globalThis.crypto?.randomUUID?.() ?? "ik-"+Date.now()),
    createdAt: input.createdAt || now,
    updatedAt: now,
    vehicle: { year:input.year||"", make:input.make||"", model:input.model||"", engine:input.engine||"", emissions:input.emissions||"", vinLast6:input.vinLast6||"" },
    complaint: input.complaint||"",
    workflowId: input.workflowId||"j1939_dropout",
    currentStep: 0,
    entries: {},
    status: "in-progress",
    conclusion: ""
  };
}

export function recordStep(session, stepIndex, payload={}) {
  const flow=workflows[session.workflowId];
  if(!flow || !flow.steps[stepIndex]) throw new Error("Unknown diagnostic step.");
  session.entries[flow.steps[stepIndex].id] = {
    choice: payload.choice || "",
    measurements: payload.measurements || {},
    notes: payload.notes || "",
    recordedAt: new Date().toISOString()
  };
  session.currentStep=Math.min(stepIndex+1,flow.steps.length-1);
  session.updatedAt=new Date().toISOString();
  return session;
}

export function evaluateSession(session) {
  const flow=workflows[session.workflowId];
  if(!flow) return {status:"incomplete",headline:"Workflow unavailable",nextActions:["Select a supported workflow."],cautions:[]};
  const completed=flow.steps.filter(step=>session.entries[step.id]?.choice);
  const latest=completed.at(-1);
  const result={status:"in-progress",headline:"Evidence collection in progress",completed:completed.length,total:flow.steps.length,nextActions:[],cautions:[flow.caution],evidence:[]};
  if(!latest) {
    result.nextActions.push("Begin with: "+flow.steps[0].title);
    return result;
  }
  const answer=latest && session.entries[latest.id].choice;
  result.evidence.push({step:latest.title,observation:answer});
  if(latest.id==="voltage" && answer==="Both legs collapse / drop out") result.nextActions.push("Keep the original test points and key state documented. Check add-on network devices next; do not condemn a controller from this reading.");
  else if(latest.id==="module_isolation" && answer==="Symptom clears after one isolation") result.nextActions.push("Repeat the isolation to confirm it is reproducible. Inspect that module's branch, connector, power and ground before considering the module itself.");
  else if(latest.id==="resistance" && answer==="Higher / open compared with specification") result.nextActions.push("Confirm the exact OEM test points, termination layout and disconnected-module state, then divide the network into documented segments.");
  else if(latest.id==="resistance" && answer==="Lower than specification") result.nextActions.push("Verify the circuit is de-energized and the correct network segments are isolated. Check for remaining connected paths before concluding there is a short.");
  else if(latest.id==="segment" && answer==="Cab branch isolated as suspect") result.nextActions.push("Focus inspection on the cab branch and its pass-throughs, clamps, floor penetrations and moisture paths. Record the exact location where measurements change.");
  else if(latest.id==="harness" && answer==="Reading changes at a repeatable location") result.nextActions.push("Mark and inspect that exact harness location. A repeatable change localizes the investigation but physical evidence is still needed to confirm cause.");
  else if(answer.toLowerCase().includes("unconfirmed") || answer.toLowerCase().includes("uncertain")) result.nextActions.push("Do not close the case as diagnosed. Identify the missing measurement, vehicle specification or repeatability evidence.");
  else result.nextActions.push("Continue to the next workflow stage. Change one variable at a time and record actual readings and test conditions.");
  if(completed.length===flow.steps.length && latest.terminal) {
    const finalAnswer=String(session.entries[latest.id]?.choice||"").toLowerCase();
    const verified=finalAnswer.includes("verified") || finalAnswer.includes("no longer occurs");
    result.status=verified ? "ready-for-review" : "needs-more-evidence";
    result.headline=verified ? "Repair verification recorded — technician review required" : "Investigation complete — cause or repair still unconfirmed";
    result.nextActions=verified
      ? ["Review every observation and measurement. Confirm that the original complaint was re-tested under the same conditions and no related faults returned."]
      : ["Do not label this case as a confirmed repair. Identify the missing evidence, complete the repair verification, or document why the cause remains unknown."];
  }
  return result;
}

export function exportSession(session) {
  return JSON.stringify({product:"IronKnuckle",schemaVersion:1,exportedAt:new Date().toISOString(),session},null,2);
}
