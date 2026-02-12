import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Construction, Sparkles, Zap } from 'lucide-react';

export default function ComingSoon({ onNavigate, feature }) {
    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-blue/30 flex flex-col items-center justify-center p-6 overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 5, repeat: Infinity }}
                    className="absolute -top-20 -left-20 w-96 h-96 bg-brand-blue/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.1, 0.2, 0.1]
                    }}
                    transition={{ duration: 7, repeat: Infinity, delay: 1 }}
                    className="absolute top-1/2 -right-20 w-64 h-64 bg-brand-purple/20 rounded-full blur-3xl"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 max-w-2xl w-full text-center"
            >
                <div className="flex justify-center mb-8 relative">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="relative z-10 bg-[#1e293b] p-6 rounded-full border border-white/10 shadow-2xl"
                    >
                        <Construction className="w-16 h-16 text-brand-blue" />
                    </motion.div>
                    {/* Orbital particles */}
                    <motion.div
                        className="absolute inset-0 z-0"
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4">
                            <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                        </div>
                    </motion.div>
                </div>

                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-purple">
                    Building the Future
                </h1>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-[#1e293b]/60 backdrop-blur-md border border-white/10 p-8 rounded-2xl shadow-xl"
                >
                    <div className="flex items-center justify-center gap-3 mb-4 text-xl font-medium text-gray-300">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        <span>Coming Soon</span>
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-4">
                        {feature || 'New Feature'}
                    </h2>

                    <p className="text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
                        Our team of AI engineers is currently hard at work crafting this experience.
                        We're combining cutting-edge technology with intuitive design to bring you something truly spectacular.
                    </p>

                    {/* Progress Bar Animation */}
                    <div className="w-full max-w-sm mx-auto h-2 bg-gray-700 rounded-full overflow-hidden mb-8">
                        <motion.div
                            className="h-full bg-gradient-to-r from-brand-blue to-brand-purple"
                            initial={{ width: "0%" }}
                            animate={{ width: "75%" }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                    </div>

                    <button
                        onClick={() => onNavigate('home')}
                        className="group px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all flex items-center gap-2 mx-auto text-white"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Return to Dashboard
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
}
