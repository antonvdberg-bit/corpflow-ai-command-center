const RealDate = Date;
const FIXED_NOW_MS = RealDate.parse('2026-06-18T23:39:05.447Z');

// Loaded only for the IM-7.1 operator-activity test process. This keeps the
// rolling-lookback test deterministic without changing production behaviour.
globalThis.Date = class FixedDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      super(FIXED_NOW_MS);
      return;
    }
    super(...args);
  }

  static now() {
    return FIXED_NOW_MS;
  }
};
