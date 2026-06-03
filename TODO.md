# TODO

- [ ] Update `app/orgDashboard/attendance-scanner/page.js` to include RFID scanning in the same category as face recognition.
- [ ] Implement **face-first** flow for check-in; RFID scanning should be used **only for check-out** (per requirement).

- [ ] Add an RFID input mechanism (keyboard wedge style focused input) for check-out.
- [ ] Add UI controls to switch between check-in (face) and check-out (RFID) modes.
- [ ] Implement API calls for RFID checkout (or wire to existing endpoints if present).
- [ ] Ensure existing face scanning loop still works and doesn’t conflict with RFID mode.
- [ ] Run Next lint/build to confirm no TS/ESLint errors.


