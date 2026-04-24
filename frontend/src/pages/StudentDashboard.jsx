import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    HiOutlinePlus,
    HiOutlineChatBubbleLeftRight,
    HiOutlineClipboardDocumentList,
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineExclamationCircle,
    HiOutlineUser,
    HiOutlineCurrencyDollar,
    HiOutlineMegaphone,
    HiOutlinePaperAirplane,
    HiOutlineXMark,
    HiOutlineArrowLeft,
    HiOutlinePaperClip,
    HiOutlineDocumentText,
    HiOutlineTrash,
    HiOutlinePencilSquare,
    HiOutlineHome,
    HiOutlineEnvelope,
    HiOutlineIdentification,
    HiOutlineAcademicCap,
    HiOutlineCamera,
    HiOutlineCheckBadge,
    HiOutlineCalendarDays,
    HiOutlineWallet,
    HiOutlineMapPin,
    HiOutlineKey,
    HiOutlineArrowsRightLeft,
    HiOutlineArrowRightOnRectangle,
    HiOutlineDevicePhoneMobile,
    HiOutlineLockClosed,
    HiOutlineCog6Tooth,
    HiOutlineShieldCheck,
    HiOutlineEye,
    HiOutlineEyeSlash
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';
import PaymentTab from '../components/PaymentTab.jsx';
import { api } from '../services/api.js';

const API = '/api';

// Format room number as M1/F1 based on wing
const fmtRoom = (wing, roomnumber) => {
    const prefix = wing === 'female' ? 'F' : 'M';
    return `${prefix}${roomnumber}`;
};

const statusConfig = {
    open: { label: 'Open', color: 'bg-rose-100 text-rose-700', icon: HiOutlineExclamationCircle },
    'in-progress': { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: HiOutlineClock },
    resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700', icon: HiOutlineCheckCircle }
};

