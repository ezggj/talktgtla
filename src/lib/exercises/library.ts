/** Curated gym exercise library — HK Cantonese form cues + demo links. */

export type ExerciseGuide = {
  id: string
  nameZh: string
  nameEn: string
  aliases: string[]
  muscle: string
  /** 2–4 short 廣東話 form cues: setup / movement / common mistakes */
  cues: string[]
  /** Public demo (MuscleWiki / reputable YouTube). Opens in new tab. */
  demoUrl: string
  demoLabel?: string
}

export const GENERIC_CUES = [
  '未有示範：保持核心收實、控制速度，唔好借力甩勢。',
  '全程有控制——上慢下慢都得，痛就停。',
  '呼吸：出力嗰下呼氣，還原吸氣。',
] as const

export const EXERCISES: ExerciseGuide[] = [
  {
    id: 'bench',
    nameZh: '卧推',
    nameEn: 'Bench Press',
    aliases: ['bench', '胸', '卧推', '平板卧推'],
    muscle: '胸',
    cues: [
      '仰躺凳上，腳踩實、肩胛骨夾實貼凳，槓大概喺眼上方。',
      '下放時手肘約 45°，槓落到胸口中下；推起時呼氣，唔好彈胸借力。',
      '新手常見錯：手肘完全打開、屁股離凳、下放太快。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    demoLabel: 'YouTube 卧推教學',
  },
  {
    id: 'squat',
    nameZh: '深蹲',
    nameEn: 'Squat',
    aliases: ['squat', '腿', '深蹲', '深蹲槓'],
    muscle: '腿',
    cues: [
      '腳大約與肩同寬、腳尖微向外；槓坐上斜方肌，胸挺、望前。',
      '臀向後坐落去，膝跟住腳尖方向；大腿至少到平行，再踩地站起。',
      '常見錯：膝內扣、腰圓背、腳跟離地——重量唔夠就減先練姿勢。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=bEv6CCg2BC8',
    demoLabel: 'YouTube 深蹲教學',
  },
  {
    id: 'deadlift',
    nameZh: '硬拉',
    nameEn: 'Deadlift',
    aliases: ['deadlift', '背', '硬拉', '傳統硬拉'],
    muscle: '背',
    cues: [
      '槓貼小腿，髖鉸鏈彎腰握槓，背打直、核心收，肩喺槓微前方。',
      '用腳踩地推起，槓貼身向上；到頂髖前推，唔好過度後仰。',
      '常見錯：圓背起槓、槓離身太遠、用腰「拗起」——痛腰即停。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q',
    demoLabel: 'YouTube 硬拉教學',
  },
  {
    id: 'ohp',
    nameZh: '肩推',
    nameEn: 'Overhead Press',
    aliases: ['ohp', '肩', '推舉', '軍事推舉', '過頭推'],
    muscle: '肩',
    cues: [
      '站姿核心收實，槓由鎖骨前方推起，頭微後讓路再開前穿出。',
      '推到手臂伸直但唔鎖死；下放有控制落到鎖骨附近。',
      '常見錯：過度後仰借腰力、手肘過度打開——重量太大就減。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
    demoLabel: 'YouTube 肩推教學',
  },
  {
    id: 'row',
    nameZh: '划船',
    nameEn: 'Barbell Row',
    aliases: ['row', '划船', '背', '槓铃划船', '槓鈴划船'],
    muscle: '背',
    cues: [
      '髖鉸鏈微屈膝，背打直接近水平，槓垂喺腳前。',
      '將槓拉向肚臍／下胸，肩胛骨夾實；下放伸直但唔鬆背。',
      '常見錯：用慣性甩、腰圓、只拉手唔用背——想像手肘向後「插腰」。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ',
    demoLabel: 'YouTube 划船教學',
  },
  {
    id: 'pullup',
    nameZh: '引體上升',
    nameEn: 'Pull-up',
    aliases: ['pullup', '引體', '背', 'pull-up', 'chin'],
    muscle: '背',
    cues: [
      '正手握槓略闊於肩，身體垂直、核心收，由完全懸垂開始。',
      '拉到下巴過槓，想像手肘向下收；下放有控制到手臂伸直。',
      '做唔到完整下？用彈力帶輔助或者做高拉先打底。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    demoLabel: 'YouTube 引體教學',
  },
  {
    id: 'latpulldown',
    nameZh: '高拉',
    nameEn: 'Lat Pulldown',
    aliases: ['高拉', 'lat', 'pulldown', '背闊'],
    muscle: '背',
    cues: [
      '坐穩夾住大腿墊，握距略闊於肩，胸微挺。',
      '將槓拉到鎖骨／上胸，手肘向下向後；唔好大力後仰借力。',
      '常見錯：只用手拉、槓撞胸太大力、下放彈起——慢落去先有感覺。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
    demoLabel: 'YouTube 高拉教學',
  },
  {
    id: 'legpress',
    nameZh: '腿舉',
    nameEn: 'Leg Press',
    aliases: ['腿舉', 'leg press', '腿推'],
    muscle: '腿',
    cues: [
      '背貼實椅背，腳放踏板中間約肩寬，腳尖微外。',
      '下放至膝約 90°（腰唔離背墊），再踩出但膝唔鎖死。',
      '常見錯：下放太深令腰離墊、膝內扣——有腰感即減幅度。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
    demoLabel: 'YouTube 腿舉教學',
  },
  {
    id: 'rdl',
    nameZh: '羅馬尼亞硬拉',
    nameEn: 'RDL',
    aliases: ['rdl', '羅馬', '羅馬尼亞', '直腿硬拉'],
    muscle: '腿',
    cues: [
      '微屈膝固定角度，髖向後推，槓貼大腿下滑，背一直打直。',
      '感到腘繩肌（後髀）拉緊就停，再用臀腿拉返起身。',
      '同傳統硬拉分別：膝幾乎唔彎多，重點係髖鉸鏈同後髀。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=jEy_czbCRng',
    demoLabel: 'YouTube RDL 教學',
  },
  {
    id: 'lunges',
    nameZh: '弓步蹲',
    nameEn: 'Lunges',
    aliases: ['弓步', 'lunge', '箭步蹲'],
    muscle: '腿',
    cues: [
      '一步跨出，前後腳穩定；前膝大約喺腳踝上方，後膝輕落地。',
      '軀幹企直，踩前腳跟站起；左右交替或者行弓步都得。',
      '常見錯：前膝過度內扣、步距太短、前傾過多。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=QOVaHwm-Q6U',
    demoLabel: 'YouTube 弓步教學',
  },
  {
    id: 'curl',
    nameZh: '二頭彎舉',
    nameEn: 'Bicep Curl',
    aliases: ['二頭', '手臂', 'curl', '彎舉'],
    muscle: '手臂',
    cues: [
      '手肘貼身側，掌心向上（或啞鈴中立），只郁前臂。',
      '彎起到肩前，頂峰稍停；下放有控制，唔好擺動借腰。',
      '常見錯：甩勢、手肘向前移——減重量先換節奏。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
    demoLabel: 'YouTube 二頭教學',
  },
  {
    id: 'tricep',
    nameZh: '三頭下壓',
    nameEn: 'Tricep Pushdown',
    aliases: ['三頭', '手臂', 'pushdown', '繩索下壓'],
    muscle: '手臂',
    cues: [
      '繩索／直槓高位，手肘貼腰側固定，只郁前臂下壓。',
      '下壓到手臂伸直，感受三頭收緊；上放有控制唔要彈。',
      '常見錯：手肘離開身體、借肩下壓——想像上臂釘死唔郁。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=2-LaAJqakPk',
    demoLabel: 'YouTube 三頭教學',
  },
  {
    id: 'lateral',
    nameZh: '側平舉',
    nameEn: 'Lateral Raise',
    aliases: ['側平舉', '肩', '側舉', '飛鳥肩'],
    muscle: '肩',
    cues: [
      '微屈肘，啞鈴由身側舉起至大約與肩平行（唔好高過耳）。',
      '想像倒水壺：微微傾啞鈴，主力用中束肩；下放慢。',
      '常見錯：聳肩、甩勢太重——呢個動作宜輕重量高質量。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
    demoLabel: 'YouTube 側平舉教學',
  },
  {
    id: 'fly',
    nameZh: '飛鳥',
    nameEn: 'Cable Fly',
    aliases: ['飛鳥', '胸', '夾胸', 'cable fly'],
    muscle: '胸',
    cues: [
      '繩索／啞鈴飛鳥：微屈肘固定角度，胸肌主導夾向中間。',
      '打開時有控制感到胸口伸展，唔好過度後拉傷肩。',
      '常見錯：手肘角度一路變、重量太大變成推——輕啲先夾到胸。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=Iwe6AmxVf7o',
    demoLabel: 'YouTube 飛鳥教學',
  },
  {
    id: 'hipthrust',
    nameZh: '臀推',
    nameEn: 'Hip Thrust',
    aliases: ['臀推', '臀', 'hip thrust', '橋式加重'],
    muscle: '臀',
    cues: [
      '上背靠凳，槓／墊放髖前，腳踩地約與肩同寬。',
      '用臀把髖推到同膝肩成一直線，頂峰夾臀稍停；下放有控制。',
      '常見錯：用腰過度超伸、腳太遠／太近——頂峰應係臀出力唔係頂腰。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=LM8XHLYZBZI',
    demoLabel: 'YouTube 臀推教學',
  },
  {
    id: 'calf',
    nameZh: '提踵',
    nameEn: 'Calf Raise',
    aliases: ['小腿', '提踵', 'calf'],
    muscle: '腿',
    cues: [
      '腳掌前掌踩實，膝微直（站姿）或機上屈膝版都得。',
      '踮起至最高，頂峰稍停；慢慢落到腳跟有伸展感。',
      '動作幅度做足比堆重量更緊要；左右不平衡可以單腳做。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=-MHgs5tL1IM',
    demoLabel: 'YouTube 提踵教學',
  },
  {
    id: 'plank',
    nameZh: '平板支撐',
    nameEn: 'Plank',
    aliases: ['平板', 'core', 'plank', '撐體'],
    muscle: '核心',
    cues: [
      '肘或掌撐地，身體成一直線：頭、肩、髖、腳踝對齊。',
      '核心同臀輕夾，正常呼吸；唔好塌腰或者抬臀太高。',
      '抖震、塌腰就停——短時間高質量好過硬撐變形。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c',
    demoLabel: 'YouTube 平板教學',
  },
  {
    id: 'crunch',
    nameZh: '捲腹',
    nameEn: 'Crunch',
    aliases: ['捲腹', '腹', 'crunch', '仰臥起坐'],
    muscle: '核心',
    cues: [
      '仰躺屈膝，下背貼地；用腹肌把肩胛骨捲離地，唔使坐直。',
      '頂峰呼氣收腹，下放慢；手可輕放耳側，唔好用力拉頸。',
      '常見錯：扯頭、借慣性——幅度細但收得實先有效。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=Xyd_fa5zoUA',
    demoLabel: 'YouTube 捲腹教學',
  },
]

export function exerciseById(id: string) {
  return EXERCISES.find((e) => e.id === id)
}

export function searchExercises(q: string) {
  const s = q.trim().toLowerCase()
  if (!s) return EXERCISES
  return EXERCISES.filter(
    (e) =>
      e.nameZh.includes(s) ||
      e.nameEn.toLowerCase().includes(s) ||
      e.aliases.some((a) => a.toLowerCase().includes(s)) ||
      e.muscle.includes(s)
  )
}

/** Resolve guide by id or fuzzy name; null → use generic cues in UI. */
export function resolveExerciseGuide(idOrName?: string | null) {
  if (!idOrName) return null
  const byId = exerciseById(idOrName)
  if (byId) return byId
  const s = idOrName.trim().toLowerCase()
  return (
    EXERCISES.find(
      (e) =>
        e.nameZh === idOrName ||
        e.nameZh.includes(idOrName) ||
        e.nameEn.toLowerCase() === s ||
        e.aliases.some((a) => a.toLowerCase() === s)
    ) || null
  )
}
