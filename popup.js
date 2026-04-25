/* Scholar Assistant - NotebookLM Extension - popup.js */
const SCHOLAR_PROMPTS = {
  slideTools: {
    step1: (total, part) => {
      const t = Number(total) || 45;
      const p = Number(part) || 3;
      const perPart = Math.ceil(t / p);
      return `[프롬프트: 고해상도 구조 스캔]\n* 목표: 업로드된 문서의 모든 섹션, 소제목, 도표, 각주를 누락 없이 스캔하라. ${t} page설계 ${p} part로 구성 \n\n수행 작업:\n1. 문서의 논리적 흐름에 따라 전체 내용을 ${p}개의 파트로 나누고, 각 파트당 ${perPart}개의 슬라이드 주제(총 ${t}개)를 추출하라. \n2. 각 주제는 문서 내의 구체적인 개념, 실험 데이터, 또는 핵심 모델명(예: SEEV, SSTS, PCP 등)을 기반으로 설정하라. \n3. 단순히 목차를 베끼지 말고, 본문의 핵심 키워드를 3개 이상 포함하여 '세밀 목차'를 생성하라.\nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`;
    },
    step2: (from, to) => `- 대상: 슬라이드 ${from}~${to}번 주제.\n- 지시 사항:\n  1. 해당 구간의 내용을 설명할 때, 본문에 등장하는 모든  고유 명사(학자 이름, 모델명) 와  통계 수치(백분율, 시간 등) 를 하나도 빠짐없이 포함하라. 
    2. (매우 중요) "더 이상 설명할 것이 없다"고 판단될 때까지 본문의 예시와 설명을 최대한 길게 서술하라. 
    3. 각 슬라이드에 들어갈 시각적 요소(그래프의 x-y축 내용, 도표의 항목)를 본문의 텍스트를 근거로 복원하여 설명하라. \n- 출력 원칙: 각 문장 뒤에 해당 정보가 있는 소스 번호를 반드시 기재하라. \nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`,
    step3: (style = "2DFlat(Default)") => `입력 데이터: 2단계에서 추출된 고밀도 텍스트를 이용한 슬라이드 생성 \n\n디자인 가이드:\n* Style: ${style} \n* Rule: 모든 내용을 "명사형/단문"으로 변환하되, 핵심 전문 용어는 절대 생략하지 말 것.연구자(연도) 인용정보 포함할 것, 내용을 가능한 요약보다는 설명을 우선(학습 탐구우선)    \n* Consistency: 앞선 슬라이드와의 비주얼 톤앤매너를 유지하라. \n\n최종 확인: 15페이지가 모두 생성되었는지 확인하고, 누락 시 추가 생성을 요청하라.\n\nCrucial Rules:\n1. 제공된 데이터를 바탕으로 *반드시 지정된 15페이지를 모두 상세 생성*하라.\n2. 텍스트 형식: "학술적표현 종결: ~이다, ~임 등" 사용하여 PPT 가독성을 높여라.\n3. 시각적 가이드: 본문을 설명하는 도표,이미지만 생성, 각 슬라이드에 어울리는 3D 아이콘(예: 손전등 비유 [Fig. 16], 눈동자 움직임 [fig. 45])을 제안하라. 시각적으로 실제적이어야만 하는경우이거나 필요한 것만 3D생성하라\n4. 근거 표기: 각 슬라이드 하단에 정보의 근거가 된 번호 혹은 인용정보( 연구자(연도))를 반드시 포함하라.`
  },
  explore: {
    step1: `STEP 1: 지식의 지도 그리기 (Preview)\n"이 책(또는 챕터)의 전체 내용을 논리적인 흐름에 따라 섹션벼로 핵심을 요약해줘. 특히 내가 이 단원을 공부하면서 반드시 기억해야 할  '가장 중요한 전문 용어' 를 뽑아내고, 각 용어가 어느 페이지(Source)에서 중요하게 다루어지는 제시하고, 그 용어의 학술적인용정보 , 연구자(연도)를 포함해줘. 전체 Flow Chart를 만들면서 단원별 연결관계 및 이해해야할 구조를 도식화해줘.Mind Map개념으로 제시해줘.  학술적 문체(~이다)로 전문적 어조 사용할 것."  \nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`,
    step2: `STEP 2: 핵심 개념 딥다이바이빙 (Concept Mastery)\n"이 교재에서 가장 핵심이 되는 '이론'들과 제시되는 '모델'들(예: SEEV, SSTS, PCP 등)을 모두 선정해서 설명해줘(인용정보, 연구자(연도)는 포함해줘). 단순히 정의만 말하지 말고, 1) 왜 이 이론이 만들어졌는지, 2) 이 이론을 구성하는 세부 요소들은 무엇인지, 3) 각 요소가 서로 어떻게 상호작용하는지를 아주 쉽게 비유를 들어서 설명해줘.   학술적 문체(~이다)로 전문적 어조 사용할 것\n(1) 이론간 연결관계(SOUCE의 모든 이론들 소개 연결) \n(2) 모델간 연결과계(SOUCE의 모든 이론들 소개 연결)\n(3) 이론과 모델의 연결관게를 (MIND MAP과 같은 관계 )\nFlow Chart로 구성해줘." \nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).` ,
    step2_2: ` "STEP2.2. 이론과 모델에 대한 DETAIL ORDER\n이 교재에서 가장 핵심이 되는 '이론'들과 제시되는 '모델'들(예: SEEV, SSTS, PCP 등)을 모두 선정해서 상세하게 Flow Chart로 구성해줘.  학술적 문체(~이다)로 전문적 어조 사용할 것\n\n(1) 이론간 연결관계(SOUCE의 모든 이론들 소개 연결)\n : 상세 설명과 예시 설명  \n \n(2) 모델간 연결과계(SOUCE의 모든 이론들 소개 연결)\n : 상세 설명과 예시 설명\n(3) 이론과 모델의 연결관게를 (MIND MAP과 같은 관계 )\n: 상세 설명과 예시 설명\n\n\n예시) 이론간 연결관계 \n(1) 이론 간 연결 관계 (Theories ➔ Theories)\n주의가 작동하는 기반(공간 vs 객체)에서 시작하여, 최종 디스플레이 설계 지침으로 진화하는 과정입니다.\n[공간 기반 주의 이론 (Space-based Attention)]\n(주의는 손전등처럼 특정 '시야각 공간'을 비춘다는 초기 이론) [16]\n       │\n       ▼ (한계 극복: 같은 공간이라도 분리된 물체는 다르게 처리됨)\n       │\n[객체 파일 이론 (Object File Theory)]\n(주의는 공간이 아니라 '객체 단위'로 할당되며, 동일 객체 내 정보는 \n 병렬 처리되어 정보 통합 속도를 극대화한다는 이론) [17]\n       │\n       ▼ (설계 원칙으로 승화)\n       │\n[근접성 호환성 원리 (PCP)]\n(객체 파일 이론의 병렬 처리 이점을 활용하여, 정보 통합이 필요한 \n 작업은 반드시 디스플레이 상의 정보들을 하나의 '객체'나 가까운 \n '공간'으로 묶어주어야 한다는 궁극의 호환성 대원칙) [19]\n\n예시) 모델간 연결관계 \n\n======================================================================\n\n[ 1단계: 환경 주시 (어디를 볼 것인가?) ]\n\n======================================================================\n     【 SEEV 모델 】 ─────────────▶ (정상 상태의 시선 분배 / 주의의 이동)\n           │\n           │ (시선 밖의 위협 출현 시)\n           ▼\n     【 N-SEEV 모델 】 ───────────▶ (왜 변화 맹시가 일어나는가? \n                                     이심률/흑조현상 등으로 인한 감지 지연 예측)"
    Strict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`,
    step3: `STEP 3: 현실 세계 적용 (Real-world Case Study)\n"이 책에서 이론을 설명하기 위해 사용한 실제 사례들(예: 운전 중 주의 분산, 고릴라 실험, 항공기 계기판 디자인 등)을 체계적으로 이론적용과 연결해서 정리해줘. 그리고 이 이론이  우리 일상생활(스마트폰 사용, 공부할 때의 집중력 등) 에서 어떻게 나타날 수 있는지 새로운 사례를 들어서 내가 이해한 게 맞는지 확인해줘. 또한 사례에 연구인용정보 연구자(연도)를 제시해주고 마지막에는 APA양식으로 제시해줘(만약에 중요한 연결사이트가 있으면 URL도 제시해줘.존재하지 않는 링크는 제시하지마, 무조건 제시하지말고 없으면 제시하지마) , 학술적 문체(~이다)로 전문적 어조 사용할 것." \nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`,
    step4: `STEP 4: 데이터 및 시각 자료 해석 (Data & Visual Literacy)\n"이 단원에 나오는 주요 도표나 그래프(예: Figure 3.1, 3.2 등)를 찾아서 순서대로 설명해줘. 도표에서 설명하고자 하는 프로세스와 목적이 무엇인지 설명해줘(도표의 의미와 플로우차트, X축과 Y축은 무엇을 의미하는지, 그래프의 곡선이 나타내는 인지심리학적 법칙은 무엇인지). 무엇보다 중요한 것은 그래프와 도표의 해석과 시사점을 제시해줘.  학술적 문체(~이다)로 전문적 어조 사용할 것\n 데이터 수치를 인용해서 상세히 설명하면서 이에대한 이론 근거, 인용정보(연구자, 연도) 정보를 빠지지 않게 해줘 .도표와 그림, 표에서 제시되는 내용에 대한  전체의 flow chart는 텍스트로 제시해줘"\nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`,
    step5: `STEP 5: 셀프 테스트 및 피드백 (Self-Check)\n"지금까지 공부한 내용을 바탕으로 내가 제대로 이해했는지 확인하기 위한  '사고력 중심의 퀴즈 문제(이론, 모델, 도표, 그림, 표 등과 중요한 사례에 대한 것, 개념이해에 대한 것)' 를 내줘. 중요한 것은 전체를 overview를 할수 있게 해주는 문제여야 해. 단순 암기 문제가 아니라 실제 상황에 이론을 적용하여 내용을 습득할 수있도록 물어봐야해. 정답과 관련한 내용을 하단에 별도로 제시해줘. 내용정보, 인용정보, 내용근거를 제시해주면서 전체의 flow chart는 텍스트로 제시해줘 학술적 문체(~이다)로 전문적 어조 사용할 것\nStrict Citation Rule: Source to Footnote: 1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것. 2. 주석 생성: 답변 최하단에 주석형식을 [^1]:내용 (빈줄)[^2]:내용 (빈줄) [^3]:내용...의 형식으로 하여 [^n]: "원문 텍스트" (빈줄) [^n+1]:내용의 형식의 원문리스트를 반드시 포함할 것(각 번호 사이에는 반드시 빈 줄을 삽입할 것). 3. 학술적 태깅: 'Source: Source N' 텍스트는 스타일은 지양하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것(n=1,2,3...).`
  }
};

