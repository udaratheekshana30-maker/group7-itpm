import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import RoomManagement from './RoomManagement'
import RoomAllocation from './RoomAllocation'

export default function FloorAndRoomManagement({ allocatingStudent, setAllocatingStudent }) {
    const location = useLocation()
    const navigate = useNavigate()
    
    // Default to 'allocation' if a student is passed, otherwise 'rooms'
    const [activeTab, setActiveTab] = useState(allocatingStudent ? 'allocation' : 'rooms')

    // Also watch location state in case we navigate here with a specific tab
    useEffect(() => {
        if (location.state?.tab) {
            setActiveTab(location.state.tab)
        } else if (allocatingStudent) {
            setActiveTab('allocation')
        }
    }, [location.state, allocatingStudent])

    return (
        <div className="p-4 sm:p-10 space-y-10 w-full animate-fade-in transition-colors">
            <div className="page-header mb-10">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Floor & <span className="text-indigo-500 italic">Room</span> Management</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Manage hostel infrastructure and assign beds to students</p>
            </div>

            {/* Standardized Premium Tab Navigation - Pill Style */}
            <div className="flex gap-1.5 p-1.5 bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl w-fit mb-8 border border-slate-200 dark:border-slate-700/50">
                {[
                    { id: 'rooms', label: 'ROOMS & FLOORS' },
                    { id: 'allocation', label: 'STUDENT ALLOCATIONS' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id)
                            navigate('.', { replace: true, state: { tab: tab.id } })
                        }}
                        className={`min-w-[200px] px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 border-none cursor-pointer flex items-center justify-center text-center leading-tight ${
                            activeTab === tab.id
                                ? 'bg-[#FAB95B] text-[#1A3263] shadow-lg shadow-amber-500/20 scale-[1.02]'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'rooms' ? (
                    <RoomManagement />
                ) : (
                    <RoomAllocation 
                        allocatingStudent={allocatingStudent} 
                        setAllocatingStudent={setAllocatingStudent} 
                    />
                )}
            </div>
        </div>
    )
}
