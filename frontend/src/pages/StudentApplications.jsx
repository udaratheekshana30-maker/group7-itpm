import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import { HiOutlineCurrencyDollar, HiOutlineArrowRight, HiOutlineMagnifyingGlass, HiXMark } from 'react-icons/hi2'

export default function StudentApplications({ setAllocatingStudent }) {
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterPayment, setFilterPayment] = useState('')
    const [activeSubTab, setActiveSubTab] = useState('pending')
    const [filterWing, setFilterWing] = useState('')
    const navigate = useNavigate()

    // Reset search/payment filters when switching tabs if needed, 
    // but maybe keep Wing filter? I'll keep Wing and Search.
    useEffect(() => {
        setSearch('')
        setFilterPayment('')
    }, [activeSubTab])

    useEffect(() => { loadStudents() }, [filterPayment, filterWing])

    const loadStudents = async () => {
        try {
            setLoading(true)
            const params = {}
            if (filterPayment) params.paymentStatus = filterPayment
            if (filterWing) params.wing = filterWing
            const data = await api.getStudents(params)
            setStudents(data)
        } catch (err) {
            toast.error('Failed to load students')
        } finally {
            setLoading(false)
        }
    }

    const handleAllocate = (student) => {
        setAllocatingStudent(student)
        toast.success(`Redirecting to Room Allocation for ${student.name}...`)
        navigate('/room-management', { state: { tab: 'allocation' } })
    }

    const handleUpdatePayment = async (studentId, status) => {
        try {
            await api.updatePayment(studentId, status)
            toast.success(`Payment marked as "${status}"`)
            loadStudents()
            // viewingStudent check removed
        } catch (err) {
            toast.error(err.message)
        }
    }

    const filtered = students.filter(s => {
        const matchesSearch = 
            s.name?.toLowerCase().includes(search.toLowerCase()) ||
            s.email?.toLowerCase().includes(search.toLowerCase()) ||
            s.degree?.toLowerCase().includes(search.toLowerCase()) ||
            s.rollNumber?.toLowerCase().includes(search.toLowerCase());
        
        const matchesTab = activeSubTab === 'allocated' ? s.isAllocated : !s.isAllocated;

        return matchesSearch && matchesTab;
    })

    const payBadge = (status) => {
        if (status === 'success') return <span className="badge badge-success">Paid</span>
        if (status === 'failed') return <span className="badge badge-danger">Failed</span>
        if (status === 'rejected') return <span className="badge badge-rejected">Rejected</span>
        return <span className="badge badge-warning">Pending</span>
    }

    return (
        <div className="p-4 sm:p-10 space-y-10 w-full animate-fade-in transition-colors">
            <div className="page-header mb-10">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Student <span className="text-indigo-500 italic">Allocations</span></h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1 transition-colors">Review and manage student room allocations</p>
            </div>

            {/* Sub Tabs - Pill Style */}
            <div className="flex gap-1.5 p-1.5 bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl w-fit mb-8 border border-slate-200 dark:border-slate-700/50">
                <button
                    onClick={() => setActiveSubTab('pending')}
                    className={`min-w-[200px] px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${activeSubTab === 'pending'
                        ? 'bg-[#FAB95B] text-[#1A3263] shadow-lg shadow-amber-500/20 scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Pending Allocation
                </button>
                <button
                    onClick={() => setActiveSubTab('allocated')}
                    className={`min-w-[200px] px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border-none cursor-pointer flex items-center justify-center gap-2 ${activeSubTab === 'allocated'
                        ? 'bg-[#FAB95B] text-[#1A3263] shadow-lg shadow-amber-500/20 scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Allocated Students
                </button>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar dark:bg-slate-800/50 dark:border-slate-700">
                <div className="form-group" style={{ flex: 2 }}>
                    <label className="form-label dark:text-slate-300 font-black">Search Student Name or ID</label>
                    <div className="relative">
                        <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                        <input
                            className="form-input pl-10 dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                            placeholder="Search by name or student ID (roll number)..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                
                {/* Always show Wing filter */}
                <div className="form-group">
                    <label className="form-label dark:text-slate-300 font-black">Wing</label>
                    <select className="form-select dark:bg-slate-900 dark:border-slate-700 dark:text-white font-bold" value={filterWing} onChange={e => setFilterWing(e.target.value)}>
                        <option value="">All Wings</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                </div>

                {/* Only show Payment filter for Pending tab */}
                {activeSubTab === 'pending' && (
                    <div className="form-group">
                        <label className="form-label dark:text-slate-300 font-black">Payment Status</label>
                        <select className="form-select dark:bg-slate-900 dark:border-slate-700 dark:text-white font-bold" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
                            <option value="">All Payments</option>
                            <option value="pending">Pending</option>
                            <option value="success">Verified</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="card dark:bg-slate-900 dark:border-slate-800" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
                <div className="table-container">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                <th className="px-8 py-6 text-left text-[11px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">Student</th>
                                <th className="px-8 py-6 text-center text-[11px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">Roll No.</th>
                                <th className="px-8 py-6 text-center text-[11px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">Degree</th>
                                <th className="px-8 py-6 text-center text-[11px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">Wing</th>
                                <th className="px-8 py-6 text-center text-[11px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">Refundable Payment Status</th>
                                <th className="px-8 py-6 text-center text-[11px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">Allocation Status</th>
                                {activeSubTab !== 'allocated' && (
                                    <th className="px-8 py-6 text-right text-[11px] font-black text-slate-500 dark:text-white/40 uppercase tracking-widest">Action</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={activeSubTab === 'allocated' ? 6 : 8} className="text-center py-16 text-slate-400">Loading allocations...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={activeSubTab === 'allocated' ? 6 : 8} className="text-center py-16 text-slate-400">No allocations found</td></tr>
                            ) : filtered.map(s => (
                                <tr key={s._id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors group border-b border-slate-50 dark:border-white/5">
                                    <td className="px-8 py-6">
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-[13px] leading-tight group-hover:text-indigo-600 transition-colors uppercase">{s.name}</div>
                                            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 italic mt-0.5">{s.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center"><span className="text-[12px] font-bold text-slate-600 dark:text-slate-400">{s.rollNumber}</span></td>
                                    <td className="px-8 py-6 text-center"><div className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">{s.degree || 'General'}</div></td>
                                    <td className="px-8 py-6 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${s.wing === 'male' ? 'bg-blue-500/10 text-blue-600' : 'bg-pink-500/10 text-pink-600'}`}>{s.wing} Wing</span></td>
                                    <td className="px-8 py-6 text-center">{payBadge(s.paymentStatus)}</td>
                                    <td className="px-8 py-6 text-center">{s.isAllocated ? <span className="badge badge-success">Allocated</span> : <span className="badge badge-warning">Pending</span>}</td>
                                    {activeSubTab !== 'allocated' && (
                                        <td className="px-8 py-6 text-right" onClick={e => e.stopPropagation()}>
                                            <button
                                                className="btn btn-xs bg-[#FAB95B] text-[#1A3263] border-none hover:bg-[#e5a84d] font-bold px-4 h-9 rounded-xl flex items-center gap-2 ml-auto transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                                                disabled={s.paymentStatus !== 'success' || s.isAllocated}
                                                onClick={() => handleAllocate(s)}
                                            >
                                                <HiOutlineArrowRight /> Allocate
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal Removed as requested */}
        </div>
    )
}
