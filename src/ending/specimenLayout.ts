import { Matrix4, Mesh, Vector3, type Object3D } from 'three'
import { create } from 'zustand'
import { relativeMatrix } from './flatten'

// 三件标本一起排版：在不进草、不出框、彼此留出间隙的前提下尽量放大。
// 每件标本先按 region 自动适配出「基准大小」（SpecimenSlot），把基准大小下的轮廓（xy 投影上的采样点，
// 相对落位点）报到这里；三件都报上来后统一求每件的平移 (dx, dy) 与相对基准的缩放 k。
// 判断重叠用一张覆盖整个画框的栅格：草 / 画框外是禁区，已摆好的标本按点外扩 gap 后盖章。

/** 轮廓采样：按投影面积均匀撒的点 + 一部分顶点（细茎、尖端） */
const AREA_SAMPLES = 1000
const VERTEX_SAMPLES = 300
/** 点缀相对基准的放大倍数最多是主体的几倍 */
const ACCENT_RATIO = 1.2
/** 点缀小于这个倍数开始扣分（扣分随差距线性增加） */
const ACCENT_MIN = 0.6
/** 栅格边长（标本盒单位） */
const CELL = 0.025

const va = new Vector3()
const vb = new Vector3()
const vc = new Vector3()
const rel = new Matrix4()

/** 简单的确定性随机数（同一模型每次采样一样） */
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * root 在 m 变换后的 xy 投影轮廓（扁平数组 x0, y0, x1, y1, …，顺序打乱，碰撞检测能早退出）。
 * 带骨骼 / 形变的按当前姿态算。
 */
export function silhouette(root: Object3D, m: Matrix4): Float32Array {
  const tris: number[] = []
  const verts: number[] = []
  root.updateMatrixWorld(true)
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return
    const pos = o.geometry.getAttribute('position')
    if (!pos) return
    const idx = o.geometry.index
    const count = idx ? idx.count : pos.count
    relativeMatrix(o, root, rel).premultiply(m)
    for (let t = 0; t + 2 < count; t += 3) {
      o.getVertexPosition(idx ? idx.getX(t) : t, va).applyMatrix4(rel)
      o.getVertexPosition(idx ? idx.getX(t + 1) : t + 1, vb).applyMatrix4(rel)
      o.getVertexPosition(idx ? idx.getX(t + 2) : t + 2, vc).applyMatrix4(rel)
      tris.push(va.x, va.y, vb.x, vb.y, vc.x, vc.y)
      verts.push(va.x, va.y)
    }
  })
  const n = tris.length / 6
  const random = rng(n * 7919 + verts.length)
  const out: number[] = []
  if (n > 0) {
    // 按投影面积的累积分布抽三角形，再在三角形里均匀取点
    const cum = new Float64Array(n)
    let total = 0
    for (let i = 0; i < n; i++) {
      const o = i * 6
      total += Math.abs((tris[o + 2] - tris[o]) * (tris[o + 5] - tris[o + 1]) - (tris[o + 4] - tris[o]) * (tris[o + 3] - tris[o + 1])) / 2
      cum[i] = total
    }
    if (total > 0) {
      for (let s = 0; s < AREA_SAMPLES; s++) {
        const r = random() * total
        let lo = 0
        let hi = n - 1
        while (lo < hi) {
          const mid = (lo + hi) >> 1
          if (cum[mid] < r) lo = mid + 1
          else hi = mid
        }
        let u = random()
        let v = random()
        if (u + v > 1) {
          u = 1 - u
          v = 1 - v
        }
        const o = lo * 6
        out.push(
          tris[o] + u * (tris[o + 2] - tris[o]) + v * (tris[o + 4] - tris[o]),
          tris[o + 1] + u * (tris[o + 3] - tris[o + 1]) + v * (tris[o + 5] - tris[o + 1]),
        )
      }
    }
    const vn = verts.length / 2
    for (let s = 0; s < VERTEX_SAMPLES && vn > 0; s++) {
      const i = Math.floor(random() * vn) * 2
      out.push(verts[i], verts[i + 1])
    }
  }
  // 打乱
  for (let i = out.length / 2 - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i * 2], out[j * 2]] = [out[j * 2], out[i * 2]]
    ;[out[i * 2 + 1], out[j * 2 + 1]] = [out[j * 2 + 1], out[i * 2 + 1]]
  }
  return new Float32Array(out)
}

