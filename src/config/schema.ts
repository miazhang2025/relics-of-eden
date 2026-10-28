// Config 的 TS 类型 + look dev 面板元信息（spec §9.2）。
// 面板完全由下面的 SCENE_SCHEMA / ENDING_SCHEMA 自动生成：新增参数只需改类型 + schema + json，不用动面板代码。
// SchemaFor<T> 保证 config 的每个字段在 schema 里都有对应项，漏写会编译报错。

export type SceneId = 'cave' | 'ocean' | 'garden'
export type ConfigId = SceneId | 'ending'
/** store 里的全部 config：四个页面 + 全局 */
export type StoreId = ConfigId | 'global'
export type QualityTier = 'low' | 'mid' | 'high'

export type Vec2 = [number, number]
export type Vec3 = [number, number, number]

/** 叠加模型变换（env.extrasTransform） */
export interface ExtrasTransform {
  position: Vec3
  rotationY: number
  scale: number
}
export type Vec4 = [number, number, number, number]

export interface SceneConfig {
  version: 1
  scene: SceneId
  camera: {
    /** third = 第三人称跟随；first = 第一人称（自动隐藏角色） */
    mode: 'third' | 'first'
    /** 第一人称的眼睛高度（相对脚底） */
    eyeHeight: number
    fov: number
    near: number
    far: number
    followDistance: number
    followHeight: number
    lookAtOffset: number
    damping: number
    rotateSpeed: number
    pitchMin: number
    pitchMax: number
    /** 相机离地最小高度，防止钻进地形 */
    minGroundClearance: number
    /** 被地形遮挡时，相机停在遮挡点之前的距离 */
    occlusionPadding: number
    /** 遮挡拉近时相机离角色的最小距离 */
    minDistance: number
    /** 进入场景时的俯仰角（弧度） */
    initialPitch: number
  }
  /** 环境模型。model 为空时显示色块占位地面 */
  env: {
    model: string
    collider: string
    /** 叠加模型（逗号分隔），与主模型同一套变换一起加载，不进碰撞体，如海洋的 /models/env/bubble.glb */
    extras: string
    /** 叠加碰撞体（逗号分隔），与主碰撞体（或生成地形的碰撞体）同时生效，如花园人物 /models/colliders/garden.character.glb */
    extraColliders: string
    /**
     * 场景人物（npm run character 生成的叠加模型及其碰撞体）在自身轴心上的偏移 / 旋转 / 缩放，
     * 叠加在美术摆好的位置之上（全 0 / 1 = 原位）。轴心是人物脚底中心；其它叠加模型（如气泡）不受影响。
     */
    extrasTransform: ExtrasTransform
    scale: number
    position: Vec3
    rotationY: number
  }
  character: {
    moveSpeed: number
    sprintMultiplier: number
    turnSpeed: number
    radius: number
    height: number
    color: string
    /** 是否显示角色模型（第一人称下强制隐藏） */
    visible: boolean
    /** 只用 x/z，y 由地面射线决定 */
    spawn: Vec3
    spawnYaw: number
    /** 能直接迈上去的最大高度差 */
    stepHeight: number
    /** 能直接走下去的最大落差，超过视为悬崖边，阻挡 */
    maxDrop: number
    /** 贴地平滑时间常数（秒） */
    groundSmoothing: number
  }
  render: {
    exposure: number
    pixelRatioMax: number
  }
  background: string
  fog: {
    type: 'none' | 'linear' | 'exp2'
    color: string
    density: number
    near: number
    far: number
  }
  lights: {
    ambient: { color: string; intensity: number }
    directional: { color: string; intensity: number; position: Vec3 }
    /** 每场景 2–4 盏点光，可增删 */
    points: PointLightConfig[]
  }
  bounds: { min: Vec3; max: Vec3 }
  /** 程序化天空盒（HDRI 到位前使用；程序化环境光也用它渲染） */
  sky: SkyConfig
  environment: EnvironmentConfig
  shadows: ShadowConfig
  wind: WindConfig
  sss: SSSConfig
  crystal: CrystalConfig
  /** 泡泡（材质角色 bubble，ocean 的气泡） */
  bubble: BubbleConfig
  /** 场景人物（env.extras 里 npm run character 生成的模型）的 idle 动画：顶点着色器，无物理模拟 */
  figure: FigureConfig
  water: WaterConfig
  /** 生成地形（npm run terrain）：替换美术地形 + 无边界远景裙边 + 可玩区软边界 */
  terrain: TerrainConfig
  /** 可玩区（ocean）：岛的轮廓向外扩一圈当边界，软边界同 terrain.boundary；泡泡排在边界线上 */
  playArea: PlayAreaConfig
  /** 贴图池塘：地形贴图里画出来的水域，用 shader 按颜色遮罩做成水面（garden） */
  pond: PondConfig
  /** 地形细节贴图：近处叠一层平铺草地细节，远处淡出 */
  detail: DetailConfig
  /** 程序化草：跟随相机的草叶网格，一个 draw call */
  grass: GrassConfig
  /** 引导发光粒子的远近强度（spec §5.1） */
  beacon: BeaconConfig
  /** 粒子池（spec §5.3）：每个池一个 draw call，多个发射点共享 */
  particles: ParticlePool[]
  post: PostConfig
  /** 按 material name 覆盖模型材质；只存与模型原值不同的字段，未出现的材质保持模型自带值 */
  materials: Record<string, MaterialOverride>
  audio: AudioConfig
  mobile: {
    pixelRatioMax: number
    joystickRadius: number
    joystickSensitivity: number
    lookSensitivity: number
  }
  /** M0/M1 色块占位地面，接入环境模型后移除 */
  placeholder: {
    groundColor: string
    groundSize: number
    zoneColor: string
    zoneOpacity: number
    assetRoughness: number
    assetMetalness: number
  }
  /** 本场景 4 个候选资产的摆位（id 对应 data/assets.ts；顺序 = 摆位快捷键 1–4） */
  assets: AssetPlacement[]
  flow: {
    /** 已弃用：原采集区中心（采集区已取消） */
    zoneCenter: Vec3
    /** 已弃用：原采集区半径 */
    zoneRadius: number
    /** 贴身距离：这么近时不管朝向都算在看它 */
    proximity: number
    /** 看向判定：资产偏离画面中心（水平）不超过 inspectAngleDeg、且在画面上够大（见 discoverScreenSize）时算找到；inspectDistance 是相机距离上限 */
    inspectDistance: number
    inspectAngleDeg: number
    /** 资产最长边至少占竖直视野的多少（0–1）才算找到：按资产尺寸和视野角换算距离，各资产判定时在画面里的大小差不多 */
    discoverScreenSize: number
    /** 发现资产时相机平滑转向它：最长持续（秒）/ 阻尼时间常数（秒，越小转得越快）；持续设 0 关闭 */
    discoverFocusDuration: number
    discoverFocusDamping: number
    /** 进场景时底部叙事提示停留多久（秒），之后消失，全部找到时再出现 */
    introPromptSeconds: number
    othersFadeOut: boolean
    /** 被选资产发光增强时长（秒） */
    selectGlowDuration: number
    /** 淡出时长（秒） */
    fadeDuration: number
    /** 淡出完成后到跳转前的停顿（秒） */
    resolveDelay: number
    idleEmissive: number
    /** 探索中、还没发现的资产（让玩家远远就能看出哪些是资产） */
    activeEmissive: number
    /** 已发现的资产（全部找到后四个都在这一档常亮，供挑选） */
    foundEmissive: number
    /** 发现后从资产中心向四周飘散的柔光圆点（颜色 = 资产 glowColor）：飘多远 */
    foundMarkerRadius: number
    foundMarkerOpacity: number
    /** 每颗光点每秒飘几轮 */
    foundMarkerSpeed: number
    /** 发散中心相对资产中心的高度偏移 */
    foundMarkerHeight: number
    foundMarkerSize: number
    /** 资产身后的彩色光晕：直径（米）/ 不透明度 */
    foundMarkerHaloSize: number
    foundMarkerHaloOpacity: number
    /** 光晕颜色的饱和度倍数（1 = 原色）；光点始终用原色 */
    foundMarkerSaturation: number
    inspectEmissive: number
    selectedEmissive: number
    /** 本场景 4 个资产的整体大小倍数（再乘 assets[].scale） */
    assetSize: number
    /** 真实模型的常驻自发光（自发光颜色 = 模型自己的 base 贴图），暗处也能看清 */
    assetSelfGlow: number
    /** 真实模型：上面 idle/active/inspect/selected 的发光强度乘这个倍数再叠加到自发光上（那几个值按占位几何体调的，直接用太亮） */
    assetGlowGain: number
    breatheSpeed: number
    /** 呼吸幅度 0–1：发光在 (1-depth)~1 倍之间起伏 */
    breatheDepth: number
    /** 发光强度变化的平滑时间常数（秒） */
    emissiveDamping: number
    /** 激活后资产自转速度（弧度/秒） */
    spinSpeed: number
    /** 资产离地高度（占位几何体中心），接入真实模型后按模型原点调整 */
    assetLift: number
    floatAmplitude: number
    floatSpeed: number
    /** 点击判定：拖拽超过该像素数不算点击 */
    clickDragThreshold: number
  }
}

export interface AssetPlacement {
  id: string
  /** x/z 为世界坐标，y 为相对地面的偏移（运行时用射线贴地） */
  position: Vec3
  rotation: Vec3
  scale: number
}

export type MaterialSide = 'front' | 'back' | 'double'
/** 材质角色：决定用哪套自定义 shader。默认按材质名前缀（veg_ / crystal_ / water_ / emitter_），面板可改 */
export type MaterialRole = 'static' | 'vegetation' | 'crystal' | 'bubble' | 'water' | 'emitter'

export interface MaterialOverride {
  role?: MaterialRole
  color?: string
  roughness?: number
  metalness?: number
  emissive?: string
  emissiveIntensity?: number
  envMapIntensity?: number
  normalScale?: number
  opacity?: number
  transparent?: boolean
  alphaTest?: number
  side?: MaterialSide
  wireframe?: boolean
  /** 用该材质的 mesh 是否投阴影（如远景地形关掉，阴影在主光阴影范围边缘不会被硬切） */
  castShadow?: boolean
  /** 暗部提亮 0–1（仅 static 角色）：抬起颜色贴图里烘焙的阴影 / AO，亮部不变；0 = 关 */
  shadowLift?: number
  /** 暗部提亮的阈值（sRGB 亮度 0–1）：低于它的才被抬起 */
  shadowLiftThreshold?: number
  // 以下仅 MeshPhysicalMaterial
  clearcoat?: number
  transmission?: number
  ior?: number
  thickness?: number
  attenuationColor?: string
  /** 薄膜干涉的彩虹珠光（贝壳内壁 / 珍珠）0–1 */
  iridescence?: number
}

export interface SkyConfig {
  /** 关闭时背景用纯色 background */
  enabled: boolean
  topColor: string
  midColor: string
  horizonColor: string
  bottomColor: string
  /** 中段颜色所在高度（0 = 地平线，1 = 天顶） */
  midHeight: number
  /** 地平线雾带宽度 */
  horizonWidth: number
  /** 地平线附近渐变到雾色的高度（0 = 不混合）；只影响看到的天空，让远处雾气与天空衔接 */
  fogBlend: number
  /** 太阳（方向取主光 position） */
  sunColor: string
  /** 太阳圆盘角半径（弧度），0 = 不画圆盘 */
  sunSize: number
  sunIntensity: number
  /** 太阳周围光晕的强度与扩散 */
  sunGlow: number
  sunGlowSpread: number
  moon: {
    enabled: boolean
    color: string
    /** 方位角 / 仰角（度） */
    azimuth: number
    elevation: number
    /** 角半径（弧度） */
    size: number
    /** 边缘柔和度 0–1 */
    softness: number
    intensity: number
  }
}

