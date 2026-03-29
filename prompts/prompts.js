/* Scholar Assistant - Prompts Window (prompts.js) */
/* 프롬프트 추가용 자료  */ 
const STORAGE_KEYS = {
  savedPrompts: 'savedPrompts',
  promptFolders: 'promptFolders',
  promptInput: 'promptInput',
  deletedPrompts: 'deletedPrompts',
  deletedFolders: 'deletedFolders'
};

const FOLDER_COLORS = ['blue', 'red', 'yellow', 'green', 'purple', 'orange', 'cyan', 'pink', 'brown', 'gray', 'teal', 'indigo'];

const COLOR_MAP = { blue:'#3b82f6', red:'#ef4444', yellow:'#f59e0b', green:'#10b981', purple:'#8b5cf6', orange:'#f97316', cyan:'#06b6d4', pink:'#ec4899', brown:'#78350f', gray:'#6b7280', teal:'#14b8a6', indigo:'#6366f1' };

const DEFAULT_FOLDERS = [
  { id: 'all', name: 'All Prompts', color: 'blue' },
  { id: 'f-slide-tools', name: 'SLIDE TOOLS', color: 'blue' },
  { id: 'f-scholar-explore', name: 'SCHOLAR EXPLORE', color: 'purple' }
];

const DEFAULT_PROMPTS = [
  {
    id: 'default-slide-step1',
    title: 'STEP 01 Knowledge Map',
    folderId: 'f-slide-tools',
    tags: 'slide tools, step1',
    isFavorite: false,
    ts: '2026-03-22T00:00:00.000Z',
    content: `[프롬프트: 고해상도 구조 스캔]\n* 목표: 업로드된 문서의 모든 섹션, 소제목, 도표, 각주를 누락 없이 스캔하라. 45 page설계 3 part로 구성 \n\n수행 작업:\n1. 문서의 논리적 흐름에 따라 전체 내용을 3개의 파트로 나누고, 각 파트당 15개의 슬라이드 주제(총 45개)를 추출하라. \n2. 각 주제는 문서 내의 구체적인 개념, 실험 데이터, 또는 핵심 모델명(예: SEEV, SSTS, PCP 등)을 기반으로 설정하라. \n3. 단순히 목차를 베끼지 말고, 본문의 핵심 키워드를 3개 이상 포함하여 '세밀 목차'를 생성하라.\nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`
  },
  {
    id: 'default-slide-step2',
    title: 'STEP 02 재귀적 상세 추출',
    folderId: 'f-slide-tools',
    tags: 'slide tools, step2',
    isFavorite: false,
    ts: '2026-03-22T00:00:01.000Z',
    content: `- 대상: 슬라이드 1~15번 주제.\n- 지시 사항:\n  1. 해당 구간의 내용을 설명할 때, 본문에 등장하는 모든  고유 명사(학자 이름, 모델명) 와  통계 수치(백분율, 시간 등) 를 하나도 빠짐없이 포함하라. 
    2. (매우 중요) "더 이상 설명할 것이 없다"고 판단될 때까지 본문의 예시와 설명을 최대한 길게 서술하라. 
    3. 각 슬라이드에 들어갈 시각적 요소(그래프의 x-y축 내용, 도표의 항목)를 본문의 텍스트를 근거로 복원하여 설명하라. \n- 출력 원칙: 각 문장 뒤에 해당 정보가 있는 소스 번호를 반드시 기재하라. \nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`
  },
  {
    id: 'default-slide-step3',
    title: 'STEP 03 디자인 일관성',
    folderId: 'f-slide-tools',
    tags: 'slide tools, step3',
    isFavorite: false,
    ts: '2026-03-22T00:00:02.000Z',
    content: `입력 데이터: 2단계에서 추출된 고밀도 텍스트를 이용한 슬라이드 생성 

디자인 가이드:
* Style: 2DFlat(Default) 
* Rule: 모든 내용을 "명사형/단문"으로 변환하되, 핵심 전문 용어는 절대 생략하지 말 것.연구자(연도) 인용정보 포함할 것, 내용을 가능한 요약보다는 설명을 우선(학습 탐구우선)    
* Consistency: 앞선 슬라이드와의 비주얼 톤앤매너를 유지하라. 

최종 확인: 15페이지가 모두 생성되었는지 확인하고, 누락 시 추가 생성을 요청하라.

Crucial Rules:
1. 제공된 데이터를 바탕으로 *반드시 지정된 15페이지를 모두 상세 생성*하라.
2. 텍스트 형식: "학술적표현 종결: ~이다, ~임 등" 사용하여 PPT 가독성을 높여라.
3. 시각적 가이드: 본문을 설명하는 도표,이미지만 생성, 각 슬라이드에 어울리는 3D 아이콘(예: 손전등 비유 [Fig. 16], 눈동자 움직임 [fig. 45])을 제안하라. 시각적으로 실제적이어야만 하는경우이거나 필요한 것만 3D생성하라
4. 근거 표기: 각 슬라이드 하단에 정보의 근거가 된 번호 혹은 인용정보( 연구자(연도))를 반드시 포함하라.`
  },
  {
    id: 'default-explore-step1',
    title: 'STEP 1: 지식의 지도',
    folderId: 'f-scholar-explore',
    tags: 'scholar explore, step1',
    isFavorite: false,
    ts: '2026-03-22T00:00:03.000Z',
    content: `STEP 1: 지식의 지도 그리기 (Preview)\n"이 책(또는 챕터)의 전체 내용을 논리적인 흐름에 따라 섹션벼로 핵심을 요약해줘. 특히 내가 이 단원을 공부하면서 반드시 기억해야 할  '가장 중요한 전문 용어' 를 뽑아내고, 각 용어가 어느 페이지(Source)에서 중요하게 다루어지는 제시하고, 그 용어의 학술적인용정보 , 연구자(연도)를 포함해줘. 전체 Flow Chart를 만들면서 단원별 연결관계 및 이해해야할 구조를 도식화해줘.Mind Map개념으로 제시해줘.  학술적 문체(~이다)로 전문적 어조 사용할 것."  \nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`
  },
  {
    id: 'default-explore-step2',
    title: 'STEP 2: 핵심개념 딥다이빙',
    folderId: 'f-scholar-explore',
    tags: 'scholar explore, step2',
    isFavorite: false,
    ts: '2026-03-22T00:00:04.000Z',
    content: `STEP 2: 핵심 개념 딥다이바이빙 (Concept Mastery)\n"이 교재에서 가장 핵심이 되는 '이론'들과 제시되는 '모델'들(예: SEEV, SSTS, PCP 등)을 모두 선정해서 설명해줘(인용정보, 연구자(연도)는 포함해줘). 단순히 정의만 말하지 말고, 1) 왜 이 이론이 만들어졌는지, 2) 이 이론을 구성하는 세부 요소들은 무엇인지, 3) 각 요소가 서로 어떻게 상호작용하는지를 아주 쉽게 비유를 들어서 설명해줘.   학술적 문체(~이다)로 전문적 어조 사용할 것\n(1) 이론간 연결관계(SOUCE의 모든 이론들 소개 연결) \n(2) 모델간 연결과계(SOUCE의 모든 이론들 소개 연결)\n(3) 이론과 모델의 연결관게를 (MIND MAP과 같은 관계 )\nFlow Chart로 구성해줘." \nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`
  },
  {
    id: 'default-explore-step2-2',
    title: 'STEP 2.2: DETAIL ORDER',
    folderId: 'f-scholar-explore',
    tags: 'scholar explore, step2_2',
    isFavorite: false,
    ts: '2026-03-22T00:00:05.000Z',
    content: ` "STEP2.2. 이론과 모델에 대한 DETAIL ORDER\n이 교재에서 가장 핵심이 되는 '이론'들과 제시되는 '모델'들(예: SEEV, SSTS, PCP 등)을 모두 선정해서 상세하게 Flow Chart로 구성해줘.  학술적 문체(~이다)로 전문적 어조 사용할 것\n\n(1) 이론간 연결관계(SOUCE의 모든 이론들 소개 연결)\n : 상세 설명과 예시 설명  \n \n(2) 모델간 연결과계(SOUCE의 모든 이론들 소개 연결)\n : 상세 설명과 예시 설명\n(3) 이론과 모델의 연결관게를 (MIND MAP과 같은 관계 )\n: 상세 설명과 예시 설명\n\n\n예시) 이론간 연결관계 \n(1) 이론 간 연결 관계 (Theories ➔ Theories)\n주의가 작동하는 기반(공간 vs 객체)에서 시작하여, 최종 디스플레이 설계 지침으로 진화하는 과정입니다.\n[공간 기반 주의 이론 (Space-based Attention)]\n(주의는 손전등처럼 특정 '시야각 공간'을 비춘다는 초기 이론) [16]\n       │\n       ▼ (한계 극복: 같은 공간이라도 분리된 물체는 다르게 처리됨)\n       │\n[객체 파일 이론 (Object File Theory)]\n(주의는 공간이 아니라 '객체 단위'로 할당되며, 동일 객체 내 정보는 \n 병렬 처리되어 정보 통합 속도를 극대화한다는 이론) [17]\n       │\n       ▼ (설계 원칙으로 승화)\n       │\n[근접성 호환성 원리 (PCP)]\n(객체 파일 이론의 병렬 처리 이점을 활용하여, 정보 통합이 필요한 \n 작업은 반드시 디스플레이 상의 정보들을 하나의 '객체'나 가까운 \n '공간'으로 묶어주어야 한다는 궁극의 호환성 대원칙) [19]\n\n예시) 모델간 연결관계 \n\n======================================================================\n\n[ 1단계: 환경 주시 (어디를 볼 것인가?) ]\n\n======================================================================\n     【 SEEV 모델 】 ─────────────▶ (정상 상태의 시선 분배 / 주의의 이동)\n           │\n           │ (시선 밖의 위협 출현 시)\n           ▼\n     【 N-SEEV 모델 】 ───────────▶ (왜 변화 맹시가 일어나는가? \n                                     이심률/흑조현상 등으로 인한 감지 지연 예측)"
    Strict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`  
  },
  {
    id: 'default-explore-step3',
    title: 'STEP 3: 현실 세계 적용',
    folderId: 'f-scholar-explore',
    tags: 'scholar explore, step3',
    isFavorite: false,
    ts: '2026-03-22T00:00:06.000Z',
    content: `STEP 3: 현실 세계 적용 (Real-world Case Study)\n"이 책에서 이론을 설명하기 위해 사용한 실제 사례들(예: 운전 중 주의 분산, 고릴라 실험, 항공기 계기판 디자인 등)을 체계적으로 이론적용과 연결해서 정리해줘. 그리고 이 이론이  우리 일상생활(스마트폰 사용, 공부할 때의 집중력 등) 에서 어떻게 나타날 수 있는지 새로운 사례를 들어서 내가 이해한 게 맞는지 확인해줘. 또한 사례에 연구인용정보 연구자(연도)를 제시해주고 마지막에는 APA양식으로 제시해줘(만약에 중요한 연결사이트가 있으면 URL도 제시해줘.존재하지 않는 링크는 제시하지마, 무조건 제시하지말고 없으면 제시하지마) , 학술적 문체(~이다)로 전문적 어조 사용할 것." \nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`
  },
  {
    id: 'default-explore-step4',
    title: 'STEP 4: 데이터 해석',
    folderId: 'f-scholar-explore',
    tags: 'scholar explore, step4',
    isFavorite: false,
    ts: '2026-03-22T00:00:07.000Z',
    content: `STEP 4: 데이터 및 시각 자료 해석 (Data & Visual Literacy)\n"이 단원에 나오는 주요 도표나 그래프(예: Figure 3.1, 3.2 등)를 찾아서 순서대로 설명해줘. 도표에서 설명하고자 하는 프로세스와 목적이 무엇인지 설명해줘(도표의 의미와 플로우차트, X축과 Y축은 무엇을 의미하는지, 그래프의 곡선이 나타내는 인지심리학적 법칙은 무엇인지). 무엇보다 중요한 것은 그래프와 도표의 해석과 시사점을 제시해줘.  학술적 문체(~이다)로 전문적 어조 사용할 것\n 데이터 수치를 인용해서 상세히 설명하면서 이에대한 이론 근거, 인용정보(연구자, 연도) 정보를 빠지지 않게 해줘 .도표와 그림, 표에서 제시되는 내용에 대한  전체의 flow chart는 텍스트로 제시해줘"\nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`
  },
  {
    id: 'default-explore-step5',
    title: 'STEP 5: 셀프 테스트',
    folderId: 'f-scholar-explore',
    tags: 'scholar explore, step5',
    isFavorite: false,
    ts: '2026-03-22T00:00:08.000Z',
    content: `STEP 5: 셀프 테스트 및 피드백 (Self-Check)\n"지금까지 공부한 내용을 바탕으로 내가 제대로 이해했는지 확인하기 위한  '사고력 중심의 퀴즈 문제(이론, 모델, 도표, 그림, 표 등과 중요한 사례에 대한 것, 개념이해에 대한 것)' 를 내줘. 중요한 것은 전체를 overview를 할수 있게 해주는 문제여야 해. 단순 암기 문제가 아니라 실제 상황에 이론을 적용하여 내용을 습득할 수있도록 물어봐야해. 정답과 관련한 내용을 하단에 별도로 제시해줘. 내용정보, 인용정보, 내용근거를 제시해주면서 전체의 flow chart는 텍스트로 제시해줘 학술적 문체(~이다)로 전문적 어조 사용할 것\nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`
  },
{  id: 'default-explore-step6',
    title: 'SPEC: 주석처리 규칙',
    folderId: 'f-scholar-explore',
    tags: 'scholar explore, step5',
    isFavorite: false,
    ts: '2026-03-22T00:00:08.000Z',
    content: `[Strict Citation Rule: Source to Footnote]
1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것.
2. 주석 생성: 답변 최하단에 [^n]: [Source N] "원문 텍스트" 형식의 리스트를 반드시 포함할 것.
3. 학술적 태깅: 'Source: Source N' 텍스트는 삭제하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것.
`
  }
  
];

