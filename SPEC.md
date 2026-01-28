# Nano Banana - AI 이미지 생성 웹사이트 스펙 문서

## 개요

**Nano Banana**는 멀티 프로바이더 AI 이미지 생성 웹 애플리케이션입니다.

### 지원 프로바이더
1. **Google Nano Banana** (Gemini 3 Pro Image)
2. **OpenAI Images** (GPT-Image-1.5)
3. **BytePlus Seedream** (Seedream 4.5)

### 주요 목적
- 텍스트 프롬프트 기반 AI 이미지 생성
- 참조 이미지를 활용한 이미지 변형/생성
- 실시간 생성 진행 상황 추적 (Thinking Mode - Google)
- 생성된 이미지 및 메타데이터 다운로드
- 프로바이더별 비용 비교 및 선택

---

## 기술 스택

| 카테고리 | 기술 |
|---------|------|
| **프레임워크** | Vite + React 19 + TypeScript |
| **스타일링** | Tailwind CSS 4 |
| **상태관리** | Zustand (localStorage persist 지원) |
| **API 클라이언트** | @google/generative-ai (Google GenAI SDK) |
| **UI 라이브러리** | lucide-react (아이콘) |
| **파일 업로드** | react-dropzone |
| **유틸리티** | clsx, tailwind-merge |

---

## 핵심 기능

### 1. 이미지 생성
- **텍스트 프롬프트**: 원하는 이미지를 텍스트로 설명
- **참조 이미지**: 드래그앤드롭 또는 클립보드 붙여넣기로 이미지 첨부 (최대 4장)
- **해상도 선택**: 1K / 2K / 4K (기본값: 4K)
- **비율 선택**: 10가지 Aspect Ratio 지원 (기본값: 16:9)

### 2. 실시간 진행 상황 추적
- **Thinking Mode**: Gemini 3 Pro Image의 사고 과정 실시간 표시
- **중간 이미지**: 생성 중 최대 2개의 interim 이미지 미리보기
- **경과 시간**: API 호출 시작부터 경과 시간 표시

### 3. 토큰 및 비용 추정
- **입력 토큰**: 텍스트 + 이미지 토큰 실시간 계산
- **출력 토큰**: 선택한 해상도에 따른 출력 토큰 표시
- **예상 비용**: 한화(KRW)로 실시간 비용 추정 표시
- **청구 링크**: Google AI Studio 청구 페이지 바로가기

### 4. 다운로드 기능
- **이미지 다운로드**: PNG 형식으로 생성된 이미지 저장
- **메타데이터 다운로드**: JSON 형식으로 생성 정보 저장

### 5. 설정 관리
- **API 키 관리**: Google AI API 키 입력 및 저장
- **설정 영속화**: 모든 설정 localStorage에 자동 저장

---

## 멀티 프로바이더 API 비교

| 항목 | Google Nano Banana | OpenAI Images | BytePlus Seedream |
|------|-------------------|---------------|-------------------|
| **모델** | gemini-3-pro-image-preview | gpt-image-1.5 | seedream-4-5-251128 |
| **엔드포인트** | generativelanguage.googleapis.com | api.openai.com | ark.ap-southeast.bytepluses.com |
| **인증** | x-goog-api-key 헤더 | Bearer Token | Bearer Token |
| **스트리밍** | SSE (part.thought) | SSE (partial_image) | stream: true |
| **비용** | $0.039~$0.24/장 | $0.02~$0.19/장 | ~$0.04/장 |

---

## API 상세 정보

### 1. Google Nano Banana (Gemini 3 Pro Image)

