import React, { useState, useEffect, useCallback } from 'react';
import { 
    HiOutlineCurrencyDollar, 
    HiOutlineEye, 
    HiOutlineCheckCircle, 
    HiOutlineXCircle, 
    HiOutlineDocumentText,
    HiOutlineCalendarDays,
    HiOutlineArrowPath,
    HiOutlineClock,
    HiOutlineWallet,
    HiOutlineDocumentDuplicate,
    HiOutlineInformationCircle,
    HiOutlineMagnifyingGlass as HiOutlineSearch,
    HiOutlineTableCells,
    HiOutlineDocumentArrowDown
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const FinancialDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('deposits'); 
    const [payments, setPayments] = useState([]);
    const [clearances, setClearances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [selectedClearance, setSelectedClearance] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = useCallback(async () => {
        const token = user?.token || sessionStorage.getItem('hostel_token');
        if (!token) return;

        try {
            setLoading(true);
            const fetchPayments = async () => {
                const res = await fetch('/api/financial/refundable', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) return [];
                const data = await res.json();
                return data.success ? (data.data || []) : [];
            };

            const fetchClearances = async () => {
                const data = await api.getClearancesFinancial();
                return Array.isArray(data) ? data : [];
            };

            const [pData, cData] = await Promise.all([fetchPayments(), fetchClearances()]);
            setPayments(pData);
            setClearances(cData);

        } catch (err) {
            console.error('Fetch Error:', err);
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [fetchData, user]);

    const handleStatusUpdate = async (id, status) => {
        const token = user?.token || sessionStorage.getItem('hostel_token');
        try {
            setUpdatingId(id);
            const res = await fetch(`/api/financial/refundable/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Payment ${status.toLowerCase()} successfully`);
                setPayments(prev => prev.map(p => p._id === id ? data.data : p));
            } else {
                toast.error(data.msg || 'Update failed');
            }
        } catch (err) {
            toast.error('Error updating status');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleClearanceStatusUpdate = async (id, status) => {
        const token = user?.token || sessionStorage.getItem('hostel_token');
        try {
            setUpdatingId(id);
            const res = await fetch(`/api/clearance/${id}/warden`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Clearance ${status.toLowerCase()} successfully`);
                setClearances(prev => prev.map(c => c._id === id ? data.data : c));
                if (selectedClearance?._id === id) {
                    setSelectedClearance(prev => ({ ...prev, status }));
                }
            } else {
                toast.error(data.msg || 'Clearance update failed');
            }
        } catch (err) {
            toast.error('Error updating clearance');
        } finally {
            setUpdatingId(null);
        }
    };

    const calculateRefund = (clearance) => {
        if (!clearance) return 0;
        const initialDeposit = clearance.paymentHistory?.refundPayment?.amount || 0;
        const totalAdjustments = (clearance.monthlyAdjustments || []).reduce((sum, adj) => sum + (Number(adj.amount) || 0), 0);
        const totalCharges = (clearance.additionalCharges || []).reduce((sum, char) => sum + (Number(char.amount) || 0), 0);
        return initialDeposit - totalAdjustments - totalCharges;
    };

    // Robust Search Helper
    const matchesSearch = (item, fields) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return fields.some(field => {
            const val = item[field];
            return val && String(val).toLowerCase().includes(query);
        });
    };

    // Helper for secure file downloads with Bearer token
    const downloadSecureFile = async (url, filename) => {
        try {
            const token = user?.token || sessionStorage.getItem('hostel_token');
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

    if (!user) return (
        <div className="flex justify-center items-center py-40">
            <p className="text-slate-400 font-bold">Please log in to access the financial dashboard.</p>
        </div>
    );

    if (loading && payments.length === 0 && clearances.length === 0) {
        return (
            <div className="flex justify-center items-center py-40">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Filter Payments: studentName, email, rollNumber, studentId
    const filteredPayments = payments.filter(p => 
        matchesSearch(p, ['studentName', 'email', 'rollNumber', 'studentId'])
    );

    // Filter Clearances: studentName, studentRollNumber, studentEmail, studentPhone
    const filteredClearanceBase = (clearances || []).filter(c => 
        matchesSearch(c, ['studentName', 'studentRollNumber', 'studentEmail', 'studentPhone', 'rollNumber'])
    );

    const filteredActiveClearances = filteredClearanceBase
        .filter(c => c.status !== 'Approved' && c.status !== 'Rejected');

    const filteredApprovedClearances = filteredClearanceBase
        .filter(c => c.status === 'Approved');

    return (
        <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
            {/* Hero Section */}
            <div
                className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-10 text-white mb-10"
                style={{ background: 'linear-gradient(135deg, #1A3263 0%, #2D4A8A 100%)', boxShadow: '0 20px 60px rgba(26, 50, 99, 0.3)' }}
            >
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/[0.08]" />
                <div className="absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-white/[0.05]" />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-[11px] font-bold mb-4 backdrop-blur-sm border border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        SYSTEM ONLINE
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                            <HiOutlineCurrencyDollar className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Financial Hub</h1>
                            <p className="text-white/75 text-sm font-medium mt-1">Welcome, {user?.name || 'Financial Manager'}.</p>
                        </div>
                    </div>
                    <p className="text-white/70 text-[15px] max-w-2xl leading-relaxed">
                        Manage refundable payments, review student clearances, and track refund transfers across the hostel system.
                    </p>
                </div>
            </div>



            {/* Tab Navigation - Consolidated into one line */}
            <div className="flex gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-full md:w-fit border border-slate-100 dark:border-slate-800 overflow-x-auto scrollbar-hide shadow-sm shadow-slate-200/50">
                <button
                    onClick={() => { setActiveTab('deposits'); setSelectedClearance(null); }}
                    className={`flex items-center justify-center px-4 sm:px-8 py-2.5 rounded-2xl text-[10px] sm:text-xs font-black transition-all flex-1 md:flex-none whitespace-nowrap ${activeTab === 'deposits' ? 'bg-[#FAB95B] text-[#1A3263] shadow-lg translate-y-[-1px]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    <div className="flex flex-col leading-tight items-center">
                        <span>REFUNDABLE</span>
                        <span>PAYMENTS</span>
                    </div>
                </button>
                <button
                    onClick={() => { setActiveTab('refunds'); setSelectedClearance(null); }}
                    className={`flex items-center justify-center px-4 sm:px-8 py-2.5 rounded-2xl text-[10px] sm:text-xs font-black transition-all flex-1 md:flex-none whitespace-nowrap ${activeTab === 'refunds' ? 'bg-[#FAB95B] text-[#1A3263] shadow-lg translate-y-[-1px]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    <div className="flex flex-col leading-tight items-center">
                        <span>CLEARANCE</span>
                        <span>REVIEW</span>
                    </div>
                    {clearances.filter(c => c.status === 'Pending' || c.status === 'In Progress').length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-1" />
                    )}
                </button>
                <button
                    onClick={() => { setActiveTab('transfers'); setSelectedClearance(null); }}
                    className={`flex items-center justify-center px-4 sm:px-8 py-2.5 rounded-2xl text-[10px] sm:text-xs font-black transition-all flex-1 md:flex-none whitespace-nowrap ${activeTab === 'transfers' ? 'bg-[#FAB95B] text-[#1A3263] shadow-lg translate-y-[-1px]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                    <div className="flex flex-col leading-tight items-center">
                        <span>REFUND</span>
                        <span>TRANSFERS</span>
                    </div>
                </button>
            </div>

            {/* Filter & Search Bar - Moved Under Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-2">
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <HiOutlineSearch className="text-slate-400 dark:text-slate-500 text-lg group-focus-within:text-[#FAB95B] group-focus-within:scale-110 transition-all font-bold" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search Name, ID or Email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-[#FAB95B]/20 focus:border-[#FAB95B] outline-none transition-all shadow-sm"
                    />
                </div>

                {/* Exports for Financial Hub - Moved Infront of Searchbar */}
                <div className="flex items-center gap-2 pr-1">
                    <button 
                        onClick={() => {
                            const url = activeTab === 'deposits' 
                                ? api.getRefundableExportUrl('csv', { search: searchQuery })
                                : api.getRefundTransfersExportUrl('csv', { search: searchQuery });
                            downloadSecureFile(url, `${activeTab}_${new Date().toLocaleDateString()}.csv`);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none cursor-pointer"
                        title="Export to CSV"
                    >
                        <HiOutlineTableCells className="text-lg" /> CSV
                    </button>
                    <button 
                        onClick={() => {
                            const url = activeTab === 'deposits' 
                                ? api.getRefundableExportUrl('pdf', { search: searchQuery })
                                : api.getRefundTransfersExportUrl('pdf', { search: searchQuery });
                            downloadSecureFile(url, `${activeTab}_${new Date().toLocaleDateString()}.pdf`);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border-none cursor-pointer"
                        title="Export to PDF"
                    >
                        <HiOutlineDocumentArrowDown className="text-lg" /> PDF
                    </button>
                </div>
            </div>

            {activeTab === 'deposits' ? (
                /* Refundable Payments Tab */
                <div className="grid grid-cols-1 gap-6">
                    {filteredPayments.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 transition-all">
                            <HiOutlineCurrencyDollar className="text-6xl text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                            <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-xs font-mono">
                                {searchQuery ? `No results found for "${searchQuery}"` : "No refundable payment submissions found"}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all shadow-slate-200/50">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Refundable Payment</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Submission</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {filteredPayments.map((p) => (
                                            <tr key={p._id} className="hover:bg-slate-50/30 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-[#FAB95B] transition-colors">{p.studentName}</span>
                                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{p.email}</span>
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full tracking-tighter uppercase">{p.rollNumber || p.studentId || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-lg font-black text-slate-900 dark:text-white transition-colors">LKR {p.refundPayment?.amount?.toLocaleString() || '0'}</div>
                                                </td>
                                                <td className="px-8 py-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                                    {p.refundPayment?.submittedDate ? new Date(p.refundPayment.submittedDate).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <StatusBadge status={p.refund_status} />
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-2 text-slate-400 dark:text-slate-500">
                                                        {p.refundPayment?.documentUrl && (
                                                            <a href={p.refundPayment.documentUrl} target="_blank" rel="noreferrer" className="p-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:text-indigo-600 hover:border-indigo-100 dark:hover:border-indigo-500/30 rounded-xl transition-all shadow-sm"><HiOutlineEye className="text-xl" /></a>
                                                        )}
                                                        <button onClick={() => handleStatusUpdate(p._id, 'Accepted')} disabled={updatingId === p._id || p.refund_status === 'Accepted'} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:text-emerald-600 hover:border-emerald-100 dark:hover:border-emerald-500/30 rounded-xl transition-all disabled:opacity-30 shadow-sm"><HiOutlineCheckCircle className="text-xl" /></button>
                                                        <button onClick={() => handleStatusUpdate(p._id, 'Rejected')} disabled={updatingId === p._id || p.refund_status === 'Rejected'} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 hover:text-rose-600 hover:border-rose-100 dark:hover:border-rose-500/30 rounded-xl transition-all disabled:opacity-30 shadow-sm"><HiOutlineXCircle className="text-xl" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ) : activeTab === 'refunds' ? (
                /* Clearance Review Tab */
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-12">
                             <div className="grid lg:grid-cols-12 gap-8">
                                {/* List - Left Side */}
                                <div className="lg:col-span-5 space-y-4">
                                    {filteredActiveClearances.length === 0 ? (
                                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 transition-all">
                                            <HiOutlineArrowPath className="text-5xl text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                                            <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[10px] font-mono">
                                                {searchQuery ? `No matching clearances for "${searchQuery}"` : "No active clearance forms found"}
                                            </p>
                                        </div>
                                    ) : (
                                        filteredActiveClearances.map((c) => (
                                            <div
                                                key={c._id}
                                                onClick={() => setSelectedClearance(c)}
                                                className={`p-6 rounded-2xl border transition-all cursor-pointer relative group ${selectedClearance?._id === c._id ? 'bg-[#FAB95B] border-[#FAB95B] text-[#1A3263] shadow-xl shadow-[#FAB95B]/20 dark:shadow-none translate-y-[-2px]' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:scale-[1.01]'}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className={`font-black text-sm mb-1 ${selectedClearance?._id === c._id ? 'text-[#1A3263]' : 'text-slate-800 dark:text-white'}`}>{c.studentName}</h4>
                                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedClearance?._id === c._id ? 'text-[#1A3263]/70' : 'text-slate-400 dark:text-slate-500'}`}>{c.studentRollNumber || c.rollNumber || 'N/A'}</p>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        c.status === 'In Progress' ? 'bg-[#FAB95B] text-white' :
                                                        selectedClearance?._id === c._id ? 'bg-white/20 text-[#1A3263]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors'
                                                    }`}>
                                                        {c.status || 'Pending'}
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center justify-between text-[10px] font-bold">
                                                    <span className={selectedClearance?._id === c._id ? 'text-[#1A3263]/70' : 'text-slate-400 dark:text-slate-500'}>
                                                        {c.submittedAt ? `Submitted ${new Date(c.submittedAt).toLocaleDateString()}` : 'Date Unknown'}
                                                    </span>
                                                    {c.isWardenSubmitted ? (
                                                        <span className={`flex items-center gap-1 ${selectedClearance?._id === c._id ? 'text-emerald-700' : 'text-emerald-500 dark:text-emerald-400 transition-colors'}`}>
                                                            <HiOutlineCheckCircle className="text-sm" /> Warden Reviewed
                                                        </span>
                                                    ) : (
                                                        <span className={`transition-colors ${selectedClearance?._id === c._id ? 'text-[#1A3263]/70' : 'text-[#FAB95B] dark:text-[#FAB95B]'}`}>Warden Pending</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Detail View - Right Side */}
                                <div className="lg:col-span-7">
                                    {!selectedClearance ? (
                                        <div className="bg-slate-50/50 dark:bg-slate-800/20 rounded-3xl h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border border-slate-100 dark:border-slate-800 border-dashed transition-all">
                                            <HiOutlineEye className="text-6xl text-slate-200 dark:text-slate-800 mb-4" />
                                            <p className="text-slate-400 dark:text-slate-500 font-black text-xs uppercase tracking-widest font-mono">Select a request to review details</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 space-y-8 sticky top-8 transition-all">
                                            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-6 mb-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 transition-colors shadow-sm">
                                                        <HiOutlineDocumentText className="text-2xl" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none mb-1">Refund Application</h3>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Clearance Submission</p>
                                                            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                                                            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest">Contact - {selectedClearance.studentPhone || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleClearanceStatusUpdate(selectedClearance._id, 'Approved')}
                                                            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-emerald-500/20 active:translate-y-0.5"
                                                            disabled={updatingId === selectedClearance._id || selectedClearance.status === 'Approved' || !selectedClearance.isWardenSubmitted}
                                                        >
                                                            Approve Refund
                                                        </button>
                                                        <button
                                                            onClick={() => handleClearanceStatusUpdate(selectedClearance._id, 'Rejected')}
                                                            className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-rose-500/20 active:translate-y-0.5"
                                                            disabled={updatingId === selectedClearance._id || selectedClearance.status === 'Rejected' || !selectedClearance.isWardenSubmitted}
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                    {!selectedClearance.isWardenSubmitted && (
                                                        <p className="text-[9px] font-black text-[#FAB95B] uppercase tracking-widest animate-pulse">
                                                            ⚠️ waiting for warden's review
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Refund Summary Banner */}
                                            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-3xl p-10 text-white shadow-2xl">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                                                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-400/10 rounded-full -ml-20 -mb-20 blur-2xl" />

                                                <div className="relative z-10 grid grid-cols-2 gap-10 divide-x divide-white/10">
                                                    <div className="space-y-2">
                                                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] block">Refundable Payment</span>
                                                        <p className="text-3xl font-black">LKR {selectedClearance.paymentHistory?.refundPayment?.amount?.toLocaleString() || '0'}</p>
                                                    </div>
                                                    <div className="pl-10 space-y-2">
                                                        <span className="text-[10px] font-black text-rose-300 uppercase tracking-[0.2em] block">Total Refund Due</span>
                                                        <p className="text-4xl font-black text-emerald-400 drop-shadow-sm transition-all animate-in fade-in zoom-in duration-500">LKR {calculateRefund(selectedClearance).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-8">
                                                {/* Warden Deductions */}
                                                <div className="space-y-6">
                                                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                                        <HiOutlineXCircle className="text-rose-400" />
                                                        Warden Review
                                                    </h4>

                                                    <div className="space-y-4">
                                                        {/* Dues */}
                                                        <div className="space-y-2">
                                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Monthly Dues</span>
                                                            {(selectedClearance.monthlyAdjustments || []).length > 0 ? selectedClearance.monthlyAdjustments.map((adj, idx) => (
                                                                <div key={idx} className="flex justify-between items-center p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-100/50 dark:border-rose-900/30 transition-colors">
                                                                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">{adj.month || 'Adjustment'}</span>
                                                                    <span className="text-xs font-black text-rose-900 dark:text-rose-200">LKR {adj.amount?.toLocaleString()}</span>
                                                                </div>
                                                            )) : (
                                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] font-bold text-slate-400 dark:text-slate-500 italic text-center border border-slate-100 dark:border-slate-800 transition-colors">No Monthly Dues</div>
                                                            )}
                                                        </div>

                                                        {/* Extra Charges */}
                                                        <div className="space-y-2">
                                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Extra Charges</span>
                                                            {(selectedClearance.additionalCharges || []).length > 0 ? selectedClearance.additionalCharges.map((char, idx) => (
                                                                <div key={idx} className="p-3 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl border border-rose-100/50 dark:border-rose-900/30 space-y-1 transition-colors">
                                                                    <div className="flex justify-between items-center">
                                                                         <span className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Damage/Other</span>
                                                                         <span className="text-xs font-black text-rose-900 dark:text-rose-200">LKR {char.amount?.toLocaleString()}</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-rose-500 dark:text-rose-500 font-bold italic line-clamp-1">{char.note}</p>
                                                                </div>
                                                            )) : (
                                                                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-[10px] font-bold text-slate-400 dark:text-slate-500 italic text-center border border-slate-100 dark:border-slate-800 transition-colors">No Additional Charges</div>
                                                            )}
                                                        </div>

                                                        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center group transition-colors shadow-sm">
                                                            <div className="flex items-center gap-2">
                                                                <HiOutlineInformationCircle className="text-[#FAB95B] group-hover:scale-110 transition-transform" />
                                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Keys:</span>
                                                            </div>
                                                            <span className={`text-xs font-black uppercase tracking-widest transition-colors ${selectedClearance.keyStatus === 'Returned' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{selectedClearance.keyStatus || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bank Details & Payments History */}
                                                <div className="space-y-6">
                                                    {/* Bank Details */}
                                                    <div className="space-y-4">
                                                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                                            <HiOutlineWallet className="text-indigo-400" />
                                                            Refund Bank Details
                                                        </h4>
                                                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 grid grid-cols-1 gap-4 transition-all shadow-sm">
                                                            <div className="flex justify-between items-center border-b border-white/50 dark:border-slate-800 pb-2">
                                                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Account Holder</span>
                                                                <span className="text-xs font-black text-slate-700 dark:text-white transition-colors">{selectedClearance.bankDetails?.accountHolderName || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center border-b border-white/50 dark:border-slate-800 pb-2">
                                                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Bank</span>
                                                                <span className="text-xs font-black text-slate-700 dark:text-white transition-colors">{selectedClearance.bankDetails?.bankName || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center border-b border-white/50 dark:border-slate-800 pb-2">
                                                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Branch</span>
                                                                <span className="text-xs font-black text-slate-700 dark:text-white transition-colors">{selectedClearance.bankDetails?.branchName || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Account Number</span>
                                                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-wider bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700 transition-all shadow-sm">{selectedClearance.bankDetails?.accountNumber || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                                        <HiOutlineCalendarDays className="text-indigo-400" />
                                                        Payment History
                                                    </h4>

                                                    <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {(selectedClearance.paymentHistory?.submittedMonths || []).length > 0 ? selectedClearance.paymentHistory.submittedMonths.map((m, idx) => (
                                                            <div key={idx} className="p-4 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-100 dark:hover:border-indigo-500/30 hover:shadow-md group">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                                        {Array.isArray(m.months) ? m.months.join(', ') : m.month}
                                                                    </span>
                                                                    <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${m.status === 'Accepted' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-[#FAB95B]/10 dark:bg-[#FAB95B]/20 text-[#FAB95B]'} transition-colors`}>
                                                                        {m.status}
                                                                    </div>
                                                                </div>
                                                                <div className="font-black text-slate-900 dark:text-slate-100 text-sm transition-colors">LKR {m.amount?.toLocaleString()}</div>
                                                            </div>
                                                        )) : (
                                                            <div className="py-12 text-center space-y-3">
                                                                <HiOutlineClock className="text-4xl text-slate-200 dark:text-slate-800 mx-auto opacity-50" />
                                                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">No payment records found</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Refund Transfers Tab */
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all shadow-slate-200/50">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Bank Account Details</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Net Refund</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                                    {filteredApprovedClearances.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-20 text-center">
                                                <HiOutlineWallet className="text-6xl text-slate-100 dark:text-slate-800 mx-auto mb-4 opacity-50" />
                                                <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest text-[10px] font-mono">
                                                    {searchQuery ? `No matching transfers for "${searchQuery}"` : "No approved refunds ready for transfer"}
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredApprovedClearances.map((c) => (
                                            <tr key={c._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-800 dark:text-white transition-colors group-hover:text-indigo-600 dark:group-hover:text-[#FAB95B]">{c.studentName}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">{c.studentRollNumber || c.rollNumber || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase w-20">Holder:</span>
                                                            <span className="text-xs font-black text-slate-700 dark:text-white transition-colors">{c.bankDetails?.accountHolderName || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase w-20">Bank:</span>
                                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">{c.bankDetails?.bankName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase w-20">Branch:</span>
                                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">{c.bankDetails?.branchName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase w-20">Account:</span>
                                                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/50 shadow-sm">{c.bankDetails?.accountNumber}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 transition-colors">LKR {calculateRefund(c).toLocaleString()}</div>
                                                    <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Final Approved Amount</div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(c.bankDetails?.accountNumber);
                                                            toast.success('Account number copied!');
                                                        }}
                                                        className="px-6 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ml-auto shadow-sm active:scale-95"
                                                    >
                                                        <HiOutlineDocumentDuplicate className="text-sm" /> Copy Acc No
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const styles = {
        Accepted: 'badge-success',
        Approved: 'badge-success',
        Rejected: 'badge-rejected',
        'In Progress': 'badge-warning',
        default: 'badge-warning'
    };
    const currentClass = styles[status] || styles.default;
    return (
        <span className={`badge ${currentClass} uppercase tracking-widest transition-colors`}>
            {status || 'Pending'}
        </span>
    );
};

export default FinancialDashboard;
