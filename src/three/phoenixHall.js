// Procedural Phoenix Hall (Byodo-in style) — code-only reconstruction of the reference render.
// Units ≈ metres. +X lateral, +Y up, +Z = facade ("front"). Deterministic (seeded) noise only.
import * as THREE from 'three';

const FLOOR = 1.0;
let _seed = 1337;
const rnd = () => ((_seed = (_seed * 1664525 + 1013904223) >>> 0) / 4294967296);

/* ----------------------------------------------------------------- textures */
function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function speckle(ctx, w, h, n, a, cols) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = cols[(rnd() * cols.length) | 0]; ctx.globalAlpha = a * rnd();
    ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
  }
  ctx.globalAlpha = 1;
}

function makeMaterials() {
  const tile = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#46557a'; g.fillRect(0, 0, w, h);
    const cols = 8, cw = w / cols;
    for (let i = 0; i < cols; i++) {            // convex tile ridges running down-slope
      const gr = g.createLinearGradient(i * cw, 0, (i + 1) * cw, 0);
      gr.addColorStop(0, '#2c3856'); gr.addColorStop(0.45, '#6c7fa8'); gr.addColorStop(0.62, '#516190'); gr.addColorStop(1, '#161d2e');
      g.fillStyle = gr; g.fillRect(i * cw, 0, cw, h);
    }
    for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(10,14,26,0.55)'; g.fillRect(0, y, w, 3); }
    speckle(g, w, h, 900, 0.35, ['#8fa0c4', '#10141f', '#5a6a8c']);
  }, [1, 1]);
  const plaster = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e6dfd0'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 1400, 0.25, ['#bdb4a0', '#fff8ea', '#a79d88']);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(120,105,80,0.07)'; g.fillRect(rnd() * w, 0, 6 + rnd() * 18, h); }
  }, [2, 1]);
  const stone = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#7b7a77'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 4000, 0.4, ['#6c6a66', '#a9a69f', '#b8b4ab', '#5e5c58']);
    g.strokeStyle = 'rgba(40,38,36,0.5)'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  }, [4, 1]);
  const gravel = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#a3a19d'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 6000, 0.5, ['#dcdad6', '#82807c', '#c6c4c0', '#96948f']);
  }, [6, 6]);
  const door = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8f1f14'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#4a0d08'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
    for (let y = 22; y < h; y += 42) for (let x = 22; x < w; x += 42) {
      g.fillStyle = '#d7aa44'; g.beginPath(); g.arc(x, y, 4.5, 0, 6.3); g.fill();
    }
    speckle(g, w, h, 500, 0.3, ['#c6361f', '#5a0f09']);
  }, [1, 1]);
  const red = canvasTex(128, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#8e1d12'); gr.addColorStop(0.5, '#c23a22'); gr.addColorStop(1, '#8a1b11');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 500, 0.3, ['#e0553a', '#5c0f08']);
  }, [1, 2]);

  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    tile: std({ map: tile, roughness: 0.42, metalness: 0.18, side: THREE.DoubleSide, color: 0xffffff }),
    tileRidge: std({ color: 0x3c4a6c, roughness: 0.4, metalness: 0.2 }),
    cream: std({ color: 0xf1e9d6, roughness: 0.6, side: THREE.DoubleSide }),
    soffit: std({ color: 0xa6291a, roughness: 0.6, side: THREE.DoubleSide }),
    red: std({ map: red, color: 0xffffff, roughness: 0.5 }),
    redFlat: std({ color: 0xb02c1c, roughness: 0.5 }),
    redDark: std({ color: 0x6e140c, roughness: 0.7 }),
    plaster: std({ map: plaster, color: 0xffffff, roughness: 0.85 }),
    stone: std({ map: stone, color: 0xffffff, roughness: 0.95 }),
    stoneTop: std({ map: gravel, color: 0xffffff, roughness: 1 }),
    door: std({ map: door, color: 0xffffff, roughness: 0.55 }),
    gold: std({ color: 0xe0b040, roughness: 0.28, metalness: 0.95 }),
    green: std({ color: 0x2f7a54, roughness: 0.5 }),
    wood: std({ color: 0x3a2018, roughness: 0.8 }),
    shadow: new THREE.ShadowMaterial({ opacity: 0.45 }),
  };
}

/* ------------------------------------------------------------ small helpers */
function box(w, h, d, x, y, z, mat, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
function cyl(r0, r1, h, x, y, z, mat, parent, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, seg), mat);
  m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
function inst(geo, mat, mats, parent) {
  const im = new THREE.InstancedMesh(geo, mat, mats.length);
  mats.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = im.receiveShadow = true;
  im.instanceMatrix.needsUpdate = true; parent.add(im); return im;
}
const M4 = (x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));

