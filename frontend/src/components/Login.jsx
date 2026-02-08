import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/authApi';
import { BarChart2, Lock, User } from 'lucide-react';

const Login = () => {
    const [usrId, setUsrId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(usrId, password);
            navigate('/');
        } catch (err) {
            setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
    };

    return (
        <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-indigo-600 p-3 rounded-2xl mb-4 shadow-lg shadow-indigo-600/20">
                        <BarChart2 size={32} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">StockPlus 로그인</h1>
                    <p className="text-slate-500 text-sm mt-2">나만의 스마트 대시보드</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">아이디 (ID)</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                                type="text" 
                                value={usrId}
                                onChange={(e) => setUsrId(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all"
                                placeholder="아이디를 입력하세요"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">비밀번호</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 transition-all"
                                placeholder="비밀번호를 입력하세요"
                                required
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}

                    <button 
                        type="submit" 
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                    >
                        로그인
                    </button>
                </form>

                {/* 
                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                    <p className="text-slate-500 text-sm">
                        계정이 없으신가요? 
                        <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold ml-2">회원가입</Link>
                    </p>
                </div>
                */}
            </div>
        </div>
    );
};

export default Login;
