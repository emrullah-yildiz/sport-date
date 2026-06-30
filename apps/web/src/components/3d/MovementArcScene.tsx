"use client";

/**
 * MovementArcScene — the interactive 3D progression for a member's private
 * "Movement Arc". It renders the five MOVEMENT_STAGES as milestone nodes
 * threaded along a gently rising 3D arc:
 *
 *   - Completed stages (attendedMoves >= threshold) glow brand lime.
 *   - The member's CURRENT stage is a larger, luminous marker.
 *   - Future stages are calm, dim sage nodes — present but unhurried.
 *
 * The arc itself is a soft tube that brightens up to the current marker and
 * stays dim ahead of it, so the eye reads "how far along, privately" without
 * any score, streak, leaderboard or reward. The data is purely descriptive of
 * the same progress the 2D version shows.
 *
 * Interactions are intentionally calm (this is private delight, not a game):
 *   - Slow ambient drift so it feels alive at rest.
 *   - Cursor parallax: the arc leans gently toward the pointer.
 *   - Light rotate-on-drag with spring-back to the resting pose.
 *
 * Robustness & a11y mirrors the landing hero (MovementField):
 *   - `prefers-reduced-motion` => calm static pose, no drift/parallax/drag,
 *     and bloom off (steady glow only).
 *   - Compact screens => bloom off + dpr pinned to 1 for mobile perf.
 *   - The canvas is decorative; the caller marks it aria-hidden and keeps the
 *     full progress available as accessible text.
 *
 * Bundled three.js / postprocessing only — no eval, inline, or external asset
 * hosts — so it satisfies the production CSP unchanged.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const LIME = "#c9f458";
const CORE_LIME = "#d8ff6e"; // brighter lime that blooms cleanly without washing out
const SAGE = "#9fb39d";
const DIM = "#5d6f63"; // calm, dim future-node colour

export type ArcNode = {
  /** Whether this stage's threshold has been reached. */
  reached: boolean;
  /** Whether this is the member's current stage marker. */
  current: boolean;
};

/** Smoothly eases `current` toward `target`. Frame-rate aware. */
function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * Maps a normalized position t (0..1) along the arc to a 3D point. The arc is a
 * shallow, rising curve drawn left-to-right so progress reads as a journey.
 */
function arcPoint(t: number): THREE.Vector3 {
  const x = (t - 0.5) * 7.2; // span across the view
  const y = Math.sin(t * Math.PI) * 1.05 - 0.2; // gentle hill, peak in the middle
  const z = Math.cos(t * Math.PI * 0.5) * 0.6 - 0.3; // slight depth bow
  return new THREE.Vector3(x, y, z);
}

