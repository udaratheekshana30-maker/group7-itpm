import React, { useState, useEffect } from 'react';
import { 
    HiOutlineBolt, 
    HiOutlineClock, 
    HiOutlineCheckCircle, 
    HiOutlineCalendar,
    HiOutlineUser,
    HiOutlineHeart,
    HiOutlineFire,
    HiOutlineArrowLeft
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_URL = '/api/resources';

const GymBooking = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [availability, setAvailability] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);

    const [form, setForm] = useState({
        purpose: '',
        workoutType: 'General',
        specialRequirements: '',
        slot: ''
    });

    useEffect(() => {
        fetchAvailability();
    }, [selectedDate]);

    const fetchAvailability = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/availability?date=${selectedDate}`, {
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            const data = await res.json();
            if (data.success) setAvailability(data.data);
        } catch (err) {
            toast.error('Failed to fetch availability');
        } finally {
            setLoading(false);
        }
    };

    const handleBook = async (e) => {
        e.preventDefault();
        if (!form.purpose.trim()) return toast.error('Please state your purpose');
        if (!form.slot) return toast.error('Please select a time slot');

        setBookingLoading(true);
        try {
            const res = await fetch(`${API_URL}/book`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ 
                    resourceName: 'Gym', 
                    date: selectedDate, 
                    slot: form.slot,
                    purpose: `${form.workoutType}: ${form.purpose}`,
                    specialRequirements: form.specialRequirements
                })
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Gym session booked successfully!');
                navigate('/student/resources');
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Booking failed');
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading && !availability) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    const slots = availability?.slots || [];
    const gymGrid = availability?.grid?.['Gym'] || {};

    return (
        <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors"
                >
                    <HiOutlineArrowLeft />
                    Back
                </button>
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                    <HiOutlineCalendar className="text-orange-500" />
                    <input 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none p-0 font-black text-slate-700 text-sm focus:ring-0 cursor-pointer"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Hero section */}
                <div className="lg:col-span-5 relative h-[300px] lg:h-auto rounded-[3rem] overflow-hidden group shadow-2xl shadow-orange-500/20">
                    <img 
                        src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop" 
                        alt="Gym" 
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-10 flex flex-col justify-end">
                        <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-orange-500/50 animate-pulse">
                            <HiOutlineBolt className="text-4xl" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight uppercase italic leading-none mb-2">Power Up Your <br /> Session</h1>
                        <p className="text-orange-200/80 font-bold text-xs uppercase tracking-widest">Premium Hostel Fitness Center</p>
                    </div>
                </div>

                {/* Form section */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[3rem] p-8 sm:p-12 border border-slate-100 dark:border-slate-800 shadow-sm space-y-10">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Gym Reservation</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Fuel your ambition</p>
                    </div>

                    <form onSubmit={handleBook} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Workout Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Cardio', 'Strength', 'Yoga', 'HIIT'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setForm({...form, workoutType: type})}
                                            className={`py-3 rounded-xl text-[11px] font-black uppercase transition-all border-2 ${form.workoutType === type ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time Slot</label>
                                <div className="relative">
                                    <HiOutlineClock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <select 
                                        value={form.slot}
                                        onChange={(e) => setForm({...form, slot: e.target.value})}
                                        className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-orange-500/30 rounded-2xl text-sm font-bold appearance-none cursor-pointer outline-none transition-all"
                                    >
                                        <option value="">Choose time...</option>
                                        {slots.map(slot => {
                                            const info = gymGrid[slot] || { available: 0 };
                                            return (
                                                <option key={slot} value={slot} disabled={info.available <= 0}>
                                                    {slot} {info.available <= 0 ? '(FULL)' : `(${info.available} left)`}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Workout Purpose</label>
                            <input 
                                type="text"
                                placeholder="e.g. Legs Day / 5km Run"
                                value={form.purpose}
                                onChange={(e) => setForm({...form, purpose: e.target.value})}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-orange-500/30 rounded-2xl text-sm font-bold outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Special Requirements (Optional)</label>
                            <textarea 
                                placeholder="e.g. Need assistance with bench press"
                                value={form.specialRequirements}
                                onChange={(e) => setForm({...form, specialRequirements: e.target.value})}
                                rows="3"
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-orange-500/30 rounded-2xl text-sm font-bold outline-none transition-all resize-none"
                            />
                        </div>

                        <div className="pt-4 flex flex-col sm:flex-row items-center gap-6">
                            <div className="flex -space-x-3 overflow-hidden">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center">
                                        <HiOutlineUser className="text-slate-400 text-sm" />
                                    </div>
                                ))}
                                <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white bg-orange-100 text-[10px] font-bold text-orange-600">
                                    +12
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Join 12 others today</p>
                        </div>

                        <button
                            type="submit"
                            disabled={bookingLoading}
                            className="w-full py-5 bg-orange-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-orange-600 shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {bookingLoading ? 'Processing...' : 'Confirm Gym Session'}
                            <HiOutlineCheckCircle className="text-orange-200" />
                        </button>
                    </form>

                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                                <HiOutlineHeart />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-slate-800">Safe Environment</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Sanitized Daily</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                                <HiOutlineFire />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-slate-800">Expert Support</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Warden Assistance</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GymBooking;
