/** Curated gym exercise library — HK Cantonese form cues + demo links + 俗稱 aliases. */

export type ExerciseGuide = {
  id: string
  nameZh: string
  nameEn: string
  aliases: string[]
  muscle: string
  /** 2–4 short 廣東話 form cues: setup / movement / common mistakes */
  cues: string[]
  /** Public demo (YouTube / reputable). Opens in new tab. */
  demoUrl: string
  demoLabel?: string
  /** Optional looping GIF / short demo image for inline preview */
  demoGifUrl?: string
}

export const GENERIC_CUES = [
  '未有示範：保持核心收實、控制速度，唔好借力甩勢。',
  '全程有控制——上慢下慢都得，痛就停。',
  '呼吸：出力嗰下呼氣，還原吸氣。',
] as const

/**
 * demoGifUrl: public Wikimedia / open exercise GIFs where available.
 * Failures fall back to YouTube thumbnail in ExerciseHowTo.
 */
export const EXERCISES: ExerciseGuide[] = [
  {
    id: 'bench',
    nameZh: '卧推',
    nameEn: 'Bench Press',
    aliases: [
      'bench', '胸', '卧推', '平板卧推', '練胸', '推胸', '平板推', '胸推', 'bench press', 'bp', '臥推',
      '平板臥推', '槓鈴卧推', '槓鈴臥推', 'benchpress', '平推', '胸推槓',
    ],
    muscle: '胸',
    cues: [
      '仰躺凳上，腳踩實、肩胛骨夾實貼凳，槓大概喺眼上方。',
      '下放時手肘約 45°，槓落到胸口中下；推起時呼氣，唔好彈胸借力。',
      '新手常見錯：手肘完全打開、屁股離凳、下放太快。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
    demoLabel: 'YouTube 卧推教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/SmithMachineBenchPress.gif',
  },
  {
    id: 'incline-bench',
    nameZh: '上斜卧推',
    nameEn: 'Incline Bench Press',
    aliases: [
      '上斜', '上斜卧推', '上斜臥推', 'incline', 'incline bench', '上斜推', '上胸', '練上胸',
      '斜板卧推', '斜板推',
    ],
    muscle: '胸',
    cues: [
      '凳調約 30–45°，肩胛夾實，槓由鎖骨／上胸上方推。',
      '下放落到上胸，手肘約 45°；唔好凳太斜變咗肩推。',
      '常見錯：角度超過 60°、彈胸、屁股離凳。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=DbFgADa2PL8',
    demoLabel: 'YouTube 上斜卧推',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/SmithMachineBenchPress.gif',
  },
  {
    id: 'dumbbell-press',
    nameZh: '啞鈴卧推',
    nameEn: 'Dumbbell Bench Press',
    aliases: [
      '啞鈴卧推', '啞鈴臥推', 'db bench', 'dumbbell press', '啞鈴胸推', '啞鈴推胸', '雙啞鈴卧推',
    ],
    muscle: '胸',
    cues: [
      '雙手各持啞鈴仰躺，啞鈴喺胸口兩側，掌心向前或微內旋。',
      '推起到手臂伸直但唔撞鈴；下放有控制感到胸口伸展。',
      '比起槓鈴活動幅度大啲——注意兩邊對稱。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=VmB1G1K7v94',
    demoLabel: 'YouTube 啞鈴卧推',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/SmithMachineBenchPress.gif',
  },
  {
    id: 'squat',
    nameZh: '深蹲',
    nameEn: 'Squat',
    aliases: [
      'squat', '腿', '深蹲', '深蹲槓', '練腿', '深蹲架', '背蹲', 'goblet', '高腳杯深蹲',
      '槓鈴深蹲', '背蹲槓', '蹲', '深蹲日', '腿日深蹲', 'high bar', 'low bar',
    ],
    muscle: '腿',
    cues: [
      '腳大約與肩同寬、腳尖微向外；槓坐上斜方肌，胸挺、望前。',
      '臀向後坐落去，膝跟住腳尖方向；大腿至少到平行，再踩地站起。',
      '常見錯：膝內扣、腰圓背、腳跟離地——重量唔夠就減先練姿勢。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=bEv6CCg2BC8',
    demoLabel: 'YouTube 深蹲教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Squats.gif',
  },
  {
    id: 'front-squat',
    nameZh: '前蹲',
    nameEn: 'Front Squat',
    aliases: ['前蹲', 'front squat', '前深蹲', '前槓深蹲', 'frontsquat'],
    muscle: '腿',
    cues: [
      '槓放鎖骨前／前三角，手肘抬高（前架姿），胸挺企直。',
      '臀後坐蹲下，保持軀幹較直；比起背蹲更考核心同活動度。',
      '手肘塌就槓會滾——先減重量練架姿。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=uYumuL_G_V0',
    demoLabel: 'YouTube 前蹲教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Squats.gif',
  },
  {
    id: 'deadlift',
    nameZh: '硬拉',
    nameEn: 'Deadlift',
    aliases: [
      'deadlift', '背', '硬拉', '傳統硬拉', '拉背', '硬拉槓', '傳統拉', 'dl',
      '杠鈴硬拉', '槓鈴硬拉', '硬拉日', 'conventional', '死拉', '地拉', '拉槓',
      'conventional deadlift', 'conv dl', '地板硬拉',
    ],
    muscle: '背',
    cues: [
      '槓貼小腿，髖向後推彎腰握槓；背打直、核心收實，肩喺槓微前方——呢個就係 Threads 成日講嘅 deadlift／硬拉。',
      '用腳踩地「推地板」起身，槓一路貼大腿；到頂髖向前夾，唔好過度後仰或者甩腰。',
      '常見錯：圓背起槓、槓離身、用腰拗起。痛腰即停。想練後髀多啲就轉做 RDL（羅馬尼亞硬拉）。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q',
    demoLabel: 'YouTube 硬拉教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Man_Lifting_Barbell_Deadlift_GIF_Animation_Loop.gif',
  },
  {
    id: 'sumo-deadlift',
    nameZh: '相撲硬拉',
    nameEn: 'Sumo Deadlift',
    aliases: ['相撲硬拉', 'sumo', 'sumo deadlift', '相撲拉', '闊站硬拉'],
    muscle: '背',
    cues: [
      '腳開闊、腳尖外，手喺兩腿之間握槓，髖較低、胸挺。',
      '推地起槓，膝蓋向外打開；槓仍然貼身。',
      '適合髖活動度好／想減低下背壓力嘅人——同樣唔好圓背。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=pqzVr_2s4lE',
    demoLabel: 'YouTube 相撲硬拉',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Man_Lifting_Barbell_Deadlift_GIF_Animation_Loop.gif',
  },
  {
    id: 'ohp',
    nameZh: '肩推',
    nameEn: 'Overhead Press',
    aliases: [
      'ohp', '肩', '推舉', '軍事推舉', '過頭推', '練肩', '過頭推舉', '站姿推舉', '軍事推',
      '槓鈴肩推', 'Standing press', 'military press', '推頭',
    ],
    muscle: '肩',
    cues: [
      '站姿核心收實，槓由鎖骨前方推起，頭微後讓路再開前穿出。',
      '推到手臂伸直但唔鎖死；下放有控制落到鎖骨附近。',
      '常見錯：過度後仰借腰力、手肘過度打開——重量太大就減。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
    demoLabel: 'YouTube 肩推教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Military-press-2.gif',
  },
  {
    id: 'db-shoulder-press',
    nameZh: '啞鈴肩推',
    nameEn: 'Dumbbell Shoulder Press',
    aliases: [
      '啞鈴肩推', 'db press', 'dumbbell shoulder press', '坐姿肩推', '啞鈴推舉', '肩推啞鈴',
    ],
    muscle: '肩',
    cues: [
      '坐穩或企直，啞鈴喺耳側，掌心向前或微相對。',
      '向上推到頭頂上方，唔好撞鈴；下放有控制。',
      '腰唔好拱到誇張——核心收實先。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=qEwKCR5JCog',
    demoLabel: 'YouTube 啞鈴肩推',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Military-press-2.gif',
  },
  {
    id: 'row',
    nameZh: '划船',
    nameEn: 'Barbell Row',
    aliases: [
      'row', '划船', '背', '槓铃划船', '槓鈴划船', '拉背', '槓鈴划', '練背', 'bent over row',
      '俯身划船', '槓划', '划背',
    ],
    muscle: '背',
    cues: [
      '髖鉸鏈微屈膝，背打直接近水平，槓垂喺腳前。',
      '將槓拉向肚臍／下胸，肩胛骨夾實；下放伸直但唔鬆背。',
      '常見錯：用慣性甩、腰圓、只拉手唔用背——想像手肘向後「插腰」。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ',
    demoLabel: 'YouTube 划船教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Barbell_Bent-over_Row.gif',
  },
  {
    id: 'seated-row',
    nameZh: '坐姿划船',
    nameEn: 'Seated Cable Row',
    aliases: [
      '坐姿划船', 'seated row', '繩索划船', '坐划', 'cable row', '低拉划船', '坐姿拉背',
    ],
    muscle: '背',
    cues: [
      '坐穩腳踩踏板，背微直，手臂伸直握住握把。',
      '拉向肚臍，肩胛夾實，軀幹唔好大力前後甩。',
      '常見錯：借腰前後搖——想像手肘向後插口袋。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=GZbfZ033f74',
    demoLabel: 'YouTube 坐姿划船',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Barbell_Bent-over_Row.gif',
  },
  {
    id: 'dumbbell-row',
    nameZh: '單臂啞鈴划船',
    nameEn: 'Single-Arm Dumbbell Row',
    aliases: [
      '單臂划船', '啞鈴划船', 'db row', 'one arm row', '單手划', '啞鈴划背', '三點划船',
    ],
    muscle: '背',
    cues: [
      '一手一膝撑凳，另一手持啞鈴自然下垂，背打直。',
      '將啞鈴拉向髖側，肘貼身；下放有控制。',
      '唔好轉身甩腰——肩同髖保持水平。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=pYcpY20QaE8',
    demoLabel: 'YouTube 單臂划船',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Barbell_Bent-over_Row.gif',
  },
  {
    id: 'pullup',
    nameZh: '引體上升',
    nameEn: 'Pull-up',
    aliases: [
      'pullup', '引體', '背', 'pull-up', 'chin', '引體向上', '拉單槓', 'chinup', 'chin-up', '單槓',
      '引體', '拉上', '做單槓',
    ],
    muscle: '背',
    cues: [
      '正手握槓略闊於肩，身體垂直、核心收，由完全懸垂開始。',
      '拉到下巴過槓，想像手肘向下收；下放有控制到手臂伸直。',
      '做唔到完整下？用彈力帶輔助或者做高拉先打底。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
    demoLabel: 'YouTube 引體教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Weighted%2C_wide-grip_pullup_video.gif',
  },
  {
    id: 'chinup',
    nameZh: '反手引體',
    nameEn: 'Chin-up',
    aliases: ['反手引體', 'chin-up', 'chinup', '反握引體', '反手單槓', '二頭引體'],
    muscle: '背',
    cues: [
      '反手（掌心向自己）握槓約肩寬，由懸垂開始。',
      '拉到下巴過槓；二頭同背都會出力。',
      '比起正手引體通常易啲——適合過渡期。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=brhRXlOhsAM',
    demoLabel: 'YouTube 反手引體',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Weighted%2C_wide-grip_pullup_video.gif',
  },
  {
    id: 'latpulldown',
    nameZh: '高拉',
    nameEn: 'Lat Pulldown',
    aliases: [
      '高拉', 'lat', 'pulldown', '背闊', '闊背', '背闊下拉', '高位下拉', '拉背機', '下拉',
      '闊背下拉', 'lat pull', '高位拉',
    ],
    muscle: '背',
    cues: [
      '坐穩夾住大腿墊，握距略闊於肩，胸微挺。',
      '將槓拉到鎖骨／上胸，手肘向下向後；唔好大力後仰借力。',
      '常見錯：只用手拉、槓撞胸太大力、下放彈起——慢落去先有感覺。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
    demoLabel: 'YouTube 高拉教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Weighted%2C_wide-grip_pullup_video.gif',
  },
  {
    id: 'legpress',
    nameZh: '腿舉',
    nameEn: 'Leg Press',
    aliases: [
      '腿舉', 'leg press', '腿推', '蹬腿', '腿機', '推腿', '腿推機', '腿部推舉', '斜蹬',
    ],
    muscle: '腿',
    cues: [
      '背貼實椅背，腳放踏板中間約肩寬，腳尖微外。',
      '下放至膝約 90°（腰唔離背墊），再踩出但膝唔鎖死。',
      '常見錯：下放太深令腰離墊、膝內扣——有腰感即減幅度。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=IZxyjW7MPJQ',
    demoLabel: 'YouTube 腿舉教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Leg-press-2.gif',
  },
  {
    id: 'leg-extension',
    nameZh: '腿伸展',
    nameEn: 'Leg Extension',
    aliases: ['腿伸展', 'leg extension', '伸膝', '前腿機', '踢腿機', '股四頭機', '腿彎伸'],
    muscle: '腿',
    cues: [
      '坐穩，護墊喺腳踝上方，背貼椅。',
      '伸膝踢直到大腿前側收緊，頂峰稍停；下放慢。',
      '唔好用慣性彈——重量適中先夾到股四頭。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=YyvSfVjQeL0',
    demoLabel: 'YouTube 腿伸展',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Leg-press-2.gif',
  },
  {
    id: 'leg-curl',
    nameZh: '腿彎舉',
    nameEn: 'Leg Curl',
    aliases: [
      '腿彎舉', 'leg curl', '腿彎', '後腿機', '腘繩肌機', '趴腿彎', '坐姿腿彎', '腳彎',
      '後腿', '後髀', '腘繩', '腿後側', '腿後', 'hamstring curl', 'ham curl',
    ],
    muscle: '腿',
    cues: [
      '機位趴／坐穩，護墊喺腳踝上方。',
      '彎膝將腳跟拉向臀，感到後髀收緊；下放有控制。',
      '髖唔好借力抬起——固定軀幹先。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=1Tq3QdYUuHs',
    demoLabel: 'YouTube 腿彎舉',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Leg-press-2.gif',
  },
  {
    id: 'rdl',
    nameZh: '羅馬尼亞硬拉',
    nameEn: 'RDL',
    aliases: [
      'rdl', 'RDL', '羅馬', '羅馬尼亞', '直腿硬拉', '羅馬硬拉', '直腿', '臀腿', 'romanian deadlift',
      '羅馬利亞硬拉', '羅馬尼亞硬拉', '後腿硬拉', '後髀拉', '腘繩硬拉', '腿後側硬拉', '腿後硬拉',
      'romanian', 'straight leg deadlift', 'SLDL', 'sldl',
    ],
    muscle: '腿',
    cues: [
      '企直微屈膝（角度全程唔變），槓／啞鈴貼大腿，髖向後推——好似關車門用臀頂。',
      '背打直落到感到後髀（腿後側）拉緊就停；再用臀夾返企起，唔好圓背拗腰。',
      '同「硬拉／deadlift」分別：硬拉由地面拉起、膝會伸直多啲；RDL 膝幾乎唔再彎，專練後髀同臀。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=jEy_czbCRng',
    demoLabel: 'YouTube RDL 教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Man_Lifting_Barbell_Deadlift_GIF_Animation_Loop.gif',
  },
  {
    id: 'lunges',
    nameZh: '弓步蹲',
    nameEn: 'Lunges',
    aliases: [
      '弓步', 'lunge', '箭步蹲', '弓箭步', '分腿蹲', '前箭步', '弓步蹲', '行走弓步', 'walking lunge',
    ],
    muscle: '腿',
    cues: [
      '一步跨出，前後腳穩定；前膝大約喺腳踝上方，後膝輕落地。',
      '軀幹企直，踩前腳跟站起；左右交替或者行弓步都得。',
      '常見錯：前膝過度內扣、步距太短、前傾過多。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=QOVaHwm-Q6U',
    demoLabel: 'YouTube 弓步教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Lunge_%28exercise%29.gif',
  },
  {
    id: 'bulgarian-split',
    nameZh: '保加利亞分腿蹲',
    nameEn: 'Bulgarian Split Squat',
    aliases: [
      '保加利亞', 'bulgarian', '分腿蹲', '後腳抬高蹲', 'bss', 'bulgarian split squat', '單腿蹲凳',
      '保加', '保加利亞蹲', '後腳抬凳蹲', '單腿蹲', '後腿抬高', 'rear foot elevated', 'RFESS',
      '腿日分腿', '後腳凳',
    ],
    muscle: '腿',
    cues: [
      '後腳腳背／腳尖搁矮凳或臥推凳，前腳踩實向前約一大步，軀幹微前傾。',
      '前膝慢慢彎落（膝跟腳尖方向），後膝向下；身體重量主要喺前腳——好似單腳深蹲。',
      '唔識名？港 gym 常叫「保加利亞」／BSS。常見錯：前腳太近會跪到、太遠會拗腰；調到前小腿大致垂直。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=2C-uNgKwPLE',
    demoLabel: 'YouTube 保加利亞蹲',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Lunge_%28exercise%29.gif',
  },
  {
    id: 'curl',
    nameZh: '二頭彎舉',
    nameEn: 'Bicep Curl',
    aliases: [
      '二頭', '手臂', 'curl', '彎舉', '肱二頭', '二頭彎舉', '練手臂', '臂彎舉',
      '啞鈴彎舉', '槓鈴彎舉', '二頭肌', '手瓜', '練手瓜',
    ],
    muscle: '手臂',
    cues: [
      '手肘貼身側，掌心向上（或啞鈴中立），只郁前臂。',
      '彎起到肩前，頂峰稍停；下放有控制，唔好擺動借腰。',
      '常見錯：甩勢、手肘向前移——減重量先換節奏。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
    demoLabel: 'YouTube 二頭教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/PreacherBenchBicepsCurl.gif',
  },
  {
    id: 'hammer-curl',
    nameZh: '錘式彎舉',
    nameEn: 'Hammer Curl',
    aliases: ['錘式', 'hammer curl', '錘式彎舉', '中立彎舉', '錘彎', '繩索錘式'],
    muscle: '手臂',
    cues: [
      '啞鈴中立握（掌心相對），手肘貼身。',
      '彎起如錘擊動作，頂峰稍停；下放慢。',
      '多練肱肌同前臂——手瓜外形會飽滿啲。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=zC3nLlEvin4',
    demoLabel: 'YouTube 錘式彎舉',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/PreacherBenchBicepsCurl.gif',
  },
  {
    id: 'tricep',
    nameZh: '三頭下壓',
    nameEn: 'Tricep Pushdown',
    aliases: [
      '三頭', '手臂', 'pushdown', '繩索下壓', '肱三頭', '三頭下壓', '繩索三頭', '練三頭',
      '三頭肌', '下壓', 'cable pushdown',
    ],
    muscle: '手臂',
    cues: [
      '繩索／直槓高位，手肘貼腰側固定，只郁前臂下壓。',
      '下壓到手臂伸直，感受三頭收緊；上放有控制唔要彈。',
      '常見錯：手肘離開身體、借肩下壓——想像上臂釘死唔郁。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=2-LaAJqakPk',
    demoLabel: 'YouTube 三頭教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Reverse-triceps-bench-press-2.gif',
  },
  {
    id: 'skullcrusher',
    nameZh: '仰臥臂屈伸',
    nameEn: 'Skull Crusher',
    aliases: [
      '仰臥臂屈伸', 'skull crusher', '躺姿三頭', '槓鈴臂屈伸', '法式推舉', 'skullcrusher', '碎頭',
    ],
    muscle: '手臂',
    cues: [
      '仰躺，槓／啞鈴由胸口上方開始，手肘向上固定。',
      '彎肘將重量放到額前／頭後，再伸直；上臂盡量唔郁。',
      '肘容易痛就改繩索下壓或者減幅度。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=d_KDjDQHujU',
    demoLabel: 'YouTube 仰臥臂屈伸',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Reverse-triceps-bench-press-2.gif',
  },
  {
    id: 'overhead-tricep',
    nameZh: '過頭三頭伸展',
    nameEn: 'Overhead Tricep Extension',
    aliases: [
      '過頭三頭', 'overhead extension', '啞鈴過頭三頭', '頸後臂屈伸', '三頭過頭',
    ],
    muscle: '手臂',
    cues: [
      '坐或企，啞鈴／繩索過頭，手肘朝天。',
      '彎肘落到腦後，再伸直；夾實三頭長頭。',
      '手肘盡量唔向外大幅打開。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=YbX7Wd8jQ-I',
    demoLabel: 'YouTube 過頭三頭',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Reverse-triceps-bench-press-2.gif',
  },
  {
    id: 'lateral',
    nameZh: '側平舉',
    nameEn: 'Lateral Raise',
    aliases: [
      '側平舉', '肩', '側舉', '飛鳥肩', '側平', '飛鳥側', '肩飛鳥', 'side raise', 'lateral raise',
      '側飛', '練中束',
    ],
    muscle: '肩',
    cues: [
      '微屈肘，啞鈴由身側舉起至大約與肩平行（唔好高過耳）。',
      '想像倒水壺：微微傾啞鈴，主力用中束肩；下放慢。',
      '常見錯：聳肩、甩勢太重——呢個動作宜輕重量高質量。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
    demoLabel: 'YouTube 側平舉教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Dumbbell-lateral-raise-2-2.gif',
  },
  {
    id: 'front-raise',
    nameZh: '前平舉',
    nameEn: 'Front Raise',
    aliases: ['前平舉', 'front raise', '前舉', '前飛', '練前束'],
    muscle: '肩',
    cues: [
      '啞鈴或槓片由大腿前舉起至約肩高，微屈肘。',
      '控制下放；唔好借腰甩。',
      '肩推已經練好多前束——呢個可以少做。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=gzWoodFvk_8',
    demoLabel: 'YouTube 前平舉',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Dumbbell-lateral-raise-2-2.gif',
  },
  {
    id: 'rear-delt',
    nameZh: '反向飛鳥',
    nameEn: 'Rear Delt Fly',
    aliases: [
      '反向飛鳥', '後束', 'rear delt', '面拉', 'face pull 後束', '後飛鳥', '練後束', 'bent over fly',
    ],
    muscle: '肩',
    cues: [
      '俯身或機上，微屈肘向外打開，夾肩胛同後束。',
      '想像手肘向後上「插」；唔好聳肩。',
      '重量宜輕——後束細肌好易借斜方借力。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=EA_Yuox8sdg',
    demoLabel: 'YouTube 反向飛鳥',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Dumbbell-lateral-raise-2-2.gif',
  },
  {
    id: 'face-pull',
    nameZh: '面拉',
    nameEn: 'Face Pull',
    aliases: ['面拉', 'face pull', 'facepull', '繩索面拉', '拉面', '肩外旋'],
    muscle: '肩',
    cues: [
      '繩索約面高，繩端拉向面／額，手肘向外高開。',
      '頂峰外旋（拇指向後），夾後束同肩袖。',
      '肩健康神技——宜高次數輕重量。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=rep-aKoiwRk',
    demoLabel: 'YouTube 面拉教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/85/Weighted%2C_wide-grip_pullup_video.gif',
  },
  {
    id: 'fly',
    nameZh: '飛鳥',
    nameEn: 'Cable Fly',
    aliases: [
      '飛鳥', '胸', '夾胸', 'cable fly', '繩索飛鳥', '胸飛鳥', '飛鳥機', '夾胸機', 'pec deck',
      '蝴蝶機',
    ],
    muscle: '胸',
    cues: [
      '繩索／啞鈴飛鳥：微屈肘固定角度，胸肌主導夾向中間。',
      '打開時有控制感到胸口伸展，唔好過度後拉傷肩。',
      '常見錯：手肘角度一路變、重量太大變成推——輕啲先夾到胸。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=Iwe6AmxVf7o',
    demoLabel: 'YouTube 飛鳥教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Dumbbell-flyes-1-2.gif',
  },
  {
    id: 'pushup',
    nameZh: '掌上壓',
    nameEn: 'Push-up',
    aliases: [
      '掌上壓', 'pushup', 'push-up', '俯卧撑', '俯臥撑', '伏地挺身', '掌壓', '趴地推', '做掌',
    ],
    muscle: '胸',
    cues: [
      '掌約肩寬、指尖微朝外；身體頭到腳踝成一直線，核心同臀輕夾。',
      '下放胸口接近地再推起；肘約 45°，唔好聳肩甩勢。',
      '做唔到就膝着地或者斜掌（手撑檯／牆）打底——質量好過硬撐。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    demoLabel: 'YouTube 掌上壓',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Army_Pushups.gif',
  },
  {
    id: 'dip',
    nameZh: '雙槓臂屈伸',
    nameEn: 'Dip',
    aliases: ['雙槓', 'dip', '臂屈伸', '雙槓臂屈伸', '雙槓撐體', 'dip bar', '椅撑'],
    muscle: '胸',
    cues: [
      '雙槓撑起，肩下壓，微前傾偏胸、企直偏三頭。',
      '下放至上臂約平行，再推起；唔好過度沉肩。',
      '肩痛就減幅度或者用輔助機。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=2z8JmcrW-As',
    demoLabel: 'YouTube 雙槓教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Parallel_bar_dips.gif',
  },
  {
    id: 'hipthrust',
    nameZh: '臀推',
    nameEn: 'Hip Thrust',
    aliases: [
      '臀推', '臀', 'hip thrust', '橋式加重', '臀橋', '練臀', '髖推', '臀推機', 'hipthrust',
      '抬臀',
    ],
    muscle: '臀',
    cues: [
      '上背靠凳，槓／墊放髖前，腳踩地約與肩同寬。',
      '用臀把髖推到同膝肩成一直線，頂峰夾臀稍停；下放有控制。',
      '常見錯：用腰過度超伸、腳太遠／太近——頂峰應係臀出力唔係頂腰。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=LM8XHLYZBZI',
    demoLabel: 'YouTube 臀推教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Hip_thrust.gif',
  },
  {
    id: 'glute-bridge',
    nameZh: '臀橋',
    nameEn: 'Glute Bridge',
    aliases: ['臀橋', 'glute bridge', '橋式', '仰臥抬臀', '地板臀推'],
    muscle: '臀',
    cues: [
      '仰躺屈膝，腳踩地，手臂放側。',
      '夾臀抬髖到身體成斜線，頂峰停；下放慢。',
      '新手／熱身／冇凳做臀推時用呢個。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=OUgsJOTQVdI',
    demoLabel: 'YouTube 臀橋',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Hip_thrust.gif',
  },
  {
    id: 'calf',
    nameZh: '提踵',
    nameEn: 'Calf Raise',
    aliases: [
      '小腿', '提踵', 'calf', '練小腿', '站姿提踵', '踮腳', '小腿舉', 'calf raise',
    ],
    muscle: '腿',
    cues: [
      '腳掌前掌踩實，膝微直（站姿）或機上屈膝版都得。',
      '踮起至最高，頂峰稍停；慢慢落到腳跟有伸展感。',
      '動作幅度做足比堆重量更緊要；左右不平衡可以單腳做。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=-MHgs5tL1IM',
    demoLabel: 'YouTube 提踵教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Calf-raises-2.gif',
  },
  {
    id: 'plank',
    nameZh: '平板支撐',
    nameEn: 'Plank',
    aliases: [
      '平板', 'core', 'plank', '撐體', '平板撐', '棒式', 'core plank', '撐平板', '平板support',
    ],
    muscle: '核心',
    cues: [
      '肘或掌撐地，頭、肩、髖、腳踝成一直線——想像身下夾住支棍。',
      '核心同臀輕夾，正常呼吸；唔好塌腰、唔好抬臀太高。',
      '抖震或者塌腰就停——短時間高質量好過硬撐變形；新手可以由膝撑開始。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c',
    demoLabel: 'YouTube 平板教學',
  },
  {
    id: 'crunch',
    nameZh: '捲腹',
    nameEn: 'Crunch',
    aliases: [
      '捲腹', '腹', 'crunch', '仰臥起坐', '腹肌', '練腹', 'situp', 'sit-up', '仰臥起坐',
    ],
    muscle: '核心',
    cues: [
      '仰躺屈膝，下背貼地；用腹肌把肩胛骨捲離地，唔使坐直。',
      '頂峰呼氣收腹，下放慢；手可輕放耳側，唔好用力拉頸。',
      '常見錯：扯頭、借慣性——幅度細但收得實先有效。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=Xyd_fa5zoUA',
    demoLabel: 'YouTube 捲腹教學',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Crunch_%28exercise%29.gif',
  },
  {
    id: 'hanging-leg-raise',
    nameZh: '懸垂抬腿',
    nameEn: 'Hanging Leg Raise',
    aliases: [
      '懸垂抬腿', 'hanging leg raise', '吊單槓抬腿', '抬腿', '懸垂舉腿', 'leg raise', '單槓抬腿',
    ],
    muscle: '核心',
    cues: [
      '吊單槓，肩下沉穩定，核心收。',
      '屈髖將腿抬到至少平行（進階伸直腿）；下放有控制。',
      '甩勢好大就改成屈膝版本先。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=hdng3Nm1pK0',
    demoLabel: 'YouTube 懸垂抬腿',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Crunch_%28exercise%29.gif',
  },
  {
    id: 'cable-crunch',
    nameZh: '繩索捲腹',
    nameEn: 'Cable Crunch',
    aliases: ['繩索捲腹', 'cable crunch', '跪姿捲腹', '繩索腹', '下跪捲腹'],
    muscle: '核心',
    cues: [
      '跪地，繩索高位拉到頭側，屈身用腹捲下。',
      '想像肋骨搣向骨盆；臀部位置大致固定。',
      '唔好變成深蹲式坐低——郁嘅係腰腹彎曲。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=ToDeeUNW33I',
    demoLabel: 'YouTube 繩索捲腹',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Crunch_%28exercise%29.gif',
  },
  {
    id: 'shrug',
    nameZh: '聳肩',
    nameEn: 'Shrug',
    aliases: ['聳肩', 'shrug', '斜方', '練斜方', '啞鈴聳肩', '槓鈴聳肩'],
    muscle: '背',
    cues: [
      '啞鈴或槓垂於身側，手臂伸直。',
      '向上聳肩（耳朵方向），頂峰稍停；下放慢。',
      '唔好轉圈——直上直落更安全有效。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=cJRVVxuyo6U',
    demoLabel: 'YouTube 聳肩',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Barbell_Bent-over_Row.gif',
  },
  {
    id: 'farmer-carry',
    nameZh: '農夫行走',
    nameEn: "Farmer's Walk",
    aliases: ['農夫行走', 'farmer', "farmer's walk", 'farmer carry', '負重行走', '提壺走'],
    muscle: '核心',
    cues: [
      '雙手各提重物，肩下沉、核心收、企直。',
      '小步穩定向前走，呼吸自然。',
      '握力、核心、斜方一次過——好實用。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=Fkzk_R1GEyQ',
    demoLabel: 'YouTube 農夫行走',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Man_Lifting_Barbell_Deadlift_GIF_Animation_Loop.gif',
  },
  {
    id: 'goblet-squat',
    nameZh: '高腳杯深蹲',
    nameEn: 'Goblet Squat',
    aliases: ['高腳杯深蹲', 'goblet', 'goblet squat', '啞鈴深蹲', '杯蹲', '胸前啞鈴蹲'],
    muscle: '腿',
    cues: [
      '啞鈴或壺鈴抱喺胸前，肘向下，腳約肩寬。',
      '臀後坐蹲下，肘可喺膝內側輕推打開；踩地站起。',
      '新手學深蹲神器——教胸挺同蹲深。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=MeIiIdhvXT4',
    demoLabel: 'YouTube 高腳杯深蹲',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Squats.gif',
  },
  {
    id: 'kettlebell-swing',
    nameZh: '壺鈴擺盪',
    nameEn: 'Kettlebell Swing',
    aliases: ['壺鈴擺盪', 'swing', 'kettlebell swing', 'KB swing', '擺盪', '壺鈴甩'],
    muscle: '臀',
    cues: [
      '髖鉸鏈將壺鈴向後擺，再爆發伸髖向前甩到約胸高。',
      '动力嚟自臀同髖，唔係用手抬；到頂夾臀。',
      '腰圓或者用手硬抬就停——先練髖鉸鏈。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=sSESeQAvgIk',
    demoLabel: 'YouTube 壺鈴擺盪',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Man_Lifting_Barbell_Deadlift_GIF_Animation_Loop.gif',
  },
  {
    id: 'chest-press-machine',
    nameZh: '胸推機',
    nameEn: 'Chest Press Machine',
    aliases: ['胸推機', 'chest press', '器械胸推', '坐姿胸推', '器械推胸', '推胸機'],
    muscle: '胸',
    cues: [
      '坐穩背貼墊，握把約胸口高度。',
      '推出至手臂伸直但唔鎖死；收回有控制。',
      '適合新手學推胸軌跡——再過渡去自由重量。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=xUmU_mEp_bI',
    demoLabel: 'YouTube 胸推機',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/SmithMachineBenchPress.gif',
  },
  {
    id: 'lat-raise-machine',
    nameZh: '器械側平舉',
    nameEn: 'Machine Lateral Raise',
    aliases: ['器械側平舉', '側平舉機', '肩飛鳥機', '器械側舉'],
    muscle: '肩',
    cues: [
      '坐穩，手肘抵住護墊，向外抬至約肩高。',
      '頂峰稍停，慢放；唔好聳肩。',
      '軌跡固定，容易專注中束。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
    demoLabel: 'YouTube 側平舉（同理）',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Dumbbell-lateral-raise-2-2.gif',
  },
  {
    id: 'ab-wheel',
    nameZh: '健腹輪',
    nameEn: 'Ab Wheel Rollout',
    aliases: ['健腹輪', 'ab wheel', '滾輪', '腹輪', 'rollout', '腹肌輪'],
    muscle: '核心',
    cues: [
      '跪姿雙手握輪，由身體下方慢慢向前滾。',
      '核心死撑唔好塌腰，再拉返起身。',
      '好難——幅度唔夠就短距離先，腰痛即停。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=DARt0OXn4dE',
    demoLabel: 'YouTube 健腹輪',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Crunch_%28exercise%29.gif',
  },
  {
    id: 'good-morning',
    nameZh: '早安式',
    nameEn: 'Good Morning',
    aliases: ['早安式', 'good morning', '早安運動', '髖鉸鏈早安'],
    muscle: '背',
    cues: [
      '槓放背蹲位置，微屈膝，髖向後推至軀幹接近平行。',
      '背打直，再伸髖站起；重量要輕過硬拉好多。',
      '圓背好易傷——活動度唔夠就先做 RDL。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=YA-nLgUB6-w',
    demoLabel: 'YouTube 早安式',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Man_Lifting_Barbell_Deadlift_GIF_Animation_Loop.gif',
  },
  {
    id: 'hack-squat',
    nameZh: '哈克深蹲',
    nameEn: 'Hack Squat',
    aliases: ['哈克深蹲', 'hack squat', 'hack', '機上深蹲', '倒踏深蹲機'],
    muscle: '腿',
    cues: [
      '背貼墊，肩抵墊，腳踏板中下位置。',
      '下放至大腿約平行，再踩起；膝跟腳尖方向。',
      '腰離墊就減深度——機器軌跡已經幫你好多。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=0tn5K9NlCig',
    demoLabel: 'YouTube 哈克深蹲',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Squats.gif',
  },
  {
    id: 'cable-lateral',
    nameZh: '繩索側平舉',
    nameEn: 'Cable Lateral Raise',
    aliases: ['繩索側平舉', 'cable lateral', '繩索側舉', '交叉側平舉'],
    muscle: '肩',
    cues: [
      '繩索低位，對側手拉起至肩高，微屈肘。',
      '頂峰稍停，慢放；張力全程不斷。',
      '比起啞鈴底部都有阻力——中束感覺更明顯。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=PPrzRdsUoXg',
    demoLabel: 'YouTube 繩索側平舉',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Dumbbell-lateral-raise-2-2.gif',
  },
  {
    id: 'preacher-curl',
    nameZh: '牧師凳彎舉',
    nameEn: 'Preacher Curl',
    aliases: ['牧師凳', 'preacher curl', '傾斜彎舉', '牧師彎舉', '二頭凳'],
    muscle: '手臂',
    cues: [
      '上臂貼實牧師凳墊，腋下卡住。',
      '彎舉到頂，下放至手臂接近伸直但唔鬆韌帶。',
      '隔離二頭好用——甩唔到勢。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=fIWP-RF39g4',
    demoLabel: 'YouTube 牧師凳彎舉',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/PreacherBenchBicepsCurl.gif',
  },
  {
    id: 'wrist-curl',
    nameZh: '腕彎舉',
    nameEn: 'Wrist Curl',
    aliases: ['腕彎舉', 'wrist curl', '前臂', '練前臂', '手腕彎舉'],
    muscle: '手臂',
    cues: [
      '前臂搁凳上，手腕伸出，握槓／啞鈴。',
      '只郁手腕向上彎；下放伸展。',
      '握力同前臂細節——重量輕次數多。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=nv5StKlAqOk',
    demoLabel: 'YouTube 腕彎舉',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/PreacherBenchBicepsCurl.gif',
  },
  {
    id: 'pec-deck',
    nameZh: '蝴蝶機夾胸',
    nameEn: 'Pec Deck',
    aliases: ['蝴蝶機', '夾胸機', 'pec deck', 'chest fly machine', '飛鳥機'],
    muscle: '胸',
    cues: [
      '座位調到手肘同肩大致同一高度，背貼墊。',
      '手臂呈微彎，夾到中間稍停，慢放。',
      '唔好甩勢撞機；胸口發力感覺先啱。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=eGjt6KJ7JOY',
    demoLabel: 'YouTube 蝴蝶機夾胸',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Dumbbell-flyes-1-2.gif',
  },
  {
    id: 'hip-abduction',
    nameZh: '髖外展機',
    nameEn: 'Hip Abduction Machine',
    aliases: ['外展機', '開髖機', 'hip abduction', '側臀機', '練側臀'],
    muscle: '臀腿',
    cues: [
      '背貼墊，墊板頂住大腿外側。',
      '向外打開到舒服幅度，慢夾返。',
      '港 gym 常見；唔好借腰借力。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=68xc1QeJ8LE',
    demoLabel: 'YouTube 髖外展',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Hip_thrust.gif',
  },
  {
    id: 'hip-adduction',
    nameZh: '髖內收機',
    nameEn: 'Hip Adduction Machine',
    aliases: ['內收機', '夾腿機', 'hip adduction', '夾大腿'],
    muscle: '臀腿',
    cues: [
      '墊板頂住大腿內側，背貼好。',
      '夾向中間，控制下放。',
      '重量適中；內側大腿發力。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=jQjZqu4QkZQ',
    demoLabel: 'YouTube 髖內收',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Hip_thrust.gif',
  },
  {
    id: 'seated-calf',
    nameZh: '坐姿提踵',
    nameEn: 'Seated Calf Raise',
    aliases: ['坐姿小腿', '坐姿提踵', 'seated calf', '小腿機坐'],
    muscle: '小腿',
    cues: [
      '大腿墊壓住，腳掌踩板上，腳跟伸出。',
      '踮起到頂稍停，下放拉長比目魚肌。',
      '同企姿提踵互補——練比目魚。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=JbyjNymZOt0',
    demoLabel: 'YouTube 坐姿提踵',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Calf-raises-2.gif',
  },
  {
    id: 't-bar-row',
    nameZh: 'T槓划船',
    nameEn: 'T-Bar Row',
    aliases: ['T槓划船', 'T-bar', 'tbar row', '地雷划船', 'landmine row'],
    muscle: '背',
    cues: [
      '髖鉸鏈，背平，胸口略挺。',
      '拉到腹／下胸，夾肩胛，慢放。',
      '唔好借甩腰；港 gym 有時用地雷杆＋ V 柄。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=j3Igk5nyZE4',
    demoLabel: 'YouTube T槓划船',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Barbell_Bent-over_Row.gif',
  },
  {
    id: 'cable-fly',
    nameZh: '繩索夾胸',
    nameEn: 'Cable Fly',
    aliases: ['繩索飛鳥', 'cable fly', 'cable crossover', '交叉夾胸', '飛鳥繩'],
    muscle: '胸',
    cues: [
      '雙側滑輪約胸高或略高，微向前踏。',
      '手肘微彎夾到胸前，像抱大樹。',
      '下放有控制；腰唔好過度前傾。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=Iwe6VTZqjKM',
    demoLabel: 'YouTube 繩索夾胸',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Dumbbell-flyes-1-2.gif',
  },
  {
    id: 'box-squat',
    nameZh: '箱蹲',
    nameEn: 'Box Squat',
    aliases: ['箱蹲', 'box squat', '坐箱深蹲', '凳蹲'],
    muscle: '臀腿',
    cues: [
      '箱高約平行或略高，腳略闊。',
      '坐到箱上稍停再站起——學髖鉸同深度。',
      '唔好「彈起」；控制落箱。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=0bWRPCYs-0o',
    demoLabel: 'YouTube 箱蹲',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Squats.gif',
  },
  {
    id: 'reverse-lunge',
    nameZh: '後箭步蹲',
    nameEn: 'Reverse Lunge',
    aliases: ['後箭步', '後退弓箭步', 'reverse lunge', '向後弓步'],
    muscle: '臀腿',
    cues: [
      '一腳向後踏，前後膝約 90°，前腳跟出力站返。',
      '軀幹企直，前膝唔好過度內扣。',
      '比前箭步易控膝蓋——新手友好。',
    ],
    demoUrl: 'https://www.youtube.com/watch?v=gr5bFVDqi_I',
    demoLabel: 'YouTube 後箭步蹲',
    demoGifUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Lunge_%28exercise%29.gif',
  },
]

export function exerciseById(id: string) {
  return EXERCISES.find((e) => e.id === id)
}

/** Quick chips for Threads / HK slang newbies — picker + idle train card. */
export const NEWBIE_SEARCH_CHIPS = [
  'RDL',
  '硬拉',
  '保加利亞',
  '後腿',
  '深蹲',
  '臀推',
  '弓步',
  '腿推',
] as const

/** Synonyms people type that should expand before matching. */
const QUERY_SYNONYMS: Record<string, string[]> = {
  死拉: ['硬拉', 'deadlift'],
  地拉: ['硬拉', 'deadlift'],
  羅馬: ['rdl', '羅馬尼亞硬拉'],
  直腿拉: ['rdl', '直腿硬拉'],
  後腿: ['腿彎舉', '後腿機', 'rdl'],
  後髀: ['腿彎舉', 'rdl', '腘繩'],
  保加: ['保加利亞', 'bulgarian'],
  bss: ['bulgarian', '保加利亞'],
  legday: ['腿', '深蹲'],
  'leg day': ['腿', '深蹲'],
  腿日: ['腿', '深蹲', 'rdl'],
}

function normalizeQuery(q: string) {
  return q
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/卧/g, '臥')
    .replace(/杠/g, '槓')
    .replace(/铃/g, '鈴')
}

function expandQueryTokens(q: string): string[] {
  const raw = q.trim()
  const base = normalizeQuery(raw)
  if (!base) return []
  const tokens = new Set<string>([base])
  // also keep spaced lower form for synonym table keys
  const spaced = raw.trim().toLowerCase()
  for (const [key, extras] of Object.entries(QUERY_SYNONYMS)) {
    const nk = normalizeQuery(key)
    if (base === nk || base.includes(nk) || spaced === key.toLowerCase()) {
      extras.forEach((e) => tokens.add(normalizeQuery(e)))
    }
  }
  return [...tokens]
}

function exerciseHaystack(e: ExerciseGuide) {
  return normalizeQuery([e.id, e.nameZh, e.nameEn, e.muscle, ...e.aliases].join(' '))
}

export function searchExercises(q: string) {
  const tokens = expandQueryTokens(q)
  if (!tokens.length) return EXERCISES

  const scored = EXERCISES.map((e) => {
    const hay = exerciseHaystack(e)
    let score = 0
    for (const t of tokens) {
      if (!t) continue
      if (normalizeQuery(e.id) === t) score += 100
      if (normalizeQuery(e.nameZh) === t || normalizeQuery(e.nameEn) === t) score += 80
      if (e.aliases.some((a) => normalizeQuery(a) === t)) score += 70
      if (hay.includes(t)) score += 20
      // alias contains query (e.g. user typed 保加 → 保加利亞)
      if (e.aliases.some((a) => normalizeQuery(a).includes(t))) score += 15
    }
    return { e, score }
  }).filter((x) => x.score > 0)

  scored.sort((a, b) => b.score - a.score || a.e.nameZh.localeCompare(b.e.nameZh, 'zh-HK'))
  return scored.map((x) => x.e)
}

/** Which alias / name matched the query — show under picker rows. */
export function matchedAliasLabel(exercise: ExerciseGuide, q: string): string | null {
  const tokens = expandQueryTokens(q)
  if (!tokens.length) return null
  for (const t of tokens) {
    for (const a of exercise.aliases) {
      const na = normalizeQuery(a)
      if (na === t || na.includes(t) || t.includes(na)) {
        if (a !== exercise.nameZh && normalizeQuery(a) !== normalizeQuery(exercise.nameEn)) {
          return a
        }
      }
    }
    if (normalizeQuery(exercise.nameEn).includes(t) || t.includes(normalizeQuery(exercise.nameEn))) {
      return exercise.nameEn
    }
  }
  return null
}

/** Resolve guide by id or fuzzy name; null → use generic cues in UI. */
export function resolveExerciseGuide(idOrName?: string | null) {
  if (!idOrName) return null
  const byId = exerciseById(idOrName)
  if (byId) return byId
  const hits = searchExercises(idOrName)
  if (hits.length === 1) return hits[0]
  const s = idOrName.trim().toLowerCase()
  return (
    EXERCISES.find(
      (e) =>
        e.nameZh === idOrName ||
        e.nameZh.includes(idOrName) ||
        e.nameEn.toLowerCase() === s ||
        e.aliases.some((a) => a.toLowerCase() === s || normalizeQuery(a) === normalizeQuery(idOrName))
    ) || hits[0] || null
  )
}
