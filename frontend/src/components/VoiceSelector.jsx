import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Sparkles, Bot } from 'lucide-react';

const neuralVoices = [
    { id: 'Kajal', name: 'Kajal', gender: 'Female', lang: 'IN', flag: '🇮🇳', style: 'Natural & Expressive' },
];

const standardVoices = [
    { id: 'Aditi', name: 'Aditi', gender: 'Female', lang: 'IN', flag: '🇮🇳', style: 'Soft & Clear' },
    { id: 'Raveena', name: 'Raveena', gender: 'Female', lang: 'IN', flag: '🇮🇳', style: 'Clear & Professional' },
];

export default function VoiceSelector({ selectedVoice, onSelect, selectedEngine, onEngineChange }) {
    const [isOpen, setIsOpen] = useState(false);

    // Debugging: Log engine state to verify prop propagation
    console.log('VoiceSelector Rendered. Selected Engine:', selectedEngine);

    // Determine active voice list based on engine
    const currentVoices = selectedEngine === 'neural' ? neuralVoices : standardVoices;

    // Find currently selected voice object for display
    const selected = currentVoices.find(v => v.id === selectedVoice) || currentVoices[0];

    return (
        <div className="relative z-30 space-y-4">
            {/* Engine Toggle - Segmented Control */}
            <div className="bg-[#020617] p-1.5 rounded-2xl flex border border-white/10 relative">
                <button
                    onClick={() => onEngineChange('neural')}
                    style={{
                        backgroundColor: selectedEngine === 'neural' ? '#2563eb' : 'transparent',
                        color: selectedEngine === 'neural' ? 'white' : '#9ca3af'
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 relative overflow-hidden ring-1 ${selectedEngine === 'neural' ? 'ring-white/20 shadow-lg z-10' : 'ring-transparent hover:bg-white/5'}`}
                >
                    <Sparkles className={`w-4 h-4 mr-2 ${selectedEngine === 'neural' ? 'text-white' : 'text-gray-400'}`} />
                    Natural
                </button>
                <button
                    onClick={() => onEngineChange('standard')}
                    style={{
                        backgroundColor: selectedEngine === 'standard' ? '#2563eb' : 'transparent',
                        color: selectedEngine === 'standard' ? 'white' : '#9ca3af'
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 relative overflow-hidden ring-1 ${selectedEngine === 'standard' ? 'ring-white/20 shadow-lg z-10' : 'ring-transparent hover:bg-white/5'}`}
                >
                    <Bot className={`w-4 h-4 mr-2 ${selectedEngine === 'standard' ? 'text-white' : 'text-gray-400'}`} />
                    Standard
                </button>
            </div>



            {/* Voice Dropdown */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Select Voice</label>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between bg-[#1e293b] border border-white/10 rounded-2xl px-5 py-4 text-white hover:border-brand-blue/50 transition-all duration-200 group shadow-lg ${isOpen ? 'ring-2 ring-brand-blue/50 border-transparent' : ''}`}
                >
                    <div className="flex items-center gap-4">
                        <span className="text-3xl filter drop-shadow-md">{selected.flag}</span>
                        <div className="text-left">
                            <div className="font-bold text-white group-hover:text-brand-blue transition-colors">{selected.name}</div>
                            <div className="text-xs text-blue-200/70">{selected.style}</div>
                        </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-blue' : ''}`} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="min-w-full bg-gray-900 border border-white/10 rounded-2xl shadow-inner overflow-hidden ring-1 ring-white/5"
                        >
                            <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
                                {currentVoices.map((voice) => (
                                    <button
                                        key={voice.id}
                                        onClick={() => {
                                            onSelect(voice.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border
                                        ${selectedVoice === voice.id
                                                ? 'bg-brand-blue text-white border-brand-blue shadow-md'
                                                : 'hover:bg-white/5 border-transparent text-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-2xl">{voice.flag}</span>
                                            <div className="text-left">
                                                <div className={`font-bold ${selectedVoice === voice.id ? 'text-white' : 'text-gray-200'}`}>
                                                    {voice.name}
                                                </div>
                                                <div className={`text-xs ${selectedVoice === voice.id ? 'text-blue-100' : 'text-gray-500'}`}>{voice.style}</div>
                                            </div>
                                        </div>
                                        {selectedVoice === voice.id && (
                                            <div className="bg-white/20 p-1 rounded-full">
                                                <Check className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