function ensureDefaultPromptSeed(currentFolders = [], currentPrompts = []) {
  const nextFolders = [...currentFolders];
  for (const folder of DEFAULT_FOLDERS) {
    const existingFolderIndex = nextFolders.findIndex((item) => item?.id === folder.id);
    if (existingFolderIndex >= 0) {
      nextFolders[existingFolderIndex] = { ...nextFolders[existingFolderIndex], ...folder };
    } else {
      nextFolders.push({ ...folder });
    }
  }

  const nextPrompts = [...currentPrompts];
  for (const prompt of DEFAULT_PROMPTS) {
    const existingPromptIndex = nextPrompts.findIndex((item) => item?.id === prompt.id);
    if (existingPromptIndex >= 0) {
      nextPrompts[existingPromptIndex] = {
        ...nextPrompts[existingPromptIndex],
        ...prompt,
        isFavorite: !!nextPrompts[existingPromptIndex].isFavorite
      };
    } else {
      nextPrompts.push({ ...prompt });
    }
  }

  return { folders: nextFolders, prompts: nextPrompts };
}

let folders = [];
let savedPrompts = [];
let deletedPrompts = [];
let deletedFolders = [];
let activeFolderId = 'all';
let selectedNewFolderColor = 'blue';
let searchQuery = '';
let showFavoritesOnly = false;
let editingFolderId = null;
let editingPromptId = null;
let currentViewingPromptContent = '';
const NPP_EXPORT_VERSION = 1;