/** Row of vermilion posts with stone footing + capital block. pts = [[x,z],...] */
function posts(pts, y0, h, r, mats, parent) {
  const body = [], foot = [], cap = [];
  pts.forEach(([x, z]) => {
    body.push(M4(x, y0 + h / 2, z, r, h, r));
    foot.push(M4(x, y0 + 0.07, z, r * 1.25, 0.14, r * 1.25));
    cap.push(M4(x, y0 + h - 0.05, z, r * 1.2, 0.1, r * 1.2));
  });
  inst(new THREE.CylinderGeometry(1, 1.04, 1, 14), mats.red, body, parent);
  inst(new THREE.CylinderGeometry(1, 1.1, 1, 14), mats.stone, foot, parent);
  inst(new THREE.CylinderGeometry(1.06, 1, 1, 14), mats.redDark, cap, parent);
}

/** Stepped bracket cluster (tokyo) on top of each post: 3 tiers + arms along both axes. */
function brackets(pts, y, scale, mats, parent) {
  const t1 = [], t2 = [], t3 = [], armX = [], armZ = [], dots = [];
  pts.forEach(([x, z]) => {
    t1.push(M4(x, y + 0.09 * scale, z, 0.55 * scale, 0.18 * scale, 0.55 * scale));
    t2.push(M4(x, y + 0.27 * scale, z, 1.05 * scale, 0.17 * scale, 0.5 * scale));
    t2.push(M4(x, y + 0.27 * scale, z, 0.5 * scale, 0.17 * scale, 1.05 * scale));
    t3.push(M4(x, y + 0.45 * scale, z, 1.7 * scale, 0.16 * scale, 0.42 * scale));
    t3.push(M4(x, y + 0.45 * scale, z, 0.42 * scale, 0.16 * scale, 1.7 * scale));
    for (const s of [-1, 1]) {
      dots.push(M4(x + s * 0.8 * scale, y + 0.45 * scale, z, 0.07 * scale, 0.07 * scale, 0.07 * scale));
      dots.push(M4(x, y + 0.45 * scale, z + s * 0.8 * scale, 0.07 * scale, 0.07 * scale, 0.07 * scale));
    }
  });
  const g = new THREE.BoxGeometry(1, 1, 1);
  inst(g, mats.redFlat, t1, parent); inst(g, mats.cream, t2, parent); inst(g, mats.redFlat, t3, parent);
  inst(new THREE.SphereGeometry(1, 6, 5), mats.gold, dots, parent);
}

/* ------------------------------------------------------------------- roofs */
const sidePoint = (s, a, w, d) =>
  s === 0 ? [-w + 2 * w * a, d] : s === 1 ? [w, d - 2 * d * a] : s === 2 ? [w - 2 * w * a, -d] : [-w, -d + 2 * d * a];

/**
 * Lofted curved roof: concave slope (eave-flat, ridge-steep), up-turned corners, real thickness,
 * cream fascia, red soffit, ridge/hip cap tubes and gold rafter-end studs on the eave.
 */