const STORAGE_KEYS = { scrappedContent: 'scrappedContent', accumulatedScraps: 'accumulatedScraps', savedConversations: 'savedConversations', promptInput: 'promptInput', theme: 'scholarTheme', savedPrompts: 'savedPrompts', immediateExecute: 'immediateExecute', leftPanelWidth: 'leftPanelWidth', toMDPaste: 'scholarToMDPaste', tomdOpenType: 'tomdOpenType', hideConversationSave: 'hideConversationSave', hideMDEditorHeader: 'hideMDEditorHeader', popupSidebarCompact: 'popupSidebarCompact', hideScholarSlideStudio: 'hideScholarSlideStudio', hideMDProViewerStudio: 'hideMDProViewerStudio', scrapResponseFormat: 'scrapResponseFormat' };

/** 입력창 프롬프트 하단에만 붙이는 학술·인용 보조 문구(비어 있으면 추가하지 않음). */
const ACADEMIC_SETTING_PROMPT = `~이다와 같은 전문적인 학술적 어조로 답변, 논문의 인용정보를정확하게, 논문에 제시된 이론은 구체적으로 설명하고, 연구절차와 실험에 대한 내용도 상세하게 설명해줘. 연구결과는 통계적 APA기법에 맞추어서 서술하고, 시사점과 결론은 이론에 근거하여 답변해줘`;

const STRICT_CITATION_PROMPT = `[Strict Citation Rule: Source to Footnote]
1. 매핑 규칙: 원문의 'Source N'을 발견하면 등장 순서대로 [^1], [^2]... 로 치환하여 본문에 표기할 것.
2. 주석 생성: 답변 최하단에 [^n]: [Source N] "원문 텍스트" 형식의 리스트를 반드시 포함할 것.
3. 학술적 태깅: 'Source: Source N' 텍스트는 삭제하고, 해당 개념 바로 뒤에 [^n]를 붙여 출처를 명확히 할 것.`;

function collapseRepeatedBlock(text, block) {
  let t = String(text || '');
  if (!block) return t;
  const doubled = [block + '\n\n' + block, block + '\n' + block];
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of doubled) {
      while (t.includes(d)) {
        t = t.split(d).join(block);
        changed = true;
      }
    }
  }
  return t;
}

function collapseScholarPromptFooters(text) {
  let t = String(text || '');
  let prev;
  do {
    prev = t;
    t = collapseRepeatedBlock(t, ACADEMIC_SETTING_PROMPT);
    t = collapseRepeatedBlock(t, STRICT_CITATION_PROMPT);
  } while (t !== prev);
  return t;
}

function getManifestVersion() {
  try {
    const v = chrome.runtime.getManifest()?.version;
    return typeof v === 'string' && v.trim() ? v.trim() : '';
  } catch (_) {
    return '';
  }
}

function syncExtensionVersionUI() {
  const v = getManifestVersion();
  if (v) {
    document.title = `Research assistant PJH ${v}`;
    const el = document.getElementById('extManifestVersion');
    if (el) el.textContent = v;
  }
}

function getExtensionBaseUrl() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL('');
    }
  } catch (_) {}
  try {
    return new URL('./', window.location.href).href;
  } catch (_) {
    return '';
  }
}

/** background openWindow; 확장 재로드 등으로 컨텍스트가 끊기면 lastError 처리 */
function openExtensionWindowViaBackground(message, fallbackOpen) {
  const runFallback = typeof fallbackOpen === 'function' ? fallbackOpen : () => {};
  try {
    if (!chrome.runtime?.sendMessage) return false;
    if (!isExtensionContextValid()) {
      ensureExtensionContextOrNotify();
      runFallback();
      return true;
    }
    chrome.runtime.sendMessage(message, (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        ensureExtensionContextOrNotify();
        runFallback();
      }
    });
    return true;
  } catch (_) {
    ensureExtensionContextOrNotify();
    runFallback();
    return true;
  }
}

