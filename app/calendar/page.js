'use client';
import { useState, useEffect, useMemo } from 'react';

export default function CalendarPage() {
    const [posts, setPosts] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        fetch('/api/posts').then(r => r.json()).then(d => {
            if (d.success) setPosts(d.posts);
        });
    }, []);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevDays = new Date(year, month, 0).getDate();
        const days = [];

        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: prevDays - i, current: false, date: new Date(year, month - 1, prevDays - i) });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, current: true, date: new Date(year, month, i) });
        }
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({ day: i, current: false, date: new Date(year, month + 1, i) });
        }
        return days;
    }, [year, month]);

    const getPostsForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return posts.filter(p => {
            const created = new Date(p.createdAt).toISOString().split('T')[0];
            const scheduled = p.scheduledAt ? new Date(p.scheduledAt).toISOString().split('T')[0] : null;
            return created === dateStr || scheduled === dateStr;
        });
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const statusColors = {
        draft: 'var(--text-muted)',
        ready: 'var(--info)',
        scheduled: 'var(--accent-secondary)',
        published: 'var(--success)',
    };

    const prevMonth = () => setCurrentDate(new Date(year, month - 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1));
    const goToday = () => setCurrentDate(new Date());

    const selectedDatePosts = selectedDate ? getPostsForDate(selectedDate) : [];

    return (
        <div>
            <div className="page-header">
                <h2>📅 콘텐츠 캘린더</h2>
                <p>발행 스케줄을 한눈에 관리하세요</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
                {/* Calendar Grid */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>◀</button>
                        <h3 style={{ fontSize: 18, fontWeight: 700 }}>
                            {year}년 {month + 1}월
                        </h3>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost btn-sm" onClick={goToday}>오늘</button>
                            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>▶</button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                            <div key={d} style={{ textAlign: 'center', padding: 8, fontSize: 12, fontWeight: 600, color: d === '일' ? 'var(--error)' : d === '토' ? 'var(--info)' : 'var(--text-secondary)' }}>{d}</div>
                        ))}
                        {calendarDays.map((item, i) => {
                            const dayPosts = getPostsForDate(item.date);
                            const isSelected = selectedDate && item.date.toDateString() === selectedDate.toDateString();
                            return (
                                <div key={i} onClick={() => setSelectedDate(item.date)} style={{
                                    padding: 6, minHeight: 80, borderRadius: 8, cursor: 'pointer',
                                    background: isSelected ? 'rgba(168,85,247,0.15)' : isToday(item.date) ? 'rgba(59,130,246,0.1)' : 'var(--bg-tertiary)',
                                    border: isSelected ? '1px solid var(--accent-primary)' : isToday(item.date) ? '1px solid var(--info)' : '1px solid transparent',
                                    opacity: item.current ? 1 : 0.3, transition: 'all 0.15s',
                                }}>
                                    <div style={{ fontSize: 12, fontWeight: isToday(item.date) ? 700 : 400, color: i % 7 === 0 ? 'var(--error)' : i % 7 === 6 ? 'var(--info)' : 'var(--text-primary)', marginBottom: 4 }}>
                                        {item.day}
                                    </div>
                                    {dayPosts.slice(0, 3).map((p) => (
                                        <div key={p.id} style={{ fontSize: 9, padding: '1px 4px', marginBottom: 2, borderRadius: 3, background: statusColors[p.status] + '20', color: statusColors[p.status], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {p.title?.slice(0, 10) || '무제'}
                                        </div>
                                    ))}
                                    {dayPosts.length > 3 && <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>+{dayPosts.length - 3}</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Side Panel */}
                <div className="card">
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
                        {selectedDate ? `${selectedDate.getMonth() + 1}/${selectedDate.getDate()} 게시물` : '날짜를 선택하세요'}
                    </h3>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                        {[
                            { label: '이번 달 작성', count: posts.filter(p => new Date(p.createdAt).getMonth() === month && new Date(p.createdAt).getFullYear() === year).length, color: 'var(--accent-primary)' },
                            { label: '예약 대기', count: posts.filter(p => p.status === 'scheduled').length, color: 'var(--accent-secondary)' },
                            { label: '발행 완료', count: posts.filter(p => p.status === 'published').length, color: 'var(--success)' },
                            { label: '초안', count: posts.filter(p => p.status === 'draft').length, color: 'var(--text-muted)' },
                        ].map((s) => (
                            <div key={s.label} style={{ padding: 10, background: 'var(--bg-tertiary)', borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.count}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Selected date posts */}
                    {selectedDate && (
                        selectedDatePosts.length > 0 ? (
                            <div className="posts-list">
                                {selectedDatePosts.map((p) => (
                                    <div key={p.id} className="post-card">
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.title || '무제'}</div>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <span className={`status-badge status-${p.status}`}>{p.status}</span>
                                                {p.seoScore > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>SEO {p.seoScore}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>게시물이 없습니다</p>
                        )
                    )}

                    <a href="/editor" className="btn btn-primary" style={{ marginTop: 12, textAlign: 'center', display: 'block', textDecoration: 'none' }}>✏️ 새 글 작성</a>
                </div>
            </div>
        </div>
    );
}