function roof(mats, o) {
  const { cx = 0, cz = 0, hw, hd, y0, rise, rhw = 0, rhd = 0, k = 1.4, lift = 0.6, steps = 14, N = 18,
    thick = 0.3, skip = [], tileW = 0.34, studs = true, hipCaps = true } = o;
  const g = new THREE.Group();
  const loops = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, w = hw + (rhw - hw) * t, d = hd + (rhd - hd) * t, yb = y0 + rise * Math.pow(t, k);
    loops.push({ w, d, yb, t });
  }
  const sideLen = [2 * hw, 2 * hd, 2 * hw, 2 * hd];
  const sideOff = [0, sideLen[0], sideLen[0] + sideLen[1], sideLen[0] + sideLen[1] + sideLen[2]];
  const P = (i, s, a, dy = 0) => {
    const L = loops[i], [x, z] = sidePoint(s, a, L.w, L.d);
    const cw = Math.pow(Math.abs(x) / Math.max(L.w, 1e-3), 3) * Math.pow(Math.abs(z) / Math.max(L.d, 1e-3), 3);
    const eaveEdge = (s % 2 === 0) ? Math.pow(Math.abs(x) / Math.max(L.w, 1e-3), 6) : Math.pow(Math.abs(z) / Math.max(L.d, 1e-3), 6);
    const y = L.yb + lift * Math.pow(1 - L.t, 1.6) * (cw * 1.0 + eaveEdge * 0.25) + dy;
    return [cx + x, y, cz + z];
  };
  const build = (dy, flip) => {
    const pos = [], uv = [], idx = [];
    for (let s = 0; s < 4; s++) {
      if (skip.includes(s)) continue;
      const base = pos.length / 3;
      for (let i = 0; i <= steps; i++) for (let j = 0; j <= N; j++) {
        const a = j / N; pos.push(...P(i, s, a, dy));
        uv.push((sideOff[s] + a * sideLen[s]) / tileW / 8, loops[i].t * 6);
      }
      for (let i = 0; i < steps; i++) for (let j = 0; j < N; j++) {
        const a = base + i * (N + 1) + j, b = a + 1, c = a + N + 1, d2 = c + 1;
        if (flip) idx.push(a, b, c, b, d2, c); else idx.push(a, c, b, b, c, d2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  };
  const top = new THREE.Mesh(build(0, false), mats.tile); top.castShadow = top.receiveShadow = true; g.add(top);
  const under = new THREE.Mesh(build(-thick, true), mats.soffit); under.receiveShadow = true; g.add(under);

  // fascia strip around the eave (cream), slightly proud
  const fpos = [], fidx = [];
  for (let s = 0; s < 4; s++) {
    if (skip.includes(s)) continue;
    const base = fpos.length / 3;
    for (let j = 0; j <= N; j++) { const a = j / N; fpos.push(...P(0, s, a, 0.02), ...P(0, s, a, -thick)); }
    for (let j = 0; j < N; j++) { const a = base + j * 2; fidx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3)); fg.setIndex(fidx); fg.computeVertexNormals();
  const fascia = new THREE.Mesh(fg, mats.soffit); fascia.castShadow = true; g.add(fascia);
  const lp = [];
  for (let s = 0; s < 4; s++) { if (skip.includes(s)) continue; const b = lp.length / 3;
    for (let j = 0; j <= N; j++) { const a = j / N; lp.push(...P(0, s, a, 0.05), ...P(0, s, a, -0.07)); } }
  const li = []; for (let b = 0, s = 0; s < 4; s++) { if (skip.includes(s)) continue; for (let j = 0; j < N; j++) { const a = (b * (N + 1) + j) * 2; li.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } b++; }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setIndex(li); lg.computeVertexNormals();
  g.add(new THREE.Mesh(lg, mats.cream));

  // hip + ridge caps
  if (hipCaps) {
    const capR = 0.13;
    const corners = [[0, 1], [1, 1], [2, 1], [3, 1]].map(([s, a], n) => {
      const pts = loops.map((_, i) => new THREE.Vector3(...P(i, s, a, capR * 0.4)));
      return pts;
    });
    corners.forEach((pts, n) => {
      if (skip.includes(n) && skip.includes((n + 1) % 4)) return;
      if (pts[0].distanceTo(pts[pts.length - 1]) < 0.2) return;
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, capR, 8), mats.tileRidge);
      tube.castShadow = true; g.add(tube);
    });
    const topL = loops[steps];
    if (rhw > 0.05 || rhd > 0.05) {
      const long = rhw >= rhd;
      const a = long ? new THREE.Vector3(cx - rhw, 0, cz) : new THREE.Vector3(cx, 0, cz - rhd);
      const b = long ? new THREE.Vector3(cx + rhw, 0, cz) : new THREE.Vector3(cx, 0, cz + rhd);
      a.y = b.y = topL.yb + capR * 0.9;
      const len = a.distanceTo(b);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(capR * 1.35, capR * 1.35, len, 10), mats.tileRidge);
      r.position.copy(a).add(b).multiplyScalar(0.5); r.rotation.z = long ? Math.PI / 2 : 0; r.rotation.x = long ? 0 : Math.PI / 2;
      r.castShadow = true; g.add(r);
    }
  }
  // gold rafter-end studs under the eave
  if (studs) {
    const ms = [];
    for (let s = 0; s < 4; s++) {
      if (skip.includes(s)) continue;
      const n = Math.max(3, Math.round(sideLen[s] / 0.42));
      for (let j = 0; j <= n; j++) {
        const [x, y, z] = P(0, s, j / n, -thick * 0.62);
        const out = s === 0 ? [0, 1] : s === 1 ? [1, 0] : s === 2 ? [0, -1] : [-1, 0];
        ms.push(M4(x + out[0] * 0.02, y, z + out[1] * 0.02, 0.07, 0.07, 0.07));
      }
    }
    inst(new THREE.SphereGeometry(1, 6, 5), mats.gold, ms, g);
  }
  g.userData.eaveY = y0; return g;
}

