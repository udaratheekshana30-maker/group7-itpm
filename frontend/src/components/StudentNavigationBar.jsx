import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    HiOutlineHome,
    HiOutlineClipboardDocumentList,
    HiOutlineArrowRightOnRectangle,
    HiOutlineUser,
    HiOutlineMoon,
    HiOutlineSun,
    HiOutlineCog6Tooth,
    HiOutlineBars3,
    HiOutlineXMark,
    HiOutlineUserGroup
} from 'react-icons/hi2';
import { MdOutlineLocalLaundryService } from 'react-icons/md';
import logo from '../assets/dormdesk_logo.png';
import { useAuth } from '../context/AuthContext';

const StudentNavigationBar = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Background blur/scrolled state
            setIsScrolled(currentScrollY > 10);

            // Hiding logic: hide when scrolling down (> 100px), show when scrolling up
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);


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
        { to: '/student/applications', icon: HiOutlineClipboardDocumentList, label: 'Applications' },
        { to: '/student/laundry', icon: MdOutlineLocalLaundryService, label: 'Laundry' },
        { to: '/student/resources', icon: HiOutlineUserGroup, label: 'Facilities' },
        { to: '/student/room-booking', icon: HiOutlineHome, label: 'Rooms' },
        { to: '/student/settings', icon: HiOutlineCog6Tooth, label: 'Settings' }
    ];

    return (
        <header className={`nav-bar ${isScrolled ? 'scrolled' : ''} ${!isVisible ? 'hidden-nav' : ''}`}>
            <div className="nav-container">
                <div className="nav-logo-section">
                    <img src={logo} alt="DormDesk" className="nav-logo-img" />
                    <div className="flex flex-col">
                        <div className="nav-title text-sm sm:text-base">DormDesk <span className="text-[#FAB95B]">UNI</span></div>
                        <div className="nav-subtitle text-[10px] sm:text-xs text-white/40 leading-tight">Student Portal</div>
                    </div>
                </div>

                <nav className="nav-links hidden lg:flex">
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
                        {theme === 'light' ? <HiOutlineMoon className="text-lg" /> : <HiOutlineSun className="text-lg" />}
                    </button>
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="theme-toggle lg:hidden ml-1"
                        title="Open Menu"
                    >
                        <HiOutlineBars3 className="text-xl font-bold" />
                    </button>
                    <button onClick={logout} className="p-2 text-white/60 hover:text-rose-400 transition-colors hidden sm:block ml-2" title="Logout">
                        <HiOutlineArrowRightOnRectangle className="text-xl" />
                    </button>
                </div>
            </div>

            {/* Mobile Menu Drawer */}
            {isMenuOpen && (
                <>
                    <div className="mobile-menu-overlay" onClick={() => setIsMenuOpen(false)} />
                    <div className="mobile-menu-drawer">
                        <div className="mobile-menu-header">
                            <div>
                                <p>MENU</p>
                                <h3>Student Portal</h3>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)}>
                                <HiOutlineXMark className="text-xl" />
                            </button>
                        </div>

                        <div className="mobile-menu-content">
                            {navItems.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `mobile-nav-link ${isActive ? 'active' : ''}`
                                    }
                                    end
                                >
                                    <item.icon className="text-xl" />
                                    <span className="tracking-wide">{item.label}</span>
                                    {item.badge > 0 && (
                                        <span className="ml-auto bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-primary">
                                            {item.badge}
                                        </span>
                                    )}
                                </NavLink>
                            ))}
                        </div>

                        <div className="mobile-user-section">
                            <div className="mobile-user-card">
                                <div className="mobile-user-avatar">
                                    {user?.profilePicture ? (
                                        <img src={user.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        (user?.name?.charAt(0) || 'S').toUpperCase()
                                    )}
                                </div>
                                <div className="mobile-user-info">
                                    <h4>{user?.name || 'Student User'}</h4>
                                    <p>STUDENT</p>
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="mobile-logout-btn"
                            >
                                <HiOutlineArrowRightOnRectangle className="text-lg" />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </header>
    );
};

export default StudentNavigationBar;
