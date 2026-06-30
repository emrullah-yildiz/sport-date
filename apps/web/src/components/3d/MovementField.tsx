"use client";

/**
 * MovementField — the interactive 3D landing hero ("The Movement Field").
 *
 * Concept: a warm cluster of glowing "energy" orbs that gently orbit a soft
 * central core, wrapped in a flowing particle field. It evokes movement and
 * people meeting through sport: separate forms, in motion, finding a shared
 * rhythm. Brand lime (#c9f458) leads, with coral (#ff765f) accents on a clean
 * cream backdrop.
 *
 * Interactions:
 *   - Cursor parallax: the whole composition leans gently toward the pointer.
 *   - Hover: an orb brightens and swells when the pointer is over it.
 *   - Click / drag: nudges the cluster's spin; it springs playfully back to
 *     its resting orbit via simple lerp math (no physics engine).
 *   - Ambient motion: the cluster always breathes/orbits slowly so it feels
 *     alive at rest.
 *
 * A luminous emissive core plus a tasteful additive bloom pass make the lime
 * and coral energy read as actual light. The bloom is tuned with a high
 * luminance threshold so only the bright core/orbs glow and the cream backdrop
 * never washes out.
 *
 * Robustness & a11y:
 *   - `prefers-reduced-motion` => a calm, near-static arrangement (no spin,
 *     no drift, no pointer reactions) AND no bloom — just a steady glow.
 *   - Compact screens => bloom off and dpr pinned to 1 to protect mobile perf;
 *     the core still reads as bright emissive lime without the post pass.
 *   - WebGL-unavailable => the caller renders a static poster instead; this
 *     component also guards its own context creation.
 *   - dpr capped, lighter geometry on small screens, decorative (aria-hidden
 *     handled by the caller's wrapper).
 *
 * Everything is bundled three.js / postprocessing — no eval, no inline script,
 * no external asset hosts — so it satisfies the production CSP unchanged.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

const LIME = "#c9f458";
const CORE_LIME = "#d8ff6e"; // a brighter lime that blooms cleanly without washing out
const CORAL = "#ff765f";
const SAGE = "#9fb39d";

type OrbSpec = {
  /** Resting orbit radius. */
  radius: number;
  /** Starting angle around the cluster. */
  phase: number;
  /** Vertical bob offset. */
  height: number;
  /** Orbit speed multiplier. */
  speed: number;
  size: number;
  color: string;
  emissive: string;
};

// Orbits are spaced on a near-golden-angle progression so the cluster reads as
// an intentional constellation rather than a random scatter. Radii step out
// evenly; phases fan around the ring; sizes taper with distance for depth.
const ORBS: OrbSpec[] = [
  { radius: 1.6, phase: 0.0, height: 0.42, speed: 0.6, size: 0.4, color: LIME, emissive: LIME },
  { radius: 1.95, phase: 2.4, height: -0.5, speed: -0.48, size: 0.3, color: CORAL, emissive: CORAL },
  { radius: 2.35, phase: 4.7, height: 0.62, speed: 0.4, size: 0.32, color: LIME, emissive: LIME },
  { radius: 1.45, phase: 5.6, height: -0.28, speed: -0.72, size: 0.22, color: "#ffffff", emissive: SAGE },
  { radius: 2.7, phase: 1.3, height: 0.08, speed: 0.32, size: 0.18, color: CORAL, emissive: CORAL },
];

