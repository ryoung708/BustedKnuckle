// IronKnuckle branching diagnostic decision engine v1.
// Deterministic, evidence-led routing. Recommendations are not diagnoses.
const has=(value,...terms)=>terms.some(term=>value.includes(term));
const result=(stepId,reason,action,state="next")=>({stepId,reason,action,state});
function explicitlyAbnormal(value=""){
  const text=String(value||"").toLowerCase()
    .replace(/not\s+(?:excessive|abnormal|too high|too low|out of spec)/g,"")
    .replace(/no\s+(?:excessive|abnormal)\s+(?:drop|reading|condition)/g,"");
  return /out of spec|outside (?:the )?spec|above (?:the )?(?:spec|limit)|below (?:the )?(?:spec|limit)|spec(?:ification)?\s+(?:max(?:imum)?|limit)|excessive|abnormal|too high|too low|large voltage drop|high voltage drop|fails? (?:the )?spec|voltage drop.{0,24}(?:excessive|too high)/i.test(text);
}
function inspectionAction(stepId){
  const actions={
    battery_baseline:"Pause before moving downstream. Recheck the battery bank directly at the lead posts under the same load, then inspect battery condition, interconnects and charging/source conditions. Record the exact OEM limit and retest result.",
    battery_connections:"Inspect the specific battery post, clamp, interconnect or cable connection where the drop was measured. Look for looseness, corrosion, heat, discoloration, damaged crimps or poor terminal contact. Measure across each connection separately under the same load; do not disturb energized high-current connections.",
    main_disconnect:"Do not continue to main distribution yet. Inspect the master disconnect switch and both cable terminations for loose hardware, corrosion, heat/discoloration, damaged contacts or poor terminal fit. Measure voltage drop directly across the closed switch and separately across each cable-to-terminal connection under the same load. Do not bypass or bridge the switch.",
    main_distribution:"Inspect the identified main fuse, fusible link, junction and terminal connections. Compare voltage at the input and output under the same load, then isolate the exact boundary where the voltage is lost. Verify the correct diagram and protection rating.",
    grounds:"Inspect the affected ground terminal, cable, strap and chassis/engine attachment for looseness, corrosion, paint, heat or damaged crimps. Measure each ground-path segment separately under the same load.",
    ignition_feed:"Inspect the identified ignition/run relay, socket terminals, switched feed and control connections. Monitor relay input, control and output under the same operating condition; do not condemn the relay or controller from one reading.",
    intermittent_localization:"Inspect the exact segment or connection where the dropout was captured. Check routing, retention, terminal fit, moisture, chafing and prior repairs, then repeat the same monitored test."
  };
  return actions[stepId]||"Pause progression and investigate the exact test point and circuit boundary that produced the abnormal result. Verify the vehicle-specific specification, inspect the connection/component and repeat the same test before moving on.";
}

