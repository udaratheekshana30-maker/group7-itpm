const API_BASE = '/api/qr';

const getAuthHeaders = () => {
    const token = sessionStorage.getItem('hostel_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const readJson = async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data?.message || data?.msg || 'Request failed');
    }
    return data;
};

export const getQrStatus = async (studentId) => {
    const res = await fetch(`${API_BASE}/status/${encodeURIComponent(studentId)}`);
    return readJson(res);
};

export const submitQrScan = async (payload, token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });
    return readJson(res);
};

export const fetchOutsideStudents = async () => {
    const res = await fetch(`${API_BASE}/outside`, { headers: getAuthHeaders() });
    return readJson(res);
};

export const fetchLateStudents = async () => {
    const res = await fetch(`${API_BASE}/late`, { headers: getAuthHeaders() });
    return readJson(res);
};

export const fetchSecurityPin = async () => {
    const res = await fetch(`${API_BASE}/security-pin`, { headers: getAuthHeaders() });
    return readJson(res);
};

export const fetchMyQrStatus = async (token) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : getAuthHeaders();
    const res = await fetch(`${API_BASE}/my-status`, { headers });
    return readJson(res);
};