export interface EnvironmentConfig {
  /** procedural = 用天空盒渲染环境光（无需下载），hdri = 读 public/hdri 下的文件 */
  mode: 'procedural' | 'hdri'
  /** 打光用的 HDRI（public/hdri 下，1k/2k；art/hdri 放原图，npm run hdri 降采样） */
  hdri: string
  intensity: number
  rotationY: number
  /** hdri 模式下是否同时作为背景（否则背景仍是程序化天空） */
  background: boolean
  /** 背景另用一张 HDRI（留空则用 hdri 那张）；美术给的 pinksky 是纯背景图 */
  hdriBackground: string
  /** 背景 HDRI 的亮度（只影响看到的天空，不影响打光） */
  backgroundIntensity: number
  /** 环境光里对应主光方向的亮斑强度 */
  sunIntensity: number
  /** procedural 模式下打光另用一套渐变色（天空可以是夜景，打光仍保持明亮）；关闭时用 sky 的颜色 */
  lightSky: {
    enabled: boolean
    topColor: string
    midColor: string
    horizonColor: string
    bottomColor: string
  }
}

export interface ShadowConfig {
  enabled: boolean
  bias: number
  normalBias: number
  /** 软阴影半径（soft 档位） */
  radius: number
  /** 主光阴影相机覆盖范围（半边长） */
  cameraSize: number
  cameraFar: number
}

export interface WindConfig {
  enabled: boolean
  directionDeg: number
  strength: number
  speed: number
  /** 噪声空间频率 */
  scale: number
  gustStrength: number
  gustFrequency: number
  gustScale: number
  flutterStrength: number
  flutterFrequency: number
  headSway: number
  /** 柔软度来源：顶点色 R，或按局部高度归一化 */
  stiffnessSource: 'vertexColor' | 'localY'
  /** 柔软度曲线指数：越大根部越稳 */
  stiffnessPower: number
  /** 采集确认时的一阵风 */
  confirmGustStrength: number
  confirmGustDuration: number
}

export interface SSSConfig {
  enabled: boolean
  color: string
  scale: number
  power: number
  distortion: number
  ambient: number
  thickness: number
  thicknessSource: 'constant' | 'vertexColor'
  /** 额外参与计算的点光名（空 = 只算主光；仅 full 档生效） */
  pointLight: string
}

export interface CrystalConfig {
  /** 关闭时所有晶体退化为不透明 */
  enabled: boolean
  transmission: number
  thickness: number
  ior: number
  roughness: number
  attenuationColor: string
  attenuationDistance: number
  glowColor: string
  glowIntensity: number
  fresnelPower: number
  /** 包围盒最长边 ≥ 该值算「主体」晶体（mid 档只有主体用 transmission） */
  mainMinSize: number
  /** 不透明降级时的 envMapIntensity（伪装成透明感） */
  opaqueEnvMapIntensity: number
}

export interface FigureConfig {
  enabled: boolean
  /** 呼吸：胸腔沿法线起伏的幅度（模型单位） */
  breathAmplitude: number
  /** 呼吸频率（次 / 秒） */
  breathRate: number
  /** 头部绕颈部摆动的角度（弧度） */
  headSway: number
  /** 头部摆动频率（次 / 秒） */
  headRate: number
  /** 布料波动幅度（模型单位，沿法线） */
  clothAmplitude: number
  /** 布料波纹密度（越大波纹越细碎） */
  clothScale: number
  /** 布料波动速度 */
  clothSpeed: number
  /** 平均眨眼间隔（秒），0 = 不眨眼；每次在间隔里随机位置 */
  blinkInterval: number
  /** 一次眨眼的时长（秒） */
  blinkDuration: number
  /** 闭眼时上眼皮绕眼球转的角度（弧度），不够闭合就调大 */
  blinkAngle: number
  /** 平均多久转头看一次观众（秒），0 = 不看；每次在 0.5–1.5 倍之间随机 */
  lookInterval: number
  /** 每次看多久（秒），期间观众走动会一直跟着看 */
  lookDuration: number
  /** 观众离她多远以内才会看（米） */
  lookDistance: number
  /** 头最多转多少（弧度），观众在更偏的位置就只转到这里 */
  lookMaxAngle: number
  /** 转头快慢（越大越快） */
  lookSpeed: number
  /** 皮肤亮度倍数（>1 提亮），只作用于皮肤材质 */
  skinBrightness: number
  /** 皮肤饱和度（<1 更白净、不发红） */
  skinSaturation: number
  /** 皮肤色调（乘在皮肤颜色上，白色 = 不变） */
  skinTint: string
  /** 毛毡纹理（标了 edenFelt 的材质，如洞穴头饰底座）：颗粒密度（越大越细） */
  feltScale: number
  /** 毛毡凹凸强度（0 = 关） */
  feltStrength: number
  /** 毛毡颜色斑点强度 */
  feltSpeckle: number
}

export interface BubbleConfig {
  /** 正对视线处的不透明度（泡泡中间几乎透明） */
  centerOpacity: number
  /** 边缘的不透明度（按菲涅尔从中间过渡到边缘） */
  rimOpacity: number
  fresnelPower: number
  /** 泡泡底色；贴图（烘焙的环境反射）按 textureStrength 叠在上面 */
  tint: string
  textureStrength: number
  /** 边缘额外的自发光 */
  rimColor: string
  rimGlow: number
  roughness: number
  envMapIntensity: number
  /** 薄膜干涉彩虹色（physical iridescence）强度、薄膜折射率、膜厚范围（纳米） */
  iridescence: number
  iridescenceIOR: number
  filmThicknessMin: number
  filmThicknessMax: number
  /** 上下浮动：幅度（米）、速度（弧度/秒，每个泡泡在 ±25% 内随机） */
  bobAmplitude: number
  bobSpeed: number
}

export interface WaterConfig {
  enabled: boolean
  quality: QualityTier
  /** 水面高度 */
  level: number
  /** 水面平面中心（x/z）与边长 */
  center: Vec3
  size: number
  /** 网格水面（npm run terrain 生成的池塘形状，套 env 变换）；空 = 用 center / size 的方形平面 */
  mesh: string
  shallowColor: string
  deepColor: string
  /** 深度到达该值时完全变为 deepColor */
  depthFalloff: number
  normalScale: number
  normalStrength: number
  flowSpeed: number
  flowDirectionDeg: number
  /** 波浪：网格细分数与三层波的振幅 / 波长 / 速度 / 陡峭度（Gerstner 横向位移） */
  segments: number
  waveAmplitude: number
  waveLength: number
  waveSpeed: number
  waveSteepness: number
  fresnelPower: number
  roughness: number
  reflectionIntensity: number
  /** 实时反射贴图分辨率（边长像素），最大的性能旋钮；移动端自动减半 */
  reflectionResolution: number
  reflectionLayers: 'terrain' | 'terrain+vegetation'
  refractionStrength: number
  foamWidth: number
  foamColor: string
  /** 岸边渐隐：水深小于该值（米）时水面逐渐透明，岸线不再是地形多边形硬切出来的锯齿；0 = 关 */
  shoreFade: number
  /** 远处淡出 [开始, 完全透明]（米，到 center 的水平距离）：开阔水面融进天空 / 雾；结束 <= 开始 = 关 */
  distanceFade: Vec2
  causticsIntensity: number
  causticsScale: number
  causticsSpeed: number
  opacity: number
  /** 水深超过该值的区域不可行走（0 = 不限制） */
  blockDepth: number
  /** 水面可以行走（ocean：在浮岛之间「走水」） */
  walkable: boolean
  /** 只走水面：地面高出水面超过该值（米）就当墙挡住，不能爬上岩石 / 人物；< 0 = 不限制 */
  maxClimb: number
}

/** 地面平铺贴图一套（npm run ground 从 Megascans 贴图压成 KTX2） */
export interface GroundLayer {
  albedo: string
  normal: string
  /** R = AO，G = 粗糙度 */
  orm: string
  /** 一张贴图覆盖的世界尺寸（米）；Megascans 扫描是 1×1m */
  tileSize: number
  /** 颜色乘数（白 = 原色） */
  tint: string
  normalStrength: number
  aoStrength: number
  roughness: number
}

export interface TerrainConfig {
  /** 用生成地形替换美术地形；关掉 = 换回原始素材（原模型、原碰撞体、贴图池塘） */
  enabled: boolean
  /** 生成地形（npm run terrain 输出），空 = 没有生成地形 */
  model: string
  collider: string
  /** 开启时隐藏的原始地形材质名，逗号分隔 */
  replaces: string
  /** 水面跟着生成地形走：关掉生成地形时 water 也一起关（换回贴图池塘） */
  ownsWater: boolean
  /** textured = 原地形范围用 near 贴图、外面用 far 贴图；painted = 原地形范围用原来的手绘贴图 */
  material: 'textured' | 'painted'
  /** painted：手绘贴图的亮度倍数（颜色再乘 near.tint），用来和草、花的颜色对齐 */
  paintBrightness: number
  /** painted：近处层法线 / AO 模糊几级 mip（写实扫描贴图的细碎起伏叠在手绘草地上是满地暗斑点，模糊后只留大块起伏） */
  paintNormalBlur: number
  /** 原地形范围（中心）的贴图 */
  near: GroundLayer
  /** 远景裙边的贴图 */
  far: GroundLayer
  /** 第二套旋转 uv 的混合量（打散平铺重复，只作用于颜色） */
  breakup: number
  /** 大尺度明暗斑驳：强度与尺度（米），远处看不出平铺周期 */
  macroStrength: number
  macroScale: number
  /** 池底着色 */
  bedColor: string
  bedTint: number
  /**
   * painted：裙边颜色接岛上的手绘贴图——岛边取手绘贴图的模糊色，离岛 paintReach 米内换成 edgeColor），离岛 start → end 米渐变到 deepColor；
   * far 贴图只提供明暗细节（detail = 强度）；paintMip = 取色的 mip 级数（越大越模糊）
   */
  farMatch: { enabled: boolean; edgeColor: string; deepColor: string; start: number; end: number; detail: number; paintMip: number; paintReach: number }
  /** 远景尖峰（不吃雾）：山脚色（接近雾色）→ 峰顶色，shade = 主光明暗强度 */
  peaks: { topColor: string; baseColor: string; shade: number }
  /** 散布花草（npm run scatter）：每种植物一个实例化 draw call；density × 档位 scatter 倍率 = 实际数量比例 */
  scatter: { enabled: boolean; model: string; density: number }
  /** 可玩区软边界：靠近边缘时往外走的分量逐渐被削掉，贴着边滑动，不撞空气墙 */
  boundary: {
    enabled: boolean
    /** 可玩区距离场（npm run terrain 输出，旁边有同名 .json） */
    map: string
    /** 离原地形边缘多远（米）停下 */
    inset: number
    /** 从 inset + softWidth 开始减速 */
    softWidth: number
    /** 已经在边界外时往回推的速度（米/秒） */
    pushBack: number
  }
}

