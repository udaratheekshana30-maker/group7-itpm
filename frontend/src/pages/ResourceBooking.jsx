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
    HiOutlineUsers
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';

import toast from 'react-hot-toast';

const API_URL = '/api/resources';

const iconMap = {
    'Gym': HiOutlineBolt,
    'Study Area': HiOutlineBookOpen,
    'Music Room': HiOutlineMusicalNote,
    'TV Lounge': HiOutlineTv
};

const ResourceBooking = () => {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [availability, setAvailability] = useState(null);
    const [myBookings, setMyBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [myWaitlist, setMyWaitlist] = useState([]);
    const [waitlistLoading, setWaitlistLoading] = useState(false);

    const [forms, setForms] = useState({
        'Gym': { purpose: '', participants: 1 },
        'Study Area': { purpose: '', participants: 1 },
        'Music Room': { purpose: '', participants: 1 },
        'TV Lounge': { purpose: '', participants: 1 }
    });


    useEffect(() => {
        fetchData();
        fetchWaitlist();
    }, [selectedDate]);
    const fetchWaitlist = async () => {
        try {
            const res = await fetch(`${API_URL}/my-waitlist`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) setMyWaitlist(data.data);
        } catch (err) {
            // ignore
        }
    };

    const handleJoinWaitlist = async (resourceName, slot) => {
        if (!window.confirm(`Slot is full. Join the waitlist for ${resourceName} at ${slot}?`)) return;
        setWaitlistLoading(true);
        try {
            const res = await fetch(`${API_URL}/waitlist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ resourceName, date: selectedDate, slot })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Added to waitlist!');
                fetchWaitlist();
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Failed to join waitlist');
        } finally {
            setWaitlistLoading(false);
        }
    };

    const handleRemoveWaitlist = async (waitlistId) => {
        if (!window.confirm('Remove from waitlist?')) return;
        setWaitlistLoading(true);
        try {
            const res = await fetch(`${API_URL}/waitlist/${waitlistId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Removed from waitlist');
                fetchWaitlist();
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Failed to remove from waitlist');
        } finally {
            setWaitlistLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
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
            toast.error('Failed to fetch resource data');
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async (resourceName, slot, extraData = {}) => {
        if (!window.confirm(`Confirm booking for ${resourceName} at ${slot}?`)) return;

        setBookingLoading(true);
        try {
            const res = await fetch(`${API_URL}/book`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ 
                    resourceName, 
                    date: selectedDate, 
                    slot,
                    ...extraData 
                })
            });

            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                fetchData();
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Booking failed');
        } finally {
            setBookingLoading(false);
        }
    };

    const handleCancel = async (bookingId) => {
        if (!window.confirm('Cancel this booking?')) return;

        try {
            const res = await fetch(`${API_URL}/cancel/${bookingId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                fetchData();
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Cancellation failed');
        }
    };

    const updateForm = (facility, field, value) => {
        setForms(prev => ({
            ...prev,
            [facility]: { ...prev[facility], [field]: value }
        }));
    };

    const handleFormSubmit = async (facility) => {
        const formData = forms[facility];
        if (!formData.purpose.trim()) {
            toast.error(`Please state the purpose for booking the ${facility}`);
            return;
        }
        if (!formData.slot) {
            toast.error(`Please select a time slot for the ${facility}`);
            return;
        }
        
        await handleBook(facility, formData.slot, {
            purpose: formData.purpose,
            participants: formData.participants
        });
        
        // Reset form on success
        updateForm(facility, 'purpose', '');
        updateForm(facility, 'participants', 1);
        updateForm(facility, 'slot', '');
    };

    const FacilityForm = ({ facility }) => {
        const Icon = iconMap[facility] || HiOutlineUsers;
        const slots = availability?.slots || [];
        const grid = availability?.grid?.[facility] || {};

        return (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-8 relative overflow-hidden group">
                {/* Subtle background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
                
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 text-emerald-600 flex items-center justify-center shadow-sm border border-emerald-100/50 dark:border-emerald-800/50">
                            <Icon className="text-3xl" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{facility}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">Reservation Form</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                Purpose of Visit
                            </label>
                            <input 
                                type="text"
                                placeholder="e.g. Daily Workout / Group Study"
                                value={forms[facility].purpose}
                                onChange={(e) => updateForm(facility, 'purpose', e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-emerald-500/30 rounded-[1.5rem] text-[13px] font-bold focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    Participants
                                </label>
                                <div className="relative">
                                    <HiOutlineUsers className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={forms[facility].participants}
                                        onChange={(e) => updateForm(facility, 'participants', parseInt(e.target.value))}
                                        className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-emerald-500/30 rounded-[1.5rem] text-[13px] font-bold focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    Select Slot
                                </label>
                                <div className="relative">
                                    <HiOutlineClock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <select 
                                        value={forms[facility].slot}
                                        onChange={(e) => updateForm(facility, 'slot', e.target.value)}
                                        className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-emerald-500/30 rounded-[1.5rem] text-[13px] font-bold focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Choose a time...</option>
                                        {slots.map(slot => {
                                            const slotInfo = grid[slot] || { available: 0, bookedCount: 0, capacity: 5 };
                                            const isFull = slotInfo.available <= 0;
                                            return (
                                                <option 
                                                    key={slot} 
                                                    value={slot} 
                                                    disabled={isFull && !slotInfo.myBooking}
                                                    className="font-bold py-2"
                                                >
                                                    {slot} {isFull ? '(FULL - Join Waitlist)' : `(${slotInfo.available} left)`}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-end gap-4">
                        <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-100/50 dark:border-emerald-800/50">
                            <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <HiOutlineCheckCircle />
                                Reservation Benefits
                            </h4>
                            <ul className="space-y-2">
                                {[
                                    'Guaranteed entry for selected slot',
                                    'Clean and sanitized equipment',
                                    'Priority support during your stay'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button
                            onClick={() => handleFormSubmit(facility)}
                            disabled={bookingLoading}
                            className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group/btn disabled:opacity-50 disabled:scale-100"
                        >
                            {bookingLoading ? 'Processing...' : 'Confirm Reservation'}
                            <HiOutlineBolt className="text-emerald-200 group-hover/btn:animate-pulse" />
                        </button>
                        {/* Waitlist button for full slots */}
                        {forms[facility].slot && (availability?.grid?.[facility]?.[forms[facility].slot]?.available <= 0) && (
                            <button
                                onClick={() => handleJoinWaitlist(facility, forms[facility].slot)}
                                disabled={waitlistLoading}
                                className="w-full py-3 mt-2 bg-amber-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-amber-600 shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group/btn disabled:opacity-50 disabled:scale-100"
                            >
                                {waitlistLoading ? 'Processing...' : 'Join Waitlist'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (loading && !availability) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[3rem] p-10 text-white shadow-2xl shadow-emerald-600/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl animate-pulse"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl font-black mb-3 flex items-center justify-center md:justify-start gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                <HiOutlineUserGroup className="text-3xl text-emerald-100" />
                            </div>
                            Facility <span className="text-emerald-200 italic">Booking</span>
                        </h1>
                        <p className="text-emerald-100/70 font-medium tracking-wide">Select a facility and fill out the reservation form</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xl px-8 py-4 rounded-[2rem] border border-white/20 shadow-inner">
                        <HiOutlineCalendar className="text-2xl text-emerald-200" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200/60">Booking Date</span>
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
                {/* Forms Section */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 gap-8">
                        <FacilityForm facility="Gym" />
                        <FacilityForm facility="Study Area" />
                        <FacilityForm facility="Music Room" />
                        <FacilityForm facility="TV Lounge" />
                    </div>
                </div>

                {/* My Bookings & Waitlist Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 sticky top-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                            <HiOutlineTicket className="text-emerald-600" />
                            My Reservations
                        </h3>
                                                {/* Waitlist Section */}
                                                <div className="mt-8">
                                                    <h4 className="font-black text-amber-500 text-[10px] mb-4 uppercase tracking-widest flex items-center gap-2">
                                                        <HiOutlineClock /> Waitlist
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {myWaitlist.length === 0 ? (
                                                            <div className="text-slate-400 text-xs">No waitlist entries</div>
                                                        ) : (
                                                            myWaitlist.map(w => (
                                                                <div key={w._id} className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2 text-xs font-bold">
                                                                    <span>{w.resourceName} | {w.date} | {w.slot}</span>
                                                                    <button
                                                                        onClick={() => handleRemoveWaitlist(w._id)}
                                                                        disabled={waitlistLoading}
                                                                        className="text-amber-600 hover:text-amber-900 text-[10px] font-black ml-2"
                                                                    >Remove</button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {myBookings.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 font-medium">
                                    <HiOutlineExclamationCircle className="mx-auto text-4xl mb-2 opacity-20" />
                                    No active bookings
                                </div>
                            ) : (
                                myBookings.map(booking => {
                                    const Icon = iconMap[booking.resourceName] || HiOutlineUsers;
                                    return (
                                        <div key={booking._id} className={`p-4 rounded-2xl border transition-all ${booking.status === 'cancelled' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 shadow-sm'}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                                                        <Icon />
                                                    </div>
                                                    <div className="text-xs font-black uppercase tracking-tight text-slate-700 dark:text-slate-200">{booking.resourceName}</div>
                                                </div>
                                                <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                                                    booking.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                    booking.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {booking.status}
                                                </div>
                                            </div>
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-bold">
                                                    <HiOutlineCalendar className="text-emerald-500" />
                                                    {booking.date}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-bold">
                                                    <HiOutlineClock className="text-emerald-500" />
                                                    {booking.slot}
                                                </div>
                                            </div>
                                            {booking.status === 'booked' && (
                                                <button 
                                                    onClick={() => handleCancel(booking._id)}
                                                    className="w-full py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        
                        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="font-black text-slate-400 text-[10px] mb-4 uppercase tracking-widest">Guidelines</h4>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                                    <HiOutlineCheckCircle className="mt-0.5 text-emerald-500 shrink-0" />
                                    Maximum booking duration is 2 hours per slot.
                                </li>
                                <li className="flex items-start gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                                    <HiOutlineCheckCircle className="mt-0.5 text-emerald-500 shrink-0" />
                                    Please cancel at least 1 hour in advance.
                                </li>
                                <li className="flex items-start gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                                    <HiOutlineCheckCircle className="mt-0.5 text-emerald-500 shrink-0" />
                                    Maintain cleanliness and follow facility rules.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourceBooking;
