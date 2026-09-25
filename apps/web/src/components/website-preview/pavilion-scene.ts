import * as THREE from "three";
import type { Sport } from "../concepts/concept-data";

export type PavilionSport = Sport | "All";
export type PavilionController = {
  setSport: (sport: PavilionSport) => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
};

type Shape = { lift: number; rx: number; rz: number; court: number; glass: number; runners: number };
const shapes: Record<PavilionSport, Shape> = {
  All: { lift: 2.8, rx: 5.0, rz: 3.5, court: 1, glass: 0, runners: 1 },
  Tennis: { lift: 3.45, rx: 5.0, rz: 3.5, court: 1, glass: 0, runners: 0 },
  Running: { lift: 0.18, rx: 5.35, rz: 3.2, court: 0, glass: 0, runners: 1 },
  Padel: { lift: 2.5, rx: 5.0, rz: 3.5, court: 1, glass: 1, runners: 0 },
};
const shapeKeys = Object.keys(shapes.All) as (keyof Shape)[];
const segments = 160;

/** A continuous architectural ribbon. Its rear rises into a canopy, then returns to the track. */
function ribbonGeometry(shape: Shape) {
  const positions = new Float32Array((segments + 1) * 4 * 3);
  const indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 4;
    const b = a + 4;
    indices.push(a, b, a + 1, b, b + 1, a + 1, a + 2, a + 3, b + 2, b + 2, a + 3, b + 3);
    indices.push(a, a + 2, b, b, a + 2, b + 2, a + 1, b + 1, a + 3, b + 1, b + 3, a + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  updateRibbon(geometry, shape);
  return geometry;
}

function updateRibbon(geometry: THREE.BufferGeometry, shape: Shape) {
  const attribute = geometry.getAttribute("position");
  for (let i = 0; i <= segments; i++) {
    const t = i / segments * Math.PI * 2;
    const rise = Math.pow(Math.max(0, -Math.sin(t)), 1.45);
    const width = 0.36 + rise * 0.57;
    for (let j = 0; j < 4; j++) {
      const outer = j % 2 === 0 ? 1 : -1;
      attribute.setXYZ(i * 4 + j,
        (shape.rx + outer * width) * Math.cos(t),
        0.18 + shape.lift * rise + outer * rise * 0.17 - (j > 1 ? 0.15 : 0),
        (shape.rz + outer * width) * Math.sin(t));
    }
  }
  attribute.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

function roundedPlate(width: number, depth: number, radius: number, height: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -depth / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + depth - radius);
  shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  shape.lineTo(x + radius, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.065, bevelThickness: 0.045, curveSegments: 18 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function ellipseLine(rx: number, rz: number, y: number, color: number, radius = 0.018) {
  const points = Array.from({ length: 161 }, (_, i) => {
    const t = i / 160 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(t) * rx, y, Math.sin(t) * rz);
  });
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 160, radius, 5, true), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
}

export function createPavilion(host: HTMLElement, options: { sport: PavilionSport; paused: boolean; onFailure: () => void }): PavilionController {
  const canvas = document.createElement("canvas");
  canvas.dataset.pavilionCanvas = "true";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "low-power" });
  if (!context) throw new Error("Pavilion rendering is unavailable.");
  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 6, -6, 0.1, 80);
  camera.position.set(10, 8.4, 12);
  camera.lookAt(0, 0.7, 0);
  scene.add(new THREE.HemisphereLight(0xf8ffff, 0x8d9ba4, 2.5));
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.position.set(-5, 11, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(window.innerWidth < 700 ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: 0.1, far: 35 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0001;
  sun.shadow.radius = 4;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xb7f2ed, 1.6);
  rim.position.set(1, 4, -8);
  scene.add(rim);

  const model = new THREE.Group();
  model.rotation.y = -0.11;
  scene.add(model);
  const pearl = new THREE.MeshStandardMaterial({ color: 0xfafaf6, metalness: 0.14, roughness: 0.3, side: THREE.DoubleSide });
  const mint = new THREE.MeshStandardMaterial({ color: 0x78c7bc, metalness: 0.03, roughness: 0.72 });
  const ink = new THREE.MeshStandardMaterial({ color: 0x40575e, roughness: 0.7 });
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const coral = new THREE.MeshStandardMaterial({ color: 0xff735d, roughness: 0.32 });
  const violet = new THREE.MeshStandardMaterial({ color: 0x7d83c8, roughness: 0.48 });

  // The low island and ribbon use only local procedural geometry: no model or texture downloads.
  const island = new THREE.Mesh(roundedPlate(11.2, 8.1, 3.6, 0.15), pearl);
  island.position.y = -0.28;
  island.receiveShadow = true;
  island.castShadow = true;
  model.add(island);
  // A finite, feathered contact shadow avoids a hard light-projected polygon at canvas edges.
  const shadowPixels = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const distance = Math.hypot((x - 63.5) / 63.5, (y - 63.5) / 63.5);
    const offset = (y * 128 + x) * 4;
    shadowPixels[offset] = 49; shadowPixels[offset + 1] = 88; shadowPixels[offset + 2] = 87;
    shadowPixels[offset + 3] = Math.round(Math.pow(Math.max(0, 1 - distance * distance), 2) * 64);
  }
  const shadowTexture = new THREE.DataTexture(shadowPixels, 128, 128, THREE.RGBAFormat);
  shadowTexture.colorSpace = THREE.SRGBColorSpace;
  shadowTexture.magFilter = THREE.LinearFilter;
  shadowTexture.minFilter = THREE.LinearFilter;
  shadowTexture.needsUpdate = true;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.37;
  scene.add(ground);

  let current = { ...shapes[options.sport] };
  let start = { ...current };
  let target = { ...current };
  const ribbon = new THREE.Mesh(ribbonGeometry(current), pearl);
  ribbon.castShadow = true;
  ribbon.receiveShadow = true;
  model.add(ribbon);
  const track = new THREE.Group();
  track.add(ellipseLine(4.28, 2.68, -0.045, 0xa7c9c4, 0.042));
  track.add(ellipseLine(4.5, 2.89, -0.035, 0xcadbd7, 0.014));
  model.add(track);

  const court = new THREE.Group();
  const playingSurface = new THREE.Mesh(roundedPlate(5.8, 3.55, 0.25, 0.025), mint);
  playingSurface.position.y = -0.08;
  playingSurface.receiveShadow = true;
  court.add(playingSurface);
  const line = (x1: number, z1: number, x2: number, z2: number) => {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, 0.008, 0.026), white);
    mesh.position.set((x1 + x2) / 2, 0.002, (z1 + z2) / 2);
    mesh.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    court.add(mesh);
  };
  line(-2.56, -1.5, 2.56, -1.5); line(-2.56, 1.5, 2.56, 1.5);
  line(-2.56, -1.5, -2.56, 1.5); line(2.56, -1.5, 2.56, 1.5);
  line(-2.56, -1.13, 2.56, -1.13); line(-2.56, 1.13, 2.56, 1.13);
  line(-1.15, -1.13, -1.15, 1.13); line(1.15, -1.13, 1.15, 1.13);
  line(-1.15, 0, 1.15, 0);
  const netMaterial = new THREE.MeshStandardMaterial({ color: 0x31575b, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(3.38, 0.55, 16, 4), netMaterial);
  net.rotation.y = Math.PI / 2;
  net.position.y = 0.3;
  court.add(net);
  const netWireMaterial = new THREE.LineBasicMaterial({ color: 0x597c7a, transparent: true, opacity: 0.32 });
  const netWire = new THREE.LineSegments(new THREE.WireframeGeometry(net.geometry), netWireMaterial);
  netWire.rotation.copy(net.rotation); netWire.position.copy(net.position); court.add(netWire);
  for (const z of [-1.71, 1.71]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.04, 0.65, 8), ink);
    post.position.set(0, 0.29, z);
    post.castShadow = true;
    court.add(post);
  }
  const topNet = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.045, 3.43), white);
  topNet.position.y = 0.595; court.add(topNet);
  model.add(court);

  const glass = new THREE.Group();
  const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0xb3e5e2, transparent: true, opacity: 0.25, roughness: 0.08, metalness: 0.08, side: THREE.DoubleSide, depthWrite: false });
  for (const x of [-2.94, 2.94]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.038, 1.18, 3.65), glassMaterial);
    panel.position.set(x, 0.6, 0);
    glass.add(panel);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(panel.geometry), new THREE.LineBasicMaterial({ color: 0x8eb5b5, transparent: true, opacity: 0.6 }));
    edge.position.copy(panel.position); glass.add(edge);
  }
  for (const z of [-1.84, 1.84]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(5.88, 0.85, 0.038), glassMaterial);
    panel.position.set(0, 0.425, z); glass.add(panel);
  }
  model.add(glass);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 12), coral);
  ball.castShadow = true; model.add(ball);
  const ballShadow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: 0x467b76, transparent: true, opacity: 0.15, depthWrite: false }));
  ballShadow.rotation.x = -Math.PI / 2;
  ballShadow.position.y = 0.008; model.add(ballShadow);

  const makePerson = (material: THREE.Material, small = false) => {
    const person = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(small ? 0.09 : 0.095, small ? 0.19 : 0.23, 4, 8), material);
    body.position.y = 0.2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), pearl);
    head.position.y = 0.45;
    body.castShadow = true; head.castShadow = true;
    person.add(body, head);
    return person;
  };
  const players = new THREE.Group();
  const playerOne = makePerson(coral); playerOne.position.set(-1.95, 0.02, 0.48); players.add(playerOne);
  const playerTwo = makePerson(violet); playerTwo.position.set(1.95, 0.02, -0.4); players.add(playerTwo);
  model.add(players);
  const runners = new THREE.Group();
  const runnerModels = [makePerson(coral, true), makePerson(violet, true), makePerson(ink, true)];
  runnerModels.forEach(runner => runners.add(runner));
  model.add(runners);

  // Fine cylindrical lights complete the pavilion without adding text or UI to the artwork.
  for (const x of [-3.35, 3.35]) {
    const light = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.7, 10), pearl);
    light.position.set(x, 0.76, -1.85); model.add(light);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf4ffff, emissive: 0xc6ffff, emissiveIntensity: 0.3 }));
    lamp.position.set(x, 1.66, -1.85); model.add(lamp);
  }

  let sport = options.sport;
  let paused = options.paused;
  let disposed = false;
  let visible = true;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let transitionTime = 0.6;
  const pointer = { x: 0, y: 0 };
  const smoothPointer = { x: 0, y: 0 };
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  function applyShape() {
    updateRibbon(ribbon.geometry, current);
    court.scale.setScalar(0.65 + current.court * 0.35);
    court.position.y = -0.02 - (1 - current.court) * 0.16;
    court.visible = current.court > 0.025;
    glass.scale.y = Math.max(0.001, current.glass);
    glass.visible = current.glass > 0.01;
    players.scale.setScalar(Math.max(0.001, current.court));
    players.visible = current.court > 0.01;
    ball.visible = current.court > 0.01;
    ballShadow.visible = ball.visible;
    runners.scale.y = Math.max(0.001, current.runners);
    runners.visible = current.runners > 0.01;
  }

  function pose() {
    const phase = elapsed * (sport === "Padel" ? 1.3 : 0.9);
    const rally = Math.sin(phase);
    ball.position.set(rally * 2.04, 0.17 + (1 - Math.abs(rally)) * 0.78, Math.cos(phase) * (sport === "Padel" ? 0.9 : 0.38));
    ballShadow.position.set(ball.position.x, 0.015, ball.position.z);
    ballShadow.scale.setScalar(0.7 + ball.position.y * 0.38);
    playerOne.rotation.z = rally * 0.09;
    playerTwo.rotation.z = -rally * 0.09;
    runnerModels.forEach((runner, i) => {
      const angle = elapsed * 0.23 + i * 0.27 + 0.5;
      runner.position.set(Math.cos(angle) * 4.28, -0.015 + Math.abs(Math.sin(elapsed * 6 + i)) * 0.035, Math.sin(angle) * 2.68);
      runner.rotation.z = Math.sin(elapsed * 6 + i) * 0.1;
    });
    model.rotation.y = -0.11 + smoothPointer.x * 0.065;
    model.rotation.x = smoothPointer.y * 0.02;
  }

  function render() {
    if (disposed) return;
    try { renderer.render(scene, camera); } catch { fail(); }
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    canvas.dataset.pavilionRunning = "false";
  }
  function isActive() { return !disposed && visible && !document.hidden && !paused; }
  function tick(time: number) {
    frame = 0;
    if (!isActive()) { stop(); return; }
    const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    elapsed += delta;
    if (transitionTime < 0.6) {
      transitionTime = Math.min(0.6, transitionTime + delta);
      const t = transitionTime / 0.6;
      const ease = t * t * (3 - 2 * t);
      for (const key of shapeKeys) current[key] = THREE.MathUtils.lerp(start[key], target[key], ease);
      applyShape();
    }
    smoothPointer.x += (pointer.x - smoothPointer.x) * 0.055;
    smoothPointer.y += (pointer.y - smoothPointer.y) * 0.055;
    pose();
    render();
    if (disposed) return;
    canvas.dataset.pavilionRunning = "true";
    frame = requestAnimationFrame(tick);
  }
  function wake() {
    if (disposed) return;
    if (!visible || document.hidden) { stop(); return; }
    lastTime = 0;
    if (!frame && !paused) frame = requestAnimationFrame(tick);
    else if (paused) { stop(); render(); }
  }
  function resize() {
    if (disposed) return;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    const aspect = width / height;
    const halfHeight = Math.max(4.9, 7.0 / aspect);
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
    camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
    renderer.setSize(width, height, false);
    if (visible && !document.hidden) render();
  }
  function onPointer(event: PointerEvent) {
    if (!finePointer.matches || paused) return;
    const rect = host.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
    pointer.y = (event.clientY - rect.top) / rect.height * 2 - 1;
  }
  function resetPointer() { pointer.x = 0; pointer.y = 0; }
  function contextLost(event: Event) { event.preventDefault(); fail(); }
  function fail() { if (!disposed) { dispose(); options.onFailure(); } }
  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false;
    wake();
  }, { threshold: 0.01 });
  resizeObserver.observe(host);
  intersectionObserver.observe(host);
  host.addEventListener("pointermove", onPointer, { passive: true });
  host.addEventListener("pointerleave", resetPointer);
  document.addEventListener("visibilitychange", wake);
  canvas.addEventListener("webglcontextlost", contextLost);

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    host.removeEventListener("pointermove", onPointer);
    host.removeEventListener("pointerleave", resetPointer);
    document.removeEventListener("visibilitychange", wake);
    canvas.removeEventListener("webglcontextlost", contextLost);
    const materials = new Set<THREE.Material>();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach(material => materials.add(material));
      }
    });
    materials.forEach(material => material.dispose());
    shadowTexture.dispose();
    sun.shadow.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }

  try {
    applyShape(); pose(); resize();
    if (disposed) throw new Error("Pavilion rendering is unavailable.");
    wake();
  } catch (error) { dispose(); throw error; }
  return {
    setSport(next) {
      if (disposed || next === sport) return;
      sport = next;
      start = { ...current };
      target = { ...shapes[next] };
      transitionTime = paused ? 0.6 : 0;
      if (paused) { current = { ...target }; applyShape(); pose(); if (visible && !document.hidden) render(); }
      wake();
    },
    setPaused(next) {
      if (disposed || paused === next) return;
      paused = next;
      if (paused) { current = { ...target }; transitionTime = 0.6; applyShape(); pose(); }
      wake();
    },
    dispose,
  };
}
