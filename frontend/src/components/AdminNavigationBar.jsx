import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { HiOutlineHome, HiOutlineMoon, HiOutlineSun, HiOutlineArrowRightOnRectangle, HiOutlineCog6Tooth } from 'react-icons/hi2';
import logo from '../assets/idHsN22NWk_logos.png';
import { useAuth } from '../context/AuthContext';

const navItems = [
    { to: '/admin/dashboard', icon: HiOutlineHome, label: 'Admin Dashboard' },
    { to: '/admin/settings', icon: HiOutlineCog6Tooth, label: 'Settings' }
];

export default function AdminNavigationBar() {
    const location = useLocation();
    const { logout } = useAuth();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
        <header className={`nav-bar ${isScrolled ? 'scrolled' : ''}`}>
            <div className="nav-container">
                <div className="nav-logo-section">
                    <img src={logo} alt="SLIIT Logo" className="nav-logo-img" />
                    <div className="hidden sm:block">
                        <div className="nav-title">SLIIT Kandy <span className="text-amber-400">UNI</span></div>
                        <div className="nav-subtitle text-white/40">Administration Panel</div>
                    </div>
                </div>

                <nav className="nav-links">
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

                <div className="nav-actions">
                    <button onClick={toggleTheme} className="theme-toggle" title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
                        {theme === 'light' ? <HiOutlineMoon /> : <HiOutlineSun />}
                    </button>
                    <button onClick={logout} className="p-2 text-white/60 hover:text-rose-400 transition-colors" title="Logout">
                        <HiOutlineArrowRightOnRectangle className="text-xl" />
                    </button>
                </div>
            </div>
        </header>
    );
}
