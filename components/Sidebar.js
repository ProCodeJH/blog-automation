'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { href: '/', icon: '📊', label: '대시보드' },
        { href: '/editor', icon: '✏️', label: '글 작성하기' },
        { href: '/posts', icon: '📋', label: '게시물 관리' },
        { href: '/settings', icon: '⚙️', label: '설정' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-brand-icon">✍️</div>
                <div className="sidebar-brand-text">
                    <h1>BlogFlow</h1>
                    <span>AI 편집 시스템</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section-label">메뉴</div>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span className="sidebar-link-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-status">
                    <span className="status-dot"></span>
                    Gemini AI 연결됨
                </div>
            </div>
        </aside>
    );
}
