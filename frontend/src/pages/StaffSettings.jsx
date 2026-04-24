import React, { useState } from 'react';
import { 
    HiOutlineCog6Tooth, 
    HiOutlineDevicePhoneMobile, 
    HiOutlineLockClosed, 
    HiOutlineEye, 
    HiOutlineEyeSlash,
    HiOutlineUser,
    HiOutlineEnvelope,
    HiOutlineIdentification,
    HiOutlineShieldCheck
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API = '/api';

const StaffSettings = () => {
    const { user, refreshUser } = useAuth();
    const [phoneState, setPhoneState] = useState({ step: 'form', newPhone: '', otp: '', loading: false });
    const [pwdState, setPwdState] = useState({ step: 'form', newPwd: '', confirmPwd: '', otp: '', loading: false });
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // ── Phone Update Logic ──
    const requestPhoneOTP = async (e) => {
        e.preventDefault();
        if (!/^\d{10}$/.test(phoneState.newPhone)) return toast.error('Enter a valid 10-digit number');
        setPhoneState(prev => ({ ...prev, loading: true }));
        try {
            const res = await fetch(`${API}/auth/request-phone-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify({ newPhone: phoneState.newPhone })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('OTP sent to new number!');
                setPhoneState(prev => ({ ...prev, step: 'otp' }));
            } else toast.error(data.message);
        } catch { toast.error('Connection error'); }
        finally { setPhoneState(prev => ({ ...prev, loading: false })); }
    };

    const verifyPhoneOTP = async (e) => {
        e.preventDefault();
        setPhoneState(prev => ({ ...prev, loading: true }));
        try {
            const res = await fetch(`${API}/auth/verify-phone-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify({ otp: phoneState.otp })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Phone number updated!');
                setPhoneState({ step: 'success', newPhone: '', otp: '', loading: false });
                await refreshUser();
            } else toast.error(data.message);
        } catch { toast.error('Connection error'); }
        finally { setPhoneState(prev => ({ ...prev, loading: false })); }
    };

    // ── Password Update Logic ──
    const requestPwdOTP = async (e) => {
        e.preventDefault();
        if (pwdState.newPwd !== pwdState.confirmPwd) return toast.error('Passwords do not match');
        if (pwdState.newPwd.length < 6) return toast.error('Min. 6 characters required');
        
        if (!user.phoneNumber) {
            return toast.error('Please add a phone number first to receive security OTPs.');
        }

        setPwdState(prev => ({ ...prev, loading: true }));
        try {
            const res = await fetch(`${API}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, newPassword: pwdState.newPwd, confirmPassword: pwdState.confirmPwd })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                setPwdState(prev => ({ ...prev, step: 'otp' }));
            } else toast.error(data.message);
        } catch { toast.error('Connection error'); }
        finally { setPwdState(prev => ({ ...prev, loading: false })); }
    };

    const verifyPwdOTP = async (e) => {
        e.preventDefault();
        setPwdState(prev => ({ ...prev, loading: true }));
        try {
            const res = await fetch(`${API}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, otp: pwdState.otp })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Password updated successfully!');
                setPwdState({ step: 'success', newPwd: '', confirmPwd: '', otp: '', loading: false });
            } else toast.error(data.message);
        } catch { toast.error('Connection error'); }
        finally { setPwdState(prev => ({ ...prev, loading: false })); }
    };



    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-10 space-y-10 animate-fade-in duration-700 font-sans">
            {/* Header section with standardized style */}
            <div className="page-header mb-8">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">Manage <span className="text-indigo-500 italic">Account</span></h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-[10px] sm:text-xs mt-2 uppercase tracking-widest leading-none">Account Security & Verification</p>
            </div>

            <div className="mt-8 space-y-10 animate-fade-in transition-all duration-500">
                {/* Security Management Sections */}
                <div className="flex items-center gap-3 mb-2 px-2">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-900/50">
                        <HiOutlineCog6Tooth size={22} className="animate-spin-slow" />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">Account Security</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Protect Your Credentials</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* ── Section: Phone Number ── */}
                        <div className="space-y-6 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 transition-all hover:border-indigo-200 dark:hover:border-indigo-900/50 shadow-sm group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                                    <HiOutlineDevicePhoneMobile size={20} />
                                </div>
                                <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Phone Identity</h3>
                            </div>

                            {phoneState.step === 'form' && (
                                <form onSubmit={requestPhoneOTP} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                            {user?.phoneNumber ? 'Update Number' : 'Add Mobile Number'}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 07XXXXXXXX"
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                            value={phoneState.newPhone}
                                            onChange={e => setPhoneState({ ...phoneState, newPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                        />
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 px-1">Current: {user?.phoneNumber || 'NONE'}</p>
                                    </div>
                                    <button type="submit" disabled={phoneState.loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 border-none cursor-pointer">
                                        {phoneState.loading ? 'Processing...' : 'Request OTP Code'}
                                    </button>
                                </form>
                            )}

                            {phoneState.step === 'otp' && (
                                <form onSubmit={verifyPhoneOTP} className="space-y-5">
                                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100/50">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Verification Sent</p>
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">Code sent to {phoneState.newPhone}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">6-Digit Code</label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="000 000"
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl text-center text-2xl font-black tracking-[0.5em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-700 dark:text-slate-200"
                                            value={phoneState.otp}
                                            onChange={e => setPhoneState({ ...phoneState, otp: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setPhoneState({ ...phoneState, step: 'form' })} className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest border-none cursor-pointer">Back</button>
                                        <button type="submit" disabled={phoneState.loading} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 border-none cursor-pointer">
                                            Verify & Update
                                        </button>
                                    </div>
                                </form>
                            )}

                            {phoneState.step === 'success' && (
                                <div className="text-center py-6 space-y-4 animate-in zoom-in duration-500">
                                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-sm">✓</div>
                                    <div>
                                        <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">Identity Updated</p>
                                        <button onClick={() => setPhoneState({ ...phoneState, step: 'form' })} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline mt-2 border-none cursor-pointer bg-transparent uppercase tracking-widest">Restart Flow</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Section: Password Change ── */}
                        <div className="space-y-6 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 transition-all hover:border-rose-200 dark:hover:border-rose-900/50 shadow-sm group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center text-rose-600 transition-colors group-hover:bg-rose-600 group-hover:text-white">
                                    <HiOutlineLockClosed size={20} />
                                </div>
                                <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">Password Access</h3>
                            </div>

                            {pwdState.step === 'form' && (
                                <form onSubmit={requestPwdOTP} className="space-y-5">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPwd ? 'text' : 'password'}
                                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                                    value={pwdState.newPwd}
                                                    onChange={e => setPwdState({ ...pwdState, newPwd: e.target.value })}
                                                />
                                                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors bg-transparent border-none cursor-pointer">
                                                    {showPwd ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Confirm Access</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirm ? 'text' : 'password'}
                                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                                    value={pwdState.confirmPwd}
                                                    onChange={e => setPwdState({ ...pwdState, confirmPwd: e.target.value })}
                                                />
                                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors bg-transparent border-none cursor-pointer">
                                                    {showConfirm ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" disabled={pwdState.loading} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50 border-none cursor-pointer">
                                        {pwdState.loading ? 'Requesting...' : 'Authorize Password Reset'}
                                    </button>
                                </form>
                            )}

                            {pwdState.step === 'otp' && (
                                <form onSubmit={verifyPwdOTP} className="space-y-5">
                                    <div className="p-4 bg-rose-50/50 dark:bg-rose-900/20 rounded-2xl border border-rose-100/50">
                                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Authorization Required</p>
                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">Security code sent to your mobile.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Security Code</label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="000 000"
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl text-center text-2xl font-black tracking-[0.5em] focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-700 dark:text-slate-200"
                                            value={pwdState.otp}
                                            onChange={e => setPwdState({ ...pwdState, otp: e.target.value.replace(/\D/g, '') })}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setPwdState({ ...pwdState, step: 'form' })} className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest border-none cursor-pointer">Back</button>
                                        <button type="submit" disabled={pwdState.loading} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50 border-none cursor-pointer">
                                            Update Access
                                        </button>
                                    </div>
                                </form>
                            )}

                            {pwdState.step === 'success' && (
                                <div className="text-center py-6 space-y-4 animate-in zoom-in duration-500">
                                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-sm">✓</div>
                                    <div>
                                        <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">Security Updated</p>
                                        <button onClick={() => setPwdState({ ...pwdState, step: 'form' })} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline mt-2 border-none cursor-pointer bg-transparent uppercase tracking-widest">Update again</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            <div className="pt-10 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-[0.4em] italic">
                    Secured by SLIIT Kandy Uni • Staff Security Center
                </p>
            </div>
        </div>
    );
};

export default StaffSettings;
