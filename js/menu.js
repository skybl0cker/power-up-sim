// Cinematic main menu + robot select with 3D turntable preview.
import { CFG } from './config.js';
import { audio } from './audio.js';

export class Menu {
  constructor(callbacks) {
    this.cb = callbacks; // {onStart, onSelect(i), onHelp}
    this.visible = true;
    this.selectOpen = false;
    this._build();
  }
  _build() {
    const m = document.getElementById('menu');
    document.getElementById('btn-start').onclick = () => { audio.init(); audio.resume(); audio.click(); this.hide(); this.cb.onStart(); };
    document.getElementById('btn-robots').onclick = () => { audio.init(); audio.click(); this.showSelect(); };
    document.getElementById('btn-how').onclick = () => { audio.click(); this.cb.onHelp(); };
    document.getElementById('btn-back').onclick = () => { audio.click(); this.hideSelect(); };
    const cards = document.getElementById('robot-cards');
    CFG.ROBOTS.forEach((r, i) => {
      const d = document.createElement('div');
      d.className = 'robot-card' + (i === 0 ? ' selected' : '');
      d.innerHTML = `<div class="rc-team">${r.team}</div><div class="rc-name">${r.name}</div><div class="rc-desc">${r.desc}</div>`;
      d.onclick = () => {
        audio.click();
        cards.querySelectorAll('.robot-card').forEach(c => c.classList.remove('selected'));
        d.classList.add('selected');
        this.cb.onSelect(i);
      };
      cards.appendChild(d);
    });
  }
  show() { document.getElementById('menu').style.display = 'flex'; this.visible = true; }
  hide() { document.getElementById('menu').style.display = 'none'; this.visible = false; this.hideSelect(); }
  showSelect() { document.getElementById('robot-select').hidden = false; document.getElementById('menu-main').hidden = true; this.selectOpen = true; }
  hideSelect() { document.getElementById('robot-select').hidden = true; document.getElementById('menu-main').hidden = false; this.selectOpen = false; }
}
