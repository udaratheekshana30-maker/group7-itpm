import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
    HiOutlineXMark, HiOutlineEnvelope, HiOutlineLockClosed,
    HiOutlineUser, HiOutlineEye, HiOutlineEyeSlash,
    HiOutlineDevicePhoneMobile, HiOutlineArrowLeft, HiOutlineCheckCircle
} from 'react-icons/hi2';

// ─── Forgot Password Flow (3 steps) ────────────────────────────────────────
const ForgotPasswordView = ({ onBack }) => {
    // step: 'form' | 'otp' | 'success'
    const [step, setStep] = useState('form');
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [maskedPhone, setMaskedPhone] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resending, setResending] = useState(false);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword, confirmPassword })
            });
            const data = await res.json();
            if (data.success) {
                setMaskedPhone(data.message.replace('OTP sent to ', ''));
                setStep('otp');
            } else {
                setError(data.message || 'Failed to send OTP.');
            }
        } catch {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError('');
        setResending(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword, confirmPassword })
            });
            const data = await res.json();
            if (!data.success) setError(data.message || 'Failed to resend OTP.');
        } catch {
            setError('Connection error.');
        } finally {
            setResending(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        if (otp.length !== 6) {
            setError('Please enter the 6-digit OTP.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            if (data.success) {
                setStep('success');
            } else {
                setError(data.message || 'Invalid OTP.');
            }
        } catch {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 1: Email + new password form ──────────────────────────────────
    if (step === 'form') return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <HiOutlineArrowLeft className="text-lg" />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Forgot Password</h2>
                    <p className="text-sm text-slate-500 font-medium">Enter your details to receive an OTP</p>
                </div>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-4">
                {/* Email */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                    <div className="relative">
                        <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="email" required
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="name@my.sliit.lk"
                            value={email} onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                {/* New Password */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">New Password</label>
                    <div className="relative">
                        <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type={showPwd ? 'text' : 'password'} required
                            className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="Min. 6 characters"
                            value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        />
                        <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
                            {showPwd ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                        </button>
                    </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Confirm New Password</label>
                    <div className="relative">
                        <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type={showConfirm ? 'text' : 'password'} required
                            className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="Re-enter new password"
                            value={confirmPassword} onChange={setConfirmPassword}
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
                            {showConfirm ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                        </button>
                    </div>
                </div>

                {error && <p className="text-xs text-rose-500 font-bold text-center bg-rose-50 py-2 rounded-lg">{error}</p>}

                <button type="submit" disabled={loading}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    <HiOutlineDevicePhoneMobile className="text-lg" />
                    {loading ? 'Sending OTP...' : 'Send OTP to Phone'}
                </button>
            </form>
        </div>
    );

    // ── Step 2: OTP input ──────────────────────────────────────────────────
    if (step === 'otp') return (
        <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setStep('form')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                    <HiOutlineArrowLeft className="text-lg" />
                </button>
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Enter OTP</h2>
                    <p className="text-sm text-slate-500 font-medium">Check your registered phone</p>
                </div>
            </div>

            {/* Phone info banner */}
            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <HiOutlineDevicePhoneMobile className="text-indigo-600 text-lg" />
                </div>
                <div>
                    <p className="text-xs font-black text-indigo-700 uppercase tracking-widest">OTP Sent</p>
                    <p className="text-sm font-semibold text-slate-700">A 6-digit code was sent to <span className="font-black text-indigo-600">{maskedPhone}</span></p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Valid for 5 minutes</p>
                </div>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">6-Digit OTP Code</label>
                    <input
                        type="text" required maxLength={6}
                        className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl text-center text-2xl font-black tracking-[0.5em] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        placeholder="• • • • • •"
                        value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                </div>

                {error && <p className="text-xs text-rose-500 font-bold text-center bg-rose-50 py-2 rounded-lg">{error}</p>}

                <button type="submit" disabled={loading}
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50">
                    {loading ? 'Verifying...' : '✓ Verify & Reset Password'}
                </button>

                <div className="text-center">
                    <button type="button" onClick={handleResend} disabled={resending}
                        className="text-sm text-indigo-600 font-bold hover:text-indigo-700 disabled:opacity-50 transition-colors">
                        {resending ? 'Resending...' : "Didn't receive? Resend OTP"}
                    </button>
                </div>
            </form>
        </div>
    );

    // ── Step 3: Success ────────────────────────────────────────────────────
    return (
        <div className="text-center space-y-5 py-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-[2rem] flex items-center justify-center mx-auto">
                <HiOutlineCheckCircle className="text-4xl text-emerald-500" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-900">Password Reset!</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Your password has been updated successfully.</p>
            </div>
            <button onClick={onBack}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all">
                Back to Sign In
            </button>
        </div>
    );
};

// ─── Main Auth Modal ────────────────────────────────────────────────────────
const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student',
        studentId: '',
        phoneNumber: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(initialMode === 'login');
    const [showForgot, setShowForgot] = useState(false);

    // Signup OTP state
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendingOtp, setResendingOtp] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setIsLogin(initialMode === 'login');
            setError('');
            setShowForgot(false);
            setOtpSent(false);
            setOtp('');
            setEmailVerified(false);
        }
    }, [isOpen, initialMode]);

    if (!isOpen) return null;

    const handleSendSignupOtp = async () => {
        setError('');
        const studentEmailRegex = /^[a-zA-Z]{2}\d{8}@my\.sliit\.lk$/i;
        if (!studentEmailRegex.test(formData.email)) {
            setError('Please enter your official SLIIT student email (e.g., ITXXXXXXXX@my.sliit.lk, BMXXXXXXXX@my.sliit.lk or SAXXXXXXXX@my.sliit.lk)');
            return;
        }

        setOtpLoading(true);
        try {
            const res = await fetch('/api/auth/send-signup-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email }),
            });
            const data = await res.json();
            if (data.success) {
                setOtpSent(true);
                setOtp('');
            } else {
                setError(data.message || 'Failed to send verification code');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleVerifySignupOtp = async () => {
        setError('');
        if (otp.length !== 6) {
            setError('Please enter the 6-digit verification code');
            return;
        }

        setOtpLoading(true);
        try {
            const res = await fetch('/api/auth/verify-signup-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email, otp }),
            });
            const data = await res.json();
            if (data.success) {
                setEmailVerified(true);
            } else {
                setError(data.message || 'Invalid verification code');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setOtpLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!isLogin) {
            if (!emailVerified) {
                setError('Please verify your email before creating an account');
                setLoading(false);
                return;
            }
            const studentEmailRegex = /^[a-zA-Z]{2}\d{8}@my\.sliit\.lk$/i;
            if (!studentEmailRegex.test(formData.email)) {
                setError('Please enter your official SLIIT student email (e.g., ITXXXXXXXX@my.sliit.lk, BMXXXXXXXX@my.sliit.lk or SAXXXXXXXX@my.sliit.lk)');
                setLoading(false);
                return;
            }
            const emailPrefix = (formData.email || '').split('@')[0].trim().toUpperCase();
            const sid = (formData.studentId || '').trim().toUpperCase();
            
            if (sid !== emailPrefix) {
                setError(`Student ID must match email prefix (${emailPrefix})`);
                setLoading(false);
                return;
            }
            if (!formData.phoneNumber || !/^\d{10}$/.test(formData.phoneNumber)) {
                setError('Phone Number must be exactly 10 digits');
                setLoading(false);
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError('Passwords do not match');
                setLoading(false);
                return;
            }
        }

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
                login(data.data);
                onClose();
            } else {
                setError(data.message || data.msg || 'Authentication failed');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col border border-slate-200/50 dark:border-white/10">
                <div className="p-8 overflow-y-auto custom-scrollbar">

                    {/* ── Forgot Password view ── */}
                    {showForgot ? (
                        <ForgotPasswordView onBack={() => setShowForgot(false)} />
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{isLogin ? 'Welcome Back' : 'Join SLIIT Kandy'}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Please enter your details to continue</p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <HiOutlineXMark className="text-xl text-slate-400" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {!isLogin && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Full Name</label>
                                        <div className="relative">
                                            <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" required
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                                placeholder="Kamal Perera"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {!isLogin && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Phone Number</label>
                                        <div className="relative">
                                            <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" required
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                                placeholder="0712345678"
                                                value={formData.phoneNumber}
                                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {!isLogin && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Student ID (Matches Email Prefix)</label>
                                        <div className="relative">
                                            <HiOutlineUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" required
                                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                                placeholder="e.g. IT21000000, BM21000000 or SA21000000"
                                                value={formData.studentId}
                                                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Email Address</label>
                                    <div className="relative group">
                                        <HiOutlineEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="email" required
                                            className={`w-full pl-11 pr-[100px] py-3 bg-slate-50 dark:bg-slate-800/50 border ${emailVerified ? 'border-emerald-500/50' : 'border-slate-100'} dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                                            placeholder="name@my.sliit.lk"
                                            value={formData.email}
                                            disabled={emailVerified && !isLogin}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                        {!isLogin && !emailVerified && (
                                            <button 
                                                type="button"
                                                onClick={handleSendSignupOtp}
                                                disabled={otpLoading || !formData.email}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                                            >
                                                {otpLoading ? '...' : (otpSent ? 'Resend' : 'Verify')}
                                            </button>
                                        )}
                                        {!isLogin && emailVerified && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                                                <HiOutlineCheckCircle className="text-sm" /> Verified
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Signup OTP Input */}
                                {!isLogin && otpSent && !emailVerified && (
                                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 ml-1">Verification Code</label>
                                        <div className="relative">
                                            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                                            <input type="text" maxLength={6}
                                                className="w-full pl-11 pr-[100px] py-3 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-sm font-bold tracking-[0.2em] text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                                placeholder="000000"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            />
                                            <button 
                                                type="button"
                                                onClick={handleVerifySignupOtp}
                                                disabled={otpLoading || otp.length !== 6}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                                            >
                                                {otpLoading ? 'Verifying...' : 'Submit'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Password</label>
                                    <div className="relative">
                                        <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type={showPassword ? 'text' : 'password'} required
                                            className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
                                            {showPassword ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Forgot Password link — only on login */}
                                {isLogin && (
                                    <div className="text-right -mt-1">
                                        <button type="button" onClick={() => setShowForgot(true)}
                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                                            Forgot Password?
                                        </button>
                                    </div>
                                )}

                                {!isLogin && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Confirm Password</label>
                                        <div className="relative">
                                            <HiOutlineLockClosed className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type={showConfirmPassword ? 'text' : 'password'} required
                                                className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                                placeholder="••••••••"
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                            />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
                                                {showConfirmPassword ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {error && <p className="text-xs text-rose-500 font-bold text-center bg-rose-50 py-2 rounded-lg">{error}</p>}

                                <button type="submit" disabled={loading || (!isLogin && !emailVerified)}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50">
                                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : (emailVerified ? 'Create Account' : 'Verify Email First'))}
                                </button>
                            </form>

                            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                                <p className="text-sm text-slate-500">
                                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                                    <button onClick={() => setIsLogin(!isLogin)} className="ml-2 font-black text-indigo-600 hover:text-indigo-700">
                                        {isLogin ? 'Sign Up' : 'Sign In'}
                                    </button>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
