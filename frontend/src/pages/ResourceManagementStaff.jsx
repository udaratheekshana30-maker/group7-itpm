import React, { useState, useEffect } from 'react';
import { 
    HiOutlineTicket, 
    HiOutlineClipboardDocumentList,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineFunnel,
    HiOutlineUserGroup,
    HiOutlineUsers
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_URL = '/api/resources';

const ResourceManagementStaff = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState('');
    const [filterResource, setFilterResource] = useState('all');

    useEffect(() => {
        fetchBookings();
    }, []);

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

    const handleUpdateStatus = async (id, status) => {
        try {
            const res = await fetch(`${API_URL}/status/${id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ status })
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

    const filteredBookings = bookings.filter(b => {
        const matchesDate = filterDate ? b.date === filterDate : true;
        const matchesResource = filterResource === 'all' ? true : b.resourceName === filterResource;
        return matchesDate && matchesResource;
    });

    const resources = ['Gym', 'Study Area', 'Music Room', 'TV Lounge'];

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <HiOutlineUserGroup className="text-4xl text-emerald-600" />
                        Facility Management
                    </h1>
                    <p className="text-slate-500 font-medium">Monitor facility usage and student reservations</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <HiOutlineFunnel className="text-slate-400" />
                        <select 
                            value={filterResource}
                            onChange={(e) => setFilterResource(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
                        >
                            <option value="all">All Facilities</option>
                            {resources.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
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
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Student</th>
                                <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Facility</th>
                                <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Purpose</th>
                                <th className="px-6 py-4 text-center font-black uppercase tracking-wider text-slate-500 text-[10px]">Size</th>
                                <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Schedule</th>
                                <th className="px-6 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Status</th>
                                <th className="px-6 py-4 text-center font-black uppercase tracking-wider text-slate-500 text-[10px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="py-20 text-center text-slate-400 font-medium italic">
                                        No reservations found matching the filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredBookings.map(booking => (
                                    <tr key={booking._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800 dark:text-slate-100">{booking.studentName}</div>
                                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">{booking.studentId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase">
                                                {booking.resourceName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={booking.purpose}>
                                                {booking.purpose || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-500">
                                                <HiOutlineUsers size={12} />
                                                {booking.participants || 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700 dark:text-slate-300">{booking.date}</div>
                                            <div className="text-[10px] text-slate-400 font-medium uppercase">{booking.slot}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select 
                                                value={booking.status}
                                                onChange={(e) => handleUpdateStatus(booking._id, e.target.value)}
                                                className={`text-[10px] font-black uppercase border-none rounded-lg px-2 py-1 focus:ring-0 cursor-pointer ${
                                                    booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                    booking.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}
                                            >
                                                <option value="booked">Booked</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button 
                                                    onClick={() => handleUpdateStatus(booking._id, 'completed')}
                                                    className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all"
                                                    title="Mark as Completed"
                                                >
                                                    <HiOutlineCheckCircle className="text-xl" />
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateStatus(booking._id, 'cancelled')}
                                                    className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all"
                                                    title="Cancel Booking"
                                                >
                                                    <HiOutlineXCircle className="text-xl" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ResourceManagementStaff;