function getStorage() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local ? chrome.storage.local : null;
}

async function loadData() {
  const storage = getStorage();
  if (!storage) return;
  try {
    const data = await storage.get([STORAGE_KEYS.savedPrompts, STORAGE_KEYS.promptFolders, STORAGE_KEYS.deletedPrompts, STORAGE_KEYS.deletedFolders]);
    folders = Array.isArray(data[STORAGE_KEYS.promptFolders]) && data[STORAGE_KEYS.promptFolders].length > 0
      ? data[STORAGE_KEYS.promptFolders]
      : [...DEFAULT_FOLDERS];
    savedPrompts = Array.isArray(data[STORAGE_KEYS.savedPrompts]) ? data[STORAGE_KEYS.savedPrompts] : [];
    savedPrompts = savedPrompts.map(p => ({
      ...p,
      folderId: p.folderId || 'all',
      tags: p.tags || '',
      isFavorite: p.isFavorite || false
    }));
    const seeded = ensureDefaultPromptSeed(folders, savedPrompts);
    folders = seeded.folders;
    savedPrompts = seeded.prompts;
    deletedPrompts = Array.isArray(data[STORAGE_KEYS.deletedPrompts]) ? data[STORAGE_KEYS.deletedPrompts] : [];
    deletedFolders = Array.isArray(data[STORAGE_KEYS.deletedFolders]) ? data[STORAGE_KEYS.deletedFolders] : [];
    await storage.set({
      [STORAGE_KEYS.savedPrompts]: savedPrompts,
      [STORAGE_KEYS.promptFolders]: folders
    });
  } catch (e) {
    console.warn('loadData:', e);
    const seeded = ensureDefaultPromptSeed([...DEFAULT_FOLDERS], []);
    folders = seeded.folders;
    savedPrompts = seeded.prompts;
    deletedPrompts = [];
    deletedFolders = [];
  }
}

