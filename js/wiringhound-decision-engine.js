// IronKnuckle branching diagnostic decision engine v1.
// Deterministic, evidence-led routing. Recommendations are not diagnoses.
const has=(value,...terms)=>terms.some(term=>value.includes(term));
const result=(stepId,reason,action,state="next")=>({stepId,reason,action,state});

export function recommendNextStep(caseRecord,steps){
  if(!Array.isArray(steps)||!steps.length)return null;
  const entries=caseRecord?.entries||{};
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

  if(id==="verify"){
    if(has(answer,"repair verified","no longer occurs"))return result("verify","The technician recorded a successful verification.","Review original complaint conditions, before/after evidence and related faults before closing.","review");
    return hold("The cause or repair has not been fully verified.","Keep the case open and identify the missing proof or repeat the original failure conditions.");
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
        if(has(answer,"corrected","restored","input present"))return go("control","The missing input/enable condition has changed.","Repeat the control-command test and verify expected output.");
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
