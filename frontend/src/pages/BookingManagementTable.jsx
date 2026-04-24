import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { 
    HiOutlineMagnifyingGlass, 
    HiOutlineFunnel, 
    HiOutlineArrowPath,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineClock,
    HiOutlineEye,
    HiOutlinePencilSquare,
    HiOutlineUserPlus
} from 'react-icons/hi2';

export default function BookingManagementTable({ onAllocateManually }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        roomType: '',
        paymentStatus: '',
        dateRange: ''
    });

    useEffect(() => {
        loadBookings();
    }, [filters]);

    const loadBookings = async () => {
        try {
            setLoading(true);
            // In a real app, this would be api.getBookings(filters)
            // For now, we use getAllocations and map it to a booking-like structure
            const data = await api.getAllocations();
            
            // Simulating real booking data based on allocations
            const formatted = data.map(alloc => ({
                id: alloc._id,
                studentName: alloc.studentName || 'Unknown Student',
                studentRoll: alloc.studentRoll || 'N/A',
                roomNo: alloc.roomNo || 'Unassigned',
                bedNo: alloc.bedId || 'N/A',
                roomType: alloc.roomType || 'Standard',
                paymentStatus: alloc.paymentStatus || 'success',
                bookingStatus: alloc.status || 'Approved',
                date: alloc.createdAt || new Date().toISOString(),
                student: alloc.student // Full student object for actions
            }));

            setBookings(formatted);
        } catch (err) {
            toast.error('Failed to load bookings');
        } finally {
            setLoading(false);
        }
    };

    const filteredBookings = bookings.filter(b => {
        const matchesSearch = b.studentName.toLowerCase().includes(search.toLowerCase()) || 
                             b.studentRoll.toLowerCase().includes(search.toLowerCase()) ||
                             b.roomNo.toLowerCase().includes(search.toLowerCase());
        
        const matchesStatus = !filters.status || b.bookingStatus.toLowerCase() === filters.status.toLowerCase();
        const matchesRoomType = !filters.roomType || b.roomType === filters.roomType;
        const matchesPayment = !filters.paymentStatus || b.paymentStatus === filters.paymentStatus;

        return matchesSearch && matchesStatus && matchesRoomType && matchesPayment;
    });

    const [viewingBooking, setViewingBooking] = useState(null);

    const getStatusBadge = (status) => {
        const styles = {
            'Approved': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            'Pending': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            'Rejected': 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        };
        const icon = {
            'Approved': <HiOutlineCheckCircle />,
            'Pending': <HiOutlineClock />,
            'Rejected': <HiOutlineXCircle />
        };
        return (
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles['Pending']}`}>
                {icon[status] || icon['Pending']}
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search name, roll, or room..."
                            className="pl-11 pr-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none w-[300px]"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={loadBookings}
                        className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all active:scale-95"
                    >
                        <HiOutlineArrowPath className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <select 
                        className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest outline-none"
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                    >
                        <option value="">All Statuses</option>
                        <option value="Approved">Approved</option>
                        <option value="Pending">Pending</option>
                        <option value="Rejected">Rejected</option>
                    </select>

                    <select 
                        className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-widest outline-none"
                        value={filters.roomType}
                        onChange={(e) => setFilters({...filters, roomType: e.target.value})}
                    >
                        <option value="">All Types</option>
                        <option value="Single">Single</option>
                        <option value="2-Bed">2-Bed</option>
                        <option value="3-Bed">3-Bed</option>
                        <option value="4-Bed">4-Bed</option>
                    </select>

                    <button 
                        onClick={onAllocateManually}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                    >
                        <HiOutlineUserPlus size={18} />
                        Assign Manually
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Room / Bed</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Booking Status</th>
                                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-8 py-6">
                                            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <HiOutlineFunnel size={40} className="text-slate-200" />
                                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No matching bookings found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredBookings.map((booking) => (
                                <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black text-xs uppercase">
                                                {booking.studentName.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-800 dark:text-white leading-none">{booking.studentName}</div>
                                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{booking.studentRoll}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-indigo-600 uppercase">Room {booking.roomNo}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bed {booking.bedNo}</span>
                                            </div>
                                            <div className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] mt-1">{booking.roomType} Room</div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                            booking.paymentStatus === 'success' 
                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        }`}>
                                            {booking.paymentStatus === 'success' ? 'Verified' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        {getStatusBadge(booking.bookingStatus)}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setViewingBooking(booking)}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" title="View Details"
                                            >
                                                <HiOutlineEye size={18} />
                                            </button>
                                            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" title="Edit Booking">
                                                <HiOutlinePencilSquare size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination / Footer */}
            <div className="flex justify-between items-center px-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Showing {filteredBookings.length} of {bookings.length} Bookings
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all">Prev</button>
                    <button className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-all">Next</button>
                </div>
            </div>

            {/* Detail Slide-over Modal */}
            {viewingBooking && (
                <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto">
                        <div className="p-8 space-y-10">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white uppercase">Student Details</h3>
                                <button 
                                    onClick={() => setViewingBooking(null)}
                                    className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 transition-all"
                                >
                                    <HiOutlineXCircle size={24} />
                                </button>
                            </div>

                            {/* Profile Info */}
                            <div className="flex items-center gap-6 p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem]">
                                <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black">
                                    {viewingBooking.studentName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white leading-none">{viewingBooking.studentName}</div>
                                    <div className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">{viewingBooking.studentRoll}</div>
                                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase text-indigo-500 tracking-widest">
                                        {viewingBooking.roomType} Room Preference
                                    </div>
                                </div>
                            </div>

                            {/* Booking Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Assigned Room</div>
                                    <div className="text-xl font-black text-indigo-600">Room {viewingBooking.roomNo}</div>
                                </div>
                                <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bed Position</div>
                                    <div className="text-xl font-black text-slate-800 dark:text-white">Bed {viewingBooking.bedNo}</div>
                                </div>
                            </div>

                            {/* Booking History */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">Booking History</h4>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { event: 'Payment Verified', date: '22 Apr 2024, 09:12 AM', status: 'Success' },
                                        { event: 'Room Allocated', date: '22 Apr 2024, 10:45 AM', status: 'Approved' },
                                        { event: 'Booking Requested', date: '21 Apr 2024, 11:30 PM', status: 'Pending' }
                                    ].map((log, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group hover:border-indigo-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                <div>
                                                    <div className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{log.event}</div>
                                                    <div className="text-[10px] font-medium text-slate-400 mt-0.5">{log.date}</div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-emerald-500 uppercase">{log.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                <button className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all shadow-xl shadow-slate-800/20">
                                    Print Receipt
                                </button>
                                <button className="flex-1 py-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
                                    Revoke Booking
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

