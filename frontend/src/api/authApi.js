/**
 * 사용자 인증 관련 API 호출 함수들을 정의한 모듈입니다.
 * 로그인, 회원가입, 로그아웃, 토큰 관리 기능을 제공합니다.
 */

// 로그인 API 호출
// 서버에 아이디와 비밀번호를 보내고, 성공 시 받은 토큰을 로컬 스토리지에 저장합니다.
export async function login(usrId, password) {
    const response = await fetch('/stockPlus/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrId, password }),
    });
    
    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    
    // 로그인 성공 후 받은 토큰과 사용자 정보를 브라우저 저장소(localStorage)에 저장
    localStorage.setItem('token', data.token);
    localStorage.setItem('usrId', data.username); // 'username' 키로 받은 값을 'usrId'로 저장
    localStorage.setItem('usrName', data.usrName || data.username);
    return data;
}

// 회원가입 API 호출
export async function signup(user) {
    const response = await fetch('/stockPlus/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
    });
    
    if (!response.ok) {
        const msg = await response.text(); // 에러 메시지가 텍스트로 올 경우 처리
        throw new Error(msg || 'Signup failed');
    }
    return true;
}

// 로그아웃 처리
// 저장된 토큰 정보를 삭제하고 로그인 페이지로 이동시킵니다.
export function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usrId');
    localStorage.removeItem('usrName');
    window.location.href = '/stockPlus/login';
}

// 현재 저장된 인증 토큰 가져오기
export function getAuthToken() {
    return localStorage.getItem('token');
}

// 사용자가 로그인 상태인지 확인 (토큰 존재 여부 및 길이 체크)
export function isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!(token && token !== 'null' && token !== 'undefined' && token.length > 10);
}

// 비밀번호 초기화 인증 코드 요청
export async function requestCode(usrId, email) {
    const response = await fetch('/stockPlus/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrId, email }),
    });
    if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Failed to request code');
    }
    return true;
}

// 인증 코드 검증 및 비밀번호 초기화
export async function verifyAndReset(usrId, email, code, newPassword) {
    const response = await fetch('/stockPlus/api/auth/verify-and-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usrId, email, code, newPassword }),
    });
    if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || 'Failed to reset password');
    }
    return true;
}