**Endpoint**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:streamGenerateContent
```

**인증**: `x-goog-api-key: {API_KEY}` 헤더

**특징**: Thinking Mode (사고 과정 실시간 표시), 중간 이미지 미리보기

**요청 형식**
```json
{
  "contents": [{"parts": [{"text": "프롬프트"}]}],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": {"aspectRatio": "16:9", "imageSize": "4K"}
  }
}
```

**해상도/비율**
| 해상도 | 비용 (USD) | 비용 (KRW) |
|--------|-----------|-----------|
| 1K | $0.039 | ~57원 |
| 2K | $0.134 | ~194원 |
| 4K | $0.240 | ~348원 |

지원 비율: 16:9, 9:16, 1:1, 4:3, 3:4, 21:9, 3:2, 2:3, 5:4, 4:5

---

### 2. OpenAI Images (GPT-Image-1.5)

**Endpoint**
```
https://api.openai.com/v1/images/generations
```

**인증**: `Authorization: Bearer {API_KEY}` 헤더

**특징**: 최대 32,000자 프롬프트, 스트리밍 partial image 지원

**요청 형식**
```json
{
  "model": "gpt-image-1.5",
  "prompt": "description",
  "size": "1024x1024",
  "response_format": "b64_json",
  "output_format": "png"
}
```

**해상도/비율**
| 해상도 | 비용 (USD) | 비용 (KRW) |
|--------|-----------|-----------|
| 1024x1024 (1:1) | ~$0.02 | ~29원 |
| 1536x1024 (3:2) | ~$0.07 | ~102원 |
| 1024x1536 (2:3) | ~$0.07 | ~102원 |

지원 비율: 1:1, 3:2, 2:3

---

### 3. BytePlus Seedream (4.5)

**Endpoint**
```
https://ark.ap-southeast.bytepluses.com/api/v3/images/generations
```

**인증**: `Authorization: Bearer {API_KEY}` 헤더

**특징**: 최대 14개 참조 이미지, 일관된 캐릭터 생성

**요청 형식**
```json
{
  "model": "seedream-4-5-251128",
  "prompt": "description",
  "size": "2048x2048",
  "response_format": "url"
}
```

**해상도/비율**
| 해상도 | 비용 (USD) | 비용 (KRW) |
|--------|-----------|-----------|
| 2K (2048x2048) | ~$0.04 | ~58원 |
| 4K (4096x4096) | ~$0.08 | ~116원 |

지원 비율: 1:1, 3:2, 4:3, 16:9, 21:9

---

## 프로젝트 구조

```
Nanobanana/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── SPEC.md                    # 이 문서
│
└── src/
    ├── main.tsx               # 앱 진입점
    ├── App.tsx                # 메인 앱 컴포넌트
    ├── index.css              # 전역 스타일
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx         # 헤더 (로고, 토큰 추정기, 설정)
    │   │   ├── MainLayout.tsx     # 메인 레이아웃
    │   │   ├── TokenEstimator.tsx # 토큰/비용 실시간 표시
    │   │   └── index.ts
    │   │
    │   ├── chat/
    │   │   ├── ChatContainer.tsx  # 채팅 메시지 영역
    │   │   ├── ChatMessage.tsx    # 개별 메시지 컴포넌트
    │   │   ├── ChatInput.tsx      # 입력창 (해상도/비율 선택 포함)
    │   │   ├── ImagePreview.tsx   # 첨부 이미지 미리보기
    │   │   └── index.ts
    │   │
    │   ├── generation/
    │   │   ├── ProgressPanel.tsx  # 생성 진행 상황 패널
    │   │   ├── ProgressStep.tsx   # 진행 단계 표시
    │   │   ├── ThoughtProcess.tsx # AI 사고 과정 표시
    │   │   ├── TimeEstimate.tsx   # 경과 시간 표시
    │   │   └── index.ts
    │   │
    │   ├── settings/
    │   │   ├── SettingsPanel.tsx  # 설정 패널 (슬라이드 오버)
    │   │   └── index.ts
    │   │
    │   ├── image/
    │   │   ├── GeneratedImage.tsx # 생성된 이미지 표시
    │   │   ├── ImageDownloader.tsx # 다운로드 버튼
    │   │   └── index.ts
    │   │
    │   └── ui/
    │       ├── Button.tsx         # 버튼 컴포넌트
    │       ├── Input.tsx          # 입력 컴포넌트
    │       ├── Card.tsx           # 카드 컴포넌트
    │       ├── Spinner.tsx        # 로딩 스피너
    │       ├── ProgressBar.tsx    # 진행바
    │       └── index.ts
    │
    ├── hooks/
    │   ├── useImageGeneration.ts  # 이미지 생성 + 스트리밍
    │   └── index.ts
    │
    ├── services/
    │   ├── api/
    │   │   ├── nanoBanana.ts      # Nano Banana API (레거시)
    │   │   ├── gemini.ts          # Gemini 분석 API
    │   │   ├── types.ts           # API 타입 정의 (IImageProvider 등)
    │   │   ├── providerFactory.ts # 프로바이더 팩토리
    │   │   ├── providers/
    │   │   │   ├── google.ts      # Google Nano Banana 프로바이더
    │   │   │   ├── openai.ts      # OpenAI Images 프로바이더
    │   │   │   ├── byteplus.ts    # BytePlus Seedream 프로바이더
    │   │   │   └── index.ts
    │   │   └── index.ts
    │   │
    │   └── download/
    │       ├── imageDownloader.ts # 이미지 다운로드 서비스
    │       └── index.ts
    │
    ├── stores/
    │   ├── settingsStore.ts       # 설정 상태 (API키, 해상도, 비율)
    │   ├── generationStore.ts     # 생성 상태 (진행률, 사고과정)
    │   ├── chatStore.ts           # 채팅 메시지 상태
    │   ├── inputStore.ts          # 현재 입력 상태 (토큰 계산용)
    │   └── index.ts
    │
    └── utils/
        ├── constants.ts           # 상수 정의
        ├── tokenCalculator.ts     # 토큰/비용 계산
        ├── imageUtils.ts          # 이미지 유틸리티
        ├── cn.ts                  # className 유틸리티
        └── index.ts
