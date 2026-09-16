// 只保留千鳥破風。这是整个入口场景的配置来源。
import { assetUrl } from '../lib/assetUrl.js'

export const SCENE = {
  id: 'chidori',
  roof: assetUrl('roofs/chidori.svg'),
  title: '千鳥破風',
  subtitle: 'ちどりはふ · 墨紫の宵',
  // 15 秒后拉门自动打开
  openAfterMs: 15000,
  palette: {
    from: '#f0ebf3',
    to: '#87769b',
    ink: '#282132',
    cord: 'rgba(40,33,50,0.15)',
    paper: 'rgba(243,239,246,0.72)',
    // 门内透出的暖光
    glow: '#f3c98a',
  },
  lines: [
    '宵闇はいちばん静かな色をしている',
    '千鳥は波の上に名を残さない',
    '灯りがひとつ増えるたび町は遠くなる',
    '眠る前のわずかな時間だけが自分のものだ',
    '暗さは終わりではなく余白である',
  ],
}