/* ---------------------------------------------------------------- ornaments */
function phoenix(mats) {
  const g = new THREE.Group(), gold = mats.gold;
  const add = (geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
    const m = new THREE.Mesh(geo, gold); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz);
    m.castShadow = true; g.add(m); return m;
  };
  cyl(0.35, 0.25, 0.3, 0, 0, 0, gold, g, 10);                                     // pedestal
  add(new THREE.SphereGeometry(0.34, 14, 10), 0, 0.62, 0, 0, 0, 0, 0.8, 0.85, 1.3); // body
  const neck = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.7, 0.3), new THREE.Vector3(0, 0.95, 0.5), new THREE.Vector3(0, 1.2, 0.45)]);
  g.add(Object.assign(new THREE.Mesh(new THREE.TubeGeometry(neck, 10, 0.1, 8), gold), { castShadow: true }));
  add(new THREE.SphereGeometry(0.13, 10, 8), 0, 1.27, 0.45);                      // head
  add(new THREE.ConeGeometry(0.05, 0.22, 8), 0, 1.24, 0.65, Math.PI / 2 + 0.2);   // beak
  add(new THREE.ConeGeometry(0.04, 0.3, 6), 0, 1.45, 0.35, -0.5);                 // crest
  for (const s of [-1, 1]) {                                                       // spread wings
    add(new THREE.SphereGeometry(0.5, 12, 6), s * 0.55, 0.95, -0.05, 0, s * 0.3, s * -0.75, 1.0, 0.07, 0.55);
    add(new THREE.SphereGeometry(0.4, 12, 6), s * 0.85, 1.12, -0.1, 0, s * 0.3, s * -0.95, 1.0, 0.05, 0.4);
  }
  for (let i = -2; i <= 2; i++) {                                                  // tail fan
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.55, -0.3), new THREE.Vector3(i * 0.18, 0.7, -0.8), new THREE.Vector3(i * 0.42, 0.45, -1.35)]);
    const t = new THREE.Mesh(new THREE.TubeGeometry(c, 12, 0.045, 6), gold); t.castShadow = true; g.add(t);
  }
  return g;
}

function houju(mats) {
  const g = new THREE.Group();
  const prof = [[0, 0], [0.46, 0], [0.46, 0.1], [0.3, 0.16], [0.3, 0.3], [0.5, 0.42], [0.56, 0.62], [0.42, 0.88], [0.18, 1.08], [0.09, 1.28], [0, 1.5]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 20), mats.gold); m.castShadow = true; g.add(m);
  return g;
}

function railing(x0, z0, x1, z1, y, mats, parent, h = 0.85) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(-(z1 - z0), x1 - x0);
  const grp = new THREE.Group(); grp.position.set(x0, y, z0); grp.rotation.y = ang; parent.add(grp);
  box(len, 0.1, 0.12, len / 2, h, 0, mats.redFlat, grp); box(len, 0.08, 0.1, len / 2, 0.15, 0, mats.redFlat, grp);
  box(len, 0.07, 0.07, len / 2, h * 0.52, 0, mats.redFlat, grp);
  const n = Math.max(2, Math.round(len / 0.9)), ms = [];
  for (let i = 0; i <= n; i++) ms.push(M4((len * i) / n, h / 2, 0, 0.09, h, 0.09));
  inst(new THREE.BoxGeometry(1, 1, 1), mats.redFlat, ms, grp);
  const kn = [];
  for (let i = 0; i <= n; i++) kn.push(M4((len * i) / n, h + 0.09, 0, 0.1, 0.1, 0.1));
  inst(new THREE.SphereGeometry(1, 8, 6), mats.gold, kn, grp);
}

/** Wall bay: plaster panel framed by red beams (lintel + sill) */
function wallPanel(x, y, z, w, h, axis, mats, parent) {
  const [bw, bd] = axis === 'x' ? [w, 0.22] : [0.22, w];
  box(bw, h, bd, x, y, z, mats.plaster, parent);
  box(axis === 'x' ? w : 0.3, 0.16, axis === 'x' ? 0.3 : w, x, y + h - 0.16, z, mats.redFlat, parent);
  box(axis === 'x' ? w : 0.3, 0.14, axis === 'x' ? 0.3 : w, x, y, z, mats.redFlat, parent);
}

