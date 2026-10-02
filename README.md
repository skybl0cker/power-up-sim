# Power Up 2018 — 3D Practice Simulator

A static Three.js (CDN importmap, no build step, GitHub-Pages-ready) solo-practice
simulator for the **2018 FIRST Robotics Competition game, FIRST POWER UP**.

Open `index.html` in a browser. No build, no server needed.

## The reference robot: 1678 "Lemon Zest"

The player robot is modeled (blocky CAD-style primitives) on **Team 1678, Citrus
Circuits' 2018 robot "Lemon Zest"**, whose full CAD release is public:

- CAD release thread (full-robot render inspected): https://www.chiefdelphi.com/t/team-1678-citrus-circuits-2018-cad-release/166149
- GrabCAD model (STEP of the full robot): https://grabcad.com/library/lemon-zest-frc-team-1678-2018-1
- Team's robot page: https://www.citruscircuits.org/our-robots
- 2018 build blog: https://www.citruscircuits.org/bb18.html
- Season recap: https://www.youtube.com/watch?v=8MW4hBp1rvE
- TBA 2018: https://www.thebluealliance.com/team/1678/2018

Modeled features: West Coast tank drive (6 wheels, custom gearboxes), full-perimeter
blue bumpers with white **1678** number plates, tall twin-column 2-stage elevator,
1323-style side-roller intake on the carriage (animated open/close + rollers),
perforated buddy-climb ramp panel behind the elevator, extending climber hook,
red pneumatic cylinders, wire-mesh belly pan. Wheels spin, elevator travels,
intake animates on pickup/score, hook extends on climb.

## Rules & dimensions (from the 2018 Game & Season Manual)

- Field 16.46 × 8.23 m (54 × 27 ft); grey carpet.
- **Scale**: plates 0.91 × 1.22 m at 1.52 m height; tips ~9.6° max; ownership when a
  plate edge is ≤ 1.42 m for 1 s. Rungs top out at 2.13 m; platforms 2.64 × 1.05 × 0.09 m.
- **Switches** (one per alliance): plates at 0.23 m, tips ~4.8°; ownership at edge ≤ 0.15 m
  for 1 s; 4.27 m from the alliance wall.
- **Power cubes**: 0.33 × 0.33 × 0.27 m (13"). Preload 1, 6 staged by each switch,
  10 in the pile, 7 per portal. **Vault**: 3 columns × 3 cubes max.
- Match: 15 s auto + 2:15 teleop (+30 s endgame within teleop).

Primary rule source: 2018 FRC Game & Season Manual
(mirror: https://bpsrobotics.org/1510/manuals/2018.pdf; team updates; Wikipedia;
Chief Delphi 2018 cheatsheet).

## Controls (tank drive, like the real robot)

| Key | Action |
|---|---|
| W/S | Throttle forward/back |
| A/D | Turn left/right |
| Q/E | Fine rotate |
| F | Pick up cube (floor/portal) |
| 1/2/3 | Elevator: stow / switch / scale height |
| Space | Score held cube (scale / switch / vault) |
| X | Drop held cube |
| Z / X / C | Power-ups: FORCE / BOOST / LEVITATE (spend vault cubes) |
| K | Climb the scale rung (endgame, near scale) |
| C | Camera: follow / driver / orbit / top |
| P / R / H | Pause / reset / help |

Pre-match: press **Space** to start, **1–4** to pick an auto routine
(Cross line / Switch / Scale / Manual-drive auto).

## Scoring implemented

- Auto: cross auto line +5; scale/switch ownership +2 gain + 2/s.
- Teleop: ownership +1 gain + 1/s each (scale, switch). Vault deposit +5 (max 9).
- Power-ups: FORCE 10 s (opponent... solo: scale sway assist), BOOST 2× accrual 10 s,
  LEVITATE (3 cubes) = free climb +30 at match end.
- Endgame: climb on the rung +30, park +5.

## Honest limitations

- **Solo practice only** — one robot, no opponents, no defense, no fouls, no ranking points.
- Vault restocking via portals is simplified (infinite cube flow).
- Auto routines use generic waypoints, not real match paths.
- Seesaws are spring-damper approximations, not rigid-body physics; no robot–field
  collision (you can drive through structures).
- The robot is a photo/CAD-inspired approximation from primitives, not the CAD itself;
  wheel count/type and intake geometry are eyeballed from renders and match footage.
- FORCE power-up has no opponent in solo mode (grants brief ownership hold instead).
- Headless/CI note: `?shot=top|field|robot|scale|driver` camera presets and `?auto=N`
  auto-start exist for screenshot verification.
