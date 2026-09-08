// 履历内容。改这里就好，覆盖层会照着排版。
export const RESUME = {
  name: 'Anita Wang',
  title: 'Designer · Developer',
  intro: '（这里放一段自我介绍：你是谁、在做什么、想找什么样的机会。）',
  contact: [
    { label: 'Email', value: 'anita930929@gmail.com' },
    { label: 'GitHub', value: 'github.com/anitawang09' },
    { label: 'Based in', value: '——' },
  ],
  sections: [
    {
      heading: '経歴 · Experience',
      items: [
        { period: '20XX — 現在', role: '職位', org: '会社 / 組織', notes: ['做了什么', '带来了什么结果'] },
        { period: '20XX — 20XX', role: '職位', org: '会社 / 組織', notes: ['做了什么'] },
      ],
    },
    {
      heading: '学歴 · Education',
      items: [{ period: '20XX — 20XX', role: '専攻', org: '学校', notes: [] }],
    },
    {
      heading: '技能 · Skills',
      items: [{ period: '', role: '', org: '', notes: ['技能一', '技能二', '技能三'] }],
    },
  ],
}
