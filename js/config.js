// Dimensions — VERIFIED against the 2018 FRC Game & Season Manual (rules research).
// Units: meters. Z-up world. X = field length (alliance walls at x=±8.23),
// Y = field width. Blue alliance at x<0.
const D2R = Math.PI / 180;
export const CFG = {
  FIELD: {
    L: 16.46, W: 8.23,          // 54 ft x 27 ft carpet
    wallH: 1.0,
    carpet: 0x8a8f94,           // real FRC carpet grey
    autoLineX: 8.23 - 3.05,     // 10 ft from each alliance wall
  },
  SCALE: {
    plateW: 0.91, plateD: 1.22, // 3 ft x 4 ft plates
    pivotH: 1.52,               // 5 ft at level
    maxTilt: 9.59 * D2R,
    ownEdge: 1.42,              // plate outside edge <= 4 ft 8 in = owned
    towerW: 0.43,
    platformW: 2.64, platformD: 1.05, platformH: 0.09, // 8'8" x 3'5.25" x 3.5"
    rungTop: 2.13,              // 7 ft
    rungLen: 0.33,
  },
  SWITCH: {
    plateW: 0.91, plateD: 1.22, // 3 ft x 4 ft plates
    pivotH: 0.23,               // 9 in at level
    maxTilt: 4.78 * D2R,
    ownEdge: 0.15,              // plate edge <= 6 in = owned
    distFromWall: 4.27,         // 14 ft from alliance wall
  },
  CUBE: { w: 0.33, h: 0.27 },   // 1'1" x 1'1" x 11" milk crate
  VAULT: { cols: 3, perCol: 3, colW: 0.34 },
  MATCH: { auto: 15, teleop: 135, endgame: 30 },
  ROBOT: { maxV: 4.4, maxW: 5.0, accel: 8.0, size: 0.84 }, // ~14.4 ft/s, matches reference sims
  SCORE: {
    AUTO_LINE: 5, AUTO_GAIN: 2, AUTO_SEC: 2,
    TELE_GAIN: 1, TELE_SEC: 1,
    VAULT_CUBE: 5, PARK: 5, CLIMB: 30,
  },
};