export interface PlayAreaConfig {
  enabled: boolean
  /** 岛的轮廓：模型局部坐标 x/z 的凸包（npm run playarea 从碰撞体算出来，跟着 env 变换走） */
  outline: Vec2[]
  /** 轮廓向外扩多少米 = 边界线 */
  margin: number
  /** 离边界线多远停下 */
  inset: number
  /** 从 inset + softWidth 开始减速 */
  softWidth: number
  /** 已经在边界外时往回推的速度（米/秒） */
  pushBack: number
  /** 把叠加模型（env.extras）里的泡泡沿边界线重新排一圈；泡泡不够时循环复用 */
  bubbles: {
    enabled: boolean
    /** 相邻泡泡的间距（米） */
    spacing: number
    /** 随机错开（米）：沿边界线和里外方向 */
    jitter: number
    /** 整圈相对边界线往外挪（米） */
    offset: number
  }
}

/** 水面是否生效：生成地形接管水面时，关掉生成地形也关掉水面 */
export const waterOn = (c: SceneConfig) => c.water.enabled && !(c.terrain.ownsWater && !c.terrain.enabled)

export interface PondConfig {
  enabled: boolean
  /** 画有池塘的地形材质名 */
  material: string
  /** 池塘在贴图里的颜色，与之距离在 tolerance 内的像素视为水 */
  maskColor: string
  tolerance: number
  softness: number
  /** 池塘所在高度（世界 y）与容差：只有落在这个高度带里的片元才可能是水 */
  level: number
  levelTolerance: number
  /** 比这更暗的像素也算水（池塘深处在贴图里是纯黑） */
  darkCut: number
  /** 水色与偏色强度 */
  color: string
  tint: number
  roughness: number
  normalScale: number
  normalStrength: number
  flowSpeed: number
  flowDirectionDeg: number
  /** 细涟漪层：尺度是主流动的倍数，速度更快，斜穿主流动方向 */
  rippleScale: number
  rippleSpeed: number
  rippleStrength: number
  /** 风掠过的缓慢呼吸：法线强度随时间起落 */
  swell: number
  swellSpeed: number
  fresnelPower: number
  /** 掠射角叠加天空（地平线色）的强度 */
  reflection: number
}

export interface DetailConfig {
  enabled: boolean
  /** public 下的细节贴图路径（颜色），留空则关闭 */
  map: string
  /** 细节法线贴图，可留空 */
  normalMap: string
  /** 平铺尺度：世界坐标 × scale 作为 uv，值越大花纹越密 */
  scale: number
  /** 颜色叠加强度（0 = 不影响颜色） */
  strength: number
  normalStrength: number
  /** 距离淡出：start 之前全强度，end 之后完全消失 */
  fadeStart: number
  fadeEnd: number
  /** 陡坡淡出强度（XZ 投影在竖直面上会被拉伸） */
  slopeFade: number
  /** 打散平铺重复的强度（0 = 关闭，省两次纹理采样） */
  breakup: number
}

export interface GrassConfig {
  enabled: boolean
  /** 离线烘好的密度图（npm run models 生成，旁边有同名 .json 记录范围） */
  mask: string
  /** high 档的草叶数量（其它档位按档位表的 grass 倍率缩减） */
  count: number
  /** 以相机为中心的草地半径（世界单位） */
  radius: number
  /** 从 radius × fadeStart 开始逐渐缩小消失 */
  fadeStart: number
  /** 密度图低于该值的地方不长草 */
  densityThreshold: number
  bladeHeight: Vec2
  bladeWidth: number
  /** 叶尖弯曲程度（静态） */
  bend: number
  baseColor: string
  tipColor: string
  /** 每片叶子的明度随机幅度 */
  colorVariation: number
  /** 法线向上方混合的比例：越大越柔和（避免叶片正反面明暗跳变） */
  normalUp: number
  /** 风对草的影响倍率（共用风动参数） */
  windInfluence: number
  /** 背光透光（共用假 SSS 参数）的倍率 */
  sss: number
  receiveShadow: boolean
}

export interface BeaconConfig {
  /** 距离 ≥ far 时用 farIntensity，≤ near 时用 nearIntensity，中间插值 */
  falloffNear: number
  falloffFar: number
  zoneFarIntensity: number
  zoneNearIntensity: number
  /** 进入采集区后采集区光团降到的强度 */
  zoneInsideIntensity: number
  assetFarIntensity: number
  assetNearIntensity: number
}

export type ParticleRole = 'ambient' | 'beaconZone' | 'beaconAsset' | 'burst' | 'modelEmitters'

export interface ParticleEmitter {
  name: string
  position: Vec3
  emitCount: number
  delay: number
}

/** 字段名对齐 r3f-vfx 的 props（spec §5.3G） */
export interface ParticlePool {
  name: string
  enabled: boolean
  /** 发射点来源：ambient 用 emitters（可跟随相机），beacon* / burst / modelEmitters 由场景自动生成 */
  role: ParticleRole
  maxParticles: number
  emitterShape: 'point' | 'box' | 'sphere' | 'cone' | 'disk'
  emitterRadius: number
  emitterSize: Vec3
  emitterAngle: number
  emitterHeight: number
  emitterDirection: Vec3
  emitterSurfaceOnly: boolean
  startPositionAsDirection: boolean
  lifetime: Vec2
  speed: Vec2
  /** 速度方向的随机扩散（弧度） */
  directionSpread: number
  gravity: Vec3
  friction: { intensity: number; easing: 'linear' | 'easeIn' | 'easeOut' }
  turbulence: { intensity: number; frequency: number; speed: number }
  size: Vec2
  colorStart: string
  colorEnd: string
  intensity: number
  blending: 'additive' | 'normal'
  appearance: 'gradient' | 'circular' | 'square'
  /** 生命周期曲线：4 个贝塞尔控制点的 y 值（x 均匀分布），运行时烘成纹理 */
  fadeSizeCurve: Vec4
  fadeOpacityCurve: Vec4
  velocityCurve: Vec4
  rotation: Vec2
  rotationSpeed: Vec2
  /** 近相机淡出距离（降级 soft particles） */
  softDistance: number
  /** 贴近地面淡出的高度 */
  groundFade: number
  /** 发射区跟随相机（环境浮尘类），发射点位置视为相对相机 */
  followCamera: boolean
  depthTest: boolean
  renderOrder: number
  emitters: ParticleEmitter[]
}

export interface PostConfig {
  enabled: boolean
  toneMapping: 'aces' | 'agx' | 'neutral' | 'reinhard' | 'linear'
  bloom: { enabled: boolean; intensity: number; threshold: number; smoothing: number; radius: number }
  vignette: { enabled: boolean; offset: number; darkness: number }
  chromaticAberration: { enabled: boolean; offset: number }
  dof: { enabled: boolean; focusDistance: number; focalLength: number; bokehScale: number }
  noise: { enabled: boolean; opacity: number }
  grade: { enabled: boolean; hue: number; saturation: number; contrast: number; brightness: number }
  /** 性能开销大，默认关闭；移动端强制关闭 */
  ssao: { enabled: boolean; intensity: number; radius: number }
}

/** 音频总线：ambience 为各场景背景音乐（public/audio/），sfx 素材未到位仍为静音占位 */
export interface AudioConfig {
  master: { volume: number; mute: boolean }
  ambience: { volume: number; mute: boolean; fadeIn: number; fadeOut: number }
  sfx: { volume: number; mute: boolean; collectVolume: number }
}

export interface PointLightConfig {
  name: string
  color: string
  intensity: number
  distance: number
  decay: number
  position: Vec3
}

/**
 * 标本构图里的一个角色（主体 / 前景点缀 / 远景点缀）。
 * anchor 与 region 都按画框内框的宽 / 高 / 深归一：anchor 的 x / y 是中心点、z 是标本背面贴的位置（-0.5 = 背板；-0.5–0.5），region 是可占据的范围（0–1）。
 * 模型会在套用 rotation 之后按包围盒等比缩放到刚好装进 region，并把包围盒中心对齐 anchor。
 */
export interface CompositionRole {
  anchor: Vec3
  region: Vec3
  rotation: Vec3
  /** 在自动适配结果上再乘的倍率 */
  scale: number
}

export type HeroChoice = 'auto' | SceneId

export interface FrameModelConfig {
  name: string
  model: string
  /** 画框外轮廓高度（标本盒单位），宽 / 厚按模型原比例 */
  height: number
  /** 微调偏移（标本盒局部） */
  offset: Vec3
}

/** 沿画框内框（按 frame.size 的椭圆）铺的一圈草：下沿最密最高，往上变稀变矮，顶部留缺口 */
export interface DecorGrassConfig {
  enabled: boolean
  count: number
  /** 椭圆半径（占内框宽 / 高的比例）与向内铺开的宽度 */
  radius: number
  inset: number
  /** 铺多大一段弧（度，以正下方为中心；360 = 一整圈） */
  arcDeg: number
  /** 下密上疏：0 = 沿弧均匀；0.7 = 正上方的密度只有正下方的 30%（< 1，整圈都有草） */
  bottomBias: number
  /** 每丛占地宽度（占内框高度的比例），下沿取大值、两端取小值 */
  size: Vec2
  /** 深度范围（按内框深度归一） */
  depth: Vec2
  /** 两侧的草向中心倾斜多少（0 = 都朝上，1 = 垂直于边框） */
  lean: number
}

/** 装饰花草的一个落位：anchor 按画框内框宽 / 高 / 深归一（同构图），height 占内框高度的比例，底部落在 anchor */
export interface DecorSlot {
  anchor: Vec3
  height: number
  rotation: Vec3
}
export type MirrorMode = 'auto' | 'off' | 'on'

