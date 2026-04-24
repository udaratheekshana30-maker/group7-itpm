import React, { useState, useEffect } from 'react';
import { HiOutlineDocumentChartBar, HiOutlineMagnifyingGlass, HiOutlineDocumentText, HiOutlineCalendarDays, HiOutlineArrowTopRightOnSquare, HiOutlineTableCells, HiOutlineDocumentArrowDown } from 'react-icons/hi2';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const FinancialRecords = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [filteredRecords, setFilteredRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/financial/records', {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                setRecords(data.data);
                setFilteredRecords(data.data);
            }
        } catch (err) {
            toast.error('Failed to fetch records');
        } finally {
            setLoading(false);
        }
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

    useEffect(() => {
        fetchRecords();
    }, []);

    useEffect(() => {
        const lowerSearch = searchTerm.toLowerCase();
        const filtered = records.filter(r =>
            r.studentName.toLowerCase().includes(lowerSearch) ||
            r.rollNumber.toLowerCase().includes(lowerSearch) ||
            r.email.toLowerCase().includes(lowerSearch)
        );
        setFilteredRecords(filtered);
    }, [searchTerm, records]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Only refundable payment records
    const allPayments = [];
    filteredRecords.forEach(record => {
        if (record.refundPayment?.documentUrl) {
            allPayments.push({
                ...record,
                type: 'Refundable',
                amount: record.refundPayment.amount,
                date: record.refundPayment.submittedDate,
                doc: record.refundPayment.documentUrl,
                status: record.refund_status || 'Pending',
                period: 'Security Deposit'
            });
        }
    });

    // Sort by date descending
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

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
                            <HiOutlineDocumentChartBar className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Refundable Records</h1>
                            <p className="text-white/75 text-sm font-medium mt-1">Audit log of student security deposit submissions.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
                <div className="relative w-full md:w-96">
                    <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                    <input
                        type="text"
                        placeholder="Search student, roll number or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-5 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            const url = api.getFinancialRecordsExportUrl('csv', { search: searchTerm });
                            downloadSecureFile(url, `financial_records_${new Date().toLocaleDateString()}.csv`);
                        }}
                        className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
                    >
                        <HiOutlineTableCells className="text-lg" /> CSV
                    </button>
                    <button 
                        onClick={() => {
                            const url = api.getFinancialRecordsExportUrl('pdf', { search: searchTerm });
                            downloadSecureFile(url, `financial_records_${new Date().toLocaleDateString()}.pdf`);
                        }}
                        className="flex items-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
                    >
                        <HiOutlineDocumentArrowDown className="text-lg" /> PDF
                    </button>
                    <div className="text-[11px] font-black text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 uppercase tracking-[0.2em] shadow-sm">
                        Total Transactions: {allPayments.length}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Period</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Receipt</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {allPayments.map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-800 dark:text-white">{p.studentName}</span>
                                            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{p.rollNumber}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${p.type === 'Refundable' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                {p.type}
                                            </span>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{p.period}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 font-black text-slate-900 dark:text-white">
                                        LKR {p.amount?.toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-8 py-6 align-middle">
                                        <div className={`badge ${p.status === 'Accepted' || p.status === 'Approved' ? 'badge-success' :
                                            p.status === 'Rejected' ? 'badge-rejected' :
                                                'badge-warning'
                                            } uppercase tracking-widest`}>
                                            {p.status}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <a
                                            href={p.doc}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400"
                                        >
                                            View <HiOutlineArrowTopRightOnSquare className="text-base" />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinancialRecords;