const StudentDashboard = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [studentData, setStudentData] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('nmh_studentData') || 'null'); } catch { return null; }
    });
    const [complaints, setComplaints] = useState([]);
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [activeComplaint, setActiveComplaint] = useState(null);
    const { refreshUser } = useAuth();
    const [uploadingProfile, setUploadingProfile] = useState(false);
    const profilePicInputRef = useRef(null);

    // activeTab based on URL
    const activeTab = (() => {
        const parts = location.pathname.split('/');
        const last = parts[parts.length - 1];
        if (last === 'student') return 'dashboard';
        return last;
    })();

    const [application, setApplication] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('nmh_application') || 'null'); } catch { return null; }
    });
    const [myAllocation, setMyAllocation] = useState(null);
    const [myClearance, setMyClearance] = useState(null);
    const [myStatus, setMyStatus] = useState(null);
    const [appLoading, setAppLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/');
        } else if (user) {
            fetchData();
            const interval = setInterval(() => fetchData(false), 2000); // Poll every 2s
            
            const handleRefresh = () => fetchData(false);
            window.addEventListener('nmh_unread_refresh', handleRefresh);
            
            return () => {
                clearInterval(interval);
                window.removeEventListener('nmh_unread_refresh', handleRefresh);
            };
        }
    }, [user?.token, authLoading]);

    // Safety timeout to ensure loading spinner doesn't get stuck
    useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => {
                setLoading(false);
            }, 5000); // Max 5 second spinner
            return () => clearTimeout(timer);
        }
    }, [loading]);

    const fetchData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            // Refresh User Session in background (Sync Verified Badge)
            refreshUser().catch(err => console.error('Background refresh error:', err));

            // Fetch student/financial data (Detailed status for student)
            const studentRes = await fetch(`${API}/student-payments/status`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('hostel_token')}` }
            });
            const studentStatus = await studentRes.json();
            const myData = studentStatus.success ? studentStatus.data : null;
            setStudentData(myData);
            if (myData) {
                // If student record not found in status, fallback or keep as null
                sessionStorage.setItem('nmh_studentData', JSON.stringify(myData));
            }

            // Fetch complaints
            const compRes = await fetch(`${API}/complaints/mine`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const compData = await compRes.json();
            if (compData.success) {
                setComplaints(Array.isArray(compData.data) ? compData.data : []);
            }

            // Fetch notices
            const noticeRes = await fetch(`${API}/notices`);
            const noticeData = await noticeRes.json();
            if (noticeData.success && Array.isArray(noticeData.data)) {
                setNotices(noticeData.data.slice(0, 5));
            }

            // Fetch application details silently if requested
            await fetchApplication(showLoading);
            await fetchClearanceData();
            await fetchMyStatus();
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleProfilePicUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File too large (max 5MB)');
            return;
        }

        const fileType = file.type.toLowerCase();
        if (fileType !== 'image/jpeg' && fileType !== 'image/png' && fileType !== 'image/jpg') {
            toast.error('Only JPG and PNG images are allowed');
            return;
        }

        setUploadingProfile(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API}/users/profile-picture`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${user.token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Profile picture updated!');
                await refreshUser();
            } else {
                toast.error(data.message || 'Upload failed');
            }
        } catch (err) {
            toast.error('Error uploading image');
        } finally {
            setUploadingProfile(false);
            if (profilePicInputRef.current) profilePicInputRef.current.value = '';
        }
    };

    const handleProfilePicDelete = async () => {
        if (!window.confirm('Delete your profile picture?')) return;
        try {
            const res = await fetch(`${API}/users/profile-picture`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Profile picture removed');
                await refreshUser();
            }
        } catch (err) {
            toast.error('Error deleting image');
        }
    };

    const fetchApplication = async (showLoading = true) => {
        if (!user?.token) return;
        if (showLoading) setAppLoading(true);
        try {
            const res = await fetch(`${API}/applications/me`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data && !data.error) {
                setApplication(data);
                sessionStorage.setItem('nmh_application', JSON.stringify(data));
            } else {
                setApplication(null);
                sessionStorage.removeItem('nmh_application');
            }
        } catch (err) {
            console.error('App fetch error:', err);
        } finally {
            if (showLoading) setAppLoading(false);
        }
    };

    const fetchClearanceData = async () => {
        if (!user?.token) return;
        try {
            const allocRes = await fetch(`${API}/allocations/me`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const allocData = await allocRes.json();
            if (allocData.success) setMyAllocation(allocData.data);

            const clearRes = await fetch(`${API}/clearance/me`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const clearData = await clearRes.json();
            if (clearData.success) {
                setMyClearance(clearData.data);
            } else {
                setMyClearance(null);
            }
        } catch (err) {
            console.error('Clearance fetch error:', err);
            setMyClearance(null);
        }
    };

    const fetchMyStatus = async () => {
        if (!user?.token) return;
        try {
            const res = await fetch(`${API}/qr/my-status`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) setMyStatus(data);
        } catch (err) {
            console.error('Status fetch error:', err);
        }
    };

    // Storage event trigger for Application & User Status updates
    useEffect(() => {
        // Instant refresh trigger from other tabs (e.g. Warden updates status)
        const handleStorage = (e) => {
            if (e.key === 'nmh_refresh_trigger') {
                fetchData(false);
            }
        };
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, [user?.token]);

    // Polling for active chat
    useEffect(() => {
        let interval;
        if (selectedId) {
            const fetchActive = async () => {
                try {
                    const res = await fetch(`${API}/complaints/${selectedId}`, {
                        headers: { 'Authorization': `Bearer ${user.token}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                        setActiveComplaint(data.data);
                        // Also update the local complaints list to clear the count badge for this item
                        setComplaints(prev => prev.map(c => 
                            c._id === data.data._id ? { ...c, studentUnreadCount: 0 } : c
                        ));
                        // Trigger unread count refresh in navigation
                        window.dispatchEvent(new CustomEvent('nmh_unread_refresh'));
                    }
                } catch (err) { console.error('Chat poll error:', err); }
            };
            fetchActive();
            interval = setInterval(fetchActive, 2000);
        } else {
            setActiveComplaint(null);
        }
        return () => clearInterval(interval);
    }, [selectedId, user?.token]);

    if (authLoading || loading || !user) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* ── Unified Welcome Banner ── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1A3263] via-[#1e3a8a] to-indigo-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl border border-white/5 group">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-3xl" />

                {/* Status Mark - Top Right */}
                <div className="absolute top-3 right-3 md:top-8 md:right-8 z-20">
                    <div className={`flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-2 rounded-2xl border shadow-xl backdrop-blur-md ${user.accountStatus?.toLowerCase() === 'verified'
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : 'bg-[#FAB95B] text-[#1A3263] border-amber-300'
                        }`}>
                        {user.accountStatus?.toLowerCase() === 'verified' ? <HiOutlineCheckBadge className="text-sm md:text-lg" /> : <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#1A3263] animate-pulse" />}
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">{user.accountStatus?.toLowerCase() === 'verified' ? 'VERIFIED' : (user.accountStatus || 'Pending')}</span>
                    </div>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    {/* Profile Picture Section */}
                    <div className="relative group/pic">
                        {user.profilePicture ? (
                            <div className="relative">
                                <img
                                    src={user.profilePicture}
                                    alt="Profile"
                                    className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] object-cover border-4 border-white/20 shadow-2xl group-hover/pic:border-white/40 transition-all duration-500"
                                />
                                <button
                                    onClick={handleProfilePicDelete}
                                    className="absolute -top-2 -right-2 bg-rose-500 text-white p-2.5 rounded-2xl shadow-xl opacity-0 group-hover/pic:opacity-100 transition-all hover:scale-110 active:scale-95"
                                    title="Delete Photo"
                                >
                                    <HiOutlineTrash className="text-lg" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-white/10 backdrop-blur-md flex items-center justify-center text-white font-black text-5xl border-4 border-white/10 group-hover/pic:border-white/20 transition-all duration-500 shadow-2xl">
                                {(application?.studentName || user?.name || 'S').charAt(0).toUpperCase()}
                            </div>
                        )}

                        <button
                            onClick={() => profilePicInputRef.current?.click()}
                            className="absolute -bottom-2 -right-2 w-10 h-10 bg-white text-[#1A3263] rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20"
                            title="Update Profile Picture"
                        >
                            <HiOutlineCamera className="text-xl" />
                        </button>
                        <input
                            type="file"
                            ref={profilePicInputRef}
                            onChange={handleProfilePicUpload}
                            className="hidden"
                            accept=".jpg,.jpeg,.png"
                        />

                        {uploadingProfile && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center z-30">
                                <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    {/* Text and Badges Section */}
                    <div className="flex-1 min-w-0">
                        <div className="mb-2 inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">Student Portal</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">
                            Welcome, <span className="text-[#FAB95B]">{application?.studentName || user?.name?.split(' ')[0] || 'Student'}</span>
                        </h2>


                        <p className="text-indigo-100/60 text-base font-medium mb-6 max-w-2xl leading-relaxed">
                            {application
                                ? "Your hostel environment is ready. Manage your details, check announcements, and stay updated."
                                : "Welcome to the SLIIT Kandy UNI Hostel Management System. Start by submitting your application."}
                        </p>

                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                            {user?.email && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/10 shadow-sm backdrop-blur-sm">
                                    <HiOutlineEnvelope className="text-[#FAB95B]" />
                                    <span className="text-sm font-bold tracking-tight">{user.email}</span>
                                </div>
                            )}
                            {myAllocation ? (
                                <>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/10 shadow-sm backdrop-blur-sm">
                                        <HiOutlineMapPin className="text-[#FAB95B]" />
                                        <span className="text-sm font-bold tracking-tight">Floor {myAllocation.floorNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/10 shadow-sm backdrop-blur-sm">
                                        <HiOutlineHome className="text-[#FAB95B]" />
                                        <span className="text-sm font-bold tracking-tight">Room {fmtRoom(myAllocation.wing, myAllocation.roomnumber)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/10 shadow-sm backdrop-blur-sm">
                                        <HiOutlineKey className="text-[#FAB95B]" />
                                        <span className="text-sm font-bold tracking-tight">Bed {myAllocation.bedId}</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/10 shadow-sm backdrop-blur-sm">
                                        <HiOutlineClipboardDocumentList className="text-[#FAB95B]" />
                                        <span className="text-sm font-bold tracking-tight">{myAllocation.roomType}</span>
                                    </div>
                                </>
                            ) : (
                                (application?.studentDegree || studentData?.degree) && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/10 shadow-sm backdrop-blur-sm">
                                        <HiOutlineAcademicCap className="text-[#FAB95B]" />
                                        <span className="text-sm font-bold tracking-tight">{application?.studentDegree || studentData?.degree}</span>
                                    </div>
                                )
                            )}
                            {application?.studentRollNumber && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/10 shadow-sm backdrop-blur-sm">
                                    <HiOutlineIdentification className="text-[#FAB95B]" />
                                    <span className="text-sm font-bold tracking-tight">{application.studentRollNumber}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {activeTab === 'dashboard' && <DashboardView user={user} student={studentData} application={application} complaints={complaints} notices={notices} navigate={navigate} setIsComplaintModalOpen={setIsComplaintModalOpen} onProfilePicDelete={handleProfilePicDelete} uploadingProfile={uploadingProfile} handleProfilePicUpload={handleProfilePicUpload} profilePicInputRef={profilePicInputRef} myStatus={myStatus} />}
            {activeTab === 'applications' && (
                <ApplicationsView
                    user={user}
                    application={application}
                    myAllocation={myAllocation}
                    myClearance={myClearance}
                    loading={appLoading}
                    onRefresh={() => { fetchApplication(); fetchClearanceData(); }}
                />
            )}
            {activeTab === 'in-out' && <InOutView status={myStatus} onRefresh={fetchMyStatus} isAllocated={!!myAllocation} />}
            {activeTab === 'payments' && <PaymentTab user={user} />}
            {activeTab === 'chats' && (
                <ComplaintsView
                    complaints={complaints}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                    activeComplaint={activeComplaint}
                    user={user}
                    setIsComplaintModalOpen={setIsComplaintModalOpen}
                    fetchData={fetchData}
                />
            )}
            {activeTab === 'settings' && <SettingsView user={user} onRefresh={fetchData} myClearance={myClearance} />}

            {isComplaintModalOpen && <NewComplaintModal onClose={() => setIsComplaintModalOpen(false)} onCreated={() => fetchData(false)} user={user} />}
        </div>
    );
};

// ─── Delete Profile Modal ──────────────────────────────────
const DeleteProfileModal = ({ onClose, onConfirm, loading }) => {
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal !max-w-md dark:bg-slate-900 border dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="modal-header border-b dark:border-slate-800">
                    <div>
                        <h3 className="text-xl font-black text-rose-600 uppercase tracking-tighter">Delete Profile</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">This action cannot be undone</p>
                    </div>
                </div>

                <div className="modal-body py-8 px-6 space-y-6">
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-800/50">
                        <p className="text-xs font-bold text-rose-700 dark:text-rose-400 leading-relaxed">
                            Deleting your profile will permanently remove your account document from the hostel database. 
                            Internal hostel records (Allocations, Payments, etc.) will be purged separately by the Warden.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Enter Password to Confirm</label>
                            <div className="relative">
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-rose-50/50 outline-none transition-all font-bold"
                                    placeholder="Verify Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showPwd ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer bg-slate-50 dark:bg-slate-900/50 flex gap-3 border-t dark:border-slate-800">
                    <button 
                        className="flex-1 h-12 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs hover:bg-slate-300 transition-all cursor-pointer"
                        onClick={onClose}
                    >
                        Keep My Profile
                    </button>
                    <button 
                        className="flex-1 h-12 bg-rose-600 text-white rounded-xl font-black text-xs hover:bg-rose-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        disabled={!password || loading}
                        onClick={() => onConfirm(password)}
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <HiOutlineTrash />}
                        Delete Permanently
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Settings View (Phone & Password OTP) ──────────────────────────────────
const SettingsView = ({ user, onRefresh, myClearance }) => {
    const [phoneState, setPhoneState] = useState({ step: 'form', newPhone: '', otp: '', loading: false });
    const [pwdState, setPwdState] = useState({ step: 'form', newPwd: '', confirmPwd: '', otp: '', loading: false });
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const navigate = useNavigate();

    const isClearanceApproved = myClearance?.status === 'Approved';

    const handleDeleteAccount = async (password) => {
        setIsDeleting(true);
        try {
            const data = await api.deleteMyProfile(password);
            if (data.success) {
                toast.success('Your profile has been deleted. Logging you out...');
                setTimeout(() => {
                    sessionStorage.clear();
                    localStorage.clear();
                    navigate('/login');
                }, 1500);
            } else {
                toast.error(data.message || 'Deletion failed');
            }
        } catch (err) {
            toast.error(err.message || 'An error occurred during deletion');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

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
                onRefresh();
            } else toast.error(data.message);
        } catch { toast.error('Connection error'); }
        finally { setPhoneState(prev => ({ ...prev, loading: false })); }
    };

    // ── Password Update Logic (Reusing forgot-password logic) ──
    const requestPwdOTP = async (e) => {
        e.preventDefault();
        if (pwdState.newPwd !== pwdState.confirmPwd) return toast.error('Passwords do not match');
        if (pwdState.newPwd.length < 6) return toast.error('Min. 6 characters required');
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
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans pb-20">
            <div className="space-y-10 pt-4">
                {/* Security Management Sections */}
                <div className="flex items-center gap-3 mb-2 px-2">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/50 dark:border-indigo-900/50">
                        <HiOutlineCog6Tooth size={22} className="animate-spin-slow" />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">Account Security</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Protect Your Student Credentials</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* ── Section: Phone Number ── */}
                    <div className="space-y-6 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 transition-all hover:border-indigo-200 dark:hover:border-indigo-900/50 shadow-sm group">
                        <div className="flex items-center gap-3">
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
                                <button type="submit" disabled={phoneState.loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
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
                                    <button type="button" onClick={() => setPhoneState({ ...phoneState, step: 'form' })} className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest">Back</button>
                                    <button type="submit" disabled={phoneState.loading} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
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
                                    <button onClick={() => setPhoneState({ ...phoneState, step: 'form' })} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline mt-2 bg-transparent uppercase tracking-widest">Restart Flow</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Section: Password Change ── */}
                    <div className="space-y-6 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 transition-all hover:border-rose-200 dark:hover:border-rose-900/50 shadow-sm group">
                        <div className="flex items-center gap-3">
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
                                            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors bg-transparent">
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
                                            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors bg-transparent">
                                                {showConfirm ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" disabled={pwdState.loading} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50">
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
                                    <button type="button" onClick={() => setPwdState({ ...pwdState, step: 'form' })} className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest">Back</button>
                                    <button type="submit" disabled={pwdState.loading} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50">
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
                                    <button onClick={() => setPwdState({ ...pwdState, step: 'form' })} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline mt-2 bg-transparent uppercase tracking-widest">Update again</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Support Hero Card */}
            <div className="bg-[#1A3263] rounded-[2.5rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10">
                    <h4 className="text-2xl font-black mb-1">Need Account Support?</h4>
                    <p className="text-indigo-200/60 font-medium">Contact the Hostel Administration for major changes or data issues.</p>
                </div>
                <button onClick={() => onRefresh()} className="relative z-10 px-8 py-4 bg-white text-[#1A3263] rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#FAB95B] hover:scale-105 active:scale-95 transition-all shadow-xl">
                    Refresh System Session
                </button>
            </div>

            {isClearanceApproved && (
                <div className="p-8 bg-rose-50/50 dark:bg-rose-900/10 rounded-[2.5rem] border-2 border-rose-100 dark:border-rose-900/30 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center text-rose-600">
                            <HiOutlineTrash size={22} />
                        </div>
                        <h3 className="text-lg font-black text-rose-600 uppercase tracking-tighter">Deactivate Profile</h3>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="max-w-xl">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Permanently Remove Account</p>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed leading-relaxed">As your clearance is approved, you may now proceed to delete your account. This will purge your profile document from the system. Remaining hostel logs will be archived by the Warden.</p>
                        </div>
                        <button 
                            onClick={() => setShowDeleteModal(true)}
                            className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 active:scale-95 transition-all shadow-xl shadow-rose-600/20 whitespace-nowrap"
                        >
                            Delete Profile
                        </button>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <DeleteProfileModal 
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={handleDeleteAccount}
                    loading={isDeleting}
                />
            )}
        </div>
    );
};

const DashboardView = ({ user, student, application, complaints, notices, navigate, setIsComplaintModalOpen, onProfilePicDelete, uploadingProfile, myStatus }) => {
    return (
        <div className="space-y-8">
            {/* Main Stats and Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side - Quick Actions and Payment Summary */}
                <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <StatCard icon={HiOutlineChatBubbleLeftRight} label="Complaints" value={complaints.length} color="amber" />
                        <StatCard 
                            icon={HiOutlineCurrencyDollar} 
                            label="Refundable Status" 
                            value={student?.refundPayment?.paymentStatus || 'Not Paid'} 
                            color={student?.refundPayment?.paymentStatus === 'Approved' ? 'emerald' : 'amber'} 
                        />
                    </div>

                    {student?.refundPayment?.paymentStatus === 'Approved' && (
                        <div className="mt-4 p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-[2rem] text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-700">
                            <span className="text-2xl"></span>
                            <span>Refundable is successful. Check your bank account!</span>
                        </div>
                    )}

                    {/* Payment Summary Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-50 dark:border-slate-800">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Payment Summary</h3>
                            <HiOutlineWallet className="text-2xl text-indigo-400" />
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Paid Months</div>
                                <div className="flex flex-wrap gap-2">
                                    {student?.submittedMonths?.filter(m => m.status === 'Accepted').length > 0 ? (
                                        student.submittedMonths
                                            .filter(m => m.status === 'Accepted')
                                            .flatMap(m => m.months || [m.month])
                                            .map((mon, idx) => (
                                                <span key={idx} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[11px] font-black uppercase tracking-tight border border-emerald-100 dark:border-emerald-800">
                                                    {mon}
                                                </span>
                                            ))
                                    ) : (
                                        <span className="text-xs font-bold text-slate-400 italic">No monthly payments recorded yet.</span>
                                    )}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Refundable Payment (PayID Summary)</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Amount Paid:</span>
                                    <span className="text-sm font-black text-slate-800 dark:text-white">LKR {student?.refundPayment?.amount?.toLocaleString() || '0'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Activity Status */}
                <div className="space-y-8">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-50 dark:border-slate-800 h-full">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Activity Status</h3>
                            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${myStatus?.status === 'INSIDE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                <span className={`w-2 h-2 rounded-full ${myStatus?.status === 'INSIDE' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                CURRENT {myStatus?.status || 'UNKNOWN'}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-start gap-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${myStatus?.status === 'INSIDE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    <HiOutlineArrowsRightLeft />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Last Activity</div>
                                    <div className="text-lg font-black text-slate-800 dark:text-slate-200">
                                        {myStatus?.lastAction ? `${myStatus.lastAction}` : 'No recent scans'}
                                    </div>
                                    <div className="text-xs font-bold text-slate-400">
                                        {myStatus?.lastTime ? new Date(myStatus.lastTime).toLocaleString() : '—'}
                                    </div>
                                </div>
                            </div>

                            {myStatus?.status === 'OUTSIDE' && (
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest">
                                        <HiOutlineMapPin className="text-lg" />
                                        Current Destination
                                    </div>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200 pl-6 border-l-2 border-rose-200">
                                        {myStatus?.destination || 'N/A'}
                                        {myStatus?.goingHome && <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[9px]">Home Visit</span>}
                                    </p>
                                </div>
                            )}

                            <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 italic leading-relaxed">
                                    * Your attendance is automatically logged via QR scan at the security gate. Ensure your status is correct for safety compliance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProfileInfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-colors group">
        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 transition-colors shadow-sm">
            <Icon />
        </div>
        <div className="text-left flex-1 min-w-0">
            <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</div>
            <div className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{value}</div>
        </div>
    </div>
);

const StatCard = ({ icon: Icon, label, value, color }) => {
    const colors = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600'
    };
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-50 dark:border-slate-800">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 ${colors[color]}`}>
                <Icon />
            </div>
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</div>
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{value}</div>
        </div>
    );
};

const EMPTY_FORM = (user) => ({
    studentRollNumber: '',
    studentName: user?.name || '',
    studentEmail: user?.email || '',
    nic: '',
    gender: 'male',
    dateOfBirth: '',
    contactNumber: '',
    permanentAddress: '',
    faculty: '',
    studentDegree: '',
    studentYear: '',
    registrationNumber: '',
    preferredHostel: 'Male Hostel',
    roomType: 'single',
    durationOfStay: '',
    hasMedicalCondition: false,
    medicalConditionDetails: '',
    allergies: '',
    regularMedications: '',
    medicalReportUrl: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    guardianName: '',
    guardianContactNumber: '',

});

const ApplicationsView = ({ user, application: appProp, myAllocation, myClearance, loading, onRefresh }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formType, setFormType] = useState('registration');
    const [localApp, setLocalApp] = useState(appProp);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState(() => appProp ? {
        ...EMPTY_FORM(user),
        ...appProp,
        dateOfBirth: (appProp.dateOfBirth && !isNaN(new Date(appProp.dateOfBirth).getTime())) ? new Date(appProp.dateOfBirth).toISOString().split('T')[0] : ''
    } : EMPTY_FORM(user));

    const [uploadingMedical, setUploadingMedical] = useState(false);
    const medicalFileInputRef = useRef(null);

    useEffect(() => {
        setLocalApp(appProp);
        // Only update formData if NOT currently editing to prevent background refresh from wiping unsaved changes
        if (appProp && !isEditing) {
            setFormData({
                ...EMPTY_FORM(user),
                ...appProp,
                dateOfBirth: (appProp.dateOfBirth && !isNaN(new Date(appProp.dateOfBirth).getTime())) ? new Date(appProp.dateOfBirth).toISOString().split('T')[0] : ''
            });
        }
    }, [appProp, isEditing, user]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'gender') {
            const autoHostel = value === 'male' ? 'Male Hostel' : (value === 'female' ? 'Female Hostel' : '');
            setFormData(prev => ({ ...prev, gender: value, preferredHostel: autoHostel }));
        } else if (name === 'nic') {
            setFormData(prev => ({ ...prev, nic: value.toUpperCase() }));
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };

    const handleCancel = () => {
        // Reset form to the current saved data
        if (localApp) {
            setFormData({
                ...EMPTY_FORM(user),
                ...localApp,
                dateOfBirth: localApp.dateOfBirth ? new Date(localApp.dateOfBirth).toISOString().split('T')[0] : ''
            });
        }
        setIsEditing(false);
    };

    const handleMedicalUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 10MB limit
        if (file.size > 10 * 1024 * 1024) {
            toast.error('File too large (max 10MB)');
            return;
        }

        setUploadingMedical(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API}/applications/upload-medical`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user.token}` },
                body: formData
            });
            const data = await res.json();
            if (data.url) {
                setFormData(prev => ({ ...prev, medicalReportUrl: data.url }));
                toast.success('Medical report uploaded!');
            } else {
                toast.error(data.error || 'Upload failed');
            }
        } catch (err) {
            toast.error('Upload failed. Please try again.');
        } finally {
            setUploadingMedical(false);
            if (medicalFileInputRef.current) medicalFileInputRef.current.value = '';
        }
    };

    const validateForm = () => {
        // NIC Validation: 12 numbers OR 9 numbers + V
        const nicRegex = /^(\d{12}|\d{9}V)$/;
        if (!nicRegex.test(formData.nic)) {
            toast.error('Invalid NIC format. Use 12 digits or 9 digits + "V".');
            return false;
        }

        // Phone Validation: Exactly 10 digits
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(formData.contactNumber)) {
            toast.error('Contact number must be exactly 10 digits.');
            return false;
        }
        if (!phoneRegex.test(formData.guardianContactNumber)) {
            toast.error('Guardian contact must be exactly 10 digits.');
            return false;
        }
        if (!phoneRegex.test(formData.emergencyContactPhone)) {
            toast.error('Emergency contact phone must be exactly 10 digits.');
            return false;
        }

        // Registration Number Validation: Must match email prefix (Trimmed and UpperCased)
        const emailPrefix = (formData.studentEmail || '').split('@')[0].trim().toUpperCase();
        const regNumber = (formData.registrationNumber || '').trim().toUpperCase();
        
        if (regNumber !== emailPrefix) {
            toast.error(`Registration Number must match your email ID (${emailPrefix}).`);
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitting(true);
        const method = localApp ? 'PUT' : 'POST';
        const url = localApp ? `${API}/applications/me` : `${API}/applications`;
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success(localApp ? 'Application updated successfully!' : 'Application submitted!');
                setLocalApp(data);
                setIsEditing(false);
                onRefresh();
            }
        } catch (err) {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/applications/me`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success('Application deleted successfully.');
                setLocalApp(null);
                setFormData(EMPTY_FORM(user));
                setShowDeleteConfirm(false);
                onRefresh();
            }
        } catch (err) {
            toast.error('Delete failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center py-32">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Hostel Application</h2>
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-0.5">
                        {localApp ? (isEditing ? 'Editing your application' : 'Your submitted application') : 'Apply for hostel accommodation'}
                    </p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-start sm:self-auto">
                    <button onClick={() => setFormType('registration')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${formType === 'registration' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Registration</button>
                    <button onClick={() => setFormType('clearance')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${formType === 'clearance' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Clearance</button>
                </div>
            </div>

            {formType === 'clearance' ? (
                <ClearanceView 
                    user={user} 
                    allocation={myAllocation} 
                    application={localApp}
                    clearance={myClearance} 
                    onRefresh={onRefresh} 
                />
            ) : localApp && !isEditing ? (
                /* ─── READ-ONLY VIEW ─────────────────────────────────────────── */
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-lg shadow-slate-100/60 dark:shadow-none">
                    {/* Top status bar */}
                    <div className="px-8 py-5 bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${localApp.applicationStatus === 'Rejected' || localApp.applicationStatus === 'Deactivated' ? 'bg-rose-500' : localApp.applicationStatus === 'Approved' || localApp.applicationStatus === 'Activated' ? 'bg-emerald-500' : 'bg-amber-400'} animate-pulse`} />
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{localApp.applicationStatus || 'Pending'}</span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">ID: {localApp.studentRollNumber || 'Assigned'}</span>
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Submitted {localApp.createdAt ? new Date(localApp.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                    </div>

                    {/* Data grid */}
                    <div className="p-8 space-y-8">
                        {/* Personal */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <HiOutlineUser className="text-indigo-400 dark:text-indigo-500 text-base" />
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Personal Details</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <ReadField label="Full Name" value={localApp.studentName} span="col-span-2" />
                                <ReadField label="NIC" value={localApp.nic} />
                                <ReadField label="Gender" value={localApp.gender} />
                                <ReadField label="Date of Birth" value={localApp.dateOfBirth ? new Date(localApp.dateOfBirth).toLocaleDateString() : ''} />
                                <ReadField label="Contact" value={localApp.contactNumber} />
                                <ReadField label="Email" value={localApp.studentEmail} span="col-span-2" />
                            </div>
                        </section>

                        <div className="border-t border-slate-50" />

                        {/* Academic */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <HiOutlineClipboardDocumentList className="text-indigo-400 dark:text-indigo-500 text-base" />
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Academic Information</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <ReadField label="Degree" value={localApp.studentDegree} />
                                <ReadField label="Year" value={localApp.studentYear} />
                                <ReadField label="Registration No." value={localApp.registrationNumber} />
                                <ReadField label="Faculty" value={localApp.faculty} />
                            </div>
                        </section>

                        <div className="border-t border-slate-50" />

                        {/* Hostel */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <HiOutlineHome className="text-indigo-400 dark:text-indigo-500 text-base" />
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hostel Preference</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <ReadField label="Room Type" value={localApp.roomType} />
                                <ReadField label="Preferred Hostel" value={localApp.preferredHostel} />
                                <ReadField label="Duration" value={localApp.durationOfStay} />
                            </div>
                        </section>

                        <div className="border-t border-slate-50" />

                        {/* Emergency */}
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <HiOutlineExclamationCircle className="text-indigo-400 dark:text-indigo-500 text-base" />
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Guardian & Emergency</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <ReadField label="Guardian Name" value={localApp.guardianName} />
                                <ReadField label="Guardian Contact" value={localApp.guardianContactNumber} />
                                <ReadField label="Emergency Name" value={localApp.emergencyContactName} />
                                <ReadField label="Emergency Phone" value={localApp.emergencyContactPhone} />
                            </div>
                        </section>

                        {localApp.hasMedicalCondition && (
                            <>
                                <div className="border-t border-slate-50 dark:border-slate-800" />
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-rose-400 text-base">🩺</span>
                                        <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Medical Information</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <ReadField label="Conditions" value={localApp.medicalConditionDetails} />
                                        <ReadField label="Allergies" value={localApp.allergies} />
                                        <ReadField label="Medications" value={localApp.regularMedications} />
                                    </div>
                                    {localApp.medicalReportUrl && (
                                        <div className="mt-4">
                                            <a
                                                href={localApp.medicalReportUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all border border-rose-100 dark:border-rose-900/40"
                                            >
                                                <HiOutlineDocumentText className="text-base" />
                                                View Medical Report
                                            </a>
                                        </div>
                                    )}
                                </section>
                            </>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="px-8 py-6 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Only you can edit or delete this application.</p>
                        <div className="flex gap-3">
                            {showDeleteConfirm ? (
                                <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-900/30 rounded-2xl px-4 py-2.5">
                                    <span className="text-rose-700 dark:text-rose-400 font-bold text-sm">Delete permanently?</span>
                                    <button onClick={handleDelete} disabled={submitting} className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-black hover:bg-rose-700 transition-all disabled:opacity-60">{submitting ? 'Deleting...' : 'Yes, Delete'}</button>
                                    <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Cancel</button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="px-5 py-3 border-2 border-rose-200 dark:border-rose-900/30 text-rose-500 dark:text-rose-400 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-900/40 hover:border-rose-300 dark:hover:border-rose-900/60 transition-all"
                                    >
                                        <HiOutlineTrash className="text-base" />
                                        Delete Form
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="px-7 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 hover:shadow-lg dark:hover:shadow-none hover:-translate-y-0.5 transition-all"
                                    >
                                        <HiOutlinePencilSquare className="text-base" />
                                        Edit Application
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* ─── EDIT / NEW FORM ────────────────────────────────────────── */
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-lg shadow-slate-100/60 dark:shadow-none">
                    {/* Form header */}
                    <div className={`px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${isEditing ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">{isEditing ? '✏️ Edit Application' : '📋 New Application'}</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{isEditing ? 'Make your changes and click Save to update the record.' : 'Fill in all fields and submit your application.'}</p>
                        </div>
                        {isEditing && (
                            <button type="button" onClick={handleCancel} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all">
                                <HiOutlineXMark /> Cancel
                            </button>
                        )}
                    </div>

                    <div className="p-8 space-y-10">
                        {/* Personal info */}
                        <section className="space-y-5">
                            <h4 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <HiOutlineUser /> Personal Information
                            </h4>
                            <div className="grid md:grid-cols-2 gap-5">
                                <Input label="Full Name" name="studentName" value={formData.studentName} onChange={handleChange} required />
                                <Input label="Email Address" name="studentEmail" value={formData.studentEmail} onChange={handleChange} type="email" />
                                <Input label="NIC Number" name="nic" value={formData.nic} onChange={handleChange} />
                                <Input label="Contact Number" name="contactNumber" value={formData.contactNumber} onChange={handleChange} />
                                <Input label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={handleChange} />
                                <Input label="Permanent Address" name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} />
                            </div>
                        </section>

                        <div className="border-t border-slate-50" />

                        {/* Academic */}
                        <section className="space-y-5">
                            <h4 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <HiOutlineClipboardDocumentList /> Academic Details
                            </h4>
                            <div className="grid md:grid-cols-2 gap-5">
                                <Input label="Faculty" name="faculty" value={formData.faculty} onChange={handleChange} />
                                <Select label="Degree / Course" name="studentDegree" value={formData.studentDegree} onChange={handleChange} options={[
                                    { label: 'Select Degree', value: '' },
                                    { label: 'Information Technology (IT)', value: 'IT' },
                                    { label: 'Business Management (BM)', value: 'BM' },
                                    { label: 'Software Architecture (SA)', value: 'SA' }
                                ]} required />
                                <Input label="Year of Study" name="studentYear" value={formData.studentYear} onChange={handleChange} />
                                <Input label="Registration Number" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} />
                            </div>
                        </section>

                        <div className="border-t border-slate-50" />

                        {/* Hostel */}
                        <section className="space-y-5">
                            <h4 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <HiOutlineHome /> Hostel Preference
                            </h4>
                            <div className="grid md:grid-cols-2 gap-5">
                                <Select label="Gender" name="gender" value={formData.gender} onChange={handleChange} options={[
                                    { label: 'Male', value: 'male' },
                                    { label: 'Female', value: 'female' },
                                    { label: 'Other', value: 'other' }
                                ]} />
                                <Input label="Preferred Hostel / Block" name="preferredHostel" value={formData.preferredHostel} onChange={handleChange} />
                                <Select label="Room Type" name="roomType" value={formData.roomType} onChange={handleChange} options={[
                                    { label: 'Single', value: 'single' },
                                    { label: 'Double', value: 'double' },
                                    { label: 'Triple', value: 'triple' }
                                ]} required />
                                <Input label="Duration of Stay" name="durationOfStay" value={formData.durationOfStay} onChange={handleChange} />
                            </div>
                        </section>

                        <div className="border-t border-slate-50" />

                        {/* Guardian */}
                        <section className="space-y-5">
                            <h4 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <HiOutlineExclamationCircle /> Guardian & Emergency Contact
                            </h4>
                            <div className="grid md:grid-cols-2 gap-5">
                                <Input label="Guardian Name" name="guardianName" value={formData.guardianName} onChange={handleChange} required />
                                <Input label="Guardian Contact" name="guardianContactNumber" value={formData.guardianContactNumber} onChange={handleChange} required />
                                <Input label="Emergency Contact Name" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} required />
                                <Input label="Emergency Phone" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} required />
                            </div>
                        </section>

                        <div className="border-t border-slate-50" />

                        {/* Medical */}
                        <section className="space-y-5">
                            <h4 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Medical Information</h4>
                            <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
                                <input type="checkbox" name="hasMedicalCondition" id="hasMedicalCondition" checked={formData.hasMedicalCondition} onChange={handleChange} className="w-5 h-5 rounded-lg border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-800" />
                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">I have a medical condition or allergies</span>
                            </label>
                            {formData.hasMedicalCondition && (
                                <div className="space-y-5">
                                    <div className="grid md:grid-cols-3 gap-5 p-5 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl border border-rose-100/60 dark:border-rose-900/30">
                                        <TextArea label="Condition Details" name="medicalConditionDetails" value={formData.medicalConditionDetails} onChange={handleChange} />
                                        <TextArea label="Allergies" name="allergies" value={formData.allergies} onChange={handleChange} />
                                        <TextArea label="Regular Medications" name="regularMedications" value={formData.regularMedications} onChange={handleChange} />
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Medical Report / Document</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="file"
                                                ref={medicalFileInputRef}
                                                onChange={handleMedicalUpload}
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,image/*"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => medicalFileInputRef.current?.click()}
                                                disabled={uploadingMedical}
                                                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm hover:border-indigo-200 dark:hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all disabled:opacity-50"
                                            >
                                                {uploadingMedical ? (
                                                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                ) : <HiOutlinePaperClip className="text-lg" />}
                                                {formData.medicalReportUrl ? 'Change Document' : 'Attach Document'}
                                            </button>

                                            {formData.medicalReportUrl && (
                                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-bold text-sm">
                                                    <HiOutlineDocumentText className="text-xl" />
                                                    <span>Uploaded</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, medicalReportUrl: '' }))}
                                                        className="text-slate-400 dark:text-slate-600 hover:text-rose-500 transition-colors ml-2"
                                                    >
                                                        <HiOutlineXMark />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-600 px-1 italic">Accepted: PDF, Word, Images (Max 10MB)</p>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Submit bar */}
                    <div className="px-8 py-6 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                        <p className="text-xs text-slate-400 font-medium">All fields marked required must be filled before saving.</p>
                        <div className="flex gap-3">
                            {isEditing && (
                                <button type="button" onClick={handleCancel} className="px-6 py-3 border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-sm hover:bg-white dark:hover:bg-slate-800 transition-all">
                                    Cancel
                                </button>
                            )}
                            <button type="submit" disabled={submitting} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0">
                                {submitting ? 'Saving...' : (localApp ? '💾 Save Changes' : '🚀 Submit Application')}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    );
};

const ProfileField = ({ label, value }) => value ? (
    <div className="min-w-0">
        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{label}</div>
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate capitalize">{value}</div>
    </div>
) : null;

const Input = ({ label, ...props }) => (
    <div className="space-y-2">
        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">{label}</label>
        <input {...props} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 focus:border-indigo-200 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-bold text-slate-700 dark:text-slate-200" />
    </div>
);

const Select = ({ label, options, ...props }) => (
    <div className="space-y-2">
        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">{label}</label>
        <select {...props} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 focus:border-indigo-200 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-bold text-slate-700 dark:text-slate-200 appearance-none">
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    </div>
);

const TextArea = ({ label, ...props }) => (
    <div className="space-y-2">
        <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">{label}</label>
        <textarea {...props} rows={3} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/20 focus:border-indigo-200 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all font-bold text-slate-700 dark:text-slate-200" />
    </div>
);

const DetailItem = ({ label, value }) => (
    <div className="bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm group hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all">
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 group-hover:text-indigo-400 dark:group-hover:text-indigo-400 transition-colors">{label}</div>
        <div className="text-base font-bold text-slate-700 dark:text-slate-200 leading-tight">{value || 'N/A'}</div>
    </div>
);

const ReadField = ({ label, value, span }) => (
    <div className={`${span || ''} flex flex-col gap-1`}>
        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[38px] flex items-center select-none cursor-default">
            {value || <span className="text-slate-300 dark:text-slate-600 italic text-xs">Not provided</span>}
        </span>
    </div>
);


const ComplaintsView = ({ complaints, selectedId, setSelectedId, activeComplaint, user, setIsComplaintModalOpen, fetchData }) => {
    const [message, setMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [sending, setSending] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [feedbackGiven, setFeedbackGiven] = useState(null); // null | 'great' | 'not-resolved'
    const [sendingFeedback, setSendingFeedback] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const prevMessagesLength = useRef(0);

    // Reset feedback when switching to a different complaint
    useEffect(() => {
        setFeedbackGiven(null);
        prevMessagesLength.current = 0;
    }, [selectedId]);

    useEffect(() => {
        const currentLength = activeComplaint?.messages?.length || 0;
        if (currentLength > prevMessagesLength.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMessagesLength.current = currentLength;
    }, [activeComplaint?.messages]);

    const sendFeedback = async (type) => {
        if (sendingFeedback) return;
        setSendingFeedback(true);
        try {
            const feedbackText = type === 'great'
                ? 'Student feedback: Issue resolved successfully. Thank you for your help!'
                : 'Student feedback: Issue is NOT resolved yet. Please reopen and assist further.';

            const formData = new FormData();
            formData.append('content', feedbackText);
            const msgRes = await fetch(`${API}/complaints/${selectedId}/message-student`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${user.token}` },
                body: formData
            });
            const msgData = await msgRes.json();
            if (msgData.success) fetchData(false);

            if (type === 'not-resolved') {
                await fetch(`${API}/complaints/${selectedId}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'in-progress' })
                });
                fetchData(false);
                toast('Complaint reopened — warden has been notified.', { icon: '🔄' });
            } else {
                toast.success('Feedback sent! Glad the issue was resolved. ');
            }
            setFeedbackGiven(type);
        } catch {
            toast.error('Failed to send feedback');
        } finally {
            setSendingFeedback(false);
        }
    };

    const sendMessage = async (e) => {
        if (e) e.preventDefault();
        if ((!message.trim() && !selectedFile) || sending || !selectedId) return;
        setSending(true);
        try {
            const formData = new FormData();
            if (message.trim()) formData.append('content', message.trim());
            if (selectedFile) formData.append('file', selectedFile);

            const res = await fetch(`${API}/complaints/${selectedId}/message-student`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${user.token}` },
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setMessage('');
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                fetchData(false);
                // Trigger unread count refresh
                window.dispatchEvent(new CustomEvent('nmh_unread_refresh'));
            }
        } catch (err) {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedId) return;
        if (!window.confirm('Are you sure you want to delete this complaint? This cannot be undone.')) return;

        try {
            const res = await fetch(`${API}/complaints/${selectedId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Complaint deleted');
                setSelectedId(null);
                fetchData(false);
            } else {
                toast.error(data.message || 'Failed to delete');
            }
        } catch (err) {
            toast.error('Error deleting complaint');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error('File too large (max 10MB)');
                return;
            }
            setSelectedFile(file);
        }
    };

    const categories = ['all', ...new Set(complaints.map(c => c.category).filter(Boolean))];

    const filteredComplaints = complaints
        .filter(c => categoryFilter === 'all' || c.category === categoryFilter)
        .filter(c => 
            !search || 
            c.title?.toLowerCase().includes(search.toLowerCase()) || 
            c.description?.toLowerCase().includes(search.toLowerCase())
        );

    return (
        <div className="h-[75vh] flex flex-col lg:flex-row gap-8">
            {/* Sidebar: Ticket List */}
            <div className={`flex-1 lg:max-w-md space-y-6 flex flex-col ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Support</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={fetchData}
                                className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
                                title="Refresh"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setIsComplaintModalOpen(true)}
                                className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-100 dark:shadow-indigo-900/40 whitespace-nowrap"
                            >
                                <HiOutlinePlus className="text-lg" />
                                <span className="text-sm">New Chat</span>
                            </button>
                        </div>
                    </div>

                    {/* Search and Category Filter */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Search complaints..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-slate-200"
                            />
                            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none capitalize dark:text-slate-200"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {filteredComplaints.length > 0 ? filteredComplaints.map(c => {
                        const lastMsg = c.messages?.[c.messages.length - 1];
                        return (
                            <div
                                key={c._id}
                                onClick={() => setSelectedId(c._id)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group ${selectedId === c._id ? 'bg-slate-900 dark:bg-indigo-600 border-slate-900 dark:border-indigo-600 text-white shadow-xl shadow-slate-900/20 dark:shadow-indigo-900/30' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-500/30 hover:shadow-md'}`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${selectedId === c._id ? 'bg-white/10 text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                                    {c.title.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-sm font-bold truncate ${selectedId === c._id ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                            {c.title}
                                        </h4>
                                    </div>
                                    <p className={`text-[11px] font-medium truncate mb-1 opacity-60 ${selectedId === c._id ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {lastMsg?.content || 'No messages yet'}
                                    </p>
                                    <div className={`text-[9px] font-bold uppercase tracking-widest ${selectedId === c._id ? 'text-white/40' : 'text-slate-300 dark:text-slate-600'}`}>
                                        {new Date(c.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {c.studentUnreadCount > 0 && (
                                        <div className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-rose-500/20 animate-in zoom-in duration-300">
                                            {c.studentUnreadCount}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedId(c._id);
                                                setTimeout(() => handleDelete(), 100);
                                            }}
                                            className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all flex items-center justify-center text-base shadow-sm opacity-0 group-hover:opacity-100 active:scale-95"
                                            title="Delete"
                                        >
                                            <HiOutlineTrash />
                                        </button>
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${selectedId === c._id ? 'bg-white/10 text-white translate-x-1' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                                            →
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-20 bg-white dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                            <HiOutlineChatBubbleLeftRight className="text-4xl text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                            <p className="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest text-[10px]">No chats yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main: Chat Box */}
            <div className={`flex-[2] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-50 dark:border-slate-800 overflow-hidden flex flex-col ${!selectedId ? 'hidden lg:flex' : 'flex'}`}>
                {selectedId && activeComplaint ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedId(null)} className="lg:hidden p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl dark:text-slate-400">
                                    <HiOutlinePaperAirplane className="rotate-180 -mr-1" />
                                </button>
                                <div>
                                    <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg">{activeComplaint.title}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border border-slate-100 dark:border-slate-700/50 ${statusConfig[activeComplaint.status]?.color || statusConfig.open.color}`}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                                            {statusConfig[activeComplaint.status]?.label || 'Open'}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-wider">#{selectedId.slice(-6).toUpperCase()}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDelete}
                                    className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                                    title="Delete Complaint"
                                >
                                    <HiOutlineTrash className="text-lg" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-900/50">
                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed mb-8 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                                <span className="font-black uppercase tracking-widest text-[8px] text-indigo-500 block mb-1.5 antialiased">Initial Request Details</span>
                                {activeComplaint.description}
                            </div>

                            {activeComplaint.messages?.map((msg, idx) => {
                                const isMine = msg.senderRole === 'student';
                                return (
                                    <div key={idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`max-w-[80%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                                            <div className={`px-5 py-3.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm transition-all ${isMine
                                                ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-100 dark:shadow-none'
                                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-none shadow-slate-100 dark:shadow-none'
                                                }`}>
                                                {msg.fileUrl && (
                                                    <div className="mb-2">
                                                        {msg.fileType === 'image' ? (
                                                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                <img
                                                                    src={msg.fileUrl}
                                                                    alt="Attachment"
                                                                    className="max-w-full rounded-xl border border-white/10 hover:opacity-90 transition-opacity"
                                                                    style={{ maxHeight: '200px' }}
                                                                />
                                                            </a>
                                                        ) : (
                                                            <a
                                                                href={msg.fileUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`flex items-center gap-3 p-3 rounded-xl border ${isMine ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300'} hover:bg-opacity-80 transition-all`}
                                                            >
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMine ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
                                                                    <HiOutlineDocumentText className="text-lg" />
                                                                </div>
                                                                <span className="text-[10px] font-bold truncate">View Document</span>
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                                {msg.content}
                                            </div>
                                            <div className={`flex items-center gap-2 text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                                <span className="text-slate-800 dark:text-slate-400">{isMine ? 'You' : 'Warden'}</span>
                                                <span className="opacity-30">·</span>
                                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        {activeComplaint.status !== 'resolved' ? (
                            <form onSubmit={sendMessage} className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3 items-end">
                                <div className="flex-1 relative">
                                    {selectedFile && (
                                        <div className="absolute bottom-full mb-3 left-0 right-0 animate-in slide-in-from-bottom-2 duration-300">
                                            <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-3 shadow-lg flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                                                        {selectedFile.type.startsWith('image/') ? (
                                                            <img
                                                                src={URL.createObjectURL(selectedFile)}
                                                                className="w-full h-full object-cover rounded-xl"
                                                                alt="Preview"
                                                            />
                                                        ) : (
                                                            <HiOutlineDocumentText className="text-xl" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{selectedFile.name}</div>
                                                        <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFile(null)}
                                                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-rose-500 transition-colors"
                                                >
                                                    <HiOutlineXMark />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        hidden
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/*,.pdf,.doc,.docx"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute left-4 bottom-4 p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <HiOutlinePaperClip className="text-xl" />
                                    </button>
                                    <textarea
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                sendMessage();
                                            }
                                        }}
                                        placeholder="Type your message..."
                                        rows={1}
                                        className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all dark:text-slate-200"
                                        style={{ maxHeight: 120, minHeight: '56px' }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={(!message.trim() && !selectedFile) || sending}
                                    className="w-14 h-14 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-30 transition-all active:scale-95 shadow-lg shadow-slate-200 dark:shadow-none"
                                >
                                    <HiOutlinePaperAirplane className="text-xl" />
                                </button>
                            </form>
                        ) : (
                            /* ── Feedback panel when resolved ── */
                            <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                {feedbackGiven ? (
                                    <div className="py-5 text-center">
                                        {feedbackGiven === 'great' ? (
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="text-2xl"></span>
                                                <p className="text-emerald-700 dark:text-emerald-400 text-xs font-black">Thank you for your feedback!</p>
                                                <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold">We're glad the issue was resolved.</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="text-2xl">🔄</span>
                                                <p className="text-amber-700 text-xs font-black">Complaint Reopened</p>
                                                <p className="text-slate-400 text-[10px] font-bold">Warden has been notified to assist further.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="px-5 py-4">
                                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
                                            ✅ Warden marked this resolved — was your issue fixed?
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => sendFeedback('great')}
                                                disabled={sendingFeedback}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white font-black text-xs hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                                            >
                                                👍 {sendingFeedback ? 'Sending...' : 'Great! Issue Resolved'}
                                            </button>
                                            <button
                                                onClick={() => sendFeedback('not-resolved')}
                                                disabled={sendingFeedback}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-2 border-rose-200 dark:border-rose-900/30 font-black text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 active:scale-[0.98] transition-all disabled:opacity-50"
                                            >
                                                ❌ {sendingFeedback ? 'Sending...' : 'Not Resolved Yet'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-40">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-3xl mb-4 dark:text-slate-400">
                            <HiOutlineChatBubbleLeftRight />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200">Select a support ticket</h4>
                        <p className="text-sm font-medium mt-1 dark:text-slate-400">Choose a conversation from the left to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const NewComplaintModal = ({ onClose, onCreated, user }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Maintenance');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API}/complaints`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ title, description, category })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Support ticket created successfully!');
                onCreated();
                onClose();
            } else {
                toast.error(data.message || 'Failed to create ticket');
            }
        } catch (err) {
            toast.error('Connection error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border dark:border-slate-800">
                {/* Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-600 via-[#FAB95B] to-indigo-600" />

                <div className="p-10">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">New Support Ticket</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Explain your issue and we'll help you out.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                            <HiOutlineXMark className="text-xl text-slate-400 dark:text-slate-500" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Title</label>
                            <div className="relative">
                                <HiOutlineExclamationCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="w-full pl-11 pr-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-slate-200"
                                    placeholder="Briefly, what's wrong?"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Category</label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all dark:text-slate-200"
                                >
                                    <option>Maintenance & Repairs</option>
                                    <option>Electrical Issues</option>
                                    <option>Plumbing Problems</option>
                                    <option>Internet / Wi-Fi</option>
                                    <option>Security & Rules</option>
                                    <option>Other / General</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Detailed Description</label>
                            <textarea
                                rows="5"
                                required
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none transition-all"
                                placeholder="Tell us more details about the issue..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100 dark:shadow-indigo-900/20 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Creating Ticket...
                                </>
                            ) : (
                                <>
                                    <HiOutlinePaperAirplane className="rotate-90 text-xl" />
                                    Submit Support Ticket
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const ClearanceView = ({ user, allocation, application, clearance, onRefresh }) => {
    const [submitting, setSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [editingBank, setEditingBank] = useState(false);
    const [bankDetails, setBankDetails] = useState({
        accountHolderName: '',
        bankName: '',
        branchName: '',
        accountNumber: ''
    });

    // Pre-fill bank edit form from existing clearance when entering edit mode
    const handleStartEditBank = () => {
        setBankDetails({
            accountHolderName: clearance?.bankDetails?.accountHolderName || '',
            bankName: clearance?.bankDetails?.bankName || '',
            branchName: clearance?.bankDetails?.branchName || '',
            accountNumber: clearance?.bankDetails?.accountNumber || '',
        });
        setEditingBank(true);
    };

    const handleBankChange = (e) => {
        const { name, value } = e.target;
        setBankDetails(prev => ({ ...prev, [name]: value }));
    };

    // Submit NEW clearance form
    const handleSubmit = async () => {
        if (!allocation) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/clearance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                    studentName: allocation.studentName,
                    studentEmail: allocation.studentEmail,
                    studentPhone: application?.contactNumber || '',
                    studentRollNumber: allocation.studentRollNumber,
                    wing: allocation.wing,
                    floorNumber: allocation.floorNumber,
                    roomType: allocation.roomType,
                    roomNumber: allocation.roomnumber,
                    bedId: allocation.bedId,
                    bankDetails: bankDetails
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Clearance form submitted successfully!');
                onRefresh();
            } else {
                toast.error(data.message || 'Submission failed');
            }
        } catch (err) {
            toast.error('Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    // Update bank details only (for In Progress stage)
    const handleSaveBank = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/clearance/me/bank`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(bankDetails)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Bank details updated successfully!');
                setEditingBank(false);
                onRefresh();
            } else {
                toast.error(data.message || 'Update failed');
            }
        } catch (err) {
            toast.error('Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/clearance/me`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Clearance form deleted successfully.');
                setShowDeleteConfirm(false);
                onRefresh();
            } else {
                toast.error(data.message || 'Delete failed');
            }
        } catch (err) {
            toast.error('Delete failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!allocation) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <HiOutlineExclamationCircle className="text-3xl text-rose-500 dark:text-rose-400" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">Access Restricted</h3>
                <p className="text-slate-400 dark:text-slate-500 text-sm max-w-sm mx-auto">This clearance form is only accessible to students who have been allocated a room.</p>
            </div>
        );
    }

    if (clearance) {
        // Determine current stage
        const isWardenReviewed = clearance.isWardenSubmitted; // warden submitted → In Progress
        const isFinal = clearance.status === 'Approved' || clearance.status === 'Rejected';

        return (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-lg shadow-slate-100/60 dark:shadow-none transition-all border border-slate-100 dark:border-slate-800">
                {/* Status Bar */}
                <div className={`px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 ${
                    isFinal ? 'bg-gradient-to-r from-emerald-50 to-slate-50 dark:from-emerald-900/20 dark:to-slate-900/50'
                    : isWardenReviewed ? 'bg-gradient-to-r from-amber-50 to-slate-50 dark:from-amber-900/20 dark:to-slate-900/50'
                    : 'bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-indigo-900/20 dark:to-slate-900/50'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                            clearance.status === 'Rejected' ? 'bg-rose-500'
                            : clearance.status === 'Approved' ? 'bg-emerald-500'
                            : clearance.status === 'In Progress' ? 'bg-amber-400'
                            : 'bg-indigo-400'
                        }`} />
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">CLEARANCE {clearance.status}</span>
                        {isWardenReviewed && !isFinal && (
                            <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black rounded-full uppercase tracking-widest">Warden Reviewed</span>
                        )}
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Submitted {new Date(clearance.submittedAt).toLocaleDateString()}</span>
                </div>

                {/* Info Display */}
                <div className="p-8 space-y-8">
                    {clearance.status === 'Approved' && (
                        <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-[2rem] text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-700">
                            <span className="text-2xl"></span>
                            <span>Refundable is successful. Check your bank account!</span>
                        </div>
                    )}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <HiOutlineUser className="text-indigo-400 dark:text-indigo-500 text-base" />
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student Details</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <ReadField label="Full Name" value={clearance.studentName} />
                            <ReadField label="Email" value={clearance.studentEmail} />
                            <ReadField label="Phone" value={clearance.studentPhone} />
                            <ReadField label="Roll Number" value={clearance.studentRollNumber} />
                        </div>
                    </section>

                    <div className="border-t border-slate-100" />

                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <HiOutlineHome className="text-indigo-400 dark:text-indigo-500 text-base" />
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Allocation Highlights</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <ReadField label="Wing" value={clearance.wing} />
                            <ReadField label="Floor" value={clearance.floorNumber} />
                            <ReadField label="Room" value={fmtRoom(clearance.wing, clearance.roomNumber)} />
                            <ReadField label="Bed ID" value={clearance.bedId} />
                        </div>
                    </section>

                    <div className="border-t border-slate-100" />

                    {/* Bank Details — editable when In Progress */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <HiOutlineWallet className="text-indigo-400 dark:text-indigo-500 text-base" />
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Bank Details for Refund</h4>
                            </div>
                            {isWardenReviewed && !isFinal && !editingBank && (
                                <button
                                    onClick={handleStartEditBank}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"
                                >
                                    <HiOutlinePencilSquare className="text-sm" /> Edit Bank Details
                                </button>
                            )}
                        </div>

                        {isWardenReviewed && !isFinal && editingBank ? (
                            <div className="space-y-4 p-5 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-bold">✏️ Update your bank details below and save.</p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <Input label="Account Holder Name" name="accountHolderName" value={bankDetails.accountHolderName} onChange={handleBankChange} />
                                    <Input label="Bank Name" name="bankName" value={bankDetails.bankName} onChange={handleBankChange} />
                                    <Input label="Branch Name" name="branchName" value={bankDetails.branchName} onChange={handleBankChange} />
                                    <Input label="Account Number" name="accountNumber" value={bankDetails.accountNumber} onChange={handleBankChange} />
                                </div>
                                <div className="flex gap-3 pt-1">
                                    <button onClick={() => setEditingBank(false)} className="px-5 py-2.5 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                    <button onClick={handleSaveBank} disabled={submitting} className="px-7 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 hover:shadow-lg transition-all disabled:opacity-60">
                                        {submitting ? 'Saving...' : '💾 Save Bank Details'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <ReadField label="Account Holder" value={clearance.bankDetails?.accountHolderName} />
                                <ReadField label="Bank Name" value={clearance.bankDetails?.bankName} />
                                <ReadField label="Branch" value={clearance.bankDetails?.branchName} />
                                <ReadField label="Account Number" value={clearance.bankDetails?.accountNumber} />
                            </div>
                        )}
                    </section>

                    {/* In Progress info notice */}
                    {isWardenReviewed && !isFinal && (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                            <HiOutlineExclamationCircle className="text-amber-500 dark:text-amber-400 text-xl flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Warden has reviewed your clearance</p>
                                <p className="text-xs text-amber-600/80 dark:text-amber-500 mt-0.5">Your form is now being processed. You can update your bank details if needed, but the form cannot be deleted at this stage.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        {isFinal ? 'Clearance process is complete.' : isWardenReviewed ? 'Under review — deletion is disabled.' : 'You may delete this request before warden review.'}
                    </p>
                    <div className="flex gap-3">
                        {/* Only show Delete when status is Pending (warden hasn't reviewed yet) */}
                        {!isWardenReviewed && !isFinal && (
                            showDeleteConfirm ? (
                                <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-900/30 rounded-2xl px-4 py-2">
                                    <span className="text-rose-700 dark:text-rose-400 font-bold text-xs">Delete clearance?</span>
                                    <button onClick={handleDelete} disabled={submitting} className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-[10px] font-black hover:bg-rose-700 transition-all disabled:opacity-60">{submitting ? '...' : 'Delete'}</button>
                                    <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Cancel</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-5 py-2.5 border-2 border-rose-100 dark:border-rose-900/30 text-rose-500 dark:text-rose-400 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-rose-50 dark:hover:bg-rose-900/40 hover:border-rose-200 dark:hover:border-rose-900/60 transition-all active:scale-95"
                                >
                                    <HiOutlineTrash className="text-base" />
                                    Delete Request
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-lg shadow-slate-100/60 dark:shadow-none transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
            <div className="px-8 py-5 bg-gradient-to-r from-indigo-50 to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">📋 Clearance Form</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Please review your allocation details below and submit for clearance.</p>
            </div>

            <div className="p-8 space-y-8">
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <HiOutlineUser className="text-indigo-400 dark:text-indigo-500 text-base" />
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Student Details</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <ReadField label="Full Name" value={allocation.studentName} />
                        <ReadField label="Email" value={allocation.studentEmail} />
                        <ReadField label="Phone" value={application?.contactNumber} />
                        <ReadField label="Roll Number" value={allocation.studentRollNumber} />
                    </div>
                </section>

                <div className="border-t border-slate-100" />

                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <HiOutlineHome className="text-indigo-400 dark:text-indigo-500 text-base" />
                        <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Allocation Info</h4>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <ReadField label="Wing" value={allocation.wing} />
                        <ReadField label="Floor" value={allocation.floorNumber} />
                        <ReadField label="Room Number" value={fmtRoom(allocation.wing, allocation.roomnumber)} />
                        <ReadField label="Room Type" value={allocation.roomType} />
                        <ReadField label="Bed ID" value={allocation.bedId} />
                    </div>
                </section>

                <div className="border-t border-slate-100" />

                <section className="animate-in fade-in slide-in-from-top-2 duration-700 delay-150">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-500 dark:text-indigo-400 shadow-sm">
                            <HiOutlineWallet className="text-lg" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Refund Bank Details</h4>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">Where should we send your security deposit refund?</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Account Holder Name</label>
                            <input 
                                type="text"
                                name="accountHolderName"
                                value={bankDetails.accountHolderName}
                                onChange={handleBankChange}
                                placeholder="Enter full name as in bank"
                                className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Bank Name</label>
                            <input 
                                type="text"
                                name="bankName"
                                value={bankDetails.bankName}
                                onChange={handleBankChange}
                                placeholder="e.g. Bank of Ceylon, HNB"
                                className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Branch</label>
                            <input 
                                type="text"
                                name="branchName"
                                value={bankDetails.branchName}
                                onChange={handleBankChange}
                                placeholder="Branch location"
                                className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Account Number</label>
                            <input 
                                type="text"
                                name="accountNumber"
                                value={bankDetails.accountNumber}
                                onChange={handleBankChange}
                                placeholder="Enter account number"
                                className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-400 dark:focus:border-indigo-500 outline-none transition-all shadow-sm font-mono tracking-wider"
                            />
                        </div>
                    </div>
                </section>
            </div>

            <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Verify all details before submitting.</p>
                <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 hover:shadow-lg transition-all disabled:opacity-50 active:scale-95"
                >
                    {submitting ? 'Submitting...' : 'Submit Clearance'}
                    {!submitting && <HiOutlinePaperAirplane className="text-base rotate-45" />}
                </button>
            </div>
        </div>
    );
};

export default StudentDashboard;

const InOutView = ({ status, onRefresh, isAllocated }) => {
    if (!isAllocated) {
        return (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 p-16 text-center shadow-xl">
                    <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] flex items-center justify-center text-4xl mb-8 mx-auto shadow-inner">
                        <HiOutlineExclamationCircle className="text-rose-500" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight">Access Restricted</h3>
                    <p className="text-slate-400 dark:text-slate-500 text-base font-medium max-w-md mx-auto leading-relaxed">
                        The In & Out system is only available for students who have been officially <span className="text-indigo-500 font-bold">allocated to a room</span>.
                    </p>
                    <div className="mt-10 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 inline-block">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Requirement Pending</p>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-300 mt-1">Please wait for the Warden to finalize your room allocation.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-2xl">
                {/* Header Decoration */}
                <div className="h-32 bg-gradient-to-r from-indigo-600 to-indigo-900 relative">
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-[2px]" />
                    <div className="absolute bottom-0 left-0 w-full p-8 flex justify-between items-end">
                        <div>
                            <h3 className="text-2xl font-black text-white">Attendance Status</h3>
                            <p className="text-indigo-100/60 text-xs font-bold uppercase tracking-widest mt-1">Real-time gate synchronization</p>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl border backdrop-blur-md font-black text-xs uppercase tracking-wider shadow-xl ${
                            status?.status === 'INSIDE' 
                            ? 'bg-emerald-500 text-white border-emerald-400' 
                            : 'bg-amber-500 text-white border-amber-400'
                        }`}>
                            Current: {status?.status || 'UNKNOWN'}
                        </div>
                    </div>
                </div>

                <div className="p-8 sm:p-10 space-y-10">
                    {/* Status Illustration/Icon */}
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-2xl ${
                            status?.status === 'INSIDE' 
                            ? 'bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border-2 border-amber-500/20'
                        }`}>
                            {status?.status === 'INSIDE' ? <HiOutlineHome /> : <HiOutlineArrowRightOnRectangle />}
                        </div>
                        <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">
                            You are currently <span className={status?.status === 'INSIDE' ? 'text-emerald-500' : 'text-amber-500'}>
                                {status?.status === 'INSIDE' ? 'Inside the Hostel' : 'Out of the Hostel'}
                            </span>
                            {status?.status === 'OUTSIDE' && status?.goingHome && (
                                <span className="ml-2 px-3 py-1 bg-indigo-500/20 text-indigo-500 rounded-lg text-[10px] uppercase align-middle">
                                    Overnight
                                </span>
                            )}
                        </h4>
                        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mt-2 max-w-md">
                            {status?.status === 'OUTSIDE' && status?.goingHome 
                                ? 'You are currently marked as "Going Home". Automatic curfew late checks are suspended for this exit.' 
                                : 'Your status is used for security monitoring and attendance records. Use the button below to update your status at the gate.'}
                        </p>
                    </div>

                    {/* Last Action Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Last Action</div>
                            <div className="text-lg font-black text-slate-700 dark:text-slate-200">
                                {status?.lastAction || 'No records found'}
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Timestamp</div>
                            <div className="text-lg font-black text-slate-700 dark:text-slate-200">
                                {status?.lastTime ? new Date(status.lastTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                        <a 
                            href="/student/in-out" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1 active:scale-95 group"
                        >
                            Update Presence Status
                            <HiOutlineArrowsRightLeft className="text-lg group-hover:rotate-180 transition-transform duration-500" />
                        </a>
                        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-6">
                            Requires Security PIN Verification • Opens in New tab
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
