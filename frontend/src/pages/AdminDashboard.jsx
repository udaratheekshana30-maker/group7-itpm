import React, { useEffect, useMemo, useState } from 'react';
import { HiOutlineShieldCheck, HiOutlineUserPlus, HiOutlineUsers, HiOutlineExclamationCircle, HiOutlineTrash } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
    name: '',
    email: '',
    role: 'warden',
    phoneNumber: '',
    password: ''
};

const roleStyles = {
    admin: 'bg-slate-100 text-slate-700',
    warden: 'bg-amber-100 text-amber-800',
    security: 'bg-emerald-100 text-emerald-800',
    financial: 'bg-indigo-100 text-indigo-800'
};

export default function AdminDashboard() {
    const { user } = useAuth();
    const [formData, setFormData] = useState(emptyForm);
    const [staffUsers, setStaffUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const token = user?.token || sessionStorage.getItem('hostel_token');

    const stats = useMemo(() => ({
        total: staffUsers.filter(item => item.role !== 'admin').length,
        wardens: staffUsers.filter(item => item.role === 'warden').length,
        security: staffUsers.filter(item => item.role === 'security').length,
        financial: staffUsers.filter(item => item.role === 'financial').length
    }), [staffUsers]);

    const loadUsers = async () => {
        if (!token) return;

        try {
            setLoading(true);
            const res = await fetch('/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to load staff users');
            }

            setStaffUsers(data.data || []);
        } catch (err) {
            toast.error(err.message || 'Failed to load staff users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [token]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) return;

        try {
            setSaving(true);
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to create user');
            }

            toast.success(data.message || 'User created successfully');
            setFormData(emptyForm);
            setStaffUsers(prev => [data.data, ...prev]);
        } catch (err) {
            toast.error(err.message || 'Failed to create user');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStaff = async (id, name) => {
        if (!confirm(`Are you sure you want to delete staff account for ${name}? This action cannot be undone.`)) return;
        if (!token) return;

        try {
            setDeletingId(id);
            const res = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to delete user');
            }

            toast.success(data.message || 'Staff user deleted successfully');
            setStaffUsers(prev => prev.filter(u => u._id !== id));
        } catch (err) {
            toast.error(err.message || 'Failed to delete user');
        } finally {
            setDeletingId(null);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        if (!token) return;

        try {
            const normalizedStatus = newStatus.toLowerCase();
            const res = await fetch(`/api/admin/users/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: normalizedStatus })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to update status');
            }

            toast.success('User status updated');
            // Update UI with the capitalized version for consistency
            setStaffUsers(prev => prev.map(u => u._id === id ? { ...u, accountStatus: newStatus } : u));
        } catch (err) {
            toast.error(err.message || 'Failed to update status');
        }
    };

    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-10 space-y-10 animate-fade-in duration-700">
            {/* Standardized Premium Page Header */}
            <div className="page-header">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                    <HiOutlineShieldCheck className="text-base text-indigo-500" />
                    Admin Control <span className="text-indigo-500 italic">Center</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                    Manage Staff <span className="text-indigo-500 italic">Access</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4 leading-relaxed max-w-2xl">
                    Create and manage administrative accounts with professional access control and audit records.
                </p>
            </div>

            {/* Premium Tab Bar for Mobile Responsiveness */}
            <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/50 w-full md:w-fit overflow-x-auto scrollbar-hide">
                {['Overview', 'Staff'].map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t.toLowerCase())}
                        className={`px-6 sm:px-10 py-3 rounded-xl text-[10px] sm:text-xs font-black transition-all border-none cursor-pointer flex-1 md:flex-none whitespace-nowrap min-w-[140px] ${activeTab === t.toLowerCase()
                            ? 'bg-[#FAB95B] text-[#1A3263] shadow-lg shadow-amber-500/20'
                            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                            }`}
                    >
                        {t === 'Overview' ? (
                            <div className="flex flex-col leading-tight">
                                <span className="uppercase tracking-widest opacity-60 text-[9px]">SYSTEM</span>
                                <span className="mt-0.5 uppercase tracking-widest">OVERVIEW</span>
                            </div>
                        ) : (
                            <div className="flex flex-col leading-tight">
                                <span className="uppercase tracking-widest opacity-60 text-[9px]">STAFF</span>
                                <span className="mt-0.5 uppercase tracking-widest">MEMBERS</span>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <div className="mt-8 transition-all duration-500">
                {activeTab === 'overview' && (
                    <div className="space-y-10 animate-fade-in">
                        {/* Responsive Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Staff Accounts', val: stats.total, color: 'text-slate-900 dark:text-white' },
                                { label: 'Wardens', val: stats.wardens, color: 'text-amber-600 dark:text-amber-400' },
                                { label: 'Security', val: stats.security, color: 'text-emerald-600 dark:text-emerald-400' },
                                { label: 'Financial', val: stats.financial, color: 'text-indigo-600 dark:text-indigo-400' }
                            ].map((s, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 leading-none">{s.label}</div>
                                    <div className={`text-3xl font-black ${s.color} mt-1`}>{s.val}</div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr,1.5fr] gap-8">
                            {/* Create Staff Form Card */}
                            <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm overflow-hidden">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl shadow-sm">
                                        <HiOutlineUserPlus />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-none">Create User</h2>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5 leading-none">Assign Staff Access Role</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <label className="block space-y-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Full Identity Name</span>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => handleChange('name', e.target.value)}
                                            className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all font-sans"
                                            placeholder="Nimal Perera"
                                        />
                                    </label>

                                    <label className="block space-y-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Assigned Access Role</span>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => handleChange('role', e.target.value)}
                                            className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="warden">Warden Management</option>
                                            <option value="security">Security Services</option>
                                            <option value="financial">Financial Management</option>
                                        </select>
                                    </label>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <label className="block space-y-1.5">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Email Address</span>
                                            <input
                                                type="email"
                                                required
                                                value={formData.email}
                                                onChange={(e) => handleChange('email', e.target.value)}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all placeholder:font-normal font-sans"
                                                placeholder="staff@sliit.lk"
                                            />
                                        </label>

                                        <label className="block space-y-1.5">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Contact Dial</span>
                                            <input
                                                type="text"
                                                value={formData.phoneNumber}
                                                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                                                className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all font-sans"
                                                placeholder="07XXXXXXXX"
                                            />
                                        </label>
                                    </div>

                                    <label className="block space-y-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Set Access Password</span>
                                        <input
                                            type="password"
                                            required
                                            value={formData.password}
                                            onChange={(e) => handleChange('password', e.target.value)}
                                            className="w-full px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 dark:text-slate-200 transition-all font-sans"
                                            placeholder="Set a temporary password"
                                        />
                                    </label>

                                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-5 gap-3 flex items-start mt-6">
                                        <HiOutlineExclamationCircle className="text-xl text-amber-600 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-amber-800 dark:text-amber-400 font-bold leading-relaxed">
                                            Staff roles are restricted to administrative accounts. Students must continue to use the public registration workflow for applications.
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 dark:hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/10 border-none cursor-pointer mt-4"
                                    >
                                        {saving ? 'Processing...' : <div className="flex items-center justify-center gap-2 font-black"><HiOutlineUserPlus className="text-base" /> Create Account</div>}
                                    </button>
                                </form>
                            </section>

                            <section className="hidden lg:block space-y-6">
                                <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-indigo-600/20">
                                    <div className="relative z-10">
                                        <h2 className="text-3xl font-black tracking-tight leading-none uppercase">Admin <br/><span className="text-amber-400 italic">Rules</span></h2>
                                        <p className="text-indigo-100 font-medium mt-6 leading-relaxed">
                                            Access control is strictly monitored. Ensure wardens and security staff accounts are deactivated immediately upon service termination. 
                                        </p>
                                        <div className="mt-10 flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                <HiOutlineShieldCheck />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 group-hover:text-white transition-colors">Enterprise Security Standard</span>
                                        </div>
                                    </div>
                                    <div className="absolute top-10 right-[-50px] w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-20" />
                                    <div className="absolute bottom-[-50px] left-[-20px] w-48 h-48 bg-amber-400/10 rounded-full blur-2xl opacity-20" />
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'staff' && (
                    <div className="animate-fade-in space-y-8">
                        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-2xl shadow-sm">
                                        <HiOutlineUsers />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-none">Access Registry</h2>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5 leading-none">Directory of Existing Staff</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-0">
                                {loading ? (
                                    <div className="flex flex-col justify-center items-center py-24 gap-4">
                                        <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Profiles...</p>
                                    </div>
                                ) : staffUsers.length === 0 ? (
                                    <div className="py-24 text-center">
                                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center mx-auto text-slate-200 dark:text-slate-700 mb-4 transform rotate-12">
                                            <HiOutlineUsers size={40} />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Active Staff Directory</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile Optimized Card View */}
                                        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                                            {staffUsers.map(item => (
                                                <div key={item._id} className="bg-slate-50 dark:bg-slate-800/30 rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-black">
                                                                {item.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-black text-slate-900 dark:text-white leading-none uppercase">{item.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold mt-1.5 font-sans">{item.email}</div>
                                                            </div>
                                                        </div>
                                                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                            item.accountStatus === 'Verified' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
                                                            item.accountStatus === 'Pending' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 
                                                            'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                                                        }`}>
                                                            {item.accountStatus}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                        <div>
                                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Access Role</div>
                                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${roleStyles[item.role] || 'bg-slate-100 text-slate-600'}`}>
                                                                {item.role}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Direct Contact</div>
                                                            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-sans">{item.phoneNumber || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Update Profile Status</div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {['Verified', 'Pending', 'Reject'].map(status => (
                                                                <button 
                                                                    key={status}
                                                                    onClick={() => handleStatusUpdate(item._id, status)}
                                                                    className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-none cursor-pointer transition-all ${
                                                                        item.accountStatus === status ? 
                                                                        (status === 'Verified' ? 'bg-emerald-100 text-emerald-700 font-black ring-1 ring-emerald-200' : 
                                                                         status === 'Pending' ? 'bg-amber-100 text-amber-700 font-black ring-1 ring-amber-200' : 
                                                                         'bg-rose-100 text-rose-700 font-black ring-1 ring-rose-200') : 
                                                                        'bg-white dark:bg-slate-800 text-slate-400'
                                                                    }`}
                                                                >
                                                                    {status}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {item.role !== 'admin' && (
                                                            <button 
                                                                onClick={() => handleDeleteStaff(item._id, item.name)}
                                                                className="w-full py-2.5 mt-2 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all border-none cursor-pointer text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                                            >
                                                                <HiOutlineTrash className="text-xs" /> Terminate Access
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Desktop Professional Table View */}
                                        <div className="hidden md:block overflow-x-auto">
                                            <table className="w-full border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 text-left">Official Profile</th>
                                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 text-center">Account Role</th>
                                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 text-center">Phone Number</th>
                                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 text-center">Status</th>
                                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 text-center">Service Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                    {staffUsers.map(item => (
                                                        <tr key={item._id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300">
                                                            <td className="px-6 py-6">
                                                                <div className="flex items-center gap-5">
                                                                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-lg shadow-indigo-600/20 shrink-0">
                                                                        {item.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <div className="text-sm font-black text-slate-900 dark:text-white leading-none uppercase group-hover:text-indigo-600 transition-colors">{item.name}</div>
                                                                        <div className="text-[11px] text-slate-400 font-bold mt-2 font-sans">{item.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6 text-center">
                                                                <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${roleStyles[item.role] || 'bg-slate-100 text-slate-600'}`}>
                                                                    {item.role}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-6 text-center">
                                                                <div className="text-[11px] font-black text-slate-700 dark:text-slate-300 font-sans tracking-tight">
                                                                    {item.phoneNumber || 'N/A'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6 text-center">
                                                                <div className={`inline-flex items-center gap-3 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                                                    item.accountStatus === 'Verified' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shadow-sm' : 
                                                                    item.accountStatus === 'Pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shadow-sm' : 
                                                                    'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 shadow-sm'
                                                                }`}>
                                                                    <div className={`w-2 h-2 rounded-full ${
                                                                        item.accountStatus === 'Verified' ? 'bg-emerald-500' : 
                                                                        item.accountStatus === 'Pending' ? 'bg-amber-500' : 
                                                                        'bg-rose-500'
                                                                    } animate-pulse`} />
                                                                    {item.accountStatus}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-6">
                                                                <div className="flex items-center justify-center gap-3 translate-x-2 group-hover:translate-x-0 transition-all">
                                                                    <select 
                                                                        value={item.accountStatus}
                                                                        onChange={(e) => handleStatusUpdate(item._id, e.target.value)}
                                                                        className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                                                                    >
                                                                        <option value="Verified">Verified</option>
                                                                        <option value="Pending">Pending</option>
                                                                        <option value="Reject">Reject</option>
                                                                    </select>
                                                                    
                                                                    {item.role !== 'admin' && (
                                                                        <button 
                                                                            onClick={() => handleDeleteStaff(item._id, item.name)}
                                                                            className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all border-none cursor-pointer"
                                                                            title="Revoke system access"
                                                                        >
                                                                            <HiOutlineTrash size={18} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
