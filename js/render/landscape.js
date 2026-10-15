// 山河：一幅会动的绢本青绿山水。开场与山河寻艺共用同一个世界，镜头在其中飞行。
// 设色取《千里江山图》：赭石打底、石绿铺陈、石青压峰，山石以墨线皴出轮廓；
// 天与云都是绢的本色留白，远山按空气透视层层淡进绢里。地形、河流、地点均为意境示意，不是地理数据。

import * as THREE from 'three';
import { fbm, ridged, simplex, smoothstep, mix } from './noise.js';

// —— 世界尺度 ——
const MAP_W = 320, MAP_D = 220;          // 地点坐标所在的「图幅」
const TERRAIN_W = 620, TERRAIN_D = 440;  // 地形向外延展，避免看见边缘
const SEG_W = 360, SEG_D = 256;
const MAX_H = 72;

const C = hex => new THREE.Color(hex);
const PALETTE = {
  silk: C('#efe8da'),
  silkDeep: C('#e3d9c4'),
  haze: C('#ece4d3'),
  sun: C('#fff8ec'),
  ochre: C('#bfa47c'),
  ochreDeep: C('#7a5536'),
  malachite: C('#2c7558'),
  azurite: C('#1d5683'),
  peak: C('#173f68'),
  water: C('#b7c6c0'),
  ink: C('#2b2a27'),
};

// 意境河道：大河自西高原东流入海
const RIVERS = [
  [[-260, 6], [-150, 10], [-100, 25], [-60, 15], [-30, 30], [0, 36], [30, 28], [60, 36], [95, 30], [125, 25], [200, 22]],
  [[-250, -20], [-140, -25], [-100, -36], [-70, -20], [-45, -45], [-20, -70], [10, -62], [22, -32], [50, -40], [90, -46], [130, -50], [200, -54]],
];

function distToRiver(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    const px = ax + dx * t - x, pz = az + dz * t - z;
    best = Math.min(best, px * px + pz * pz);
  }
  return Math.sqrt(best);
}

export function heightAt(x, z) {
  const west = smoothstep(70, -190, x);              // 西高东低
  const north = smoothstep(30, -140, z) * 0.35;
  let h = 2 + west * 20 + north * 6;
  const mask = smoothstep(-0.3, 0.5, fbm(x * 0.0055 + 11, z * 0.0055 - 7, 3));
  // 浑圆的峰峦：平滑噪声抬升成山，再叠山脊细节作皴
  const base = fbm(x * 0.017 + 3.1, z * 0.017 - 1.7, 5) * 0.5 + 0.5;
  const m = Math.pow(Math.max(0, base - 0.36) / 0.64, 1.3);
  const ridge = ridged(x * 0.05, z * 0.05, 4);
  const detail = fbm(x * 0.08, z * 0.08, 3);
  h += m * (0.3 + 0.7 * mask) * (60 + west * 18) + ridge * m * 6 + detail * 1.4;
  // 河谷
  const meander = simplex(x * 0.03, z * 0.03) * 2.5;
  const d = Math.min(distToRiver(x, z, RIVERS[0]), distToRiver(x, z, RIVERS[1])) + meander;
  h = mix(-1.8, h, smoothstep(1.0, 6 + 6 * mask, d));
  // 东部海岸
  const coastX = 142 + 12 * Math.sin(z * 0.035) + 8 * simplex(z * 0.04, 3.7);
  h = mix(-7, h, smoothstep(coastX + 16, coastX - 8, x));
  return Math.min(h, MAX_H);
}

// 图幅百分比 → 世界坐标
export function mapToWorld(px, py) {
  const x = (px / 100 - 0.5) * MAP_W;
  const z = (py / 100 - 0.5) * MAP_D;
  return new THREE.Vector3(x, Math.max(heightAt(x, z), 1.2), z);
}

const GLSL_NOISE = /* glsl */`
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float vfbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return s;
  }`;

// 空气透视：距离越远越融入暮色，低处另有贴地薄雾
const GLSL_HAZE = /* glsl */`
  uniform vec3 uHaze; uniform vec3 uSun; uniform vec3 uSunDir; uniform float uFog;
  vec3 applyHaze(vec3 col, vec3 wp, float lowMist) {
    float d = length(wp - cameraPosition);
    float fog = 1.0 - exp(-pow(d * uFog, 1.7));
    fog = clamp(fog + lowMist * (1.0 - fog), 0.0, 1.0);
    vec3 v = normalize(wp - cameraPosition);
    float toSun = pow(max(dot(v, uSunDir), 0.0), 5.0);
    vec3 haze = mix(uHaze, uSun, toSun * 0.3);
    return mix(col, haze, fog);
  }`;

function hazeUniforms(shared) {
  return { uHaze: shared.uHaze, uSun: shared.uSun, uSunDir: shared.uSunDir, uFog: shared.uFog, uTime: shared.uTime };
}