```

---

## 상태 관리 (Zustand Stores)

### settingsStore
사용자 설정 관리 (localStorage 영속화, 멀티 프로바이더 지원)

```typescript
interface SettingsStore {
  // 멀티 API 키 관리
  apiKeys: {
    google: string
    openai: string
    byteplus: string
  }

  // 현재 선택된 프로바이더
  currentProvider: 'google' | 'openai' | 'byteplus'  // 기본값: 'google'

  // 프로바이더별 설정
  resolution: string                  // 프로바이더별 기본값 적용
  aspectRatio: string                 // 기본값: '16:9'
  model: string                       // 프로바이더별 기본값 적용

  autoDownload: boolean               // 기본값: true
}
```

### generationStore
이미지 생성 진행 상태 관리

```typescript
interface GenerationStore {
  isGenerating: boolean
  currentStep: 'idle' | 'thinking' | 'generating' | 'complete' | 'error'

  // API 응답 데이터
  thoughtTexts: string[]        // 사고 과정 텍스트
  interimImages: string[]       // 중간 이미지 (최대 2개, base64)
  finalImage: string | null     // 최종 이미지 (base64)

  // 시간 추적
  startTime: number
  elapsedTime: number

  // 에러
  error: string | null
}
```

### chatStore
채팅 메시지 히스토리 관리

```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: string[]             // base64 이미지
  timestamp: number
}

interface ChatStore {
  messages: ChatMessage[]
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  clearMessages: () => void
}
```

### inputStore
현재 입력 상태 (토큰 추정용)

```typescript
interface InputStore {
  currentText: string
  currentImages: File[]
  setCurrentText: (text: string) => void
  setCurrentImages: (images: File[]) => void
}
```

---

## 토큰 계산 로직

### 텍스트 토큰 추정
- 영문: ~0.25 토큰/문자 (4문자 = 1토큰)
- 한글: ~0.5 토큰/문자 (2문자 = 1토큰)
- 혼합 텍스트: 언어 비율에 따른 가중 평균

### 이미지 입력 토큰
- 소형 (< 100KB): 258 토큰
- 중형 (100-500KB): 516 토큰
- 대형 (> 500KB): 1,032 토큰

### 비용 계산
- 입력: $2.00 / 1M 토큰
- 출력 이미지: 해상도별 고정 비용
- 환율: 1 USD = 1,450 KRW (근사값)

---

## UI/UX 특징

### 반응형 디자인
- **데스크톱**: 토큰 추정기가 헤더 중앙에 표시
- **모바일**: 토큰 추정기가 헤더 아래 별도 행에 표시

### 색상 테마
- **배경**: gray-950 (거의 검정)
- **카드/패널**: gray-900, gray-800
- **강조색**: blue-500 (주요), yellow-400 (로고), purple-400 (출력)
- **비용 경고**: orange (70원 이상), yellow (150원 이상)

### 입력 방식
- 텍스트 입력 (자동 높이 조절)
- 드래그앤드롭 이미지 업로드
- Ctrl+V 클립보드 붙여넣기
- 해상도/비율 드롭다운 선택

---

## 파일 다운로드 형식

### 이미지 파일
- **형식**: PNG
- **파일명**: `nanobanana_{prompt}_{resolution}_{timestamp}.png`

### 메타데이터 JSON
```json
{
  "prompt": "사용자 프롬프트",
  "resolution": "4K",
  "aspectRatio": "16:9",
  "model": "gemini-3-pro-image-preview",
  "generationTime": 15234,
  "timestamp": "2026-01-28T12:00:00Z",
  "referenceImages": ["base64..."],
  "generatedImage": "base64...",
  "thoughtProcess": ["사고 과정 1", "사고 과정 2"]
}
```

---

## 환경 변수

```env
# .env.local (gitignore에 포함)
VITE_GOOGLE_AI_API_KEY=your_api_key_here
```

> 참고: API 키는 설정 패널에서도 입력 가능하며, localStorage에 저장됩니다.

---

## 개발 명령어

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview

# 타입 체크
npm run typecheck
```

---

## 버전 정보

- **문서 작성일**: 2026-01-28
- **React**: 19.x
- **Vite**: 7.x
- **Tailwind CSS**: 4.x
- **Zustand**: 5.x