export interface EndingConfig {
  version: 1
  scene: 'ending'
  camera: {
    fov: number
    position: Vec3
    lookAt: Vec3
    /** 开启时沿 position→lookAt 方向自动调整距离，让整个画框刚好装进画布 */
    autoFrame: boolean
    /** autoFrame 时画框四周留白（占画框尺寸的比例） */
    framePadding: number
  }
  background: string
  lights: {
    ambient: { color: string; intensity: number }
    directional: { color: string; intensity: number; position: Vec3 }
  }
  frame: {
    /** 3d = 占位方框；plane = 平面；model = 画框模型（models 里按组合随机挑一个） */
    mode: '3d' | 'plane' | 'model'
    color: string
    metalness: number
    roughness: number
    backColor: string
    backRoughness: number
    /** 画框内框尺寸（构图按它算）；model 模式下画框模型按 models[i].height 缩放，内框大致与它对齐 */
    size: Vec3
    border: number
    planeDepth: number
    models: FrameModelConfig[]
    /** model 模式用哪个：-1 = 按组合 id 随机（同一组合每次一样） */
    modelIndex: number
    /** 内框里铺的绒布（像标本盒的黑绒衬底）：画框模型加载后自动量出内框椭圆与背板深度，铺在背板前 */
    velvet: {
      enabled: boolean
      color: string
      /** 掠射角的绒毛光泽 */
      sheenColor: string
      sheen: number
      /** 绒毛颗粒的明暗起伏（0 = 纯色） */
      grain: number
      /** 比量出的内框再大多少（标本盒单位），边缘藏进画框里 */
      margin: number
      /** 离背板多远（标本盒单位） */
      offset: number
    }
  }
  /** 标本盒里的装饰花草（npm run decor 从三个场景拆出来的），点缀用，不抢标本 */
  decor: {
    enabled: boolean
    model: string
    /** 可用的花草（decor.glb 里的节点名，逗号分隔）；按组合 id 洗牌后依次放进 slots */
    pieces: string
    /** 颜色乘数：< 1 压暗，免得抢标本 */
    brightness: number
    slots: DecorSlot[]
    /** 花草离画框内框边缘至少留多少（标本盒单位）：超出内框的会以根部为中心缩小，根部在框外的先往里挪，不和画框穿模 */
    fitMargin: number
    /** 花草离标本至少留多少（标本盒单位）：压到标本的往里挪 / 缩小，太小就不放 */
    specimenGap: number
    /** 沿内框铺一圈草（decor.glb 里的 grass_* 草丛，实例化） */
    grass: DecorGrassConfig
  }
  /**
   * 三件标本的构图：一件主体 + 两件点缀，全部按画框尺寸自动算位置 / 大小。
   * hero = auto 时按资产的 heroWeight 挑主体（见 data/assets.ts），组合补丁可指定。
   */
  composition: {
    hero: HeroChoice
    heroRole: CompositionRole
    /** 前景点缀：更靠近镜头、略大 */
    accentNear: CompositionRole
    /** 远景点缀：更靠后、更小 */
    accentFar: CompositionRole
    /** 左右镜像：auto = 按组合 id 决定，让 8 种组合不完全一样 */
    mirror: MirrorMode
    /** 按组合 id 给每件的旋转加的随机扰动（度） */
    jitterDeg: number
    /** 标本离一圈草至少留多少（按画框尺寸归一的半径）：三件一起排版时草是禁区（见 specimenLayout.ts） */
    grassMargin: number
    /** 标本之间至少留多少（标本盒单位） */
    specimenGap: number
    /** 排版时标本最多放大到自动适配大小的几倍（主体先放大，点缀不超过主体的倍数） */
    maxGrow: number
    /** 排版打分时主体的权重（点缀为 1）：越大越优先把主体放大，点缀让位 */
    heroWeight: number
    /** 点缀中心离主体中心水平至少差多少（× 画框宽）：不够就算三件排成一列，改成一左一右重排 */
    sideSpread: number
    /** 静止时的轻微漂浮 */
    floatAmplitude: number
    floatSpeed: number
  }
  /** 标本（占位几何体）的材质 */
  specimen: {
    emissiveIntensity: number
    roughness: number
    metalness: number
    hoverEmissive: number
    /** 真实模型的自发光 = 该资产在自己场景里「已发现」时的常驻发光（按底色发光）× 这个倍数；1 = 与场景一致 */
    sceneGlow: number
    /** 真实模型的饱和度倍数（乘在资产自己的调色上）：深色背景、没有场景里的泛光，同样的调色在标本盒里显得更灰 */
    saturation: number
    /** 真实模型的亮度倍数（乘在资产自己的调色上，自发光按底色走，也跟着变暗）：深色绒布上同样亮度显得刺眼 */
    brightness: number
  }
  /** 入场：画布淡入 + 标本盒放大 + 三件标本依次落位（自己写，不用 Theatre 时间轴，见 ADR-003） */
  reveal: {
    fadeDuration: number
    textDelay: number
    /** 标本盒从多大放到 1（1 = 不缩放） */
    boxScaleFrom: number
    boxDuration: number
    /** 每件标本的入场时长与相互错开的间隔 */
    specimenDuration: number
    specimenStagger: number
    /** 标本入场时的起始偏移（相对各自落位点） */
    specimenFrom: Vec3
  }
  /** 影棚环境光：上下两色的渐变球 + 一块柔光板，渲染一次作为环境贴图 */
  environment: {
    intensity: number
    rotationY: number
    topColor: string
    bottomColor: string
    /** 柔光板（放在主光方向）的强度与大小 */
    keyIntensity: number
    keySize: number
  }
  shadows: ShadowConfig
  post: PostConfig
  /** 标本盒的有限交互（spec §8.3）：不做自由 orbit，不允许转到背面 */
  interaction: {
    yawLimitDeg: number
    pitchLimitDeg: number
    /** 每拖动 1 像素转多少度 */
    dragSensitivity: number
    /** 旋转 / 缩放的平滑时间常数（秒） */
    damping: number
    /** 相机距离倍率范围（1 = config 里的相机位置） */
    zoomMin: number
    zoomMax: number
    zoomSpeed: number
    /** 松手多久后缓慢回正（秒），0 = 不回正 */
    returnDelay: number
    /** 静止时的轻微呼吸摆动（度） */
    idleSwayDeg: number
    idleSwaySpeed: number
  }
  /** 照片导出（spec §8.4） */
  photo: {
    /** 相对屏幕画布的渲染倍率 */
    scale: number
    /** 边距（以 1 倍率的像素计） */
    margin: number
    background: string
    borderWidth: number
    borderColor: string
    includeText: boolean
    titleSize: number
    descSize: number
    textColor: string
    descColor: string
    textGap: number
    includeLogo: boolean
    /** public 下的 logo 图片路径 */
    logo: string
    logoSize: number
    /** 在底边框正中压一行项目名 */
    includeBrand: boolean
    brandSize: number
    /** 只截取画框所在区域（而不是整个画布） */
    crop: boolean
    /** 裁切时画框外留白（占画框屏幕尺寸的比例） */
    cropPadding: number
  }
}

/** 每个质量档位的效果上限（spec §12.1） */
export interface TierSettings {
  pixelRatioMax: number
  water: QualityTier
  /** 风动层数：1 = 主风，2 = + 阵风，3 = + 抖动 */
  windLayers: number
  sss: 'off' | 'single' | 'full'
  /** transmission 晶体：none = 全部不透明，main = 仅主体，all = 主体 + 次级 */
  crystal: 'none' | 'main' | 'all'
  shadows: 'off' | 'on' | 'soft'
  shadowMapSize: number
  /** 粒子数量倍率 */
  particles: number
  /** 程序化草叶数量倍率 */
  grass: number
  /** 散布花草（生成地形上的实例化植物）数量倍率 */
  scatter: number
  /** 地形细节贴图：off = 关闭，basic = 单层采样，full = 加打散（多两次采样） */
  detail: 'off' | 'basic' | 'full'
  /** basic = bloom + 调色，mid = + vignette + grain，full = 全开（含 DOF） */
  post: 'basic' | 'mid' | 'full'
  /** 后处理离屏渲染的 MSAA 采样数（0 = 关）。开着后处理时 canvas 自带的 antialias 不生效，几何抗锯齿全靠这个 */
  msaa: number
  /** 模型贴图的各向异性过滤级数（1 = 关）：斜看的远处表面不糊、不闪 */
  anisotropy: number
}

export interface GlobalConfig {
  version: 1
  scene: 'global'
  transition: { fadeOut: number; fadeIn: number; color: string }
  quality: {
    desktopDefault: QualityTier
    mobileDefault: QualityTier
    tiers: { low: TierSettings; mid: TierSettings; high: TierSettings }
    /** spec §12.2 帧率守门：连续 window 秒低于目标的 threshold 倍 → 降一档（只降不升） */
    frameGuard: {
      enabled: boolean
      targetFpsDesktop: number
      targetFpsMobile: number
      threshold: number
      window: number
      /** 进入场景后多少秒开始监控（避开加载抖动） */
      warmup: number
    }
  }
  /**
   * 交互资产（场景里的 4 件 + 结尾标本盒）的「标本影棚光」：固定在镜头空间的中性主光 / 补光 / 轮廓光，
   * 抵消场景曝光后按 mix 混进原光照，颜色接近效果图，场景和标本盒里一致（见 materials/specimenLook.ts）
   */
  specimenLook: {
    enabled: boolean
    /** 0 = 完全用场景光照，1 = 完全用影棚光 */
    mix: number
    /** 影棚光整体亮度 */
    gain: number
    ambient: number
    key: number
    fill: number
    rim: number
    /** 高光（按材质光滑度） */
    spec: number
    /** 影棚光的颜色（主光暖一点、补光冷一点） */
    keyColor: string
    fillColor: string
    /** 饱和度补偿（ACES 会把颜色压灰） */
    saturation: number
  }
}

export type AnyConfig = SceneConfig | EndingConfig

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

// ============================================================================
// 面板元信息
// ============================================================================

interface LeafBase {
  label?: string
  /** 鼠标悬停提示 */
  hint?: string
}
export interface NumberLeaf extends LeafBase { t: 'number'; min?: number; max?: number; step?: number }
export interface BoolLeaf extends LeafBase { t: 'bool' }
export interface ColorLeaf extends LeafBase { t: 'color' }
export interface TextLeaf extends LeafBase { t: 'text' }
export interface SelectLeaf<V extends string = string> extends LeafBase { t: 'select'; options: readonly V[] }
export interface Vec3Leaf extends LeafBase { t: 'vec3'; min?: number; max?: number; step?: number }
export interface Vec2Leaf extends LeafBase { t: 'vec2'; min?: number; max?: number; step?: number }
export interface Vec4Leaf extends LeafBase { t: 'vec4'; min?: number; max?: number; step?: number }
/** 不在面板里显示（version / scene 等结构字段） */
export interface HiddenLeaf { t: 'hidden' }
/** 可增删的数组（如点光） */
export interface ArrayLeaf<U = unknown> extends LeafBase {
  t: 'array'
  item: SchemaFor<U>
  itemLabel: (item: U, index: number) => string
  create: (existing: U[]) => U
  /** 固定条目：面板里不显示「添加 / 删除」 */
  fixed?: boolean
}
/** 材质：运行时遍历场景收集 material name 动态生成 */
export interface MaterialsLeaf { t: 'materials' }

export interface FolderMeta {
  _label?: string
}

export type Leaf =
  | NumberLeaf
  | BoolLeaf
  | ColorLeaf
  | TextLeaf
  | SelectLeaf
  | Vec3Leaf
  | Vec2Leaf
  | Vec4Leaf
  | HiddenLeaf
  | ArrayLeaf<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  | MaterialsLeaf

export type SchemaFor<T> = [T] extends [number]
  ? NumberLeaf | HiddenLeaf
  : [T] extends [boolean]
    ? BoolLeaf | HiddenLeaf
    : [T] extends [string]
      ? string extends T
        ? ColorLeaf | TextLeaf | HiddenLeaf
        : SelectLeaf<T & string> | HiddenLeaf
      : [T] extends [Vec3]
        ? Vec3Leaf | HiddenLeaf
        : [T] extends [Vec2]
          ? Vec2Leaf | HiddenLeaf
          : [T] extends [Vec4]
            ? Vec4Leaf | HiddenLeaf
            : T extends readonly (infer U)[]
          ? ArrayLeaf<U> | HiddenLeaf
          : string extends keyof T
            ? MaterialsLeaf
            : { [K in keyof T]-?: SchemaFor<T[K]> } & FolderMeta

export const isLeaf = (n: unknown): n is Leaf => typeof n === 'object' && n !== null && 't' in n

