import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'BlogFlow - AI 블로그 편집 시스템',
  description: '러프한 글과 사진을 파워블로거 스타일로 변환하는 AI 편집 플랫폼',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
