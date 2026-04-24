import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    HiOutlineHome,
    HiOutlineClipboardDocumentList,
    HiOutlineCurrencyDollar,
    HiOutlineChatBubbleLeftRight,
    HiOutlineArrowRightOnRectangle,
    HiOutlineUser,
    HiOutlineMegaphone,
    HiOutlineMoon,
    HiOutlineSun,
    HiOutlineMapPin,
    HiOutlineCog6Tooth
} from 'react-icons/hi2';
import logo from '../assets/idHsN22NWk_logos.png';
import { useAuth } from '../context/AuthContext';

const StudentNavigationBar = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
    const [unreadCount, setUnreadCount] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const fetchUnread = async () => {
            if (!user?.token) return;
            try {
                const res = await fetch('/api/complaints/unread-counts', {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setUnreadCount(data.data.studentUnread || 0);
                }
            } catch (err) {
                console.error('Error fetching unread count:', err);
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 2000); // Poll every 2s // Poll every 30 seconds
        
        const handleRefresh = () => fetchUnread();
        window.addEventListener('nmh_unread_refresh', handleRefresh);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('nmh_unread_refresh', handleRefresh);
        };
    }, [user?.token]);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

    const navItems = [
        { to: '/student', icon: HiOutlineHome, label: 'Dashboard' },
        { to: '/student/in-out', icon: HiOutlineMapPin, label: 'In & Out' },
        { to: '/student/applications', icon: HiOutlineClipboardDocumentList, label: 'Applications' },
        { to: '/student/payments', icon: HiOutlineCurrencyDollar, label: 'Payments' },
        { to: '/student/chats', icon: HiOutlineChatBubbleLeftRight, label: 'Complaints', badge: unreadCount },
        { to: '/student/settings', icon: HiOutlineCog6Tooth, label: 'Settings' }
    ];

    return (
        <header className={`nav-bar ${isScrolled ? 'scrolled' : ''}`}>
            <div className="nav-container">
                <div className="nav-logo-section">
                    <img src={logo} alt="SLIIT" className="nav-logo-img" />
                    <div className="hidden sm:block">
                        <div className="nav-title">SLIIT Kandy <span className="text-[#FAB95B]">UNI</span></div>
                        <div className="nav-subtitle text-white/40">Student Portal</div>
                    </div>
                </div>

                <nav className="nav-links">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-link relative ${isActive ? 'active' : ''}`}
                            end
                        >
                            <span className="icon">
                                <item.icon />
                            </span>
                            <span className="label text-xs sm:text-[13px]">{item.label}</span>
                            {item.badge > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1.5 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 z-10 border-2 border-primary dark:border-slate-900 leading-none">
                                    {item.badge}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="nav-actions">
                    <div className="user-profile hidden sm:flex items-center gap-3 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                        <div className="text-right">
                            <div className="text-[11px] font-black text-white leading-none capitalize">{user?.name || 'Student'}</div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-[#FAB95B] flex items-center justify-center text-[#1A3263] font-black text-xs overflow-hidden">
                            {user?.profilePicture ? (
                                <img
                                    src={user.profilePicture}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                (user?.name?.charAt(0) || 'S').toUpperCase()
                            )}
                        </div>
                    </div>

                    <button onClick={toggleTheme} className="theme-toggle" title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
                        {theme === 'light' ? <HiOutlineMoon /> : <HiOutlineSun />}
                    </button>

                    <button 
                        onClick={logout} 
                        className="p-2 text-white/60 hover:text-rose-400 transition-colors" 
                        title="Logout"
                    >
                        <HiOutlineArrowRightOnRectangle className="text-xl" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default StudentNavigationBar;
