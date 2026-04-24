import { useEffect, useState } from 'react';
import { HiOutlineClock, HiOutlineShieldCheck } from 'react-icons/hi2';
import { fetchSecurityPin } from '../services/qr';

const getRemainingSeconds = (expiresAt) => {
    if (!expiresAt) return 0;
    const expiresAtMs = new Date(expiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) return 0;
    return Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
};

export default function QrSecurityPinCard() {
    const [pinMeta, setPinMeta] = useState(null);
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const loadPin = async () => {
            try {
                const data = await fetchSecurityPin();
                if (!mounted) return;
                setPinMeta(data);
                setRemainingSeconds(getRemainingSeconds(data?.expiresAt));
                setError('');
            } catch (err) {
                if (!mounted) return;
                setError(err.message || 'Could not load security PIN.');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadPin();
        const refreshTimer = setInterval(loadPin, 5000);
        const countdownTimer = setInterval(() => {
            setRemainingSeconds((current) => {
                if (current <= 1) {
                    loadPin();
                    return 0;
                }
                return current - 1;
            });
        }, 1000);

        return () => {
            mounted = false;
            clearInterval(refreshTimer);
            clearInterval(countdownTimer);
        };
    }, []);

    return (
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/5 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <HiOutlineShieldCheck className="text-xl" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Security Only</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">Current PIN</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Share this 4-digit PIN at the gate. It refreshes every minute.</p>
                </div>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300"
                >
                    Refresh
                </button>
            </div>

            {loading ? <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading current PIN...</p> : null}
            {error ? <p className="text-sm font-medium text-rose-500">{error}</p> : null}

            {!loading && !error ? (
                <>
                    <div className="flex flex-wrap gap-4 mb-5">
                        {String(pinMeta?.pin || '----').split('').map((digit, index) => (
                            <div
                                key={`${digit}-${index}`}
                                className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl bg-emerald-500 text-emerald-950 flex items-center justify-center text-4xl sm:text-5xl font-black shadow-lg"
                            >
                                {digit}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-2">
                            <HiOutlineClock className="text-lg text-emerald-500" />
                            Remaining: {remainingSeconds}s
                        </span>
                        <span>
                            Expires: {pinMeta?.expiresAt ? new Date(pinMeta.expiresAt).toLocaleTimeString() : '-'}
                        </span>
                    </div>
                </>
            ) : null}
        </section>
    );
}