export function recommendNextStep(caseRecord,steps){
  if(!Array.isArray(steps)||!steps.length)return null;
  const entries=caseRecord?.entries||{};
  const currentIndex=Math.max(0,Math.min(Number(caseRecord?.currentStep)||0,steps.length-1));
  const currentStep=steps[currentIndex],currentEntry=entries[currentStep?.id]||{};
  const currentChoice=String(currentEntry.choice||"").trim();
  const currentMeasurements=currentEntry.measurements||{};
  const hasCurrentDetails=[
    currentEntry.notes,currentMeasurements.condition,currentMeasurements.testPoints,
    currentMeasurements.actual,currentMeasurements.canH,currentMeasurements.canL,
    currentMeasurements.voltage,currentMeasurements.resistance
  ].some(value=>String(value??"").trim()) ||
    (Array.isArray(currentEntry.faultCodes)&&currentEntry.faultCodes.length>0) ||
    (Array.isArray(currentEntry.evidence)&&currentEntry.evidence.length>0);
  const currentText=[currentMeasurements.actual,currentMeasurements.condition,currentMeasurements.testPoints,currentEntry.notes].filter(Boolean).join(" ");
  if(!currentChoice && caseRecord?.workflowId==="power_loss" && explicitlyAbnormal(currentText))
    return result(currentStep.id,"The recorded reading or notes explicitly describe an out-of-spec or abnormal result. This is an active finding, not a pass; investigate this test point before continuing.",inspectionAction(currentStep.id),"hold");
  if(!currentChoice && hasCurrentDetails)
    return result(currentStep.id,"This stage has saved notes, measurements, fault codes or attachments but no selected observation. That evidence cannot be treated as a pass or used to guess the next test.","Select the observation that best matches the test, or record why the check could not be completed. If none of the options fits, leave the stage open and clarify the finding.","hold");
  const recorded=steps.map((step,index)=>({step,index,entry:entries[step.id]}))
    .filter(x=>x.entry&&String(x.entry.choice||"").trim());
  if(!recorded.length)return result(steps[0].id,"No test result has been recorded yet.","Begin by confirming the complaint and capturing the baseline.");
  recorded.sort((a,b)=>{
    const ta=Date.parse(a.entry.updatedAt||a.entry.recordedAt||"");
    const tb=Date.parse(b.entry.updatedAt||b.entry.recordedAt||"");
    if(Number.isFinite(ta)&&Number.isFinite(tb)&&ta!==tb)return ta-tb;
    return a.index-b.index;
  });
  const latest=recorded[recorded.length-1],id=latest.step.id;
  const answer=String(latest.entry.choice||"").toLowerCase();
  const workflow=caseRecord.workflowId||"j1939_network";
  const hold=(why,action)=>result(id,why,action,"hold");
  const go=(target,why,action)=>result(target,why,action);
  if(workflow==="power_loss" && explicitlyAbnormal([
    latest.entry.measurements?.actual,latest.entry.measurements?.condition,
    latest.entry.measurements?.testPoints,latest.entry.notes,answer
  ].filter(Boolean).join(" "))){
    return hold("An out-of-spec or abnormal result was recorded at "+latest.step.title+". Investigate this test point before advancing; do not treat the finding as a pass.",inspectionAction(id));
  }

  if(id==="verify"){
    if(has(answer,"repair verified","no longer occurs"))return result("verify","The technician recorded a successful verification.","Review original complaint conditions, before/after evidence and related faults before closing.","review");
    return hold("The cause or repair has not been fully verified.","Keep the case open and identify the missing proof or repeat the original failure conditions.");
  }

  if(workflow==="power_loss"){
    switch(id){
      case "scope":
        if(has(answer,"all vehicle electrical power is lost","cab and dash go dark or reboot")) return go("battery_baseline","The symptom is consistent with a vehicle-level power interruption.","Measure directly at the battery posts and, if possible, capture voltage during the actual dropout.");
        if(has(answer,"engine shuts off but cab and accessories stay powered")) return hold("The engine shuts off, but vehicle electrical power remains available; this is not a complete vehicle-power-loss event.","Use the DCC Unexpected Shutdown / engine-control path. Preserve engine and controller event data; do not start replacing battery cables or master disconnect components from this symptom.");
        if(has(answer,"no crank; cab and accessories remain powered")) return hold("The cab and accessories remain powered, so the complaint is a no-crank/start-circuit issue rather than complete vehicle power loss.","Use the starting-circuit path in WiringHound General Electrical or the DCC crank/no-start workflow. Verify start authorization and starter control separately from the main battery-distribution path.");
        if(has(answer,"only one system or branch loses power")) return hold("The loss is limited to one system or branch, not the complete vehicle electrical supply.","Use the General Electrical or Light INOP workflow for the affected branch. Identify the exact load, fuse/protection device and power/ground boundary.");
        if(has(answer,"could not reproduce")) return hold("The complete-power-loss event was not reproduced.","Record when it occurs, what remains powered and what returns first. Preserve event data and capture the dropout before disturbing connections.");
        return hold("The scope of the electrical power loss is not established.","Determine whether the entire vehicle, cab/chassis supply, starting circuit or one branch loses power. Do not assume a battery/disconnect fault until the scope is confirmed.");
      case "battery_baseline":
        if(has(answer,"battery-post voltage stays stable during the event")) return go("battery_connections","Battery-post voltage stayed stable during the event; continue to the high-current connection boundaries.","Measure loaded voltage drop across each battery post, clamp, interconnect and main cable using the OEM procedure.");
        if(has(answer,"battery-post voltage collapses during the event","voltage is low before the event")) return hold("The source voltage at the battery posts is abnormal during or before the event.","Verify battery-bank configuration, state of charge and condition with the OEM-approved load/conductance test. Check charging/source conditions as indicated and repeat the post measurement under the same load; do not move downstream until the source is proven.");
        if(has(answer,"event not reproduced","no event reading","test condition unclear")) return hold("The battery-post reading has not been captured under the failure condition.","Monitor directly at the lead posts during a safe reproduction and record the operating load and exact reading. A static reading alone does not clear the source.");
        return hold("The battery-post baseline is inconclusive.","Capture the voltage directly at the lead posts during the event and compare it with the vehicle-specific battery test criteria.");
      case "battery_connections":
        if(has(answer,"connection checks are within applicable limits","all battery connections pass")) return go("main_disconnect","The tested battery connections meet the applicable limits under the recorded conditions.","Verify the master disconnect path if equipped. Do not bypass or bridge it.");
        if(has(answer,"not tested","result uncertain","intermittent change reproduced")) return hold("The battery connection checks are incomplete or the connection changes intermittently.","Measure voltage drop across each post, clamp, interconnect and cable termination separately under the same load. Localize the changing boundary before moving downstream.");
        if(has(answer,"excessive drop","loose","damaged","hot","corroded","poor terminal contact")) return hold("A battery connection abnormality is indicated and must be isolated before downstream checks.","Inspect the specific battery post, clamp, interconnect or cable where the drop was measured. Repair only the confirmed connection and repeat the same loaded test.");
        return hold("The battery connections have not been proven within limits.","Complete the loaded voltage-drop checks at every relevant battery connection and record each result before proceeding.");
      case "main_disconnect":
        if(has(answer,"switch path remains stable during event","no separate master disconnect","not applicable")) return go("main_distribution","The master disconnect path is stable or is not fitted on this vehicle.","Trace the primary feed through main protection and distribution points using the correct vehicle diagram.");
        if(has(answer,"power is lost upstream of the switch")) return hold("Power is being lost before it reaches the master disconnect.","Trace the cable from the battery/interconnect to the switch input. Measure at each boundary under the same load and inspect the exact terminal/cable where voltage disappears.");
        if(has(answer,"power is present at input but lost at output","excessive drop across closed switch")) return hold("The master disconnect input is powered but its output is not stable.","Measure voltage drop directly across the closed switch and separately across each terminal connection under load. Inspect the switch contacts and terminations; do not bypass or bridge the switch.");
        if(has(answer,"not tested","result uncertain")) return hold("The master disconnect path has not been verified.","Measure the switch input and output during the event and compare the drop across the closed switch with the OEM limit.");
        return hold("The master disconnect result is inconclusive.","Identify whether the vehicle has a separate disconnect and prove input-to-output continuity under load before continuing.");
      case "main_distribution":
        if(has(answer,"main distribution feed remains stable","distribution remains stable")) return go("grounds","The primary distribution feed remained stable during this test.","Check primary negative, engine, frame and cab ground paths with loaded voltage-drop tests.");
        if(has(answer,"feed disappears before main protection","missing at output","power is lost between protection and distribution")) return hold("The primary feed is lost at or before a main protection/distribution boundary.","Use the correct vehicle diagram to measure at the protection input and output and each downstream junction under the same load. Inspect the exact fuse, fusible link, terminal or junction; do not bridge protection.");
        if(has(answer,"not isolated","diagram or test point unavailable","not tested")) return hold("The main distribution feed has not been isolated to a specific boundary.","Obtain the correct vehicle diagram and test points, then compare voltage at each protection/distribution boundary under load.");
        return hold("The main distribution result is inconclusive.","Identify the exact point where the feed is lost using the vehicle diagram and loaded measurements.");
      case "grounds":
        if(has(answer,"ground paths remain within applicable limits","all primary grounds pass")) return go("ignition_feed","The tested primary ground paths meet the applicable limits.","If source and main distribution remain stable, monitor switched ignition/run and controller wake-up feeds.");
        if(has(answer,"not tested","ground architecture unclear","result uncertain")) return hold("The primary ground paths have not been proven.","Identify the vehicle's actual ground architecture and perform loaded voltage-drop checks at the battery, engine, frame and cab ground boundaries.");
        if(has(answer,"excessive drop","ground path abnormal","ground connection damaged")) return hold("A primary ground-path abnormality is indicated.","Measure each ground segment separately under load, inspect the terminal/strap/chassis attachment and repair only the confirmed boundary.");
        return hold("The primary ground result is inconclusive.","Complete the OEM loaded ground voltage-drop checks and document each test point before proceeding.");
      case "ignition_feed":
        if(has(answer,"switched feeds remain stable during event","ignition and run feeds stable")) return go("intermittent_localization","The monitored switched feeds remained stable during this test.","Continue safe event capture at another documented boundary; avoid replacing a relay or controller without proof.");
        if(has(answer,"ignition or run command disappears","relay control remains; relay output drops","relay output remains; downstream feed drops")) return hold("A switched ignition/run feed or relay boundary drops out during the event.","Identify whether the loss is at the command/input, relay coil/control, relay output or downstream feed. Monitor each boundary under the same event condition and use the correct wiring diagram before replacing a relay or controller.");
        if(has(answer,"control strategy or test point not established","not tested","result uncertain")) return hold("The ignition/run control strategy or test point has not been established.","Use the vehicle-specific diagram and controller logic to identify the command source, relay control and downstream feeds before testing.");
        return hold("The switched ignition/run feed has not been proven stable.","Capture the command, relay input/output and downstream voltage during the same dropout event.");
      case "intermittent_localization":
        if(has(answer,"dropout localized to repeatable connection or segment")) return go("verify","The intermittent dropout has been localized to a repeatable boundary.","Document the exact location and physical evidence, complete the confirmed repair, then repeat the original operating conditions while monitoring the same upstream/downstream points.");
        if(has(answer,"dropout follows vibration or harness movement","dropout follows heat, cold or moisture","no dropout reproduced during monitoring","multiple boundaries remain possible")) return hold("The intermittent dropout has not been localized to one repeatable boundary.","Continue monitoring across the suspected connector, harness segment and upstream/downstream reference points. Change one condition at a time and record exactly where voltage is lost; do not replace parts based only on correlation.");
        return hold("The intermittent power-loss boundary remains unproven.","Capture the event while monitoring the known-good upstream point and downstream feed, then isolate the exact segment before repair.");
    }
  }

  if(workflow==="j1939_network"){
    switch(id){
      case "baseline":
        if(has(answer,"complaint not reproduced"))return hold("The original communication failure was not reproduced.","Capture operating conditions, affected controllers and fault history before selecting another test.");
        return go("resistance","The symptom has been scoped. Establish the network's de-energized electrical baseline.","Perform the OEM-approved key-off resistance test and document test points, connected modules and topology.");
      case "resistance":
        if(has(answer,"approximately 60","matches vehicle-specific expectation"))return go("addon","Resistance appears consistent with this stated setup; this does not rule out intermittent or powered-state faults.","Check add-on devices and repeat the original powered observation under the same conditions.");
        if(has(answer,"lower than","higher than","open"))return go("all_isolated","Resistance differs from the expected value. Remaining connected paths and topology must be accounted for.","Safely isolate the network per the vehicle procedure and repeat the test with connected devices documented.");
        if(has(answer,"unstable"))return go("segment","The resistance reading is unstable; use controlled segmentation to check repeatability.","Divide the network only at approved junctions and identify which segment retains the abnormal reading.");
        return hold("The resistance result or test setup is unclear.","Confirm de-energized state, test pins, meter range and connected terminators/modules.");
      case "addon":
        if(has(answer,"returns to normal"))return go("addon_review","Network behavior changed after add-on equipment was isolated. This identifies a branch, not automatically a failed device.","Inspect device wiring, connector, power/ground and installation; repeat the test before drawing a conclusion.");
        if(has(answer,"no change","no add-on"))return go("module_isolation","Add-on equipment did not explain the symptom.","Continue controlled one-at-a-time module/branch isolation using the vehicle-specific procedure.");
        return hold("The add-on isolation result is inconclusive.","Repeat the same test and record exactly what was disconnected and the before/after readings.");
      case "addon_review":
        if(has(answer,"fault found","damage found","defect confirmed"))return go("verify","A physical issue has been identified in the add-on branch.","Document the actual defect and repair, then repeat the original network tests.");
        if(has(answer,"no issue","no fault"))return go("module_isolation","The add-on branch did not reveal a confirmed defect.","Continue with controlled module/branch isolation.");
        return hold("The add-on branch has not been conclusively evaluated.","Record connector, wiring, power/ground and installation findings.");
      case "module_isolation":
        if(has(answer,"returned when a particular module"))return go("module_branch_review","Communication recovered after one module was disconnected. The module itself is not yet proven faulty.","Inspect that module's branch, connector, power and ground; repeat isolation to confirm.");
        if(has(answer,"dropout remained","no clear change"))return go("all_isolated","No single module isolation restored communication.","Establish a fully isolated network baseline using the vehicle-specific procedure.");
        return hold("Module isolation was not completed safely or the result is unclear.","Confirm topology and the approved isolation procedure before disconnecting more modules.");
      case "module_branch_review":
        if(has(answer,"fault found","damage found","abnormal power","ground fault","connector fault"))return go("verify","A branch-level defect has been identified for confirmation.","Document physical evidence and repair, then repeat the original communication tests.");
        if(has(answer,"no branch fault","no defect"))return go("all_isolated","The module branch did not reveal a confirmed wiring, connector, power or ground defect.","Continue network isolation; do not condemn the module without its required checks.");
        return hold("The isolated module branch still needs evidence.","Capture connector, power/ground checks and symptom repeatability.");
      case "all_isolated":
        if(has(answer,"unable"))return hold("Complete network isolation has not been confirmed.","Verify OEM network layout, terminator locations and safe disconnect procedure.");
        return go("segment","The isolated-network reading is captured. Localize the affected physical segment next.","Split the network only at approved connectors and compare each segment using the same test.");
      case "segment":
        if(has(answer,"unable"))return hold("The network has not been divided into a clearly identified segment.","Confirm connector identity, pinout and which devices remain on each side.");
        return go("harness","The investigation has narrowed the network to a segment or shown a change after segmentation.","Inspect routing, clamps, pass-throughs, moisture paths and prior repairs while monitoring the same measurement.");
      case "harness":
        if(has(answer,"repeatable location","visible damage","corrosion"))return go("verify","A repeatable location or physical defect has been identified; confirm it is causal before closing.","Document exact location, repair and before/after readings, then reproduce the original communication test.");
        if(has(answer,"steady","no change"))return go("segment","The current harness inspection did not localize the fault.","Return to the network split and investigate another documented branch or connector.");
        return hold("The fault location is still broad or not repeatable.","Capture the exact conditions and narrow one accessible harness section at a time.");
    }
  }

  if(workflow==="light_inop"||workflow==="general_electrical"){
    switch(id){
      case "complaint":
        if(has(answer,"not reproduced"))return hold("The complaint is not currently present.","Record command, operating conditions and intermittent pattern before disturbing the circuit.");
        return go("protection","The affected function and scope have been identified.","Use the exact wiring diagram to verify the protected feed at its input and output.");
      case "protection":
        if(has(answer,"no power at protection input"))return go("upstream_feed","The protected device has no incoming supply.","Trace the upstream feed, relay/contact and source using the vehicle diagram and approved test points.");
        if(has(answer,"missing at output","opens","trips"))return go("protection_review","The protected feed is not passing normally or protection is opening.","Verify the correct device/rating and isolate downstream branches before replacing protection.");
        if(has(answer,"input and output","feed appear correct"))return go("control","Power reaches the protection device and its output.","Identify the control strategy and verify switch, relay or controller command.");
        return hold("The protected-feed test is incomplete.","Record device identifier/rating, input/output readings, key state and load condition.");
      case "upstream_feed":
        if(has(answer,"restored","feed repaired","supply present"))return go("protection","The upstream supply has been restored or confirmed.","Repeat the protection input/output test under the original operating condition.");
        return hold("The upstream supply is still missing or has not been isolated.","Trace the feed one documented segment at a time; do not bypass circuit protection.");
      case "protection_review":
        if(has(answer,"fault found","defect found","repaired"))return go("control","A protection/feed issue has been identified for confirmation.","After the approved repair, verify protected output and continue to the control command.");
        if(has(answer,"no fault","no defect"))return go("upstream_feed","The protection device itself has not been shown to be the cause.","Investigate upstream supply and downstream short/overload conditions using the wiring diagram.");
        return hold("The protection device or downstream load has not been isolated.","Confirm rating, terminal condition and whether the circuit opens under load.");
      case "control":
        if(has(answer,"command is not present"))return go("control_inputs","The expected output command is absent.","Check switch inputs, interlocks, enable conditions and controller data before suspecting the output device.");
        if(has(answer,"command is present","changes correctly","reports output fault"))return go("load","The control command or output state has been observed.","Test supply and ground at the load connector under the commanded operating condition.");
        return hold("The control strategy or command state is not established.","Identify whether the circuit is direct-switched, relayed or module-controlled.");
      case "control_inputs":
        if(has(answer,"corrected","restored","input present","inputs and enables appear correct"))return go("control","The input/enable checks are complete or the missing condition has changed.","Repeat the control-command test and verify expected output.");
        return hold("The command input or enable condition remains unresolved.","Check documented switch inputs, interlocks, module power/ground and related faults.");
      case "load":
        if(has(answer,"supply missing"))return go("protection","Power is missing at the load.","Return upstream and trace the protected feed and control output.");
        if(has(answer,"ground path abnormal","collapses"))return go("drop","The load test suggests a supply or return path problem under load.","Measure positive-side and ground-side voltage drop separately under the same load.");
        if(has(answer,"correct power and ground"))return go("load_review","Power and ground are present at the load connector; the load itself still needs proof.","Test the load using the approved method and inspect connector terminal fit.");
        if(has(answer,"connector"))return go("harness","Connector or terminal damage has been observed.","Inspect and localize the affected connector/branch.");
        return hold("The load-side result is incomplete.","Record actual voltage, reference point, connected load state and test pins.");
      case "drop":
        if(has(answer,"excessive drop"))return go("harness","A voltage drop has been localized to a side of the circuit.","Divide that side at documented connectors/splices and identify the segment containing the drop.");
        if(has(answer,"both paths within"))return go("load_review","Both measured paths appear within the applicable specification under this test condition.","Verify the load, connector and operating command before considering a module issue.");
        return hold("A valid loaded voltage-drop result is not yet available.","Reproduce the load and record exact positive/ground measurement points and OEM limits.");
      case "load_review":
        if(has(answer,"load failed","lamp failed","connector fault","terminal fault"))return go("verify","A load or connection defect has been identified for confirmation.","Document the defect and repair, then verify the original function under load.");
        if(has(answer,"load passes","known-good load"))return go("harness","The load itself passed the approved check.","Return to the wiring diagram and isolate the harness/connector path.");
        return hold("The load has not been independently proven.","Use an approved component test or known-good comparison; do not infer failure from missing operation alone.");
      case "harness":
        if(has(answer,"isolated to a segment","found","damage"))return go("verify","A physical or circuit defect has been localized.","Document the exact finding and repair, then repeat the original loaded test.");
        if(has(answer,"no physical fault"))return go("drop","No physical defect was found in the inspected area.","Return to loaded voltage-drop testing and divide the circuit into smaller documented segments.");
        return hold("The circuit fault has not been localized.","Record branch boundaries, connector/pin references and the measurement that changes.");
    }
  }

  const nextIndex=latest.index+1;
  if(nextIndex<steps.length)return result(steps[nextIndex].id,"No specialized branch rule matched this observation.","Continue with the next stage, preserving evidence and changing one variable at a time.");
  return hold("No validated branch is available for this result.","Review the evidence and obtain the vehicle-specific service procedure before proceeding.");
}