export interface LayoutResult {
  dx: number
  dy: number
  k: number
  /** 对应的轮廓版本：标本重新适配后旧结果作废 */
  version: number
}

let nextVersion = 1
/** reports[i]：第 i 件标本（构图顺序：主体、前景点缀、远景点缀）基准大小下的轮廓；placed[i]：排版结果 */
export const useSpecimenLayout = create<{
  reports: ({ pts: Float32Array; version: number } | undefined)[]
  placed: (LayoutResult | undefined)[]
  /** 排好后的标本占位（外扩了间隙）：装饰花草要让开；null = 还没排好 */
  occupied: ((x: number, y: number) => boolean) | null
}>()(() => ({ reports: [], placed: [], occupied: null }))

/** 摆好的标本轮廓（标本盒 xy 的点）按栅格盖章、每点外扩 gap，返回「这个点有没有被占」 */
export function makeOccupancy(shapes: Float32Array[], gap: number): (x: number, y: number) => boolean {
  const cells = new Set<number>()
  const r = Math.ceil(gap / CELL)
  const key = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096)
  for (const pts of shapes) {
    for (let p = 0; p < pts.length; p += 2) {
      const ci = Math.floor(pts[p] / CELL)
      const cj = Math.floor(pts[p + 1] / CELL)
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (di * di + dj * dj <= r * r) cells.add(key(ci + di, cj + dj))
    }
  }
  return (x, y) => cells.has(key(Math.floor(x / CELL), Math.floor(y / CELL)))
}

export function reportSilhouette(index: number, pts: Float32Array) {
  const reports = useSpecimenLayout.getState().reports.slice()
  reports[index] = { pts, version: nextVersion++ }
  useSpecimenLayout.setState({ reports })
}

export interface LayoutItem {
  /** 落位点（标本盒 xy） */
  anchor: [number, number]
  /** 基准大小下、相对落位点的轮廓 */
  pts: Float32Array
}

export interface LayoutOptions {
  /** 栅格覆盖的范围（画框 frame.size 的宽高，以原点为中心） */
  width: number
  height: number
  /** 这个点能不能放标本（不在草里、在框内） */
  allowed: (x: number, y: number) => boolean
  /** 标本之间至少留多少（标本盒单位） */
  gap: number
  /** 相对基准大小最多放大多少倍 */
  maxGrow: number
  /** 打分时主体的权重（点缀为 1）：越大越偏向先把主体放大 */
  heroWeight: number
  /** 两件点缀的中心离主体中心在水平方向至少差多少（标本盒单位），否则算「排成一列」，改成左右分开重排 */
  minSide: number
}

/**
 * 依次摆主体、前景点缀、远景点缀：每件在落位点附近找位置，尽量大（越远离落位点越吃亏），且不进禁区、不碰已摆好的。
 * 点缀的放大倍数不超过主体的 ACCENT_RATIO 倍（基准大小本来就分了主次）。主体放大倍数从 maxGrow 往下试几档，取三件加权总大小最大的一种。
 * 排出来三件竖成一列（点缀在主体正下方，或两件在同一侧）的，再按「两件点缀分在主体左右」重排一次；
 * 本来就左右分开的结果不变。
 */