async function saveData() {
  const storage = getStorage();
  if (!storage) return;
  await storage.set({
    [STORAGE_KEYS.savedPrompts]: savedPrompts,
    [STORAGE_KEYS.promptFolders]: folders,
    [STORAGE_KEYS.deletedPrompts]: deletedPrompts,
    [STORAGE_KEYS.deletedFolders]: deletedFolders
  });
}

function buildNppPayload() {
  return {
    format: 'scholar-notebook-prompts',
    version: NPP_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      folders,
      savedPrompts,
      deletedPrompts,
      deletedFolders
    }
  };
}

function downloadTextFile(filename, text, type = 'application/json;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function mergeFolderList(importedFolders = []) {
  const list = Array.isArray(importedFolders) ? importedFolders : [];
  return list.some((folder) => folder?.id === 'all')
    ? list
    : [{ id: 'all', name: 'All Prompts', color: 'blue' }, ...list];
}

async function exportPromptsToNpp() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  downloadTextFile(`scholar-prompts-${stamp}.npp`, JSON.stringify(buildNppPayload(), null, 2));
  showMessage('.npp file exported successfully.');
}

async function importPromptsFromNpp(file) {
  if (!file) return;
  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const imported = parsed?.data || parsed;

    folders = mergeFolderList(imported?.folders || []);
    savedPrompts = Array.isArray(imported?.savedPrompts) ? imported.savedPrompts : [];
    savedPrompts = savedPrompts.map((p) => ({
      ...p,
      folderId: p.folderId || 'all',
      tags: p.tags || '',
      isFavorite: !!p.isFavorite
    }));
    deletedPrompts = Array.isArray(imported?.deletedPrompts) ? imported.deletedPrompts : [];
    deletedFolders = Array.isArray(imported?.deletedFolders) ? imported.deletedFolders : [];

    if (!folders.some((folder) => folder.id === activeFolderId)) {
      activeFolderId = 'all';
    }

    await saveData();
    refreshUI();
    showMessage('.npp file imported successfully.');
  } catch (e) {
    console.warn('importPromptsFromNpp:', e);
    showMessage('Failed to import the .npp file.');
  }
}

function showMessage(text) {
  const box = document.getElementById('message-box');
  const msgText = document.getElementById('message-text');
  if (!box || !msgText) return;
  msgText.textContent = text;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 2500);
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

