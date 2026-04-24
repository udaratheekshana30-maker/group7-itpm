import React, { useState, useEffect } from 'react';
import { 
    HiOutlineTicket, 
    HiOutlineClipboardDocumentList,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineCircleStack,
    HiOutlineFunnel
} from 'react-icons/hi2';
import { MdOutlineLocalLaundryService } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_URL = '/api/laundry';

const LaundryManagementStaff = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState('');
    const [config, setConfig] = useState({ washerCount: 0, dryerCount: 0 });
    const [configLoading, setConfigLoading] = useState(false);

    useEffect(() => {
        fetchBookings();
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/config`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) setConfig(data.data);
        } catch (err) {
            console.error('Failed to fetch config');
        }
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/all`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) setBookings(data.data);
        } catch (err) {
            toast.error('Failed to fetch bookings');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, status, paymentStatus) => {
        try {
            const res = await fetch(`${API_URL}/status/${id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ status, paymentStatus })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Updated successfully');
                fetchBookings();
            }
        } catch (err) {
            toast.error('Update failed');
        }
    };

    const handleUpdateConfig = async (e) => {
        e.preventDefault();
        setConfigLoading(true);
        try {
            const res = await fetch(`${API_URL}/config`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(config)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Configuration updated');
            }
        } catch (err) {
            toast.error('Failed to update config');
        } finally {
            setConfigLoading(false);
        }
    };

    const filteredBookings = filterDate 
        ? bookings.filter(b => b.date === filterDate)
        : bookings;

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <MdOutlineLocalLaundryService className="text-4xl text-indigo-600" />
                        Laundry Management
                    </h1>
                    <p className="text-slate-500 font-medium">Manage student laundry bookings and payments</p>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <HiOutlineFunnel className="text-slate-400" />
                    <input 
                        type="date" 
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-transparent border-none text-sm font-bold focus:ring-0"
                    />
                    {filterDate && (
                        <button onClick={() => setFilterDate('')} className="text-xs font-black text-rose-500 uppercase">Clear</button>
                    )}
                </div>
            </div>

            {/* Machine Configuration Section */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-8 text-white shadow-xl border border-white/5">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div>
                        <h2 className="text-xl font-black mb-2 flex items-center gap-2">
                            <HiOutlineCircleStack className="text-indigo-400" />
                            Operational Machines
                        </h2>
                        <p className="text-slate-400 text-sm font-medium">Update the number of working machines available for students</p>
                    </div>
                    <form onSubmit={handleUpdateConfig} className="flex flex-wrap items-center gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Washers</label>
                            <input 
                                type="number" 
                                min="0"
                                value={config.washerCount}
                                onChange={(e) => setConfig({ ...config, washerCount: parseInt(e.target.value) || 0 })}
                                className="w-24 bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 font-bold text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Dryers</label>
                            <input 
                                type="number" 
                                min="0"
                                value={config.dryerCount}
                                onChange={(e) => setConfig({ ...config, dryerCount: parseInt(e.target.value) || 0 })}
                                className="w-24 bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2 font-bold text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={configLoading}
                            className="mt-5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {configLoading ? 'Saving...' : 'Update Counts'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                            <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Student</th>
                            <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Machine</th>
                            <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Slot</th>
                            <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Payment</th>
                            <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Status</th>
                            <th className="px-6 py-4 text-center font-black uppercase tracking-wider text-slate-500 text-[10px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredBookings.map(booking => (
                            <tr key={booking._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800 dark:text-slate-100">{booking.studentName}</div>
                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{booking.studentId}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                                        {booking.machineType} #{booking.machineId}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-700 dark:text-slate-300">{booking.date}</div>
                                    <div className="text-[10px] text-slate-400 font-medium uppercase">{booking.slot}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <select 
                                        value={booking.paymentStatus}
                                        onChange={(e) => handleUpdateStatus(booking._id, null, e.target.value)}
                                        className={`text-[10px] font-black uppercase border-none rounded-lg px-2 py-1 focus:ring-0 cursor-pointer ${
                                            booking.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                        }`}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4">
                                    <select 
                                        value={booking.status}
                                        onChange={(e) => handleUpdateStatus(booking._id, e.target.value, null)}
                                        className={`text-[10px] font-black uppercase border-none rounded-lg px-2 py-1 focus:ring-0 cursor-pointer ${
                                            booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                            booking.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                                            'bg-indigo-100 text-indigo-700'
                                        }`}
                                    >
                                        <option value="booked">Booked</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleUpdateStatus(booking._id, 'completed', 'paid')}
                                        className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                                        title="Mark as Done & Paid"
                                    >
                                        <HiOutlineCheckCircle className="text-xl" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredBookings.length === 0 && (
                    <div className="text-center py-20 text-slate-400 font-medium">
                        No bookings found for this period.
                    </div>
                )}
            </div>
        </div>
    );
};

export default LaundryManagementStaff;
