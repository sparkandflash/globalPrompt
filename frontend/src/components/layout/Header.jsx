import { useState, useEffect } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Search } from "lucide-react"
import api from '../../api'
import { PROJECT_NAME } from '../../config'

export const Header = () => {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('auth_token'));
    const [unreadCount, setUnreadCount] = useState(0);

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        window.dispatchEvent(new Event('authChange'));
        setIsLoggedIn(false);
        navigate('/login');
    };

    useEffect(() => {
        const checkAuth = () => {
            setIsLoggedIn(!!localStorage.getItem('auth_token'));
        };
        window.addEventListener('storage', checkAuth);
        window.addEventListener('authChange', checkAuth);
        checkAuth();
        return () => {
            window.removeEventListener('storage', checkAuth);
            window.removeEventListener('authChange', checkAuth);
        };
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            api.get('/notifications')
                .then(res => {
                    if (res.data) {
                        setUnreadCount(res.data.filter(n => !n.read).length);
                    }
                })
                .catch(err => console.error('Failed to grab unread notifications count:', err));
        } else {
            setUnreadCount(0);
        }
    }, [isLoggedIn]);

    const handleSearch = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const query = formData.get('search');
        if (query && query.trim()) {
            if (isLoggedIn) {
                navigate(`/?q=${encodeURIComponent(query.trim())}`);
            } else {
                navigate(`/search?q=${encodeURIComponent(query.trim())}`);
            }
        }
    };

    // Shared border thickness (px) — single source of truth
    const borderWeight = '3.5px';
    const borderColor = 'currentColor'; // inherits text color (foreground)

    return (
        <header className="w-full bg-background shrink-0">
            {/* Row 1: Centered Logo */}
            <div className="flex items-center justify-center px-6 md:px-10 pt-4 pb-1">
                <RouterLink to="/" className="text-2xl font-extrabold tracking-tight text-foreground">
                    {PROJECT_NAME}
                </RouterLink>
            </div>
{!isLoggedIn && (
    <div className="flex items-center justify-center px-6 md:px-10 pt-4 pb-1">
        </div>
)
    }
            {/* Row 2: Left links + search diamond + Right links */}
            <div className="flex items-center justify-between px-2 md:px-2 pb-0 -mb-4">
                {/* Left nav links */}
                <nav className="flex items-center gap-2 text-sm font-medium whitespace-nowrap hidden min-[900px]:flex">
                    {isLoggedIn && (
                        <>
                            <RouterLink to="/docs" className="hover:text-primary transition-colors">Docs</RouterLink>
                            <span className="text-muted-foreground">•</span>
                            <RouterLink to="/" className="hover:text-primary transition-colors">Home</RouterLink>
                            <span className="text-muted-foreground">•</span>
                            <RouterLink to="/create-registry" className="hover:text-primary transition-colors">New Registry</RouterLink>
                            <span className="text-muted-foreground">•</span>
                            <RouterLink to="/create-prompt" className="hover:text-primary transition-colors">New prompt</RouterLink>
                        </>
                    )}
                </nav>

                {/* Spacer — search bar is in the border row below */}
                <div />

                {/* Right nav links */}
                <nav className="flex items-center gap-2 text-sm font-medium whitespace-nowrap hidden min-[900px]:flex">
                    {isLoggedIn && (
                        <>
                            <RouterLink to="/notifications" className="hover:text-primary transition-colors">
                                Notifications{unreadCount > 0 ? `(${unreadCount})` : ''}
                            </RouterLink>
                            <span className="text-muted-foreground">•</span>
                            <RouterLink to="/profile" className="hover:text-primary transition-colors">Profile</RouterLink>
                            <span className="text-muted-foreground">•</span>
                            <RouterLink to="/settings" className="hover:text-primary transition-colors">Settings</RouterLink>
                            <span className="text-muted-foreground">•</span>
                            <button onClick={handleLogout} className="hover:text-primary transition-colors">Logout</button>
                        </>
                    )}
                </nav>
            </div>

            {/* Row 2: The search-as-border — 3 flex children, vertically centered */}
            <div className="flex items-center w-full">
                {/* Left line */}
                <div
                    className="flex-1"
                    style={{ height: borderWeight, backgroundColor: borderColor }}
                />

                {/* Search box — SVG diamond/lens shape */}
                <div
                    className="relative shrink-0"
                    style={{
                        minWidth: '200px',
                        width: '30vw',
                        maxWidth: '420px',
                        height: '40px',
                    }}
                >
                    {/* SVG diamond outline — straight-edged with rounded corners */}
                    <svg
                        className="absolute inset-0 w-full h-full"
                        viewBox="0 0 400 40"
                        preserveAspectRatio="none"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                    >
                        <polygon
                            points="0,20 40,2 360,2 400,20 360,38 40,38"
                            fill="var(--background, white)"
                        />
                    </svg>

                    {/* Input on top of SVG */}
                    <form onSubmit={handleSearch} className="absolute inset-0 flex items-center gap-2 px-10 z-10">
                        <Search className="h-4 w-4 text-muted-foreground stroke-[2] shrink-0" />
                        <input
                            type="search"
                            name="search"
                            placeholder="Search..."
                            className="w-full bg-transparent outline-none text-sm italic text-foreground placeholder:text-muted-foreground/50"
                        />
                    </form>
                </div>

                {/* Right line */}
                <div
                    className="flex-1"
                    style={{ height: borderWeight, backgroundColor: borderColor }}
                />
            </div>

            {/* Small spacer so search bar bottom half doesn't clip into content */}
            <div className="h-1" />
        </header>
    );
};
