import { useEffect, useRef, Component, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  useGameStore,
  BATTLE_COLS_EXPORT,
  BATTLE_ROWS_EXPORT,
  BATTLE_CELL_EXPORT,
  bWorldX,
  bWorldZ,
} from '../../game/store';
import { BUILDING_CONFIGS, UNIT_CONFIGS } from '../../game/constants';
import type { Unit, Building, BattleHero } from '../../game/types';
import { heroById } from '../../game/heroes';

const TOTAL_W = BATTLE_COLS_EXPORT * BATTLE_CELL_EXPORT;
const TOTAL_H = BATTLE_ROWS_EXPORT * BATTLE_CELL_EXPORT;
const C = BATTLE_CELL_EXPORT;

// ─── HP Bar (always visible) ──────────────────────────────────────────────
function HpBar({ hp, maxHp, y, width = 1.0 }: { hp: number; maxHp: number; y: number; width?: number }) {
  const ratio = hp / maxHp;
  const color = ratio > 0.6 ? '#33dd44' : ratio > 0.3 ? '#ffaa00' : '#ff2222';
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <boxGeometry args={[width, 0.13, 0.08]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      <mesh position={[-(width * (1 - ratio)) / 2, 0, 0.05]}>
        <boxGeometry args={[width * ratio, 0.11, 0.07]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// ─── Camera ───────────────────────────────────────────────────────────────
function BattleCamera() {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  useEffect(() => {
    camera.position.set(0, 40, 40);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  useEffect(() => {
    const kd = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const ku = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    const wh = (e: WheelEvent) => {
      camera.position.y = Math.max(10, Math.min(70, camera.position.y + e.deltaY * 0.05));
      camera.position.z = camera.position.y;
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    gl.domElement.addEventListener('wheel', wh, { passive: true });
    gl.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      gl.domElement.removeEventListener('wheel', wh);
    };
  }, [camera, gl]);
  useFrame((_, dt) => {
    const sp = 22 * dt;
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) camera.position.x -= sp;
    if (keys.current['KeyD'] || keys.current['ArrowRight']) camera.position.x += sp;
    if (keys.current['KeyW'] || keys.current['ArrowUp']) camera.position.z -= sp;
    if (keys.current['KeyS'] || keys.current['ArrowDown']) camera.position.z += sp;
    camera.position.x = Math.max(-TOTAL_W / 2, Math.min(TOTAL_W / 2, camera.position.x));
    camera.position.z = Math.max(-TOTAL_H / 2, Math.min(TOTAL_H + 5, camera.position.z));
    camera.lookAt(camera.position.x, 0, camera.position.z - camera.position.y);
  });
  return null;
}

// ─── Terrain ──────────────────────────────────────────────────────────────
function BattleTerrain() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[TOTAL_W, TOTAL_H]} />
        <meshLambertMaterial color="#3d6b40" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-TOTAL_W / 4, 0.01, 0]}>
        <planeGeometry args={[TOTAL_W / 2, TOTAL_H]} />
        <meshBasicMaterial color="#44aa55" opacity={0.08} transparent />
      </mesh>
      {/* Center divider line */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, TOTAL_H]} />
        <meshBasicMaterial color="#ffffff" opacity={0.15} transparent />
      </mesh>
      {/* Ground detail patches */}
      {[-8, -3, 4, 9].map((x) =>
        [-6, 0, 6].map((z) => (
          <mesh key={`${x},${z}`} rotation={[-Math.PI / 2, 0, Math.random()]} position={[x, 0.01, z]}>
            <planeGeometry args={[0.8, 0.8]} />
            <meshBasicMaterial color="#2d5230" opacity={0.4} transparent />
          </mesh>
        ))
      )}
    </group>
  );
}

// ─── Wall building (castle wall with battlements) ─────────────────────────
function WallMesh({ building, isEnemy }: { building: Building; isEnemy: boolean }) {
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const stone = isEnemy ? '#6b4040' : '#9a9a8a';
  const stoneDark = isEnemy ? '#5a3030' : '#7a7a6a';
  const merlonH = 0.35;
  const wallH = 1.1;
  const wallW = C * 0.9;

  return (
    <group position={[x, 0, z]}>
      {/* Main wall body */}
      <mesh position={[0, wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallW, wallH, C * 0.4]} />
        <meshLambertMaterial color={stone} />
      </mesh>
      {/* Battlements (merlons) — 4 across the top */}
      {[-0.35, -0.12, 0.12, 0.35].map((dx, i) => (
        <mesh key={i} position={[dx * wallW, wallH + merlonH / 2, 0]} castShadow>
          <boxGeometry args={[C * 0.15, merlonH, C * 0.42]} />
          <meshLambertMaterial color={stoneDark} />
        </mesh>
      ))}
      {/* Side pillars for depth */}
      <mesh position={[-wallW / 2 + 0.08, wallH * 0.6, 0]} castShadow>
        <boxGeometry args={[0.22, wallH * 0.7, C * 0.5]} />
        <meshLambertMaterial color={stoneDark} />
      </mesh>
      <mesh position={[wallW / 2 - 0.08, wallH * 0.6, 0]} castShadow>
        <boxGeometry args={[0.22, wallH * 0.7, C * 0.5]} />
        <meshLambertMaterial color={stoneDark} />
      </mesh>
      <HpBar hp={building.hp} maxHp={building.maxHp} y={wallH + merlonH + 0.5} width={1.4} />
    </group>
  );
}

