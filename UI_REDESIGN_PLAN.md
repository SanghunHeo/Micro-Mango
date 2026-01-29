# Micro Mango UI 재설계 계획

Midjourney 스타일의 레이아웃을 참고한 전반적 UI 수정 계획입니다.

## 현재 구조 vs 목표 구조

### 현재 구조
```
┌─────────────────────────────────────┐
│ Header (Logo + Prompt Input + Settings)
├─────────────────────────────────────┤
│                                     │
│   QueueList (세로 리스트 형태)        │
│                                     │
└─────────────────────────────────────┘
```

### 목표 구조 (Midjourney 스타일)
```
┌────────┬────────────────────────────┐
│        │  Prompt Input Area         │
│ Side   ├────────────────────────────┤
│ bar    │                            │
│        │   Image Gallery            │
│        │   (Masonry Grid)           │
│        │                            │
└────────┴────────────────────────────┘
```

---

## Phase 1: 사이드바 네비게이션 추가

### 1.1 새 컴포넌트 생성: `Sidebar.tsx`

**위치:** `src/components/layout/Sidebar.tsx`

**구성 요소:**
- 로고 영역 (상단)
- 메인 네비게이션
  - Create (현재 활성 탭)
  - Gallery (생성된 이미지 갤러리)
  - History (생성 기록)
- 설정 영역
  - Provider 선택
  - Settings 버튼
- 사용량 정보 (하단)
  - 오늘 생성량
  - 비용 표시

**스타일:**
- 너비: 240px (데스크톱), 접기 가능
- 배경: `bg-gray-900`
- 테두리: `border-r border-gray-800`

### 1.2 레이아웃 수정

**App.tsx 변경:**
```tsx
<div className="h-screen flex bg-gray-950">
  <Sidebar />
  <div className="flex-1 flex flex-col">
    <PromptArea />
    <MainContent />
  </div>
</div>
```

---

## Phase 2: 프롬프트 입력 영역 재설계

### 2.1 Header → PromptArea 분리

**현재:** Header 컴포넌트에 모든 것이 포함됨
**목표:** 프롬프트 입력을 독립 컴포넌트로 분리

**새 컴포넌트:** `src/components/prompt/PromptArea.tsx`

**디자인:**
```
┌──────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │  멀티라인 프롬프트 입력                      │  │
│  │  (여러 줄 입력 가능, 자동 높이 조절)          │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  [📎 이미지 첨부] [⚙️ 옵션] [📐 비율]    [✨ Create] │
└──────────────────────────────────────────────────┘
```

**특징:**
- 멀티라인 텍스트 입력 (더 큰 영역)
- 참조 이미지 썸네일 표시
- 옵션 버튼들 하단 배치
- Create 버튼 우측 정렬

### 2.2 옵션 UI 개선

**옵션 패널 (드롭다운 → 인라인):**
- Resolution: 칩(Chip) 형태로 선택
- Aspect Ratio: 아이콘+라벨 버튼
- Provider: 드롭다운 유지 또는 사이드바로 이동

---

## Phase 3: 갤러리 레이아웃 개선

### 3.1 Masonry Grid 레이아웃

**현재:** 세로 리스트 (`QueueList.tsx`)
**목표:** Masonry 그리드 레이아웃

**구현 방식:**
1. CSS Grid + `grid-auto-rows` 사용
2. 또는 `react-masonry-css` 라이브러리 활용

**새 컴포넌트:** `src/components/gallery/MasonryGallery.tsx`

```tsx
// CSS Grid 기반 Masonry
<div className="columns-2 md:columns-3 lg:columns-4 gap-4">
  {items.map(item => (
    <GalleryCard key={item.id} item={item} />
  ))}
</div>
```

### 3.2 GalleryCard 재설계

**현재 ImageCard 개선:**
- 호버 시 오버레이 효과
- 프롬프트 텍스트 표시 (이미지 위)
- 다운로드/삭제 버튼 우상단
- 생성 중 상태 표시 개선

