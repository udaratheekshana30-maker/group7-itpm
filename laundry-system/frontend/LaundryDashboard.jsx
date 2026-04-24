import React, { useState, useEffect } from 'react';
import { 
    HiOutlineTicket, 
    HiOutlineClock, 
    HiOutlineCheckCircle, 
    HiOutlineXCircle,
    HiOutlineExclamationCircle,
    HiOutlineCalendar,
    HiOutlineCircleStack,
    HiOutlineArrowLeft
} from 'react-icons/hi2';
import { GiWashingMachine } from 'react-icons/gi';
import { MdOutlineLocalLaundryService } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = '/api/laundry';

const LaundryDashboard = () => {
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [availability, setAvailability] = useState(null);
    const [myBookings, setMyBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentBooking, setPaymentBooking] = useState(null);
    const [selectedSlotData, setSelectedSlotData] = useState(null); // { machineId, machineType, slot }
    const [editingBooking, setEditingBooking] = useState(null);
    const [formData, setFormData] = useState({
        phoneNumber: '',
        department: '',
        studentYear: '',
        notes: ''
    });

    const stats = {
        totalOrders: myBookings.length,
        totalSpent: myBookings.filter(b => b.paymentStatus === 'paid').reduce((sum, b) => sum + b.price, 0),
        preferredMachine: (() => {
            const counts = myBookings.reduce((acc, b) => {
                acc[b.machineType] = (acc[b.machineType] || 0) + 1;
                return acc;
            }, {});
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
        })()
    };

    const hasActiveBooking = myBookings.some(b => b.status === 'booked' || b.status === 'in-progress');

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

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
            toast.error('Failed to fetch laundry data');
        } finally {
            setLoading(false);
        }
    };

    const openBookingModal = (machineId, machineType, slot) => {
        setSelectedSlotData({ machineId, machineType, slot });
        setEditingBooking(null);
        setFormData({
            phoneNumber: user.phoneNumber || '',
            department: '',
            studentYear: '',
            notes: ''
        });
        setShowModal(true);
    };

    const openEditModal = (booking) => {
        setEditingBooking(booking);
        setSelectedSlotData({ 
            machineId: booking.machineId, 
            machineType: booking.machineType, 
            slot: booking.slot 
        });
        setFormData({
            phoneNumber: booking.phoneNumber || '',
            department: booking.department || '',
            studentYear: booking.studentYear || '',
            notes: booking.notes || ''
        });
        setShowModal(true);
    };

    const handleSubmitBooking = async (e) => {
        e.preventDefault();
        setBookingLoading(true);
        try {
            const url = editingBooking 
                ? `${API_URL}/update/${editingBooking._id}`
                : `${API_URL}/book`;
            
            const method = editingBooking ? 'PATCH' : 'POST';
            
            const body = editingBooking 
                ? { ...formData }
                : { ...selectedSlotData, date: selectedDate, ...formData };

            const res = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                setShowModal(false);
                fetchData();
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error(editingBooking ? 'Update failed' : 'Booking failed');
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

    const handleMarkAsDone = async (bookingId) => {
        if (!window.confirm('Are you done with your laundry?')) return;

        try {
            const res = await fetch(`${API_URL}/done/${bookingId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });

            const data = await res.json();
            if (data.success) {
                toast.success(data.message);
                setPaymentBooking(data.data);
                setShowPaymentModal(true);
                fetchData();
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error('Operation failed');
        }
    };

    const handleConfirmPayment = async () => {
        if (!paymentBooking) return;
        
        try {
            const res = await fetch(`${API_URL}/payment/${paymentBooking._id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Payment confirmed! Thank you.');
                setShowPaymentModal(false);
                fetchData();
            }
        } catch (err) {
            toast.error('Payment confirmation failed');
        }
    };

    const BookingTimer = ({ slot, date, status }) => {
        const [timeLeft, setTimeLeft] = useState('');

        useEffect(() => {
            if (status !== 'booked' && status !== 'in-progress') return;

            const updateTimer = () => {
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                if (date !== todayStr) {
                    setTimeLeft('');
                    return;
                }

                const endTimeStr = slot.split(' - ')[1];
                const [endH, endM] = endTimeStr.split(':').map(Number);
                const endDate = new Date();
                endDate.setHours(endH, endM, 0, 0);

                const diff = endDate - now;
                if (diff <= 0) {
                    setTimeLeft('Expired');
                    return;
                }

                const mins = Math.floor(diff / 1000 / 60);
                const secs = Math.floor((diff / 1000) % 60);
                setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
            };

            updateTimer();
            const interval = setInterval(updateTimer, 1000);
            return () => clearInterval(interval);
        }, [slot, date, status]);

        if (!timeLeft || status === 'completed' || status === 'cancelled') return null;

        return (
            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black animate-pulse">
                <HiOutlineClock className="text-sm" />
                Time Remaining: {timeLeft}
            </div>
        );
    };

    if (!availability) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                {loading === false && (
                    <p className="text-slate-500 font-medium animate-pulse">Loading dashboard data...</p>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <button 
                                onClick={() => window.history.back()}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all active:scale-90 border border-white/10"
                                title="Go Back"
                            >
                                <HiOutlineArrowLeft className="text-xl" />
                            </button>
                            <h1 className="text-3xl font-black flex items-center gap-3">
                                <MdOutlineLocalLaundryService className="text-4xl text-indigo-200" />
                                Laundry Dashboard
                            </h1>
                        </div>
                        <p className="text-indigo-100/80 font-medium">Book your slot and keep track of your laundry</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
                            <GiWashingMachine className="text-xl text-indigo-200" />
                            <div>
                                <p className="text-[10px] uppercase font-bold text-indigo-200 leading-none">Washers</p>
                                <p className="text-sm font-black leading-tight">{availability?.washerCount || 0} Working</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
                            <MdOutlineLocalLaundryService className="text-xl text-indigo-200" />
                            <div>
                                <p className="text-[10px] uppercase font-bold text-indigo-200 leading-none">Dryers</p>
                                <p className="text-sm font-black leading-tight">{availability?.dryerCount || 0} Working</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
                            <HiOutlineCircleStack className="text-xl text-amber-400" />
                            <div>
                                <p className="text-[10px] uppercase font-bold text-indigo-200 leading-none">Price</p>
                                <p className="text-sm font-black leading-tight">LKR 250</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <HiOutlineTicket className="text-2xl" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Total Orders</h4>
                    </div>
                    <div className="text-4xl font-black text-slate-800 dark:text-white">{stats.totalOrders}</div>
                    <p className="text-[10px] text-slate-400 font-medium mt-2">Overall laundry reservations</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <HiOutlineCircleStack className="text-2xl" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Total Spent</h4>
                    </div>
                    <div className="text-4xl font-black text-slate-800 dark:text-white">LKR {stats.totalSpent}</div>
                    <p className="text-[10px] text-slate-400 font-medium mt-2">Cumulative money spent on laundry</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <MdOutlineLocalLaundryService className="text-2xl" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Preferred Mode</h4>
                    </div>
                    <div className="text-4xl font-black text-slate-800 dark:text-white truncate">{stats.preferredMachine}</div>
                    <p className="text-[10px] text-slate-400 font-medium mt-2">Your most frequently used machine type</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Booking Controls */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <HiOutlineCalendar className="text-2xl text-indigo-600" />
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Schedule</h2>
                        </div>
                        <input 
                            type="date" 
                            min={new Date().toISOString().split('T')[0]}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Washers Grid */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <GiWashingMachine className="text-2xl text-blue-500" />
                            Washing Machines
                        </h3>
                        <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                        <th className="px-4 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Time Slot</th>
                                        {[...Array(availability?.washerCount || 0)].map((_, i) => (
                                            <th key={i} className="px-4 py-4 text-center font-black uppercase tracking-wider text-slate-500 text-[10px]">Washer {i+1}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {availability?.slots.map(slot => (
                                        <tr key={slot} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">{slot}</td>
                                            {[...Array(availability?.washerCount || 0)].map((_, i) => {
                                                const machineId = i + 1;
                                                const booking = availability?.washerGrid?.[machineId]?.[slot];
                                                const isMine = booking?.student?._id === user._id;

                                                return (
                                                    <td key={machineId} className="px-2 py-2 text-center">
                                                        {booking ? (
                                                            <div className={`py-1.5 px-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 ${isMine ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-500 opacity-50 cursor-not-allowed'}`}>
                                                                {isMine ? 'Your Slot' : 'Booked'}
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => openBookingModal(machineId, 'Washing Machine', slot)}
                                                                disabled={bookingLoading || hasActiveBooking}
                                                                className={`w-full py-1.5 px-3 rounded-xl text-[10px] font-black uppercase transition-all ${hasActiveBooking ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white'}`}
                                                            >
                                                                {hasActiveBooking ? 'Limit Reached' : 'Book'}
                                                            </button>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Dryers Grid */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <MdOutlineLocalLaundryService className="text-2xl text-amber-500" />
                            Dryer Machines
                        </h3>
                        <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                        <th className="px-4 py-4 text-left font-black uppercase tracking-wider text-slate-500 text-[10px]">Time Slot</th>
                                        {[...Array(availability?.dryerCount || 0)].map((_, i) => (
                                            <th key={i} className="px-4 py-4 text-center font-black uppercase tracking-wider text-slate-500 text-[10px]">Dryer {i+1}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {availability?.slots.map(slot => (
                                        <tr key={slot} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">{slot}</td>
                                            {[...Array(availability?.dryerCount || 0)].map((_, i) => {
                                                const machineId = i + 1;
                                                const booking = availability?.dryerGrid?.[machineId]?.[slot];
                                                const isMine = booking?.student?._id === user._id;

                                                return (
                                                    <td key={machineId} className="px-2 py-2 text-center">
                                                        {booking ? (
                                                            <div className={`py-1.5 px-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 ${isMine ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-slate-100 text-slate-500 opacity-50 cursor-not-allowed'}`}>
                                                                {isMine ? 'Your Slot' : 'Booked'}
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => openBookingModal(machineId, 'Dryer', slot)}
                                                                disabled={bookingLoading || hasActiveBooking}
                                                                className={`w-full py-1.5 px-3 rounded-xl text-[10px] font-black uppercase transition-all ${hasActiveBooking ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-violet-50 hover:bg-violet-600 text-violet-600 hover:text-white'}`}
                                                            >
                                                                {hasActiveBooking ? 'Limit Reached' : 'Book'}
                                                            </button>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Side Panel: My Bookings */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                            <HiOutlineTicket className="text-indigo-600" />
                            My Bookings
                        </h3>
                        <div className="space-y-4">
                            {myBookings.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 font-medium">
                                    <HiOutlineExclamationCircle className="mx-auto text-4xl mb-2 opacity-20" />
                                    No active bookings
                                </div>
                            ) : (
                                myBookings.map(booking => (
                                    <div key={booking._id} className={`p-4 rounded-2xl border transition-all ${booking.status === 'cancelled' ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase">
                                                {booking.machineType} #{booking.machineId}
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
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-bold">
                                                <HiOutlineCalendar className="text-indigo-500" />
                                                {booking.date}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-bold">
                                                <HiOutlineClock className="text-indigo-500" />
                                                {booking.slot}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-bold">
                                                <HiOutlineCircleStack className="text-amber-500" />
                                                LKR {booking.price}
                                            </div>
                                        </div>
                                        {booking.status === 'booked' && (
                                            <div className="space-y-2">
                                                <BookingTimer slot={booking.slot} date={booking.date} status={booking.status} />
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleMarkAsDone(booking._id)}
                                                        className="flex-2 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20"
                                                    >
                                                        Done
                                                    </button>
                                                    <button 
                                                        onClick={() => openEditModal(booking)}
                                                        className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button 
                                                        onClick={() => handleCancel(booking._id)}
                                                        className="flex-1 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all"
                                                    >
                                                        X
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-800">
                        <h4 className="font-black text-indigo-900 dark:text-indigo-100 text-sm mb-4 uppercase tracking-wider">Laundry Rules</h4>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 leading-relaxed">
                                <HiOutlineCheckCircle className="mt-0.5 flex-shrink-0" />
                                Please arrive on time for your allocated slot.
                            </li>
                            <li className="flex items-start gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 leading-relaxed">
                                <HiOutlineCheckCircle className="mt-0.5 flex-shrink-0" />
                                Collect your items immediately after the cycle ends.
                            </li>
                            <li className="flex items-start gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 leading-relaxed">
                                <HiOutlineCheckCircle className="mt-0.5 flex-shrink-0" />
                                Cancellation must be done at least 1 hour before the slot.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowModal(false)} />

                    <div className="relative w-full max-w-[600px] bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500 border border-white/20 dark:border-white/5">
                        <div className="p-10 sm:p-14">
                            <div className="mb-10">
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {editingBooking ? 'Update Booking' : 'Complete Booking'}
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">
                                    {selectedSlotData?.machineType} #{selectedSlotData?.machineId} • {selectedSlotData?.slot}
                                </p>
                            </div>

                            <form onSubmit={handleSubmitBooking} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Phone Number</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="0712345678"
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-400 outline-none transition-all"
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Department</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="IT / Engineering"
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-400 outline-none transition-all"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Academic Year</label>
                                    <select 
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-400 outline-none transition-all appearance-none"
                                        value={formData.studentYear}
                                        onChange={(e) => setFormData({ ...formData, studentYear: e.target.value })}
                                    >
                                        <option value="">Select Year</option>
                                        <option value="1st Year">1st Year</option>
                                        <option value="2nd Year">2nd Year</option>
                                        <option value="3rd Year">3rd Year</option>
                                        <option value="4th Year">4th Year</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Additional Notes (Optional)</label>
                                    <textarea 
                                        rows={3}
                                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/20 focus:border-indigo-400 outline-none transition-all resize-none"
                                        placeholder="Any specific instructions..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    />
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={bookingLoading}
                                        className="flex-2 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
                                    >
                                        {bookingLoading ? 'Processing...' : (editingBooking ? 'Save Changes' : 'Confirm & Book')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment QR Modal */}
            {showPaymentModal && paymentBooking && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 sm:p-12 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />

                    <div className="relative w-full max-w-[450px] bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500 border border-white/20 dark:border-white/5">
                        <div className="p-10 text-center">
                            <div className="mb-8">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <HiOutlineCheckCircle className="text-4xl text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    Complete Payment
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">
                                    Scan the QR code below to pay via your banking app
                                </p>
                            </div>

                            <div className="bg-white p-6 rounded-[2.5rem] shadow-inner mb-8 inline-block border-8 border-slate-50">
                                <QRCodeSVG 
                                    value={`DormDesk-Payment:${paymentBooking._id}:${paymentBooking.price}`} 
                                    size={200}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-8 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount Due</span>
                                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">LKR {paymentBooking.price}.00</span>
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setShowPaymentModal(false)}
                                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Pay Later
                                    </button>
                                    <button 
                                        onClick={handleConfirmPayment}
                                        className="flex-2 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30 transition-all"
                                    >
                                        I've Scanned & Paid
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed History Table */}
            <div className="mt-12 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">Laundry History</h3>
                    <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        Last 10 Activities
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                                <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-slate-400 text-[10px]">Reference</th>
                                <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-slate-400 text-[10px]">Machine</th>
                                <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-slate-400 text-[10px]">Date/Time</th>
                                <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-slate-400 text-[10px]">Payment</th>
                                <th className="px-8 py-5 text-left font-black uppercase tracking-widest text-slate-400 text-[10px]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {myBookings.slice(0, 10).map(booking => (
                                <tr key={booking._id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-8 py-4">
                                        <div className="font-mono text-[10px] text-slate-400 uppercase">#{booking._id.slice(-6)}</div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="font-black text-slate-800 dark:text-slate-200">{booking.machineType}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">ID: {booking.machineId}</div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="font-black text-slate-800 dark:text-slate-200">{booking.date}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">{booking.slot}</div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                            booking.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {booking.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                            booking.status === 'completed' ? 'bg-indigo-100 text-indigo-700' :
                                            booking.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                            {booking.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {myBookings.length === 0 && (
                        <div className="py-20 text-center text-slate-400 font-medium">
                            No history found yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LaundryDashboard;