function ensureExtensionContextOrNotify() {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
      return true;
    }
  } catch (_) {}
  try {
    window.alert('확장 프로그램이 업데이트되었습니다. 페이지를 새로고침(F5) 해주세요.');
  } catch (_) {}
  return false;
}

let scrappedContent = '';

function isExtensionContextValid() {
  try {
    return typeof chrome !== 'undefined' && chrome?.runtime?.id;
  } catch (_) { return false; }
}

function getStorage() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return {
        get(keys) {
          return new Promise((resolve, reject) => {
            try {
              chrome.storage.local.get(keys, (data) => {
                if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
                else resolve(data || {});
              });
            } catch (e) { reject(e); }
          });
        },
        set(items) {
          return new Promise((resolve, reject) => {
            try {
              chrome.storage.local.set(items, () => {
                if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
                else resolve();
              });
            } catch (e) { reject(e); }
          });
        },
        remove(keys) {
          return new Promise((resolve, reject) => {
            try {
              chrome.storage.local.remove(keys, () => {
                if (chrome.runtime?.lastError) reject(new Error(chrome.runtime.lastError.message));
                else resolve();
              });
            } catch (e) { reject(e); }
          });
        }
      };
    }
  } catch (_) {}
  return null;
}

function queryActiveTab() {
  return new Promise((resolve, reject) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
        resolve(null);
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(Array.isArray(tabs) ? (tabs[0] || null) : null);
      });
    } catch (e) { reject(e); }
  });
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage || !tabId) {
        resolve(null);
        return;
      }
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    } catch (e) { reject(e); }
  });
}

function clearUIOnNotebookExit() {
  scrappedContent = '';
  const input = document.getElementById('promptInput');
  if (input) input.value = '';
  const ta = document.getElementById('scrapEditArea');
  if (ta) {
    ta.value = '';
    ta.placeholder = '스크랩 내용이 없습니다. 스크랩 버튼으로 NotebookLM 내용을 가져오세요.';
  }
  saveState().catch(() => {});
}

async function loadState() {
  const storage = getStorage();
  if (!storage) return;
  try {
    const data = await storage.get([STORAGE_KEYS.scrappedContent, STORAGE_KEYS.accumulatedScraps, STORAGE_KEYS.promptInput, STORAGE_KEYS.theme, STORAGE_KEYS.immediateExecute, STORAGE_KEYS.leftPanelWidth, STORAGE_KEYS.tomdOpenType, STORAGE_KEYS.hideConversationSave, STORAGE_KEYS.hideMDEditorHeader, STORAGE_KEYS.popupSidebarCompact, STORAGE_KEYS.hideScholarSlideStudio, STORAGE_KEYS.hideMDProViewerStudio, STORAGE_KEYS.scrapResponseFormat]);
    scrappedContent = data[STORAGE_KEYS.scrappedContent] || '';
    const input = document.getElementById('promptInput');
    if (input && data[STORAGE_KEYS.promptInput]) {
      input.value = collapseScholarPromptFooters(data[STORAGE_KEYS.promptInput]);
    }
    applyTheme(data[STORAGE_KEYS.theme] || 'dark');
    const chk = document.getElementById('chkImmediate');
    if (chk) chk.checked = data[STORAGE_KEYS.immediateExecute] !== false;
    const w = data[STORAGE_KEYS.leftPanelWidth];
    if (typeof w === 'number' && w >= 20 && w <= 85) setLeftPanelWidth(w);
    const tomdType = data[STORAGE_KEYS.tomdOpenType] || 'external';
    const internalRadio = document.querySelector('input[name="tomdOpenType"][value="internal"]');
    const externalRadio = document.querySelector('input[name="tomdOpenType"][value="external"]');
    if (internalRadio && externalRadio) {
      if (tomdType === 'internal') internalRadio.checked = true;
      else externalRadio.checked = true;
    }
    const hideConversationSave = data[STORAGE_KEYS.hideConversationSave] !== false;
    const hideCheckbox = document.getElementById('chkHideConversationSave');
    if (hideCheckbox) hideCheckbox.checked = hideConversationSave;
    applyConversationSaveVisibility(hideConversationSave);
    const hideMDEditor = data[STORAGE_KEYS.hideMDEditorHeader] !== false;
    const hideMDChk = document.getElementById('chkHideMDEditorHeader');
    if (hideMDChk) hideMDChk.checked = hideMDEditor;
    const hideScholarSlideStudio = data[STORAGE_KEYS.hideScholarSlideStudio] !== false;
    const chkSlide = document.getElementById('chkHideScholarSlideStudio');
    if (chkSlide) chkSlide.checked = hideScholarSlideStudio;
    const hideMDProViewerStudio = data[STORAGE_KEYS.hideMDProViewerStudio] !== false;
    const chkMdPro = document.getElementById('chkHideMDProViewerStudio');
    if (chkMdPro) chkMdPro.checked = hideMDProViewerStudio;
    const storedScrapFormat = data[STORAGE_KEYS.scrapResponseFormat] || 'answer_only';
    const scrapFormat = storedScrapFormat === 'simple' ? 'conversation' : storedScrapFormat;
    const scrapFormatInput = document.querySelector(`input[name="scrapResponseFormat"][value="${scrapFormat}"]`);
    if (scrapFormatInput) scrapFormatInput.checked = true;
    applyPopupSidebarCompact(data[STORAGE_KEYS.popupSidebarCompact] === true);
  } catch (e) { console.warn('loadState:', e); }
}

function applyPopupSidebarCompact(compact) {
  document.documentElement.classList.toggle('popup-sidebar-compact', compact);
  document.body.classList.toggle('popup-sidebar-compact', compact);
}

const LEFT_PANEL_MIN_PCT = 20;
const LEFT_PANEL_MAX_PCT = 85;
const PANEL_SPLITTER_WIDTH = 6;
const PANEL_MIN_PX_FLOOR = 140;
const PANEL_MIN_PX_CAP = 220;

function getAdaptivePanelMinPx(mainWidth) {
  const usableWidth = Math.max(0, mainWidth - PANEL_SPLITTER_WIDTH);
  return Math.min(PANEL_MIN_PX_CAP, Math.max(PANEL_MIN_PX_FLOOR, Math.round(usableWidth * 0.32)));
}

function clampLeftPanelPct(pct, mainWidth) {
  if (!mainWidth || mainWidth <= 0) {
    return Math.max(LEFT_PANEL_MIN_PCT, Math.min(LEFT_PANEL_MAX_PCT, pct));
  }
  const usableWidth = Math.max(0, mainWidth - PANEL_SPLITTER_WIDTH);
  const minPanelPx = getAdaptivePanelMinPx(mainWidth);
  const minLeftPx = Math.min(minPanelPx, usableWidth);
  const maxLeftPx = Math.max(minLeftPx, usableWidth - minPanelPx);
  const nextLeftPx = Math.round((usableWidth * pct) / 100);
  const clampedPx = Math.max(minLeftPx, Math.min(maxLeftPx, nextLeftPx));
  const clampedPct = Math.round((clampedPx / Math.max(usableWidth, 1)) * 100);
  return Math.max(LEFT_PANEL_MIN_PCT, Math.min(LEFT_PANEL_MAX_PCT, clampedPct));
}

