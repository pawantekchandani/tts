import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, FileText, Fingerprint, Image as ImageIcon, Users, ArrowRight, Sparkles, LogOut, Info, User, Menu, X } from 'lucide-react';
import { format } from 'date-fns';
import { authAPI } from '../api/auth';

export default function Home({ onNavigate, userPlan, isLoggedIn = false }) {
    const [showProfile, setShowProfile] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const profileRef = React.useRef(null);

    React.useEffect(() => {
        if (isLoggedIn) {
            const loadProfile = async () => {
                const profile = await authAPI.getProfile();
                if (profile) setUserProfile(profile);
            };
            loadProfile();
        }

        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setShowProfile(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleServiceClick = (action) => {
        if (!isLoggedIn) {
            // If not logged in, redirect to login page (which handles switching from Home default)
            // In App.jsx, onNavigate passed to public Home handles 'login' string to setPage('login')
            // But actually we are passing `onNavigate` prop which might expect different things.
            // In App.jsx public home: onNavigate={(view) => { if(view=='login') setPage('login')... }}
            onNavigate('login');
        } else {
            action();
        }
    };

    const services = [
        {
            id: 'tts',
            title: 'Text to Speech',
            description: 'Convert text into lifelike speech with our advanced AI voices.',
            icon: <Mic className="w-8 h-8 text-brand-blue" />,
            action: () => handleServiceClick(() => onNavigate('tts'))
        },
        {
            id: 'stt',
            title: 'Speech to Text',
            description: 'Transcribe audio files into accurate text in seconds.',
            icon: <FileText className="w-8 h-8 text-purple-400" />,
            action: () => handleServiceClick(() => onNavigate('stt'))
        },
        {
            id: 'cloning',
            title: 'Voice Cloning',
            description: 'Create a digital replica of your own voice for personalized content.',
            icon: <Fingerprint className="w-8 h-8 text-pink-500" />,
            action: () => handleServiceClick(() => onNavigate('cloning'))
        },
        {
            id: 'image',
            title: 'AI Image Gen',
            description: 'Generate stunning visuals from text descriptions.',
            icon: <ImageIcon className="w-8 h-8 text-green-400" />,
            action: () => handleServiceClick(() => onNavigate('image'))
        }
    ];

    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-blue/30">

            {/* NAVBAR */}
            {/* NAVBAR */}
            <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-brand-dark/90 backdrop-blur sticky top-0 z-50">
                {/* LEFT: Branding */}
                <div className="flex items-center gap-2 justify-start">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        PollyGlot
                    </span>
                </div>

                {/* CENTER: Navigation Links (Desktop) */}
                <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 -translate-x-1/2">
                    <Link
                        to="/about"
                        className="relative group text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <Info className="w-4 h-4" />
                        About
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-blue transition-all group-hover:w-full"></span>
                    </Link>

                    <Link
                        to="/plans"
                        className="relative group text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        Plans
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-blue transition-all group-hover:w-full"></span>
                    </Link>
                </div>

                {/* RIGHT: User Profile & Hamburger */}
                {/* RIGHT: User Profile & Hamburger */}
                <div className="flex items-center justify-end gap-4">
                    {!isLoggedIn ? (
                        <div className="hidden md:flex items-center gap-4">
                            <Link
                                to="/login"
                                className="text-gray-300 hover:text-white transition-colors font-medium"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="bg-brand-blue hover:bg-blue-600 text-white px-5 py-2 rounded-full font-bold transition-all shadow-lg shadow-blue-500/20"
                            >
                                Sign Up
                            </Link>
                        </div>
                    ) : (
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfile(!showProfile)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <User className="w-5 h-5 text-white" />
                            </button>

                            <AnimatePresence>
                                {showProfile && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-64 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl p-4 z-50"
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center font-bold text-lg">
                                                {authAPI.getUserEmail()?.[0].toUpperCase()}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-bold truncate" title={authAPI.getUserEmail()}>
                                                    {authAPI.getUserEmail()}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    {userProfile?.member_since
                                                        ? `Member since ${format(new Date(userProfile.member_since), 'MMM yyyy')}`
                                                        : 'Member since 2026'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-black/20 rounded-lg p-3 mb-4 flex justify-between items-center">
                                            <span className="text-sm text-gray-400">Current Plan</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
                                                ${(userPlan || 'Basic').toLowerCase() === 'pro' ? 'bg-indigo-500' :
                                                    (userPlan || 'Basic').toLowerCase() === 'plus' ? 'bg-purple-600' :
                                                        'bg-slate-600'
                                                }
                                            `}>
                                                {userPlan || 'Free'}
                                            </span>
                                        </div>

                                        <button
                                            onClick={() => {
                                                if (window.confirm("Are you sure you want to logout?")) {
                                                    authAPI.logout();
                                                    window.location.reload();
                                                }
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Hamburger Menu Icon */}
                    <button
                        className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-[#1e293b] border-b border-white/10 overflow-hidden"
                    >
                        <div className="flex flex-col p-4 gap-4">
                            {!isLoggedIn && (
                                <>
                                    <Link
                                        to="/login"
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <span className="font-medium">Login</span>
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <span className="font-medium">Sign Up</span>
                                    </Link>
                                </>
                            )}
                            <Link
                                to="/about"
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                                    <Info className="w-5 h-5" />
                                </div>
                                <span className="font-medium">About</span>
                            </Link>

                            <Link
                                to="/plans"
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Plans</span>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HERO SECTION */}
            <main className="max-w-6xl mx-auto px-6 py-12">
                <div className="text-center mb-16">
                    <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-blue via-brand-purple to-pink-500">
                        Unleash Your Creativity
                    </h1>
                    <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto">
                        Experience the power of our multi-modal AI suite. Generate audio, text, images, and more with a single subscription.
                    </p>
                </div>

                {/* SERVICES GRID */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-6">
                    {services.map((service) => (
                        <motion.div
                            key={service.id}
                            whileHover={{ scale: 1.02, translateY: -5 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative bg-[#1e293b]/40 border border-white/5 rounded-2xl p-8 hover:bg-[#1e293b]/60 hover:border-brand-blue/30 transition-all cursor-pointer overflow-hidden"
                            onClick={service.action}
                        >
                            {/* Background Gradient Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-blue/20 transition-all"></div>

                            <div className="relative z-10 flex items-start justify-between">
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors">
                                    {service.icon}
                                </div>
                                <div className="p-2 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                    <ArrowRight className="w-5 h-5 text-white" />
                                </div>
                            </div>

                            <div className="relative z-10 mt-6">
                                <h3 className="text-2xl font-bold mb-2 group-hover:text-brand-blue transition-colors">
                                    {service.title}
                                </h3>
                                <p className="text-gray-400 leading-relaxed truncate text-xs sm:text-base">
                                    {service.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </main>


        </div>
    );
}
