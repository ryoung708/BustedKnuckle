// IronKnuckle branching diagnostic decision engine v1.
// Deterministic, evidence-led routing. Recommendations are not diagnoses.
const has=(value,...terms)=>terms.some(term=>value.includes(term));
const result=(stepId,reason,action,state="next")=>({stepId,reason,action,state});
function explicitlyAbnormal(value=""){
  const text=String(value||"").toLowerCase()
    .replace(/not\\s+(?:excessive|abnormal|too high|too low|out of spec)/g,"")
    .replace(/no\\s+(?:excessive|abnormal)\\s+(?:drop|reading|condition)/g,"");
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
  if(!currentChoice && (hasCurrentDetails || currentIndex>0))
    return result(currentStep.id,"This stage has not been given an observed result. Saved notes, measurements, fault codes or attachments cannot be treated as a pass or used to guess the next test.","Select the observation that best matches the test, or record why the check could not be completed. If none of the options fits, leave the stage open and clarify the finding.","hold");
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
    const route={
      scope:["battery_baseline","The exact scope of the power loss has been defined.","Measure directly at the battery posts and, if possible, capture voltage during the actual dropout."],
      battery_baseline:["battery_connections","The battery-post baseline is recorded. A stable or collapsing reading both require checking the high-current connections before moving downstream.","Inspect battery posts, interconnects and main cables; perform loaded voltage-drop checks using the OEM procedure."],
      battery_connections:["main_disconnect","The battery connections have been checked or a connection issue has been identified.","Verify the master disconnect path if equipped. Do not bypass or bridge it."],
      main_disconnect:["main_distribution","The master disconnect path is checked or not applicable.","Trace the primary feed through main protection and distribution points using the vehicle diagram."],
      main_distribution:["grounds","The main distribution feed has been evaluated.","Check primary negative, engine, frame and cab ground paths with loaded voltage-drop tests."],
      grounds:["ignition_feed","Primary ground paths have been evaluated.","If source and main distribution remain stable, monitor switched ignition/run and wake-up feeds."],
      ignition_feed:["intermittent_localization","Switched power behavior has been captured.","Reproduce the dropout safely while monitoring a known-good upstream point and the downstream feed."],
      intermittent_localization:["verify","The intermittent event has been localized or the limits of reproduction are documented.","Document physical evidence, repair and repeat the original operating conditions while monitoring the same points."]
    };
    const next=route[id];
    if(next){
      if(id==="scope"&&has(answer,"could not reproduce"))return hold("The complete-power-loss event was not reproduced.","Record when it occurs, what remains powered and what returns first. Preserve the case and capture the event before disturbing connections.");
      if(id==="battery_connections"&&has(answer,"within applicable limits","not tested"))return go("main_disconnect","No confirmed battery-connection defect is recorded; continue downstream without assuming the connections are good under every condition.","Check the master disconnect path if equipped, then continue through primary distribution.");
      if(id==="main_disconnect"&&has(answer,"no separate master","not applicable"))return go("main_distribution","No separate master disconnect applies to this vehicle.","Trace the primary feed through main protection and distribution points.");
      if(id==="main_distribution"&&has(answer,"remains stable"))return go("grounds","The primary distribution feed remained stable during this test.","Evaluate the main negative and body/engine ground paths under load.");
      if(id==="grounds"&&has(answer,"within applicable limits"))return go("ignition_feed","The tested primary ground paths remained within the applicable limits.","If source and distribution stay stable, monitor ignition/run and controller wake-up feeds.");
      if(id==="ignition_feed"&&has(answer,"remain stable"))return go("intermittent_localization","The monitored switched feeds remained stable during this test.","Continue safe event capture at another documented boundary; avoid replacing a relay or controller without proof.");
      return go(next[0],next[1],next[2]);
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
