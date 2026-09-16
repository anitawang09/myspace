// 履历内容。改这里就好，覆盖层会照着排版。
// 正文英文（英式拼写），栏目标题日英并置。
export const RESUME = {
  name: 'Anita Wang',
  title: 'Computational Social Science · University of Amsterdam',
  intro:
    'Computational Social Science student at the University of Amsterdam, fluent in English and Mandarin Chinese, with hands-on experience in stakeholder communication, data analysis and cross-cultural coordination. Combines strong interpersonal and organisational skills with a foundation in research and project management, alongside a keen interest in international trade, corporate services and legal support. Works independently and handles client-facing tasks professionally across five international teams — communicative, open-minded and positive.',
  contact: [
    { label: 'Email', value: 'anita930929@gmail.com' },
    { label: 'GitHub', value: 'github.com/anitawang09' },
    { label: 'Based in', value: 'Amsterdam, NL' },
  ],
  sections: [
    {
      jp: '経歴',
      en: 'Experience',
      items: [
        {
          period: 'Jun 2026 — Present',
          role: 'Human Resource Information Management Intern',
          org: 'TBAuctions',
          notes: [
            "Set up onboarding, probation and offboarding task flows, tailoring task lists to each region's requirements.",
            'Build payroll reports and dashboards.',
            'Coordinate across the Dutch headquarters and the Swedish, German, British and Danish teams.',
            'Provide platform and IT support.',
          ],
          skills: [
            'Python',
            'Data visualisation',
            'Information management',
            'GDPR compliance',
            'Payroll reporting',
            'Excel',
            'Word',
            'ESG',
          ],
        },
        {
          period: 'Aug 2025 — Present',
          role: 'Waitress',
          org: 'Akitsu Amsterdam',
          notes: [
            'Provide attentive customer service in a fast-paced, high-volume setting while supporting team coordination and daily operations.',
            'Communicate with a diverse, international clientele, building rapport and resolving requests professionally.',
          ],
          skills: ['Multitasking', 'Team coordination', 'Communication'],
        },
        {
          period: 'Jun 2025 — Present',
          role: 'Event & Project Coordinator',
          org: 'Amsterdam Taiwanese Student Association',
          notes: [
            'Plan and coordinate student-led events end to end, managing timelines, teams and logistics from concept to delivery.',
            'Liaise with members, partners and vendors — mainly in Mandarin Chinese — ensuring smooth communication and collaboration.',
          ],
          skills: ['Project management', 'Event management', 'Team collaboration', 'Time management'],
        },
        {
          period: 'Oct 2023 — Mar 2024',
          role: 'Pharmacist Assistant',
          org: 'Pharmalinx Medical Centre & Pharmacy',
          notes: [
            'Supported administrative processes and document preparation, maintaining strict accuracy on customer prescriptions and regulatory compliance.',
            'Handled customer communication and enquiries, delivering a reliable and professional service.',
          ],
          skills: ['Client handling', 'Medicine dispensing', 'Compounding', 'Electronic adjudication'],
        },
        {
          period: 'Sep 2023 — Mar 2024',
          role: 'Brand Promoter / Sales',
          org: 'Fantuan Delivery App',
          notes: [
            'Drove brand awareness and customer acquisition through direct engagement and targeted market outreach.',
            'Represented the brand to Mandarin-speaking customers, promoting products and gathering market feedback.',
          ],
          skills: ['Sales', 'Brand promotion', 'Problem-solving', 'Storytelling'],
        },
      ],
    },
    {
      jp: 'プロジェクト',
      en: 'Projects',
      projects: [
        {
          title: 'Investment Awareness for Sustainable Shipping',
          partner: 'with MARIN',
          description:
            'Analysed ROI and cost-saving datasets and built an analysis tool to support investment decision-making under EU energy regulatory and financial uncertainty from propulsion energy.',
          link: 'https://github.com/lotjas/Popeyes',
          linkLabel: 'Project repository',
        },
        {
          title: 'Strategic Communication Platform',
          partner: 'with Amsterdam-Amstelland Fire Department',
          description:
            'Designed a digital platform and communication strategy applying behavioural theory to drive cross-organisational collaboration.',
          link: 'https://www.brandweer.nl/amsterdam-amstelland/werken-bij/',
          linkLabel: 'Partner organisation',
        },
        {
          title: 'Voices in the News',
          partner: 'Independent research',
          description:
            'Asked to what extent speaker gender, institutional status and topic domain predict quotation prominence and the linguistic construction of authority in news reporting. Built a pipeline for quote extraction, NER-based speaker identification, name-based gender inference and topic-domain classification to drive attribution-verb analysis.',
          link: 'https://github.com/anitawang09/voices_in_the_news_project',
          linkLabel: 'Project repository',
        },
      ],
    },
    {
      jp: '学歴',
      en: 'Education',
      items: [
        {
          period: '2024 — Present',
          role: 'BSc Computational Social Science',
          org: 'University of Amsterdam',
          notes: ['Expected to graduate in 2027.'],
        },
        {
          period: '2023 — 2024',
          role: 'Psychology & Health Sciences',
          org: 'University of Toronto',
          notes: ['Transferred to the University of Amsterdam.'],
        },
        {
          period: '2017 — 2023',
          role: 'International Baccalaureate Diploma',
          org: '',
          notes: [],
        },
      ],
    },
    {
      jp: '技能',
      en: 'Skills & Languages',
      groups: [
        { label: 'Languages', tags: ['English — fluent', 'Mandarin Chinese — fluent'] },
        { label: 'Data', tags: ['Python', 'Data visualisation', 'Payroll reporting', 'Excel'] },
        {
          label: 'Ways of working',
          tags: [
            'Stakeholder communication',
            'Cross-cultural coordination',
            'Project & event management',
            'Information management',
            'GDPR compliance',
          ],
        },
      ],
    },
  ],
}
