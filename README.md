# 檐语

Vite + React 19 + three.js。两幕：

1. **门外** —— 平等院鳳凰堂（three.js 程序化模型，烘成静态图），立在阿字池上，
   水面是它的倒影。各层檐下垂着 Canvas 手写的 Verlet 链式字帘，帘后中堂正面
   那一间是一道日式拉门。背景是一层很淡的 WebGL 墨色流体，围着字帘那一片
   慢慢漂，光标划过会被搅出涟漪。**15 秒后门自动拉开**（等不及就点一下），
   门内的气流把帘子吹开，镜头对准那一间推进去。
2. **门内** —— three.js 的床の間座敷（`Tokonoma_Tatami_Room.html` 的模型）：十八畳、
   障子、襖、掛軸与盆栽，午后的日光从障子那侧斜射进来，窗格在榻榻米上投出格子影。
   房间里三样东西可以点开：

| 位置 | 物体 | 点开 |
| --- | --- | --- |
| 矮桌的桌旗上 | 一张纸 | 履歴書 · RESUME |
| 床の間，盆栽左边 | Olympus CCD 小相机 | 写真 · 拍立得横向滑动画廊 |
| 前面那块座布団右手边的榻榻米 | OV-chipkaart + 登机牌（同一个物体，一起点） | 足跡 · 内容待搭 |