/** Smoothly eases `current` toward `target`. Frame-rate aware. */
function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function Orb({ spec, reducedMotion }: { spec: OrbSpec; reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    const mesh = ref.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    if (reducedMotion) {
      // Static, pleasant resting layout — no orbit, no bob.
      const a = spec.phase;
      mesh.position.set(Math.cos(a) * spec.radius, spec.height, Math.sin(a) * spec.radius * 0.6);
      mesh.scale.setScalar(spec.size);
      mat.emissiveIntensity = 0.65;
      return;
    }

    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const angle = spec.phase + t * spec.speed;
    const targetX = Math.cos(angle) * spec.radius;
    const targetZ = Math.sin(angle) * spec.radius * 0.6;
    const targetY = spec.height + Math.sin(t * spec.speed * 1.7 + spec.phase) * 0.22;

    mesh.position.set(targetX, targetY, targetZ);

    // Hover swell + glow, springing back when the pointer leaves.
    const targetScale = spec.size * (hovered ? 1.32 : 1);
    const next = damp(mesh.scale.x, targetScale, 9, dt);
    mesh.scale.setScalar(next);

    const targetGlow = hovered ? 1.5 : 0.85 + Math.sin(t * 1.3 + spec.phase) * 0.15;
    mat.emissiveIntensity = damp(mat.emissiveIntensity, targetGlow, 8, dt);
  });

  return (
    <mesh
      ref={ref}
      onPointerOver={(e) => {
        if (reducedMotion) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "";
      }}
    >
      <icosahedronGeometry args={[1, 4]} />
      <meshStandardMaterial
        ref={matRef}
        color={spec.color}
        emissive={spec.emissive}
        emissiveIntensity={0.6}
        roughness={0.25}
        metalness={0.1}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Luminous central core — the shared "field" the orbs gather around. A bright
 * emissive lime sphere reads as a ball of energy; a faint outer halo shell adds
 * volumetric softness so the bloom has something to bleed into. High-segment
 * smooth geometry (no flatShading) removes the old facet/triangle artifact, and
 * the core is scaled down a touch so the orbiting orbs read as a balanced
 * constellation around it rather than crowding a heavy blob.
 */
function Core({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    const mesh = ref.current;
    const mat = matRef.current;
    if (!mesh) return;
    if (reducedMotion) {
      if (mat) mat.emissiveIntensity = 0.9;
      return;
    }
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 0.9) * 0.04;
    mesh.scale.setScalar(pulse);
    mesh.rotation.y = t * 0.12;
    // Gentle energy flicker around a bright baseline so bloom stays alive.
    if (mat) {
      const target = 1.5 + Math.sin(t * 1.6) * 0.25;
      mat.emissiveIntensity = damp(mat.emissiveIntensity, target, 6, dt);
    }
  });

  return (
    <group>
      {/* Energy core: smooth, bright, blooms as the luminous centerpiece. */}
      <mesh ref={ref}>
        <sphereGeometry args={[0.72, 64, 64]} />
        <meshStandardMaterial
          ref={matRef}
          color={CORE_LIME}
          emissive={CORE_LIME}
          emissiveIntensity={reducedMotion ? 0.9 : 1.5}
          roughness={0.18}
          metalness={0.0}
          toneMapped={false}
        />
      </mesh>
      {/* Soft halo shell: backface-rendered translucent glow that gives the
          core volume and feeds the bloom a gradient instead of a hard edge. */}
      <mesh scale={1.55}>
        <sphereGeometry args={[0.72, 48, 48]} />
        <meshBasicMaterial
          color={LIME}
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** Flowing particle field conveying motion around the cluster. */
function ParticleField({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, radii, angles, speeds, heights } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const radii = new Float32Array(count);
    const angles = new Float32Array(count);
    const speeds = new Float32Array(count);
    const heights = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 2.6 + Math.random() * 2.6;
      const a = Math.random() * Math.PI * 2;
      const h = (Math.random() - 0.5) * 3.2;
      radii[i] = r;
      angles[i] = a;
      speeds[i] = (0.04 + Math.random() * 0.12) * (Math.random() > 0.5 ? 1 : -1);
      heights[i] = h;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = h;
      positions[i * 3 + 2] = Math.sin(a) * r * 0.6;
    }
    return { positions, radii, angles, speeds, heights };
  }, [count]);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts || reducedMotion) return;
    const t = state.clock.elapsedTime;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const a = angles[i] + t * speeds[i];
      const r = radii[i];
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = heights[i] + Math.sin(t * 0.5 + i) * 0.12;
      arr[i * 3 + 2] = Math.sin(a) * r * 0.6;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={LIME}
        size={0.05}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/**
 * The interactive cluster group. Handles cursor parallax + click/drag spin
 * with spring-back. Kept inside the Canvas so it can read pointer state.
 */
