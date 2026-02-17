import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Globe, Mic } from 'lucide-react';

const voiceData = [
    {
        lang: 'English (US)',
        code: 'US',
        flag: '🇺🇸',
        engine: 'neural',
        voices: [
            { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'Female', style: 'Conversational' },
            { id: 'en-US-GuyNeural', name: 'Guy', gender: 'Male', style: 'Professional' },
            { id: 'en-US-AriaNeural', name: 'Aria', gender: 'Female', style: 'Narration' },
            { id: 'en-US-DavisNeural', name: 'Davis', gender: 'Male', style: 'Casual' },
            { id: 'en-US-JaneNeural', name: 'Jane', gender: 'Female', style: 'Friendly' },
            { id: 'en-US-JasonNeural', name: 'Jason', gender: 'Male', style: 'Friendly' },
            { id: 'en-US-NancyNeural', name: 'Nancy', gender: 'Female', style: 'Cheerful' },
            { id: 'en-US-SaraNeural', name: 'Sara', gender: 'Female', style: 'Cheerful' },
            { id: 'en-US-TonyNeural', name: 'Tony', gender: 'Male', style: 'Professional' },
        ]
    },
    {
        lang: 'English (UK)',
        code: 'UK',
        flag: '🇬🇧',
        engine: 'neural',
        voices: [
            { id: 'en-GB-SoniaNeural', name: 'Sonia', gender: 'Female', style: 'Formal' },
            { id: 'en-GB-RyanNeural', name: 'Ryan', gender: 'Male', style: 'Clear' },
            { id: 'en-GB-LibbyNeural', name: 'Libby', gender: 'Female', style: 'Friendly' },
            { id: 'en-GB-AbbiNeural', name: 'Abbi', gender: 'Female', style: 'Story' },
            { id: 'en-GB-AlfNeural', name: 'Alfie', gender: 'Male', style: 'Story' },
            { id: 'en-GB-BellaNeural', name: 'Bella', gender: 'Female', style: 'Casual' },
            { id: 'en-GB-ElliotNeural', name: 'Elliot', gender: 'Male', style: 'News' },
            { id: 'en-GB-EthanNeural', name: 'Ethan', gender: 'Male', style: 'Casual' },
            { id: 'en-GB-HollieNeural', name: 'Hollie', gender: 'Female', style: 'Conversational' },
            { id: 'en-GB-MaisieNeural', name: 'Maisie', gender: 'Female', style: 'Child' },
            { id: 'en-GB-NoahNeural', name: 'Noah', gender: 'Male', style: 'Neutral' },
            { id: 'en-GB-OliverNeural', name: 'Oliver', gender: 'Male', style: 'Neutral' },
            { id: 'en-GB-OliviaNeural', name: 'Olivia', gender: 'Female', style: 'Professional' },
            { id: 'en-GB-ThomasNeural', name: 'Thomas', gender: 'Male', style: 'Formal' },
        ]
    },
    {
        lang: 'English (India)',
        code: 'IN',
        flag: '🇮🇳',
        engine: 'standard',
        voices: [
            { id: 'en-IN-NeerjaNeural', name: 'Neerja', gender: 'Female', style: 'Warm & Expressive' },
            { id: 'en-IN-PrabhatNeural', name: 'Prabhat', gender: 'Male', style: 'Clear' },
            { id: 'en-IN-KavyaNeural', name: 'Kavya', gender: 'Female', style: 'General' },
            { id: 'en-IN-KunalNeural', name: 'Kunal', gender: 'Male', style: 'General' },
            { id: 'en-IN-RehaanNeural', name: 'Rehaan', gender: 'Male', style: 'General' },
            { id: 'en-IN-ArjunNeural', name: 'Arjun', gender: 'Male', style: 'General' },
        ]
    },
    {
        lang: 'Hindi (India)',
        code: 'HI',
        flag: '🇮🇳',
        engine: 'standard',
        voices: [
            { id: 'hi-IN-SwaraNeural', name: 'Swara', gender: 'Female', style: 'Natural' },
            { id: 'hi-IN-MadhurNeural', name: 'Madhur', gender: 'Male', style: 'Professional' },
            { id: 'hi-IN-KavyaNeural', name: 'Kavya', gender: 'Female', style: 'General' },
            { id: 'hi-IN-KunalNeural', name: 'Kunal', gender: 'Male', style: 'General' },
            { id: 'hi-IN-RehaanNeural', name: 'Rehaan', gender: 'Male', style: 'General' },
        ]
    }
];

