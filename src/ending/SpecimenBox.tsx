import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, type Group } from 'three'
import { useEndingCfg } from '../state/useConfigStore'
import type { SceneId } from '../config/schema'
import { composeSpecimens, type Placement } from './composition'
import { clearOfGrass, EndingDecor, useGrassClear } from './EndingDecor'
import { FrameModel, pickFrameModel, useFrameInner } from './FrameModel'
import { makeOccupancy, solveLayout, useSpecimenLayout } from './specimenLayout'
import { photoSubject } from './ExportPhoto'
import { segment } from './reveal'
import { SpecimenSlot } from './SpecimenSlot'

/** 3D 画框（占位几何）：四条边框 + 背板 */
function Frame3D() {
  const { size, border, color, metalness, roughness, backColor, backRoughness } = useEndingCfg((c) => c.frame)
  const [w, h, d] = size
  return (
    <group>
      <mesh position={[0, 0, -d / 2]} receiveShadow>
        <boxGeometry args={[w, h, 0.05]} />
        <meshStandardMaterial color={backColor} roughness={backRoughness} />
      </mesh>
      {[
        [0, h / 2 + border / 2, w + border * 2, border],
        [0, -h / 2 - border / 2, w + border * 2, border],
      ].map(([x, y, bw, bh], i) => (
        <mesh key={`h${i}`} position={[x, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[bw, bh, d]} />
          <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`v${side}`} position={[side * (w / 2 + border / 2), 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[border, h, d]} />
          <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
        </mesh>
      ))}
    </group>
  )
}

/** 2D 画框模式：一张平面，之后换成带透明通道的贴图 */
function FramePlane() {
  const { size, border, color, roughness, planeDepth } = useEndingCfg((c) => c.frame)
  return (
    <mesh position={[0, 0, planeDepth]}>
      <planeGeometry args={[size[0] + border * 2, size[1] + border * 2]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  )
}

/**
 * 三件标本统一排版（specimenLayout.ts）：都报上轮廓、草和内框也量好之后求一次，
 * 结果写回 useSpecimenLayout，各 SpecimenSlot 自己应用。
 */
function LayoutSolver({ placements }: { placements: Placement[] }) {
  const reports = useSpecimenLayout((s) => s.reports)
  const clear = useGrassClear((s) => s.clear)
  const inner = useFrameInner((s) => s.inner)
  const needGrass = useEndingCfg((c) => c.decor.enabled && !!c.decor.model && c.decor.grass.enabled)
  const [w, h] = useEndingCfg((c) => c.frame.size)
  const { grassMargin, specimenGap, maxGrow, heroWeight, sideSpread } = useEndingCfg((c) => c.composition)
  const fitMargin = useEndingCfg((c) => c.decor.fitMargin)
  const decorGap = useEndingCfg((c) => c.decor.specimenGap)

  useEffect(() => {
    const active = placements.map((p, i) => ({ p, i })).filter(({ p }) => p.asset)
    if (!active.length || active.some(({ i }) => !reports[i])) return
    if (needGrass && !clear) return
    const allowed = (x: number, y: number) => {
      if (clear && !clearOfGrass(x, y, grassMargin)) return false
      if (inner) {
        const a = Math.max(inner.halfW - fitMargin, 0.01)
        const b = Math.max(inner.halfH - fitMargin, 0.01)
        return ((x - inner.cx) / a) ** 2 + ((y - inner.cy) / b) ** 2 <= 1
      }
      return Math.abs(x) <= w / 2 && Math.abs(y) <= h / 2
    }
    const items = active.map(({ p, i }) => ({ anchor: [p.position[0], p.position[1]] as [number, number], pts: reports[i]!.pts }))
    const options = { width: w, height: h, allowed, gap: specimenGap, maxGrow, heroWeight, minSide: sideSpread * w }
    const plan = solveLayout(items, options)
    const placed: ReturnType<typeof useSpecimenLayout.getState>['placed'] = []
    active.forEach(({ i }, n) => (placed[i] = { ...plan[n], version: reports[i]!.version }))
    // 摆好后的轮廓：装饰花草按它让位（见 EndingDecor）
    const shapes = items.map(({ anchor, pts }, n) => {
      const { dx, dy, k } = plan[n]
      const out = new Float32Array(pts.length)
      for (let p = 0; p < pts.length; p += 2) {
        out[p] = anchor[0] + dx + k * pts[p]
        out[p + 1] = anchor[1] + dy + k * pts[p + 1]
      }
      return out
    })
    useSpecimenLayout.setState({ placed, occupied: makeOccupancy(shapes, decorGap) })
  }, [placements, reports, clear, inner, needGrass, w, h, grassMargin, specimenGap, maxGrow, heroWeight, sideSpread, fitMargin, decorGap])

  return null
}

// selections（来自 useRunStore）是决定标本盒形态的唯一输入；构图（谁做主体、摆在哪）由 composition 自动算出，
// seed（组合 id）决定镜像与旋转扰动，同一组合每次结果一致
export function SpecimenBox({ selections, seed }: { selections: Record<SceneId, string | null>; seed: string }) {
  const mode = useEndingCfg((c) => c.frame.mode)
  const frameSize = useEndingCfg((c) => c.frame.size)
  const frameModel = useEndingCfg((c) => pickFrameModel(c.frame.models, c.frame.modelIndex, seed))
  const composition = useEndingCfg((c) => c.composition)
  const reveal = useEndingCfg((c) => c.reveal)
  const group = useRef<Group>(null)
  const placements = useMemo(
    () => composeSpecimens(selections, composition, frameSize, seed),
    [selections, composition, frameSize, seed],
  )

  // 入场：整体从 boxScaleFrom 放到 1
  useFrame(() => {
    const p = segment(0, reveal.boxDuration)
    group.current?.scale.setScalar(MathUtils.lerp(reveal.boxScaleFrom, 1, p))
  })

  return (
    <group ref={group}>
      {/* 照片裁切以画框为准 */}
      <group ref={(g) => void (photoSubject.current = g)}>
        {mode === 'model' && frameModel ? (
          <Suspense fallback={null}>
            <FrameModel key={frameModel.model} cfg={frameModel} />
          </Suspense>
        ) : mode === 'plane' ? (
          <FramePlane />
        ) : (
          <Frame3D />
        )}
      </group>
      <EndingDecor seed={seed} />
      <LayoutSolver placements={placements} />
      {placements.map((p, i) => (
        <SpecimenSlot key={p.scene} index={i} placement={p} />
      ))}
    </group>
  )
}
