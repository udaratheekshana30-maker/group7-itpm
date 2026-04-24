import React, { useState } from 'react';
import { HiOutlineArrowLeftOnRectangle, HiOutlineArrowRightOnRectangle, HiOutlineIdentification, HiOutlineMapPin, HiOutlineQrCode, HiOutlineShieldCheck } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { getQrStatus, submitQrScan } from '../services/qr';

const PIN_REGEX = /^\d{4}$/;

const PublicStudentInOut = () => {
    const [studentIdInput, setStudentIdInput] = useState('');
    const [studentId, setStudentId] = useState('');
    const [status, setStatus] = useState('');
    const [destination, setDestination] = useState('');
    const [goingHome, setGoingHome] = useState(false);
    const [securityPin, setSecurityPin] = useState('');
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const resetFlow = () => {
        setStudentIdInput('');
        setStudentId('');
        setStatus('');
        setDestination('');
        setGoingHome(false);
        setSecurityPin('');
    };

    const handleContinue = async () => {
        const value = studentIdInput.trim().toUpperCase();
        if (!value) {
            toast.error('Student ID is required');
            return;
        }

        setLoadingStatus(true);
        try {
            const data = await getQrStatus(value);
            setStudentId(data.studentId || value);
            setStatus(data.status || '');
        } catch (err) {
            toast.error(err.message || 'Could not fetch student status');
        } finally {
            setLoadingStatus(false);
        }
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
                studentId,
                action: 'EXIT',
                destination: destination.trim(),
                goingHome,
                securityPin
            });
            toast.success('Exit scan recorded successfully.');
            resetFlow();
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
                studentId,
                action: 'ENTRY',
                securityPin
            });
            toast.success('Arrival recorded successfully.');
            resetFlow();
        } catch (err) {
            toast.error(err.message || 'Could not mark arrival');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 flex items-center justify-center">
            <div className="w-full max-w-2xl space-y-6 animate-fade-in">
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-4">
                        <HiOutlineQrCode className="text-indigo-500" />
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Public Gate QR</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Hostel Gate QR</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-2">Enter your student ID to continue the gate scan flow.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl">
                    {!status ? (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <HiOutlineIdentification className="text-lg" />
                                    Student ID
                                </label>
                                <input
                                    type="text"
                                    value={studentIdInput}
                                    onChange={(e) => setStudentIdInput(e.target.value.toUpperCase())}
                                    placeholder="e.g. IT24XXXXXX"
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleContinue}
                                disabled={loadingStatus}
                                className="btn btn-primary btn-md w-full"
                            >
                                {loadingStatus ? 'Checking...' : 'Continue'}
                            </button>
                        </div>
                    ) : null}

                    {status === 'INSIDE' ? (
                        <form onSubmit={handleExitSubmit} className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                    <HiOutlineArrowRightOnRectangle className="text-2xl" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Going Out</h2>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Current status is INSIDE. Submit an exit scan.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student ID</label>
                                    <input value={studentId} readOnly className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-slate-200" />
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
                                <input
                                    type="checkbox"
                                    checked={goingHome}
                                    onChange={(e) => setGoingHome(e.target.checked)}
                                    className="w-5 h-5 accent-indigo-500"
                                />
                                <div>
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">Going Home</p>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Skip automatic late checks for this exit</p>
                                </div>
                            </label>

                            <button type="submit" disabled={submitting} className="btn btn-primary btn-md w-full">
                                {submitting ? 'Submitting...' : 'Submit Exit Scan'}
                            </button>
                        </form>
                    ) : null}

                    {status === 'OUTSIDE' ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                    <HiOutlineArrowLeftOnRectangle className="text-2xl" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Arrived</h2>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Current status is OUTSIDE. Submit an entry scan.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student ID</label>
                                    <input value={studentId} readOnly className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 font-bold text-slate-700 dark:text-slate-200" />
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
                                {submitting ? 'Submitting...' : 'Mark Arrived'}
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default PublicStudentInOut;
