import React from 'react';
import { Sparkles, Twitter, Github, Linkedin, Mail, Heart } from 'lucide-react';

export default function Footer({ onNavigate }) {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[#0f172a] border-t border-white/10 pt-16 pb-8 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-purple/10 rounded-full blur-3xl opacity-20"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

                    {/* Brand Column */}
                    <div className="space-y-6">
                        <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => onNavigate && onNavigate('home')}
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                PollyGlot
                            </span>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Transforming text into lifelike speech with the power of advanced AI.
                            Create content that speaks to your audience in their language.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:bg-brand-blue/20 hover:text-brand-blue transition-all duration-300 group">
                                <Twitter className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:bg-brand-purple/20 hover:text-brand-purple transition-all duration-300 group">
                                <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:bg-pink-500/20 hover:text-pink-500 transition-all duration-300 group">
                                <Linkedin className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </a>
                        </div>
                    </div>

                    {/* Product Links */}
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-6">Product</h3>
                        <ul className="space-y-4">
                            <li>
                                <button
                                    onClick={() => onNavigate('tts')}
                                    className="text-gray-400 hover:text-brand-blue transition-colors text-sm"
                                >
                                    Text to Speech
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('voice-cloning')}
                                    className="text-gray-400 hover:text-brand-purple transition-colors text-sm"
                                >
                                    Voice Cloning
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('plans')}
                                    className="text-gray-400 hover:text-brand-blue transition-colors text-sm"
                                >
                                    Pricing & Plans
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('api')}
                                    className="text-gray-400 hover:text-brand-purple transition-colors text-sm"
                                >
                                    API Access
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-6">Company</h3>
                        <ul className="space-y-4">
                            <li>
                                <button
                                    onClick={() => onNavigate('about')}
                                    className="text-gray-400 hover:text-brand-blue transition-colors text-sm"
                                >
                                    About Us
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('contact')}
                                    className="text-gray-400 hover:text-brand-purple transition-colors text-sm"
                                >
                                    Contact
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('blog')}
                                    className="text-gray-400 hover:text-brand-blue transition-colors text-sm"
                                >
                                    Blog
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => onNavigate('careers')}
                                    className="text-gray-400 hover:text-brand-purple transition-colors text-sm"
                                >
                                    Careers
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h3 className="text-white font-semibold text-lg mb-6">Get in touch</h3>
                        <div className="space-y-4">
                            <a
                                href="mailto:support@pollyglot.com"
                                className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-brand-blue/20 transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <span className="text-sm">support@pollyglot.com</span>
                            </a>
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/5">
                                <p className="text-xs text-gray-400 mb-2">Subscribe to our newsletter</p>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-brand-purple outline-none"
                                    />
                                    <button className="bg-brand-purple hover:bg-brand-purple/80 text-white p-2 rounded-lg transition-colors">
                                        <Heart className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm">
                        © {currentYear} PollyGlot AI. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm">
                        <button className="text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</button>
                        <button className="text-gray-500 hover:text-gray-300 transition-colors">Terms of Service</button>
                        <button className="text-gray-500 hover:text-gray-300 transition-colors">Cookie Policy</button>
                    </div>
                </div>
            </div>
        </footer>
    );
}
