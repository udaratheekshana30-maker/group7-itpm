import React, { useState, useEffect, useRef } from 'react';
import {
    HiOutlineCurrencyDollar,
    HiOutlineDocumentArrowUp,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineInformationCircle,
    HiOutlineCloudArrowUp,
    HiOutlineCalendarDays,
    HiOutlineDocumentText,
    HiOutlineExclamationTriangle,
    HiOutlineUser,
    HiOutlinePencilSquare,
    HiOutlineXMark,
    HiOutlineTrash
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

const API = '/api';

const PaymentTab = ({ user }) => {
    const [initialData, setInitialData] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSubmission, setEditingSubmission] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [editFile, setEditFile] = useState(null);
    const editFileRef = useRef(null);

    // Refundable Form State
    const [refundableAmount, setRefundableAmount] = useState('');
    const [refundableFile, setRefundableFile] = useState(null);
    const refundableFileRef = useRef(null);

    // Monthly Form State
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [monthlyAmount, setMonthlyAmount] = useState('');
    const [monthlyFile, setMonthlyFile] = useState(null);
    const monthlyFileRef = useRef(null);

    const monthOptions = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = new Date().getFullYear();

    // Filter months based on join date
    const visibleMonths = (() => {
        if (!initialData?.joinedAt) return monthOptions;
        const joinDate = new Date(initialData.joinedAt);
        const joinYear = joinDate.getFullYear();
        const joinMonth = joinDate.getMonth(); // 0-indexed

        if (currentYear === joinYear) {
            return monthOptions.slice(joinMonth);
        }
        return monthOptions;
    })();
    const paidMonths = paymentStatus?.submittedMonths
        ? paymentStatus.submittedMonths
            .filter(m => m.status === 'Accepted' && m.year === currentYear)
            .flatMap(m => m.months || [m.month])
        : [];

    const toggleMonth = (m) => {
        if (paidMonths.includes(m)) return;
        setSelectedMonths(prev =>
            prev.includes(m) ? prev.filter(item => item !== m) : [...prev, m]
        );
    };

    useEffect(() => {
        fetchInitialData();
        fetchPaymentStatus();
    }, []);

    const fetchInitialData = async () => {
        try {
            const res = await fetch(`${API}/student-payments/initial-data`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                setInitialData(data.data);
            }
        } catch (err) {
            console.error('Error fetching initial data:', err);
        }
    };

    const fetchPaymentStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/student-payments/status`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                setPaymentStatus(data.data);
            }
        } catch (err) {
            console.error('Error fetching payment status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e, setFile) => {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
        if (!allowedTypes.includes(file.mimetype || file.type)) {
            toast.error('Invalid file format. Allowed: PDF, DOC, PNG, JPG');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('File size exceeds 10MB');
            return;
        }

        setFile(file);
    };

    const handleRemoveFile = (setter, ref) => {
        setter(null);
        if (ref.current) {
            ref.current.value = "";
        }
    };

    const submitRefundable = async (e) => {
        e.preventDefault();
        if (!refundableAmount || !refundableFile) {
            toast.error('Please fill all fields and upload payment proof');
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append('amount', refundableAmount);
        formData.append('document', refundableFile);
        formData.append('paymentType', 'Refundable');

        // Include initial data for model creation
        if (initialData) {
            Object.keys(initialData).forEach(key => {
                formData.append(key, initialData[key]);
            });
        }

        try {
            const res = await fetch(`${API}/student-payments/refundable`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user.token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Refundable payment submitted successfully!');
                setPaymentStatus(data.data);
                setRefundableAmount('');
                setRefundableFile(null);
            } else {
                toast.error(data.msg || 'Submission failed');
            }
        } catch (err) {
            toast.error('Error submitting payment');
        } finally {
            setSubmitting(false);
        }
    };

    const submitMonthly = async (e) => {
        e.preventDefault();
        if (selectedMonths.length === 0 || !monthlyAmount || !monthlyFile) {
            toast.error('Please select months, enter amount and upload payment proof');
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        const now = new Date();
        formData.append('year', now.getFullYear());
        formData.append('amount', monthlyAmount);
        formData.append('document', monthlyFile);
        formData.append('months', JSON.stringify(selectedMonths));
        formData.append('monthCount', selectedMonths.length);

        try {
            const res = await fetch(`${API}/student-payments/monthly`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user.token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Monthly payment submitted successfully!');
                setPaymentStatus(data.data);
                setMonthlyAmount('');
                setMonthlyFile(null);
                setSelectedMonths([]);
            } else {
                toast.error(data.msg || 'Submission failed');
            }
        } catch (err) {
            toast.error('Error submitting payment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (submission) => {
        setEditingSubmission(submission);
        setEditAmount(submission.amount);
        setEditFile(null);
        setShowEditModal(true);
    };

    const submitMonthlyUpdate = async (e) => {
        e.preventDefault();
        if (!editAmount) {
            toast.error('Please enter amount');
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append('amount', editAmount);
        if (editFile) {
            formData.append('document', editFile);
        }

        try {
            const res = await fetch(`${API}/student-payments/monthly/${editingSubmission.submissionId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${user.token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Payment updated successfully!');
                setPaymentStatus(data.data);
                setShowEditModal(false);
                setEditingSubmission(null);
                setEditAmount('');
                setEditFile(null);
            } else {
                toast.error(data.msg || 'Update failed');
            }
        } catch (err) {
            toast.error('Error updating payment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!initialData) {
        return (
            <div className="max-w-4xl mx-auto py-20 px-6 animate-in fade-in zoom-in duration-500">
                <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 text-center shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 space-y-8 relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-400 via-rose-500 to-amber-500" />
                    
                    <div className="relative">
                        <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-12 hover:rotate-0 transition-all duration-500 shadow-xl shadow-rose-100 dark:shadow-none">
                            <HiOutlineExclamationTriangle className="text-5xl text-rose-500" />
                        </div>
                        
                        <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Portal Locked</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-lg mt-4 max-w-md mx-auto leading-relaxed">
                            Please submit your <span className="text-rose-500 underline decoration-rose-200 underline-offset-4 font-black">Hostel Application Form</span> first to unlock the payment portal.
                        </p>
                    </div>

                    <div className="pt-6 flex flex-col items-center gap-4">
                        <div className="inline-flex items-center gap-3 px-8 py-4 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 text-xs font-black uppercase tracking-[0.2em]">
                            <HiOutlineInformationCircle className="text-xl" />
                            Application Required
                        </div>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">You will be able to make payments once your application is detected.</p>
                    </div>
                </div>
            </div>
        );
    }

    const isRefundableSubmitted = paymentStatus?.refundPayment?.documentUrl && (paymentStatus.refund_status !== 'Rejected' && paymentStatus.refundPayment.paymentStatus !== 'Rejected');

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8 animate-in fade-in duration-500">
            {/* ── Student Information ── */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative transition-all">
                <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <HiOutlineUser className="text-xl" />
                    </div>
                    Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InfoBox label="Student Name" value={initialData?.studentName || user?.name} />
                    <InfoBox label="Email Address" value={initialData?.email || user?.email} />
                    <InfoBox label="Roll Number" value={initialData?.rollNumber || 'N/A'} />
                    <InfoBox label="Wing" value={initialData?.wing || 'N/A'} isCapitalized />
                    <InfoBox label="Room Type" value={initialData?.roomType || 'N/A'} isCapitalized />
                </div>
            </div>


            <div className="grid lg:grid-cols-2 gap-8">
                {/* ── Refundable Payment Section ── */}
                <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 transition-all ${isRefundableSubmitted ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <HiOutlineCurrencyDollar />
                        </div>
                        Refundable Payment
                    </h2>

                    {isRefundableSubmitted ? (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-[2rem] p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                <HiOutlineCheckCircle className="text-4xl text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-emerald-900 dark:text-emerald-100">Payment Completed</h3>
                                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Your refundable payment has been successfully recorded.</p>
                            </div>
                            <div className="pt-4 flex flex-col items-center gap-4">
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Amount Paid</span>
                                    <span className="text-2xl font-black text-emerald-900 dark:text-emerald-100">LKR {paymentStatus.refundPayment.amount?.toLocaleString()}</span>
                                </div>

                                {/* Refund Status Badge */}
                                <div className="flex flex-col items-center gap-1.5 w-full pt-2 border-t border-emerald-100/50 dark:border-emerald-900/30">
                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Refund Status</span>
                                    <div className={`px-6 py-2 rounded-2xl font-black text-[11px] uppercase tracking-wider border-2 ${paymentStatus.refund_status === 'Accepted' ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-100 dark:shadow-none' :
                                            paymentStatus.refund_status === 'Rejected' ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-100 dark:shadow-none' :
                                                'bg-amber-400 text-amber-900 border-amber-300 shadow-lg shadow-amber-100 dark:shadow-none'
                                        }`}>
                                        {paymentStatus.refund_status || 'Pending'}
                                    </div>
                                </div>
                            </div>
                            {paymentStatus.refund_status === 'Accepted' && (
                                <div className="mt-4 p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-[2rem] text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-700">
                                    <span className="text-2xl text-emerald-500"></span>
                                    <span>Refundable is successful. Check your bank account!</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={submitRefundable} className="space-y-6">
                            {(paymentStatus?.refund_status === 'Rejected' || paymentStatus?.refundPayment?.paymentStatus === 'Rejected') && (
                                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 animate-pulse">
                                    <HiOutlineExclamationTriangle className="text-xl shrink-0" />
                                    <p className="text-xs font-bold leading-tight">Your previous submission was REJECTED. Please correct the amount or payment proof and re-submit for review.</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Payment Amount (LKR)</label>
                                <div className="relative">
                                    <HiOutlineCurrencyDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-lg" />
                                    <input
                                        type="number"
                                        value={refundableAmount}
                                        onChange={(e) => setRefundableAmount(e.target.value)}
                                        className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                        placeholder="Enter amount"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Payment Proof (PDF, DOC, PNG, JPG)</label>
                                <div
                                    onClick={() => refundableFileRef.current.click()}
                                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${refundableFile ? 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <input
                                        type="file"
                                        ref={refundableFileRef}
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e, setRefundableFile)}
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                    />
                                    {refundableFile ? (
                                        <div className="flex flex-col items-center gap-3 relative">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFile(setRefundableFile, refundableFileRef);
                                                }}
                                                className="absolute -top-4 -right-4 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 active:scale-95 transition-all z-10"
                                                title="Remove file"
                                            >
                                                <HiOutlineTrash className="text-xl" />
                                            </button>
                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center gap-2">
                                                <HiOutlineDocumentText className="text-4xl text-emerald-500" />
                                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[200px]">{refundableFile.name}</span>
                                                <span className="text-[10px] font-bold text-emerald-300 dark:text-emerald-600 uppercase tracking-widest">Selected Proof</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Click box to change file</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                                            <HiOutlineCloudArrowUp className="text-4xl" />
                                            <span className="text-sm font-bold">Select payment slip or screenshot</span>
                                            <span className="text-[10px] uppercase font-black tracking-widest">Max size: 10MB</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3"
                            >
                                {submitting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <HiOutlineCloudArrowUp className="text-xl" />}
                                {paymentStatus?.refund_status === 'Rejected' ? 'Re-submit Refundable Payment' : 'Submit Refundable Payment'}
                            </button>
                        </form>
                    )}
                </div>

                {/* ── Monthly Payment Section ── */}
                <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 transition-all ${!isRefundableSubmitted ? 'opacity-40 select-none' : ''}`}>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-3">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
                            <HiOutlineCalendarDays />
                        </div>
                        Monthly Payment
                    </h2>

                    {!isRefundableSubmitted ? (
                        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-[2rem] p-12 text-center space-y-4">
                            <HiOutlineClock className="text-5xl text-slate-300 dark:text-slate-400 mx-auto" />
                            <p className="text-slate-500 dark:text-slate-500 font-bold text-sm max-w-[250px] mx-auto italic">Complete your refundable payment first to unlock monthly payments.</p>
                        </div>
                    ) : (
                        <form onSubmit={submitMonthly} className="space-y-6">
                            <div className="space-y-4">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Select Months</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {visibleMonths.map(m => {
                                        const isPaid = paidMonths.includes(m);
                                        const isSelected = selectedMonths.includes(m);
                                        return (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => toggleMonth(m)}
                                                disabled={isPaid}
                                                className={`py-2.5 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${isPaid
                                                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-100 dark:shadow-none cursor-not-allowed'
                                                        : isSelected
                                                            ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 ring-2 ring-amber-50 dark:ring-amber-900/20'
                                                            : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-700 hover:border-amber-200 dark:hover:border-amber-500'
                                                    }`}
                                            >
                                                {m.substring(0, 3)}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedMonths.length > 0 && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-center justify-between transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-amber-400 dark:text-amber-500 uppercase tracking-widest">Selected Period</span>
                                            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">{selectedMonths.join(', ')}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-amber-400 dark:text-amber-500 uppercase tracking-widest">Count</span>
                                            <span className="block text-lg font-black text-amber-900 dark:text-amber-100">{selectedMonths.length}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Total Fee (LKR)</label>
                                <div className="relative">
                                    <HiOutlineCurrencyDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-lg" />
                                    <input
                                        type="number"
                                        value={monthlyAmount}
                                        onChange={(e) => setMonthlyAmount(e.target.value)}
                                        className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Payment Proof (Monthly_Payment)</label>
                                <div
                                    onClick={() => monthlyFileRef.current.click()}
                                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${monthlyFile ? 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <input
                                        type="file"
                                        ref={monthlyFileRef}
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e, setMonthlyFile)}
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                    />
                                    {monthlyFile ? (
                                        <div className="flex flex-col items-center gap-3 relative">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFile(setMonthlyFile, monthlyFileRef);
                                                }}
                                                className="absolute -top-4 -right-4 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 active:scale-95 transition-all z-10"
                                                title="Remove file"
                                            >
                                                <HiOutlineTrash className="text-xl" />
                                            </button>
                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center gap-2">
                                                <HiOutlineDocumentText className="text-4xl text-emerald-500" />
                                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[200px]">{monthlyFile.name}</span>
                                                <span className="text-[10px] font-bold text-emerald-300 dark:text-emerald-600 uppercase tracking-widest">Selected Proof</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Click box to change file</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                                            <HiOutlineCloudArrowUp className="text-4xl" />
                                            <span className="text-sm font-bold">Upload slip for {selectedMonths.length > 0 ? selectedMonths.length : 'selected'} month{selectedMonths.length !== 1 ? 's' : ''}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-5 bg-slate-900 dark:bg-slate-800 text-white rounded-[2rem] font-black text-sm hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-xl shadow-slate-200 dark:shadow-none flex items-center justify-center gap-3"
                            >
                                {submitting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <HiOutlineDocumentArrowUp className="text-xl" />}
                                Submit Monthly Payment
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* ── Payment History ── */}
            {paymentStatus?.submittedMonths?.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative transition-all">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-8 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <HiOutlineClock />
                        </div>
                        Monthly Submission History
                    </h2>
                    <div className="flex md:block space-y-3 md:space-y-3 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory pb-8 md:pb-0 -mx-6 px-6 md:mx-0 md:px-0 scrollbar-hide">
                        {/* Header Row - Hidden on mobile */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                            <div className="col-span-1">#</div>
                            <div className="col-span-4">Payment Period</div>
                            <div className="col-span-2 text-center">Amount (LKR)</div>
                            <div className="col-span-2 text-center">Status</div>
                            <div className="col-span-3 text-right">Actions</div>
                        </div>

                        {paymentStatus.submittedMonths.map((m, idx) => (
                            <div key={idx} className="min-w-[85vw] flex-shrink-0 md:min-w-full snap-start group grid grid-cols-1 md:grid-cols-12 gap-5 items-center p-6 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 rounded-3xl hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-100 dark:hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                                {/* Mobile Index & Label */}
                                <div className="md:col-span-1 flex items-center justify-between md:justify-start gap-4">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white text-[10px] font-black shadow-lg shadow-indigo-100 dark:shadow-none">
                                            {idx + 1}
                                        </span>
                                        <span className="md:hidden text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Entry Order</span>
                                    </div>
                                    <span className="md:hidden text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">Record #{idx + 1}</span>
                                </div>

                                {/* Period */}
                                <div className="md:col-span-4 flex items-center justify-between md:block space-y-1 px-1">
                                    <span className="md:hidden block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Payment Period</span>
                                    <span className="text-sm md:text-base font-bold text-slate-700 dark:text-slate-200 truncate block text-right md:text-left">
                                        {m.months?.join(', ') || m.month} {m.year}
                                    </span>
                                </div>

                                {/* Amount */}
                                <div className="md:col-span-2 flex items-center justify-between md:block md:text-center space-y-1">
                                    <span className="md:hidden block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Amount Paid</span>
                                    <span className="text-sm md:text-base font-black text-slate-800 dark:text-slate-100 block text-right md:text-center">
                                        LKR {m.amount?.toLocaleString()}
                                    </span>
                                </div>

                                {/* Status */}
                                <div className="md:col-span-2 md:text-center flex items-center justify-between md:justify-center pt-1 md:pt-0">
                                    <span className="md:hidden text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Submission Status</span>
                                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                        m.status === 'Accepted' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                        m.status === 'Rejected' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' :
                                        'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                                    }`}>
                                        {m.status || 'Pending'}
                                    </div>
                                </div>

                                {/* Action */}
                                <div className="md:col-span-3 flex flex-wrap md:flex-nowrap justify-end gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                                    {m.status === 'Rejected' && (
                                        <button
                                            onClick={() => handleEditClick({ ...m, submissionId: m._id })}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-md shadow-amber-100 dark:shadow-none min-w-[80px]"
                                        >
                                            <HiOutlinePencilSquare className="text-sm" />
                                            <span>Update</span>
                                        </button>
                                    )}
                                    <a
                                        href={m.documentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md group-hover:shadow-indigo-100 dark:group-hover:shadow-none min-w-[90px]"
                                    >
                                        <HiOutlineDocumentText className="text-sm" />
                                        <span>View Receipt</span>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Edit Monthly Submission Modal ── */}
            {showEditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-2xl text-amber-600 dark:text-amber-400">
                                    <HiOutlinePencilSquare className="text-2xl" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Edit Submission</h3>
                                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Update rejected payment record</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowEditModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <HiOutlineXMark className="text-2xl text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={submitMonthlyUpdate} className="p-8 space-y-6">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Selected Period</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{editingSubmission?.months?.join(', ') || editingSubmission?.month} {editingSubmission?.year}</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Update Amount (LKR)</label>
                                <div className="relative">
                                    <HiOutlineCurrencyDollar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-lg" />
                                    <input
                                        type="number"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        className="w-full pl-12 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                        placeholder="Enter new amount"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">New Payment Proof (Optional if same)</label>
                                <div
                                    onClick={() => editFileRef.current.click()}
                                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${editFile ? 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                >
                                    <input
                                        type="file"
                                        ref={editFileRef}
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e, setEditFile)}
                                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                    />
                                    {editFile ? (
                                        <div className="flex flex-col items-center gap-3 relative">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFile(setEditFile, editFileRef);
                                                }}
                                                className="absolute -top-4 -right-4 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 active:scale-95 transition-all z-10"
                                                title="Remove file"
                                            >
                                                <HiOutlineTrash className="text-xl" />
                                            </button>
                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center gap-2">
                                                <HiOutlineDocumentText className="text-4xl text-emerald-500" />
                                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate max-w-[200px]">{editFile.name}</span>
                                                <span className="text-[10px] font-bold text-emerald-300 dark:text-emerald-600 uppercase tracking-widest">New Proof</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Click box to change file</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                                            <HiOutlineCloudArrowUp className="text-4xl" />
                                            <span className="text-sm font-bold">Upload new slip to replace existing</span>
                                            <span className="text-[10px] uppercase font-black tracking-widest">Max size: 10MB</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3 uppercase tracking-widest"
                                >
                                    {submitting ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <HiOutlineCheckCircle className="text-lg" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const InfoBox = ({ label, value, isCapitalized }) => (
    <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex flex-col gap-1 transition-all hover:bg-white dark:hover:bg-slate-700 hover:border-indigo-100 dark:hover:border-indigo-500/30 group">
        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] group-hover:text-indigo-400 transition-colors">{label}</span>
        <span className={`text-sm font-bold text-slate-700 dark:text-slate-200 ${isCapitalized ? 'capitalize' : ''} truncate`}>{value || '—'}</span>
    </div>
);

export default PaymentTab;
