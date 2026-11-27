# DCC and WiringHound V3 — acceptance and technical validation
Review date: 2026-11-27. Status: public-source review and synthetic browser automation; experienced technician signoff and live vehicle verification pending. No claim of universal OEM validation.

## Public source review register
| Reference | Checked content | Remaining validation |
|---|---|---|
| [Mack FSB 237-021 release 02, May 2021](https://static.nhtsa.gov/odi/tsbs/2021/MC-10195320-0001.pdf) | MP7/MP8 listed configurations built 2016-11-14 through 2020-05-04; P009B-13 or diagnosed internal valve leakage; 85156544 hardware and 85156014 accessory software; conditional sensor/harness work and hardware before software. | Current VIN/build applicability, installed hardware, latest authorized repair procedure. |
| [Mack S7567, document dated 2021-03-29](https://static.nhtsa.gov/odi/tsbs/2023/MC-10243451-0001.pdf) | Historical 2018–2019 model-year campaign scope, EM-USA17 OBDEP-A/B, build dates 2016-11-14 through 2018-12-20; listed expiration 2024-12-31. | Current VIN eligibility and reimbursement; do not infer from FSB applicability. |
| [K94743326, May 2019](https://static.nhtsa.gov/odi/tsbs/2019/MC-10160190-9999.pdf) | Historical P009B-13 precedence over related pressure faults, 2018–2019 listed common-rail configurations. | Later service revisions and converted hardware; never apply historical pins to unknown build. |
| [K40914241, Jan 2020](https://static.nhtsa.gov/odi/tsbs/2019/MC-10170139-9999.pdf) | Listed common-rail fault family; PTT 2.7.85 was the historical minimum, not today's release. | Current PTT and exact diagnostic procedure. |
| [K01029637, 2019 public reproduction](https://oemdtc.com/tsb/10153480/) | Published text describes combinations of P0087-00, P016F-00 and P228F-00, rather than exclusively the complete set. Inspection of vent filter/connections and secondary filter seal with documentation. | Current scope; two-code choice requires explicit current OEM confirmation, single P016F does not auto-trigger. |
| [CBR 2107-22, Jan 7 2026](https://static.nhtsa.gov/odi/tsbs/2026/MC-11028032-0001.pdf) | Mack 2017–2024, US17+OBD16 through US22+OBD2023, excluding AN(4)/PR(4); smart network sensor, nine listed initial Active/Confirmed faults; connector, fluid, tank and repeat-run checks; green codes not standalone replacement triggers. | Current variant, exact emissions, authorized 258-040 and actual repeat scan. Final page text available; final-page image could not be retrieved during review. |
Generic electrical and powertrain illustrations remain conceptual. They are not validated physical pinouts, pressure ports, component locations or specifications. No generic analog-sensor diagram may be interpreted as a smart sensor wiring diagram. Source review is not OEM certification or an experienced technician's approval. Other manufacturers, engine architectures, current calibration-specific specs and all vehicle-specific test points require independent review.

## Browser automation
PR-triggered Chromium smoke suite uses synthetic records on a local server, isolated cloud stub and desktop/mobile emulated viewports. Check CI status and screenshot artifacts for the exact revision. Do not substitute this for real-device or live-account testing.

## Technician acceptance checklist (not yet signed off)
- Use synthetic cases; do not create verified repair examples from fictitious data in the production knowledge base.
- Desktop and physical phone: start a 2020 Mack Anthem MP8 no-crank case in WiringHound. Correct starting-system path; large choices, visible safety and next action; normal crank should direct toward DCC. Test both abnormal and untested results.
- DCC crank/no-start: missing authorization, sync abnormal, low-side fail and injection fail each open relevant isolation; repeat checks after repair; outcome controls accessible on verify stage.
- J1939: individual-leg voltage and de-energized resistance visuals; isolate branches without guessing wiring colors, pinouts or topology.
- Sensor: identify architecture first, compare supply/return then signal; unknown or smart network sensor must not be tested as generic analog.
- P016F: confirm code status and VIN/build; P009B precedence, historical source limitations, applicable two-code/three-code path, and fresh scan after correction.
- Low-power and aftertreatment: select abnormal data, isolate, retest and verify; incomplete/unsafe tests remain open.
- Save/reopen and handoff both directions; reject mismatched vehicle; confirm findings are reference-only; check sign-out/account switching using separate test accounts and verify no cross-account evidence exposure.
- Repeat tests at desktop/phone orientation; check no clipped controls, accidental stage advances or lost evidence. Record device/browser, steps, expected/actual, screenshot and severity.
- Experienced technician checks OEM applicability and approves exact vehicle-specific tests before claiming OEM-verified status. No universal verification claimed without this signoff.