function makeTerrain(shared) {
  const geo = new THREE.PlaneGeometry(TERRAIN_W, TERRAIN_D, SEG_W, SEG_D);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...hazeUniforms(shared),
      uMaxH: { value: MAX_H * 0.82 },
      uOchre: { value: PALETTE.ochre }, uOchreDeep: { value: PALETTE.ochreDeep },
      uMalachite: { value: PALETTE.malachite }, uAzurite: { value: PALETTE.azurite }, uPeak: { value: PALETTE.peak },
      uInk: { value: PALETTE.ink }, uSilk: { value: PALETTE.silk },
    },
    vertexShader: /* glsl */`
      varying vec3 vPos; varying vec3 vNormal;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPos = wp.xyz; vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      varying vec3 vPos; varying vec3 vNormal;
      uniform float uMaxH; uniform float uTime;
      uniform vec3 uOchre, uOchreDeep, uMalachite, uAzurite, uPeak, uInk, uSilk;
      ${GLSL_NOISE}
      ${GLSL_HAZE}
      void main() {
        vec3 n = normalize(vNormal);
        vec3 v = normalize(cameraPosition - vPos);
        float h = vPos.y;
        float slope = 1.0 - n.y;
        float t = clamp(h / uMaxH, 0.0, 1.0);
        float brush = vfbm(vPos.xz * 0.08);
        float wash = vfbm(vPos.xz * 0.35 + 4.0);
        // 赭石打底 → 石绿 → 石青压峰：矿物色分层平涂，边缘随笔意参差
        vec3 col = mix(uOchre, uMalachite, smoothstep(0.0, 0.045, t + (brush - 0.5) * 0.08));
        col = mix(col, uAzurite, smoothstep(0.34, 0.62, t + (brush - 0.5) * 0.3 + slope * 0.12));
        col = mix(col, uPeak, smoothstep(0.7, 0.95, t + (brush - 0.5) * 0.2));
        // 山脚、陡壁透出赭色底
        col = mix(col, uOchreDeep, smoothstep(0.55, 0.9, slope) * 0.25 * (1.0 - t));
        // 颜料厚薄不匀，留出绢底
        col = mix(col, uSilk, smoothstep(0.66, 0.92, wash) * 0.16);
        col *= 0.9 + (vfbm(vPos.xz * 1.4) - 0.5) * 0.18;
        // 平光：画里没有强烈明暗，只有向光面略亮
        float diff = max(dot(n, uSunDir), 0.0);
        col *= 0.82 + diff * 0.3;
        // 皴：沿山势的细墨线，陡处密、缓处疏
        float c1 = abs(fract(h * 0.38 + brush * 2.2) - 0.5);
        float cun = (1.0 - smoothstep(0.0, 0.045 + slope * 0.03, c1)) * smoothstep(0.18, 0.55, slope);
        // 勾勒：山的外轮廓一笔浓墨
        float rim = smoothstep(0.62, 0.88, 1.0 - abs(dot(n, v))) * smoothstep(0.05, 0.25, t);
        float inkAmt = clamp(cun * 0.45 + rim * 0.7, 0.0, 0.8);
        col = mix(col, uInk, inkAmt * (0.7 + brush * 0.6));
        float lowMist = smoothstep(4.0, -1.0, h) * 0.4;
        gl_FragColor = vec4(applyHaze(col, vPos, lowMist), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function makeSky(shared) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { ...hazeUniforms(shared), uSilk: { value: PALETTE.silk }, uDeep: { value: PALETTE.silkDeep } },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() { vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      varying vec3 vDir;
      uniform vec3 uSilk, uDeep, uHaze; uniform float uTime;
      ${GLSL_NOISE}
      void main() {
        vec3 d = normalize(vDir);
        // 绢底：上方略深，近地平线最亮
        vec3 col = mix(uHaze, uDeep, smoothstep(0.05, 0.7, d.y));
        float fibre = vfbm(vec2(atan(d.x, d.z) * 40.0, d.y * 160.0));
        col *= 0.985 + fibre * 0.03;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1400, 48, 24), mat);
}

function makeWater(shared) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...hazeUniforms(shared), uWater: { value: PALETTE.water }, uInk: { value: PALETTE.ink } },
    vertexShader: /* glsl */`
      varying vec3 vPos;
      void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`
      varying vec3 vPos;
      uniform vec3 uWater, uInk; uniform float uTime;
      ${GLSL_NOISE}
      ${GLSL_HAZE}
      void main() {
        // 水纹：画里的鱼鳞细纹，缓缓流动
        vec2 p = vPos.xz;
        float w = vnoise(p * vec2(0.08, 0.5) + vec2(uTime * 0.05, 0.0));
        float lines = abs(fract(p.y * 0.55 + w * 2.0 + sin(p.x * 0.12) * 0.4) - 0.5);
        float ink = (1.0 - smoothstep(0.0, 0.06, lines)) * 0.16 * smoothstep(0.3, 0.7, vnoise(p * 0.05));
        vec3 col = mix(uWater, uInk, ink);
        gl_FragColor = vec4(applyHaze(col, vPos, 0.0), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.4;
  return mesh;
}

// 地形高度贴图：让云雾只聚在低于自身高度的山谷里，并与山体柔和相接
function makeHeightTexture() {
  const W = 256, H = 182;
  // 用 8 位存储（-10..70 映射到 0..255），保证所有设备都支持线性过滤
  const data = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const h = heightAt((i / (W - 1) - 0.5) * TERRAIN_W, (j / (H - 1) - 0.5) * TERRAIN_D);
      data[j * W + i] = Math.round(Math.max(0, Math.min(1, (h + 10) / 80)) * 255);
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function makeMist(shared, y, scale, opacity, speed) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      ...hazeUniforms(shared), uScale: { value: scale }, uOpacity: { value: opacity }, uSpeed: { value: speed },
      uHeight: shared.uHeight, uY: { value: y }, uSize: { value: new THREE.Vector2(TERRAIN_W, TERRAIN_D) },
      uSilk: { value: PALETTE.silk },
    },
    vertexShader: /* glsl */`
      varying vec3 vPos;
      void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`
      varying vec3 vPos;
      uniform float uScale, uOpacity, uSpeed, uTime, uY;
      uniform vec3 uSilk;
      uniform sampler2D uHeight; uniform vec2 uSize;
      ${GLSL_NOISE}
      void main() {
        vec2 p = vPos.xz * uScale + vec2(uTime * uSpeed, uTime * uSpeed * 0.3);
        float n = vfbm(p);
        float a = smoothstep(0.47, 0.72, n) * uOpacity;
        // 与山体相接处慢慢化开，不留硬边
        float ground = texture2D(uHeight, vPos.xz / uSize + 0.5).r * 80.0 - 10.0;
        a *= smoothstep(-2.0, 12.0, uY - ground);
        a *= smoothstep(520.0, 220.0, length(vPos.xz));
        float near = smoothstep(4.0, 60.0, length(vPos - cameraPosition));
        // 留白：云就是没有着色的绢
        gl_FragColor = vec4(uSilk * 1.03, a * near);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1100, 900, 1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.renderOrder = 2;
  return mesh;
}

// 飞鸟：开场时掠过山间
function makeBirds() {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, -1.2, 0.45, 0, -0.5, 0.08, 0,
    0, 0, 0, 0.5, 0.08, 0, 1.2, 0.45, 0,
  ], 3));
  const mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: PALETTE.ink, side: THREE.DoubleSide, fog: false }), 11);
  mesh.userData.offsets = Array.from({ length: 11 }, (_, i) => new THREE.Vector3((i % 2 ? 1 : -1) * Math.ceil(i / 2) * 2.4, Math.random() * 1.2, Math.ceil(i / 2) * 2.2 + Math.random()));
  return mesh;
}

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createLandscape(canvas, { places = [] } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.NoToneMapping;

  const shared = {
    uHaze: { value: PALETTE.haze },
    uSun: { value: PALETTE.sun },
    uSunDir: { value: new THREE.Vector3(-0.45, 0.6, -0.5).normalize() },
    uFog: { value: 1 / 640 },
    uTime: { value: 0 },
    uHeight: { value: makeHeightTexture() },
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 3000);
  scene.add(makeSky(shared), makeTerrain(shared), makeWater(shared));
  scene.add(makeMist(shared, 6, 0.018, 0.92, 0.9), makeMist(shared, 13, 0.011, 0.8, 0.6), makeMist(shared, 22, 0.007, 0.55, 0.4));
  const birds = makeBirds();
  scene.add(birds);

  // 地点：只记录位置，标注由页面上的地名注记完成
  const placeObjs = new Map();
  places.forEach(p => placeObjs.set(p.id, { pos: mapToWorld(p.x, p.y), open: p.open }));

  // —— 镜头 ——
  const cam = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
  let flight = null;
  let mode = 'opening';
  let active = false, raf = 0, last = 0;
  let parallax = { x: 0, y: 0, sx: 0, sy: 0 };
  let reduced = false;
  const frameListeners = [];

  const PRESETS = {
    opening: () => ({ pos: new THREE.Vector3(168, 84, 172), target: new THREE.Vector3(-10, 34, -30) }),
    overview: () => {
      const target = new THREE.Vector3(-22, 0, -6);
      return { pos: target.clone().add(new THREE.Vector3(0, 215, 232)), target };
    },
    focus: id => {
      const p = placeObjs.get(id).pos;
      const target = new THREE.Vector3(p.x + 20, Math.max(p.y * 0.4, 0), p.z + 4);
      return { pos: target.clone().add(new THREE.Vector3(-4, 104, 128)), target };
    },
  };

  function setCam(preset) {
    cam.pos.copy(preset.pos);
    cam.target.copy(preset.target);
  }
  setCam(PRESETS.opening());

  function flyTo(nextMode, { id, duration = 2400 } = {}) {
    mode = nextMode;
    const to = nextMode === 'focus' ? PRESETS.focus(id) : PRESETS[nextMode]();
    if (reduced || duration <= 0) { setCam(to); flight = null; return Promise.resolve(); }
    return new Promise(resolve => {
      const from = { pos: cam.pos.clone(), target: cam.target.clone() };
      const lift = from.pos.distanceTo(to.pos) * 0.18;
      flight = { from, to, start: performance.now(), duration, lift, resolve };
    });
  }

  function stepFlight(now) {
    if (!flight) return;
    const t = Math.min(1, (now - flight.start) / flight.duration);
    const k = ease(t);
    cam.pos.lerpVectors(flight.from.pos, flight.to.pos, k);
    cam.pos.y += Math.sin(Math.PI * k) * flight.lift;
    cam.target.lerpVectors(flight.from.target, flight.to.target, k);
    if (t >= 1) { const done = flight.resolve; flight = null; done(); }
  }

  function pan(dx, dy) {
    if (flight) return;
    const dist = cam.pos.distanceTo(cam.target);
    const s = dist * 0.0016;
    const fwd = cam.target.clone().sub(cam.pos).setY(0).normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = right.multiplyScalar(-dx * s).add(fwd.multiplyScalar(dy * s));
    const next = cam.target.clone().add(move);
    next.x = Math.max(-200, Math.min(200, next.x));
    next.z = Math.max(-150, Math.min(150, next.z));
    const delta = next.sub(cam.target);
    cam.target.add(delta);
    cam.pos.add(delta);
  }

  function zoom(factor) {
    if (flight) return;
    const offset = cam.pos.clone().sub(cam.target);
    const len = Math.max(50, Math.min(460, offset.length() / factor));
    cam.pos.copy(cam.target).add(offset.setLength(len));
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const tmp = new THREE.Vector3();
  function project(v) {
    tmp.copy(v).project(camera);
    return {
      x: (tmp.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-tmp.y * 0.5 + 0.5) * canvas.clientHeight,
      visible: tmp.z < 1 && Math.abs(tmp.x) < 1.15 && Math.abs(tmp.y) < 1.15,
    };
  }

  function frame(now) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    if (!reduced) shared.uTime.value += dt;
    stepFlight(now);

    // 视差与缓慢呼吸
    parallax.sx += (parallax.x - parallax.sx) * 0.04;
    parallax.sy += (parallax.y - parallax.sy) * 0.04;
    const t = shared.uTime.value;
    camera.position.copy(cam.pos);
    if (mode === 'opening') {
      camera.position.x += parallax.sx * 6 + Math.sin(t * 0.12) * 1.5;
      camera.position.y += -parallax.sy * 3 + Math.sin(t * 0.09) * 0.6;
    } else if (!flight && !reduced) {
      camera.position.x += Math.sin(t * 0.05) * 2.5;
      camera.position.y += Math.sin(t * 0.07) * 1.2;
    }
    camera.lookAt(cam.target);

    // 飞鸟
    const flockT = (t * 0.035) % 1;
    const center = new THREE.Vector3(mix(150, -40, flockT), 30 + Math.sin(t * 0.4) * 2, mix(80, -10, flockT));
    birds.visible = mode === 'opening' || (!!flight && mode === 'overview');
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    birds.userData.offsets.forEach((o, i) => {
      const p = center.clone().add(o);
      q.copy(camera.quaternion);
      const flap = 0.5 + 0.5 * Math.sin(t * 7 + i * 1.3);
      sc.set(0.9, 0.3 + flap * 0.9, 1);
      m.compose(p, q, sc);
      birds.setMatrixAt(i, m);
    });
    birds.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
    frameListeners.forEach(fn => fn());
    if (active) raf = requestAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    setActive(value) {
      if (value === active) return;
      active = value;
      if (active) { last = 0; raf = requestAnimationFrame(frame); }
      else cancelAnimationFrame(raf);
    },
    setReduced(value) { reduced = value; },
    setParallax(x, y) { parallax.x = x; parallax.y = y; },
    jump(nextMode, id) { flyTo(nextMode, { id, duration: 0 }); },
    flyTo,
    pan,
    zoom,
    project,
    placePosition: id => placeObjs.get(id)?.pos,
    onFrame(fn) { frameListeners.push(fn); },
    getMode: () => mode,
    isFlying: () => !!flight,
    renderOnce() { frame(performance.now()); },
  };
}
