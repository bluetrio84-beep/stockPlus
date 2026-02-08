import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../api/authApi';
import { BarChart2, Mail, Phone, Lock, User, ArrowLeft } from 'lucide-react';

const Signup = () => {
    const [formData, setFormData] = useState({
        usrId: '',
        usrName: '',
        password: '',
        phoneNumber: '',
        email: ''
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await signup(formData);
            alert('회원가입이 완료되었습니다. 로그인해 주세요.');
            navigate('/login');
        } catch (err) {
            setError(err.message || '회원가입에 실패했습니다.');
        }
    };

    return (
        <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
                <button onClick={() => navigate('/login')} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium">
                    <ArrowLeft size={16} /> 뒤로가기
                </button>

                <div className="flex flex-col items-center mb-8">
                    <h1 className="text-2xl font-bold text-white tracking-tight">회원가입</h1>
                    <p className="text-slate-500 text-sm mt-2">5가지 정보를 모두 입력해주세요</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">아이디 (ID)</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input name="usrId" type="text" onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 text-sm" placeholder="아이디" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">이름 (Name)</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input name="usrName" type="text" onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 text-sm" placeholder="실명" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">비밀번호</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input name="password" type="password" onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 text-sm" placeholder="비밀번호" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">휴대폰 번호</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input name="phoneNumber" type="tel" onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 text-sm" placeholder="010-0000-0000" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">이메일</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input name="email" type="email" onChange={handleChange} required className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-indigo-500 text-sm" placeholder="example@email.com" />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-xs text-center font-medium">{error}</p>}

                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 mt-4">
                        가입하기
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Signup;