export function solveLayout(items: LayoutItem[], o: LayoutOptions): { dx: number; dy: number; k: number }[] {
  // 每件轮廓的水平中心（相对落位点、基准大小）
  const meanX = items.map(({ pts }) => {
    let sum = 0
    for (let p = 0; p < pts.length; p += 2) sum += pts[p]
    return pts.length ? sum / (pts.length / 2) : 0
  })
  const centerX = (i: number, p: { dx: number; k: number }) => items[i].anchor[0] + p.dx + p.k * meanX[i]
  const isColumn = (plan: { dx: number; k: number }[]) => {
    if (items.length < 3) return false
    const hx = centerX(0, plan[0])
    const d1 = centerX(1, plan[1]) - hx
    const d2 = centerX(2, plan[2]) - hx
    return Math.sign(d1) === Math.sign(d2) || Math.min(Math.abs(d1), Math.abs(d2)) < o.minSide
  }
  const plan = solveOnce(items, o, null, centerX)
  if (!isColumn(plan)) return plan
  // 点缀各去落位点所在的一侧（落位点本来就是一左一右，镜像时也跟着翻）
  const s1 = Math.sign(items[1].anchor[0] - items[0].anchor[0]) || -1
  const sides = [0, s1, -s1]
  const split = solveOnce(items, o, sides, centerX)
  return isColumn(split) ? plan : split
}