function renderFolderList() {
  const list = document.getElementById('folder-list');
  if (!list) return;
  const trashCount = deletedPrompts.length + deletedFolders.length;
  const folderItems = folders.map(f => {
    const bg = COLOR_MAP[f.color] || COLOR_MAP.blue;
    const active = activeFolderId === f.id ? ' active' : '';
    const isAll = f.id === 'all';
    const actionsHtml = isAll ? '' : `
      <div class="folder-actions-wrap">
        <button class="btn-folder-more" data-id="${f.id}" title="더보기">⋮</button>
        <div class="folder-dropdown" data-for="${f.id}">
          <button class="btn-edit-folder" data-id="${f.id}">편집</button>
          <button class="btn-del-folder del" data-id="${f.id}">지우기</button>
        </div>
      </div>`;
    return `<div class="folder-item">
      <button data-folder-id="${f.id}" class="folder-btn${active}">
        <span class="folder-dot" style="background:${bg}"></span>
        <span class="folder-name">${escapeHtml(f.name)}</span>
        <span class="folder-count">${getPromptCountForFolder(f.id)}</span>
      </button>
      ${actionsHtml}
    </div>`;
  });
  const trashActive = activeFolderId === 'trash' ? ' active' : '';
  folderItems.push(`<div class="folder-item">
    <button data-folder-id="trash" class="folder-btn${trashActive}">
      <span class="folder-dot" style="background:#6b7280"></span>
      <span class="folder-name">휴지통</span>
      <span class="folder-count">${trashCount}</span>
    </button>
  </div>`);
  list.innerHTML = folderItems.join('');
  list.querySelectorAll('.folder-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.folder-actions-wrap')) return;
      activeFolderId = btn.getAttribute('data-folder-id');
      refreshUI();
    });
  });
  list.querySelectorAll('.btn-folder-more').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      document.querySelectorAll('.folder-dropdown.show').forEach(m => m.classList.remove('show'));
      const menu = list.querySelector(`.folder-dropdown[data-for="${id}"]`);
      if (menu) menu.classList.toggle('show');
    });
  });
  list.querySelectorAll('.btn-edit-folder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.folder-dropdown.show').forEach(m => m.classList.remove('show'));
      openEditFolderModal(btn.getAttribute('data-id'));
    });
  });
  list.querySelectorAll('.btn-del-folder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.folder-dropdown.show').forEach(m => m.classList.remove('show'));
      deleteFolder(btn.getAttribute('data-id'));
    });
  });
}

function getPromptCountForFolder(id) {
  if (id === 'all') return savedPrompts.length;
  return savedPrompts.filter(p => p.folderId === id).length;
}

function renderPromptsGrid() {
  const grid = document.getElementById('prompts-grid');
  if (!grid) return;

  if (activeFolderId === 'trash') {
    if (deletedPrompts.length === 0 && deletedFolders.length === 0) {
      grid.innerHTML = '<div style="padding:80px 0;text-align:center;color:#6b7280;font-size:14px;">휴지통이 비어 있습니다.</div>';
      return;
    }
    const folderCards = deletedFolders.map(f => {
      const bg = COLOR_MAP[f.color] || COLOR_MAP.blue;
      const dateStr = f.deletedAt ? new Date(f.deletedAt).toLocaleString('ko-KR') : '';
      return `<div class="prompt-card" style="border-left:4px solid ${bg}">
        <div class="card-header">
          <div style="flex:1">
            <h4 style="font-size:13px;color:#94a3b8;margin:0 0 4px 0">폴더</h4>
            <p class="preview" style="margin:0">${escapeHtml(f.name)}</p>
            <p style="font-size:10px;color:#64748b;margin:4px 0 0 0">${dateStr}</p>
          </div>
          <button class="btn btn-secondary btn-restore-folder" data-id="${f.id}" style="padding:6px 12px;font-size:12px">복구</button>
        </div>
      </div>`;
    }).join('');
    const promptCards = deletedPrompts.map(p => {
      const contentEsc = escapeHtml((p.content || '').slice(0, 80));
      const dateStr = p.deletedAt ? new Date(p.deletedAt).toLocaleString('ko-KR') : '';
      return `<div class="prompt-card">
        <div class="card-header">
          <div style="flex:1">
            <h4 style="font-size:13px;color:#94a3b8;margin:0 0 4px 0">프롬프트</h4>
            <p class="preview" style="margin:0">${escapeHtml(p.title || '')}</p>
            <p style="font-size:11px;color:#64748b;margin:4px 0 0 0">${contentEsc}${(p.content || '').length > 80 ? '...' : ''}</p>
            <p style="font-size:10px;color:#64748b;margin:4px 0 0 0">${dateStr}</p>
          </div>
          <button class="btn btn-secondary btn-restore-prompt" data-id="${p.id}" style="padding:6px 12px;font-size:12px">복구</button>
        </div>
      </div>`;
    }).join('');
    grid.innerHTML = (deletedFolders.length ? '<div style="margin-bottom:16px"><div style="font-size:11px;color:#64748b;margin-bottom:8px">삭제된 폴더</div>' + folderCards + '</div>' : '') +
      (deletedPrompts.length ? '<div><div style="font-size:11px;color:#64748b;margin-bottom:8px">삭제된 프롬프트</div>' + promptCards + '</div>' : '');
    grid.querySelectorAll('.btn-restore-folder').forEach(btn => {
      btn.addEventListener('click', () => restoreFolder(btn.getAttribute('data-id')));
    });
    grid.querySelectorAll('.btn-restore-prompt').forEach(btn => {
      btn.addEventListener('click', () => restorePrompt(btn.getAttribute('data-id')));
    });
    return;
  }

  let list = activeFolderId === 'all' ? savedPrompts : savedPrompts.filter(p => p.folderId === activeFolderId);
  if (showFavoritesOnly) list = list.filter(p => p.isFavorite);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.content || '').toLowerCase().includes(q) ||
      (p.tags || '').toLowerCase().includes(q)
    );
  }

  if (list.length === 0) {
    grid.innerHTML = '<div style="padding:80px 0;text-align:center;color:#6b7280;font-size:14px;">프롬프트가 없습니다.</div>';
    return;
  }

  grid.innerHTML = list.map(p => {
    const contentEsc = escapeHtml((p.content || '').slice(0, 100));
    const titleEsc = escapeHtml(p.title || '');
    const favClass = p.isFavorite ? 'btn-fav fav' : 'btn-fav';
    const tagsHtml = (p.tags || '').trim() ? `<div class="tags">${(p.tags || '').split(',').map(t => `<span class="tag"># ${escapeHtml(t.trim())}</span>`).join('')}</div>` : '';
    return `<div class="prompt-card">
      <div class="card-header">
        <div style="flex:1">
          <h4 class="prompt-title" data-id="${escapeHtml(p.id)}">${titleEsc}</h4>
          <p class="preview prompt-preview" data-id="${escapeHtml(p.id)}">${contentEsc}${(p.content || '').length > 100 ? '...' : ''}</p>
        </div>
        <div class="card-actions card-actions-wrap">
          <button class="${favClass}" data-id="${p.id}" title="즐겨찾기">★</button>
          <button class="btn-view" data-id="${p.id}" title="보기">👁</button>
          <div class="card-actions-wrap">
            <button class="btn-more" data-id="${p.id}" title="더보기">⋮</button>
            <div class="dropdown-menu" data-for="${p.id}">
              <button class="btn-edit-prompt" data-id="${p.id}">편집</button>
              <button class="btn-del-prompt del" data-id="${p.id}">지우기</button>
            </div>
          </div>
        </div>
      </div>
      ${tagsHtml}
    </div>`;
  }).join('');

  grid.querySelectorAll('.prompt-title').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      const p = savedPrompts.find(x => x.id === id);
      if (p && p.content) applyPromptToInput(p.content);
    });
  });

  grid.querySelectorAll('.btn-fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const p = savedPrompts.find(x => x.id === id);
      if (p) {
        p.isFavorite = !p.isFavorite;
        saveData();
        refreshUI();
      }
    });
  });

  grid.querySelectorAll('.btn-view').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const p = savedPrompts.find(x => x.id === id);
      if (p) openViewPromptModal(p);
    });
  });

  grid.querySelectorAll('.prompt-preview').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-id');
      const p = savedPrompts.find(x => x.id === id);
      if (p) openViewPromptModal(p);
    });
  });

  grid.querySelectorAll('.btn-more').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
      const menu = document.querySelector(`.dropdown-menu[data-for="${id}"]`);
      if (menu) menu.classList.toggle('show');
    });
  });

  grid.querySelectorAll('.btn-edit-prompt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
      openEditPromptModal(btn.getAttribute('data-id'));
    });
  });

  grid.querySelectorAll('.btn-del-prompt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
      deletePrompt(btn.getAttribute('data-id'));
    });
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function refreshUI() {
  renderFolderList();
  renderPromptsGrid();
  const folderSelect = document.getElementById('newPromptFolder');
  if (folderSelect) {
    folderSelect.innerHTML = folders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
  }
}