/** The glowing path the milestone nodes sit on. */
function ArcPath({ litFraction, reducedMotion }: { litFraction: number; reducedMotion: boolean }) {
  const litRef = useRef<THREE.Mesh>(null);
  const litMat = useRef<THREE.MeshStandardMaterial>(null);

  // Two tubes: a dim base for the whole arc, and a bright lime overlay covering
  // only the travelled fraction (up to the current marker).
  const { baseCurve, litCurve } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) pts.push(arcPoint(i / 80));
    const baseCurve = new THREE.CatmullRomCurve3(pts);

    const litPts: THREE.Vector3[] = [];
    const litEnd = Math.max(0.02, litFraction);
    const steps = Math.max(2, Math.round(litEnd * 80));
    for (let i = 0; i <= steps; i++) litPts.push(arcPoint((i / steps) * litEnd));
    const litCurve = new THREE.CatmullRomCurve3(litPts);
    return { baseCurve, litCurve };
  }, [litFraction]);

  useFrame((state, delta) => {
    const mat = litMat.current;
    if (!mat) return;
    if (reducedMotion) {
      mat.emissiveIntensity = 0.9;
      return;
    }
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const target = 1.05 + Math.sin(t * 1.1) * 0.18;
    mat.emissiveIntensity = damp(mat.emissiveIntensity, target, 5, dt);
  });

  return (
    <group>
      {/* Dim base path: the full journey, present but calm. */}
      <mesh>
        <tubeGeometry args={[baseCurve, 80, 0.045, 10, false]} />
        <meshStandardMaterial
          color={DIM}
          emissive={DIM}
          emissiveIntensity={0.25}
          roughness={0.6}
          metalness={0.0}
          toneMapped={false}
        />
      </mesh>
      {/* Lit overlay: only the travelled portion glows lime. */}
      {litFraction > 0.001 ? (
        <mesh ref={litRef}>
          <tubeGeometry args={[litCurve, 64, 0.06, 12, false]} />
          <meshStandardMaterial
            ref={litMat}
            color={CORE_LIME}
            emissive={LIME}
            emissiveIntensity={1.05}
            roughness={0.2}
            metalness={0.0}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

/** A single milestone node sitting on the arc. */
function MilestoneNode({
  position,
  node,
  index,
  reducedMotion,
}: {
  position: THREE.Vector3;
  node: ArcNode;
  index: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const baseSize = node.current ? 0.34 : node.reached ? 0.24 : 0.18;
  const color = node.current ? CORE_LIME : node.reached ? LIME : DIM;
  const emissive = node.current ? CORE_LIME : node.reached ? LIME : SAGE;
  const restGlow = node.current ? 1.4 : node.reached ? 0.95 : 0.18;

  useFrame((state, delta) => {
    const mesh = ref.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    if (reducedMotion) {
      mesh.scale.setScalar(baseSize);
      mat.emissiveIntensity = restGlow;
      return;
    }

    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // The current marker breathes; reached nodes shimmer faintly; future nodes
    // sit quietly. Phase offset by index so they don't pulse in lockstep.
    const phase = index * 1.3;
    const breathe = node.current ? 1 + Math.sin(t * 1.1 + phase) * 0.07 : 1;
    mesh.scale.setScalar(damp(mesh.scale.x, baseSize * breathe, 7, dt));

    let targetGlow = restGlow;
    if (node.current) targetGlow = 1.4 + Math.sin(t * 1.4 + phase) * 0.3;
    else if (node.reached) targetGlow = 0.95 + Math.sin(t * 0.9 + phase) * 0.12;
    mat.emissiveIntensity = damp(mat.emissiveIntensity, targetGlow, 6, dt);
  });

  return (
    <group position={position}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1, node.reached ? 4 : 2]} />
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={emissive}
          emissiveIntensity={restGlow}
          roughness={node.reached ? 0.2 : 0.5}
          metalness={0.05}
          toneMapped={false}
        />
      </mesh>
      {/* Soft halo on the current marker so the bloom has a gradient to bleed
          into and the member's position reads as a beacon. */}
      {node.current ? (
        <mesh scale={baseSize * 2.3}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial
            color={LIME}
            transparent
            opacity={0.14}
            side={THREE.BackSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

/**
 * The interactive arc group: ambient drift + cursor parallax + drag spin with
 * spring-back. Kept inside the Canvas so it can read pointer state.
 */
function ArcGroup({
  nodes,
  litFraction,
  reducedMotion,
}: {
  nodes: ArcNode[];
  litFraction: number;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  // Drag state lives in refs so it survives frames without re-rendering.
  const spin = useRef(0);
  const spinVel = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);

  // Precompute each node's position along the arc. Stages are evenly spaced.
  const positions = useMemo(() => {
    const n = nodes.length;
    return nodes.map((_, i) => arcPoint(n <= 1 ? 0.5 : i / (n - 1)));
  }, [nodes]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    if (reducedMotion) {
      g.rotation.set(0, 0, 0);
      g.position.set(0, 0, 0);
      return;
    }

    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    const px = state.pointer.x;
    const py = state.pointer.y;

    // Ambient drift: a slow, small sway so the arc feels alive at rest.
    const driftY = Math.sin(t * 0.25) * 0.08;
    const driftX = Math.cos(t * 0.2) * 0.05;

    // Drag spin decays back toward zero (spring-back to the resting pose).
    if (!dragging.current) {
      spinVel.current = damp(spinVel.current, 0, 3, dt);
      spin.current = damp(spin.current, 0, 2.2, dt);
    }
    spin.current += spinVel.current * dt;

    g.rotation.x = damp(g.rotation.x, -py * 0.12 + driftX, 4, dt);
    g.rotation.y = damp(g.rotation.y, px * 0.22 + driftY, 4, dt) + spin.current;
    g.position.x = damp(g.position.x, px * 0.18, 4, dt);
    g.position.y = damp(g.position.y, py * 0.14, 4, dt);
  });

  const onDown = (e: { clientX: number }) => {
    if (reducedMotion) return;
    dragging.current = true;
    lastX.current = e.clientX;
  };
  const onMove = (e: { clientX: number }) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastX.current;
    lastX.current = e.clientX;
    spinVel.current = THREE.MathUtils.clamp(dx * 0.04, -3, 3);
  };
  const onUp = () => {
    dragging.current = false;
  };

  return (
    <group>
      {/* Invisible interaction plane covers the viewport for drag. */}
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
        <ArcPath litFraction={litFraction} reducedMotion={reducedMotion} />
        {nodes.map((node, i) => (
          <MilestoneNode
            key={i}
            position={positions[i]}
            node={node}
            index={i}
            reducedMotion={reducedMotion}
          />
        ))}
      </group>
    </group>
  );
}

export default function MovementArcScene({
  nodes,
  litFraction,
  reducedMotion = false,
  isCompact = false,
}: {
  nodes: ArcNode[];
  /** 0..1 — how much of the arc glows lime (up to the current marker). */
  litFraction: number;
  reducedMotion?: boolean;
  isCompact?: boolean;
}) {
  // Bloom is the expensive "wow" upgrade — off when motion is reduced (calm
  // static) and off on compact screens (mobile perf budget). On those paths the
  // nodes still read as bright emissive lime, just without the post pass.
  const useBloom = !reducedMotion && !isCompact;

  return (
    <Canvas
      camera={{ position: [0, 0.3, 6.2], fov: 42 }}
      dpr={isCompact ? [1, 1] : [1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
      frameloop={reducedMotion ? "demand" : "always"}
    >
      {/* Transparent background so the dark arc panel shows through. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 5]} intensity={0.9} />
      <pointLight position={[-4, -2, 3]} color={LIME} intensity={0.5} />
      <pointLight position={[3, 4, -4]} color={LIME} intensity={0.4} />
      <ArcGroup nodes={nodes} litFraction={litFraction} reducedMotion={reducedMotion} />

      {useBloom ? (
        <EffectComposer>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.62}
            luminanceSmoothing={0.28}
            mipmapBlur
            radius={0.7}
          />
        </EffectComposer>
      ) : (
        <></>
      )}
    </Canvas>
  );
}
