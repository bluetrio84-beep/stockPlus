export async function login(usrId, password) {
    const response = await fetch('/stockPlus/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrId, password }),
    });
    if (!response.ok) throw new Error('Login failed');
    const data = await response.json();
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('usrId', data.username); 
    localStorage.setItem('usrName', data.usrName || data.username);
    return data;
}

export async function signup(user) {
    const response = await fetch('/stockPlus/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
    });
    if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Signup failed');
    }
    return true;
}

export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usrId');
    localStorage.removeItem('usrName');
    window.location.href = '/stockPlus/login';
}

export function getAuthToken() {
    return localStorage.getItem('token');
}

export function isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!(token && token !== 'null' && token !== 'undefined' && token.length > 10);
}