/** Saved Prompts 창이 NotebookLM 등으로 포커스를 빼앗기지 않도록 다시 앞으로 */
function focusPromptsWindow() {
  try {
    if (typeof chrome === 'undefined' || !chrome.windows?.getCurrent) return;
    const apply = () => {
      try {
        window.focus();
      } catch (_) {}
      chrome.windows.getCurrent((w) => {
        if (chrome.runtime.lastError || w?.id == null) return;
        chrome.windows.update(w.id, { focused: true });
      });
    };
    setTimeout(apply, 0);
    setTimeout(apply, 120);
  } catch (_) {}
}

async function applyPromptToInput(content) {
  const storage = getStorage();
  if (storage) {
    await storage.set({ [STORAGE_KEYS.promptInput]: content });
  }
  showMessage('프롬프트가 입력창에 설정되었습니다. 확장 팝업을 열어 확인하세요.');
}

async function applyPromptToNotebookLM(runImmediately = false) {
  const content = currentViewingPromptContent;
  if (!content?.trim()) {
    showMessage('??? ??? ????.');
    return;
  }
  try {
    await navigator.clipboard.writeText(content);
    let tab = (await chrome.tabs.query({ url: 'https://notebooklm.google.com/*' }))[0];
    if (!tab) tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
    if (!tab?.id) {
      showMessage('NotebookLM ?? ?? ? ????.');
      return;
    }
    if (!tab.url?.includes('notebooklm.google.com')) {
      showMessage('NotebookLM ???? ?????.');
      return;
    }
    let res = await chrome.tabs.sendMessage(tab.id, { action: 'applyPromptToStudio', text: content, runImmediately });
    if (!res?.ok) {
      res = await chrome.tabs.sendMessage(tab.id, { action: 'pasteAndExecute', text: content, runImmediately });
    }
    if (res?.ok) {
      if (res.target === 'studio') {
        showMessage(runImmediately && res.executed ? 'Studio에 반영했습니다(실행).' : 'Studio 입력란에 반영했습니다.');
      } else {
        showMessage(runImmediately && res.executed ? 'NotebookLM에 입력 후 실행했습니다.' : 'NotebookLM 입력란에 반영했습니다.');
      }
      focusPromptsWindow();
    } else {
      showMessage('NotebookLM ???? ????? ? ?? ?????.');
    }
  } catch (e) {
    showMessage('NotebookLM ???? ????? ? ?? ?????.');
  }
}

