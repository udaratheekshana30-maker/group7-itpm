import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { HiOutlineHome, HiOutlineMoon, HiOutlineSun, HiOutlineArrowRightOnRectangle, HiOutlineCog6Tooth, HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2';
import logo from '../assets/idHsN22NWk_logos.png';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { to: '/admin/dashboard', icon: HiOutlineHome, label: 'Admin Dashboard' },
    { to: '/admin/settings', icon: HiOutlineCog6Tooth, label: 'Settings' }
];

export default function AdminNavigationBar() {
    const location = useLocation();
    const { logout, user } = useAuth();
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    return (
        <header className={`nav-bar ${isScrolled ? 'scrolled' : ''} ${!isVisible ? 'hidden-nav' : ''}`}>
            <div className="nav-container">
                <div className="nav-logo-section">
                    <img src={logo} alt="SLIIT Logo" className="nav-logo-img" />
                    <div className="flex flex-col">
                        <div className="nav-title text-sm sm:text-base">SLIIT Kandy <span className="text-[#FAB95B]">UNI</span></div>
                        <div className="nav-subtitle text-[10px] sm:text-xs text-white/40 leading-tight">Admin Portal</div>
                    </div>
                </div>

                <nav className="nav-links hidden lg:flex">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `nav-link ${isActive || location.pathname.startsWith(item.to) ? 'active' : ''}`
                            }
                        >
                            <span className="icon"><item.icon /></span>
                            <span className="label text-xs sm:text-[13px]">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="nav-actions flex items-center gap-2 sm:gap-4">
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
                                <h3>Admin Portal</h3>
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
                                </NavLink>
                            ))}
                        </div>

                        <div className="mobile-user-section">
                            <div className="mobile-user-card">
                                <div className="mobile-user-avatar">
                                    {user?.profilePicture ? (
                                        <img src={user.profilePicture} alt="User" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                                    ) : (
                                        (user?.name?.charAt(0) || 'A').toUpperCase()
                                    )}
                                </div>
                                <div className="mobile-user-info">
                                    <h4>{user?.name || 'Admin User'}</h4>
                                    <p>ADMIN</p>
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
}