// ---------- 常用片段 ----------
const hidden: HiddenLeaf = { t: 'hidden' }
const color = (label?: string): ColorLeaf => ({ t: 'color', label })
const num = (min: number, max: number, step: number, label?: string, hint?: string): NumberLeaf => ({
  t: 'number',
  min,
  max,
  step,
  label,
  hint,
})
const vec = (step = 0.1, label?: string): Vec3Leaf => ({ t: 'vec3', step, label })
const range = (min: number, max: number, step: number, label?: string): Vec2Leaf => ({ t: 'vec2', min, max, step, label })
const curve = (label?: string): Vec4Leaf => ({ t: 'vec4', min: 0, max: 2, step: 0.01, label })
const select = <V extends string>(...options: V[]): SelectLeaf<V> => ({ t: 'select', options })
const bool = (label?: string, hint?: string): BoolLeaf => ({ t: 'bool', label, hint })
const intensity = (max = 10) => num(0, max, 0.01)
const seconds = (max = 5) => num(0, max, 0.05)

const lightsSchema = {
  _label: '灯光',
  ambient: { _label: 'ambient', color: color(), intensity: intensity(5) },
  directional: { _label: 'directional 主光', color: color(), intensity: intensity(10), position: vec(0.5) },
}

/** 材质面板里可调的字段（spec §9.3 Materials）；physical 为 true 的只对 MeshPhysicalMaterial 显示，staticOnly 只对 static 角色显示 */
export const MATERIAL_FIELDS: Array<{ key: keyof MaterialOverride; leaf: Leaf; physical?: boolean; staticOnly?: boolean }> = [
  { key: 'role', leaf: { t: 'select', options: ['static', 'vegetation', 'crystal', 'bubble', 'water', 'emitter'], label: 'role 角色' } },
  { key: 'color', leaf: color() },
  { key: 'roughness', leaf: num(0, 1, 0.01) },
  { key: 'metalness', leaf: num(0, 1, 0.01) },
  { key: 'emissive', leaf: color() },
  { key: 'emissiveIntensity', leaf: intensity(20) },
  { key: 'envMapIntensity', leaf: intensity(5) },
  { key: 'normalScale', leaf: num(0, 3, 0.01) },
  { key: 'opacity', leaf: num(0, 1, 0.01) },
  { key: 'transparent', leaf: bool() },
  { key: 'alphaTest', leaf: num(0, 1, 0.01) },
  { key: 'side', leaf: { t: 'select', options: ['front', 'back', 'double'] } },
  { key: 'wireframe', leaf: bool('wireframe (debug)') },
  { key: 'castShadow', leaf: bool('castShadow 投阴影') },
  { key: 'shadowLift', leaf: num(0, 1, 0.01, 'shadowLift 暗部提亮', '抬起贴图里烘焙的阴影，亮部不变'), staticOnly: true },
  { key: 'shadowLiftThreshold', leaf: num(0.05, 1, 0.01, 'shadowLift 阈值', '贴图亮度低于它的部分才被抬起'), staticOnly: true },
  { key: 'clearcoat', leaf: num(0, 1, 0.01), physical: true },
  { key: 'transmission', leaf: num(0, 1, 0.01), physical: true },
  { key: 'ior', leaf: num(1, 2.333, 0.01), physical: true },
  { key: 'thickness', leaf: num(0, 10, 0.01), physical: true },
  { key: 'attenuationColor', leaf: color(), physical: true },
  { key: 'iridescence', leaf: num(0, 1, 0.01, 'iridescence 珠光'), physical: true },
]

/** 新建粒子池的默认值 */
export const DEFAULT_PARTICLE_POOL: ParticlePool = {
  name: 'pool',
  enabled: true,
  role: 'ambient',
  maxParticles: 300,
  emitterShape: 'box',
  emitterRadius: 1,
  emitterSize: [20, 6, 20],
  emitterAngle: 0.4,
  emitterHeight: 0,
  emitterDirection: [0, 1, 0],
  emitterSurfaceOnly: false,
  startPositionAsDirection: false,
  lifetime: [4, 8],
  speed: [0.05, 0.2],
  directionSpread: 1.5,
  gravity: [0, 0, 0],
  friction: { intensity: 0, easing: 'linear' },
  turbulence: { intensity: 0.2, frequency: 0.4, speed: 0.3 },
  size: [0.03, 0.08],
  colorStart: '#ffffff',
  colorEnd: '#ffffff',
  intensity: 1,
  blending: 'additive',
  appearance: 'gradient',
  fadeSizeCurve: [1, 1, 1, 1],
  fadeOpacityCurve: [0, 1, 1, 0],
  velocityCurve: [1, 1, 1, 1],
  rotation: [0, 0],
  rotationSpeed: [0, 0],
  softDistance: 0.8,
  groundFade: 0.3,
  followCamera: false,
  depthTest: true,
  renderOrder: 0,
  emitters: [],
}

/** 后处理面板项（场景与 ending 共用） */
const postSchema: SchemaFor<PostConfig> = {
  _label: '后处理 post',
  enabled: bool(),
  toneMapping: select('aces', 'agx', 'neutral', 'reinhard', 'linear'),
  bloom: { _label: 'bloom', enabled: bool(), intensity: intensity(5), threshold: num(0, 2, 0.01), smoothing: num(0, 1, 0.01), radius: num(0, 1, 0.01) },
  vignette: { _label: 'vignette', enabled: bool(), offset: num(0, 1, 0.01), darkness: num(0, 1, 0.01) },
  chromaticAberration: { _label: 'chromaticAberration', enabled: bool(), offset: num(0, 0.02, 0.0001) },
  dof: { _label: 'depthOfField', enabled: bool(), focusDistance: num(0, 100, 0.1), focalLength: num(0.1, 20, 0.1), bokehScale: num(0, 10, 0.1) },
  noise: { _label: 'noise / grain', enabled: bool(), opacity: num(0, 0.5, 0.005) },
  grade: {
    _label: '调色 grade',
    enabled: bool(),
    hue: num(-Math.PI, Math.PI, 0.01),
    saturation: num(-1, 1, 0.01),
    contrast: num(-1, 1, 0.01),
    brightness: num(-1, 1, 0.01),
  },
  ssao: { _label: 'SSAO（开销大）', enabled: bool(), intensity: num(0, 10, 0.1), radius: num(0.01, 2, 0.01) },
}

const groundLayer = {
  albedo: { t: 'text' },
  normal: { t: 'text' },
  orm: { t: 'text', label: 'orm（R=AO G=粗糙度）' },
  tileSize: num(0.1, 10, 0.05, 'tileSize（一张贴图多少米）'),
  tint: color(),
  normalStrength: num(0, 3, 0.01),
  aoStrength: num(0, 1, 0.01),
  roughness: num(0, 2, 0.01, 'roughness（粗糙度倍率）'),
} as const

