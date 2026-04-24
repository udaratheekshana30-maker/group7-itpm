// ===== REAL API BACKEND CONNECTED =====
const API_BASE = '/api';

export const api = {
    // Floors
    getFloors: async (wing) => {
        const params = new URLSearchParams();
        if (wing) params.append('wing', wing);
        params.append('_t', Date.now());
        const res = await fetch(`${API_BASE}/floors?${params}`);
        if (!res.ok) throw new Error('Failed to fetch floors');
        return res.json();
    },

    addFloorsBulk: async (data) => {
        const res = await fetch(`${API_BASE}/floors/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to add floors');
        }
        return res.json();
    },

    addFloor: async (data) => {
        const res = await fetch(`${API_BASE}/floors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to add floor');
        }
        return res.json();
    },

    toggleFloor: async (id) => {
        const res = await fetch(`${API_BASE}/floors/${id}/toggle`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to toggle floor');
        }
        return res.json();
    },

    deleteFloor: async (id) => {
        const res = await fetch(`${API_BASE}/floors/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete floor');
        }
        return res.json();
    },

    // Rooms
    getRooms: async (params = {}) => {
        const p = new URLSearchParams();
        if (params.floor) p.append('floor', params.floor);
        if (params.wing) p.append('wing', params.wing);
        if (params.activeOnly) p.append('activeOnly', params.activeOnly);
        p.append('_t', Date.now());
        const res = await fetch(`${API_BASE}/rooms?${p}`);
        if (!res.ok) throw new Error('Failed to fetch rooms');
        return res.json();
    },

    addRoom: async (data) => {
        const res = await fetch(`${API_BASE}/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to add room');
        }
        return res.json();
    },

    updateRoom: async (id, data) => {
        const res = await fetch(`${API_BASE}/rooms/${id}`, {
            method: 'PUT', // or PATCH if backend supports Partial
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update room');
        }
        return res.json();
    },

    toggleRoom: async (id) => {
        const res = await fetch(`${API_BASE}/rooms/${id}/toggle`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to toggle room');
        }
        return res.json();
    },

    // Students (Financial Payments)
    getStudents: async (params = {}) => {
        // Backend route is /api/student-payments/all
        // It returns list with isAllocated flag
        const res = await fetch(`${API_BASE}/student-payments/all`, {
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('hostel_token')}` }
        });
        if (!res.ok) throw new Error('Failed to fetch students');
        let data = await res.json();

        // Frontend filtering (backend currently returns all, we filter here for compat or update backend to filter)
        // Backend `student-payments/all` returns all records with allocation status.
        if (params.wing) data = data.filter(s => s.wing === params.wing);
        if (params.paymentStatus) data = data.filter(s => s.paymentStatus === params.paymentStatus);
        if (params.isAllocated !== undefined) {
            const isAlloc = params.isAllocated === 'true';
            data = data.filter(s => !!s.isAllocated === isAlloc);
        }
        return data; // Sorted by backend (rollNumber) or we sort by date here? 
        // Mock sorted by applicationDate. 
        // Real backend returns sorted by rollNumber.
    },

    getStudent: async (id) => {
        // ID could be _id or rollNumber. The detail modal uses _id usually.
        // My backend /api/student-payments/roll/:rollNumber looks up by rollNumber.
        // But if I pass _id, I need an endpoint for it or filter from list?
        // Let's assume we can fetch by ID from the list if we cache it, or add getById to backend.
        // For now, let's just fetch all and find? No, that's inefficient.
        // Let's try to fetch by rollNumber if the ID passed is actually a rollNumber, or add /:id support.
        // The `StudentApplications.jsx` uses `student._id`.
        // I'll add a check: if it looks like MongoDB ID, use a filter on client side or add endpoint.
        // Actually, let's just re-fetch getStudents and find it for now to be safe without changing backend too much.
        const res = await fetch(`${API_BASE}/student-payments/all`, {
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('hostel_token')}` }
        });
        const data = await res.json();
        return data.find(s => s._id === id);
    },

    updatePayment: async (id, status) => {
        // Read-only
        throw new Error('Financial Data is Read-Only. Cannot update payment status.');
    },

    // Allocations
    getAllocations: async (params = {}) => {
        const p = new URLSearchParams(params);
        const res = await fetch(`${API_BASE}/allocations?${p}`);
        if (!res.ok) throw new Error('Failed to fetch allocations');
        return res.json();
    },

    allocate: async ({ studentId, roomId, bedId }) => {
        const res = await fetch(`${API_BASE}/allocations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, roomId, bedId })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to allocate');
        }
        return res.json();
    },

    updateAllocation: async (id, data) => {
        const res = await fetch(`${API_BASE}/allocations/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update allocation');
        }
        return res.json();
    },

    deleteAllocation: async (id) => {
        const res = await fetch(`${API_BASE}/allocations/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete allocation');
        }
        return res.json();
    },

    getSuggestions: async (wing, degree) => {
        const p = new URLSearchParams({ wing, degree });
        const res = await fetch(`${API_BASE}/allocations/suggest?${p}`);
        if (!res.ok) throw new Error('Failed to get suggestions');
        return res.json();
    },

    getStats: async () => {
        const res = await fetch(`${API_BASE}/stats`); // Server proxies to /api/allocations/stats
        if (!res.ok) throw new Error('Failed to fetch stats');
        return res.json();
    },

    getExportUrl: (format, params = {}) => {
        const p = new URLSearchParams(params);
        p.append('format', format);
        return `${API_BASE}/allocations/export?${p}`;
    },

    getDegrees: async () => {
        const res = await fetch(`${API_BASE}/allocations/degrees`);
        if (!res.ok) throw new Error('Failed to fetch degrees');
        return res.json();
    },

    // Applications
    getApplications: async (params = {}) => {
        const token = sessionStorage.getItem('hostel_token');
        const p = new URLSearchParams(params);
        const res = await fetch(`${API_BASE}/applications?${p}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            let errMsg = `${res.status} Failed to fetch applications`;
            try {
                const err = await res.json();
                errMsg = `${res.status} ${err.error || err.message || errMsg}`;
            } catch (_) {}
            throw new Error(errMsg);
        }
        return res.json();
    },

    getApplication: async (id) => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/applications/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch application');
        return res.json();
    },

    getApplicationsExportUrl: (format, params = {}) => {
        const p = new URLSearchParams(params);
        p.append('format', format);
        return `${API_BASE}/applications/export/data?${p}`;
    },



    updateApplication: async (id, data) => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/applications/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            let errMsg = 'Failed to update application';
            try {
                const errData = await res.json();
                errMsg = errData.error || errData.message || errMsg;
            } catch (_) {}
            throw new Error(errMsg);
        }
        return res.json();
    },

    // Notices
    getNotices: async () => {
        const res = await fetch(`${API_BASE}/notices`);
        if (!res.ok) throw new Error('Failed to fetch notices');
        return res.json();
    },

    createNotice: async (formData) => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/notices`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const contentType = res.headers.get("content-type");
        if (!res.ok) {
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const err = await res.json();
                throw new Error(err.msg || err.error || 'Failed to create notice');
            } else {
                const text = await res.text();
                console.error("Non-JSON Error Response:", text);
                throw new Error(`Server Error (${res.status}): Please check backend logs.`);
            }
        }

        return res.json();
    },

    deleteNotice: async (id) => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/notices/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete notice');
        return res.json();
    },

    updateNotice: async (id, formData, queryParams = '') => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/notices/${id}${queryParams}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const contentType = res.headers.get('content-type');
        if (!res.ok) {
            if (contentType && contentType.includes('application/json')) {
                const err = await res.json();
                throw new Error(err.msg || err.error || 'Failed to update notice');
            }
            throw new Error(`Server Error (${res.status})`);
        }
        return res.json();
    },

    // Warden - Monthly Payments
    getMonthlySubmissions: async (params = {}) => {
        const token = sessionStorage.getItem('hostel_token');
        const p = new URLSearchParams(params);
        const res = await fetch(`${API_BASE}/student-payments/monthly-submissions?${p}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch monthly submissions');
        return res.json();
    },

    getMonthlySubmissionsExportUrl: (format, params = {}) => {
        const p = new URLSearchParams(params);
        p.append('format', format);
        return `${API_BASE}/student-payments/monthly-submissions/export?${p}`;
    },

    updateMonthlyStatus: async (studentId, submissionId, status) => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/student-payments/monthly-submissions/${studentId}/${submissionId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error('Failed to update status');
        return res.json();
    },

    // Clearance
    getClearances: async () => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/clearance`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch clearances');
        return res.json();
    },

    getClearancesFinancial: async () => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/clearance/financial`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch clearances');
        return res.json();
    },

    updateClearanceWarden: async (id, data) => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/clearance/${id}/warden`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to update clearance');
        return res.json();
    },

    deleteClearance: async () => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/clearance/me`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete clearance form');
        return res.json();
    },

    deleteClearanceById: async (id) => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/clearance/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to purge clearance record');
        return res.json();
    },

    deleteApplication: async (id) => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/applications/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete application record');
        return res.json();
    },

    purgeStudentRecord: async (id) => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/leave/purge-student/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to purge student records');
        }
        return res.json();
    },

    getLeftStudents: async (params = {}) => {
        const token = sessionStorage.getItem('hostel_token');
        const p = new URLSearchParams(params);
        const res = await fetch(`${API_BASE}/leave/left-students?${p}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch left students');
        return res.json();
    },

    getLeftStudentsExportUrl: (format, params = {}) => {
        const p = new URLSearchParams(params);
        p.append('format', format);
        return `${API_BASE}/leave/left-students/export?${p}`;
    },

    // Financial Exports
    getRefundableExportUrl: (format, params = {}) => {
        const p = new URLSearchParams(params);
        p.append('format', format);
        return `${API_BASE}/financial/export/refundable?${p}`;
    },

    getRefundTransfersExportUrl: (format, params = {}) => {
        const p = new URLSearchParams(params);
        p.append('format', format);
        return `${API_BASE}/financial/export/transfers?${p}`;
    },

    getFinancialRecordsExportUrl: (format, params = {}) => {
        const p = new URLSearchParams(params);
        p.append('format', format);
        return `${API_BASE}/financial/export/records?${p}`;
    },

    deleteMyProfile: async (password) => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/users/profile`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to delete profile');
        }
        return res.json();
    },

    // Resources
    getResources: async () => {
        const res = await fetch(`${API_BASE}/resources`);
        if (!res.ok) throw new Error('Failed to fetch resources');
        return res.json();
    },

    getResourceStudents: async () => {
        const res = await fetch(`${API_BASE}/resources/students`);
        if (!res.ok) throw new Error('Failed to fetch students for resource allocation');
        return res.json();
    },

    createResource: async (data) => {
        const res = await fetch(`${API_BASE}/resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to create resource');
        }
        return res.json();
    },

    updateResource: async (id, data) => {
        const res = await fetch(`${API_BASE}/resources/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to update resource');
        }
        return res.json();
    },

    deleteResource: async (id) => {
        const res = await fetch(`${API_BASE}/resources/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to delete resource');
        }
        return res.json();
    },

    // Resource allocation logic removed as per unused collection request

    // ── Common Area Items ───────────────────────────────────────────
    getCommonAreaItems: async (areaName) => {
        const p = new URLSearchParams();
        if (areaName) p.append('areaName', areaName);
        const res = await fetch(`${API_BASE}/resources/common-area?${p}`);
        if (!res.ok) throw new Error('Failed to fetch common area items');
        return res.json();
    },

    addCommonAreaItem: async (data) => {
        const res = await fetch(`${API_BASE}/resources/common-area`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to add item');
        }
        return res.json();
    },

    updateCommonAreaItemStatus: async (id, status) => {
        const res = await fetch(`${API_BASE}/resources/common-area/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to update status');
        }
        return res.json();
    },

    deleteCommonAreaItem: async (id) => {
        const res = await fetch(`${API_BASE}/resources/common-area/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to delete item');
        }
        return res.json();
    },

    // ── Room Goods ──────────────────────────────────────────────────
    getRoomGoods: async (roomId) => {
        const res = await fetch(`${API_BASE}/rooms/${roomId}/goods`);
        if (!res.ok) throw new Error('Failed to fetch room goods');
        return res.json();
    },

    updateBedGood: async (roomId, goodId, data) => {
        // data: { bedId, uniqueCode?, status? }
        const res = await fetch(`${API_BASE}/rooms/${roomId}/goods/${goodId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update bed good');
        }
        return res.json();
    },

    updateRoomLevelGood: async (roomId, goodId, data) => {
        // data: { uniqueCode?, status? }
        const res = await fetch(`${API_BASE}/rooms/${roomId}/room-goods/${goodId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update room good');
        }
        return res.json();
    },

    migrateRoomGoods: async (payload = {}) => {
        const res = await fetch(`${API_BASE}/rooms/migrate-goods`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Migration failed');
        return res.json();
    },

    searchFurniture: async (code) => {
        const token = sessionStorage.getItem('hostel_token');
        const res = await fetch(`${API_BASE}/rooms/search-furniture/${code}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            if (res.status === 404) throw new Error('Furniture code not found');
            throw new Error('Search failed');
        }
        return res.json();
    },

    getResourcesExportUrl: (format) => {
        return `${API_BASE}/rooms/export-inventory?format=${format}`;
    }
};