// ─── Tower building (stone cylindrical tower with parapet) ────────────────
function TowerMesh({ building }: { building: Building }) {
  const flashRef = useRef<THREE.PointLight>(null);
  const flashTimer = useRef(0);
  const prevProjectileCount = useRef(0);
  const projectiles = useGameStore((s) => s.projectiles);

  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const isEnemy = building.faction === 'enemy';
  const stone = isEnemy ? '#7a3030' : '#8a8a9a';
  const stoneDark = isEnemy ? '#5a1a1a' : '#6a6a7a';
  const accentColor = isEnemy ? '#cc2222' : '#7b68ee';

  useFrame((_, dt) => {
    const count = projectiles.filter((p) => p.sourceId === building.id).length;
    if (count > prevProjectileCount.current) flashTimer.current = 0.18;
    prevProjectileCount.current = count;
    if (flashRef.current) {
      flashTimer.current = Math.max(0, flashTimer.current - dt);
      flashRef.current.intensity = flashTimer.current > 0 ? 10 : 0;
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* Base foundation */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[0.78, 0.88, 0.24, 10]} />
        <meshLambertMaterial color={stoneDark} />
      </mesh>
      {/* Main tower body */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.58, 0.72, 2.0, 10]} />
        <meshLambertMaterial color={stone} />
      </mesh>
      {/* Arrow slits (decorative boxes cut into front) */}
      <mesh position={[0, 1.1, 0.59]} castShadow>
        <boxGeometry args={[0.1, 0.55, 0.08]} />
        <meshLambertMaterial color={stoneDark} />
      </mesh>
      <mesh position={[0.42, 1.1, 0.42]} castShadow>
        <boxGeometry args={[0.08, 0.45, 0.08]} />
        <meshLambertMaterial color={stoneDark} />
      </mesh>
      {/* Parapet ring */}
      <mesh position={[0, 2.22, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.6, 0.28, 10]} />
        <meshLambertMaterial color={stoneDark} />
      </mesh>
      {/* Merlons around parapet top */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.65, 2.52, Math.sin(angle) * 0.65]} castShadow>
            <boxGeometry args={[0.22, 0.3, 0.22]} />
            <meshLambertMaterial color={stone} />
          </mesh>
        );
      })}
      {/* Cannon / ballista barrel */}
      <mesh position={[0, 2.1, 0.62]} rotation={[Math.PI / 2.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.55, 8]} />
        <meshLambertMaterial color={accentColor} />
      </mesh>
      {/* Faction flag on top */}
      <mesh position={[0, 3.0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
        <meshLambertMaterial color="#888" />
      </mesh>
      <mesh position={[0.18, 3.25, 0]} castShadow>
        <boxGeometry args={[0.38, 0.24, 0.04]} />
        <meshLambertMaterial color={accentColor} />
      </mesh>
      <pointLight ref={flashRef} color="#ffee88" intensity={0} distance={10} position={[0, 2.2, 0.8]} />
      <HpBar hp={building.hp} maxHp={building.maxHp} y={3.6} width={1.4} />
    </group>
  );
}

// ─── Townhall (castle fortress) ───────────────────────────────────────────
function TownhallMesh({ building }: { building: Building }) {
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const isEnemy = building.faction === 'enemy';
  const stone = isEnemy ? '#883333' : '#aaa89a';
  const stoneDark = isEnemy ? '#661a1a' : '#887a6a';
  const roofColor = isEnemy ? '#cc1111' : '#2255cc';
  const sz = C * 0.82;

  return (
    <group position={[x, 0, z]}>
      {/* Base platform */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[sz + 0.3, 0.3, sz + 0.3]} />
        <meshLambertMaterial color={stoneDark} />
      </mesh>
      {/* Main keep body */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[sz, 2.4, sz]} />
        <meshLambertMaterial color={stone} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[sz * 0.72, 1.2, 4]} />
        <meshLambertMaterial color={roofColor} />
      </mesh>
      {/* Corner towers */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dz], i) => (
        <group key={i} position={[dx * sz * 0.45, 0, dz * sz * 0.45]}>
          <mesh position={[0, 1.3, 0]} castShadow>
            <cylinderGeometry args={[0.28, 0.32, 2.6, 8]} />
            <meshLambertMaterial color={stoneDark} />
          </mesh>
          <mesh position={[0, 2.75, 0]} castShadow>
            <coneGeometry args={[0.35, 0.7, 8]} />
            <meshLambertMaterial color={roofColor} />
          </mesh>
        </group>
      ))}
      {/* Gate arch */}
      <mesh position={[0, 0.7, sz / 2 + 0.02]} castShadow>
        <boxGeometry args={[0.55, 1.4, 0.12]} />
        <meshLambertMaterial color={stoneDark} />
      </mesh>
      {/* Battlements on keep top */}
      {[-0.6, -0.2, 0.2, 0.6].map((dx, i) => (
        <mesh key={i} position={[dx * sz, 2.56, sz / 2 + 0.02]} castShadow>
          <boxGeometry args={[0.22, 0.32, 0.14]} />
          <meshLambertMaterial color={stoneDark} />
        </mesh>
      ))}
      <HpBar hp={building.hp} maxHp={building.maxHp} y={3.6} width={1.6} />
    </group>
  );
}

// ─── Barracks ─────────────────────────────────────────────────────────────
function BarracksMesh({ building }: { building: Building }) {
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const isEnemy = building.faction === 'enemy';
  const wall = isEnemy ? '#7a4040' : '#8a7a60';
  const roof = isEnemy ? '#551111' : '#5a4a30';
  const sz = C * 0.84;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[sz, 1.1, sz]} />
        <meshLambertMaterial color={wall} />
      </mesh>
      {/* Angled roof */}
      <mesh position={[0, 1.22, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[sz * 0.7, 0.65, 4]} />
        <meshLambertMaterial color={roof} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.45, sz / 2 + 0.01]} castShadow>
        <boxGeometry args={[0.32, 0.9, 0.06]} />
        <meshLambertMaterial color="#333" />
      </mesh>
      {/* Windows */}
      <mesh position={[sz * 0.3, 0.65, sz / 2 + 0.01]}>
        <boxGeometry args={[0.22, 0.22, 0.05]} />
        <meshBasicMaterial color="#88aacc" opacity={0.7} transparent />
      </mesh>
      <mesh position={[-sz * 0.3, 0.65, sz / 2 + 0.01]}>
        <boxGeometry args={[0.22, 0.22, 0.05]} />
        <meshBasicMaterial color="#88aacc" opacity={0.7} transparent />
      </mesh>
      <HpBar hp={building.hp} maxHp={building.maxHp} y={2.1} width={1.3} />
    </group>
  );
}