function setLeftPanelWidth(pct) {
  const main = document.querySelector('.main');
  if (!main) return;
  const clamped = clampLeftPanelPct(pct, main.offsetWidth);
  main.style.setProperty('--left-panel-width', clamped + '%');
}

function initPanelSplitter() {
  const splitter = document.getElementById('panelSplitter');
  const main = document.querySelector('.main');
  const leftPanel = main?.querySelector('.left-panel');
  if (!splitter || !main || !leftPanel) return;
  let startX = 0, startW = 0, isDragging = false;

  const syncWidthToContainer = () => {
    const current = parseInt(main.style.getPropertyValue('--left-panel-width'), 10) || 70;
    const clamped = clampLeftPanelPct(current, main.offsetWidth);
    main.style.setProperty('--left-panel-width', clamped + '%');
  };

  if (typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => syncWidthToContainer());
    resizeObserver.observe(main);
  } else {
    window.addEventListener('resize', syncWidthToContainer);
  }

  splitter.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startW = leftPanel.offsetWidth;
    isDragging = true;
    splitter.setPointerCapture(e.pointerId);
  });
  splitter.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const minPanelPx = getAdaptivePanelMinPx(main.offsetWidth);
    const maxLeftWidth = Math.max(minPanelPx, main.offsetWidth - PANEL_SPLITTER_WIDTH - minPanelPx);
    const newW = Math.max(minPanelPx, Math.min(maxLeftWidth, startW + dx));
    const pct = Math.round((newW / main.offsetWidth) * 100);
    const clamped = clampLeftPanelPct(pct, main.offsetWidth);
    main.style.setProperty('--left-panel-width', clamped + '%');
  });
  splitter.addEventListener('pointerup', (e) => {
    try { splitter.releasePointerCapture(e.pointerId); } catch (_) {}
    isDragging = false;
    const w = main.style.getPropertyValue('--left-panel-width');
    const pct = parseInt(w, 10);
    if (!isNaN(pct) && pct >= LEFT_PANEL_MIN_PCT && pct <= LEFT_PANEL_MAX_PCT) {
      const storage = getStorage();
      if (storage) storage.set({ [STORAGE_KEYS.leftPanelWidth]: pct }).catch(() => {});
    }
  });
  splitter.addEventListener('pointercancel', (e) => {
    try { splitter.releasePointerCapture(e.pointerId); } catch (_) {}
    isDragging = false;
  });

  syncWidthToContainer();
}

function applyTheme(theme) {
  const body = document.body;
  const icon = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  body.setAttribute('data-theme', theme);
  if (icon) icon.textContent = theme === 'dark' ? 'D' : 'L';
  if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';
}

function applyConversationSaveVisibility(hidden) {
  document.querySelectorAll('.btn-footer').forEach((el) => {
    el.style.display = hidden ? 'none' : '';
  });
}

function toggleTheme() {
  const body = document.body;
  const next = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  const storage = getStorage();
  if (storage) storage.set({ [STORAGE_KEYS.theme]: next }).catch(() => {});
}

async function saveState() {
  const storage = getStorage();
  if (!storage) return;
  try {
    const input = document.getElementById('promptInput');
    await storage.set({
      [STORAGE_KEYS.scrappedContent]: scrappedContent,
      [STORAGE_KEYS.promptInput]: input ? input.value : ''
    });
  } catch (e) {
    if (!String(e).includes('Extension context invalidated')) console.warn('saveState:', e);
  }
}

async function getAccumulatedScraps() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const data = await storage.get(STORAGE_KEYS.accumulatedScraps);
    return data[STORAGE_KEYS.accumulatedScraps] || [];
  } catch (e) { return []; }
}

async function appendAccumulatedScrap(text) {
  const storage = getStorage();
  if (!storage) return;
  try {
    const list = await getAccumulatedScraps();
    list.push({ id: Date.now(), content: text, ts: new Date().toISOString() });
    await storage.set({ [STORAGE_KEYS.accumulatedScraps]: list });
  } catch (e) { console.warn('appendAccumulatedScrap:', e); }
}

async function getSavedConversations() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const data = await storage.get(STORAGE_KEYS.savedConversations);
    return data[STORAGE_KEYS.savedConversations] || [];
  } catch (_) {
    return [];
  }
}

async function appendSavedConversation(entry) {
  const storage = getStorage();
  if (!storage) return;
  try {
    const list = await getSavedConversations();
    list.push({
      id: Date.now(),
      content: entry?.content || '',
      ts: entry?.ts || new Date().toISOString(),
      detectedMessageCount: Number(entry?.detectedMessageCount) || 0,
      collectedMessageCount: Number(entry?.collectedMessageCount) || 0
    });
    await storage.set({ [STORAGE_KEYS.savedConversations]: list });
  } catch (e) {
    console.warn('appendSavedConversation:', e);
  }
}

async function getMergedSavedConversationsContent() {
  const list = await getSavedConversations();
  if (!list.length) return '';
  return list.map((item, index) => {
    const stats = [];
    if (Number(item.detectedMessageCount) > 0) stats.push(`Detected ${item.detectedMessageCount}`);
    if (Number(item.collectedMessageCount) > 0) stats.push(`Collected ${item.collectedMessageCount}`);
    const header = [`Conversation #${index + 1}`, new Date(item.ts || Date.now()).toLocaleString('ko-KR'), stats.join(' / ')].filter(Boolean).join(' | ');
    return `## ${header}\n\n${item.content || ''}`;
  }).join('\n\n---\n\n');
}

function generateSlidePrompt(step) {
  let prompt = '';
  if (step === 1) prompt = SCHOLAR_PROMPTS.slideTools.step1(document.getElementById('slideTotal').value, document.getElementById('slidePart').value);
  if (step === 2) prompt = SCHOLAR_PROMPTS.slideTools.step2(document.getElementById('slideFrom').value, document.getElementById('slideTo').value);
  if (step === 3) prompt = SCHOLAR_PROMPTS.slideTools.step3();
  setPrompt(prompt);
}
// slide generation prompt sync with step2 range input
function syncStep2PromptRange() {
  const input = document.getElementById('promptInput');
  const fromEl = document.getElementById('slideFrom');
  const toEl = document.getElementById('slideTo');
  if (!input || !fromEl || !toEl || !input.value) return;

  const from = Number(fromEl.value) || 1;
  const to = Number(toEl.value) || from;
  const next = input.value.replace(/^([^\n]*?)(\d+)\s*~\s*(\d+)([^\n]*)(\n|$)/, `$1${from}~${to}$4$5`);
  if (next === input.value) return;

  input.value = next;
  saveState().catch(() => {});
}

function stepRangePrev() {
  const fromEl = document.getElementById('slideFrom');
  const toEl = document.getElementById('slideTo');
  const totalEl = document.getElementById('slideTotal');
  const partEl = document.getElementById('slidePart');
  const t = Number(totalEl?.value) || 45;
  const p = Number(partEl?.value) || 3;
  let from = Number(fromEl?.value) || 1;
  const perPart = Math.ceil(t / p);
  from = Math.max(1, from - perPart);
  const to = Math.min(from + perPart - 1, t);
  if (fromEl) fromEl.value = from;
  if (toEl) toEl.value = to;
  syncStep2PromptRange();
}

