// Official 2018 scoring (values filled from rules research).
export const SCORE = {
  AUTO_LINE: 5,
  AUTO_GAIN: 2, AUTO_SEC: 2,
  TELE_GAIN: 1, TELE_SEC: 1,
  VAULT_CUBE: 5,
  PARK: 5, CLIMB: 30,
};
export function fmtTime(s) {
  s = Math.ceil(s);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
