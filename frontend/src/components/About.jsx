import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, GitCommit, Twitter, Globe, Info } from 'lucide-react';

export default function About({ onNavigate }) {
    return (
        <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-blue/30 flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl bg-[#1e293b]/60 border border-white/10 rounded-2xl p-8 sm:p-12 shadow-2xl relative overflow-hidden"
            >
                <button
                    onClick={() => onNavigate('home')}
                    className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-brand-blue to-brand-purple rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-brand-purple/20">
                        <Info className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        About PollyGlot
                    </h1>
                    <p className="text-gray-400 mt-2">The Ultimate AI Creative Suite</p>
                </div>

                <div className="space-y-6 text-gray-300 leading-relaxed">
                    <p>
                        PollyGlot is designed to empower content creators with state-of-the-art AI generation tools.
                        Whether you need lifelike voiceovers, quick transcriptions, or stunning visuals, we've got you covered in one seamless platform.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                            <h3 className="font-semibold text-white mb-1">Version</h3>
                            <p className="text-sm text-gray-400">v1.0.0 (Beta)</p>
                        </div>
                        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                            <h3 className="font-semibold text-white mb-1">Tech Stack</h3>
                            <p className="text-sm text-gray-400">React + FastAPI + MySQL</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-white/10 flex justify-center gap-6">
                        <a href="#" className="text-gray-400 hover:text-brand-blue transition-colors">
                            <Twitter className="w-5 h-5" />
                        </a>
                        <a href="#" className="text-gray-400 hover:text-brand-purple transition-colors">
                            <GitCommit className="w-5 h-5" />
                        </a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors">
                            <Globe className="w-5 h-5" />
                        </a>
                    </div>
                </div>

                <div className="mt-8 text-center text-xs text-gray-500">
                    © {new Date().getFullYear()} PollyGlot AI. All rights reserved.
                </div>
            </motion.div>
        </div>
    );
}
