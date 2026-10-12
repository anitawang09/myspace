// 入口场景的配置来源。
import { assetUrl } from '../lib/assetUrl.js'
import TEMPLE from './temple.json'

export const SCENE = {
  // 鳳凰堂由 scripts/bake-temple.mjs 从 src/three/phoenixHall.js 烘成静态图。
  // eaves 只含各层屋顶：字帘挂在檐口下沿，不能按整栋建筑的最低点（石台）去挂
  temple: {
    src: assetUrl('temple/phoenix-hall.webp'),
    eaves: assetUrl('temple/phoenix-hall-eaves.png'),
    alt: '平等院鳳凰堂',
    ...TEMPLE,
  },
  title: '千鳥破風',
  subtitle: 'ちどりはふ · 墨紫の宵',
  // 15 秒后拉门自动打开
  openAfterMs: 15000,
  palette: {
    from: '#f0ebf3',
    to: '#87769b',
    ink: '#282132',
    cord: 'rgba(40,33,50,0.15)',
    // 门内透出的暖光
    glow: '#f3c98a',
    // 背景里流动的墨：平时就在近黑到墨紫之间游走，暖色金只留给
    // 速度场的最尾端——闲置时的自动漂移力道到不了那里，不会无端在
    // 标题后面冒出一团金色光斑；真被滑过去搅动得很急，才会泛暖
    liquid: ['#120e1a', '#1c1728', '#282132', '#3a3252', '#544971', '#766897', '#87769b', '#f3c98a'],
  },
  lines: [
    '宵闇はいちばん静かな色をしている',
    '千鳥は波の上に名を残さない',
    '灯りがひとつ増えるたび町は遠くなる',
    '眠る前のわずかな時間だけが自分のものだ',
    '暗さは終わりではなく余白である',
  ],
}