**호버 효과:**
```
┌─────────────────┐
│                 │
│    [Image]      │
│                 │
├─────────────────┤  ← 호버 시 나타남
│ "prompt text"   │
│ 1024x1024 • 12s │
└─────────────────┘
```

---

## Phase 4: 색상 테마 개선

### 4.1 색상 팔레트 업데이트

**현재:**
- 배경: `gray-950`, `gray-900`
- 텍스트: `gray-400`, `white`
- 액센트: `yellow-400`, `orange-500`

**개선:**
```css
:root {
  --bg-primary: #0a0a0a;      /* 더 깊은 검정 */
  --bg-secondary: #141414;    /* 카드 배경 */
  --bg-tertiary: #1e1e1e;     /* 입력 필드 */
  --border: #2a2a2a;          /* 테두리 */
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --text-muted: #666666;
  --accent: #f59e0b;          /* 망고 컬러 유지 */
  --accent-hover: #fbbf24;
}
```

### 4.2 그라데이션 및 글로우 효과

- Create 버튼: 망고 색상 그라데이션 유지
- 입력 필드 포커스: 미묘한 글로우 효과
- 호버 상태: 부드러운 트랜지션

---

## Phase 5: 반응형 디자인

### 5.1 브레이크포인트

| 화면 크기 | 사이드바 | 갤러리 열 |
|----------|---------|----------|
| < 640px  | 숨김    | 1열      |
| 640-1024px | 접힘(아이콘만) | 2열 |
| > 1024px | 펼침    | 3-4열    |

### 5.2 모바일 최적화

- 사이드바: 햄버거 메뉴로 전환
- 프롬프트: 하단 고정 또는 풀스크린 모달
- 갤러리: 단일 열 레이아웃

---

## Phase 6: 추가 기능

### 6.1 빠른 필터/정렬

**갤러리 상단 툴바:**
- 필터: 전체 / 생성 중 / 완료 / 오류
- 정렬: 최신순 / 오래된순
- 검색: 프롬프트 검색

### 6.2 키보드 단축키

| 단축키 | 기능 |
|-------|------|
| `Ctrl+Enter` | 생성 시작 |
| `Ctrl+V` | 이미지 붙여넣기 |
| `Esc` | 모달/드롭다운 닫기 |
| `/` | 프롬프트 입력 포커스 |

---

## 구현 우선순위

### High Priority (핵심)
1. ✅ Phase 2: 프롬프트 입력 영역 개선
2. ✅ Phase 3: Masonry 갤러리 레이아웃

### Medium Priority (UX 개선)
3. Phase 1: 사이드바 네비게이션
4. Phase 4: 색상 테마 개선

### Low Priority (추가 기능)
5. Phase 5: 반응형 개선
6. Phase 6: 필터/단축키

---

## 파일 변경 목록

### 신규 생성
- `src/components/layout/Sidebar.tsx`
- `src/components/prompt/PromptArea.tsx`
- `src/components/gallery/MasonryGallery.tsx`
- `src/components/gallery/GalleryCard.tsx`

### 수정
- `src/App.tsx` - 레이아웃 구조 변경
- `src/components/layout/MainLayout.tsx` - 사이드바 통합
- `src/components/layout/Header.tsx` - 축소 또는 제거
- `src/components/gallery/ImageCard.tsx` - GalleryCard로 대체

### 삭제 가능
- `src/components/gallery/QueueList.tsx` - MasonryGallery로 대체
- `src/components/gallery/QueueItemRow.tsx` - 통합

---

## 참고: Midjourney UI 핵심 특징

1. **좌측 사이드바**: 네비게이션 + 설정이 분리됨
2. **넓은 프롬프트 입력**: 상단 중앙, 멀티라인 지원
3. **Masonry 갤러리**: 가변 높이 이미지 그리드
4. **어두운 테마**: 깊은 검정 배경, 미묘한 테두리
5. **호버 인터랙션**: 이미지 위에 정보 오버레이
