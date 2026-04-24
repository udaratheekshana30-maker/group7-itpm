import { useState, useEffect } from 'react'
import { api } from '../services/api'
import toast from 'react-hot-toast'
import { 
    HiOutlineCheckCircle, 
    HiOutlineXCircle, 
    HiOutlineNoSymbol,
    HiOutlineDocumentText, 
    HiXMark,
    HiOutlineArrowTopRightOnSquare,
    HiOutlineClipboardDocumentCheck,
    HiOutlineCurrencyDollar,
    HiOutlineReceiptPercent,
    HiOutlineKey,
    HiTrash,
    HiOutlineDocumentArrowDown,
    HiOutlineTableCells
} from 'react-icons/hi2'
import { useAuth } from '../context/AuthContext'

export default function Profiles() {
    const { user } = useAuth()
    const isWarden = user?.role === 'warden'
    const isFinancial = user?.role === 'financial'
    const isSecurity = user?.role === 'security'
    const isStaff = isFinancial || isSecurity
    
    const [applications, setApplications] = useState([])
    const [submissions, setSubmissions] = useState([])
    const [clearances, setClearances] = useState([])
    const [loadingApps, setLoadingApps] = useState(true)
    const [loadingClearances, setLoadingClearances] = useState(true)
    const [activeTab, setActiveTab] = useState('warden')
    const [viewingClearance, setViewingClearance] = useState(null)
    const [viewingHistory, setViewingHistory] = useState(null)
    const [viewingApp, setViewingApp] = useState(null)
    const [loadingAppDetails, setLoadingAppDetails] = useState(false)
    
    // Filters for Warden Profile Activation tab
    const [profileSearch, setProfileSearch] = useState('')
    const [profileStatusFilter, setProfileStatusFilter] = useState('all')

    useEffect(() => {
        loadApplications()
        loadSubmissions()
        loadClearances()
    }, [])

    const loadApplications = async (silent = false) => {
        try {
            if (!silent) setLoadingApps(true)
            const data = await api.getApplications()
            setApplications(data)
        } catch (err) {
            toast.error('Failed to load applications')
        } finally {
            setLoadingApps(false)
        }
    }

    const loadSubmissions = async (silent = false) => {
        try {
            const data = await api.getMonthlySubmissions()
            setSubmissions(data)
        } catch (err) {
            console.error('loadSubmissions error:', err)
        }
    }

    const loadClearances = async (silent = false) => {
        try {
            if (!silent) setLoadingClearances(true)
            const data = await api.getClearances()
            setClearances(data)
        } catch (err) {
            console.error('loadClearances error:', err)
        } finally {
            setLoadingClearances(false)
        }
    }

    const loadApplicationDetail = async (id) => {
        try {
            setLoadingAppDetails(true)
            const data = await api.getApplication(id)
            setViewingApp(data)
        } catch (err) {
            toast.error('Failed to load profile details')
        } finally {
            setLoadingAppDetails(false)
        }
    }

    const handleStatusUpdate = async (id, status) => {
        try {
            const updatedApp = await api.updateApplication(id, { applicationStatus: status })
            toast.success(`Application status updated to "${status}"`)
            localStorage.setItem('nmh_refresh_trigger', Date.now()) // Trigger instant refresh for other tabs
            
            // Optimistically update local state
            setApplications(prev => prev.map(app => app._id === id ? updatedApp : app))
            
            if (viewingApp?._id === id) {
                setViewingApp(updatedApp)
            }

        } catch (err) {
            console.error('handleStatusUpdate error:', err)
            toast.error(err.message || 'Failed to update status')
        }
    }

    const handlePaymentStatus = async (studentId, submissionId, status) => {
        try {
            await api.updateMonthlyStatus(studentId, submissionId, status)
            toast.success(`Payment marked as ${status}`)
            loadSubmissions()
        } catch (err) {
            console.error('handlePaymentStatus error:', err)
            toast.error(err.message || 'Failed to update payment status')
        }
    }

    // Filter logic for Profile Activation (Warden View)
    const filteredApplications = applications.filter(app => {
        const searchLower = profileSearch.toLowerCase().trim();
        const matchesSearch =
            (app.studentName && app.studentName.toLowerCase().includes(searchLower)) ||
            (app.studentRollNumber && app.studentRollNumber.toLowerCase().includes(searchLower)) ||
            (app.studentEmail && app.studentEmail.toLowerCase().includes(searchLower)) ||
            (profileSearch === '');

        const activeStatuses = ['Activated', 'Room Allocated']
        const pendingStatuses = ['Pending', 'Payment Approved']
        const deactivatedStatuses = ['Deactivated', 'Rejected']

        const matchesStatus = (profileStatusFilter === 'all') || 
            (profileStatusFilter === 'active' && activeStatuses.includes(app.applicationStatus)) ||
            (profileStatusFilter === 'pending' && pendingStatuses.includes(app.applicationStatus)) ||
            (profileStatusFilter === 'deactivated' && deactivatedStatuses.includes(app.applicationStatus));

        return matchesSearch && matchesStatus;
    });

    // Helper for secure file downloads with Bearer token
    const downloadSecureFile = async (url, filename) => {
        try {
            const token = sessionStorage.getItem('hostel_token');
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to download file');
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            toast.error(err.message || 'Download failed');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Pending': return <span className="badge badge-warning">Payment Waiting</span>
            case 'Activated':
            case 'Room Allocated': return <span className="badge badge-success">Activated</span>
            case 'Deactivated': return <span className="badge badge-danger">Deactivated</span>
            case 'Payment Approved': return <span className="badge badge-info">Ready to Activate</span>
            case 'Rejected': return <span className="badge badge-danger">Rejected</span>
            default: return <span className="badge badge-neutral">{status}</span>
        }
    }

    return (
        <div className="p-4 sm:p-10 space-y-10 w-full animate-fade-in transition-colors">
            <div className="page-header mb-10">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Student <span className="text-indigo-500 italic">Profiles</span></h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Manage student identities and application workflows</p>
                </div>
            </div>

            {/* Tab System - hide Monthly Payments and Clearance tabs for financial managers */}
            <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/50 w-fit">
                {['Warden', ...(isStaff ? [] : ['Payments', 'Clearance'])].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase())}
                        className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all border-none cursor-pointer ${activeTab === tab.toLowerCase()
                            ? 'bg-[#FAB95B] text-[#1A3263] shadow-lg'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                    >
                        {tab === 'Payments' ? 'Monthly Payments' : tab === 'Clearance' ? 'Clearance' : 'Profile activation'}
                    </button>
                ))}
                <button
                    onClick={() => setActiveTab('left')}
                    className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all border-none cursor-pointer ${activeTab === 'left'
                        ? 'bg-[#FAB95B] text-[#1A3263] shadow-lg'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                >
                    Left Students
                </button>
            </div>

            {activeTab === 'payments' && (
                <PaymentViewWarden
                    submissions={submissions}
                    handlePaymentStatus={handlePaymentStatus}
                    setViewingHistory={setViewingHistory}
                    downloadSecureFile={downloadSecureFile}
                />
            )}

                    {activeTab === 'clearance' && (
                        <ClearanceViewWarden 
                            clearances={clearances}
                            submissions={submissions}
                            loading={loadingClearances}
                            onUpdate={() => {
                                loadClearances(false)
                                loadSubmissions(false)
                            }}
                            setViewingClearance={setViewingClearance}
                        />
                    )}

                    {activeTab === 'left' && <LeftViewWarden downloadSecureFile={downloadSecureFile} />}

            {/* Records Table (Warden Tab) - Now a card view with filters */}
            {activeTab === 'warden' && (
                <div className="space-y-6">
                    {/* Filter & Export Bar */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                        {/* Search on Left */}
                        <div className="relative w-full md:w-96 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-slate-400 group-focus-within:text-[#FAB95B] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input 
                                type="text" 
                                className="form-input pl-11 w-full h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 rounded-2xl focus:ring-2 focus:ring-[#FAB95B]/20 transition-all font-bold text-sm" 
                                placeholder="Search by name, email or ID..." 
                                value={profileSearch}
                                onChange={(e) => setProfileSearch(e.target.value)}
                            />
                        </div>

                        {/* Status & Export on Right */}
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            <div className="flex gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm h-11">
                                {[
                                    { key: 'all', label: 'All Statuses' },
                                    { key: 'pending', label: 'Pending' },
                                    { key: 'active', label: 'Activated' },
                                    { key: 'deactivated', label: 'Deactivated' }
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => setProfileStatusFilter(f.key)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all border-none cursor-pointer uppercase tracking-wider ${profileStatusFilter === f.key
                                            ? 'bg-[#FAB95B] text-[#1A3263] shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />
                            
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => downloadSecureFile(api.getApplicationsExportUrl('csv', { search: profileSearch, status: profileStatusFilter }), `Applications_${new Date().toLocaleDateString()}.csv`)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none cursor-pointer"
                                    title="Export to CSV"
                                >
                                    <HiOutlineTableCells className="text-lg" /> CSV
                                </button>
                                <button 
                                    onClick={() => downloadSecureFile(api.getApplicationsExportUrl('pdf', { search: profileSearch, status: profileStatusFilter }), `Applications_${new Date().toLocaleDateString()}.pdf`)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none cursor-pointer"
                                    title="Export to PDF"
                                >
                                    <HiOutlineDocumentArrowDown className="text-lg" /> PDF
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card !p-0 dark:bg-slate-900 dark:border-slate-800">
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th className="text-center">Wing</th>
                                        <th className="text-center">Roll Number</th>
                                        <th className="text-center">Status</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {loadingApps && applications.length === 0 ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td><div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                                <td><div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                                                <td><div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                                                <td><div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                                                <td><div className="flex justify-end"><div className="h-9 w-28 bg-slate-200 dark:bg-slate-700 rounded-xl" /></div></td>
                                            </tr>
                                        ))
                                    ) : filteredApplications.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-16 text-slate-400 italic">No applications found matching your criteria</td>
                                        </tr>
                                    ) : filteredApplications.map(app => (
                                        <tr key={app._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td>
                                                <div className="font-bold text-slate-800 dark:text-white">{app.studentName}</div>
                                                <div className="text-[11px] text-slate-400 dark:text-slate-300">{app.studentEmail}</div>
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${app.studentWing === 'male' ? 'badge-info' : 'badge-neutral'}`}>
                                                    {app.studentWing === 'male' ? 'Male' : 'Female'}
                                                </span>
                                            </td>
                                            <td className="text-center"><span className="badge badge-neutral">{app.studentRollNumber}</span></td>
                                            <td className="text-center">
                                                <span className={`badge ${
                                                    app.applicationStatus === 'Activated' || app.applicationStatus === 'Room Allocated' ? 'badge-success'
                                                    : app.applicationStatus === 'Rejected' || app.applicationStatus === 'Deactivated' ? 'badge-danger'
                                                    : 'badge-warning'
                                                }`}>
                                                    {app.applicationStatus === 'Activated' || app.applicationStatus === 'Room Allocated' ? 'Activated' 
                                                     : app.applicationStatus === 'Rejected' || app.applicationStatus === 'Deactivated' ? 'Deactivated'
                                                     : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    onClick={() => loadApplicationDetail(app._id)}
                                                    className="px-6 py-2 bg-[#FAB95B] text-[#1A3263] rounded-xl font-black text-xs border-none cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2 mx-auto"
                                                >
                                                   View Profile
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Detail Modal */}
            {viewingApp && (
                <ProfileDetailModal 
                    app={viewingApp} 
                    onClose={() => setViewingApp(null)} 
                    onAction={handleStatusUpdate}
                    loading={loadingAppDetails}
                    downloadSecureFile={downloadSecureFile}
                />
            )}

            {/* Clearance Detail/Management Modal */}
            {viewingClearance && (
                <ClearanceModalWarden
                    clearance={viewingClearance}
                    submissions={submissions.filter(s => s.rollNumber === viewingClearance.studentRollNumber && s.status === 'Accepted')}
                    onClose={() => setViewingClearance(null)}
                    onUpdate={() => {
                        loadClearances(false)
                        setViewingClearance(null)
                    }}
                />
            )}

            {/* History Modal */}
            {viewingHistory && (
                <HistoryModal
                    student={viewingHistory}
                    onClose={() => setViewingHistory(null)}
                    submissions={submissions.filter(s => s.studentId === viewingHistory.studentId)}
                />
            )}
        </div>
    )
}

function PaymentViewWarden({ submissions, handlePaymentStatus, setViewingHistory, downloadSecureFile }) {
    const [subTab, setSubTab] = useState('pending')
    const [searchTerm, setSearchTerm] = useState('')

    const filterSubmissions = (subs) => {
        if (!searchTerm) return subs;
        const low = searchTerm.toLowerCase().trim();
        return subs.filter(s => {
            const name = (s.studentName || '').toLowerCase();
            const roll = (s.rollNumber || s.studentRollNumber || s.itNumber || '').toLowerCase();
            const email = (s.email || s.studentEmail || '').toLowerCase();
            return name.includes(low) || roll.includes(low) || email.includes(low);
        });
    }

    const pending = filterSubmissions(submissions.filter(s => s.status === 'Pending'))
    const approved = submissions.filter(s => s.status === 'Accepted')

    // Get unique students from approved submissions
    const approvedStudents = []
    const seen = new Set()
    approved.forEach(s => {
        if (!seen.has(s.studentId)) {
            seen.add(s.studentId)
            approvedStudents.push(s)
        }
    })

    const filteredApproved = filterSubmissions(approvedStudents);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
                {/* Search on Left */}
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400 group-focus-within:text-[#FAB95B] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input 
                        type="text" 
                        className="form-input pl-11 w-full h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 rounded-2xl focus:ring-2 focus:ring-[#FAB95B]/20 transition-all font-bold text-sm" 
                        placeholder="Search student by name, email or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Tabs & Export on Right */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm h-11">
                        <button
                            onClick={() => setSubTab('pending')}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black transition-all border-none cursor-pointer uppercase tracking-wider ${subTab === 'pending' ? 'bg-[#FAB95B] text-[#1A3263] shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        >
                            Pending ({pending.length})
                        </button>
                        <button
                            onClick={() => setSubTab('approved')}
                            className={`px-6 py-2 rounded-lg text-[10px] font-black transition-all border-none cursor-pointer uppercase tracking-wider ${subTab === 'approved' ? 'bg-[#FAB95B] text-[#1A3263] shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        >
                            Approved ({filteredApproved.length})
                        </button>
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => downloadSecureFile(api.getMonthlySubmissionsExportUrl('csv', { search: searchTerm, status: subTab === 'pending' ? 'Pending' : 'Accepted' }), `MonthlyPayments_${new Date().toLocaleDateString()}.csv`)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none cursor-pointer"
                            title="Export to CSV"
                        >
                            <HiOutlineTableCells className="text-lg" /> CSV
                        </button>
                        <button 
                            onClick={() => downloadSecureFile(api.getMonthlySubmissionsExportUrl('pdf', { search: searchTerm, status: subTab === 'pending' ? 'Pending' : 'Accepted' }), `MonthlyPayments_${new Date().toLocaleDateString()}.pdf`)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none cursor-pointer"
                            title="Export to PDF"
                        >
                            <HiOutlineDocumentArrowDown className="text-lg" /> PDF
                        </button>
                    </div>
                </div>
            </div>

            <div className="card !p-0 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                <div className="table-container">
                    <table>
                        {subTab === 'pending' ? (
                            <>
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th className="text-center">Wing</th>
                                        <th className="text-center">Roll Number</th>
                                        <th className="text-center">Months</th>
                                        <th className="text-center">Amount</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {pending.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center py-20 text-slate-400 font-bold italic">No pending payments to review</td></tr>
                                    ) : pending.map(sub => (
                                        <tr key={sub.submissionId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td>
                                                <div className="font-black text-slate-800 dark:text-slate-200">{sub.studentName}</div>
                                                <div className="text-[11px] text-slate-400 dark:text-slate-300 italic">{sub.email}</div>
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${sub.wing === 'male' ? 'badge-info' : 'badge-neutral'}`}>
                                                    {sub.wing === 'male' ? 'Male' : 'Female'}
                                                </span>
                                            </td>
                                            <td className="text-center"><span className="badge badge-neutral">{sub.rollNumber}</span></td>
                                            <td className="text-center">
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {sub.months?.map(m => (
                                                        <span key={m} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                                                            {m.substring(0, 3)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="text-center font-black text-slate-700 dark:text-slate-300">LKR {sub.amount?.toLocaleString()}</td>
                                            <td className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <a
                                                        href={sub.documentUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                        title="View Receipt"
                                                    >
                                                        <HiOutlineDocumentText className="text-lg" />
                                                    </a>
                                                    <button
                                                        onClick={() => handlePaymentStatus(sub.studentId, sub.submissionId, 'Accepted')}
                                                        className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:emerald-400 rounded-xl border-none cursor-pointer hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                        title="Approve"
                                                    >
                                                        <HiOutlineCheckCircle className="text-lg" />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePaymentStatus(sub.studentId, sub.submissionId, 'Rejected')}
                                                        className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl border-none cursor-pointer hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                        title="Reject"
                                                    >
                                                        <HiOutlineXCircle className="text-lg" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        ) : (
                            <>
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th className="text-center">Wing</th>
                                        <th className="text-center">Roll Number</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {filteredApproved.length === 0 ? (
                                        <tr><td colSpan="4" className="text-center py-20 text-slate-400 font-bold italic">No payment history found</td></tr>
                                    ) : filteredApproved.map(student => (
                                        <tr key={student.studentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td>
                                                <div className="font-black text-slate-800 dark:text-slate-200">{student.studentName}</div>
                                                <div className="text-[11px] text-slate-400 dark:text-slate-300 italic">{student.email}</div>
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${student.wing === 'male' ? 'badge-info' : 'badge-neutral'}`}>
                                                    {student.wing === 'male' ? 'Male' : 'Female'}
                                                </span>
                                            </td>
                                            <td className="text-center"><span className="badge badge-neutral">{student.rollNumber}</span></td>
                                            <td className="text-center">
                                                <button
                                                    onClick={() => setViewingHistory(student)}
                                                    className="px-6 py-2 bg-[#FAB95B] text-[#1A3263] rounded-xl font-black text-xs border-none cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2 mx-auto"
                                                >
                                                    View History <HiOutlineArrowTopRightOnSquare />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </>
                        )}
                    </table>
                </div>
            </div>
        </div>
    )
}

function ClearanceViewWarden({ clearances, loading, setViewingClearance }) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredClearances = clearances.filter(cl => {
        if (!searchTerm) return true;
        const low = searchTerm.toLowerCase().trim();
        const name = (cl.studentName || '').toLowerCase();
        const roll = (cl.studentRollNumber || cl.rollNumber || cl.itNumber || '').toLowerCase();
        const email = (cl.studentEmail || cl.email || '').toLowerCase();
        return name.includes(low) || roll.includes(low) || email.includes(low);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
                {/* Search on Left */}
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400 group-focus-within:text-[#FAB95B] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input 
                        type="text" 
                        className="form-input pl-11 w-full h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 rounded-2xl focus:ring-2 focus:ring-[#FAB95B]/20 transition-all font-bold text-sm" 
                        placeholder="Search student by name, email or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Info on Right */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Clearance Requests: {filteredClearances.length}</span>
                    </div>
                </div>
            </div>
            <div className="card !p-0 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th className="text-center">Wing</th>
                                <th className="text-center">Roll Number</th>
                                <th className="text-center">Room Details</th>
                                <th className="text-center">Status</th>
                                <th className="text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading && clearances.length === 0 ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                        <td><div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                                        <td><div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                                        <td><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                        <td><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                        <td><div className="flex justify-end"><div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></div></td>
                                    </tr>
                                ))
                            ) : filteredClearances.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-20 text-slate-400 font-bold italic">No clearance requests found</td>
                                </tr>
                            ) : filteredClearances.map(cl => (
                                <tr key={cl._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td>
                                        <div className="font-black text-slate-800 dark:text-slate-200">{cl.studentName}</div>
                                        <div className="text-[11px] text-slate-400 dark:text-slate-300 italic">{cl.studentEmail}</div>
                                    </td>
                                    <td className="text-center">
                                        <span className={`badge ${cl.wing === 'male' ? 'badge-info' : 'badge-neutral'}`}>
                                            {cl.wing === 'male' ? 'Male' : 'Female'}
                                        </span>
                                    </td>
                                    <td className="text-center"><span className="badge badge-neutral">{cl.studentRollNumber}</span></td>
                                    <td className="text-center">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cl.wing === 'female' ? 'F' : 'M'}{cl.roomNumber} • Bed {cl.bedId}</div>
                                    </td>
                                    <td className="text-center">
                                        <span className={`badge ${
                                            cl.status === 'Approved' ? 'badge-success' : 
                                            cl.status === 'Rejected' ? 'badge-danger' : 
                                            'badge-warning'
                                        }`}>
                                            {cl.status}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <button
                                            onClick={() => setViewingClearance(cl)}
                                            className="px-5 py-2 bg-[#FAB95B] text-[#1A3263] rounded-xl font-bold text-xs border-none cursor-pointer hover:bg-[#e5a84d] transition-colors mx-auto"
                                        >
                                            View & Manage
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function ClearanceModalWarden({ clearance, submissions, onClose, onUpdate }) {
    const [subTab, setSubTab] = useState('payments')
    const [monthlyAdjustments, setMonthlyAdjustments] = useState(clearance.monthlyAdjustments || [])
    const [additionalCharges, setAdditionalCharges] = useState(clearance.additionalCharges || [])
    const [keyStatus, setKeyStatus] = useState(clearance.keyStatus || 'Not Returned')
    const [wardenNotes, setWardenNotes] = useState(clearance.wardenNotes || '')
    const [submitting, setSubmitting] = useState(false)
    const [isEditMode, setIsEditMode] = useState(!clearance.isWardenSubmitted)

    const allMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const currentMonthName = allMonths[new Date().getMonth()]
    
    // Filter months based on student joinedAt
    const months = (() => {
        if (!clearance.joinedAt) return allMonths;
        const joinDate = new Date(clearance.joinedAt);
        const joinYear = joinDate.getFullYear();
        const joinMonth = joinDate.getMonth();
        const currentYear = new Date().getFullYear();

        if (currentYear === joinYear) {
            return allMonths.slice(joinMonth);
        }
        return allMonths;
    })();

    const approvedMonths = new Set()
    submissions.forEach(s => s.months?.forEach(m => approvedMonths.add(m)))

    const handleAdjustmentChange = (month, amount) => {
        setMonthlyAdjustments(prev => {
            const existing = prev.find(a => a.month === month)
            if (existing) {
                return prev.map(a => a.month === month ? { ...a, amount: parseFloat(amount) || 0 } : a)
            }
            return [...prev, { month, amount: parseFloat(amount) || 0 }]
        })
    }

    const addCharge = () => setAdditionalCharges([...additionalCharges, { amount: 0, note: '' }])
    const removeCharge = (idx) => setAdditionalCharges(additionalCharges.filter((_, i) => i !== idx))
    const handleChargeChange = (idx, field, value) => {
        setAdditionalCharges(prev => prev.map((c, i) => i === idx ? { ...c, [field]: field === 'amount' ? (parseFloat(value) || 0) : value } : c))
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        try {
            const data = {
                monthlyAdjustments,
                additionalCharges,
                keyStatus,
                wardenNotes,
                isWardenSubmitted: true,
                status: 'In Progress'
            }
            await api.updateClearanceWarden(clearance._id, data)
            toast.success('Clearance updated and set to In Progress!')
            onUpdate()
            setIsEditMode(false)
        } catch (err) {
            toast.error(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const totalAdjustments = monthlyAdjustments.reduce((sum, a) => sum + (a.amount || 0), 0)
    const totalAdditional = additionalCharges.reduce((sum, c) => sum + (c.amount || 0), 0)
    const grandTotal = totalAdjustments + totalAdditional

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal !max-w-4xl dark:bg-slate-900 border dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="modal-header border-b dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <HiOutlineClipboardDocumentCheck className="text-2xl" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Student Clearance Management</h3>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{clearance.studentName} • {clearance.studentRollNumber}</p>
                        </div>
                    </div>
                    <button className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center border-none bg-transparent cursor-pointer text-slate-400 dark:text-slate-500 transition-colors" onClick={onClose}>
                        <HiXMark className="text-2xl" />
                    </button>
                </div>

                <div className="modal-body p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                    {/* Internal Tabs */}
                    <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/50 w-fit">
                        {['Payments', 'Additional Charges'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setSubTab(tab.toLowerCase().replace(' ', '-'))}
                                className={`px-6 py-2 rounded-xl text-xs font-black border-none cursor-pointer transition-all ${subTab === tab.toLowerCase().replace(' ', '-') ? 'bg-[#FAB95B] text-[#1A3263] shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {subTab === 'payments' && (
                        <div className="space-y-6">
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl p-6">
                                <h4 className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4">
                                    <HiOutlineCurrencyDollar className="text-lg" /> Monthly Payment Audit
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {months.map((m, idx) => {
                                        const isPaid = approvedMonths.has(m)
                                        const isOngoing = m === currentMonthName
                                        const adjustment = monthlyAdjustments.find(a => a.month === m)
                                        return (
                                            <div key={m} className={`relative p-4 rounded-2xl border-2 transition-all ${
                                                isPaid ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' : 
                                                isOngoing ? 'bg-white dark:bg-slate-800 border-rose-400 shadow-md animate-pulse-subtle' : 
                                                'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50'
                                            }`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500">{m.substring(0,3)}</span>
                                                    {isPaid ? <HiOutlineCheckCircle className="text-emerald-500" /> : <HiOutlineXCircle className="text-rose-400" />}
                                                </div>
                                                <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-3">{isPaid ? 'Paid' : 'Not Paid'}</div>
                                                {isOngoing && !isPaid && (
                                                    <div className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-full shadow-lg z-10">
                                                        ONGOING
                                                    </div>
                                                )}
                                                {!isPaid && (
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Amount Due</label>
                                                        <input 
                                                            type="number" 
                                                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black text-slate-700 dark:text-slate-200"
                                                            placeholder="0.00"
                                                            value={adjustment?.amount || ''}
                                                            onChange={(e) => handleAdjustmentChange(m, e.target.value)}
                                                            readOnly={!isEditMode}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {subTab === 'additional-charges' && (
                        <div className="space-y-6">
                            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                                        <HiOutlineReceiptPercent className="text-lg" /> Miscellaneous Charges
                                    </h4>
                                    {isEditMode && (
                                        <button onClick={addCharge} className="text-xs font-black bg-white dark:bg-slate-800 border border-[#FAB95B]/30 dark:border-[#FAB95B]/20 text-[#FAB95B] px-4 py-2 rounded-xl hover:bg-[#FAB95B]/10 dark:hover:bg-[#FAB95B]/5 transition-all cursor-pointer">
                                            + Add Charge
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {additionalCharges.length === 0 ? (
                                        <div className="text-center py-10 text-rose-300 dark:text-rose-800 text-xs italic font-bold">No additional charges added</div>
                                    ) : additionalCharges.map((c, i) => (
                                        <div key={i} className="flex gap-4 items-end bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-rose-50 dark:border-rose-900/30">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Charge Note</label>
                                                <input 
                                                    className="form-input w-full" 
                                                    placeholder="Reason for charge..." 
                                                    value={c.note}
                                                    onChange={e => handleChargeChange(i, 'note', e.target.value)}
                                                    readOnly={!isEditMode}
                                                />
                                            </div>
                                            <div className="w-32 space-y-1">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount</label>
                                                <input 
                                                    type="number" 
                                                    className="form-input w-full" 
                                                    placeholder="0.00" 
                                                    value={c.amount}
                                                    onChange={e => handleChargeChange(i, 'amount', e.target.value)}
                                                    readOnly={!isEditMode}
                                                />
                                            </div>
                                            {isEditMode && (
                                                <button onClick={() => removeCharge(i)} className="p-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-all border-none cursor-pointer">
                                                    <HiXMark />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-[#FAB95B]/10 dark:bg-[#FAB95B]/5 border border-[#FAB95B]/20 dark:border-[#FAB95B]/10 rounded-2xl p-6">
                                <h4 className="flex items-center gap-2 text-xs font-black text-[#FAB95B] uppercase tracking-widest mb-4">
                                    <HiOutlineKey className="text-lg" /> Key Return Status
                                </h4>
                                <div className="flex gap-6">
                                    {['Returned', 'Not Returned'].map(status => (
                                        <label key={status} className="flex items-center gap-3 cursor-pointer group">
                                            <input 
                                                type="radio" 
                                                className="w-5 h-5 text-indigo-600 border-2 border-[#FAB95B]/30 focus:ring-[#FAB95B]"
                                                name="keyStatus"
                                                value={status}
                                                checked={keyStatus === status}
                                                onChange={e => setKeyStatus(e.target.value)}
                                                disabled={!isEditMode}
                                            />
                                            <span className={`text-sm font-black transition-colors ${keyStatus === status ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`}>{status}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-8">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block">Warden Review Notes</label>
                        <textarea 
                            className="form-input w-full min-h-[100px] py-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                            placeholder="Add specific instructions or notes for this clearance..."
                            value={wardenNotes}
                            onChange={e => setWardenNotes(e.target.value)}
                            readOnly={!isEditMode}
                        />
                    </div>
                </div>

                <div className="modal-footer bg-slate-50 dark:bg-slate-900 flex-wrap justify-between gap-6 p-8 border-t dark:border-slate-800">
                    <div className="flex items-center gap-8">
                        <div>
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Calculated Total</div>
                            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">LKR {grandTotal.toLocaleString()}</div>
                        </div>
                        <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Status</div>
                            <div className={`text-sm font-black uppercase ${keyStatus === 'Returned' ? 'text-emerald-500' : 'text-rose-500'}`}>{keyStatus}</div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {clearance.isWardenSubmitted && !isEditMode ? (
                            <button 
                                onClick={() => setIsEditMode(true)} 
                                className="px-10 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border-none cursor-pointer shadow-sm"
                            >
                                Edit Details
                            </button>
                        ) : (
                            <button 
                                onClick={handleSubmit} 
                                disabled={submitting} 
                                className="px-10 py-3 bg-[#FAB95B] text-[#1A3263] font-black rounded-2xl hover:bg-[#e5a84d] transition-all border-none cursor-pointer shadow-lg shadow-[#FAB95B]/20 disabled:opacity-50"
                            >
                                {submitting ? 'Saving...' : (clearance.isWardenSubmitted ? 'Update Review' : 'Submit Review')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function HistoryModal({ student, onClose, submissions }) {
    // Map approved months
    const approvedMonths = new Set()
    submissions.filter(s => s.status === 'Accepted').forEach(s => {
        s.months?.forEach(m => approvedMonths.add(m))
    })

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal !max-w-2xl dark:bg-slate-900 border dark:border-slate-800 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="modal-header border-b dark:border-slate-800">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Monthly Payment History</h3>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{student.studentName} • {student.rollNumber}</p>
                    </div>
                    <button className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors border-none bg-transparent cursor-pointer text-slate-400 dark:text-slate-500" onClick={onClose}>
                        <HiXMark className="text-2xl" />
                    </button>
                </div>

                {/* Filter months base on student joinedAt */}
                {(() => {
                    const allMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                    const months = (() => {
                        if (!student.joinedAt) return allMonths;
                        const joinDate = new Date(student.joinedAt);
                        const joinYear = joinDate.getFullYear();
                        const joinMonth = joinDate.getMonth();
                        const currentYear = new Date().getFullYear();

                        if (currentYear === joinYear) {
                            return allMonths.slice(joinMonth);
                        }
                        return allMonths;
                    })();

                    return (
                        <div className="modal-body py-8 px-6 space-y-8">
                            <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-indigo-600 shadow-sm">
                                    <HiOutlineCurrencyDollar className="text-2xl" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Approved Submissions</div>
                                    <div className="text-xl font-black text-indigo-900 dark:text-indigo-100">{submissions.filter(s => s.status === 'Accepted').length} Recordings</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {months.map((m, idx) => {
                                    const isPaid = approvedMonths.has(m)
                                    const isOngoing = m === allMonths[new Date().getMonth()] // Simplified check
                                    return (
                                        <div
                                            key={m}
                                            className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${isPaid
                                                ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400'
                                                : isOngoing
                                                    ? 'bg-white dark:bg-slate-800 border-rose-400 text-slate-400 animate-pulse-subtle shadow-lg'
                                                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600'
                                                }`}
                                        >
                                            <HiOutlineCheckCircle className={`text-xl ${isPaid ? 'opacity-100' : 'opacity-20'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{m.substring(0, 3)}</span>
                                            {isOngoing && !isPaid && (
                                                <div className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-full shadow-lg">
                                                    ONGOING
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="pt-4 flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-widest">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full" /> Approved</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white border-2 border-rose-400 rounded-full" /> Ongoing Month</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-200 rounded-full" /> Unpaid/Pending</div>
                            </div>
                        </div>
                    )
                })()}

                <div className="modal-footer justify-center bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-800">
                    <button className="btn btn-ghost h-12 px-12 rounded-2xl font-black text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors" onClick={onClose}>Close History View</button>
                </div>
            </div>
        </div>
    )
}

function LeftViewWarden({ downloadSecureFile }) {
    const [leftStudents, setLeftStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => {
            loadLeftStudents()
        }, 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    const loadLeftStudents = async () => {
        try {
            setLoading(true)
            const data = await api.getLeftStudents({ search: searchTerm })
            setLeftStudents(data)
        } catch (err) {
            console.error('Failed to load left students:', err)
            toast.error('Failed to fetch historical records')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteRecord = async (s) => {
        const msg = `Are you sure you want to PERMANENTLY purge all hostel records (payments, complaints, allocations) for ${s.name}?\n\nThis will keep the character identity but delete ALL hostel history.`;
        if (!window.confirm(msg)) return
        
        try {
            setLoading(true)
            if (s.studentId) {
                await api.purgeStudentRecord(s.studentId)
                toast.success('All hostel records purged successfully')
            } else {
                if (s.clId) await api.deleteClearanceById(s.clId)
                if (s.appId || s.id) await api.deleteApplication(s.appId || s.id)
                toast.success('Records deleted successfully')
            }
            loadLeftStudents()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
                {/* Search on Left */}
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400 group-focus-within:text-[#FAB95B] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input 
                        type="text" 
                        className="form-input pl-11 w-full h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 rounded-2xl focus:ring-2 focus:ring-[#FAB95B]/20 transition-all font-bold text-sm" 
                        placeholder="Search exit records by name, email or ID..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Info & Export on Right */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Exit Records: {leftStudents.length}</span>
                    </div>

                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block" />

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => downloadSecureFile(api.getLeftStudentsExportUrl('csv', { search: searchTerm }), `LeftStudents_${new Date().toLocaleDateString()}.csv`)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none cursor-pointer"
                            title="Export to CSV"
                        >
                            <HiOutlineTableCells className="text-lg" /> CSV
                        </button>
                        <button 
                            onClick={() => downloadSecureFile(api.getLeftStudentsExportUrl('pdf', { search: searchTerm }), `LeftStudents_${new Date().toLocaleDateString()}.pdf`)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none cursor-pointer"
                            title="Export to PDF"
                        >
                            <HiOutlineDocumentArrowDown className="text-lg" /> PDF
                        </button>
                    </div>
                </div>
            </div>

            <div className="card !p-0 overflow-hidden dark:bg-slate-900 border dark:border-slate-800 shadow-sm">
                <div className="table-container">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-8 py-6 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest">Student</th>
                                <th className="px-8 py-6 text-center text-[11px] font-black text-slate-500 uppercase tracking-widest">Final Status</th>
                                <th className="px-8 py-6 text-center text-[11px] font-black text-slate-500 uppercase tracking-widest">Exit Source</th>
                                <th className="px-8 py-6 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                            {loading && leftStudents.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-10 dark:text-slate-400 font-bold italic">Loading history records...</td></tr>
                            ) : leftStudents.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-20 text-slate-400 italic font-bold">No historical records found</td></tr>
                            ) : leftStudents.map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-700 dark:text-slate-200 uppercase text-sm group-hover:text-indigo-600 transition-colors">{s.name}</div>
                                        <div className="text-[11px] text-slate-400 font-bold italic">{s.roll}</div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`badge ${s.status === 'Deactivated' ? 'badge-danger' : 'badge-success'} shadow-none opacity-80 uppercase text-[9px]`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none block">{s.type}</span>
                                        <span className="text-[9px] text-slate-400 font-bold">{new Date(s.leftAt).toLocaleDateString()}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button 
                                            onClick={() => handleDeleteRecord(s)}
                                            className="p-2.5 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border-none cursor-pointer"
                                            title="Delete historical record permanently"
                                        >
                                            <HiTrash className="text-lg" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function ProfileDetailModal({ app, onClose, onAction, loading, downloadSecureFile }) {
    if (!app && !loading) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal !max-w-4xl dark:bg-slate-900 border dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="modal-header border-b dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#FAB95B] rounded-2xl flex items-center justify-center text-[#1A3263] text-xl font-black shadow-lg shadow-amber-500/20">
                            {app?.studentName?.charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Profile Details</h3>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1">
                                {app?.studentName} • {app?.studentRollNumber}
                            </p>
                        </div>
                    </div>
                    <button className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center border-none bg-transparent cursor-pointer text-slate-400 dark:text-slate-500 transition-colors" onClick={onClose}>
                        <HiXMark className="text-2xl" />
                    </button>
                </div>

                <div className="modal-body p-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                            <p className="text-sm font-bold text-slate-400 animate-pulse">Fetching details...</p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            {/* Status Section */}
                            <div className="flex flex-wrap items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Application Status</div>
                                    <div className="flex items-center gap-3">
                                        <div className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wide ${
                                            app.applicationStatus === 'Activated' || app.applicationStatus === 'Room Allocated' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                                            app.applicationStatus === 'Deactivated' || app.applicationStatus === 'Rejected' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' :
                                            'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                        }`}>
                                            {app.applicationStatus}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(app.applicationStatus !== 'Activated' && app.applicationStatus !== 'Room Allocated') ? (
                                        <button 
                                            onClick={() => {
                                                onAction(app._id, 'Activated')
                                                onClose()
                                            }}
                                            className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-xs border-none cursor-pointer hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                        >
                                            <HiOutlineCheckCircle className="text-lg" /> Activate Profile
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                onAction(app._id, 'Deactivated')
                                                onClose()
                                            }}
                                            className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-black text-xs border-none cursor-pointer hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
                                        >
                                            <HiOutlineXCircle className="text-lg" /> Deactivate Profile
                                        </button>
                                    )}
                                    {app.applicationStatus !== 'Rejected' && (
                                        <button 
                                            onClick={() => {
                                                onAction(app._id, 'Rejected')
                                                onClose()
                                            }}
                                            className="px-6 py-2.5 bg-rose-500 text-white rounded-xl font-black text-xs border-none cursor-pointer hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2"
                                        >
                                            <HiOutlineNoSymbol className="text-lg" /> Reject
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Academic Info */}
                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="w-6 h-px bg-indigo-500/30" /> Academic Details
                                    </h4>
                                    <div className="space-y-4 px-2">
                                        <DetailItem label="Full Name" value={app.studentName} />
                                        <DetailItem label="Registration #" value={app.registrationNumber} />
                                        <DetailItem label="Roll Number" value={app.studentRollNumber} />
                                        <DetailItem label="Email Address" value={app.studentEmail} isEmail />
                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailItem label="Wing / Gender" value={`${app.studentWing || app.gender} Wing`} />
                                            <DetailItem label="Faculty" value={app.faculty} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailItem label="Course" value={app.studentDegree} />
                                            <DetailItem label="Year" value={app.studentYear} />
                                        </div>
                                    </div>
                                </div>

                                {/* Personal Info */}
                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="w-6 h-px bg-indigo-500/30" /> Personal Details
                                    </h4>
                                    <div className="space-y-4 px-2">
                                        <DetailItem label="NIC / National ID" value={app.nic} />
                                        <DetailItem label="Contact Number" value={app.contactNumber} />
                                        <DetailItem label="Emergency Contact" value={`${app.emergencyContactName} (${app.emergencyContactPhone})`} />
                                        <DetailItem label="Guardian Name" value={app.guardianName} />
                                        <DetailItem label="Guardian Contact" value={app.guardianContactNumber} />
                                        <DetailItem label="Permanent Address" value={app.permanentAddress} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                {/* Medical Info */}
                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="w-6 h-px bg-indigo-500/30" /> Health Information
                                    </h4>
                                    <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Medical Condition</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${app.hasMedicalCondition ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {app.hasMedicalCondition ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                        {app.hasMedicalCondition && (
                                            <>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</span>
                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                        {app.medicalConditionDetails || 'No details provided'}
                                                    </p>
                                                </div>
                                                {app.medicalReportUrl && (
                                                    <button 
                                                        onClick={() => downloadSecureFile(app.medicalReportUrl, `Medical_Report_${app.studentRollNumber}.pdf`)}
                                                        className="w-full py-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border-none cursor-pointer flex items-center justify-center gap-2"
                                                    >
                                                        <HiOutlineDocumentArrowDown className="text-lg" /> Download Medical Report
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Hostel Preference */}
                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <span className="w-6 h-px bg-indigo-500/30" /> Hostel Preference
                                    </h4>
                                    <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <DetailItem label="Room Type" value={`${app.roomType || 'Single'} Room`} />
                                            <DetailItem label="Stay Duration" value={`${app.durationOfStay || 12} Months`} />
                                        </div>
                                        {app.paymentSlipUrl && (
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Payment Slip</span>
                                                <div className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-600 shadow-sm">
                                                    <img src={app.paymentSlipUrl} alt="Payment Slip" className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-indigo-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                        <a href={app.paymentSlipUrl} target="_blank" rel="noreferrer" className="p-2 bg-white text-indigo-600 rounded-full hover:scale-110 transition-transform">
                                                            <HiOutlineDocumentText size={20} />
                                                        </a>
                                                        <button 
                                                            onClick={() => downloadSecureFile(app.paymentSlipUrl, `Payment_Slip_${app.studentRollNumber}.jpg`)}
                                                            className="p-2 bg-white text-indigo-600 rounded-full hover:scale-110 transition-transform border-none cursor-pointer"
                                                        >
                                                            <HiOutlineDocumentArrowDown size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer bg-slate-50 dark:bg-slate-900 px-8 py-5 border-t dark:border-slate-800">
                    <button className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs border-none cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-all shadow-sm" onClick={onClose}>
                        Close Detail View
                    </button>
                    {app?.assignedRoom ? (
                        <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm">
                            <HiOutlineKey className="text-xl" /> Assigned: Room {app.assignedRoom}
                        </div>
                    ) : (
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Room not assigned yet</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DetailItem({ label, value, isEmail }) {
    return (
        <div className="space-y-0.5">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</div>
            <div className={`text-sm font-black tracking-tight ${isEmail ? 'text-indigo-500 italic' : 'text-slate-700 dark:text-slate-200'} truncate`}>
                {value || 'Not specified'}
            </div>
        </div>
    );
}




