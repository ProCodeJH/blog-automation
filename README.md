# BlogFlow - AI 블로그 편집 시스템

> 러프한 글과 사진을 파워블로거 스타일로 변환하는 AI 편집 플랫폼

## ✨ 특징

- 🤖 **AI 편집자**: Gemini AI가 러프 초안을 파워블로거 스타일로 변환
- 📷 **다중 이미지**: 드래그앤드롭으로 순서 변경, 자동 본문 배치
- 🔍 **SEO 자동 최적화**: 키워드 분석, 메타 태그, 해시태그 자동 생성
- 🎨 **톤 선택**: 친근/전문/유머/감성 4가지 스타일
- 📤 **멀티 플랫폼**: WordPress, 네이버, 티스토리, 벨로그 발행

## 🛠️ 기술 스택

- **Framework**: Next.js 15
- **AI**: Google Gemini API
- **Design**: Premium Dark Theme
- **Storage**: JSON File (경량 로컬 DB)

## 🚀 시작하기

```bash
npm install
```

`.env.local`에 Gemini API 키 설정:
```
GEMINI_API_KEY=your_api_key_here
```

개발 서버 실행:
```bash
npm run dev
```

http://localhost:3000 접속

## 📁 프로젝트 구조

```
blog-automation/
├── app/
│   ├── page.js              # 대시보드
│   ├── editor/page.js       # 글 에디터 (핵심)
│   ├── posts/page.js        # 게시물 관리
│   ├── settings/page.js     # 플랫폼 설정
│   └── api/                 # API 라우트
├── lib/
│   ├── gemini.js            # Gemini AI 클라이언트
│   └── prompts.js           # 파워블로거 프롬프트 엔진
├── components/
│   └── Sidebar.js           # 사이드바 네비게이션
└── public/uploads/          # 업로드 이미지
```

## 📄 라이선스

MIT License

Made with 💜 by Jahyeon & Antigravity AI