// ─── Melee Dojo (sword training hall) ─────────────────────────────────────
function BarracksMeleeMesh({ building }: { building: Building }) {
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const isEnemy = building.faction === 'enemy';
  const wall = isEnemy ? '#7a3030' : '#8a5a4a';
  const roof = isEnemy ? '#551111' : '#c62828';
  const sz = C * 0.84;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[sz, 1.1, sz]} />
        <meshLambertMaterial color={wall} />
      </mesh>
      <mesh position={[0, 1.22, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[sz * 0.7, 0.6, 4]} />
        <meshLambertMaterial color={roof} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.45, sz / 2 + 0.01]} castShadow>
        <boxGeometry args={[0.32, 0.9, 0.06]} />
        <meshLambertMaterial color="#333" />
      </mesh>
      {/* Crossed training swords above the door */}
      <group position={[0, 1.05, sz / 2 + 0.03]}>
        <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.06, 0.55, 0.03]} />
          <meshLambertMaterial color="#d8d8d8" />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]} castShadow>
          <boxGeometry args={[0.06, 0.55, 0.03]} />
          <meshLambertMaterial color="#d8d8d8" />
        </mesh>
        <mesh position={[0, -0.16, 0]}>
          <boxGeometry args={[0.16, 0.08, 0.04]} />
          <meshLambertMaterial color="#a0522d" />
        </mesh>
      </group>
      {/* Wooden training dummy out front */}
      <group position={[sz * 0.42, 0, sz * 0.42]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.7, 6]} />
          <meshLambertMaterial color="#8a6a3a" />
        </mesh>
        <mesh position={[0, 0.6, 0]} castShadow>
          <boxGeometry args={[0.32, 0.06, 0.06]} />
          <meshLambertMaterial color="#8a6a3a" />
        </mesh>
      </group>
      <HpBar hp={building.hp} maxHp={building.maxHp} y={2.1} width={1.3} />
    </group>
  );
}

// ─── Archer Range (watchtower with practice targets) ──────────────────────
function BarracksRangedMesh({ building }: { building: Building }) {
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const isEnemy = building.faction === 'enemy';
  const wall = isEnemy ? '#5a4030' : '#6b8a4e';
  const roof = isEnemy ? '#551111' : '#3f6b2a';
  const sz = C * 0.7;

  return (
    <group position={[x, 0, z]}>
      {/* Tall wooden lookout tower */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[sz * 0.34, sz * 0.4, 1.4, 8]} />
        <meshLambertMaterial color={wall} />
      </mesh>
      {/* Platform */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[sz * 0.5, sz * 0.5, 0.14, 8]} />
        <meshLambertMaterial color="#5a4020" />
      </mesh>
      {/* Conical thatched roof */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <coneGeometry args={[sz * 0.55, 0.7, 8]} />
        <meshLambertMaterial color={roof} />
      </mesh>
      {/* Support posts */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(angle) * sz * 0.4, 0.7, Math.sin(angle) * sz * 0.4]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1.4, 6]} />
            <meshLambertMaterial color="#4a3520" />
          </mesh>
        );
      })}
      {/* Archery target out front */}
      <group position={[0, 0.5, sz * 0.85]} rotation={[0, 0, 0]}>
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.08, 12]} />
          <meshLambertMaterial color="#e8d8b8" />
        </mesh>
        <mesh position={[0, 0, 0.045]}>
          <ringGeometry args={[0.1, 0.16, 12]} />
          <meshBasicMaterial color="#cc2222" side={2} />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <circleGeometry args={[0.06, 12]} />
          <meshBasicMaterial color="#222" side={2} />
        </mesh>
      </group>
      <HpBar hp={building.hp} maxHp={building.maxHp} y={2.4} width={1.2} />
    </group>
  );
}

// ─── Shield Barracks (reinforced stone bastion) ───────────────────────────
function BarracksTankMesh({ building }: { building: Building }) {
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const isEnemy = building.faction === 'enemy';
  const wall = isEnemy ? '#5a3a3a' : '#78828c';
  const wallDark = isEnemy ? '#3a2020' : '#57606a';
  const sz = C * 0.86;

  return (
    <group position={[x, 0, z]}>
      {/* Squat fortified block */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[sz, 1.0, sz]} />
        <meshLambertMaterial color={wall} />
      </mesh>
      {/* Reinforced parapet rim */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[sz * 1.04, 0.18, sz * 1.04]} />
        <meshLambertMaterial color={wallDark} />
      </mesh>
      {/* Merlons */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx * sz * 0.4, 1.28, dz * sz * 0.4]} castShadow>
          <boxGeometry args={[0.2, 0.24, 0.2]} />
          <meshLambertMaterial color={wallDark} />
        </mesh>
      ))}
      {/* Door */}
      <mesh position={[0, 0.4, sz / 2 + 0.01]} castShadow>
        <boxGeometry args={[0.4, 0.8, 0.08]} />
        <meshLambertMaterial color="#2a2a2a" />
      </mesh>
      {/* Large shield emblem above the door */}
      <mesh position={[0, 0.95, sz / 2 + 0.03]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.05, 6]} />
        <meshLambertMaterial color="#c0c0c8" />
      </mesh>
      <mesh position={[0, 0.95, sz / 2 + 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 6]} />
        <meshLambertMaterial color="#8a6a1a" />
      </mesh>
      <HpBar hp={building.hp} maxHp={building.maxHp} y={2.0} width={1.35} />
    </group>
  );
}