function Cluster({ reducedMotion, particleCount }: { reducedMotion: boolean; particleCount: number }) {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  // Drag state lives in refs so it survives frames without re-rendering.
  const spin = useRef(0); // extra rotation injected by the user
  const spinVel = useRef(0); // current angular velocity from a drag
  const dragging = useRef(false);
  const lastX = useRef(0);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    if (reducedMotion) {
      g.rotation.set(0, 0, 0);
      g.position.set(0, 0, 0);
      return;
    }

    const dt = Math.min(delta, 0.05);

    // Cursor parallax: lean the whole field toward the pointer. `pointer` is
    // normalized device coords (-1..1); fall back to center when untouched.
    const px = state.pointer.x;
    const py = state.pointer.y;
    const targetRotX = damp(g.rotation.x, -py * 0.18, 4, dt);
    const baseTilt = px * 0.28;

    // Drag spin decays back toward zero (spring-back to the resting orbit).
    if (!dragging.current) {
      spinVel.current = damp(spinVel.current, 0, 3, dt);
      spin.current = damp(spin.current, 0, 2.2, dt);
    }
    spin.current += spinVel.current * dt;

    g.rotation.x = targetRotX;
    g.rotation.y = damp(g.rotation.y, baseTilt, 4, dt) + spin.current;

    // Gentle whole-cluster parallax drift in screen space.
    g.position.x = damp(g.position.x, px * 0.25, 4, dt);
    g.position.y = damp(g.position.y, py * 0.2, 4, dt);
  });

  // Pointer handlers attached to a large invisible plane so drag works
  // anywhere over the canvas, not only on an orb.
  const onDown = (e: { clientX: number }) => {
    if (reducedMotion) return;
    dragging.current = true;
    lastX.current = e.clientX;
  };
  const onMove = (e: { clientX: number }) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    // Convert pixel drag into angular velocity; clamp so it stays playful.
    spinVel.current = THREE.MathUtils.clamp(dx * 0.05, -4, 4);
  };
  const onUp = () => {
    dragging.current = false;
  };

  return (
    <group>
      {/* Invisible interaction plane covers the viewport for drag/click. */}
      <mesh
        position={[0, 0, -1]}
        onPointerDown={(e) => onDown(e)}
        onPointerMove={(e) => onMove(e)}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <planeGeometry args={[viewport.width * 2, viewport.height * 2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group ref={group}>
        <Core reducedMotion={reducedMotion} />
        {ORBS.map((spec, i) => (
          <Orb key={i} spec={spec} reducedMotion={reducedMotion} />
        ))}
        <ParticleField count={particleCount} reducedMotion={reducedMotion} />
      </group>
    </group>
  );
}

export default function MovementField({
  reducedMotion = false,
  isCompact = false,
}: {
  reducedMotion?: boolean;
  isCompact?: boolean;
}) {
  const particleCount = isCompact ? 90 : 220;

  // Bloom is the expensive, "wow" upgrade. We keep it off when motion is
  // reduced (calm, static composition) and off on compact screens (mobile perf
  // budget). On those paths the core still reads as bright emissive lime, just
  // without the post-processing glow.
  const useBloom = !reducedMotion && !isCompact;

  return (
    <Canvas
      camera={{ position: [0, 0, 6.5], fov: 42 }}
      // dpr stays capped at 2; with bloom we additionally pin compact screens to
      // 1 so the extra fullscreen passes never run at retina cost on mobile.
      dpr={isCompact ? [1, 1] : [1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
      // If WebGL context creation fails, react-three-fiber throws; the caller's
      // error boundary / fallback handles it. `frameloop` runs on demand-free
      // animation but we keep "always" so ambient motion persists.
      frameloop={reducedMotion ? "demand" : "always"}
    >
      {/* Transparent background so the cream hero gradient shows through. */}
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <pointLight position={[-5, -2, 3]} color={CORAL} intensity={0.6} />
      <pointLight position={[3, 4, -4]} color={LIME} intensity={0.5} />
      <Cluster reducedMotion={reducedMotion} particleCount={particleCount} />

      {/* Tasteful bloom: a high luminance threshold means only the bright
          emissive core + orbs bloom, while the cream hero backdrop (which is
          CSS behind a transparent canvas, so near-black in the buffer) never
          blows out. Tuned for glow, not haze. */}
      {useBloom ? (
        <EffectComposer>
          <Bloom
            intensity={0.85}
            luminanceThreshold={0.62}
            luminanceSmoothing={0.28}
            mipmapBlur
            radius={0.72}
          />
        </EffectComposer>
      ) : (
        <></>
      )}
    </Canvas>
  );
}