function stepRangeNext() {
  const fromEl = document.getElementById('slideFrom');
  const toEl = document.getElementById('slideTo');
  const totalEl = document.getElementById('slideTotal');
  const partEl = document.getElementById('slidePart');
  const t = Number(totalEl?.value) || 45;
  const p = Number(partEl?.value) || 3;
  let from = Number(fromEl?.value) || 1;
  const perPart = Math.ceil(t / p);
  from = from + perPart;
  if (from > t) from = Math.max(1, t - perPart + 1);
  const to = Math.min(from + perPart - 1, t);
  if (fromEl) fromEl.value = from;
  if (toEl) toEl.value = to;
  syncStep2PromptRange();
}

function setExplorePrompt(key) {
  setPrompt(SCHOLAR_PROMPTS.explore[key]);
}
// prompt sync with explore step buttons
function setPrompt(text) {
  const input = document.getElementById('promptInput');
  if (input) {
    input.value = text;
    input.focus();
    saveState().catch(() => {});
  }
  showMessage('프롬프트가 입력창에 설정되었습니다.');
}

function appendAcademicSettingPrompt() {
  const input = document.getElementById('promptInput');
  if (!input) return;
  let current = collapseScholarPromptFooters(String(input.value || '').trim());
  if (!current) {
    showMessage('\uBA3C\uC800 \uC785\uB825\uCC3D\uC5D0 \uBCF8\uBB38 \uD504\uB86C\uD504\uD2B8\uB97C \uC791\uC131\uD55C \uD6C4 \uCD94\uAC00\uD558\uC138\uC694.');
    input.focus();
    return;
  }
  if (current.includes(ACADEMIC_SETTING_PROMPT)) {
    input.value = current;
    input.focus();
    saveState().catch(() => {});
    showMessage('\uD559\uC220 \uC11C\uC220 \uC124\uC815 \uBB38\uAD6C\uAC00 \uC774\uBBF8 \uD558\uB2E8\uC5D0 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.');
    return;
  }
  input.value = `${current}\n\n${ACADEMIC_SETTING_PROMPT}`;
  input.focus();
  saveState().catch(() => {});
  showMessage('\uD559\uC220 \uC11C\uC220 \uC124\uC815\uC744 \uAE30\uC874 \uD504\uB86C\uD504\uD2B8 \uD558\uB2E8\uC5D0 \uCD94\uAC00\uD588\uC2B5\uB2C8\uB2E4.');
}


function appendCitationPrompt() {
  const input = document.getElementById('promptInput');
  if (!input) return;
  let current = collapseScholarPromptFooters(String(input.value || '').trim());
  if (!current) {
    showMessage('\uBA3C\uC800 \uC785\uB825\uCC3D\uC5D0 \uBCF8\uBB38 \uD504\uB86C\uD504\uD2B8\uB97C \uC791\uC131\uD55C \uD6C4 \uCD94\uAC00\uD558\uC138\uC694.');
    input.focus();
    return;
  }
  if (current.includes(STRICT_CITATION_PROMPT)) {
    input.value = current;
    input.focus();
    saveState().catch(() => {});
    showMessage('\uC778\uC6A9 \uC694\uCCAD \uD504\uB86C\uD504\uD2B8\uAC00 \uC774\uBBF8 \uD558\uB2E8\uC5D0 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.');
    return;
  }
  input.value = `${current}\n\n${STRICT_CITATION_PROMPT}`;
  input.focus();
  saveState().catch(() => {});
  showMessage('\uC778\uC6A9 \uC694\uCCAD \uD504\uB86C\uD504\uD2B8\uB97C \uAE30\uC874 \uD504\uB86C\uD504\uD2B8 \uD558\uB2E8\uC5D0 \uCD94\uAC00\uD588\uC2B5\uB2C8\uB2E4.');
}

async function copyMainPrompt() {
  const input = document.getElementById('promptInput');
  let text = input ? String(input.value || '') : '';
  const collapsed = collapseScholarPromptFooters(text);
  if (input && collapsed !== text) {
    input.value = collapsed;
    text = collapsed;
    saveState().catch(() => {});
  }
  if (!text.trim()) { showMessage('입력된 내용이 없습니다.', 'x'); return; }
  copyToClipboard(text);
  saveState();

  const chk = document.getElementById('chkImmediate');
  const runImmediately = chk ? chk.checked : true;

  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const tab = await queryActiveTab();
      if (tab?.url?.includes('notebooklm.google.com')) {
        const res = await sendMessageToTab(tab.id, { action: 'pasteAndExecute', text, runImmediately });
        if (res?.ok) {
          if (res.executed) showMessage('NotebookLM에 입력 후 실행했습니다.');
          else showMessage('NotebookLM에 입력했습니다. 전송 버튼을 눌러주세요.');
          return;
        }
      }
    }
  } catch (_) {}
  showMessage('입력 내용을 클립보드에 복사했습니다.');
}

async function clearNotebookLMInput() {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      showMessage('NotebookLM ?섏씠吏?먯꽌留??ъ슜?????덉뒿?덈떎.', 'x');
      return;
    }
    const tab = await queryActiveTab();
    if (!tab?.url?.includes('notebooklm.google.com')) {
      showMessage('NotebookLM ?섏씠吏?먯꽌留??ъ슜?????덉뒿?덈떎.', 'x');
      return;
    }
    const res = await sendMessageToTab(tab.id, { action: 'clearNotebookLMInput' });
    if (res?.ok) showMessage('NotebookLM 입력창을 지웠습니다.');
    else showMessage('입력창을 찾을 수 없습니다.', 'x');
  } catch (e) {
    showMessage('입력창을 지우지 못했습니다.', 'x');
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else fallbackCopy(text);
}

async function copyToClipboardAsync(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else fallbackCopy(text);
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
}

async function initiateScrap() {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      const text = await navigator.clipboard?.readText?.() || '';
      if (text?.trim()) {
        scrappedContent = text;
        await appendAccumulatedScrap(text);
        showMessage('성공적으로 스크랩했습니다. (누적 저장됨)');
        updateScrapDisplay();
        await saveState();
      } else openModal('manual-scrap-modal');
      return;
    }
    const tab = await queryActiveTab();
    let text = '';
    if (tab?.url?.includes('notebooklm.google.com')) {
      const res = await sendMessageToTab(tab.id, { action: 'getLastMessageText' });
      if (res?.text && res.text.trim().length > 0) {
        text = res.text;
      }
      if (!text) {
        const clickRes = await sendMessageToTab(tab.id, { action: 'clickCopyButton' });
        if (clickRes?.ok) await new Promise(r => setTimeout(r, 500));
        try {
          text = await navigator.clipboard.readText();
        } catch (_) {}
      }
    }
    if (!text) text = await navigator.clipboard.readText();
    if (text && text.trim().length > 0) {
      scrappedContent = text;
      await appendAccumulatedScrap(text);
      showMessage('성공적으로 스크랩했습니다. (누적 저장됨)');
      updateScrapDisplay();
      await saveState();
    } else openModal('manual-scrap-modal');
  } catch (err) { openModal('manual-scrap-modal'); }
}