// ─── Magic Tower (mystical caster training spire) ─────────────────────────
function BarracksCasterMesh({ building }: { building: Building }) {
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const isEnemy = building.faction === 'enemy';
  const glow = useRef<THREE.Mesh>(null);
  const wall = isEnemy ? '#4a2a5a' : '#5e3d7a';
  const roof = isEnemy ? '#8822aa' : '#9c27b0';
  const sz = C * 0.62;

  useFrame(({ clock }) => {
    if (glow.current) {
      const t = clock.getElapsedTime();
      glow.current.position.y = 2.5 + Math.sin(t * 2) * 0.08;
      glow.current.rotation.y = t * 1.2;
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* Circular tower body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[sz * 0.42, sz * 0.5, 1.8, 8]} />
        <meshLambertMaterial color={wall} />
      </mesh>
      {/* Pointed spire roof */}
      <mesh position={[0, 2.15, 0]} castShadow>
        <coneGeometry args={[sz * 0.5, 1.0, 8]} />
        <meshLambertMaterial color={roof} />
      </mesh>
      {/* Arcane windows */}
      <mesh position={[0, 1.1, sz * 0.5]}>
        <circleGeometry args={[0.16, 8]} />
        <meshBasicMaterial color="#c896ff" opacity={0.8} transparent />
      </mesh>
      <mesh position={[sz * 0.5, 1.1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.16, 8]} />
        <meshBasicMaterial color="#c896ff" opacity={0.8} transparent />
      </mesh>
      {/* Floating crystal above the spire */}
      <mesh ref={glow} position={[0, 2.5, 0]} castShadow>
        <octahedronGeometry args={[0.16, 0]} />
        <meshBasicMaterial color="#e0aaff" />
      </mesh>
      <pointLight color="#c896ff" intensity={1.4} distance={4} position={[0, 2.5, 0]} />
      <HpBar hp={building.hp} maxHp={building.maxHp} y={2.9} width={1.1} />
    </group>
  );
}

// ─── Hospital (field medical tent with red cross) ─────────────────────────
function HospitalMesh({ building }: { building: Building }) {
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const isEnemy = building.faction === 'enemy';
  const wall = isEnemy ? '#7a5050' : '#f0f0ea';
  const roof = isEnemy ? '#5a3a3a' : '#d8d8d0';
  const sz = C * 0.84;

  return (
    <group position={[x, 0, z]}>
      {/* Main tent body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[sz, 1.0, sz]} />
        <meshLambertMaterial color={wall} />
      </mesh>
      {/* Tent-style roof */}
      <mesh position={[0, 1.12, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[sz * 0.72, 0.6, 4]} />
        <meshLambertMaterial color={roof} />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.4, sz / 2 + 0.01]} castShadow>
        <boxGeometry args={[0.32, 0.8, 0.06]} />
        <meshLambertMaterial color="#c0392b" />
      </mesh>
      {/* Red cross emblem on the front wall */}
      <group position={[0, 0.85, sz / 2 + 0.02]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.13, 0.03]} />
          <meshBasicMaterial color="#e02020" />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.13, 0.4, 0.03]} />
          <meshBasicMaterial color="#e02020" />
        </mesh>
      </group>
      {/* Roof-top cross flag */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
        <meshLambertMaterial color="#888" />
      </mesh>
      <group position={[0, 1.7, 0]}>
        <mesh>
          <boxGeometry args={[0.22, 0.07, 0.02]} />
          <meshBasicMaterial color="#e02020" />
        </mesh>
        <mesh>
          <boxGeometry args={[0.07, 0.22, 0.02]} />
          <meshBasicMaterial color="#e02020" />
        </mesh>
      </group>
      <HpBar hp={building.hp} maxHp={building.maxHp} y={2.0} width={1.3} />
    </group>
  );
}

// ─── House ────────────────────────────────────────────────────────────────
function HouseMesh({ building }: { building: Building }) {
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const wall = '#c8a87a';
  const roof = '#8b3030';
  const sz = C * 0.72;

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[sz, 0.85, sz]} />
        <meshLambertMaterial color={wall} />
      </mesh>
      {/* Peaked roof */}
      <mesh position={[0, 1.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[sz * 0.72, 0.7, 4]} />
        <meshLambertMaterial color={roof} />
      </mesh>
      {/* Chimney */}
      <mesh position={[sz * 0.25, 1.3, sz * 0.1]} castShadow>
        <boxGeometry args={[0.14, 0.55, 0.14]} />
        <meshLambertMaterial color="#777" />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.36, sz / 2 + 0.01]}>
        <boxGeometry args={[0.24, 0.7, 0.05]} />
        <meshLambertMaterial color="#5a3a1a" />
      </mesh>
      <HpBar hp={building.hp} maxHp={building.maxHp} y={1.9} width={1.1} />
    </group>
  );
}

// ─── Farm ─────────────────────────────────────────────────────────────────
function FarmMesh({ building }: { building: Building }) {
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const sz = C * 0.88;

  return (
    <group position={[x, 0, z]}>
      {/* Field base */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[sz, 0.1, sz]} />
        <meshLambertMaterial color="#6b5a2a" />
      </mesh>
      {/* Crop rows */}
      {[-0.3, -0.1, 0.1, 0.3].map((dx, i) => (
        <mesh key={i} position={[dx * sz, 0.18, 0]} castShadow>
          <boxGeometry args={[0.1, 0.26, sz * 0.85]} />
          <meshLambertMaterial color="#88aa33" />
        </mesh>
      ))}
      {/* Small barn */}
      <mesh position={[sz * 0.3, 0.28, -sz * 0.3]} castShadow>
        <boxGeometry args={[0.38, 0.56, 0.38]} />
        <meshLambertMaterial color="#cc8833" />
      </mesh>
      <mesh position={[sz * 0.3, 0.64, -sz * 0.3]} castShadow>
        <coneGeometry args={[0.3, 0.35, 4]} />
        <meshLambertMaterial color="#882222" />
      </mesh>
      <HpBar hp={building.hp} maxHp={building.maxHp} y={1.2} width={1.2} />
    </group>
  );
}

