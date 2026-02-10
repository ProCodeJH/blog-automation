'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const saved = localStorage.getItem('blogflow-theme') || 'dark';
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    const toggle = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('blogflow-theme', next);
        document.documentElement.setAttribute('data-theme', next);
    };

    return (
        <button onClick={toggle} className="theme-toggle" title="테마 전환" aria-label="테마 전환">
            {theme === 'dark' ? '☀️' : '🌙'}
        </button>
    );
}