async function confirmManualScrap() {
  const ta = document.getElementById('manualScrapText');
  const text = ta ? ta.value : '';
  if (text.trim()) {
    scrappedContent = text;
    await appendAccumulatedScrap(text);
    if (ta) ta.value = '';
    closeModal('manual-scrap-modal');
    showMessage('수동 스크랩이 완료되었습니다. (누적 저장됨)');
    updateScrapDisplay();
    await saveState();
  }
}

function updateScrapDisplay() {
  const ta = document.getElementById('scrapEditArea');
  if (!ta) return;
  ta.value = scrappedContent || '';
  ta.placeholder = scrappedContent ? '' : '스크랩 내용이 없습니다. 스크랩 버튼으로 NotebookLM 내용을 가져오세요.';
  if (!ta._scrapSync) {
    ta._scrapSync = true;
    ta.addEventListener('input', () => { scrappedContent = ta.value; saveState(); });
  }
}

function getCurrentScrapContent() {
  const ta = document.getElementById('scrapEditArea');
  if (ta && ta.offsetParent !== null) {
    scrappedContent = ta.value;
    return ta.value;
  }
  return scrappedContent;
}

function downloadContent(ext) {
  const content = getCurrentScrapContent();
  if (!content) return;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scholar_scrap_${Date.now()}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
  showMessage(`${ext.toUpperCase()} 파일로 저장했습니다.`);
}

function confirmToMDSave(url) {
  return window.ScholarConfirm?.confirmExternalToMD?.(url, window.confirm.bind(window)) ?? window.confirm('Would you like to save this clipping?(?????? ?????????)');
}

function openExternal(url) {
  const isInternal = url && url.includes('md_editor/index.html');
  const fallback = () => {
    try {
      window.open(url, '_blank', isInternal ? 'width=1200,height=850,resizable=yes,scrollbars=yes' : 'noopener,noreferrer');
    } catch (_) {}
  };
  try {
    if (!isExtensionContextValid()) {
      ensureExtensionContextOrNotify();
      fallback();
      return;
    }
    if (isInternal && typeof chrome !== 'undefined' && chrome.windows?.create) {
      chrome.windows.create({ url, type: 'popup', width: 1200, height: 850 });
      return;
    }
    if (!isInternal && typeof chrome !== 'undefined' && chrome.tabs?.create) {
      chrome.tabs.create({ url });
      return;
    }
  } catch (_) {
    ensureExtensionContextOrNotify();
  }
  fallback();
}

async function sendToMD() {
  if (!ensureExtensionContextOrNotify()) return false;
  const content = getCurrentScrapContent();
  if (!content) { showMessage('내용이 없습니다.', 'x'); return; }
  const storage = getStorage();
  let url = 'https://mdproviewer.vercel.app/';
  const extensionBaseUrl = getExtensionBaseUrl();
  const internalUrl = extensionBaseUrl ? extensionBaseUrl + 'md_editor/index.html' : url;
  if (storage) {
    try {
      await storage.set({ [STORAGE_KEYS.toMDPaste]: content });
      const data = await storage.get(STORAGE_KEYS.tomdOpenType);
      if (data[STORAGE_KEYS.tomdOpenType] !== 'external') url = internalUrl;
    } catch (e) {
      if (String(e).includes('Extension context invalidated')) {
        ensureExtensionContextOrNotify();
        return false;
      }
    }
  }
  if (!confirmToMDSave(url)) return false;
  await copyToClipboardAsync(content);
  await new Promise(r => setTimeout(r, 150));
  openExternal(url);
  showMessage('ToMD로 보냈습니다. 자동 붙여넣기 또는 Ctrl+V로 붙여넣기 하세요.');
}

async function saveCurrentScrap() {
  let content = '';
  let detectedMessageCount = 0;
  let collectedMessageCount = 0;
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const tab = await queryActiveTab();
      if (tab?.url?.includes('notebooklm.google.com')) {
        const res = await sendMessageToTab(tab.id, { action: 'getConversationText' });
        if (res?.text && res.text.trim()) {
          content = res.text.trim();
          detectedMessageCount = Number(res.detectedMessageCount) || 0;
          collectedMessageCount = Number(res.collectedMessageCount) || 0;
        }
      }
    }
  } catch (_) {}

  if (!content) {
    showMessage('No conversation content found.', 'x');
    return;
  }

  await appendSavedConversation({
    content,
    detectedMessageCount,
    collectedMessageCount,
    ts: new Date().toISOString()
  });
  await copyToClipboardAsync(content);
  const statsText = [];
  if (detectedMessageCount > 0) statsText.push(`detected ${detectedMessageCount}`);
  if (collectedMessageCount > 0) statsText.push(`collected ${collectedMessageCount}`);
  showMessage(`Conversation saved and copied${statsText.length ? ` (${statsText.join(', ')})` : ''}.`);
}