// ─── Mine ─────────────────────────────────────────────────────────────────
function MineMesh({ building }: { building: Building }) {
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const sz = C * 0.78;

  return (
    <group position={[x, 0, z]}>
      {/* Rocky mound */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[sz * 0.46, sz * 0.52, 0.6, 7]} />
        <meshLambertMaterial color="#7a7060" />
      </mesh>
      {/* Mine entrance */}
      <mesh position={[0, 0.32, sz * 0.38]} castShadow>
        <boxGeometry args={[0.38, 0.6, 0.2]} />
        <meshLambertMaterial color="#222" />
      </mesh>
      {/* Support beams */}
      <mesh position={[-0.16, 0.52, sz * 0.44]} castShadow>
        <boxGeometry args={[0.07, 0.6, 0.07]} />
        <meshLambertMaterial color="#6b4820" />
      </mesh>
      <mesh position={[0.16, 0.52, sz * 0.44]} castShadow>
        <boxGeometry args={[0.07, 0.6, 0.07]} />
        <meshLambertMaterial color="#6b4820" />
      </mesh>
      <mesh position={[0, 0.72, sz * 0.44]} castShadow>
        <boxGeometry args={[0.44, 0.07, 0.07]} />
        <meshLambertMaterial color="#6b4820" />
      </mesh>
      {/* Ore sparkle */}
      <mesh position={[sz * 0.18, 0.45, sz * 0.1]} castShadow>
        <octahedronGeometry args={[0.14, 0]} />
        <meshLambertMaterial color="#ffd700" />
      </mesh>
      <HpBar hp={building.hp} maxHp={building.maxHp} y={1.5} width={1.1} />
    </group>
  );
}

// ─── Building mesh router ─────────────────────────────────────────────────
function BuildingMesh({ building }: { building: Building }) {
  const isEnemy = building.faction === 'enemy';

  if (building.type === 'tower') return <TowerMesh building={building} />;
  if (building.type === 'townhall') return <TownhallMesh building={building} />;
  if (building.type === 'wall') return <WallMesh building={building} isEnemy={isEnemy} />;
  if (building.type === 'barracks') return <BarracksMesh building={building} />;
  if (building.type === 'barracks_melee') return <BarracksMeleeMesh building={building} />;
  if (building.type === 'barracks_ranged') return <BarracksRangedMesh building={building} />;
  if (building.type === 'barracks_tank') return <BarracksTankMesh building={building} />;
  if (building.type === 'barracks_caster') return <BarracksCasterMesh building={building} />;
  if (building.type === 'hospital') return <HospitalMesh building={building} />;
  if (building.type === 'house') return <HouseMesh building={building} />;
  if (building.type === 'farm') return <FarmMesh building={building} />;
  if (building.type === 'mine') return <MineMesh building={building} />;

  // Fallback generic building
  const cfg = BUILDING_CONFIGS[building.type as keyof typeof BUILDING_CONFIGS];
  const x = bWorldX(building.gridX);
  const z = bWorldZ(building.gridZ);
  const color = isEnemy
    ? '#aa3333'
    : cfg?.color ?? '#888';
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[C * 0.8, 1.0, C * 0.8]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <HpBar hp={building.hp} maxHp={building.maxHp} y={1.8} />
    </group>
  );
}

function BattleBuildings() {
  const buildings = useGameStore((s) => s.battleBuildings);
  return (
    <group>
      {buildings.map((b) => <BuildingMesh key={b.id} building={b} />)}
    </group>
  );
}