async function copyPromptToClipboard() {
  const content = currentViewingPromptContent;
  if (!content?.trim()) {
    showMessage('복사할 내용이 없습니다.');
    return;
  }
  try {
    await navigator.clipboard.writeText(content);
    showMessage('클립보드에 복사되었습니다.');
    focusPromptsWindow();
  } catch (e) {
    showMessage('복사에 실패했습니다.');
  }
}

function renderColorGrid() {
  const grid = document.getElementById('color-grid');
  if (!grid) return;
  grid.innerHTML = FOLDER_COLORS.map(color => {
    const bg = COLOR_MAP[color] || COLOR_MAP.blue;
    const sel = selectedNewFolderColor === color ? ' selected' : '';
    return `<button type="button" class="color-btn${sel}" data-color="${color}" style="background:${bg}">${sel ? '✓' : ''}</button>`;
  }).join('');
  grid.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedNewFolderColor = btn.getAttribute('data-color');
      renderColorGrid();
    });
  });
}

function openEditFolderModal(folderId) {
  const f = folders.find(x => x.id === folderId);
  if (!f || f.id === 'all') return;
  editingFolderId = folderId;
  document.getElementById('editFolderName').value = f.name;
  selectedNewFolderColor = f.color;
  renderEditColorGrid();
  openModal('edit-folder-modal');
}

function renderEditColorGrid() {
  const grid = document.getElementById('editColorGrid');
  if (!grid) return;
  grid.innerHTML = FOLDER_COLORS.map(color => {
    const bg = COLOR_MAP[color] || COLOR_MAP.blue;
    const sel = selectedNewFolderColor === color ? ' selected' : '';
    return `<button type="button" class="color-btn edit-color${sel}" data-color="${color}" style="background:${bg}">${sel ? '✓' : ''}</button>`;
  }).join('');
  grid.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedNewFolderColor = btn.getAttribute('data-color');
      renderEditColorGrid();
    });
  });
}

function saveEditFolder() {
  if (!editingFolderId) return;
  const name = (document.getElementById('editFolderName')?.value || '').trim();
  if (!name) { showMessage('폴더 이름을 입력해주세요.'); return; }
  const f = folders.find(x => x.id === editingFolderId);
  if (f) {
    f.name = name;
    f.color = selectedNewFolderColor;
  }
  closeModal('edit-folder-modal');
  editingFolderId = null;
  saveData();
  refreshUI();
  showMessage('폴더가 수정되었습니다.');
}

function deleteFolder(folderId) {
  const f = folders.find(x => x.id === folderId);
  if (!f || f.id === 'all') return;
  if (!confirm(`"${f.name}" 폴더를 삭제하시겠습니까? 해당 폴더의 프롬프트는 "All Prompts"로 이동합니다. 휴지통에서 복구할 수 있습니다.`)) return;
  savedPrompts.forEach(p => { if (p.folderId === folderId) p.folderId = 'all'; });
  deletedFolders.unshift({ ...f, deletedAt: Date.now() });
  folders = folders.filter(x => x.id !== folderId);
  if (activeFolderId === folderId) activeFolderId = 'all';
  closeModal('edit-folder-modal');
  editingFolderId = null;
  saveData();
  refreshUI();
  showMessage('폴더가 휴지통으로 이동되었습니다.');
}

function openViewPromptModal(p) {
  currentViewingPromptContent = p.content || '';
  document.getElementById('viewPromptTitle').textContent = p.title || '프롬프트 보기';
  const contentEl = document.getElementById('viewPromptContent');
  contentEl.textContent = currentViewingPromptContent;
  openModal('view-prompt-modal');
}

function openEditPromptModal(promptId) {
  const p = savedPrompts.find(x => x.id === promptId);
  if (!p) return;
  editingPromptId = promptId;
  document.getElementById('newPromptTitle').value = p.title || '';
  document.getElementById('newPromptFolder').value = p.folderId || 'all';
  document.getElementById('newPromptTags').value = p.tags || '';
  document.getElementById('newPromptContent').value = p.content || '';
  const titleEl = document.getElementById('addPromptModalTitle');
  if (titleEl) titleEl.textContent = '프롬프트 편집';
  openModal('add-prompt-modal');
}

function saveEditPrompt() {
  if (!editingPromptId) return;
  const title = (document.getElementById('newPromptTitle')?.value || '').trim();
  const folderId = document.getElementById('newPromptFolder')?.value || 'all';
  const tags = (document.getElementById('newPromptTags')?.value || '').trim();
  const content = (document.getElementById('newPromptContent')?.value || '').trim();
  if (!title || !content) { showMessage('제목과 내용을 입력해주세요.'); return; }
  const p = savedPrompts.find(x => x.id === editingPromptId);
  if (p) {
    p.title = title;
    p.folderId = folderId;
    p.tags = tags;
    p.content = content;
  }
  closeModal('add-prompt-modal');
  editingPromptId = null;
  const t = document.getElementById('addPromptModalTitle');
  if (t) t.textContent = 'Add New Prompt';
  saveData();
  refreshUI();
  showMessage('프롬프트가 수정되었습니다.');
}

function deletePrompt(promptId) {
  const p = savedPrompts.find(x => x.id === promptId);
  if (!p) return;
  if (!confirm(`"${p.title || '프롬프트'}"를 삭제하시겠습니까? 휴지통에서 복구할 수 있습니다.`)) return;
  deletedPrompts.unshift({ ...p, deletedAt: Date.now() });
  savedPrompts = savedPrompts.filter(x => x.id !== promptId);
  saveData();
  refreshUI();
  showMessage('프롬프트가 휴지통으로 이동되었습니다.');
}