export const SCENE_SCHEMA: SchemaFor<SceneConfig> = {
  version: hidden,
  scene: hidden,
  camera: {
    _label: '相机',
    mode: select('third', 'first'),
    eyeHeight: num(0.2, 3, 0.01, 'eyeHeight（第一人称）'),
    fov: num(20, 90, 0.5),
    near: num(0.01, 5, 0.01),
    far: num(50, 2000, 10),
    followDistance: num(1, 30, 0.1),
    followHeight: num(0, 15, 0.1),
    lookAtOffset: num(0, 5, 0.05),
    damping: num(0, 1, 0.01, 'damping (s)', '跟随阻尼时间常数，0 = 硬跟随'),
    rotateSpeed: num(0.001, 0.02, 0.0005),
    pitchMin: num(-1.5, 1.5, 0.01),
    pitchMax: num(-1.5, 1.5, 0.01),
    minGroundClearance: num(0, 3, 0.05),
    occlusionPadding: num(0, 2, 0.05),
    minDistance: num(0.1, 5, 0.05),
    initialPitch: num(-1.5, 1.5, 0.01),
  },
  env: {
    _label: '环境模型',
    model: { t: 'text' },
    collider: { t: 'text' },
    extras: { t: 'text', label: 'extras（叠加模型）', hint: '逗号分隔' },
    extraColliders: { t: 'text', label: 'extras 碰撞体', hint: '逗号分隔；与主碰撞体同时生效' },
    scale: num(0.1, 50, 0.01, 'scale', '模型缩放。碰撞体同步，但资产/出生点/采集区坐标不会跟着缩放'),
    position: vec(0.1),
    rotationY: num(-Math.PI, Math.PI, 0.01),
    extrasTransform: {
      _label: '叠加模型变换（人物）',
      position: vec(0.05, 'position（偏移）'),
      rotationY: num(-Math.PI, Math.PI, 0.01, 'rotationY', '绕人物脚底中心旋转'),
      scale: num(0.1, 5, 0.01, 'scale', '以人物脚底中心缩放；碰撞体同步'),
    },
  },
  character: {
    _label: '角色',
    moveSpeed: num(0.5, 15, 0.1),
    sprintMultiplier: num(1, 4, 0.05),
    turnSpeed: num(1, 30, 0.5),
    radius: num(0.1, 1.5, 0.01),
    height: num(0.5, 4, 0.05),
    color: color(),
    visible: bool('visible', '显示角色模型；第一人称下强制隐藏'),
    spawn: vec(0.5, 'spawn (x/z)'),
    spawnYaw: num(-Math.PI, Math.PI, 0.01),
    stepHeight: num(0, 2, 0.01),
    maxDrop: num(0, 5, 0.05),
    groundSmoothing: num(0, 0.5, 0.01, 'groundSmoothing (s)'),
  },
  render: {
    _label: '渲染',
    exposure: num(0, 4, 0.01),
    pixelRatioMax: num(0.5, 3, 0.25),
  },
  background: color('背景色'),
  fog: {
    _label: '雾',
    type: { t: 'select', options: ['none', 'linear', 'exp2'] },
    color: color(),
    density: num(0, 0.2, 0.001, 'density (exp2)'),
    near: num(0, 200, 0.5, 'near (linear)'),
    far: num(1, 500, 1, 'far (linear)'),
  },
  lights: {
    ...lightsSchema,
    points: {
      t: 'array',
      label: '点光',
      itemLabel: (l) => l.name,
      create: (existing) => ({
        name: `point_${existing.length + 1}`,
        color: '#ffffff',
        intensity: 2,
        distance: 12,
        decay: 2,
        position: [0, 3, 0],
      }),
      item: {
        name: { t: 'text' },
        color: color(),
        intensity: intensity(50),
        distance: num(0, 100, 0.5),
        decay: num(0, 4, 0.05),
        position: vec(0.25),
      },
    },
  },
  bounds: { _label: '边界 bounds', min: vec(0.5), max: vec(0.5) },
  sky: {
    _label: '天空盒 sky（程序化）',
    enabled: bool(),
    topColor: color(),
    midColor: color(),
    horizonColor: color(),
    bottomColor: color(),
    midHeight: num(0.01, 1, 0.01),
    horizonWidth: num(0.005, 0.5, 0.005),
    fogBlend: num(0, 1, 0.01, 'fogBlend', '地平线附近混入雾色的高度，0 = 不混'),
    sunColor: color(),
    sunSize: num(0, 0.2, 0.001),
    sunIntensity: intensity(20),
    sunGlow: num(0, 3, 0.01),
    sunGlowSpread: num(1, 256, 1, 'sunGlowSpread', '越大光晕越集中'),
    moon: {
      _label: '月亮 / 天体',
      enabled: bool(),
      color: color(),
      azimuth: num(-180, 180, 1),
      elevation: num(-10, 90, 0.5),
      size: num(0.005, 0.5, 0.001),
      softness: num(0, 1, 0.01),
      intensity: num(0, 3, 0.01),
    },
  },
  environment: {
    _label: '环境光 environment',
    mode: select('procedural', 'hdri'),
    hdri: { t: 'text', label: 'hdri 路径', hint: 'public/hdri 下的 .hdr，用 1k/2k，不要 4k' },
    intensity: intensity(5),
    rotationY: num(-Math.PI, Math.PI, 0.01),
    background: bool('background（hdri）'),
    hdriBackground: { t: 'text', label: '背景 hdri（可留空）', hint: '留空 = 用打光那张当背景' },
    backgroundIntensity: intensity(5),
    sunIntensity: intensity(20),
    lightSky: {
      _label: '打光天空（procedural）',
      enabled: bool(),
      topColor: color(),
      midColor: color(),
      horizonColor: color(),
      bottomColor: color(),
    },
  },
  shadows: {
    _label: '阴影（主光）',
    enabled: bool(),
    bias: num(-0.01, 0.01, 0.0001),
    normalBias: num(0, 0.2, 0.001),
    radius: num(0, 10, 0.1, 'radius（soft 档）'),
    cameraSize: num(5, 100, 1, 'cameraSize', '阴影相机覆盖的半边长，越小越清晰'),
    cameraFar: num(10, 500, 5),
  },
  wind: {
    _label: '风动植被 wind',
    enabled: bool(),
    directionDeg: num(-180, 180, 1),
    strength: num(0, 2, 0.01),
    speed: num(0, 5, 0.01),
    scale: num(0, 1, 0.005),
    gustStrength: num(0, 2, 0.01),
    gustFrequency: num(0, 2, 0.01),
    gustScale: num(0, 0.5, 0.005),
    flutterStrength: num(0, 0.5, 0.005),
    flutterFrequency: num(0, 30, 0.1),
    headSway: num(0, 0.5, 0.005),
    stiffnessSource: select('vertexColor', 'localY'),
    stiffnessPower: num(0.5, 4, 0.05),
    confirmGustStrength: num(0, 5, 0.05),
    confirmGustDuration: seconds(),
  },
  sss: {
    _label: '假 SSS',
    enabled: bool('enabled', '可单独关闭以便对比'),
    color: color(),
    scale: num(0, 5, 0.01),
    power: num(0.5, 16, 0.1),
    distortion: num(0, 1, 0.01),
    ambient: num(0, 1, 0.01),
    thickness: num(0, 2, 0.01),
    thicknessSource: select('constant', 'vertexColor'),
    pointLight: { t: 'text', label: 'pointLight（名字）', hint: '参与 SSS 的点光名，仅 full 档生效；留空 = 只算主光' },
  },
  crystal: {
    _label: '晶体 crystal',
    enabled: bool('transmission', '关闭则全部晶体退化为不透明'),
    transmission: num(0, 1, 0.01),
    thickness: num(0, 10, 0.05),
    ior: num(1, 2.333, 0.01),
    roughness: num(0, 1, 0.01),
    attenuationColor: color(),
    attenuationDistance: num(0.01, 20, 0.01),
    glowColor: color(),
    glowIntensity: intensity(10),
    fresnelPower: num(0.5, 10, 0.1),
    mainMinSize: num(0, 20, 0.1, 'mainMinSize', '包围盒最长边 ≥ 此值算主体；mid 档只有主体透射'),
    opaqueEnvMapIntensity: intensity(5),
  },
  figure: {
    _label: '场景人物 idle',
    enabled: bool(),
    breathAmplitude: num(0, 0.2, 0.001, 'breathAmplitude', '胸腔起伏幅度'),
    breathRate: num(0.05, 1, 0.01, 'breathRate', '呼吸频率（次/秒）'),
    headSway: num(0, 0.1, 0.001, 'headSway', '头部摆动角度（弧度），头发 / 头饰跟着动'),
    headRate: num(0.01, 0.5, 0.01, 'headRate', '头部摆动频率'),
    clothAmplitude: num(0, 0.1, 0.001, 'clothAmplitude', '布料波动幅度'),
    clothScale: num(0.1, 5, 0.01, 'clothScale', '波纹密度'),
    clothSpeed: num(0, 2, 0.01, 'clothSpeed', '波动速度'),
    blinkInterval: num(0, 15, 0.1, 'blinkInterval', '平均眨眼间隔（秒），0 = 不眨眼'),
    blinkDuration: num(0.05, 1.5, 0.01, 'blinkDuration', '一次眨眼的时长（秒）'),
    blinkAngle: num(0, 1.8, 0.01, 'blinkAngle', '闭眼时眼皮转动角度（弧度），眼睛闭不严就调大'),
    lookInterval: num(0, 30, 0.5, 'lookInterval', '平均多久看一次观众（秒），0 = 不看'),
    lookDuration: num(0.5, 15, 0.1, 'lookDuration', '每次看多久（秒）'),
    lookDistance: num(1, 100, 0.5, 'lookDistance', '观众多近才会看（米）'),
    lookMaxAngle: num(0, 1.2, 0.01, 'lookMaxAngle', '头最多转多少（弧度）'),
    lookSpeed: num(0.2, 10, 0.1, 'lookSpeed', '转头快慢'),
    skinBrightness: num(0.5, 2, 0.01, 'skinBrightness', '皮肤亮度（>1 提亮）'),
    skinSaturation: num(0, 1.5, 0.01, 'skinSaturation', '皮肤饱和度（<1 更白净）'),
    skinTint: color('skinTint 皮肤色调'),
    feltScale: num(20, 2000, 1, 'feltScale', '毛毡颗粒密度（越大越细）'),
    feltStrength: num(0, 3, 0.01, 'feltStrength', '毛毡凹凸强度'),
    feltSpeckle: num(0, 1, 0.01, 'feltSpeckle', '毛毡斑点强度'),
  },
  bubble: {
    _label: '泡泡 bubble',
    centerOpacity: num(0, 1, 0.01, 'centerOpacity', '正对视线处的不透明度（越小越通透）'),
    rimOpacity: num(0, 1, 0.01, 'rimOpacity', '边缘的不透明度'),
    fresnelPower: num(0.5, 10, 0.1, 'fresnelPower', '越大边缘越窄'),
    tint: color(),
    textureStrength: num(0, 1, 0.01, 'textureStrength', '烘焙反射贴图叠多少'),
    rimColor: color(),
    rimGlow: intensity(5),
    roughness: num(0, 1, 0.01),
    envMapIntensity: intensity(5),
    iridescence: num(0, 1, 0.01, 'iridescence', '薄膜彩虹色'),
    iridescenceIOR: num(1, 2.333, 0.01),
    filmThicknessMin: num(0, 1200, 10, 'filmThicknessMin', '膜厚下限（nm）'),
    filmThicknessMax: num(0, 1200, 10, 'filmThicknessMax', '膜厚上限（nm）'),
    bobAmplitude: num(0, 1, 0.005, 'bobAmplitude', '上下浮动幅度（米）'),
    bobSpeed: num(0, 5, 0.05, 'bobSpeed', '浮动速度'),
  },
  water: {
    _label: '水面 water',
    enabled: bool(),
    quality: select('low', 'mid', 'high'),
    level: num(-20, 20, 0.01),
    center: vec(0.5, 'center (x/z)'),
    size: num(1, 1000, 1),
    mesh: { t: 'text', label: 'mesh（网格水面）', hint: 'npm run terrain 生成的池塘水面；空 = 用 center / size 的方形平面' },
    shallowColor: color(),
    deepColor: color(),
    depthFalloff: num(0.01, 20, 0.01),
    normalScale: num(0.01, 2, 0.01),
    normalStrength: num(0, 2, 0.01),
    flowSpeed: num(0, 2, 0.01),
    flowDirectionDeg: num(-180, 180, 1),
    segments: num(1, 256, 1, 'segments', '水面网格细分：波浪起伏需要足够的顶点，low 档自动减半'),
    waveAmplitude: num(0, 3, 0.01),
    waveLength: num(0.5, 80, 0.5),
    waveSpeed: num(0, 3, 0.01),
    waveSteepness: num(0, 1, 0.01, 'waveSteepness', '横向位移，越大浪越尖'),
    fresnelPower: num(0.5, 10, 0.1),
    roughness: num(0, 1, 0.01),
    reflectionIntensity: num(0, 2, 0.01),
    reflectionResolution: num(128, 2048, 64, 'reflectionResolution', '实时反射分辨率：最大的性能旋钮，移动端自动减半'),
    reflectionLayers: select('terrain', 'terrain+vegetation'),
    refractionStrength: num(0, 1, 0.01),
    foamWidth: num(0, 3, 0.01),
    foamColor: color(),
    shoreFade: num(0, 2, 0.01, 'shoreFade（岸边渐隐 m）', '水越浅越透明，柔化岸线；0 = 关'),
    distanceFade: range(0, 300, 1, 'distanceFade（远处淡出 m）'),
    causticsIntensity: num(0, 3, 0.01),
    causticsScale: num(0.01, 2, 0.01),
    causticsSpeed: num(0, 3, 0.01),
    opacity: num(0, 1, 0.01),
    blockDepth: num(0, 5, 0.05, 'blockDepth', '水深超过该值不可行走；0 = 不限制'),
    walkable: bool('walkable', '水面可以行走（在浮岛之间走水）'),
    maxClimb: num(-1, 2, 0.05, 'maxClimb（高出水面 m）', '地面高出水面超过该值不可走上去，只在水面上走；-1 = 不限制'),
  },
  terrain: {
    _label: '生成地形 terrain',
    enabled: bool('enabled', '关掉 = 换回原始地形素材（原碰撞体、贴图池塘）'),
    model: { t: 'text' },
    collider: { t: 'text' },
    replaces: { t: 'text', label: 'replaces（隐藏的原地形材质）', hint: '逗号分隔' },
    ownsWater: bool('ownsWater', '关掉生成地形时同时关掉 water 水面'),
    material: select('textured', 'painted'),
    paintBrightness: num(0.3, 2, 0.01, 'paintBrightness', 'painted：手绘贴图亮度（颜色再乘 near 的 tint）'),
    paintNormalBlur: num(0, 6, 0.1, 'paintNormalBlur', 'painted：近处法线 / AO 模糊几级（去掉细碎的暗斑点）'),
    near: { _label: 'near（中心贴图）', ...groundLayer },
    far: { _label: 'far（远景贴图）', ...groundLayer },
    breakup: num(0, 1, 0.01, 'breakup（打散平铺）'),
    macroStrength: num(0, 1, 0.01, 'macroStrength（大尺度斑驳）'),
    macroScale: num(1, 100, 0.5, 'macroScale（斑驳尺度 m）'),
    bedColor: color('bedColor（池底）'),
    bedTint: num(0, 1, 0.01),
    farMatch: {
      _label: '裙边接色 farMatch（painted）',
      enabled: bool('enabled', '裙边颜色从岛边的手绘贴图色渐变到 deepColor；关掉 = far 贴图 × far.tint'),
      edgeColor: color('edgeColor（岛边）'),
      deepColor: color('deepColor（远处）'),
      start: num(0, 100, 0.5, 'start（离岛 m，开始变深）'),
      end: num(1, 160, 0.5, 'end（离岛 m，完全变深）'),
      detail: num(0, 1.5, 0.01, 'detail（far 贴图明暗）'),
      paintMip: num(0, 10, 0.1, 'paintMip（岛边取色模糊）'),
      paintReach: num(0.1, 20, 0.1, 'paintReach（离岛 m，手绘色淡出到 edgeColor）'),
    },
    peaks: { _label: '远景尖峰 peaks', topColor: color(), baseColor: color('baseColor（山脚，接近雾色）'), shade: num(0, 1, 0.01) },
    scatter: {
      _label: '散布花草 scatter',
      enabled: bool(),
      model: { t: 'text' },
      density: num(0, 1, 0.01, 'density（数量比例）', '再乘以 Global 档位表的 scatter 倍率'),
    },
    boundary: {
      _label: '软边界 boundary',
      enabled: bool(),
      map: { t: 'text', label: 'map（距离场）' },
      inset: num(-2, 5, 0.05, 'inset（离边缘多远停下）'),
      softWidth: num(0.1, 6, 0.05, 'softWidth（减速带宽度）'),
      pushBack: num(0, 10, 0.1, 'pushBack（出界回推 m/s）'),
    },
  },
  playArea: {
    _label: '可玩区 playArea（岛外一圈）',
    enabled: bool(),
    outline: hidden,
    margin: num(0, 30, 0.1, 'margin（轮廓外扩 m）', '岛的轮廓向外扩多少米作为边界线；轮廓本身用 npm run playarea 重算'),
    inset: num(-2, 5, 0.05, 'inset（离边界线多远停下）'),
    softWidth: num(0.1, 6, 0.05, 'softWidth（减速带宽度）'),
    pushBack: num(0, 10, 0.1, 'pushBack（出界回推 m/s）'),
    bubbles: {
      _label: '边界泡泡 bubbles',
      enabled: bool('enabled（泡泡排在边界线上）'),
      spacing: num(0.5, 10, 0.05, 'spacing（间距 m）'),
      jitter: num(0, 3, 0.05, 'jitter（随机错开 m）'),
      offset: num(-3, 5, 0.05, 'offset（整圈往外挪 m）'),
    },
  },
  pond: {
    _label: '贴图池塘 pond（shader 水面）',
    enabled: bool(),
    material: { t: 'text', label: 'material（地形材质名）' },
    maskColor: color('maskColor（贴图里的池塘色）'),
    tolerance: num(0, 0.6, 0.005),
    softness: num(0, 0.3, 0.005),
    level: num(-20, 20, 0.01, 'level（池塘高度）'),
    levelTolerance: num(0, 3, 0.01),
    darkCut: num(0, 0.5, 0.005, 'darkCut', '亮度低于该值也算水（池塘深处贴图是纯黑）'),
    color: color(),
    tint: num(0, 1, 0.01),
    roughness: num(0, 1, 0.01),
    normalScale: num(0.05, 5, 0.01),
    normalStrength: num(0, 2, 0.01),
    flowSpeed: num(0, 2, 0.01),
    flowDirectionDeg: num(-180, 180, 1),
    rippleScale: num(1, 20, 0.1, 'rippleScale（细涟漪尺度倍数）'),
    rippleSpeed: num(0, 3, 0.01),
    rippleStrength: num(0, 2, 0.01),
    swell: num(0, 1, 0.01, 'swell（风掠过的起伏）'),
    swellSpeed: num(0, 2, 0.01),
    fresnelPower: num(0.5, 10, 0.1),
    reflection: num(0, 3, 0.01),
  },
  detail: {
    _label: '地形细节贴图 detail',
    enabled: bool(),
    map: { t: 'text', label: 'map（颜色细节图）', hint: 'public 下的路径，留空关闭' },
    normalMap: { t: 'text', label: 'normalMap（可留空）' },
    scale: num(0.05, 4, 0.01, 'scale（平铺密度）'),
    strength: num(0, 1.5, 0.01, 'strength（颜色叠加）'),
    normalStrength: num(0, 3, 0.01),
    fadeStart: num(0, 60, 0.5, 'fadeStart（开始淡出距离）'),
    fadeEnd: num(1, 150, 0.5, 'fadeEnd（完全消失距离）'),
    slopeFade: num(0, 1, 0.01, 'slopeFade（陡坡淡出）'),
    breakup: num(0, 1, 0.01, 'breakup（打散平铺重复）', '0 = 关闭，可省两次纹理采样'),
  },
  grass: {
    _label: '程序化草 grass',
    enabled: bool(),
    mask: { t: 'text', label: 'mask（密度图）' },
    count: num(0, 200000, 1000, 'count（high 档）', '其它档位乘以 Global 档位表的 grass 倍率'),
    radius: num(5, 80, 0.5),
    fadeStart: num(0, 1, 0.01),
    densityThreshold: num(0, 1, 0.01),
    bladeHeight: range(0.02, 2, 0.01),
    bladeWidth: num(0.005, 0.3, 0.001),
    bend: num(0, 1, 0.01),
    baseColor: color(),
    tipColor: color(),
    colorVariation: num(0, 1, 0.01),
    normalUp: num(0, 1, 0.01),
    windInfluence: num(0, 3, 0.01),
    sss: num(0, 3, 0.01),
    receiveShadow: bool(),
  },
  beacon: {
    _label: '引导发光粒子 beacon',
    falloffNear: num(0, 50, 0.5),
    falloffFar: num(1, 200, 1),
    zoneFarIntensity: intensity(5),
    zoneNearIntensity: intensity(5),
    zoneInsideIntensity: intensity(5),
    assetFarIntensity: intensity(5),
    assetNearIntensity: intensity(5),
  },
  particles: {
    t: 'array',
    label: '粒子池',
    itemLabel: (p) => `${p.name}（${p.role}）`,
    create: (existing) => ({ ...DEFAULT_PARTICLE_POOL, name: `pool_${existing.length + 1}` }),
    item: {
      name: { t: 'text' },
      enabled: bool(),
      role: select('ambient', 'beaconZone', 'beaconAsset', 'burst', 'modelEmitters'),
      maxParticles: num(0, 5000, 10),
      emitterShape: select('point', 'box', 'sphere', 'cone', 'disk'),
      emitterRadius: num(0, 50, 0.05),
      emitterSize: vec(0.5, 'emitterSize (box)'),
      emitterAngle: num(0, Math.PI, 0.01),
      emitterHeight: num(0, 20, 0.05),
      emitterDirection: vec(0.05),
      emitterSurfaceOnly: bool(),
      startPositionAsDirection: bool(),
      lifetime: range(0.05, 30, 0.05),
      speed: range(0, 20, 0.01),
      directionSpread: num(0, Math.PI, 0.01),
      gravity: vec(0.01),
      friction: { _label: 'friction', intensity: num(0, 1, 0.01), easing: select('linear', 'easeIn', 'easeOut') },
      turbulence: { _label: 'turbulence', intensity: num(0, 5, 0.01), frequency: num(0, 5, 0.01), speed: num(0, 5, 0.01) },
      size: range(0.001, 3, 0.001),
      colorStart: color(),
      colorEnd: color(),
      intensity: intensity(20),
      blending: select('additive', 'normal'),
      appearance: select('gradient', 'circular', 'square'),
      fadeSizeCurve: curve(),
      fadeOpacityCurve: curve(),
      velocityCurve: curve(),
      rotation: range(-Math.PI, Math.PI, 0.01),
      rotationSpeed: range(-10, 10, 0.01),
      softDistance: num(0, 10, 0.05),
      groundFade: num(0, 5, 0.05),
      followCamera: bool(),
      depthTest: bool(),
      renderOrder: num(-10, 10, 1),
      emitters: {
        t: 'array',
        label: '发射点 emitters',
        itemLabel: (e) => e.name,
        create: (existing) => ({ name: `emitter_${existing.length + 1}`, position: [0, 0, 0], emitCount: 100, delay: 0 }),
        item: { name: { t: 'text' }, position: vec(0.25), emitCount: num(0, 5000, 1), delay: seconds(10) },
      },
    },
  },
  post: postSchema,
  materials: { t: 'materials' },
  audio: {
    _label: '音频',
    master: { _label: 'master', volume: num(0, 1, 0.01), mute: bool() },
    ambience: { _label: 'ambience', volume: num(0, 1, 0.01), mute: bool(), fadeIn: seconds(10), fadeOut: seconds(10) },
    sfx: { _label: 'sfx', volume: num(0, 1, 0.01), mute: bool(), collectVolume: num(0, 1, 0.01) },
  },
  mobile: {
    _label: '移动端',
    pixelRatioMax: num(0.5, 3, 0.25),
    joystickRadius: num(30, 120, 1),
    joystickSensitivity: num(0.2, 3, 0.05),
    lookSensitivity: num(0.2, 5, 0.05),
  },
  placeholder: {
    _label: '占位',
    groundColor: color(),
    groundSize: num(10, 200, 1),
    zoneColor: color('zoneColor（已弃用）'),
    zoneOpacity: num(0, 1, 0.01, 'zoneOpacity', '已弃用（原采集区地面圈）'),
    assetRoughness: num(0, 1, 0.01),
    assetMetalness: num(0, 1, 0.01),
  },
  assets: {
    t: 'array',
    label: '资产摆位 assets',
    fixed: true,
    itemLabel: (a, i) => `${i + 1} · ${a.id}`,
    create: () => ({ id: '', position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }),
    item: {
      id: { t: 'hidden' },
      position: vec(0.1, 'position（x/z 世界，y 离地）'),
      rotation: vec(0.01),
      scale: num(0.1, 5, 0.01),
    },
  },
  flow: {
    _label: '采集流程',
    zoneCenter: vec(0.5, 'zoneCenter（已弃用）'),
    zoneRadius: num(0.5, 40, 0.1, 'zoneRadius', '已弃用（原采集区半径）'),
    proximity: num(0.5, 10, 0.1, 'proximity', '贴身距离：不管朝向都可采集'),
    inspectDistance: num(1, 40, 0.1, 'inspectDistance', '看向判定的相机距离上限'),
    inspectAngleDeg: num(2, 60, 0.5, 'inspectAngleDeg', '偏离画面中心（水平）多少度以内算看着它'),
    discoverScreenSize: num(0.02, 0.6, 0.005, 'discoverScreenSize', '资产最长边占竖直视野多少才算找到（越小越远就能找到）'),
    discoverFocusDuration: num(0, 4, 0.05, 'discoverFocusDuration', '发现时相机转向资产的最长时间（0 关闭）'),
    discoverFocusDamping: num(0.02, 2, 0.01, 'discoverFocusDamping', '相机转向的平滑时间常数（越小越快）'),
    introPromptSeconds: num(0, 30, 0.5, 'introPromptSeconds', '进场景的叙事提示停留多久'),
    othersFadeOut: bool('othersFadeOut', '确认后其余三个资产是否同步淡出'),
    selectGlowDuration: seconds(),
    fadeDuration: seconds(),
    resolveDelay: seconds(),
    idleEmissive: intensity(10),
    activeEmissive: intensity(10),
    foundEmissive: intensity(10),
    foundMarkerRadius: num(0.1, 5, 0.05, 'foundMarkerRadius', '发现光点飘散半径'),
    foundMarkerOpacity: num(0, 1, 0.01, 'foundMarkerOpacity', '发现光点不透明度'),
    foundMarkerSpeed: num(0, 3, 0.01, 'foundMarkerSpeed', '光点飘散速度（轮/秒）'),
    foundMarkerHeight: num(-2, 2, 0.01, 'foundMarkerHeight', '发散中心相对资产中心的高度偏移'),
    foundMarkerSize: num(0, 300, 1, 'foundMarkerSize', '光点大小'),
    foundMarkerHaloSize: num(0, 6, 0.05, 'foundMarkerHaloSize', '资产身后彩色光晕的直径'),
    foundMarkerHaloOpacity: num(0, 1, 0.01, 'foundMarkerHaloOpacity', '彩色光晕不透明度'),
    foundMarkerSaturation: num(0, 3, 0.05, 'foundMarkerSaturation', '光晕颜色饱和度倍数（光点用原色）'),
    inspectEmissive: intensity(10),
    selectedEmissive: intensity(20),
    assetSize: num(0.1, 5, 0.01, 'assetSize', '本场景交互资产整体大小（× 资产摆位里各自的 scale）'),
    assetSelfGlow: num(0, 2, 0.01, 'assetSelfGlow', '真实模型常驻自发光（颜色取自 base 贴图）'),
    assetGlowGain: num(0, 1, 0.01, 'assetGlowGain', '真实模型：上面四档发光 × 该倍数，叠加到自发光上'),
    breatheSpeed: num(0, 10, 0.05),
    breatheDepth: num(0, 1, 0.01),
    emissiveDamping: num(0, 1, 0.01),
    spinSpeed: num(0, 5, 0.05),
    assetLift: num(0, 5, 0.05),
    floatAmplitude: num(0, 1, 0.01),
    floatSpeed: num(0, 10, 0.05),
    clickDragThreshold: num(0, 30, 1),
  },
}

