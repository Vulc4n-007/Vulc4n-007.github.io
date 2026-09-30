/* One 3D particle field behind the whole page.

   There are no diagrams here. The field is the only piece of 3D on the site,
   it means nothing beyond itself, and it carries no invented structure: a cloud
   of points at rest that the pointer pushes away from itself. A pushed point
   gains speed, stretches into a streak along its own velocity, and brightens
   toward the accent; when the pointer leaves it springs back to where it was.

   Drawn as LineSegments — two vertices per point, the second trailing along the
   velocity — so the streak is real geometry rather than a blur filter. Colours
   come from the CSS theme tokens, so light/dark stays defined in one place. */

import * as THREE from 'three';

boot();

function boot() {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = !window.matchMedia('(pointer: fine)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    document.documentElement.dataset.noWebgl = 'true';
    return;
  }
  if (!renderer.getContext()) {
    document.documentElement.dataset.noWebgl = 'true';
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearAlpha(0);
  renderer.domElement.className = 'scenelayer';
  document.body.insertBefore(renderer.domElement, document.body.firstChild);

  /* ---------- theme ---------- */
  const token = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  };
  const rest = new THREE.Color();
  const hot = new THREE.Color();
  function readTheme() {
    rest.set(token('--scene-node', '#0B0D13'));
    hot.set(token('--scene-accent', '#2450F0'));
  }
  readTheme();
  window.addEventListener('themechange', readTheme);

  /* ---------- camera ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.z = 30;

  /* the field has to cover the viewport at z = 0 with room to spare */
  const reach = () => {
    const h = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    return { h: h * 1.25, w: h * camera.aspect * 1.25 };
  };

  /* ---------- the field ---------- */
  const COUNT = coarse ? 600 : 1800;
  const STREAK = 4.5;       /* how far the trailing vertex lags the head */
  const PUSH = 0.042;       /* pointer force at zero distance */
  const RADIUS = 5.2;       /* pointer influence, in world units */
  const DAMP = 0.93;
  const HOME = 0.0035;      /* spring back to the rest position */

  const pts = new Float32Array(COUNT * 6);   /* head + tail, for the streaks */
  const col = new Float32Array(COUNT * 6);
  const head = new Float32Array(COUNT * 3);  /* heads only, for the dots */
  const hcol = new Float32Array(COUNT * 3);
  const P = [];

  const field = new THREE.Group();
  scene.add(field);

  const hsize = new Float32Array(COUNT);
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(head, 3));
  dotGeo.setAttribute('vcolor', new THREE.BufferAttribute(hcol, 3));
  dotGeo.setAttribute('size', new THREE.BufferAttribute(hsize, 1));

  /* PointsMaterial has one size for every point; these need their own, so the
     ones the pointer has thrown read as fatter specks and not just paler ones */
  const dotMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uOpacity: { value: 0.8 } },
    vertexShader: [
      'attribute vec3 vcolor;',
      'attribute float size;',
      'varying vec3 vC;',
      'void main() {',
      '  vC = vcolor;',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  gl_PointSize = size * (320.0 / -mv.z);',
      '  gl_Position = projectionMatrix * mv;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uOpacity;',
      'varying vec3 vC;',
      'void main() {',
      '  float a = smoothstep(0.5, 0.32, length(gl_PointCoord - vec2(0.5)));',
      '  if (a < 0.01) discard;',
      '  gl_FragColor = vec4(vC, a * uOpacity);',
      '}'
    ].join('\n')
  });
  field.add(new THREE.Points(dotGeo, dotMat));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  field.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false
  })));

  function seed() {
    const r = reach();
    for (let i = 0; i < COUNT; i++) {
      const p = P[i] || (P[i] = {});
      p.bx = (Math.random() - 0.5) * r.w;
      p.by = (Math.random() - 0.5) * r.h;
      p.z = -14 + Math.random() * 20;
      p.x = p.bx; p.y = p.by;
      p.vx = 0; p.vy = 0;
      p.ph = Math.random() * Math.PI * 2;
      p.dim = 0.32 + Math.random() * 0.68;   /* resting brightness */
      p.sz = 0.085 + Math.random() * 0.06;
    }
  }

  /* ---------- input ---------- */
  let px = -1e5, py = -1e5;          /* pointer, in CSS pixels */
  let has = false;
  if (!coarse) {
    window.addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY; has = true;
    }, { passive: true });
    document.addEventListener('mouseleave', () => { has = false; });
    window.addEventListener('blur', () => { has = false; });
  }

  let scrollP = 0;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollP = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  let W = 0, H = 0;
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    seed();
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- pointer -> world, on the z = 0 plane ---------- */
  const ndc = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();

  const clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    /* scrolling drifts the field and eases the camera in, so the motion
       continues down the page without inventing anything per section */
    field.position.y = scrollP * 7;
    camera.position.z = 30 - scrollP * 5;

    let hx = 1e6, hy = 1e6;
    if (has && !calm) {
      ndc.set((px / W) * 2 - 1, -((py / H) * 2 - 1));
      ray.setFromCamera(ndc, camera);
      if (ray.ray.intersectPlane(plane, hit)) {
        hx = hit.x;
        hy = hit.y - field.position.y;   /* into the field's local space */
      }
    }

    const r2 = RADIUS * RADIUS;
    const step = Math.min(dt * 60, 2);

    for (let i = 0; i < COUNT; i++) {
      const p = P[i];

      if (!calm) {
        /* a slow idle so the field breathes with no pointer on the page */
        p.vx += Math.sin(t * 0.4 + p.ph) * 0.0012 * step;
        p.vy += Math.cos(t * 0.33 + p.ph) * 0.0012 * step;

        const dx = p.x - hx, dy = p.y - hy;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 0.0001;
          /* nearer points are thrown harder, and nearer the camera harder still */
          const f = (1 - d / RADIUS);
          const g = PUSH * f * f * (1 + (p.z + 14) / 34) * step;
          p.vx += (dx / d) * g;
          p.vy += (dy / d) * g;
        }

        p.vx += (p.bx - p.x) * HOME * step;
        p.vy += (p.by - p.y) * HOME * step;
        p.vx *= Math.pow(DAMP, step);
        p.vy *= Math.pow(DAMP, step);
        p.x += p.vx * step;
        p.y += p.vy * step;
      }

      const a = i * 6, h = i * 3;
      pts[a] = p.x; pts[a + 1] = p.y; pts[a + 2] = p.z;
      pts[a + 3] = p.x - p.vx * STREAK;
      pts[a + 4] = p.y - p.vy * STREAK;
      pts[a + 5] = p.z;
      head[h] = p.x; head[h + 1] = p.y; head[h + 2] = p.z;

      /* speed drives both the streak and the colour */
      const k = Math.min(Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 9, 1);
      /* at rest a point sits at its own dim level; thrown, it goes to accent */
      const d = p.dim + (1 - p.dim) * k;
      const cr = (rest.r * d) + (hot.r - rest.r * d) * k;
      const cg = (rest.g * d) + (hot.g - rest.g * d) * k;
      const cb = (rest.b * d) + (hot.b - rest.b * d) * k;
      col[a] = cr; col[a + 1] = cg; col[a + 2] = cb;
      col[a + 3] = cr; col[a + 4] = cg; col[a + 5] = cb;
      hcol[h] = cr; hcol[h + 1] = cg; hcol[h + 2] = cb;
      hsize[i] = p.sz * (1 + k * 2.4);
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    dotGeo.attributes.position.needsUpdate = true;
    dotGeo.attributes.vcolor.needsUpdate = true;
    dotGeo.attributes.size.needsUpdate = true;
    renderer.render(scene, camera);
  }
  frame();
}
