# 檐语 · 千鳥破風

Vite + React 19 + three.js。两幕：

1. **门外** —— 千鳥破風的屋顶，檐下垂着 Canvas 手写的 Verlet 链式字帘，
   帘后是一道日式拉门。背景是一层很淡的 WebGL 墨色流体，围着字帘那一片
   慢慢漂，光标划过会被搅出涟漪。**15 秒后门自动拉开**（等不及就点一下），
   门内的气流把帘子吹开，镜头从门口推进去。
2. **门内** —— three.js 的 3D 书斋（夜色 + 窗外霓虹）。桌上只留一盏行灯和一张纸，
   房间里三样东西可以点开：

| 位置 | 物体 | 点开 |
| --- | --- | --- |
| 桌上 | 一张纸 | 履歴書 · RESUME |
| 左上搁板 | Olympus CCD 小相机 | 写真 · 拍立得横向滑动画廊 |
| 右下榻榻米 | OV-chipkaart + 登机牌（同一个物体，一起点） | 足跡 · 内容待搭 |

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
| `src/scenes/Room.jsx` | 门内：场景组装、光照、后期、射线拾取 |
| `src/three/textures.js` | 程序化贴图：榻榻米 / 障子 / 土壁 / 木纹 / 卡票 / 机身 |
| `src/three/props.js` | 物件：文机、行灯、纸、Olympus、卡与机票、搁板 |
| `src/overlays/*.jsx` | 三个覆盖层：履历 / 拍立得画廊 / 足迹 |
| `src/data/resume.js` · `photos.js` | 履历与照片的内容源，改这两个文件即可 |
| `src/data/scene.js` | 场景配置（屋顶、主色调、文字、`openAfterMs`） |
| `src/lib/profile.js` | Canvas 逐列扫描 alpha，生成轮廓 Profile |
| `src/physics/verlet.js` | Verlet 积分、距离约束、边缘反弹 |
| `src/physics/curtain.js` | 字帘：建绳、风、鼠标交互、开门阵风、消融渲染、自检 |
| `scripts/gen-roofs.mjs` | 生成屋顶素材（透明底 SVG） |
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

1. 屋顶图 `onLoad` 后画进离屏 Canvas。
2. 逐列扫描：自上而下第一个不透明像素得到 `top`，自下而上得到 `bottom`（檐口下沿）。
3. 结果按 0~1 归一化缓存，随视口尺寸缩放。
4. 每列文字的锚点 = 檐口下沿再往上 2px，弧线怎么走，字头就怎么排。
5. 拉门与墙身的位置也从同一份轮廓算出来（门顶贴着檐口下方 26px）。

素材（`scripts/gen-roofs.mjs`）刻意保证屋顶底缘是每一列最靠下的不透明像素：
层间壁、破风、擬宝珠都画在下层轮廓之上，不会污染 Profile。

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
入口 bundle，门外那幕的关键路径（标题 / 屋顶 / 字帘 / 倒计时）不用等它，
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
- **竖屏机位要后撤**：水平视野窄得多，不按宽高比调整书桌两头会被切掉。
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
- **摄影** —— 图片放进 `public/photos/`，在 `src/data/photos.js` 把 `src` 换成路径；
  没有 `src` 时显示占位色块，画廊结构不变。
- **足迹** —— `src/overlays/Footprints.jsx` 目前只接通了入口，
  数据建议放 `src/data/travel.js`。

## 关于外观

没有用 Blender（容器里没装，建模→glTF 这条链迭代太慢）。
房间是程序化几何 + 程序化贴图，靠这几样撑写实：

- `RoomEnvironment` 生成 IBL 环境贴图 —— 金属与镜片没有环境可反射就是一块死色
- `MeshPhysicalMaterial` 的 clearcoat 做镜头镀膜
- `UnrealBloomPass` 阈值 0.9，只让灯火与霓虹发光，纸和木头不糊
- 夜色调：行灯是唯一暖光源，窗外霓虹（品红 / 青）补冷色，搁板下一道青色灯带

## 验证

`npm run shots` 在 1440×900@1x、1440×900@2x、414×812@2x 三种视口逐幕检查：

**门外** 建帘是否成功、绳数是否异常偏少、底部贴边粒子数、帘底余量、锚点漂移、
列间空隙、Canvas 缩放比是否等于 DPR、拉门是否排在帘子后面、门顶是否贴着檐口，
以及**墨迹包围盒 vs 物理包围盒**（任何变换 / DPR 错位都会在这里露馅）。

**开门** 点击与计时两条路各验一次：点击后障子是否真的在滑动（读 transform 位移），
以及不点任何东西、到点会不会自己开。

**门内** WebGL 画布尺寸、场景对象数，以及渲染循环内采样的亮部占比（防止一片死黑）。

**背景** LiquidEther 的 canvas 是否挂上了，等过 `autoResumeDelay` 之后
前后两张截图是否真的不一样（证明闲置自动漂移在生效，而不是一帧静止画面）。

截图输出到 `shots/`：闭门、开门中、全开、书斋、光标推帘、书桌视差。

这台沙箱的 headless Chromium 是软件渲染，页面上多块 canvas 同时动着的时候
合成一帧截图可能要好几秒——稳定但慢，不是卡死。`shoot.mjs` 给每个 page
设了 60s 的默认超时（`page.setDefaultTimeout`），别被这台机器的渲染速度
吓到以为是测试写坏了。
