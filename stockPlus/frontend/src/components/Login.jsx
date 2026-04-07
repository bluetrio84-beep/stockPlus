import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, requestCode, verifyAndReset } from '../api/authApi';
import { BarChart2, Lock, User, Mail, ShieldCheck, ArrowLeft } from 'lucide-react';

const Login = () => {
    const [mode, setMode] = useState('login'); // 'login', 'forgot', 'reset'
    const [usrId, setUsrId] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // 1. 로그인 핸들러
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(usrId, password);
            navigate('/');
        } catch (err) {
            setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
    };

    // 2. 인증 코드 요청 핸들러
    const handleRequestCode = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await requestCode(usrId, email);
            setMessage('인증 코드가 이메일로 발송되었습니다.');
            setMode('reset');
        } catch (err) {
            setError(err.message || '인증 코드 발송에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 3. 비밀번호 재설정 핸들러
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await verifyAndReset(usrId, email, code, newPassword);
            alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
            setMode('login');
            setPassword('');
            setMessage('');
        } catch (err) {
            setError(err.message || '비밀번호 재설정에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderLoginForm = () => (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">아이디 (ID)</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" value={usrId} onChange={(e) => setUsrId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all" placeholder="아이디를 입력하세요" required />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">비밀번호</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all" placeholder="비밀번호를 입력하세요" required />
                </div>
            </div>
            {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98]">로그인</button>
            <div className="text-center mt-4">
                <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="text-xs text-slate-500 hover:text-indigo-400 transition-colors">비밀번호를 잊으셨나요?</button>
            </div>
        </form>
    );

    const renderForgotForm = () => (
        <form onSubmit={handleRequestCode} className="space-y-5">
            <div className="mb-6 text-center">
                <p className="text-sm text-slate-400">가입 시 등록한 아이디와 이메일을 입력하시면<br/>인증 코드를 보내드립니다.</p>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">아이디</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" value={usrId} onChange={(e) => setUsrId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500" placeholder="아이디" required />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">이메일</label>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500" placeholder="example@email.com" required />
                </div>
            </div>
            {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50">
                {isLoading ? '발송 중...' : '인증 코드 발송'}
            </button>
            <button type="button" onClick={() => setMode('login')} className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-white transition-colors"><ArrowLeft size={16} /> 로그인으로 돌아가기</button>
        </form>
    );

    const renderResetForm = () => (
        <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="mb-6 text-center">
                <p className="text-sm text-indigo-400 font-medium">{message}</p>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">인증 코드 (6자리)</label>
                <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500" placeholder="000000" maxLength={6} required />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">새 비밀번호</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500" placeholder="새 비밀번호 입력" required />
                </div>
            </div>
            {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}
            <button type="submit" disabled={isLoading} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50">
                {isLoading ? '처리 중...' : '비밀번호 변경'}
            </button>
        </form>
    );

    return (
        <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-indigo-600 p-3 rounded-2xl mb-4 shadow-lg shadow-indigo-600/20">
                        <BarChart2 size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        {mode === 'login' ? 'StockPlus 로그인' : mode === 'forgot' ? '비밀번호 찾기' : '비밀번호 재설정'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-2">나만의 스마트 대시보드</p>
                </div>

                {mode === 'login' && renderLoginForm()}
                {mode === 'forgot' && renderForgotForm()}
                {mode === 'reset' && renderResetForm()}
            </div>
        </div>
    );
};

export default Login;