/* -------------------------------------------------------------------- build */
export function createPhoenixHallModel() {
  _seed = 1337;
  const mats = makeMaterials();
  const root = new THREE.Group(); root.name = 'PhoenixHall';
  const parts = [];                                  // explodable + clickable top-level parts
  const part = (id, label, explode = [0, 0, 0]) => {
    const g = new THREE.Group(); g.name = id; g.userData = { partId: id, label, explode: new THREE.Vector3(...explode), home: new THREE.Vector3() };
    root.add(g); parts.push(g); return g;
  };

  /* ---- platform --------------------------------------------------------- */
  const plat = part('platform', 'Stone platform & stairs', [0, -3, 0]);
  const slab = (x0, x1, z0, z1, h = FLOOR) => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const s = box(w, h - 0.12, d, cx, 0, cz, mats.stone, plat);
    s.material = mats.stone.clone(); s.material.map = mats.stone.map.clone(); s.material.map.repeat.set(w / 3, 1); s.material.map.needsUpdate = true;
    const cap = box(w + 0.22, 0.14, d + 0.22, cx, h - 0.14, cz, mats.stoneTop, plat);
    cap.material = mats.stoneTop.clone(); cap.material.map = mats.stoneTop.map.clone(); cap.material.map.repeat.set(w / 3, d / 3); cap.material.map.needsUpdate = true;
  };
  slab(-10, 10, -8, 7.8);                       // hall plinth
  slab(-23, -9.4, -3.6, 3.8); slab(9.4, 23, -3.6, 3.8);   // wing + tower plinths
  slab(-22.8, -16.2, 3.6, 13.6); slab(16.2, 22.8, 3.6, 13.6); // forward corridor plinths
  for (let i = 0; i < 4; i++) {                  // central stairs (solid steps down to ground)
    const h = FLOOR - 0.25 * (i + 1);
    box(5.2, h, 0.5, 0, 0, 7.8 + 0.25 + i * 0.5, mats.stoneTop, plat);
  }
  for (const s of [-1, 1]) box(0.5, 0.78, 2.1, s * 2.85, 0, 8.85, mats.stone, plat);

  /* ---- hall body -------------------------------------------------------- */
  const body = part('hall-body', 'Hall body (posts, walls, doors)', [0, 0, 0]);
  box(15.6, 0.12, 12.2, 0, FLOOR, 0, mats.wood, body);                               // deck
  // outer (mokoshi) ring posts
  const ring = [];
  [-7.2, -4.8, -2.4, 0, 2.4, 4.8, 7.2].forEach((x) => { ring.push([x, 5.5], [x, -5.5]); });
  [-2.75, 0, 2.75].forEach((z) => { ring.push([7.2, z], [-7.2, z]); });
  posts(ring, FLOOR + 0.12, 3.5, 0.19, mats, body);
  brackets(ring, FLOOR + 0.12 + 3.5, 1.0, mats, body);
  // ring beams
  [[0, 5.5, 14.4, 'x'], [0, -5.5, 14.4, 'x']].forEach(([x, z, l]) => box(l, 0.2, 0.26, x, FLOOR + 0.12 + 2.9, z, mats.redFlat, body));
  [7.2, -7.2].forEach((x) => box(0.26, 0.2, 11, x, FLOOR + 0.12 + 2.9, 0, mats.redFlat, body));
  // outer ring balustrade (front + sides), open grid at back is fine
  railing(-7.2, 5.5, 7.2, 5.5, FLOOR + 0.12, mats, body, 0.8);
  railing(7.2, 5.5, 7.2, -5.5, FLOOR + 0.12, mats, body, 0.8);
  railing(-7.2, -5.5, -7.2, 5.5, FLOOR + 0.12, mats, body, 0.8);
  railing(7.2, -5.5, -7.2, -5.5, FLOOR + 0.12, mats, body, 0.8);

  // inner core: 3 x 2 bays
  const cx = [-5, -1.67, 1.67, 5], cz = [-3.3, 0, 3.3];
  const core = [];
  cx.forEach((x) => { core.push([x, 3.3], [x, -3.3]); }); [0].forEach((z) => { core.push([5, z], [-5, z]); });
  const coreY = FLOOR + 0.12, coreH = 3.9;
  posts(core, coreY, coreH, 0.22, mats, body);
  // plaster walls (lower core): sides + back; front side only outer bays
  for (let i = 0; i < 3; i++) {
    const xm = (cx[i] + cx[i + 1]) / 2, w = cx[i + 1] - cx[i] - 0.3;
    wallPanel(xm, coreY + 0.4, -3.3, w, coreH - 0.4, 'x', mats, body);
    if (i !== 1) wallPanel(xm, coreY + 0.4, 3.3, w, coreH - 0.4, 'x', mats, body);
  }
  for (let i = 0; i < 2; i++) { const zm = (cz[i] + cz[i + 1]) / 2, w = 3.3 - 0.3; wallPanel(5, coreY + 0.4, zm, w, coreH - 0.4, 'z', mats, body); wallPanel(-5, coreY + 0.4, zm, w, coreH - 0.4, 'z', mats, body); }
  // central doors (gold-stud red leaves)
  const doorW = 3.04;
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(doorW, coreH - 0.3, 0.14), mats.door); d.position.set(s * 1.66, coreY + (coreH - 0.3) / 2 + 0.05, 3.3); d.castShadow = d.receiveShadow = true; body.add(d);
  }
  box(6.3, 0.22, 0.3, 0, coreY + coreH - 0.22, 3.3, mats.redFlat, body);
  // core beams + tie beams
  for (const z of [3.3, -3.3]) box(10.4, 0.22, 0.3, 0, coreY + coreH - 0.02, z, mats.redFlat, body);
  for (const x of [5, -5]) box(0.3, 0.22, 6.8, x, coreY + coreH - 0.02, 0, mats.redFlat, body);
  brackets(core, coreY + coreH + 0.17, 1.15, mats, body);
  // interior dark volume so the open bays read as deep
  box(9.6, 3.2, 6.0, 0, coreY, 0, mats.wood, body);

  // upper storey
  const upY = coreY + coreH + 0.17 + 0.8;
  const up = [];
  cx.forEach((x) => { up.push([x, 3.3], [x, -3.3]); }); up.push([5, 0], [-5, 0]);
  posts(up, upY, 2.15, 0.17, mats, body);
  for (let i = 0; i < 3; i++) { const xm = (cx[i] + cx[i + 1]) / 2, w = cx[i + 1] - cx[i] - 0.3; wallPanel(xm, upY + 0.2, 3.3, w, 1.8, 'x', mats, body); wallPanel(xm, upY + 0.2, -3.3, w, 1.8, 'x', mats, body); }
  for (let i = 0; i < 2; i++) { const zm = (cz[i] + cz[i + 1]) / 2; wallPanel(5, upY + 0.2, zm, 3.0, 1.8, 'z', mats, body); wallPanel(-5, upY + 0.2, zm, 3.0, 1.8, 'z', mats, body); }
  box(10.8, 0.5, 6.9, 0, coreY + coreH + 0.17, 0, mats.wood, body).scale.set(1, 0.4, 1); // deck under upper storey
  brackets(up, upY + 2.15, 1.3, mats, body);
  // upper gallery balustrade
  railing(-5.7, 4.0, 5.7, 4.0, coreY + coreH + 0.2, mats, body, 0.7);
  railing(5.7, 4.0, 5.7, -4.0, coreY + coreH + 0.2, mats, body, 0.7);
  railing(-5.7, -4.0, -5.7, 4.0, coreY + coreH + 0.2, mats, body, 0.7);
  railing(5.7, -4.0, -5.7, -4.0, coreY + coreH + 0.2, mats, body, 0.7);

  /* ---- hall roofs ------------------------------------------------------- */
  const mok = part('hall-pent-roof', 'Mokoshi pent roof', [0, 2.5, 0]);
  mok.add(roof(mats, { hw: 8.0, hd: 6.3, y0: FLOOR + 0.12 + 3.5 + 0.9, rise: 1.5, rhw: 5.5, rhd: 3.9, k: 1.15, lift: 0.45, thick: 0.25 }));
  // projecting entrance porch roofs on the facade
  mok.add(roof(mats, { cx: 0, cz: 6.4, hw: 3.4, hd: 2.0, y0: FLOOR + 0.12 + 3.5 + 0.9, rise: 1.0, rhw: 2.6, rhd: 0.0, k: 1.2, lift: 0.4, skip: [2], thick: 0.22 }));
  const topRoof = part('hall-main-roof', 'Main hip-and-gable roof', [0, 6, 0]);
  const rY = upY + 2.15 + 0.75;
  topRoof.add(roof(mats, { hw: 9.0, hd: 7.1, y0: rY, rise: 4.2, rhw: 3.6, rhd: 0, k: 1.5, lift: 0.7, thick: 0.38, N: 24, steps: 18 }));
  // end-gable pediments (white triangle with red frame) on the ridge ends
  for (const s of [-1, 1]) {
    const tri = new THREE.Shape(); tri.moveTo(-3.3, 0); tri.lineTo(3.3, 0); tri.lineTo(0, 1.6); tri.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.1, bevelEnabled: false }), mats.cream);
    m.rotation.y = s * Math.PI / 2; m.position.set(s * 3.2, rY + 2.3, 0); m.visible = false; topRoof.add(m);
  }
  const ridgeY = rY + 4.2 + 0.2;
  const phL = phoenix(mats), phR = phoenix(mats);
  phL.position.set(-3.45, ridgeY, 0); phR.position.set(3.45, ridgeY, 0);
  phL.rotation.y = Math.PI / 2 + 0.25; phR.rotation.y = -Math.PI / 2 - 0.25; phR.scale.setScalar(1.0);
  const phA = part('phoenix-left', 'Phoenix finial (left)', [-3, 6, 0]); phA.add(phL); phL.position.x = -3.45;
  const phB = part('phoenix-right', 'Phoenix finial (right)', [3, 6, 0]); phB.add(phR);

  /* ---- wings ------------------------------------------------------------ */
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'left' : 'right';
    const wing = part(`wing-${side}`, `Wing corridor (${side})`, [s * 5, 0, 0]);
    const wx0 = 7.3 * 1, wx1 = 17.5;
    const wp = [];
    for (let x = wx0 + 0.6; x <= wx1 + 0.01; x += 2.4) { wp.push([s * x, 2.0], [s * x, -2.0]); }
    posts(wp, FLOOR + 0.12, 3.1, 0.18, mats, wing);
    brackets(wp, FLOOR + 0.12 + 3.1, 0.95, mats, wing);
    box(11, 0.12, 4.6, s * 12.5, FLOOR, 0, mats.wood, wing);
    box(10.4, 0.22, 0.28, s * 12.4, FLOOR + 0.12 + 2.5, 2.0, mats.redFlat, wing);
    box(10.4, 0.22, 0.28, s * 12.4, FLOOR + 0.12 + 2.5, -2.0, mats.redFlat, wing);
    for (let x = wx0 + 0.6; x < wx1 - 0.5; x += 2.4) {                 // back wall panels
      wallPanel(s * (x + 1.2), FLOOR + 0.12 + 0.3, -2.0, 2.1, 2.4, 'x', mats, wing);
      wallPanel(s * (x + 1.2), FLOOR + 0.12 + 1.35, 2.0, 2.1, 1.35, 'x', mats, wing);
    }
    railing(s * wx0, 2.0, s * wx1, 2.0, FLOOR + 0.12, mats, wing, 0.95);
    const wr = part(`wing-roof-${side}`, `Wing roof (${side})`, [s * 5, 3, 0]);
    wr.add(roof(mats, { cx: s * 12.9, cz: 0, hw: 5.6, hd: 3.1, y0: FLOOR + 0.12 + 3.1 + 0.95, rise: 1.7, rhw: 3.4, rhd: 0.0, k: 1.3, lift: 0.5, thick: 0.25 }));

    /* ---- tower -------------------------------------------------------- */
    const tw = part(`tower-${side}`, `Corner tower (${side})`, [s * 8, 0, 0]);
    const tx = s * 19.6;
    const tp = [[tx - 1.9, 1.9], [tx + 1.9, 1.9], [tx - 1.9, -1.9], [tx + 1.9, -1.9], [tx, 1.9], [tx, -1.9], [tx - 1.9, 0], [tx + 1.9, 0]];
    posts(tp, FLOOR + 0.12, 3.1, 0.2, mats, tw);
    brackets(tp, FLOOR + 0.12 + 3.1, 1.0, mats, tw);
    box(4.8, 0.12, 4.8, tx, FLOOR, 0, mats.wood, tw);
    for (const z of [1.9, -1.9]) { wallPanel(tx - 0.95, FLOOR + 0.12 + 0.3, z, 1.5, 2.5, 'x', mats, tw); wallPanel(tx + 0.95, FLOOR + 0.12 + 0.3, z, 1.5, 2.5, 'x', mats, tw); }
    for (const x of [tx + 1.9, tx - 1.9]) { wallPanel(x, FLOOR + 0.12 + 0.3, 0.95, 1.5, 2.5, 'z', mats, tw); wallPanel(x, FLOOR + 0.12 + 0.3, -0.95, 1.5, 2.5, 'z', mats, tw); }
    box(3.8, 0.2, 3.8, tx, FLOOR + 0.12 + 3.1 + 0.9, 0, mats.wood, tw);
    const tlr = part(`tower-roof-low-${side}`, `Tower lower roof (${side})`, [s * 8, 3, 0]);
    const lowY = FLOOR + 0.12 + 3.1 + 0.95;
    tlr.add(roof(mats, { cx: tx, cz: 0, hw: 3.55, hd: 3.55, y0: lowY, rise: 1.25, rhw: 1.5, rhd: 1.5, k: 1.2, lift: 0.5, thick: 0.25 }));
    const tu = part(`tower-upper-${side}`, `Tower upper storey (${side})`, [s * 8, 5, 0]);
    const uy = lowY + 1.4;
    const tup = [[tx - 1.3, 1.3], [tx + 1.3, 1.3], [tx - 1.3, -1.3], [tx + 1.3, -1.3]];
    posts(tup, uy, 1.75, 0.15, mats, tu); brackets(tup, uy + 1.75, 0.9, mats, tu);
    for (const z of [1.3, -1.3]) { box(2.4, 1.3, 0.2, tx, uy + 0.25, z, mats.plaster, tu); box(0.9, 0.7, 0.05, tx - 0.5, uy + 0.55, z + Math.sign(z) * 0.13, mats.green, tu); box(0.9, 0.7, 0.05, tx + 0.5, uy + 0.55, z + Math.sign(z) * 0.13, mats.green, tu); }
    for (const x of [tx - 1.3, tx + 1.3]) { box(0.2, 1.3, 2.4, x, uy + 0.25, 0, mats.plaster, tu); box(0.05, 0.7, 0.9, x + Math.sign(x - tx) * 0.13, uy + 0.55, 0, mats.green, tu); }
    railing(tx - 1.75, 1.75, tx + 1.75, 1.75, uy - 0.05, mats, tu, 0.7); railing(tx + 1.75, 1.75, tx + 1.75, -1.75, uy - 0.05, mats, tu, 0.7);
    railing(tx + 1.75, -1.75, tx - 1.75, -1.75, uy - 0.05, mats, tu, 0.7); railing(tx - 1.75, -1.75, tx - 1.75, 1.75, uy - 0.05, mats, tu, 0.7);
    const tur = part(`tower-roof-up-${side}`, `Tower upper roof (${side})`, [s * 8, 8, 0]);
    const upr = uy + 1.75 + 0.8;
    tur.add(roof(mats, { cx: tx, cz: 0, hw: 3.0, hd: 3.0, y0: upr, rise: 2.5, rhw: 0, rhd: 0, k: 1.5, lift: 0.7, thick: 0.28 }));
    const hj = houju(mats); hj.position.set(tx, upr + 2.5 - 0.05, 0); hj.scale.setScalar(1.0); tur.add(hj);

    /* ---- forward gabled corridor -------------------------------------- */
    const pc = part(`porch-${side}`, `Gabled corridor (${side})`, [s * 6, 0, 6]);
    const px = tx, z0 = 2.4, z1 = 12.0;
    const pp = [];
    for (let z = z0 + 0.4; z <= z1; z += 2.4) pp.push([px - 1.5, z], [px + 1.5, z]);
    posts(pp, FLOOR + 0.12, 3.1, 0.18, mats, pc);
    brackets(pp, FLOOR + 0.12 + 3.1, 0.95, mats, pc);
    box(3.6, 0.12, 10.4, px, FLOOR, 7.2, mats.wood, pc);
    for (let z = z0 + 0.4; z < z1 - 0.5; z += 2.4) {
      for (const dx of [-1.5, 1.5]) { wallPanel(px + dx, FLOOR + 0.12 + 0.3, z + 1.2, 2.1, 1.2, 'z', mats, pc); }
    }
    railing(px - 1.5, z1, px - 1.5, z0 + 0.4, FLOOR + 0.12, mats, pc, 0.95); railing(px + 1.5, z0 + 0.4, px + 1.5, z1, FLOOR + 0.12, mats, pc, 0.95);
    railing(px - 1.5, z1, px + 1.5, z1, FLOOR + 0.12, mats, pc, 0.95);
    box(3.2, 0.3, 0.3, px, FLOOR + 0.12 + 2.55, z1, mats.redFlat, pc);
    const pr = part(`porch-roof-${side}`, `Gabled roof (${side})`, [s * 6, 3, 6]);
    const prY = FLOOR + 0.12 + 3.1 + 0.9;
    pr.add(roof(mats, { cx: px, cz: 7.5, hw: 2.9, hd: 5.2, y0: prY, rise: 1.9, rhw: 0, rhd: 5.2, k: 1.25, lift: 0.0, skip: [0, 2], thick: 0.26, hipCaps: false }));
    // gable end: white triangle + red kingpost frame + cream bargeboards
    const gz = 7.5 + 5.2;
    const tri = new THREE.Shape(); tri.moveTo(-2.3, 0); tri.lineTo(2.3, 0); tri.lineTo(0, 1.95); tri.closePath();
    const gm = new THREE.Mesh(new THREE.ShapeGeometry(tri), mats.plaster); gm.position.set(px, prY - 0.15, gz - 0.35); pr.add(gm);
    for (const sx of [-1, 1]) {
      const bar = box(2.7, 0.18, 0.2, 0, 0, 0, mats.cream, pr); bar.position.set(px + sx * 1.15, prY + 0.98, gz + 0.02); bar.rotation.z = sx * -0.76; bar.scale.x = 1.0;
      const rf = box(2.55, 0.12, 0.14, 0, 0, 0, mats.redFlat, pr); rf.position.set(px + sx * 1.1, prY + 0.74, gz - 0.2); rf.rotation.z = sx * -0.76;
    }
    box(0.16, 1.5, 0.16, px, prY - 0.12, gz - 0.28, mats.redFlat, pr);
    box(4.2, 0.18, 0.18, px, prY - 0.2, gz - 0.28, mats.redFlat, pr);
  }

  /* ---- ground shadow catcher ------------------------------------------- */
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mats.shadow); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -0.02; gnd.receiveShadow = true; root.add(gnd);

  parts.forEach((p) => p.userData.home.copy(p.position));
  root.userData.parts = parts;
  root.traverse((o) => { if (o.isMesh) o.userData.partRoot = null; });
  parts.forEach((p) => p.traverse((o) => { if (o.isMesh) o.userData.partRoot = p; }));
  return root;
}
