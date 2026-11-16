# IronKnuckle visual training module acceptance checklist

Use this for each new or revised mechanical/drivetrain training module.

## Reference identity
- [ ] Manufacturer, family, exact model and generation recorded.
- [ ] Configuration and options recorded (speed count, direct/overdrive, axle ratio, engine family, emissions tier, etc. as applicable).
- [ ] Sources are authorized and applicable to the exact model.
- [ ] Unverified dimensions, ratios, paths and component positions are labelled provisional.

## Geometry and views
- [ ] Full assembly fits in the initial camera view.
- [ ] Housing and external interfaces are recognizable.
- [ ] No unintended gear/housing/shaft intersections.
- [ ] Exterior hides internal parts correctly.
- [ ] Cutaway reveals the correct parts without destroying spatial context.
- [ ] Exploded view separates parts along understandable axes.
- [ ] Returning from cutaway/exploded restores original transforms.
- [ ] Reset camera and repeated view switching work.

## Mechanical behavior
- [ ] Component IDs are stable.
- [ ] Gear meshes and shaft axes are coherent.
- [ ] Rotation direction and relative speed follow the declared gear relationships.
- [ ] Torque path is understandable from input to output.
- [ ] Engagement states are distinct from shift requests.
- [ ] No animation implies a successful shift when engagement has not occurred.
- [ ] Educational simplifications are visible and documented.

## Technician usability
- [ ] Major parts can be selected and identified.
- [ ] Labels/readouts explain function, not just component names.
- [ ] Zoom/rotate/select works on desktop and phone.
- [ ] Touch controls do not conflict with page scrolling.
- [ ] No console/runtime errors during core interactions.
- [ ] A heavy-duty technician can explain the component's role after using the module.

## Evidence
Record browser/device, commit, reference source, checks performed, known limitations and screenshots. Static CI success is not a substitute for visual inspection.
