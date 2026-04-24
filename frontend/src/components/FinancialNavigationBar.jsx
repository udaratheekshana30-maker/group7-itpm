import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { HiOutlineHome, HiOutlineDocumentChartBar, HiOutlineMoon, HiOutlineSun, HiOutlineArrowRightOnRectangle, HiOutlineCog6Tooth, HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2'
import logo from '../assets/idHsN22NWk_logos.png'
import { useAuth } from '../context/AuthContext'

const navItems = [
    { to: '/financial/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
    { to: '/financial/records', icon: HiOutlineDocumentChartBar, label: 'Payment Records' },
    { to: '/financial/settings', icon: HiOutlineCog6Tooth, label: 'Settings' }
]

export default function FinancialNavigationBar() {
    const location = useLocation()
    const { logout, user } = useAuth()
    const [lastScrollY, setLastScrollY] = useState(0)
    const [isVisible, setIsVisible] = useState(true)
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY
            
            // Background blur/scrolled state
            setIsScrolled(currentScrollY > 10)
            
            // Hiding logic: hide when scrolling down (> 100px), show when scrolling up
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false)
            } else {
                setIsVisible(true)
            }
            
            setLastScrollY(currentScrollY)
        }
        
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [lastScrollY])

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        localStorage.setItem('theme', theme)
    }, [theme])

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

    return (
        <header className={`nav-bar ${isScrolled ? 'scrolled' : ''} ${!isVisible ? 'hidden-nav' : ''}`}>
            <div className="nav-container">
                <div className="nav-logo-section">
                    <img src={logo} alt="SLIIT Logo" className="nav-logo-img" />
                    <div className="flex flex-col">
                        <div className="nav-title text-sm sm:text-base font-black tracking-tight">SLIIT Kandy <span className="text-[#FAB95B] italic font-black">UNI</span></div>
                        <div className="nav-subtitle text-[9px] sm:text-[10px] text-white/50 uppercase tracking-[0.2em] leading-none mt-1">Financial Management</div>
                    </div>
                </div>

                <nav className="nav-links hidden lg:flex">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) =>
                                    `nav-link ${isActive || location.pathname.startsWith(item.to) ? 'active' : ''}`
                                }
                            >
                                <span className="icon"><Icon /></span>
                                <span className="label text-xs sm:text-[13px] font-bold tracking-wide">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="nav-actions flex items-center gap-1 sm:gap-3">
                    <button onClick={toggleTheme} className="theme-toggle hover:scale-110 transition-all duration-300" title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
                        {theme === 'light' ? <HiOutlineMoon className="text-lg" /> : <HiOutlineSun className="text-lg" />}
                    </button>
                    <button 
                        onClick={() => setIsMenuOpen(true)}
                        className="theme-toggle lg:hidden ml-2 hover:scale-110 transition-all duration-300"
                        title="Open Menu"
                    >
                        <HiOutlineBars3 className="text-xl" />
                    </button>
                    <button onClick={logout} className="p-2 text-white/60 hover:text-rose-400 transition-all hidden sm:block ml-2 group" title="Logout">
                        <HiOutlineArrowRightOnRectangle className="text-xl group-hover:translate-x-1 transition-transform" />
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
                                <h3>Financial Portal</h3>
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
                                        (user?.name?.charAt(0) || 'F').toUpperCase()
                                    )}
                                </div>
                                <div className="mobile-user-info">
                                    <h4>{user?.name || 'Financial User'}</h4>
                                    <p>FINANCIAL</p>
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
    )
}
