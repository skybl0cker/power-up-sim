// Keyboard input with edge detection.
export class Input {
  constructor() {
    this.keys = {};
    this.pressed = {};
    this.helpToggled = false;
    addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (!this.keys[k]) this.pressed[k] = true;
      this.keys[k] = true;
      if (k === 'h') { this.helpToggled = true; const el = document.getElementById('help'); el.hidden = !el.hidden; }
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    this.mx = 0; this.my = 0;
    addEventListener('mousemove', e => { this.mx = e.movementX || 0; this.my = e.movementY || 0; });
  }
  poll() {
    for (const k in this.pressed) this.pressed[k] = false;
    this.helpToggled = false;
    this.mdx = this.mx; this.mdy = this.my; this.mx = 0; this.my = 0;
  }
  down(k) { return !!this.keys[k]; }
  hit(k) { return !!this.pressed[k]; }
  // field-relative drive axes: x strafe (A/D), y forward (W/S), rot (Q/E)
  driveAxes() {
    let x = 0, y = 0, r = 0;
    if (this.down('w') || this.down('arrowup')) y += 1;
    if (this.down('s') || this.down('arrowdown')) y -= 1;
    if (this.down('a') || this.down('arrowleft')) x -= 1;
    if (this.down('d') || this.down('arrowright')) x += 1;
    if (this.down('q')) r += 1;
    if (this.down('e')) r -= 1;
    const n = Math.hypot(x, y);
    if (n > 1) { x /= n; y /= n; }
    return { x, y, r };
  }
}