function solveOnce(
  items: LayoutItem[],
  o: LayoutOptions,
  /** sides[i]：第 i 件点缀必须在主体的哪一侧（-1 左 / 1 右），中心至少差 minSide；null = 不限 */
  sides: number[] | null,
  centerX: (i: number, p: { dx: number; k: number }) => number,
): { dx: number; dy: number; k: number }[] {
  const nx = Math.ceil(o.width / CELL) + 1
  const ny = Math.ceil(o.height / CELL) + 1
  const x0 = -o.width / 2
  const y0 = -o.height / 2
  const blocked = new Uint8Array(nx * ny)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) blocked[j * nx + i] = o.allowed(x0 + (i + 0.5) * CELL, y0 + (j + 0.5) * CELL) ? 0 : 1
  }
  const cell = (x: number, y: number) => {
    const i = Math.floor((x - x0) / CELL)
    const j = Math.floor((y - y0) / CELL)
    return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : j * nx + i
  }
  const fits = (pts: Float32Array, ax: number, ay: number, k: number, occ: Uint8Array) => {
    for (let p = 0; p < pts.length; p += 2) {
      const c = cell(ax + k * pts[p], ay + k * pts[p + 1])
      if (c < 0 || blocked[c] || (occ.length && occ[c])) return false
    }
    return true
  }
  const r = Math.ceil(o.gap / CELL) + 1
  const stamp = (pts: Float32Array, ax: number, ay: number, k: number, occ: Uint8Array) => {
    for (let p = 0; p < pts.length; p += 2) {
      const ci = Math.floor((ax + k * pts[p] - x0) / CELL)
      const cj = Math.floor((ay + k * pts[p + 1] - y0) / CELL)
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (di * di + dj * dj > r * r) continue
          const i = ci + di
          const j = cj + dj
          if (i >= 0 && j >= 0 && i < nx && j < ny) occ[j * nx + i] = 1
        }
      }
    }
  }

  // 候选偏移：落位点周围 ±30% 画框，按离落位点由近到远；点缀最多往上挪 15%（留在主体下面，主次不乱）
  const makeOffsets = (maxUp: number) => {
    const out: [number, number, number][] = []
    for (let a = -6; a <= 6; a++) {
      for (let b = -6; b <= maxUp; b++) {
        const dist = Math.min(1, Math.hypot(a, b) / 8.5)
        out.push([a * 0.05 * o.width, b * 0.05 * o.height, 1 - 0.3 * dist])
      }
    }
    return out.sort((p, q) => q[2] - p[2])
  }
  const heroOffsets = makeOffsets(6)
  const accentOffsets = makeOffsets(3)

  const place = (index: number, cap: number, occ: Uint8Array, offsets = accentOffsets, heroX = 0) => {
    const item = items[index]
    let best = { dx: 0, dy: 0, k: 0, score: 0 }
    const [ax, ay] = item.anchor
    const side = sides?.[index] ?? 0
    for (const [dx, dy, w] of offsets) {
      // 这个位置要超过当前最优，至少得放到 need 这么大
      const need = Math.max(best.score / w, 0.05)
      if (need >= cap) continue
      if (!fits(item.pts, ax + dx, ay + dy, need, occ)) continue
      let lo = need
      if (fits(item.pts, ax + dx, ay + dy, cap, occ)) lo = cap
      else {
        let hi = cap
        for (let s = 0; s < 8; s++) {
          const mid = (lo + hi) / 2
          if (fits(item.pts, ax + dx, ay + dy, mid, occ)) lo = mid
          else hi = mid
        }
      }
      if (side && side * (centerX(index, { dx, k: lo }) - heroX) < o.minSide) continue
      if (lo * w > best.score) best = { dx, dy, k: lo, score: lo * w }
    }
    return best
  }

  // 主体在每一行（同一个 dy）里取一个能放到 cap 的最近位置当候选：主体先摆不知道点缀要多少地方，
  // 往上 / 往下挪一点常常能让三件都更大
  const heroCandidates = (cap: number) => {
    const item = items[0]
    const rows = new Map<number, { dx: number; dy: number; k: number; score: number }>()
    for (const [dx, dy, w] of heroOffsets) {
      if (rows.has(dy)) continue
      if (fits(item.pts, item.anchor[0] + dx, item.anchor[1] + dy, cap, new Uint8Array(0))) rows.set(dy, { dx, dy, k: cap, score: cap * w })
    }
    return rows.size ? [...rows.values()] : [place(0, cap, new Uint8Array(nx * ny), heroOffsets)]
  }

  let bestPlan: { dx: number; dy: number; k: number }[] = items.map(() => ({ dx: 0, dy: 0, k: 1 }))
  let bestScore = -Infinity
  // 主体的放大上限从 maxGrow 一档档降到 0.45（每档约 ×0.89）
  for (let cap = o.maxGrow; cap >= 0.45 - 1e-6; cap *= 0.89) {
    for (const hero of heroCandidates(cap)) {
      // 剪枝：两件点缀最多各拿到主体的倍数，这样都比不过当前最优就不用算了
      if (o.heroWeight * hero.score + (items.length - 1) * Math.min(o.maxGrow, hero.k * ACCENT_RATIO) <= bestScore) continue
      const occ = new Uint8Array(nx * ny)
      const heroK = Math.max(hero.k, 0.05)
      const plan = [{ dx: hero.dx, dy: hero.dy, k: hero.k > 0 ? hero.k : 0.2 }]
      stamp(items[0].pts, items[0].anchor[0] + hero.dx, items[0].anchor[1] + hero.dy, plan[0].k, occ)
      // 越离开落位点越吃亏（score = k × 距离权重）；点缀小于 ACCENT_MIN 按差距扣分
      let score = o.heroWeight * hero.score
      const heroX = centerX(0, plan[0])
      for (let i = 1; i < items.length; i++) {
        const p = place(i, Math.min(o.maxGrow, heroK * ACCENT_RATIO), occ, accentOffsets, heroX)
        // 实在放不下：留在落位点、缩得很小（不该发生，兜底）
        const k = p.k > 0 ? p.k : 0.2
        plan.push({ dx: p.dx, dy: p.dy, k })
        stamp(items[i].pts, items[i].anchor[0] + p.dx, items[i].anchor[1] + p.dy, k, occ)
        score += p.score - Math.max(0, ACCENT_MIN - p.k) * 4
      }
      if (score > bestScore) {
        bestScore = score
        bestPlan = plan
      }
    }
  }
  return bestPlan
}

// DEV：暴露给自动化测试脚本
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__specimenLayout = useSpecimenLayout