function restorePrompt(promptId) {
  const p = deletedPrompts.find(x => x.id === promptId);
  if (!p) return;
  const { deletedAt, ...rest } = p;
  savedPrompts.unshift(rest);
  deletedPrompts = deletedPrompts.filter(x => x.id !== promptId);
  saveData();
  refreshUI();
  showMessage('프롬프트가 복구되었습니다.');
}

function restoreFolder(folderId) {
  const f = deletedFolders.find(x => x.id === folderId);
  if (!f) return;
  const { deletedAt, ...rest } = f;
  folders.push(rest);
  deletedFolders = deletedFolders.filter(x => x.id !== folderId);
  saveData();
  refreshUI();
  showMessage('폴더가 복구되었습니다.');
}

function createNewFolder() {
  const input = document.getElementById('newFolderName');
  const name = (input?.value || '').trim();
  if (!name) {
    showMessage('폴더 이름을 입력해주세요.', 'x');
    return;
  }
  folders.push({ id: 'f-' + Date.now(), name, color: selectedNewFolderColor });
  if (input) input.value = '';
  closeModal('create-folder-modal');
  saveData();
  refreshUI();
  showMessage('폴더가 생성되었습니다.');
}

function saveNewPrompt() {
  const title = (document.getElementById('newPromptTitle')?.value || '').trim();
  const folderId = document.getElementById('newPromptFolder')?.value || 'all';
  const tags = (document.getElementById('newPromptTags')?.value || '').trim();
  const content = (document.getElementById('newPromptContent')?.value || '').trim();

  if (!title || !content) {
    showMessage('제목과 내용을 입력해주세요.');
    return;
  }

  if (editingPromptId) {
    saveEditPrompt();
    return;
  }

  savedPrompts.unshift({
    id: 'p-' + Date.now(),
    title,
    folderId,
    tags,
    content,
    isFavorite: false,
    ts: new Date().toISOString()
  });

  document.getElementById('newPromptTitle').value = '';
  document.getElementById('newPromptTags').value = '';
  document.getElementById('newPromptContent').value = '';
  closeModal('add-prompt-modal');
  saveData();
  refreshUI();
  showMessage('프롬프트가 저장되었습니다.');
}

function bindEvents() {
  document.getElementById('btnCreateFolder')?.addEventListener('click', () => openModal('create-folder-modal'));
  document.getElementById('btnCancelFolder')?.addEventListener('click', () => closeModal('create-folder-modal'));
  document.getElementById('btnCreateFolderConfirm')?.addEventListener('click', createNewFolder);

  document.getElementById('btnNewPrompt')?.addEventListener('click', () => {
    editingPromptId = null;
    document.getElementById('newPromptTitle').value = '';
    document.getElementById('newPromptFolder').value = 'all';
    document.getElementById('newPromptTags').value = '';
    document.getElementById('newPromptContent').value = '';
    openModal('add-prompt-modal');
  });
  document.getElementById('btnCloseAddPrompt')?.addEventListener('click', () => {
    closeModal('add-prompt-modal');
    editingPromptId = null;
    const t = document.getElementById('addPromptModalTitle');
    if (t) t.textContent = 'Add New Prompt';
  });
  document.getElementById('btnCancelAddPrompt')?.addEventListener('click', () => {
    closeModal('add-prompt-modal');
    editingPromptId = null;
    const t = document.getElementById('addPromptModalTitle');
    if (t) t.textContent = 'Add New Prompt';
  });
  document.getElementById('btnSaveNewPrompt')?.addEventListener('click', saveNewPrompt);

  document.getElementById('btnClose')?.addEventListener('click', () => window.close());

  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    searchQuery = (e.target?.value || '').trim();
    refreshUI();
  });

  document.getElementById('btnFavorites')?.addEventListener('click', () => {
    showFavoritesOnly = !showFavoritesOnly;
    refreshUI();
  });

  document.getElementById('btnExportNpp')?.addEventListener('click', exportPromptsToNpp);
  document.getElementById('btnImportNpp')?.addEventListener('click', () => {
    document.getElementById('nppFileInput')?.click();
  });
  document.getElementById('nppFileInput')?.addEventListener('change', async (e) => {
    const file = e.target?.files?.[0];
    await importPromptsFromNpp(file);
    e.target.value = '';
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.folder-dropdown.show').forEach(m => m.classList.remove('show'));
  });

  document.getElementById('btnCancelEditFolder')?.addEventListener('click', () => { closeModal('edit-folder-modal'); editingFolderId = null; });
  document.getElementById('btnSaveEditFolder')?.addEventListener('click', saveEditFolder);
  document.getElementById('btnCloseViewPrompt')?.addEventListener('click', () => closeModal('view-prompt-modal'));

  document.getElementById('btnInputOnly')?.addEventListener('click', () => applyPromptToNotebookLM(false));
  document.getElementById('btnApplyToNotebookLM')?.addEventListener('click', () => applyPromptToNotebookLM(true));
  document.getElementById('btnCopyPrompt')?.addEventListener('click', copyPromptToClipboard);
}

async function init() {
  await loadData();
  renderColorGrid();
  refreshUI();
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