// ─── Hero with distinctive silhouette, aura, and HP bar ────────────────────
function HeroMesh({ hero }: { hero: BattleHero }) {
  const bodyRef = useRef<THREE.Group>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const heroRef = useRef(hero);
  heroRef.current = hero;
  const definition = heroById(hero.definitionId);
  const color = definition?.color ?? '#ffd166';
  const archetype = hero.archetype;
  const isCaster = archetype === 'caster';
  const isTank = archetype === 'tank';
  const isRanged = archetype === 'ranged';
  const isStrike = archetype === 'strike';

  useFrame(({ clock }, dt) => {
    const current = heroRef.current;
    const t = clock.getElapsedTime();
    if (auraRef.current) {
      auraRef.current.rotation.z = t * 0.8;
      const pulse = 1 + Math.sin(t * 4) * (current.skillActiveTimer > 0 ? 0.1 : 0.035);
      auraRef.current.scale.setScalar(pulse);
      (auraRef.current.material as THREE.MeshBasicMaterial).opacity = current.skillActiveTimer > 0 ? 0.6 : 0.2;
    }
    if (bodyRef.current) {
      if (current.state === 'moving') {
        bodyRef.current.position.y = Math.abs(Math.sin(t * 7)) * 0.1;
      } else if (current.state === 'skill') {
        bodyRef.current.position.y = Math.sin(t * 9) * 0.08;
        bodyRef.current.rotation.y += dt * 3;
      } else {
        bodyRef.current.position.y = 0;
        bodyRef.current.rotation.y *= 0.9;
      }
    }
  });

  return (
    <group position={[hero.x, 0, hero.z]}>
      <mesh ref={auraRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.9, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
      <group ref={bodyRef}>
        {/* Large faction-neutral hero core */}
        <mesh position={[0, 0.72, 0]} castShadow>
          <cylinderGeometry args={[isTank ? 0.48 : 0.38, isTank ? 0.58 : 0.46, 1.05, 8]} />
          <meshLambertMaterial color={color} />
        </mesh>
        <mesh position={[0, 1.42, 0]} castShadow>
          {isTank ? <boxGeometry args={[0.58, 0.42, 0.58]} /> : <sphereGeometry args={[0.3, 10, 8]} />}
          <meshLambertMaterial color={isTank ? '#d6dde3' : '#f1d0aa'} />
        </mesh>
        {/* Crown / command crest */}
        <mesh position={[0, 1.84, 0]} castShadow>
          <coneGeometry args={[0.34, 0.34, 5]} />
          <meshLambertMaterial color={color} />
        </mesh>
        {/* Class emblem */}
        {isTank && (
          <mesh position={[0, 0.78, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 6]} />
            <meshBasicMaterial color="#f4f7fb" />
          </mesh>
        )}
        {isCaster && (
          <mesh position={[0.5, 1.0, 0]} castShadow>
            <octahedronGeometry args={[0.16, 0]} />
            <meshBasicMaterial color="#f0b6ff" />
          </mesh>
        )}
        {isRanged && (
          <mesh position={[0.45, 0.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <torusGeometry args={[0.24, 0.045, 6, 16, Math.PI]} />
            <meshLambertMaterial color="#7a4a2a" />
          </mesh>
        )}
        {!isRanged && !isCaster && (
          <mesh position={[0.54, 0.8, 0]} rotation={[0, 0, isStrike ? 0.25 : -0.15]} castShadow>
            <boxGeometry args={[0.09, isStrike ? 1.15 : 0.9, 0.09]} />
            <meshLambertMaterial color="#f4e5c2" />
          </mesh>
        )}
        {isStrike && (
          <mesh position={[-0.42, 0.8, 0]} rotation={[0, 0, -0.5]} castShadow>
            <boxGeometry args={[0.12, 0.5, 0.12]} />
            <meshLambertMaterial color="#ffb347" />
          </mesh>
        )}
      </group>
      <pointLight color={color} intensity={hero.skillActiveTimer > 0 ? 2.2 : 0.65} distance={4} position={[0, 1.1, 0]} />
      <HpBar hp={hero.hp} maxHp={hero.maxHp} y={2.35} width={1.45} />
    </group>
  );
}

function BattleHeroVisual() {
  const hero = useGameStore((s) => s.battleHero);
  return hero ? <HeroMesh hero={hero} /> : null;
}

// ─── Unit with attack animation + always-visible HP bar ───────────────────
function UnitMesh({ unit }: { unit: Unit }) {
  const bodyRef = useRef<THREE.Group>(null);
  const weaponRef = useRef<THREE.Mesh>(null);
  const slashRef = useRef<THREE.Mesh>(null);
  const anim = useRef({ phase: 0, wasAttacking: false, slashAlpha: 0 });
  const unitRef = useRef(unit);
  unitRef.current = unit;

  const isEnemy = unit.faction === 'enemy';
  const cfg = UNIT_CONFIGS[unit.type as keyof typeof UNIT_CONFIGS];
  const archetype = cfg?.archetype ?? 'melee';

  // Enemy-tinted variant of the unit's own color (rendering is archetype-driven
  // rather than per-unit-type, since there are 40 unit types across 10 tiers).
  const ENEMY_ARCHETYPE_COLORS: Record<string, string> = {
    melee: '#bb2222', ranged: '#dd4400', tank: '#aa3300', caster: '#771177', strike: '#880000',
  };
  const bodyColor = isEnemy
    ? ENEMY_ARCHETYPE_COLORS[archetype] ?? '#bb2222'
    : cfg?.color ?? '#4488ff';
  const headColor = isEnemy ? '#cc4422' : '#f5deb3';

  const isKnight = archetype === 'strike';
  const isPaladin = archetype === 'tank';
  const isDragonKnight = false;
  const isSpearman = archetype === 'melee';
  const isMage = archetype === 'caster';
  const isRanged = archetype === 'ranged' || archetype === 'caster';
  const isHeavy = archetype === 'tank';

  const bodyH = isHeavy ? 1.0 : isKnight ? 0.9 : 0.75;
  const bodyW = isHeavy ? 0.7 : isKnight ? 0.6 : 0.5;
  const bodyD = isHeavy ? 0.5 : isKnight ? 0.45 : 0.38;

  useFrame((_, dt) => {
    const u = unitRef.current;
    if (!bodyRef.current) return;

    if (u.state === 'attacking') {
      anim.current.phase += dt * 8;
      const t = Math.sin(anim.current.phase);

      if (!isRanged) {
        // Melee attack animation (soldier, spearman, knight, paladin, dragon_knight)
        const dir = isEnemy ? -1 : 1;
        const lunge = isHeavy ? 0.7 : isKnight ? 0.65 : isSpearman ? 0.55 : 0.5;
        const swingMult = isHeavy ? 1.8 : isKnight ? 1.5 : isSpearman ? 1.0 : 1.2;
        bodyRef.current.position.x = dir * Math.max(0, t) * lunge;
        bodyRef.current.rotation.z = -dir * Math.max(0, t) * 0.3;
        if (weaponRef.current) {
          weaponRef.current.rotation.z = t * swingMult;
          weaponRef.current.scale.setScalar(1 + Math.max(0, t) * 0.3);
        }
        if (slashRef.current) {
          anim.current.slashAlpha = Math.max(0, t) * 0.85;
          (slashRef.current.material as THREE.MeshBasicMaterial).opacity = anim.current.slashAlpha;
          slashRef.current.scale.setScalar(1 + Math.max(0, t) * (isHeavy ? 2.0 : isKnight ? 1.6 : 1.2));
        }
      } else {
        // Ranged attack animation (archer, mage)
        bodyRef.current.rotation.z = Math.sin(anim.current.phase * 0.5) * 0.35;
        if (weaponRef.current) {
          weaponRef.current.scale.y = 1 - Math.max(0, t) * 0.4;
          weaponRef.current.position.z = Math.max(0, t) * 0.3;
        }
        // no per-unit light (removed for performance)
        if (slashRef.current) {
          anim.current.slashAlpha = Math.max(0, -t) * (isMage ? 0.9 : 0.5);
          (slashRef.current.material as THREE.MeshBasicMaterial).opacity = anim.current.slashAlpha;
        }
      }
      anim.current.wasAttacking = true;
    } else {
      if (anim.current.wasAttacking) {
        bodyRef.current.position.x = 0;
        bodyRef.current.rotation.z = 0;
        if (weaponRef.current) {
          weaponRef.current.rotation.z = 0;
          weaponRef.current.scale.setScalar(1);
          weaponRef.current.position.z = 0;
        }
        if (slashRef.current) {
          anim.current.slashAlpha = 0;
          (slashRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
          slashRef.current.scale.setScalar(1);
        }
        // (no light ref)
        anim.current.phase = 0;
        anim.current.wasAttacking = false;
      }
      if (u.state === 'moving') {
        anim.current.phase += dt * 6;
        bodyRef.current.position.y = Math.abs(Math.sin(anim.current.phase)) * 0.08;
      }
    }
  });

  return (
    <group position={[unit.x, 0, unit.z]}>
      <group ref={bodyRef}>
        {/* Legs */}
        <mesh position={[-0.12, 0.12, 0]} castShadow>
          <boxGeometry args={[0.15, 0.24, 0.18]} />
          <meshLambertMaterial color={isEnemy ? '#661111' : '#334477'} />
        </mesh>
        <mesh position={[0.12, 0.12, 0]} castShadow>
          <boxGeometry args={[0.15, 0.24, 0.18]} />
          <meshLambertMaterial color={isEnemy ? '#661111' : '#334477'} />
        </mesh>

        {/* Body */}
        <mesh position={[0, bodyH / 2 + 0.18, 0]} castShadow>
          <boxGeometry args={[bodyW, bodyH, bodyD]} />
          <meshLambertMaterial color={bodyColor} />
        </mesh>

        {/* Head */}
        <mesh position={[0, bodyH + 0.3, 0]} castShadow>
          {(isKnight || isPaladin || isDragonKnight)
            ? <boxGeometry args={[isPaladin ? 0.45 : isDragonKnight ? 0.5 : 0.4, 0.35, isPaladin ? 0.45 : isDragonKnight ? 0.5 : 0.4]} />
            : <sphereGeometry args={[isMage ? 0.2 : 0.22, 8, 8]} />}
          <meshLambertMaterial color={
            isKnight ? (isEnemy ? '#882200' : '#8888aa') :
            isPaladin ? (isEnemy ? '#aa6600' : '#e8d88a') :
            isDragonKnight ? (isEnemy ? '#660000' : '#884422') :
            isMage ? (isEnemy ? '#551155' : '#aa44cc') :
            headColor
          } />
        </mesh>

        {/* Helmet plume for knight */}
        {isKnight && (
          <mesh position={[0, bodyH + 0.58, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.08, 0.28, 6]} />
            <meshLambertMaterial color={isEnemy ? '#ff2200' : '#2255ff'} />
          </mesh>
        )}

        {/* Paladin halo */}
        {isPaladin && (
          <mesh position={[0, bodyH + 0.72, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.3, 0.05, 6, 16]} />
            <meshLambertMaterial color={isEnemy ? '#cc6600' : '#ffd700'} />
          </mesh>
        )}

        {/* Dragon Knight horns */}
        {isDragonKnight && (
          <>
            <mesh position={[-0.18, bodyH + 0.6, 0]} rotation={[0, 0, -0.5]} castShadow>
              <coneGeometry args={[0.07, 0.35, 5]} />
              <meshLambertMaterial color={isEnemy ? '#550000' : '#882200'} />
            </mesh>
            <mesh position={[0.18, bodyH + 0.6, 0]} rotation={[0, 0, 0.5]} castShadow>
              <coneGeometry args={[0.07, 0.35, 5]} />
              <meshLambertMaterial color={isEnemy ? '#550000' : '#882200'} />
            </mesh>
          </>
        )}

        {/* Mage hat */}
        {isMage && (
          <mesh position={[0, bodyH + 0.6, 0]} castShadow>
            <coneGeometry args={[0.2, 0.45, 8]} />
            <meshLambertMaterial color={isEnemy ? '#440044' : '#6600aa'} />
          </mesh>
        )}

        {/* Shield for soldier */}
        {unit.type === 'soldier' && (
          <mesh position={[isEnemy ? 0.35 : -0.35, 0.55, 0.1]} rotation={[0, isEnemy ? -0.4 : 0.4, 0]} castShadow>
            <boxGeometry args={[0.08, 0.42, 0.32]} />
            <meshLambertMaterial color={isEnemy ? '#882222' : '#224488'} />
          </mesh>
        )}

        {/* Shield for spearman */}
        {isSpearman && (
          <mesh position={[isEnemy ? 0.38 : -0.38, 0.55, 0.08]} rotation={[0, isEnemy ? -0.3 : 0.3, 0]} castShadow>
            <boxGeometry args={[0.08, 0.52, 0.38]} />
            <meshLambertMaterial color={isEnemy ? '#772222' : '#334455'} />
          </mesh>
        )}

        {/* Paladin shield (large) */}
        {isPaladin && (
          <mesh position={[isEnemy ? 0.48 : -0.48, 0.55, 0.05]} rotation={[0, isEnemy ? -0.3 : 0.3, 0]} castShadow>
            <boxGeometry args={[0.1, 0.65, 0.48]} />
            <meshLambertMaterial color={isEnemy ? '#884400' : '#ccaa00'} />
          </mesh>
        )}

        {/* Weapons */}
        {unit.type === 'soldier' && (
          <mesh ref={weaponRef} position={[isEnemy ? -0.45 : 0.45, 0.6, 0]} castShadow>
            <boxGeometry args={[0.07, 0.75, 0.07]} />
            <meshLambertMaterial color="#c0c0c0" />
          </mesh>
        )}
        {isKnight && (
          <mesh ref={weaponRef} position={[isEnemy ? -0.6 : 0.6, 0.65, 0]} rotation={[0, 0, 0.25]} castShadow>
            <boxGeometry args={[0.1, 0.95, 0.1]} />
            <meshLambertMaterial color="#ddddff" />
          </mesh>
        )}
        {unit.type === 'archer' && (
          <mesh ref={weaponRef} position={[isEnemy ? -0.4 : 0.4, 0.55, 0]} castShadow>
            <torusGeometry args={[0.23, 0.04, 6, 16, Math.PI]} />
            <meshLambertMaterial color="#7b4a2a" />
          </mesh>
        )}
        {isSpearman && (
          <mesh ref={weaponRef} position={[isEnemy ? -0.5 : 0.5, 0.9, 0]} rotation={[0, 0, 0.15]} castShadow>
            <boxGeometry args={[0.06, 1.1, 0.06]} />
            <meshLambertMaterial color="#a0a0b0" />
          </mesh>
        )}
        {isMage && (
          <mesh ref={weaponRef} position={[isEnemy ? -0.45 : 0.45, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 1.0, 6]} />
            <meshLambertMaterial color={isEnemy ? '#993399' : '#cc44ff'} />
          </mesh>
        )}
        {isPaladin && (
          <mesh ref={weaponRef} position={[isEnemy ? -0.55 : 0.55, 0.7, 0]} rotation={[0, 0, 0.2]} castShadow>
            <boxGeometry args={[0.12, 0.85, 0.12]} />
            <meshLambertMaterial color={isEnemy ? '#cc8800' : '#ffd700'} />
          </mesh>
        )}
        {isDragonKnight && (
          <mesh ref={weaponRef} position={[isEnemy ? -0.65 : 0.65, 0.7, 0]} rotation={[0, 0, 0.2]} castShadow>
            <boxGeometry args={[0.13, 1.1, 0.13]} />
            <meshLambertMaterial color={isEnemy ? '#882222' : '#cc4422'} />
          </mesh>
        )}

        {/* Dragon Knight wing accents */}
        {isDragonKnight && (
          <>
            <mesh position={[isEnemy ? 0.55 : -0.55, 0.7, -0.05]} rotation={[0.2, 0, isEnemy ? 0.8 : -0.8]} castShadow>
              <boxGeometry args={[0.06, 0.55, 0.3]} />
              <meshLambertMaterial color={isEnemy ? '#660000' : '#992211'} />
            </mesh>
          </>
        )}

        {/* Mage orb at staff tip */}
        {isMage && (
          <mesh position={[isEnemy ? -0.45 : 0.45, 1.25, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color={isEnemy ? '#ff44ff' : '#cc88ff'} />
          </mesh>
        )}

        {/* Slash / impact effect */}
        <mesh ref={slashRef} position={[isEnemy ? -0.75 : 0.75, 0.55, 0]} rotation={[0, Math.PI / 2, 0]}>
          <ringGeometry args={[0.1, 0.7, 4]} />
          <meshBasicMaterial
            color={
              isMage ? '#dd88ff' :
              unit.type === 'archer' ? '#88ccff' :
              isPaladin ? '#ffd700' :
              isDragonKnight ? '#ff3300' :
              isEnemy ? '#ff4422' : '#ffcc44'
            }
            transparent opacity={0}
            side={THREE.DoubleSide}
          />
        </mesh>

      </group>

      {/* HP bar — always visible */}
      <HpBar hp={unit.hp} maxHp={unit.maxHp} y={isHeavy ? 2.2 : isKnight ? 2.0 : 1.75} width={isHeavy ? 1.0 : isKnight ? 0.85 : 0.72} />
    </group>
  );
}

function BattleUnits() {
  const playerUnits = useGameStore((s) => s.playerUnits);
  const enemyUnits = useGameStore((s) => s.enemyUnits);
  return (
    <group>
      {[...playerUnits, ...enemyUnits].map((u) => <UnitMesh key={u.id} unit={u} />)}
    </group>
  );
}

// ─── Projectiles ──────────────────────────────────────────────────────────
function BattleProjectiles() {
  const projectiles = useGameStore((s) => s.projectiles);
  return (
    <group>
      {projectiles.map((p) => (
        <mesh key={p.id} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[0.15, 4, 4]} />
          <meshBasicMaterial color={p.faction === 'player' ? '#ffee44' : '#ff4444'} />
        </mesh>
      ))}
    </group>
  );
}

// ─── Game Loop ────────────────────────────────────────────────────────────
function BattleGameLoop() {
  const battleTick = useGameStore((s) => s.battleTick);
  const last = useRef(performance.now());
  useEffect(() => {
    let id: number;
    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - last.current) / 1000, 0.05);
      last.current = now;
      battleTick(dt);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [battleTick]);
  return null;
}

// ─── Error Boundary ───────────────────────────────────────────────────────
class CanvasErrorBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  constructor(props: any) { super(props); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (this.state.err) return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0d1117', color: '#ccc', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ color: '#ff6644', fontSize: 18 }}>WebGLが利用できません</div>
        <div style={{ fontSize: 13, color: '#888' }}>Chrome / Firefox / Edge の最新版をお使いください</div>
      </div>
    );
    return this.props.children;
  }
}

// ─── Main Export ──────────────────────────────────────────────────────────
export function BattleScene() {
  return (
    <CanvasErrorBoundary>
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 500 }}
        style={{ background: '#1a1a2e' }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, failIfMajorPerformanceCaveat: false }}
      >
        <BattleCamera />
        <BattleGameLoop />
        <ambientLight intensity={0.65} />
        <directionalLight position={[30, 50, 20]} intensity={1.1} />
        <hemisphereLight args={['#87ceeb', '#3d6b40', 0.25]} />
        <BattleTerrain />
        <BattleBuildings />
        <BattleHeroVisual />
        <BattleUnits />
        <BattleProjectiles />
      </Canvas>
    </CanvasErrorBoundary>
  );
}
