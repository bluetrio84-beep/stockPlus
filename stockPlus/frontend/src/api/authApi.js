export const API_BASE_URL = '';

export const login = async (usrId, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrId, password }),
    });

    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('usrId', data.usrId);
        localStorage.setItem('usrName', data.usrName);
        localStorage.setItem('role', data.role); // [추가] Role 저장
        return data;
    } else {
        throw new Error('Login failed');
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usrId');
    localStorage.removeItem('usrName');
    localStorage.removeItem('role'); // [추가] Role 삭제
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

// [추가] 관리자 여부 확인
export const isAdmin = () => {
    return localStorage.getItem('role') === 'ADMIN';
};

export const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const signup = async (userData) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        throw new Error('Signup failed');
    }
    return response;
};

// [복구] 빌드 에러 방지용 더미 함수
export const requestCode = async (email) => { console.log("Request code:", email); };
export const verifyAndReset = async (data) => { console.log("Verify reset:", data); };
