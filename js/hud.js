import { fmtTime } from './scoring.js';
const $ = id => document.getElementById(id);
export function updateHUD(match, robot) {
  $('timer').textContent = fmtTime(match.timeLeft());
  const ph = { pre: 'PRE-MATCH', auto: 'AUTONOMOUS', teleop: 'TELEOP', done: 'MATCH END' }[match.phase];
  $('phase').textContent = (match.endgame() ? 'ENDGAME — ' : '') + ph;
  $('score').textContent = match.score;
  const f = match.field;
  const own = (o) => o === 'blue' ? 'BLUE' : o === 'red' ? 'RED' : '—';
  $('sub1').textContent = match.phase === 'pre'
    ? 'Press SPACE — auto [1-4]: ' + match.routines[match.autoRoutine]
    : `Scale: ${own(f.scaleOwner)}  Switch: ${own(f.switchOwner)}  Vault: ${match.vaultStock}/9`;
  const pu = [];
  if (match.powerups.force > 0) pu.push(`FORCE ${match.powerups.force.toFixed(0)}s`);
  if (match.powerups.boost > 0) pu.push(`BOOST ${match.powerups.boost.toFixed(0)}s`);
  if (match.powerups.levitate) pu.push('LEVITATE ✓');
  $('sub2').textContent = pu.join(' · ');
  $('sub3').textContent = match.phase === 'done'
    ? `Final score: ${match.score}${match.climbed ? ' (climb!)' : match.parked ? ' (park)' : ''} — press R to reset`
    : '';
  $('holding').textContent = robot.held ? 'Holding: CUBE' : '';
  $('hint').textContent = match.phase === 'teleop'
    ? 'W/S drive · A/D strafe · J/L turn · hold F pickup · hold Space score · X drop · 1/2/3 elevator · Z/B/L power-ups · K climb (endgame) · C camera'
    : match.phase === 'auto' ? 'Autonomous running…' : '';
}