function initViewScrapModalDrag() {
  const box = document.getElementById('view-scrap-modal-box');
  const handle = box?.querySelector('.modal-drag-handle');
  if (!box || !handle) return;
  if (handle._dragInit) return;
  handle._dragInit = true;
  handle.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const rect = box.getBoundingClientRect();
    let startX = e.clientX, startY = e.clientY, startLeft = rect.left, startTop = rect.top;
    box.style.position = 'fixed';
    box.style.left = rect.left + 'px';
    box.style.top = rect.top + 'px';
    box.style.transform = 'none';
    const onMove = (ev) => {
      startLeft += ev.clientX - startX;
      startTop += ev.clientY - startY;
      startX = ev.clientX;
      startY = ev.clientY;
      box.style.left = startLeft + 'px';
      box.style.top = startTop + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function openPromptsWindow() {
  openPromptsFullWindow();
}

function openPromptsFullWindow() {
  const url = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
    ? chrome.runtime.getURL('prompts/prompts.html')
    : 'prompts/prompts.html';
  const fallback = () => {
    try {
      if (typeof window !== 'undefined') window.open(url, '_blank', 'width=900,height=750');
    } catch (_) {}
  };
  if (openExtensionWindowViaBackground({ action: 'openWindow', url: 'prompts/prompts.html', width: 900, height: 750 }, fallback)) return;
  try {
    if (isExtensionContextValid() && chrome.windows?.create) {
      chrome.windows.create({ url, type: 'popup', width: 900, height: 750 });
      return;
    }
  } catch (_) {
    ensureExtensionContextOrNotify();
  }
  fallback();
}

async function openViewScrapWindow() {
  if (!ensureExtensionContextOrNotify()) return;
  const storage = getStorage();
  if (storage) {
    try {
      const data = await storage.get(STORAGE_KEYS.scrappedContent);
      const fromStorage = data?.[STORAGE_KEYS.scrappedContent] || '';
      if (fromStorage) scrappedContent = fromStorage;
    } catch (e) {
      if (String(e).includes('Extension context invalidated')) {
        ensureExtensionContextOrNotify();
        return;
      }
    }
  }
  const content = getCurrentScrapContent();
  if (storage) {
    try {
      await storage.set({
        [STORAGE_KEYS.scrappedContent]: content || scrappedContent,
        viewScrapMemoPanelId: null,
        viewScrapMemoFingerprint: null,
      });
    } catch (e) {
      if (String(e).includes('Extension context invalidated')) {
        ensureExtensionContextOrNotify();
        return;
      }
    }
  }
  updateScrapDisplay();
  openViewScrapInNewWindow();
}

async function openViewScrapInNewWindow() {
  if (!ensureExtensionContextOrNotify()) return;
  const content = getCurrentScrapContent();
  const storage = getStorage();
  if (storage) {
    try {
      await storage.set({
        [STORAGE_KEYS.scrappedContent]: content || scrappedContent,
        viewScrapMemoPanelId: null,
        viewScrapMemoFingerprint: null,
      });
    } catch (e) {
      if (String(e).includes('Extension context invalidated')) {
        ensureExtensionContextOrNotify();
        return;
      }
    }
  }
  const url = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
    ? chrome.runtime.getURL('vieweditor/view-scrap.html')
    : 'vieweditor/view-scrap.html';
  const fallback = () => {
    try {
      if (typeof window !== 'undefined') window.open(url, 'scrapViewer', 'width=800,height=900');
    } catch (_) {}
  };
  if (openExtensionWindowViaBackground({ action: 'openWindow', url: 'vieweditor/view-scrap.html', width: 800, height: 900 }, fallback)) return;
  try {
    if (isExtensionContextValid() && chrome.windows?.create) {
      chrome.windows.create({ url, type: 'popup', width: 800, height: 900 });
      return;
    }
  } catch (_) {
    ensureExtensionContextOrNotify();
  }
  fallback();
}

function openViewAccumulatedWindow() {
  if (!ensureExtensionContextOrNotify()) return;
  const url = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
    ? chrome.runtime.getURL('vieweditor/view-accumulated.html')
    : 'vieweditor/view-accumulated.html';
  const fallback = () => {
    try {
      if (typeof window !== 'undefined') window.open(url, 'accumulatedViewer', 'width=500,height=700');
    } catch (_) {}
  };
  if (openExtensionWindowViaBackground({ action: 'openWindow', url: 'vieweditor/view-accumulated.html', width: 500, height: 700 }, fallback)) return;
  try {
    if (isExtensionContextValid() && chrome.windows?.create) {
      chrome.windows.create({ url, type: 'popup', width: 500, height: 700 });
      return;
    }
  } catch (_) {
    ensureExtensionContextOrNotify();
  }
  fallback();
}

function openViewConversationWindow() {
  if (!ensureExtensionContextOrNotify()) return;
  const url = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
    ? chrome.runtime.getURL('vieweditor/view-conversations.html')
    : 'vieweditor/view-conversations.html';
  const fallback = () => {
    try {
      if (typeof window !== 'undefined') window.open(url, 'conversationViewer', 'width=680,height=820');
    } catch (_) {}
  };
  if (openExtensionWindowViaBackground({ action: 'openWindow', url: 'vieweditor/view-conversations.html', width: 680, height: 820 }, fallback)) return;
  try {
    if (isExtensionContextValid() && chrome.windows?.create) {
      chrome.windows.create({ url, type: 'popup', width: 680, height: 820 });
      return;
    }
  } catch (_) {
    ensureExtensionContextOrNotify();
  }
  fallback();
}

async function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('show');
  if (id === 'view-scrap-modal') {
    updateScrapDisplay();
    initViewScrapModalDrag();
  }
  if (id === 'saved-prompts-modal') refreshPromptsList();
  if (id === 'add-prompt-modal') {
    const input = document.getElementById('promptInput');
    const contentEl = document.getElementById('newPromptContent');
    if (contentEl && input?.value) contentEl.value = input.value;
  }
  if (id === 'accumulated-modal') {
    const list = await getAccumulatedScraps();
    const container = document.getElementById('accumulated-display');
    if (container) {
      if (list.length === 0) container.textContent = '저장된 스크랩이 없습니다.';
      else {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const bg = isDark ? '#1e293b' : '#f3f4f6';
        const color = isDark ? '#e2e8f0' : '#1f2937';
        container.innerHTML = list.map((s, i) => {
          const escaped = escapeHtml(String(s.content || ''));
          return `
          <div style="margin-bottom:12px;padding:8px;background:${bg};color:${color};border-radius:6px;font-size:10px;">
            <strong>#${i + 1}</strong> ${new Date(s.ts).toLocaleString('ko-KR')}<br>
            <div style="white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto;margin-top:6px;">${escaped}</div>
          </div>
        `;
        }).join('');
      }
    }
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

async function getMergedAccumulatedContent() {
  const list = await getAccumulatedScraps();
  if (list.length === 0) return '';
  return list.map(s => s.content).join('\n\n---\n\n');
}

async function downloadAccumulatedContent(ext) {
  const content = await getMergedAccumulatedContent();
  if (!content) { showMessage('저장된 스크랩이 없습니다.', 'x'); return; }
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scholar_accumulated_${Date.now()}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
  showMessage(`${ext.toUpperCase()} 파일로 저장했습니다.`);
}

async function sendAccumulatedToMD() {
  if (!ensureExtensionContextOrNotify()) return false;
  const content = await getMergedAccumulatedContent();
  if (!content) { showMessage('?? ???? ????.', 'x'); return false; }
  const storage = getStorage();
  let url = 'https://mdproviewer.vercel.app/';
  const extensionBaseUrl = getExtensionBaseUrl();
  if (storage) {
    try {
      await storage.set({ [STORAGE_KEYS.toMDPaste]: content });
      const data = await storage.get(STORAGE_KEYS.tomdOpenType);
      if (data[STORAGE_KEYS.tomdOpenType] !== 'external') url = extensionBaseUrl ? extensionBaseUrl + 'md_editor/index.html' : url;
    } catch (e) {
      if (String(e).includes('Extension context invalidated')) {
        ensureExtensionContextOrNotify();
        return false;
      }
    }
  }
  if (!confirmToMDSave(url)) return false;
  await copyToClipboardAsync(content);
  await new Promise(r => setTimeout(r, 150));
  openExternal(url);
  showMessage('?? ???? ToMD? ?????. ?? ???? ?? Ctrl+V? ???? ???.');
  return true;
}

async function sendSavedConversationsToMD() {
  if (!ensureExtensionContextOrNotify()) return false;
  const content = await getMergedSavedConversationsContent();
  if (!content) { showMessage('No saved conversations.', 'x'); return false; }
  const storage = getStorage();
  let url = 'https://mdproviewer.vercel.app/';
  const extensionBaseUrl = getExtensionBaseUrl();
  if (storage) {
    try {
      await storage.set({ [STORAGE_KEYS.toMDPaste]: content });
      const data = await storage.get(STORAGE_KEYS.tomdOpenType);
      if (data[STORAGE_KEYS.tomdOpenType] !== 'external') url = extensionBaseUrl ? extensionBaseUrl + 'md_editor/index.html' : url;
    } catch (e) {
      if (String(e).includes('Extension context invalidated')) {
        ensureExtensionContextOrNotify();
        return false;
      }
    }
  }
  if (!confirmToMDSave(url)) return false;
  await copyToClipboardAsync(content);
  await new Promise(r => setTimeout(r, 150));
  openExternal(url);
  showMessage('Saved conversations sent to ToMD.');
  return true;
}

async function sendAccumulatedToMDAndClose(modalId) {
  const sent = await sendAccumulatedToMD();
  if (sent) closeModal(modalId);
}

function showMessage(text, icon) {
  const box = document.getElementById('message-box');
  if (!box) return;
  box.textContent = text;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 2500);
}

async function sendToMDAndClose(modalId) {
  const sent = await sendToMD();
  if (sent) closeModal(modalId);
}

async function getSavedPrompts() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const data = await storage.get(STORAGE_KEYS.savedPrompts);
    return Array.isArray(data[STORAGE_KEYS.savedPrompts]) ? data[STORAGE_KEYS.savedPrompts] : [];
  } catch (e) { return []; }
}

