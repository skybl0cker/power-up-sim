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
  CUBE: { w: 0.33, h: 0.27, mass: 0.68, restitution: 0.32, friction: 0.55 }, // 13" foam cube ~1.5 lb
  VAULT: { cols: 3, perCol: 3, colW: 0.34 },
  MATCH: { auto: 15, teleop: 135, endgame: 30 },
  ROBOT: { maxV: 4.4, maxW: 5.0, accel: 8.0, size: 0.84 }, // ~14.4 ft/s, matches reference sims
  SCORE: {
    AUTO_LINE: 5, AUTO_GAIN: 2, AUTO_SEC: 2,
    TELE_GAIN: 1, TELE_SEC: 1,
    VAULT_CUBE: 5, PARK: 5, CLIMB: 30,
  },
  // Robot select: styled after elite 2018 teams (visual homage, not replicas)
  ROBOTS: [
    { id: 'r1678', team: '1678', name: 'Lemon Zest', style: 'wcd',
      accent: 0x1c5fd6, plate: 0x9fb4d8,
      desc: 'West Coast tank drive · twin-column elevator · side-roller intake' },
    { id: 'r254', team: '254', name: 'Poof-style', style: 'swerve',
      accent: 0x0a2a6b, plate: 0xc9a227,
      desc: 'Swerve drive · center elevator · top-roller claw' },
    { id: 'r1323', team: '1323', name: 'MadTown-style', style: 'swerve',
      accent: 0xb02020, plate: 0x2a2d33,
      desc: 'Swerve drive · single-column elevator · wide intake' },
  ],
  AUDIO: { enabled: true },
};