const roleSchema = {
  anchor: vec(0.01, 'anchor（归一）'),
  region: vec(0.01, 'region（归一）'),
  rotation: vec(0.01),
  scale: num(0.1, 3, 0.01),
}

export const ENDING_SCHEMA: SchemaFor<EndingConfig> = {
  version: hidden,
  scene: hidden,
  camera: {
    _label: '相机',
    fov: num(10, 90, 0.5),
    position: vec(0.1),
    lookAt: vec(0.1),
    autoFrame: bool('autoFrame', '按画框大小自动调整相机距离'),
    framePadding: num(0, 1, 0.01),
  },
  background: color('背景色'),
  lights: lightsSchema,
  frame: {
    _label: '画框',
    mode: { t: 'select', options: ['3d', 'plane', 'model'] },
    color: color(),
    metalness: num(0, 1, 0.01),
    roughness: num(0, 1, 0.01),
    backColor: color(),
    backRoughness: num(0, 1, 0.01),
    size: vec(0.05),
    border: num(0, 2, 0.01),
    planeDepth: num(-5, 5, 0.01),
    models: {
      t: 'array',
      label: '画框模型',
      itemLabel: (m) => m.name,
      create: (existing) => ({ name: `frame_${existing.length + 1}`, model: '', height: 6, offset: [0, 0, 0] }),
      item: {
        name: { t: 'text' },
        model: { t: 'text' },
        height: num(0.5, 20, 0.05),
        offset: vec(0.01),
      },
    },
    modelIndex: num(-1, 9, 1, 'modelIndex', '-1 = 按组合随机'),
    velvet: {
      _label: '绒布衬底',
      enabled: bool('enabled', '画框模型内框里铺深色绒布'),
      color: color(),
      sheenColor: color('sheenColor（绒毛光泽）'),
      sheen: num(0, 1, 0.01),
      grain: num(0, 1, 0.01, 'grain（颗粒）'),
      margin: num(0, 0.5, 0.01, 'margin', '比内框大多少，边缘藏进画框'),
      offset: num(0, 0.2, 0.001, 'offset', '离背板多远'),
    },
  },
  decor: {
    _label: '装饰花草',
    enabled: bool(),
    model: { t: 'text' },
    pieces: { t: 'text', label: 'pieces（逗号分隔）' },
    brightness: num(0, 2, 0.01),
    fitMargin: num(0, 0.5, 0.005),
    specimenGap: num(0, 0.5, 0.005),
    slots: {
      t: 'array',
      label: '落位',
      itemLabel: (_s, i) => `slot ${i + 1}`,
      create: () => ({ anchor: [0, -0.4, 0], height: 0.15, rotation: [0, 0, 0] }),
      item: {
        anchor: vec(0.01, 'anchor（归一）'),
        height: num(0.01, 1, 0.005),
        rotation: vec(0.01),
      },
    },
    grass: {
      _label: '一圈草',
      enabled: bool(),
      count: num(0, 400, 1),
      radius: num(0.2, 0.7, 0.005),
      inset: num(0, 0.3, 0.005),
      arcDeg: num(0, 360, 1),
      bottomBias: num(0, 0.95, 0.05),
      size: range(0.005, 0.3, 0.005, 'size（占内框高）'),
      depth: range(-0.6, 0.6, 0.01, 'depth（归一）'),
      lean: num(0, 1, 0.01),
    },
  },
  composition: {
    _label: '标本构图',
    hero: select<HeroChoice>('auto', 'cave', 'ocean', 'garden'),
    heroRole: { _label: '主体', ...roleSchema },
    accentNear: { _label: '前景点缀', ...roleSchema },
    accentFar: { _label: '远景点缀', ...roleSchema },
    mirror: select<MirrorMode>('auto', 'off', 'on'),
    jitterDeg: num(0, 30, 0.5),
    grassMargin: num(0, 0.3, 0.005),
    specimenGap: num(0, 0.5, 0.005),
    maxGrow: num(0.5, 3, 0.01),
    heroWeight: num(0.5, 5, 0.05),
    sideSpread: num(0, 0.4, 0.005),
    floatAmplitude: num(0, 0.3, 0.005),
    floatSpeed: num(0, 3, 0.01),
  },
  specimen: {
    _label: '标本材质',
    emissiveIntensity: intensity(5),
    roughness: num(0, 1, 0.01),
    metalness: num(0, 1, 0.01),
    hoverEmissive: intensity(5),
    sceneGlow: num(0, 3, 0.01, 'sceneGlow', '真实模型自发光 × 场景里的常驻发光（1 = 与场景一致）'),
    saturation: num(0, 3, 0.01, 'saturation', '真实模型饱和度 × 资产自己的调色'),
    brightness: num(0, 2, 0.01, 'brightness', '真实模型亮度 × 资产自己的调色'),
  },
  reveal: {
    _label: '入场',
    fadeDuration: seconds(),
    textDelay: seconds(),
    boxScaleFrom: num(0.5, 1.5, 0.01),
    boxDuration: seconds(),
    specimenDuration: seconds(),
    specimenStagger: seconds(),
    specimenFrom: vec(0.05, 'specimenFrom（相对落位点）'),
  },
  environment: {
    _label: '环境光（影棚）',
    intensity: intensity(5),
    rotationY: num(-Math.PI, Math.PI, 0.01),
    topColor: color(),
    bottomColor: color(),
    keyIntensity: intensity(20),
    keySize: num(0.5, 20, 0.1),
  },
  shadows: {
    _label: '阴影（主光）',
    enabled: bool(),
    bias: num(-0.01, 0.01, 0.0001),
    normalBias: num(0, 0.2, 0.001),
    radius: num(0, 10, 0.1, 'radius（soft 档）'),
    cameraSize: num(1, 30, 0.5),
    cameraFar: num(5, 100, 1),
  },
  post: postSchema,
  interaction: {
    _label: '交互（旋转 / 缩放）',
    yawLimitDeg: num(0, 90, 1),
    pitchLimitDeg: num(0, 60, 1),
    dragSensitivity: num(0.01, 1, 0.01),
    damping: num(0, 1, 0.01),
    zoomMin: num(0.3, 1, 0.01),
    zoomMax: num(1, 3, 0.01),
    zoomSpeed: num(0.0001, 0.005, 0.0001),
    returnDelay: seconds(20),
    idleSwayDeg: num(0, 10, 0.1),
    idleSwaySpeed: num(0, 3, 0.01),
  },
  photo: {
    _label: '照片导出',
    scale: num(1, 4, 0.5),
    margin: num(0, 400, 1),
    background: color(),
    borderWidth: num(0, 40, 1),
    borderColor: color(),
    includeText: bool(),
    titleSize: num(10, 120, 1),
    descSize: num(8, 60, 1),
    textColor: color(),
    descColor: color(),
    textGap: num(0, 200, 1),
    includeLogo: bool(),
    logo: { t: 'text', label: 'logo（public 下路径）' },
    logoSize: num(16, 400, 1),
    includeBrand: bool('includeBrand', '底边框压一行项目名'),
    brandSize: num(8, 48, 1),
    crop: bool('crop', '只截取画框区域'),
    cropPadding: num(0, 1, 0.01),
  },
}

