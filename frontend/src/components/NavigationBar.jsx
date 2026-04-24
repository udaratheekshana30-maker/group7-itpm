import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { HiOutlineHome, HiOutlineBuildingOffice2, HiOutlineUserGroup, HiOutlineClipboardDocumentList, HiOutlineDocumentChartBar, HiOutlineMoon, HiOutlineSun, HiOutlineChatBubbleLeftRight, HiOutlineMegaphone, HiOutlineUser, HiOutlineCube, HiOutlineArrowRightOnRectangle, HiOutlineArrowsRightLeft, HiOutlineCog6Tooth, HiOutlineBars3, HiOutlineXMark } from 'react-icons/hi2'
import logo from '../assets/idHsN22NWk_logos.png'
import { useAuth } from '../context/AuthContext'

const navItems = [
    { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
    { to: '/room-management', icon: HiOutlineBuildingOffice2, label: 'Floor & Room' },
    { to: '/student-applications', icon: HiOutlineUserGroup, label: 'Allocations' },
    { to: '/records', icon: HiOutlineDocumentChartBar, label: 'Records' },
    { to: '/warden/scan-records', icon: HiOutlineArrowsRightLeft, label: 'In/Out Logs' },
    { to: '/resources', icon: HiOutlineCube, label: 'Resources' },
    { to: '/complaints', icon: HiOutlineChatBubbleLeftRight, label: 'Complaints' },
    { to: '/notices', icon: HiOutlineMegaphone, label: 'Notices' }
]

export default function NavigationBar() {
    const location = useLocation()
    const { logout, user } = useAuth()
    const [lastScrollY, setLastScrollY] = useState(0)
    const [isVisible, setIsVisible] = useState(true)
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
    const [unreadCount, setUnreadCount] = useState(0)
    const [isScrolled, setIsScrolled] = useState(false)
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                // No token needed for warden routes in this system
                const res = await fetch('/api/complaints/unread-counts')
                const data = await res.json()
                if (data.success) {
                    setUnreadCount(data.data.wardenUnread || 0)
                }
            } catch (err) {
                console.error('Error fetching unread count:', err)
            }
        }

        fetchUnread()
        const interval = setInterval(fetchUnread, 2000) // Poll every 2s

        const handleRefresh = () => fetchUnread()
        window.addEventListener('nmh_unread_refresh', handleRefresh)

        return () => {
            clearInterval(interval)
            window.removeEventListener('nmh_unread_refresh', handleRefresh)
        }
    }, [])

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

    const updatedNavItems = [
        { to: '/dashboard', icon: HiOutlineHome, label: 'Dashboard' },
        { to: '/room-management', icon: HiOutlineBuildingOffice2, label: 'Floor & Room' },
        { to: '/student-applications', icon: HiOutlineUserGroup, label: 'Allocations' },
        { to: '/profiles', icon: HiOutlineUser, label: 'Profiles' },
        { to: '/records', icon: HiOutlineDocumentChartBar, label: 'Records' },
        { to: '/warden/scan-records', icon: HiOutlineArrowsRightLeft, label: 'In/Out Logs' },
        { to: '/resources', icon: HiOutlineCube, label: 'Resources' },
        { to: '/complaints', icon: HiOutlineChatBubbleLeftRight, label: 'Complaints', badge: unreadCount },
        { to: '/notices', icon: HiOutlineMegaphone, label: 'Notices' },
        { to: '/warden/settings', icon: HiOutlineCog6Tooth, label: 'Settings' }
    ]

    return (
        <header className={`nav-bar ${isScrolled ? 'scrolled' : ''} ${!isVisible ? 'hidden-nav' : ''}`}>
            <div className="nav-container">
                <div className="nav-logo-section">
                    <img src={logo} alt="SLIIT Logo" className="nav-logo-img" />
                    <div className="flex flex-col">
                        <div className="nav-title text-[15px] sm:text-[18px]">SLIIT Kandy <span className="text-[#FAB95B]">UNI</span></div>
                        <div className="nav-subtitle text-[10px] sm:text-xs text-white/40 leading-tight">Hostel Management</div>
                    </div>
                </div>

                <nav className="nav-links">
                    {updatedNavItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `nav-link relative ${isActive || (item.to !== '/' && location.pathname.startsWith(item.to)) ? 'active' : ''}`
                            }
                            end={item.to === '/'}
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
                                <h3>Warden Portal</h3>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)}>
                                <HiOutlineXMark className="text-xl" />
                            </button>
                        </div>
                        
                        <div className="mobile-menu-content">
                            {updatedNavItems.map(item => (
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
                                        <img src={user.profilePicture} alt="User" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                                    ) : (
                                        (user?.name?.charAt(0) || 'W').toUpperCase()
                                    )}
                                </div>
                                <div className="mobile-user-info">
                                    <h4>{user?.name || 'Warden User'}</h4>
                                    <p>WARDEN</p>
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
