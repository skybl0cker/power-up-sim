// FMS-style HUD: match clock, phase, live score, ownership chips,
// vault meter segments, power-up timers.
import { fmtTime } from './scoring.js';
const $ = id => document.getElementById(id);

function chip(el, label, owner) {
  el.textContent = `${label} ${owner ? owner.toUpperCase() : '—'}`;
  el.className = 'own-chip' + (owner === 'blue' ? ' b' : owner === 'red' ? ' r' : '');
}

export function updateHUD(match, robot) {
  $('timer').textContent = fmtTime(match.timeLeft());
  const ph = { pre: 'PRE-MATCH', menu: 'MENU', auto: 'AUTONOMOUS', teleop: 'TELEOP', done: 'MATCH END' }[match.phase] || match.phase;
  $('phase').textContent = (match.endgame() ? 'ENDGAME — ' : '') + ph;
  $('phase').className = match.endgame() ? 'endgame' : '';
  $('score').textContent = match.score;
  const f = match.field;
  chip($('own-scale'), 'SCALE', f.scaleOwner);
  chip($('own-switch'), 'SWITCH', f.switchOwner);
  // vault meter: 9 segments
  const vm = $('vault-meter');
  if (vm.children.length !== 9) { vm.innerHTML = ''; for (let i = 0; i < 9; i++) vm.appendChild(document.createElement('i')); }
  for (let i = 0; i < 9; i++) vm.children[i].className = i < match.vaultStock ? 'on' : '';
  const pu = [];
  if (match.powerups.force > 0) pu.push(`FORCE ${match.powerups.force.toFixed(0)}s`);
  if (match.powerups.boost > 0) pu.push(`BOOST ${match.powerups.boost.toFixed(0)}s`);
  if (match.powerups.levitate) pu.push('LEVITATE ✓');
  $('sub2').textContent = pu.join(' · ');
  $('sub3').textContent = match.phase === 'done'
    ? `Final score: ${match.score}${match.climbed ? ' (climb!)' : match.parked ? ' (park)' : ''} — press R to reset`
    : '';
  $('holding').textContent = robot.held ? 'Holding: CUBE' : '';
  const hintEl = $('hint');
  if (match.phase === 'pre') {
    hintEl.textContent = `Press SPACE — auto [1-4]: ${match.routines[match.autoRoutine]}`;
    $('sub1').textContent = '';
  } else {
    $('sub1').textContent = match.phase === 'auto' ? 'Autonomous running…' : '';
    hintEl.textContent = match.phase === 'teleop'
      ? 'W/S drive · A/D strafe · J/L turn · hold F pickup · hold Space score · X drop · 1/2/3 elevator · Z/B/L power-ups · K climb (endgame) · C camera'
      : '';
  }
}