async function saveNewPrompt() {
  const title = document.getElementById('newPromptTitle')?.value?.trim();
  const content = document.getElementById('newPromptContent')?.value?.trim();
  if (!title || !content) { showMessage('제목과 내용을 입력해 주세요.', 'x'); return; }
  const storage = getStorage();
  if (!storage) { showMessage('저장소에 접근할 수 없습니다.', 'x'); return; }
  const list = await getSavedPrompts();
  list.unshift({ id: 'p-' + Date.now(), title, content, folderId: 'all', tags: '', isFavorite: false, ts: new Date().toISOString() });
  try {
    await storage.set({ [STORAGE_KEYS.savedPrompts]: list });
  } catch (e) {
    showMessage('저장에 실패했습니다.', 'x');
    return;
  }
  document.getElementById('newPromptTitle').value = '';
  document.getElementById('newPromptContent').value = '';
  closeModal('add-prompt-modal');
  refreshPromptsList();
  showMessage('프롬프트가 저장되었습니다.');
}

function applyPromptToInput(content) {
  const input = document.getElementById('promptInput');
  if (input) { input.value = content; input.focus(); saveState(); }
  closeModal('saved-prompts-modal');
  showMessage('프롬프트가 입력창에 설정되었습니다.');
}

async function refreshPromptsList() {
  const list = await getSavedPrompts();
  const container = document.getElementById('prompts-list');
  if (!container) return;
  if (list.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;font-size:11px;">저장한 프롬프트가 없습니다. + 추가로 새 프롬프트를 저장해 보세요.</p>';
    return;
  }
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  container.innerHTML = list.map((p) => {
    const preview = String(p.content).slice(0, 80) + (p.content.length > 80 ? '...' : '');
    return `<div class="prompt-card" data-prompt-id="${p.id}">
      <div style="font-weight:600;font-size:12px;margin-bottom:4px;">${escapeHtml(p.title)}</div>
      <div style="font-size:10px;opacity:0.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(preview)}</div>
    </div>`;
  }).join('');
  container.querySelectorAll('.prompt-card').forEach((el) => {
    el.addEventListener('click', () => {
      const p = list.find(x => x.id === el.getAttribute('data-prompt-id'));
      if (p) applyPromptToInput(p.content);
    });
  });
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function bindEvents() {
  const $ = (id) => document.getElementById(id);
  $('promptInput')?.addEventListener('input', () => saveState());
  $('slideFrom')?.addEventListener('input', syncStep2PromptRange);
  $('slideTo')?.addEventListener('input', syncStep2PromptRange);

  $('chkImmediate')?.addEventListener('change', () => {
    const chk = $('chkImmediate');
    const storage = getStorage();
    if (storage) storage.set({ [STORAGE_KEYS.immediateExecute]: chk?.checked ?? true }).catch(() => {});
  });

  $('btnRangePrev')?.addEventListener('click', stepRangePrev);
  $('btnRangeNext')?.addEventListener('click', stepRangeNext);

  document.querySelectorAll('[data-action]').forEach((el) => {
    const action = el.getAttribute('data-action');
    const arg = el.getAttribute('data-arg');
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (action === 'generateSlidePrompt') generateSlidePrompt(Number(arg));
      else if (action === 'setExplorePrompt') setExplorePrompt(arg);
      else if (action === 'appendAcademicSettingPrompt') appendAcademicSettingPrompt();
      else if (action === 'appendCitationPrompt') appendCitationPrompt();
      else if (action === 'copyMainPrompt') copyMainPrompt();
      else if (action === 'initiateScrap') initiateScrap();
      else if (action === 'openModal') openModal(arg);
      else if (action === 'openViewScrapWindow') openViewScrapWindow();
      else if (action === 'openViewScrapInNewWindow') openViewScrapInNewWindow();
      else if (action === 'openViewAccumulatedWindow') openViewAccumulatedWindow();
      else if (action === 'openViewConversationWindow') openViewConversationWindow();
      else if (action === 'closeModal') closeModal(arg);
      else if (action === 'downloadContent') downloadContent(arg);
      else if (action === 'downloadAccumulatedContent') downloadAccumulatedContent(arg);
      else if (action === 'sendToMD') sendToMD();
      else if (action === 'sendToMDAndClose') sendToMDAndClose(arg);
      else if (action === 'sendAccumulatedToMD') sendAccumulatedToMD();
      else if (action === 'sendSavedConversationsToMD') sendSavedConversationsToMD();
      else if (action === 'sendAccumulatedToMDAndClose') sendAccumulatedToMDAndClose(arg);
      else if (action === 'saveCurrentScrap') saveCurrentScrap();
      else if (action === 'confirmManualScrap') confirmManualScrap();
      else if (action === 'toggleTheme') toggleTheme();
      else if (action === 'saveNewPrompt') saveNewPrompt();
      else if (action === 'saveSettings') window.PopupSettings?.saveSettings?.();
      else if (action === 'openPromptsWindow') openPromptsWindow();
      else if (action === 'openPromptsFullWindow') openPromptsFullWindow();
      else if (action === 'clearNotebookLMInput') clearNotebookLMInput();
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  syncExtensionVersionUI();
  try {
    await window.PopupSettings?.loadSettingsModal?.();
  } catch (e) {
    console.warn('settings modal load:', e);
  }

  await loadState();
  updateScrapDisplay();
  bindEvents();
  initPanelSplitter();
  if (!document.body.getAttribute('data-theme')) applyTheme('dark');

  window.addEventListener('message', (e) => {
    if (e.data?.type === 'clearOnNotebookExit') clearUIOnNotebookExit();
    if (e.data?.type === 'scholarApplySidebarCompact') {
      applyPopupSidebarCompact(e.data.compact === true);
    }
    if (e.data?.type === 'scholarApplyConversationSaveVisibility') {
      applyConversationSaveVisibility(e.data.hidden === true);
    }
  });
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.action === 'clearOnNotebookExit') clearUIOnNotebookExit();
    });
  }
});

window.generateSlidePrompt = generateSlidePrompt;
window.setExplorePrompt = setExplorePrompt;
window.copyMainPrompt = copyMainPrompt;
window.initiateScrap = initiateScrap;
window.openModal = openModal;
window.closeModal = closeModal;
window.downloadContent = downloadContent;
window.sendToMD = sendToMD;
window.sendToMDAndClose = sendToMDAndClose;
window.sendAccumulatedToMD = sendAccumulatedToMD;
window.sendSavedConversationsToMD = sendSavedConversationsToMD;
window.saveCurrentScrap = saveCurrentScrap;
window.openViewConversationWindow = openViewConversationWindow;
window.confirmManualScrap = confirmManualScrap;
window.toggleTheme = toggleTheme;
window.STORAGE_KEYS = STORAGE_KEYS;
window.getStorage = getStorage;
window.applyConversationSaveVisibility = applyConversationSaveVisibility;
window.applyPopupSidebarCompact = applyPopupSidebarCompact;
window.showMessage = showMessage;
