import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineArrowLeftOnRectangle, HiOutlineArrowRightOnRectangle, HiOutlineExclamationCircle, HiOutlineIdentification, HiOutlineMapPin, HiOutlineShieldCheck } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { fetchMyQrStatus, submitQrScan } from '../services/qr';

const PIN_REGEX = /^\d{4}$/;

const StudentInOut = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isAllocated, setIsAllocated] = useState(false);
    const [status, setStatus] = useState('');
    const [destination, setDestination] = useState('');
    const [goingHome, setGoingHome] = useState(false);
    const [securityPin, setSecurityPin] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const loadState = async () => {
            try {
                const token = user?.token || sessionStorage.getItem('hostel_token');
                const allocRes = await fetch('/api/allocations/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const allocData = await allocRes.json();
                if (!allocData.success) {
                    setIsAllocated(false);
                    setLoading(false);
                    return;
                }

                setIsAllocated(true);
                const qrData = await fetchMyQrStatus(token);
                setStatus(qrData.status || '');
            } catch (err) {
                console.error('QR student page error:', err);
                setIsAllocated(false);
            } finally {
                setLoading(false);
            }
        };

        loadState();
    }, [user?.token]);

    const refreshStatus = async () => {
        const token = user?.token || sessionStorage.getItem('hostel_token');
        const qrData = await fetchMyQrStatus(token);
        setStatus(qrData.status || '');
    };

    const handleExitSubmit = async (e) => {
        e.preventDefault();
        if (!destination.trim()) {
            toast.error('Destination is required');
            return;
        }
        if (!PIN_REGEX.test(securityPin)) {
            toast.error('Enter a valid 4-digit security PIN');
            return;
        }

        setSubmitting(true);
        try {
            await submitQrScan({
                studentId: user?.studentId,
                action: 'EXIT',
                destination: destination.trim(),
                goingHome,
                securityPin
            }, user?.token || sessionStorage.getItem('hostel_token'));
            toast.success('Exit scan recorded successfully.');
            setDestination('');
            setGoingHome(false);
            setSecurityPin('');
            await refreshStatus();
            navigate('/student');
        } catch (err) {
            toast.error(err.message || 'Could not submit exit scan');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEntrySubmit = async () => {
        if (!PIN_REGEX.test(securityPin)) {
            toast.error('Enter a valid 4-digit security PIN');
            return;
        }

        setSubmitting(true);
        try {
            await submitQrScan({
                studentId: user?.studentId,
                action: 'ENTRY',
                securityPin
            }, user?.token || sessionStorage.getItem('hostel_token'));
            toast.success('Arrival recorded successfully.');
            setSecurityPin('');
            await refreshStatus();
            navigate('/student');
        } catch (err) {
            toast.error(err.message || 'Could not mark arrival');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isAllocated) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 flex items-center justify-center">
                <div className="w-full max-w-lg space-y-8 animate-fade-in text-center">
                    <button onClick={() => navigate('/student')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-sm mx-auto">
                        <HiOutlineArrowLeft /> Back to Dashboard
                    </button>

                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800">
                        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] flex items-center justify-center text-4xl mb-6 mx-auto shadow-inner">
                            <HiOutlineExclamationCircle className="text-rose-500" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Access Restricted</h2>
                        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium leading-relaxed mt-4">
                            You need an active room allocation before using the hostel gate QR flow.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-2xl space-y-8 animate-fade-in">
                <button onClick={() => navigate('/student')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-bold text-sm">
                    <HiOutlineArrowLeft /> Back to Dashboard
                </button>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-4 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <HiOutlineShieldCheck className="text-xl" />
                                </div>
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Student Gate Flow</span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Student In &amp; Out</h1>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Use the same QR gate flow here with your current hostel status.</p>
                        </div>
                        <span className={`badge ${status === 'INSIDE' ? 'badge-success' : 'badge-warning'}`}>{status || 'UNKNOWN'}</span>
                    </div>

                    {status === 'INSIDE' ? (
                        <form onSubmit={handleExitSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <HiOutlineIdentification className="text-lg" />
                                        Student ID
                                    </label>
                                    <input value={user?.studentId || ''} readOnly className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <HiOutlineShieldCheck className="text-lg" />
                                        Security PIN
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={securityPin}
                                        onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="Enter 4-digit PIN"
                                        className="w-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl px-5 py-4 font-black text-center tracking-[0.35em] text-indigo-700 dark:text-indigo-300 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <HiOutlineMapPin className="text-lg" />
                                    Destination
                                </label>
                                <input
                                    type="text"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    placeholder="Where are you going?"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500"
                                />
                            </div>

                            <label className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <input type="checkbox" checked={goingHome} onChange={(e) => setGoingHome(e.target.checked)} className="w-5 h-5 accent-indigo-500" />
                                <div>
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Going Home</p>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Skip automatic late checks for this exit</p>
                                </div>
                            </label>

                            <button type="submit" disabled={submitting} className="btn btn-primary btn-md w-full">
                                {submitting ? 'Submitting...' : (
                                    <>
                                        <HiOutlineArrowRightOnRectangle />
                                        Submit Exit Scan
                                    </>
                                )}
                            </button>
                        </form>
                    ) : null}

                    {status === 'OUTSIDE' ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <HiOutlineIdentification className="text-lg" />
                                        Student ID
                                    </label>
                                    <input value={user?.studentId || ''} readOnly className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-slate-200" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <HiOutlineShieldCheck className="text-lg" />
                                        Security PIN
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={4}
                                        value={securityPin}
                                        onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        placeholder="Enter 4-digit PIN"
                                        className="w-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl px-5 py-4 font-black text-center tracking-[0.35em] text-indigo-700 dark:text-indigo-300 outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <button type="button" onClick={handleEntrySubmit} disabled={submitting} className="btn btn-primary btn-md w-full">
                                {submitting ? 'Submitting...' : (
                                    <>
                                        <HiOutlineArrowLeftOnRectangle />
                                        Mark Arrived
                                    </>
                                )}
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default StudentInOut;
