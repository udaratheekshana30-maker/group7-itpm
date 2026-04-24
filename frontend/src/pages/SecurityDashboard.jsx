import React from 'react';
import { HiOutlineShieldCheck } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import QrSecurityPinCard from '../components/QrSecurityPinCard';
import QrOutsideMonitor from '../components/QrOutsideMonitor';

const SecurityDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto animate-fade-in">
            <div
                className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-10 text-white"
                style={{ background: 'linear-gradient(135deg, #1A3263 0%, #2D4A8A 100%)', boxShadow: '0 20px 60px rgba(26, 50, 99, 0.3)' }}
            >
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/[0.08]" />
                <div className="absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-white/[0.05]" />
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-[11px] font-bold mb-4 backdrop-blur-sm border border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                        LIVE QR MONITORING
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
                            <HiOutlineShieldCheck className="text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Security Dashboard</h1>
                            <p className="text-white/75 text-sm font-medium mt-1">Welcome, {user?.name || 'Security Officer'}.</p>
                        </div>
                    </div>
                    <p className="text-white/70 text-[15px] max-w-2xl leading-relaxed">
                        Monitor the current security PIN, outside-student status, late highlights, and the live gate QR flow.
                    </p>
                </div>
            </div>

            <QrSecurityPinCard />
            <QrOutsideMonitor title="Gate Monitoring" />
        </div>
    );
};

export default SecurityDashboard;
