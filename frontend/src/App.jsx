import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import NavigationBar from './components/NavigationBar'
import Dashboard from './pages/Dashboard'
import FloorAndRoomManagement from './pages/FloorAndRoomManagement'
import StudentApplications from './pages/StudentApplications'
import Records from './pages/Records'
import Landing from './pages/Landing'
import StudentDashboard from './pages/StudentDashboard'
import Notices from './pages/Notices'
import NoticeDetail from './pages/NoticeDetail'
import Resources from './pages/Resources'
import Profiles from './pages/Profiles'
import LaundryDashboard from './pages/LaundryDashboard';
import LaundryManagementStaff from './pages/LaundryManagementStaff';
import ResourceBooking from './pages/ResourceBooking';
import ResourceManagementStaff from './pages/ResourceManagementStaff';
import RoomBookingStudent from './pages/RoomBookingStudent';
import { useState } from 'react'

import StudentNavigationBar from './components/StudentNavigationBar'
import SecurityNavigationBar from './components/SecurityNavigationBar'
import SecurityDashboard from './pages/SecurityDashboard'
import SecurityRecords from './pages/SecurityRecords'
import AdminNavigationBar from './components/AdminNavigationBar'
import AdminDashboard from './pages/AdminDashboard'
import StaffSettings from './pages/StaffSettings'
import { useAuth } from './context/AuthContext'

const AppLayout = () => (
    <div className="flex flex-col min-h-screen">
        <NavigationBar />
        <main className="flex-grow pt-[80px]">
            <Outlet />
        </main>
    </div>
)

const StudentLayout = () => (
    <div className="flex flex-col min-h-screen">
        <StudentNavigationBar />
        <main className="flex-grow pt-[80px]">
            <Outlet />
        </main>
    </div>
)



const SecurityLayout = () => (
    <div className="flex flex-col min-h-screen">
        <SecurityNavigationBar />
        <main className="flex-grow pt-[80px]">
            <Outlet />
        </main>
    </div>
)

const AdminLayout = () => (
    <div className="flex flex-col min-h-screen">
        <AdminNavigationBar />
        <main className="flex-grow pt-[80px]">
            <Outlet />
        </main>
    </div>
)

const RequireRole = ({ roles, children }) => {
    const { user, loading } = useAuth()

    if (loading) return null;
    if (!user) return <Navigate to="/" replace />;
    
    const allowedRoles = Array.isArray(roles) ? roles.map(r => r.toLowerCase()) : [roles.toLowerCase()]
    if (!allowedRoles.includes(user.role?.toLowerCase())) return <Navigate to="/" replace />

    return children;
}

function App() {
    // Shared state for allocation flow
    const [allocatingStudent, setAllocatingStudent] = useState(null)

    return (
        <>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        fontSize: '13.5px',
                        fontFamily: 'Inter, sans-serif'
                    }
                }}
            />
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/notice/:id" element={<NoticeDetail />} />
                {/* Student Routes (with StudentNavigationBar) */}
                <Route element={<StudentLayout />}>
                    <Route path="/student" element={<StudentDashboard />} />
                    <Route path="/student/applications" element={<StudentDashboard />} />
                    <Route path="/student/settings" element={<StudentDashboard />} />
                    <Route path="/student/laundry" element={<RequireRole roles="student"><LaundryDashboard /></RequireRole>} />
                    <Route path="/student/resources" element={<RequireRole roles="student"><ResourceBooking /></RequireRole>} />
                    <Route path="/student/room-booking" element={<RequireRole roles="student"><RoomBookingStudent /></RequireRole>} />
                </Route>

                {/* Warden/Staff Routes (with NavigationBar) */}
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route 
                        path="/room-management" 
                        element={
                            <RequireRole roles={['warden', 'roombookingadmin']}>
                                <FloorAndRoomManagement 
                                    allocatingStudent={allocatingStudent}
                                    setAllocatingStudent={setAllocatingStudent}
                                />
                            </RequireRole>
                        } 
                    />
                    <Route
                        path="/student-applications"
                        element={
                            <RequireRole roles={['warden', 'roombookingadmin']}>
                                <StudentApplications
                                    setAllocatingStudent={setAllocatingStudent}
                                />
                            </RequireRole>
                        }
                    />
                    <Route path="/records" element={<Records />} />
                    <Route path="/notices" element={<Notices />} />

                    <Route path="/resources" element={<Resources />} />
                    <Route path="/warden/laundry" element={<RequireRole roles={['warden', 'laundryadmin']}><LaundryManagementStaff /></RequireRole>} />
                    <Route path="/warden/resources" element={<RequireRole roles={['warden', 'resourceadmin']}><ResourceManagementStaff /></RequireRole>} />
                    <Route path="/profiles" element={<Profiles />} />
                    <Route path="/warden/settings" element={<StaffSettings />} />
                </Route>



                {/* Security Officer Routes */}
                <Route element={<SecurityLayout />}>
                    <Route path="/security/dashboard" element={<SecurityDashboard />} />
                    <Route path="/security/records" element={<SecurityRecords />} />
                    <Route path="/security/settings" element={<StaffSettings />} />
                </Route>

                {/* Admin Routes */}
                <Route element={<AdminLayout />}>
                    <Route
                        path="/admin/dashboard"
                        element={
                            <RequireRole roles="admin">
                                <AdminDashboard />
                            </RequireRole>
                        }
                    />
                    <Route path="/admin/settings" element={<StaffSettings />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    )
}

export default App
