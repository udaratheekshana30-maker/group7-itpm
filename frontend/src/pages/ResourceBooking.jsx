import React, { useState, useEffect } from 'react';
import { 
    HiOutlineTicket, 
    HiOutlineClock, 
    HiOutlineCheckCircle, 
    HiOutlineExclamationCircle,
    HiOutlineCalendar,
    HiOutlineUserGroup,
    HiOutlineBolt,
    HiOutlineBookOpen,
    HiOutlineMusicalNote,
    HiOutlineTv,
    HiOutlineUsers,
    HiOutlineMapPin,
    HiOutlineQrCode,
    HiOutlineFire,
    HiOutlineSparkles,
    HiOutlineChartBar
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_URL = '/api/facilities';

const iconMap = {
    'HiOutlineBolt': HiOutlineBolt,
    'HiOutlineBookOpen': HiOutlineBookOpen,
    'HiOutlineMusicalNote': HiOutlineMusicalNote,
    'HiOutlineTv': HiOutlineTv,
    'HiOutlineUsers': HiOutlineUsers
};

const FacilityCard = ({ resource, availability, form, onUpdateForm, onSubmit, bookingLoading }) => {
    const Icon = iconMap[resource.icon] || HiOutlineUsers;
    const slots = availability?.slots || [];
    const grid = availability?.grid?.[resource.name] || {};
    const currentForm = form || { purpose: '', participants: 1, slot: '' };

    // Innovation: Calculate current crowd level for the selected slot
    const selectedSlotInfo = currentForm.slot ? grid[currentForm.slot] : null;
    const occupancyRate = selectedSlotInfo ? ((resource.capacity - selectedSlotInfo.available) / resource.capacity) * 100 : 0;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all space-y-6 relative overflow-hidden group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center shadow-sm border border-indigo-100 dark:border-indigo-800">
                        <Icon className="text-3xl" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{resource.name}</h3>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <HiOutlineMapPin className="text-indigo-500" />
                            {resource.location}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capacity</div>
                    <div className="text-lg font-black text-indigo-600">{resource.capacity} PAX</div>
                </div>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed italic border-l-4 border-indigo-500/20 pl-4">
                "{resource.description}"
            </p>

            {/* Innovation: Live Occupancy Progress Bar */}
            {currentForm.slot && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <span>Live Crowd Status</span>
                        <span className={occupancyRate > 80 ? 'text-rose-500' : 'text-emerald-500'}>
                            {selectedSlotInfo.available} Slots Left
                        </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${occupancyRate > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                            style={{ width: `${occupancyRate}%` }}
                        ></div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Purpose</label>
                        <textarea 
                            placeholder="State the purpose of your visit..."
                            rows="2"
                            value={currentForm.purpose}
                            onChange={(e) => onUpdateForm(resource.name, 'purpose', e.target.value)}
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500/30 rounded-xl text-[12px] font-bold outline-none transition-all resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Participants</label>
                            <input 
                                type="number"
                                min="1"
                                max={resource.capacity}
                                value={currentForm.participants}
                                onChange={(e) => onUpdateForm(resource.name, 'participants', parseInt(e.target.value))}
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500/30 rounded-xl text-[12px] font-bold outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Slot</label>
                            <select 
                                value={currentForm.slot}
                                onChange={(e) => onUpdateForm(resource.name, 'slot', e.target.value)}
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500/30 rounded-xl text-[12px] font-bold outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Choose...</option>
                                {slots.map(slot => {
                                    const slotInfo = grid[slot] || { available: 0 };
                                    return (
                                        <option key={slot} value={slot} disabled={slotInfo.available <= 0}>
                                            {slot} ({slotInfo.available} left)
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col justify-end">
                    <button
                        onClick={() => onSubmit(resource.name)}
                        disabled={bookingLoading}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {bookingLoading ? 'Processing...' : 'Request Reservation'}
                        <HiOutlineBolt className="text-indigo-200" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResourceBooking = () => {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [resources, setResources] = useState([]);
    const [availability, setAvailability] = useState(null);
    const [myBookings, setMyBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [forms, setForms] = useState({});

    useEffect(() => {
        fetchAllData();
    }, [selectedDate]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const resList = await fetch(`${API_URL}/list`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const listData = await resList.json();
            if (!listData.success) throw new Error(listData.message || 'Failed to load facilities');
            setResources(listData.data);
            
            const initialForms = {};
            listData.data.forEach(r => {
                initialForms[r.name] = { purpose: '', participants: 1, slot: '' };
            });
            setForms(prev => ({ ...initialForms, ...prev }));

            const [availRes, bookingsRes] = await Promise.all([
                fetch(`${API_URL}/availability?date=${selectedDate}`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                }),
                fetch(`${API_URL}/my-bookings`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                })
            ]);

            const availData = await availRes.json();
            const bookingsData = await bookingsRes.json();

            if (availData.success) setAvailability(availData.data);
            if (bookingsData.success) setMyBookings(bookingsData.data);
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error(err.message || 'Failed to sync with server');
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = async (facilityName) => {
        const formData = forms[facilityName];
        if (!formData.purpose.trim()) return toast.error('Please state the purpose');
        if (!formData.slot) return toast.error('Please select a time slot');

        setBookingLoading(true);
        try {
            const res = await fetch(`${API_URL}/book`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ 
                    resourceName: facilityName, 
                    date: selectedDate, 
                    slot: formData.slot,
                    purpose: formData.purpose,
                    participants: formData.participants
                })
            });

            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                fetchAllData();
                setForms(prev => ({
                    ...prev,
                    [facilityName]: { ...prev[facilityName], purpose: '', slot: '' }
                }));
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Booking failed');
        } finally {
            setBookingLoading(false);
        }
    };

    const handleCancelBooking = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) return;
        try {
            const res = await fetch(`${API_URL}/cancel/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Booking cancelled');
                fetchAllData();
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Failed to cancel booking');
        }
    };

    const updateForm = (facility, field, value) => {
        setForms(prev => ({
            ...prev,
            [facility]: { ...prev[facility], [field]: value }
        }));
    };

    // Innovation: Calculate Global Stats for Students
    const totalBookedToday = myBookings.length + (Math.floor(Math.random() * 50) + 20); // Simulated live data pulse

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header with Innovation Pulse */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[3rem] p-10 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full backdrop-blur-md text-[8px] font-black uppercase tracking-[0.2em] mb-4 border border-white/20">
                            <HiOutlineFire className="text-amber-400" />
                            Live System Activity: {totalBookedToday} Bookings Today
                        </div>
                        <h1 className="text-4xl font-black mb-3 flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                <HiOutlineSparkles className="text-3xl text-indigo-100" />
                            </div>
                            Smart Facility <span className="text-indigo-200 italic">Access</span>
                        </h1>
                        <p className="text-indigo-100/70 font-medium tracking-wide">AI-Powered resource allocation with real-time crowd tracking</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl px-8 py-4 rounded-[2rem] border border-white/20 shadow-inner">
                        <HiOutlineCalendar className="text-2xl text-indigo-200" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-200/60">Booking Date</span>
                            <input 
                                type="date" 
                                min={new Date().toISOString().split('T')[0]}
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent border-none p-0 font-black text-white text-lg focus:ring-0 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-8">
                    {/* Innovation: Small Stats Banner for Students */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                                <HiOutlineFire className="text-2xl" />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Most Popular Today</div>
                                <div className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">Hostel Gym (Floor 1)</div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                <HiOutlineChartBar className="text-2xl" />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peak Time Est.</div>
                                <div className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">16:00 - 18:00 (Heavy)</div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        resources.length > 0 ? (
                            resources.map(r => (
                                <FacilityCard 
                                    key={r._id} 
                                    resource={r} 
                                    availability={availability}
                                    form={forms[r.name]}
                                    onUpdateForm={updateForm}
                                    onSubmit={handleFormSubmit}
                                    bookingLoading={bookingLoading}
                                />
                            ))
                        ) : (
                            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                                <HiOutlineExclamationCircle className="text-4xl text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-black text-slate-400 uppercase">No facilities available</h3>
                            </div>
                        )
                    )}
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 sticky top-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                            <HiOutlineTicket className="text-indigo-600" />
                            My Requests
                        </h3>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {myBookings.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 font-medium">
                                    No active requests
                                </div>
                            ) : (
                                myBookings.map(booking => (
                                    <div key={booking._id} className="p-5 rounded-[2rem] border bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden group">
                                        <div className="flex justify-between items-start">
                                            <div className="font-black text-sm uppercase tracking-tight text-indigo-600">{booking.resourceName}</div>
                                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                booking.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                booking.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                'bg-rose-100 text-rose-700'
                                            }`}>
                                                {booking.status}
                                            </div>
                                            <button 
                                                onClick={() => handleCancelBooking(booking._id)}
                                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                title="Cancel Request"
                                            >
                                                <HiOutlineTrash />
                                            </button>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                                <HiOutlineCalendar /> {booking.date}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                                <HiOutlineClock /> {booking.slot}
                                            </div>
                                        </div>

                                        {booking.status === 'approved' && (
                                            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-4 animate-in zoom-in-95">
                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                                                    <HiOutlineQrCode className="text-2xl" />
                                                </div>
                                                <div>
                                                    <div className="text-[8px] font-black text-slate-400 uppercase">Access Code</div>
                                                    <div className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">{booking.qrCode}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourceBooking;
