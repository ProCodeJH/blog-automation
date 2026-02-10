# 📖 BlogFlow v6.0 — 사용 가이드

> AI 블로그 자동화 시스템 완전 가이드

---

## 📋 목차
1. [시작하기](#-시작하기)
2. [대시보드](#-대시보드)
3. [글 작성 (에디터)](#-글-작성-에디터)
4. [게시물 관리](#-게시물-관리)
5. [AI 플래너](#-ai-플래너)
6. [캘린더](#-캘린더)
7. [댓글 관리](#-댓글-관리)
8. [분석](#-분석)
9. [유튜브](#-유튜브)
10. [설정](#-설정)
11. [자동화 (GitHub Actions)](#-자동화)
12. [배포](#-배포)
13. [API 레퍼런스](#-api-레퍼런스)

---

## 🚀 시작하기

### 필수 요구사항
- Node.js 18+
- npm

### 설치

```bash
git clone https://github.com/ProCodeJH/blog-automation.git
cd blog-automation
npm install
```

### 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성:

```env
# 필수: AI 글 생성에 사용
GEMINI_API_KEY=your_gemini_api_key

# 선택: Google Analytics 연동
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

> 💡 Gemini API 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 발급받을 수 있습니다.

### 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## 🏠 대시보드

메인 페이지에서 전체 현황을 한눈에 확인할 수 있습니다.

### 표시 항목
- 📝 총 게시물 수
- ✅ 발행 완료
- 📅 예약 게시물
- 📊 평균 SEO 점수
- 📷 총 이미지 수
- 최근 게시물 목록

---

## ✏️ 글 작성 (에디터)

### 기본 사용법

1. **사이드바 → ✏️ 글 작성** 클릭
2. 제목과 러프한 본문 입력
3. **톤** 선택: 친근한 / 전문적 / 유머러스 / 설득적 등
4. **카테고리** 선택: 맛집, 여행, IT, 뷰티 등
5. **🚀 AI 생성** 버튼 클릭
6. AI가 파워블로거 스타일로 자동 변환

### AI 생성 옵션
| 옵션 | 설명 |
|------|------|
| 톤 | 글의 분위기 (8종) |
| 카테고리 | 블로그 주제 (10종+) |
| 이미지 최적화 | 첨부 이미지에 alt 태그 자동 생성 |
| SEO 최적화 | 메타 설명, 키워드 자동 추천 |

### v5 도구바 (AI 생성 후 활성화)

| 버튼 | 기능 |
|------|------|
| 📱 **SNS 리퍼포징** | 블로그 글을 인스타/트위터/링크드인/쓰레드/유튜브 형식으로 자동 변환 |
| 👁️ **플랫폼 미리보기** | 네이버/티스토리/Velog/WordPress에서 어떻게 보일지 미리보기 |
| 🎨 **AI 썸네일** | SVG 기반 썸네일 자동 생성 (5가지 스타일) |
| 📜 **버전 히스토리** | 이전 수정 버전 확인 및 복원 |

### AI 썸네일 스타일

| 스타일 | 테마 |
|--------|------|
| `modern` | 보라-파랑 그라데이션, 다크 배경 |
| `warm` | 오렌지-레드 톤, 따뜻한 느낌 |
| `nature` | 그린-시안, 자연 테마 |
| `ocean` | 블루-시안, 바다 테마 |
| `minimal` | 화이트 배경, 미니멀 디자인 |

### 발행

- **저장**: 임시저장 (draft)
- **발행**: 즉시 발행 (published)
- **예약**: 날짜/시간 설정 후 자동 발행
- **플랫폼 동시 발행**: WordPress, 티스토리 동시 게시

### 네이버 블로그 발행

네이버는 API를 제공하지 않아 아래 방식으로 지원합니다:
1. 에디터에서 **발행 → 네이버** 선택
2. 시스템이 **스마트에디터 호환 HTML** 자동 생성
3. **클립보드에 복사** 버튼 클릭
4. 네이버 블로그 에디터에 붙여넣기

---

## 📋 게시물 관리

### 기능
- **검색**: 제목, 내용, 태그로 검색
- **필터**: 상태(전체/발행/시저장/예약), 카테고리, 톤 필터
- **벌크 작업**: 여러 게시물 선택 후 일괄 삭제/상태 변경
- **가져오기/내보내기**: CSV, JSON 형식 지원

### 벌크 임포트 (CSV)

CSV 파일 형식:
```csv
title,content,category,tags,status
"첫 번째 글","본문 내용","기술","AI,개발",draft
"두 번째 글","본문 내용","여행","제주,맛집",published
```

### 벌크 임포트 (JSON)
```json
[
  {
    "title": "글 제목",
    "rawText": "러프한 본문",
    "category": "기술",
    "tags": ["AI", "개발"],
    "status": "draft"
  }
]
```

---

## 🧠 AI 플래너

주제 추천 및 글 기획을 AI가 도와줍니다.

1. 관심 분야 키워드 입력
2. AI가 블로그 주제 자동 추천
3. 주제 선택 → 바로 에디터로 이동

---

## 📅 캘린더

- 월/주/일 단위 일정 확인
- 게시물 예약 내용 캘린더에 표시
- 직접 날짜 클릭해서 새 글 예약

---

## 💬 댓글 관리 (v6 신규)

### 기능
- **자동 감정 분석**: 긍정 😊 / 부정 😟 / 중립 😐 / 스팸 🚫
- **스팸 자동 필터링**: 광고성 키워드 자동 감지
- **필터별 조회**: 전체 / 긍정만 / 부정만 / 스팸만
- **답글 시스템**: 댓글에 직접 답글 작성
- **통계 대시보드**: 감정 분석 비율 차트

### 스팸 감지 키워드
광고, 홍보, 클릭, 무료, 당첨, 바로가기, click here, free, winner 등

### 감정 분석 키워드
- **긍정**: 감사, 좋아, 훌륭, 최고, 추천, 도움, 유용 등
- **부정**: 별로, 나쁜, 실망, 최악, 불만 등

---

## 📊 분석

### 기본 KPI
| 지표 | 설명 |
|------|------|
| 총 게시물 | 전체 글 수 |
| 발행 완료 | published 상태 글 수 |
| 예약 | scheduled 상태 글 수 |
| 평균 SEO | 전체 글의 평균 SEO 점수 |
| 총 이미지 | 모든 글에 포함된 이미지 수 |
| 주간 작성 | 최근 7일간 작성한 글 수 |

### 차트
- 주간/월간 작성 추이 (막대 그래프)
- 상태 분포 (파이 차트)
- SEO 점수 분포
- 카테고리/톤 분석

### 데이터 내보내기
- **📤 JSON**: 상세 분석 데이터
- **📤 CSV**: 엑셀 호환 형식

### Google Analytics 연동 (v6 신규)
1. [Google Analytics](https://analytics.google.com)에서 GA4 속성 생성
2. **Measurement ID** 복사 (형식: `G-XXXXXXXXXX`)
3. 설정 페이지에서 입력
4. `.env.local`에 추가: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`
5. 서버 재시작

### SEO 자동 점검 (v6 신규)
- **자동**: 매주 월요일 GitHub Actions으로 자동 실행
- **수동**: `node scripts/seo-report.js`
- 리포트 저장 위치: `data/seo-reports/`
- 분석 항목: 제목 길이, 메타 설명, 콘텐츠 길이, 태그, 이미지, 소제목000, 키워드 밀도

---

## 🎬 유튜브

### 사전 설정
1. [Google Cloud Console](https://console.cloud.google.com)에서 프로젝트 생성
2. YouTube Data API v3 활성화
3. OAuth 2.0 클라이언트 생성
4. 설정 페이지에서 Client ID, Client Secret, Access Token 입력

### 사용법
1. **영상 파일** 업로드 (드래그&드롭)
2. 제목, 설명, 태그 입력
3. 🤖 **AI 생성** 버튼으로 메타데이터 자동 생성
4. 카테고리, 공개 설정 선택
5. **업로드** 클릭

---

## ⚙️ 설정

### API 키 관리
| 항목 | 설명 |
|------|------|
| 🔑 Gemini API 키 | AI 글 생성에 필수 |
| 📊 GA4 Measurement ID | Google Analytics 연동 (선택) |

### 플랫폼 연동 상태
| 플랫폼 | 연동 방식 | 상태 표시 |
|--------|----------|----------|
| WordPress | REST API (URL + 사용자명 + App Password) | 🟢/🔴 |
| 티스토리 | Open API (Access Token + 블로그명) | 🟢/🔴 |
| YouTube | Data API v3 (OAuth 2.0) | 🟢/🔴 |
| 네이버 | HTML 생성 + 클립보드 복사 | 🟢 항상 사용 가능 |

### 테마
- 🌙 다크 모드 (기본)
- ☀️ 라이트 모드

### AI 프롬프트 커스터마이징
마스터 프롬프트에 추가 지시사항을 작성하여 AI 글 생성 스타일 커스터마이징 가능

---

## 🤖 자동화

### 매일 글 자동 생성

GitHub Actions가 매일 자동으로 블로그 글을 생성합니다.

**설정:**
1. GitHub 레포 → Settings → Secrets → Actions
2. `GEMINI_API_KEY` 시크릿 추가
3. 워크플로우 파일: `.github/workflows/auto-post.yml`

**내용:**
- 20개 AI 도구 DB에서 랜덤 선택
- 5가지 글 유형: 리뷰, 비교, 가이드, 팁, 뉴스
- Markdown + JSON 이중 저장
- 매일 오전 9시(KST) 실행

**수동 실행:**
```bash
node scripts/generate-post.js
```

### 주간 SEO 리포트

매주 월요일 자동으로 전체 게시물 SEO 점검:

**워크플로우:** `.github/workflows/seo-report.yml`

**분석 항목 & 점수 배분:**
| 항목 | 최대 점수 | 기준 |
|------|---------|------|
| 제목 길이 | 15점 | 10~60자 |
| 메타 설명 | 15점 | 50자 이상 |
| 콘텐츠 길이 | 15점 | 1000자 이상 |
| 태그 | 10점 | 3개 이상 |
| 이미지 | 10점 | 1개 이상 |
| 카테고리 | 10점 | 설정 여부 |
| 소제목 구조 | 10점 | H2/H3 2개 이상 |
| 내부 링크 | 5점 | 1개 이상 |
| 키워드 밀도 | 10점 | 제목 키워드 본문 등장 |

**수동 실행:**
```bash
node scripts/seo-report.js
```

---

## 📦 배포

### Vercel 배포 (추천)

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 로그인
vercel login

# 3. 배포
vercel

# 4. 프로덕션 배포
vercel --prod
```

**또는 GitHub 연동:**
1. [Vercel Dashboard](https://vercel.com) 접속
2. **New Project** → GitHub 레포 연결
3. **Environment Variables** 설정:
   - `GEMINI_API_KEY` = 발급받은 키
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID` = GA4 ID (선택)
4. **Deploy** 클릭

### 자체 호스팅

```bash
npm run build
npm start
# 기본 포트: 3000
```

---

## 🔌 API 레퍼런스

### 게시물
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/posts` | 전체 게시물 조회 |
| GET | `/api/posts?history={id}` | 버전 히스토리 조회 |
| POST | `/api/posts` | 게시물 저장/수정 |
| DELETE | `/api/posts?id={id}` | 게시물 삭제 |

### AI
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/ai/generate` | AI 글 생성 |
| POST | `/api/ai/repurpose` | SNS 리퍼포징 |
| POST | `/api/ai/image-gen` | AI 썸네일 생성 |

### 댓글
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/comments` | 댓글 조회 (filter: all/positive/negative/spam) |
| POST | `/api/comments` | 댓글 추가/답글 |
| DELETE | `/api/comments?id={id}` | 댓글 삭제 |

### 발행
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/publish` | 플랫폼별 발행 (wordpress/tistory/naver) |

### 기타
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/seo` | SEO 분석 |
| GET | `/api/rss` | RSS 피드 (XML) |
| POST | `/api/import` | 벌크 임포트 (CSV/JSON) |
| POST | `/api/upload` | 이미지 업로드 |

---

## 🆘 문제 해결

### "Gemini API 키가 없습니다"
→ 설정 페이지에서 API 키 입력 또는 `.env.local`에 `GEMINI_API_KEY` 추가

### 빌드 에러
```bash
rm -rf .next node_modules
npm install
npm run build
```

### 네이버 붙여넣기가 안 됨
→ 네이버 블로그 에디터에서 **HTML 모드**로 전환 후 붙여넣기

### 티스토리 발행 실패
→ Access Token 만료 여부 확인. [티스토리 API 관리](https://www.tistory.com/guide/api/manage/register)에서 재발급

---

**BlogFlow v6.0** · Made with ❤️ and AI
