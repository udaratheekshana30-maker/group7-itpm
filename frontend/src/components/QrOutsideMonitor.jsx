import { useCallback, useEffect, useMemo, useState } from 'react';
import { HiOutlineArrowPath, HiOutlineClock, HiOutlineMapPin, HiOutlineQrCode, HiOutlineUserGroup } from 'react-icons/hi2';
import { fetchLateStudents, fetchOutsideStudents } from '../services/qr';

const CURFEW_HOUR = 22;
const CURFEW_MINUTE = 30;

const getStudentKey = (student) => {
    if (!student) return '';
    return String(student.studentId || student.email || student.phoneNumber || student.name || '').toLowerCase();
};

const isLateByCurfew = (lastExitAt, goingHome, now = new Date()) => {
    if (goingHome || !lastExitAt) return false;
    const exitTime = new Date(lastExitAt);
    if (Number.isNaN(exitTime.getTime())) return false;

    const curfewToday = new Date(now);
    curfewToday.setHours(CURFEW_HOUR, CURFEW_MINUTE, 0, 0);

    if (now >= curfewToday) return true;

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    return exitTime < startOfToday;
};

export default function QrOutsideMonitor({ title = 'QR Monitoring', compact = false }) {
    const [outsideStudents, setOutsideStudents] = useState([]);
    const [lateStudents, setLateStudents] = useState([]);
    const [outsideCount, setOutsideCount] = useState(0);
    const [lateCount, setLateCount] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const gateUrl = `${window.location.origin}/qr`;

    const loadData = useCallback(async () => {
        try {
            const outsideData = await fetchOutsideStudents();
            const outsideRows = Array.isArray(outsideData?.outside) ? outsideData.outside : [];
            setOutsideStudents(outsideRows);
            setOutsideCount(typeof outsideData?.outsideCount === 'number' ? outsideData.outsideCount : outsideRows.length);

            try {
                const lateData = await fetchLateStudents();
                const lateRows = Array.isArray(lateData?.lateStudents) ? lateData.lateStudents : [];
                setLateStudents(lateRows);
                setLateCount(typeof lateData?.lateCount === 'number' ? lateData.lateCount : lateRows.length);
            } catch {
                const computedLate = outsideRows
                    .filter((row) => isLateByCurfew(row?.lastExitAt, row?.goingHome))
                    .map((row) => row?.student || {});
                setLateStudents(computedLate);
                setLateCount(computedLate.length);
            }

            setLastUpdated(new Date());
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to load QR monitoring data.');
            setOutsideStudents([]);
            setLateStudents([]);
            setOutsideCount(0);
            setLateCount(0);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const intervalId = setInterval(loadData, 10000);
        return () => clearInterval(intervalId);
    }, [loadData]);

    const lateKeys = useMemo(() => {
        const keys = new Set();
        lateStudents.forEach((student) => {
            const key = getStudentKey(student);
            if (key) keys.add(key);
        });
        return keys;
    }, [lateStudents]);

    const copyGateUrl = async () => {
        try {
            await navigator.clipboard.writeText(gateUrl);
        } catch (_) {
            // Ignore clipboard failures.
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Live outside-student monitoring with automatic 10-second refresh.</p>
                </div>
                <button
                    type="button"
                    onClick={loadData}
                    className="w-fit inline-flex items-center gap-2 px-5 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-700 dark:text-white"
                >
                    <HiOutlineArrowPath className="text-lg text-indigo-500" />
                    Refresh Now
                </button>
            </div>

            <div className={`grid gap-6 ${compact ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 xl:grid-cols-4'}`}>
                <div className="stat-card">
                    <div className="flex justify-between items-start">
                        <div className="stat-icon bg-amber-500 shadow-amber-500/30">
                            <HiOutlineMapPin />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Outside</span>
                    </div>
                    <div className="stat-value">{outsideCount}</div>
                    <div className="stat-label">Students currently out</div>
                </div>

                <div className="stat-card">
                    <div className="flex justify-between items-start">
                        <div className="stat-icon bg-rose-500 shadow-rose-500/30">
                            <HiOutlineClock />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Late</span>
                    </div>
                    <div className="stat-value">{lateCount}</div>
                    <div className="stat-label">Past curfew highlights</div>
                </div>

                <div className={`${compact ? 'lg:col-span-1' : 'xl:col-span-2'} bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/5 shadow-xl`}>
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <HiOutlineQrCode className="text-xl" />
                                </div>
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Gate QR</span>
                            </div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">Public QR Access</h4>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Students scan this to open the public gate status page.</p>
                        </div>
                        <span className="badge badge-neutral">/qr</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 items-center">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(gateUrl)}`}
                            alt="Gate QR"
                            className="w-40 h-40 rounded-2xl bg-white p-3 shadow-sm"
                        />
                        <div className="space-y-3 w-full">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Public URL</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 break-all">{gateUrl}</p>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <a
                                    href={gateUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary btn-md"
                                >
                                    Open Public QR
                                </a>
                                <button type="button" onClick={copyGateUrl} className="btn btn-secondary btn-md">
                                    Copy URL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200 dark:border-white/5 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <HiOutlineUserGroup className="text-slate-300 dark:text-white/20 text-xl" />
                        <div>
                            <h4 className="font-black text-slate-800 dark:text-white">Outside Students</h4>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">
                                {lastUpdated ? `Updated at ${lastUpdated.toLocaleTimeString()}` : 'Waiting for first sync'}
                            </p>
                        </div>
                    </div>
                    {loading ? <span className="badge badge-neutral">Loading</span> : null}
                </div>

                {error ? (
                    <div className="px-8 py-10 text-sm font-medium text-rose-500">{error}</div>
                ) : outsideStudents.length === 0 && !loading ? (
                    <div className="px-8 py-14 text-center text-slate-400 italic font-medium">No students are currently outside.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/[0.02]">
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">Student</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">Contact</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">Destination</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">Last Exit</th>
                                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {outsideStudents.map((row, index) => {
                                    const student = row?.student || {};
                                    const isLate = Boolean(row?.isLate) || lateKeys.has(getStudentKey(student)) || isLateByCurfew(row?.lastExitAt, row?.goingHome);
                                    return (
                                        <tr key={`${getStudentKey(student) || 'student'}-${index}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                                            <td className="px-8 py-5">
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 dark:text-white">{student?.name || 'Unknown Student'}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-tighter">{student?.studentId || '-'}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-sm font-medium text-slate-500 dark:text-white/60">
                                                {student?.email || student?.phoneNumber || '-'}
                                            </td>
                                            <td className="px-8 py-5 text-sm font-medium text-slate-500 dark:text-white/60">
                                                {row?.destination || '-'}
                                            </td>
                                            <td className="px-8 py-5 text-sm font-bold text-slate-400 dark:text-white/40">
                                                {row?.lastExitAt ? new Date(row.lastExitAt).toLocaleString() : '-'}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                {isLate ? (
                                                    <span className="badge badge-danger">Late</span>
                                                ) : row?.goingHome ? (
                                                    <span className="badge badge-info">Going Home</span>
                                                ) : (
                                                    <span className="badge badge-warning">Outside</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
