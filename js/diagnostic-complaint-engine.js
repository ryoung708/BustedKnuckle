// Complaint-first selection for the powertrain Diagnostic Command Center.
// Classification chooses a useful starting workflow; it does not diagnose the vehicle.
export function classifyDiagnosticComplaint(complaint = "") {
  const text = String(complaint || "").toLowerCase().replace(/\s+/g, " ").trim();
  const match = pattern => pattern.test(text);

  if (match(/j1939|can\s*(?:bus|network|high|low|h|l)|data\s*link|communication (?:loss|drop|fault)|controllers?\s+(?:go\s+)?offline|network (?:dropout|drops? out)|no crank|won't crank|will not crank|starter|battery|alternator|charging system|voltage drop|low voltage|short to (?:ground|power)|open circuit|wiring|harness|fuse|relay|ground (?:fault|issue)|head.?lamp|headlight|marker light|turn signal|lighting|lamp inop|light inop|complete (?:vehicle )?power loss|total (?:vehicle )?power loss/)) {
    return { route: "wiringhound", workflowId: "", label: "WiringHound — electrical diagnosis", reason: "The complaint points to an electrical, starting, lighting, power-distribution or network concern. WiringHound is the correct evidence-first workflow for that system." };
  }
  if (match(/\b(?:engine\s+)?(?:shuts?\s+off|shut\s+down|stalls?|cuts?\s+out|cuts?\s+off|dies?\s+while\s+running|quits?\s+running|unexpected\s+shutdown)\b|runs?\s+(?:for\s+)?(?:a\s+)?(?:few\s+seconds|short\s+time)\s+then\s+dies/)) {
    return { route: "dcc", workflowId: "unexpected_shutdown", label: "Unexpected engine shutdown / stalls while running", reason: "The complaint describes an engine that stops while running. Start with shutdown conditions, exact engine/control architecture, stored events and power/ground integrity before narrowing timing or fuel-control systems." };
  }
  if (match(/after.?treatment|dpf|diesel particulate|scr system|selective catalytic|def system|diesel exhaust fluid|regen(?:eration)?|soot load|doser|inducement/)) {
    return { route: "dcc", workflowId: "aftertreatment_fault", label: "After-treatment fault / derate", reason: "The complaint identifies an after-treatment, regeneration, DEF or emissions-control concern." };
  }
  if (match(/transmission|gearbox|won't shift|will not shift|does not shift|shift concern|stuck in gear|gear engagement|clutch actuator|driveshaft|driveline|differential|axle|u.?joint|power take.?off|pto/)) {
    return { route: "dcc", workflowId: "drivetrain_fault", label: "Transmission / drivetrain concern", reason: "The complaint points to a transmission, clutch, driveline, differential or axle concern." };
  }
  if (match(/cranks? (?:over )?(?:but )?(?:will not|won't|does not|doesn't) start|crank(?:s|ing)? but no start|crank.?no.?start|hard start|long crank/)) {
    return { route: "dcc", workflowId: "crank_no_start", label: "Cranks but will not start", reason: "The complaint describes a crank/no-start or difficult-start condition." };
  }
  if (match(/low power|lack of power|loss of engine power|engine derate|derate|poor acceleration|low boost|reduced torque|engine runs weak/)) {
    return { route: "dcc", workflowId: "engine_power_loss", label: "Low power / derate", reason: "The complaint describes reduced engine output, a derate or a power-under-load concern." };
  }
  if (match(/check engine|engine warning|malfunction indicator|\bmil\b|\bcel\b|\bspn\b|\bfmi\b|engine fault code|active engine fault|inactive engine fault/)) {
    return { route: "dcc", workflowId: "check_engine_light", label: "Check Engine Light", reason: "The complaint identifies an engine warning or fault-code investigation." };
  }
  return { route: "dcc", workflowId: "complaint_triage", label: "General engine / powertrain complaint triage", reason: "The complaint does not clearly identify one subsystem yet. Start with a structured baseline, controller scan and data review before narrowing the path." };
}