悬停会抬起物件、亮起冷色高光并浮出标签；点击开覆盖层，Esc 关闭。

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run shots    # 逐幕截图 + 自检（需要 dev 已启动）
npm run build
```

调试参数：`?t=3` 把 15 秒改成 3 秒，`?room=1` 直接进屋，`?open=resume|gallery|travel` 直接打开某一层。

## 结构

| 文件 | 作用 |
| --- | --- |
| `src/App.jsx` | 两幕切换；three.js 分包，门外那幕不为它等待 |
| `src/scenes/Gate.jsx` | 门外：轮廓扫描 / 建帘 / 拉门 / 倒计时 / 开门阵风 |
| `src/effects/LiquidEther.jsx` | 门外背景的 WebGL 墨色流体（[React Bits](https://reactbits.dev) 组件，懒加载） |
| `src/scenes/Room.jsx` | 门内：机位、光照、热点摆放、射线拾取 |
| `src/three/tokonoma.js` | 座敷的程序化模型（`createTokonomaRoom()`）：几何、材质、贴图 |
| `src/three/props.js` | 三个可点物件：纸、Olympus、卡与机票 |
| `src/three/textures.js` | `makeTexture()` 与物件用的贴图：履历纸 / 卡 / 机票 / 机身 |
| `src/overlays/*.jsx` | 三个覆盖层：履历 / 拍立得画廊 / 足迹 |
| `src/data/resume.js` · `photos.js` | 履历与照片的内容源，改这两个文件即可 |
| `src/data/scene.js` | 场景配置（建筑素材、主色调、文字、`openAfterMs`） |
| `src/three/phoenixHall.js` | 鳳凰堂的程序化模型（`createPhoenixHallModel()`，按部件分组） |
| `scripts/bake-temple.mjs` + `debug/bake-temple.*` | 把模型烘成门外用的图 / 屋顶 mask / 元数据（只在开发期跑） |
| `src/data/temple.json` | 烘焙产出的元数据：宽高比、中堂开间矩形、石台下沿 |
| `src/lib/profile.js` | Canvas 逐列扫描 alpha，生成轮廓 Profile |
| `src/physics/verlet.js` | Verlet 积分、距离约束、边缘反弹 |
| `src/physics/curtain.js` | 字帘：建绳、风、鼠标交互、开门阵风、消融渲染、自检 |
| `scripts/shoot.mjs` | 三种视口逐幕截图与量化验证 |

## 物理与消融参数

`src/physics/verlet.js` 的 `PHYSICS`：

| 参数 | 值 | 说明 |
| --- | --- | --- |
| `GRAVITY` | 0.28 | 重力 |
| `FORCE` | 0.025 | 风 / 外力系数 |
| `BOUNCE` | 0.6 | 边缘弹性反弹 |
| `DAMPING` | 0.986 | 速度阻尼 |
| `ITERATIONS` | 6 | 约束松弛迭代 |
| `BEND` | 0.055 | 抗弯，纸帘感 |
| `POINTER_RADIUS/PUSH/DRAG` | 92 / 0.42 / 0.22 | 光标推开半径、强度、拖带 |

右下角消融：`alpha = 1 - dissolveWeight * 0.8`，只作用于 `fillText` 时的透明度。
消融权重不进入任何约束，悬绳始终完整连结。

开门那一下调用 `curtain.gust(x, y)`：以门口为中心的一次性外推力，
同样只加力、不动约束，风过之后帘子自己荡回来。

## 轮廓咬合

1. 屋顶 mask（`phoenix-hall-eaves.png`）`onLoad` 后画进离屏 Canvas。
2. 逐列自下而上找第一个不透明像素，得到檐口下沿。
3. 结果按 0~1 归一化缓存，随视口尺寸缩放。
4. 每列文字的锚点 = 檐口下沿再往上 2px，弧线怎么走，字头就怎么排。
5. 拉门不从轮廓推算，直接用烘焙时投影出来的中堂开间矩形（见下节）。

扫的是 mask 而不是上屏的那张图：整栋建筑每一列最靠下的不透明像素是石台，
不是檐口——拿它去扫，字帘会挂在地上。

## 鳳凰堂：烘成静态图

`src/three/phoenixHall.js` 是完整的程序化 3D 模型，但门外的机位是固定的，
在每个访客的浏览器里实时跑 three.js 只为画一张不动的画面，是白付 WebGL
和 bundle 的钱，还会拖慢首屏。所以开发期渲染一次，产出三样东西（同一机位、同一裁切）：

| 产物 | 用途 |
| --- | --- |
| `public/temple/phoenix-hall.webp` | 上屏的整栋建筑，透明底（~220KB） |
| `public/temple/phoenix-hall-eaves.png` | 只留各层屋顶的纯白剪影，给 `scanProfile` 扫檐口（~30KB） |
| `src/data/temple.json` | `aspect`、`door`（中堂正面开间的归一化矩形）、`base`（石台下沿） |

```bash
npm run dev                                   # 烘焙页走 dev server
node scripts/bake-temple.mjs                  # 写入上面三个文件
node scripts/bake-temple.mjs --preview DIR    # 只写到 DIR，调构图 / 光照用
node scripts/bake-temple.mjs --fov=20 --cy=11 --env=0.18 ...   # 参数透传给 debug/bake-temple.js
```

改了模型或机位就重烘一次，门的位置、倒影的对称轴会跟着元数据自动更新。

- **门** —— 把前排檐柱 x=±2.4 之间、台面到联梁底的四个角投影到图上，
  `Gate.jsx` 按图片实际尺寸换算成像素，拉门正好盖住那一间；两扇障子在
  中柱上合拢。门只有一百来像素宽，所以障子的格子、框、阴影都按门宽比例走，
  推镜头的倍数也按"门洞盖满视口"现算（桌面约 14×，竖屏约 27×），
  固定的 3.4× 只会停在门外半空中淡出。
- **阿字池** —— 同一张图上下翻转，以 `base`（石台最下沿，裁切留了边，
  不是图片底边）为对称轴，淡、糊、往下渐隐。字帘的下半截就垂在水面上，
  原本建筑下面那一大片空白也有了着落。
- **光照的坑** —— 环境光（`RoomEnvironment`）和半球光开得太亮会把檐下的
  投影整个洗掉，建筑看上去像剪贴画；收到 `env 0.18 / hemi 0.38 / fill 0.18`，
  主光压低从左前方斜照，檐口在立面上才投得出长影。模型原本带的地面阴影接收面
  已经删掉——透明底的图里它只会变成一圈悬空的灰影。
- **竖屏** —— 鳳凰堂宽高比约 3.1，竖屏装不下全貌：放大到 150vw 让中堂居中，
  两翼伸出画面。字帘的横向范围夹在视口内（`curtain.js`），画外的绳子会被
  边界反弹推回来，在两边挤成一堆。

## 入口背景（LiquidEther）

门外的背景是 [React Bits](https://reactbits.dev) 的 `LiquidEther`——WebGL 流体模拟
（平流 / 泊松压力求解），速度场按大小映射到一条调色板上。原样搬运，只去掉了
Next.js 的 `'use client'` 指令。调的时候踩了两个坑：

- **闲置自动漂移不能把调色板推到最暖的一头**：`SCENE.palette.liquid`
  一开始只给了 4 档（墨黑 → 墨紫 → `to` 紫 → 门灯金），结果空闲时的自动
  漂移力道就能把速度场推到末档，标题背后无端冒出一团金色光斑。改成
  8 档、把金色压到速度场的最末端，同时把 `mouseForce`/`autoIntensity`
  调低，闲置时只在墨黑到墨紫之间游走，真被划过去搅动得很急才泛暖。
- **它只是背景，别为了"看起来更稠"多付一整圈粘性迭代的钱**：
  `isViscous` 会在每帧再跑一遍 `iterationsViscous` 次 Gauss-Seidel 求解，
  是这类流体模拟里最贵的一项。背景效果用不上这么厚重的质感，关掉之后
  省下几乎一半的每帧迭代。

像三维场景一样走懒加载（`React.lazy` + `Suspense`）：`three` 不进首屏的
入口 bundle，门外那幕的关键路径（标题 / 建筑 / 字帘 / 倒计时）不用等它，
背景效果是加载完才"浮现"的增强，不是阻塞渲染的必需品。
`prefers-reduced-motion: reduce` 时直接不挂载。

## 踩过的坑（都已在代码里注释）

- **逐字 `setTransform` 会覆盖 DPR 变换**，高分屏上字缩到左上角、和绳子分家。
  必须 `save/translate/rotate/restore` 叠加在既有变换上。
- **物理全程用 CSS 像素**，DPR 只作用于 `ctx`；混进物理量等于放大重力，粒子会砸到底部堆叠。
- **松弛法解不完长链**：重力把绳拉长，越往下字距越开，末端坠到底边挤成一堆。
  收尾加一遍自锚点向下的定距投影，绳子彻底不可伸长。
- **风的波长必须远大于帘宽**，否则左右两半往相反方向倒，列一长就互相穿插；
  再加一道相邻列横向最小间距约束兜底。
- **高度测量失败就不建帘**（`rootRect.height < 160` 直接返回等下一帧），
  否则字数按 0 高度算会漏出大片空隙。
- **WebGL 默认不保留绘制缓冲**：在渲染循环外读 canvas 只会拿到全黑，
  截图脚本据此误判"3D 场景没渲染"。亮度探针改成渲染后立刻 `readPixels`，
  并且在整幅画面上撒 24 个采样点 —— 只读某个角落会被地板或阴影带偏，
  高分屏下同样的像素数覆盖的画面区域还会缩水。
- **网页字体晚到会把建筑往下推**：布局在 `fonts.ready` 之后跑，但 Noto Serif JP
  是用到才下载的，那一刻 `fonts.status` 可能已经是 `loaded`。标题换上它之后变高几像素，
  建筑跟着下移，根节点尺寸却没变，只盯根节点的 `ResizeObserver` 不会触发——
  拉门和帘子锚点就停在旧位置上（实测差 7px，锚点陷进了檐口里）。现在同时盯着标题。
  旧版门的自检容差有 60px，一直没露出来；换成按 `temple.json` 精确换算的 2px 容差才抓到。
- **竖屏要放宽视角**：水平视野窄得多，座敷在竖屏用 70° 的竖直视角（横屏 50°），
  桌子和右下的卡票才都进得了画面。
- **页面里不止一块 canvas 时，通配符选择器会抓错**：加了 LiquidEther 之后
  `.gate` 里同时有它的 WebGL canvas 和字帘的 2D canvas，`shoot.mjs` 原来用
  `'.gate canvas'`（取第一个）去拿字帘画布，现在先抓到的是 LiquidEther
  的——而一块 canvas 一旦绑过 `webgl` 上下文，再 `getContext('2d')`
  永远是 `null`，不是哪次运行的偶发问题。选择器改成具体的
  `.gate__canvas`，两块 canvas 不会再抢。
- **验证 WebGL 内容"真的在动"不能在渲染循环外 `readPixels`**：同一个坑
  Room 的亮度探针已经踩过一次（见上），这次又在测试脚本里踩了一遍——
  默认不保留绘制缓冲，外部异步读到的永远是清空后的 0。换成走合成器的
  真实截图前后对比，测的就是用户实际看到的画面。

## 内容怎么填

- **履历** —— 内容在 `src/data/resume.js`（正文英文 / 栏目标题日英并置）。
  每条经历支持 `notes`（要点）与 `skills`（技能标签），技能栏用 `groups` 排标签。
- **摄影** —— 图片放进 `public/photos/`，在 `src/data/photos.js` 加一条；一条一个拍立得，
  数量跟着列表走。文件名可以带空格（`den haag.jpeg`）——`background-image` 的 `url()`
  加了引号，不加的话整条声明作废、那张拍立得是空的。`npm run shots` 会逐张验证照片真的加载出来。
- **足迹** —— `src/overlays/Footprints.jsx` 目前只接通了入口，
  数据建议放 `src/data/travel.js`。

## 座敷（门内）

`src/three/tokonoma.js` 由 `Tokonoma_Tatami_Room.html` 改写而来：那份是打包压缩过的
单文件查看器（three.js + OrbitControls + 场景全在一行里），这里只取场景本身，
按原样还原几何、材质、贴图与固定种子的随机序列，换成可读的命名。查看器专用的部分
（分解滑杆、部件标签、点选命名、日光开关、屋外的阴影接收面）都没有搬，
另外删掉了一块整个埋在床框里、永远看不见的板。机位与灯光照搬原文件的默认视角。

改写时留意的几处：

- **花茎的朝向**：原文件用 `lookAt` 再 `rotateX` 摆茎，之所以对，是因为它恰好在
  挂到已经旋转过的矮桌组之前调用（`lookAt` 按世界坐标算）。这里改成按方向向量
  `setFromUnitVectors`，跟调用顺序无关。
- **阴影类型**：three r185 已经弃用 `PCFSoftShadowMap`，会警告并退回
  `PCFShadowMap`；直接用 `PCFShadowMap`，`shadow.radius = 5` 在它上面才真正生效。
  阴影贴图从 4096 降到 2048：±5m 的阴影相机下每个纹素约 5mm，窗格照样清楚，显存省四分之三。
- **畳的材质**：原文件每一张畳都 clone 一份材质和贴图（21 份），只因贴图重复次数随长度变；
  这里按长度共用，只有 1.8m 与 0.9m 两份。
- **可点物件的包围盒**：以前是 `opacity: 0` 的透明盒子——透明并不妨碍投影，
  在日光下会投出方块状的影子。改成 `visible = false`：不画也不投影，而 three 的
  射线拾取不看 `visible`，照样点得中。

## 验证

`npm run shots` 在 1440×900@1x、1440×900@2x、414×812@2x 三种视口逐幕检查：

**门外** 建帘是否成功、绳数是否异常偏少、底部贴边粒子数、帘底余量、锚点漂移、
列间空隙、Canvas 缩放比是否等于 DPR、拉门是否排在帘子后面、拉门是否正好盖在
中堂开间上（与 `temple.json` 换算的位置误差 ≤2px）且在建筑中线上、帘顶是否盖过门顶
（轮廓要是误扫了整栋建筑，帘子会从石台挂下来，这一条就会报），
以及**墨迹包围盒 vs 物理包围盒**（任何变换 / DPR 错位都会在这里露馅）。

**开门** 点击与计时两条路各验一次：点击后障子是否真的在滑动（读 transform 位移），
以及不点任何东西、到点会不会自己开。

**门内** WebGL 画布尺寸、座敷的网格数（防止房间没建出来），渲染循环内采样的亮部占比
（防止一片死黑），三个热点在画面里的位置（相机在床の間、纸在中部、卡票在右下），
以及逐个悬停、点击、Esc 关闭。

**画廊** 拍立得的张数与 `photos.js` 一致，每张照片都真的加载出来。

**背景** LiquidEther 的 canvas 是否挂上了，等过 `autoResumeDelay` 之后
前后两张截图是否真的不一样（证明闲置自动漂移在生效，而不是一帧静止画面）。

截图输出到 `shots/`：闭门、开门中、全开、座敷、光标推帘、悬停与打开各层、画廊滑动。

这台沙箱的 headless Chromium 是软件渲染，页面上多块 canvas 同时动着的时候
合成一帧截图可能要好几秒——稳定但慢，不是卡死。`shoot.mjs` 给每个 page
设了 60s 的默认超时（`page.setDefaultTimeout`），别被这台机器的渲染速度
吓到以为是测试写坏了。
