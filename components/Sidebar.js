'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const navItems = [
        { href: '/', icon: '🏠', label: '대시보드' },
        { href: '/editor', icon: '✏️', label: '글 작성' },
        { href: '/posts', icon: '📋', label: '게시물 관리' },
        { href: '/calendar', icon: '📅', label: '캘린더' },
        { href: '/analytics', icon: '📊', label: '분석' },
        { href: '/youtube', icon: '🎬', label: '유튜브' },
        { href: '/settings', icon: '⚙️', label: '설정' },
    ];

    return (
        <>
            {/* Mobile toggle */}
            <button className="mobile-menu-btn" onClick={() => setIsMobileOpen(!isMobileOpen)} aria-label="메뉴">
                {isMobileOpen ? '✕' : '☰'}
            </button>

            {/* Overlay */}
            {isMobileOpen && <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />}

            <aside className={`sidebar ${isMobileOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <div className="brand-icon">✦</div>
                    <div>
                        <div className="brand-name">BlogFlow</div>
                        <div className="brand-tagline">AI 파워블로거 에디터</div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`} onClick={() => setIsMobileOpen(false)}>
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="ai-status">
                        <div className="ai-status-dot connected"></div>
                        <span>Gemini AI 연결됨</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>v2.0 · Phase 20+</div>
                </div>
            </aside>
        </>
    );
}
