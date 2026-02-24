import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { FiUser, FiMail, FiLock, FiBriefcase, FiPhone, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { login, signup } from '../api/client';

interface AuthPageProps {
    onLogin: () => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMSG, setErrorMSG] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setErrorMSG('');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        try {
            if (isLogin) {
                const res = await login({ login: data.login as string, password: data.password as string });
                localStorage.setItem('access_token', res.data.access_token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
            } else {
                if (data.password !== data.confirm_password) {
                    throw new Error("Passwords do not match");
                }
                const res = await signup({
                    full_name: data.full_name as string,
                    username: data.username as string,
                    organization: data.organization as string,
                    email: data.email as string,
                    phone: data.phone ? (data.phone as string) : undefined,
                    password: data.password as string
                });
                localStorage.setItem('access_token', res.data.access_token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
            }
            onLogin();
        } catch (err: any) {
            setErrorMSG(err.response?.data?.detail || err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
        visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.5, ease: 'easeOut' } },
        exit: { opacity: 0, scale: 1.05, filter: 'blur(10px)', transition: { duration: 0.3 } }
    };

    const contentVariants: Variants = {
        hidden: { opacity: 0, x: isLogin ? -20 : 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut', delay: 0.1 } },
        exit: { opacity: 0, x: isLogin ? 20 : -20, transition: { duration: 0.2 } }
    };

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-black font-sans">
            {/* Cinematic Background Elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-900/20 via-black to-black opacity-90" />
            <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full mix-blend-screen pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(2,132,199,0.15) 0%, transparent 60%)',
                    filter: 'blur(60px)'
                }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full mix-blend-screen pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)',
                    filter: 'blur(50px)'
                }}
                animate={{ scale: [1, 1.2, 1], x: [0, -50, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="relative z-10 w-full max-w-md mx-4 md:max-w-4xl"
            >
                <div className="glass-card overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(2,132,199,0.15)] rounded-3xl flex flex-col md:flex-row bg-surface-base/60 backdrop-blur-xl">

                    {/* Left Panel - Branding / Graphic (Hidden on mobile) */}
                    <div className="hidden md:flex md:w-5/12 relative flex-col justify-between p-10 border-r border-white/5 bg-gradient-to-br from-sky-900/30 to-transparent">
                        <div>
                            <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-white to-sky-400 uppercase">
                                Nexus
                            </h2>
                            <p className="text-sky-200/60 text-sm mt-2 tracking-wide font-light">Digital Twin Pyrolysis Platform</p>
                        </div>

                        <div className="z-10">
                            <h3 className="text-2xl font-bold text-white mb-4 leading-snug">
                                {isLogin ? 'Welcome Back.' : 'Join the Revolution.'}
                            </h3>
                            <p className="text-sky-100/70 text-sm leading-relaxed">
                                {isLogin
                                    ? 'Access your analytics dashboard, simulate thermal dynamics, and optimize gas yields from your previous sessions.'
                                    : 'Create an account to save simulations, track lifecycle assessments, and collaborate with enterprise teams.'}
                            </p>
                        </div>

                        {/* Abstract visual art in the corner */}
                        <div className="absolute -bottom-20 -left-20 w-64 h-64 border-[1px] border-sky-400/20 rounded-full blur-[2px]" />
                        <div className="absolute -bottom-10 -left-10 w-48 h-48 border-[2px] border-sky-400/10 rounded-full" />
                    </div>

                    {/* Right Panel - Form */}
                    <div className="w-full md:w-7/12 p-8 md:p-12 relative">
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex gap-6 relative">
                                <button
                                    onClick={() => setIsLogin(true)}
                                    className={`text-lg font-bold uppercase tracking-wider transition-colors ${isLogin ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    Log In
                                </button>
                                <button
                                    onClick={() => setIsLogin(false)}
                                    className={`text-lg font-bold uppercase tracking-wider transition-colors ${!isLogin ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                                >
                                    Sign Up
                                </button>
                                {/* Active Indicator Line */}
                                <motion.div
                                    className="absolute -bottom-2 h-0.5 bg-sky-400 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.8)]"
                                    initial={false}
                                    animate={{
                                        left: isLogin ? 0 : 'calc(100% - 85px)',
                                        width: isLogin ? '60px' : '75px'
                                    }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            </div>
                        </div>

                        {errorMSG && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 text-center">
                                {errorMSG}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            {isLogin ? (
                                <motion.form
                                    key="login"
                                    variants={contentVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    onSubmit={handleSubmit}
                                    className="space-y-5"
                                >
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input type="text" name="login" placeholder="Email or Username" required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/50 focus:outline-none transition-all placeholder:text-white/30" />
                                        </div>
                                        <div className="relative">
                                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input type="password" name="password" placeholder="Password" required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/50 focus:outline-none transition-all placeholder:text-white/30" />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-sm">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="w-4 h-4 rounded border border-white/30 group-hover:border-sky-400 flex items-center justify-center transition-colors">
                                                {/* Hidden checkbox, custom styling */}
                                                <input type="checkbox" className="hidden peer" />
                                                <FiCheckCircle className="w-3 h-3 text-sky-400 opacity-0 peer-checked:opacity-100 transition-opacity" />
                                            </div>
                                            <span className="text-white/60 group-hover:text-white/80 transition-colors">Remember Me</span>
                                        </label>
                                        <button type="button" className="text-sky-400 hover:text-sky-300 transition-colors">Forgot Password?</button>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(2,132,199,0.3)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Access Terminal'}
                                        {!loading && <FiArrowRight />}
                                    </button>

                                    <div className="relative flex items-center py-4">
                                        <div className="flex-grow border-t border-white/10"></div>
                                        <span className="flex-shrink-0 mx-4 text-white/30 text-xs uppercase tracking-widest">Initialization Override</span>
                                        <div className="flex-grow border-t border-white/10"></div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={onLogin}
                                        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl transition-all"
                                    >
                                        Continue as Guest
                                    </button>
                                </motion.form>
                            ) : (
                                <motion.form
                                    key="signup"
                                    variants={contentVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    onSubmit={handleSubmit}
                                    className="space-y-4 max-h-[50vh] md:max-h-none overflow-y-auto pr-2 custom-scrollbar"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input type="text" name="full_name" placeholder="Full Name" required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/50 focus:outline-none transition-all placeholder:text-white/30 text-sm" />
                                        </div>
                                        <div className="relative">
                                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input type="text" name="username" placeholder="Username" required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/50 focus:outline-none transition-all placeholder:text-white/30 text-sm" />
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <FiBriefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                        <input type="text" name="organization" placeholder="Organization / Institution" required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/50 focus:outline-none transition-all placeholder:text-white/30 text-sm" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input type="email" name="email" placeholder="Email Address" required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/50 focus:outline-none transition-all placeholder:text-white/30 text-sm" />
                                        </div>
                                        <div className="relative">
                                            <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input type="tel" name="phone" placeholder="Phone Number (Optional)" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/50 focus:outline-none transition-all placeholder:text-white/30 text-sm" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="relative">
                                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input type="password" name="password" placeholder="Password" required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/50 focus:outline-none transition-all placeholder:text-white/30 text-sm" />
                                        </div>
                                        <div className="relative">
                                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                                            <input type="password" name="confirm_password" placeholder="Confirm Password" required className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/50 focus:outline-none transition-all placeholder:text-white/30 text-sm" />
                                        </div>
                                    </div>

                                    <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                                        <div className="w-5 h-5 mt-0.5 shrink-0 rounded border border-white/30 group-hover:border-sky-400 flex items-center justify-center transition-colors">
                                            <input type="checkbox" required className="hidden peer" />
                                            <FiCheckCircle className="w-4 h-4 text-sky-400 opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-white/60 text-xs leading-relaxed group-hover:text-white/80 transition-colors">
                                            I agree to the Terms of Service, Privacy Policy, and authorize the processing of telemetry data per EU regulations.
                                        </span>
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full mt-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(2,132,199,0.3)] hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
                                        {!loading && <FiArrowRight />}
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