const tierSchema = (label: string) => ({
  _label: label,
  pixelRatioMax: num(0.5, 3, 0.25),
  water: { t: 'select', options: ['low', 'mid', 'high'] } as SelectLeaf<QualityTier>,
  windLayers: num(1, 3, 1),
  sss: { t: 'select', options: ['off', 'single', 'full'] } as SelectLeaf<TierSettings['sss']>,
  crystal: { t: 'select', options: ['none', 'main', 'all'] } as SelectLeaf<TierSettings['crystal']>,
  shadows: { t: 'select', options: ['off', 'on', 'soft'] } as SelectLeaf<TierSettings['shadows']>,
  shadowMapSize: num(256, 4096, 256),
  particles: num(0, 1, 0.05),
  grass: num(0, 1, 0.05),
  scatter: num(0, 1, 0.05),
  detail: { t: 'select', options: ['off', 'basic', 'full'] } as SelectLeaf<TierSettings['detail']>,
  post: { t: 'select', options: ['basic', 'mid', 'full'] } as SelectLeaf<TierSettings['post']>,
  msaa: num(0, 8, 2),
  anisotropy: num(1, 16, 1),
})

export const GLOBAL_SCHEMA: SchemaFor<GlobalConfig> = {
  version: hidden,
  scene: hidden,
  transition: { _label: '页面过场', fadeOut: seconds(), fadeIn: seconds(), color: color() },
  quality: {
    _label: '质量档位',
    desktopDefault: { t: 'select', options: ['low', 'mid', 'high'] },
    mobileDefault: { t: 'select', options: ['low', 'mid', 'high'] },
    tiers: { _label: '各档位上限', low: tierSchema('low'), mid: tierSchema('mid'), high: tierSchema('high') },
    frameGuard: {
      _label: '帧率守门（自动降档）',
      enabled: bool('enabled', '默认是否开启自动降档；面板「调试」里可临时锁定档位'),
      targetFpsDesktop: num(20, 144, 1),
      targetFpsMobile: num(15, 120, 1),
      threshold: num(0.3, 1, 0.05, 'threshold', '低于目标帧率的这个比例才算不达标'),
      window: seconds(10),
      warmup: seconds(10),
    },
  },
  specimenLook: {
    _label: '交互资产影棚光',
    enabled: bool('enabled', '场景里与标本盒里的交互资产用统一的影棚光，颜色接近效果图'),
    mix: num(0, 1, 0.01, 'mix', '0 = 场景光照，1 = 影棚光'),
    gain: num(0, 3, 0.01),
    ambient: num(0, 2, 0.01),
    key: num(0, 2, 0.01),
    fill: num(0, 2, 0.01),
    rim: num(0, 2, 0.01),
    spec: num(0, 2, 0.01),
    keyColor: color(),
    fillColor: color(),
    saturation: num(0, 2, 0.01, 'saturation', '饱和度补偿：ACES 色调映射会把颜色压灰'),
  },
}