export default function VoiceSelector({ selectedVoice, onSelect, selectedEngine, onEngineChange }) {
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);

    // Find current language group based on selected voice
    // If selectedVoice is null, currentGroup will be undefined
    const currentGroup = voiceData.find(group =>
        group.voices.some(v => v.id === selectedVoice)
    );

    // Find current voice object
    const currentVoice = currentGroup?.voices.find(v => v.id === selectedVoice);

    const handleLanguageSelect = (group) => {
        setIsLangOpen(false);
        // Default to first voice of new language
        const newVoice = group.voices[0];
        onSelect(newVoice.id);

        // Update engine if needed
        if (group.engine !== selectedEngine) {
            onEngineChange(group.engine);
        }
    };

    return (
        <div className="relative z-30 grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Language Selection */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Select Language</label>
                <button
                    onClick={() => { setIsLangOpen(!isLangOpen); setIsVoiceOpen(false); }}
                    className={`w-full flex items-center justify-between bg-[#1e293b] border border-white/10 rounded-2xl px-5 py-4 text-white hover:border-brand-blue/50 transition-all duration-200 group shadow-lg ${isLangOpen ? 'ring-2 ring-brand-blue/50 border-transparent' : ''}`}
                >
                    {currentGroup ? (
                        <div className="flex items-center gap-3">
                            <div className="bg-brand-blue/20 p-2 rounded-lg">
                                <Globe className="w-5 h-5 text-brand-blue" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-white group-hover:text-brand-blue transition-colors">{currentGroup.lang}</div>
                                <div className="text-xs text-gray-400">Region: {currentGroup.code} {currentGroup.flag}</div>
                            </div>
                        </div>
                    ) : (
                        <span className="text-gray-400 font-medium">Choose a language...</span>
                    )}
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isLangOpen ? 'rotate-180 text-brand-blue' : ''}`} />
                </button>

                <AnimatePresence>
                    {isLangOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="absolute w-full z-50 bg-gray-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden ring-1 ring-white/5"
                        >
                            <div className="p-2 space-y-1">
                                {voiceData.map((group) => (
                                    <button
                                        key={group.lang}
                                        onClick={() => handleLanguageSelect(group)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border
                                        ${currentGroup?.lang === group.lang
                                                ? 'bg-brand-blue/10 text-white border-brand-blue/30'
                                                : 'hover:bg-white/5 border-transparent text-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{group.flag}</span>
                                            <span className={`font-medium ${currentGroup?.lang === group.lang ? 'text-brand-blue' : ''}`}>
                                                {group.lang}
                                            </span>
                                        </div>
                                        {currentGroup?.lang === group.lang && <Check className="w-4 h-4 text-brand-blue" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Voice Selection */}
            <div className={`relative ${!currentGroup ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-sm font-medium text-gray-400 mb-2 ml-1">Select Voice</label>
                <button
                    onClick={() => { setIsVoiceOpen(!isVoiceOpen); setIsLangOpen(false); }}
                    disabled={!currentGroup}
                    className={`w-full flex items-center justify-between bg-[#1e293b] border border-white/10 rounded-2xl px-5 py-4 text-white hover:border-brand-purple/50 transition-all duration-200 group shadow-lg ${isVoiceOpen ? 'ring-2 ring-brand-purple/50 border-transparent' : ''}`}
                >
                    {currentVoice ? (
                        <div className="flex items-center gap-3">
                            <div className="bg-brand-purple/20 p-2 rounded-lg">
                                <Mic className="w-5 h-5 text-brand-purple" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-white group-hover:text-brand-purple transition-colors">{currentVoice.name}</div>
                                <div className="text-xs text-gray-400">{currentVoice.style} • {currentVoice.gender}</div>
                            </div>
                        </div>
                    ) : (
                        <span className="text-gray-500 font-medium">Select Language First</span>
                    )}
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isVoiceOpen ? 'rotate-180 text-brand-purple' : ''}`} />
                </button>

                <AnimatePresence>
                    {isVoiceOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="absolute w-full z-40 bg-gray-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden ring-1 ring-white/5"
                        >
                            <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                {currentGroup?.voices.map((voice) => (
                                    <button
                                        key={voice.id}
                                        onClick={() => {
                                            onSelect(voice.id);
                                            setIsVoiceOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border
                                        ${selectedVoice === voice.id
                                                ? 'bg-brand-purple text-white border-brand-purple shadow-md'
                                                : 'hover:bg-white/5 border-transparent text-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="text-left">
                                                <div className={`font-bold ${selectedVoice === voice.id ? 'text-white' : 'text-gray-200'}`}>
                                                    {voice.name}
                                                </div>
                                                <div className={`text-xs ${selectedVoice === voice.id ? 'text-purple-100' : 'text-gray-500'}`}>
                                                    {voice.style} • {voice.gender}
                                                </div>
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
