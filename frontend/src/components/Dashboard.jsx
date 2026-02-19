import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import toWav from 'audiobuffer-to-wav';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Play, Download, Loader, Sparkles, FileText, Music, Trash2, Maximize2, X, ChevronRight, ChevronDown, Filter, Search, Check, Mic } from 'lucide-react';
import { authAPI, axiosInstance as axios } from '../api/auth';
import AudioVisualizer from './AudioVisualizer';
import ChatHistory from './ChatHistory';
import { getAllVoicesFlat } from '../data/voiceData';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

export default function Dashboard({ userPlan, onNavigate }) {

  // URL Search Params for state sync
  const [searchParams, setSearchParams] = useSearchParams();
  const showHistoryModal = searchParams.get('view') === 'history';

  // Local state
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(null); // Stores voice ID
  // engine state is derived from selected voice or can be auto-selected. 
  // However, the conversion API requires 'engine'. We'll derive it from the selected voice object.

  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [currentConversionId, setCurrentConversionId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [speed, setSpeed] = useState(1.0);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const audioRef = useRef(null);

  // --- DROPDOWN STATE ---
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [voiceDropdownSearch, setVoiceDropdownSearch] = useState('');

  // --- FILTERS STATE ---
  const [languageSearch, setLanguageSearch] = useState('');
  const [selectedEngines, setSelectedEngines] = useState(new Set(['neural'])); // Default to Neural
  const [selectedGenders, setSelectedGenders] = useState(new Set(['Female', 'Male']));

  // --- VOICE DATA ---
  const allVoices = useMemo(() => getAllVoicesFlat(), []);

  // Computed Filtered Voices
  const filteredVoices = useMemo(() => {
    return allVoices.filter(v => {
      // 1. Language Search
      const matchLang = v.lang.toLowerCase().includes(languageSearch.toLowerCase()) ||
        v.name.toLowerCase().includes(languageSearch.toLowerCase());

      // 2. Engine Filter
      // Note: 'neural' matches Azure Neural. 'standard' matches AWS Polly (Standard).
      // We check if the voice's engine is in the selected set.
      const matchEngine = selectedEngines.has(v.engine);

      // 3. Gender Filter
      const matchGender = selectedGenders.has(v.gender);

      return matchLang && matchEngine && matchGender;
    });
  }, [allVoices, languageSearch, selectedEngines, selectedGenders]);

  // Handle Voice Selection
  const handleVoiceSelect = (voiceId) => {
    setVoice(voiceId);
  };

  // Toggle Filters
  const toggleEngine = (engine) => {
    const newSet = new Set(selectedEngines);
    if (newSet.has(engine)) newSet.delete(engine);
    else newSet.add(engine);
    // Prevent empty set? Maybe. user might want to clear all.
    setSelectedEngines(newSet);
  };

  const toggleGender = (gender) => {
    const newSet = new Set(selectedGenders);
    if (newSet.has(gender)) newSet.delete(gender);
    else newSet.add(gender);
    setSelectedGenders(newSet);
  };

  useEffect(() => {
    fetchHistory(true);
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const profile = await authAPI.getProfile();
      if (profile) {
        setCreditsUsed(profile.credits_used || 0);
        setCreditLimit(profile.credit_limit || 0);
      }
    } catch (err) {
      console.error("Failed to fetch user info:", err);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  const fetchHistory = async (reset = false) => {
    if (loadingHistory) return;
    if (!reset && !hasMore) return;

    setLoadingHistory(true);
    try {
      const token = authAPI.getToken();
      const targetPage = reset ? 1 : page + 1;
      const limit = 10;

      const response = await axios.get(`${API_BASE_URL}/api/history`, {
        params: { page: targetPage, limit },
        headers: { Authorization: `Bearer ${token}` }
      });

      const historyData = Array.isArray(response.data) ? response.data : [];

      const formattedHistory = historyData.map(item => ({
        ...item,
        voice: item.voice_name || item.voice
      }));

      if (reset) {
        setHistory(formattedHistory);
        setPage(1);
      } else {
        setHistory(prev => [...prev, ...formattedHistory]);
        setPage(targetPage);
      }

      setHasMore(historyData.length === limit);

    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Helper to fetch audio securely
  const fetchSecureAudio = async (url) => {
    if (!url) return null;
    if (url.startsWith('blob:')) return url; // Already processed

    try {
      const token = authAPI.getToken();
      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

      const response = await fetch(fullUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 403) throw new Error("You do not have permission to access this file.");
        if (response.status === 404) throw new Error("Audio file not found.");
        throw new Error("Failed to load audio.");
      }

      const blob = await response.blob();
      return window.URL.createObjectURL(blob);
    } catch (error) {
      console.error("Secure audio fetch failed:", error);
      alert(error.message);
      return null;
    }
  };

  const handleConvert = async () => {
    if (!text || !voice) return;

    // Get selected voice object to determine engine
    const selectedVoiceObj = allVoices.find(v => v.id === voice);
    if (!selectedVoiceObj) {
      alert("Invalid voice selected");
      return;
    }

    // --- LANGUAGE VALIDATION ---
    const hasHindiChars = /[\u0900-\u097F]/.test(text);
    const isEnglishVoice = selectedVoiceObj.lang.includes('English'); // Check lang name instead of prefix

    if (hasHindiChars && isEnglishVoice) {
      alert("Oops! The voice 'Jenny (US)' (or other English voices) cannot read Hindi text. Please try selecting 'Swara (Hindi)' or 'Madhur (Hindi)' and try again.");
      return;
    }
    // ---------------------------

    setIsLoading(true);
    setAudioUrl(null);

    try {
      const token = authAPI.getToken();

      const response = await axios.post(
        `${API_BASE_URL}/api/convert`,
        { text, voice_id: selectedVoiceObj.voice_id || voice, engine: selectedVoiceObj.engine }, // Pass derived engine
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 1800000
        }
      );

      setCurrentConversionId(response.data.id);

      const secureUrl = await fetchSecureAudio(response.data.audio_url);
      if (secureUrl) {
        setAudioUrl(secureUrl);
      }

      try {
        await fetchHistory(true);
        await fetchUserInfo();
      } catch (historyError) {
        console.warn("History refresh failed:", historyError);
      }

    } catch (error) {
      console.error("Dashboard handleConvert Error:", error);
      const errorMessage = error.response?.data?.detail || 'Conversion failed. Please try again.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      authAPI.logout();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white overflow-x-hidden">

      {/* NAVBAR */}
      <nav className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-4 border-b border-white/5 sticky top-0 z-50 bg-brand-dark/90 backdrop-blur">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onNavigate && onNavigate('home')}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="text-lg sm:text-xl font-bold">PollyGlot</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <span className="hidden sm:block text-sm text-gray-400">
            {authAPI.getUserEmail()}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase
            ${(userPlan || 'Basic').toLowerCase() === 'pro' ? 'bg-indigo-500' :
              (userPlan || 'Basic').toLowerCase() === 'plus' ? 'bg-purple-600' :
                'bg-slate-600'
            }
          `}>
            {userPlan || 'Free'}
          </span>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav >

      {/* MAIN LAYOUT (3 COLUMNS) */}
      < main className="max-w-[1600px] mx-auto px-4 py-6 sm:py-8" >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: FILTERS + HISTORY (4 COLS) */}
          <div className="lg:col-span-4 space-y-6">

            {/* 1. FILTERS SECTION */}
            <div className="bg-[#1e293b]/60 border border-white/10 rounded-2xl p-5">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-brand-blue" />
                Filters
              </h3>

              {/* Language Search */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Search Language</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={languageSearch}
                    onChange={(e) => setLanguageSearch(e.target.value)}
                    placeholder="e.g. English, Hindi..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm focus:ring-1 focus:ring-brand-blue outline-none"
                  />
                </div>
              </div>

              {/* Quality Checkboxes */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quality (Engine)</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedEngines.has('neural') ? 'bg-brand-blue border-brand-blue' : 'border-gray-600 group-hover:border-gray-400'}`}>
                      {selectedEngines.has('neural') && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" onChange={() => toggleEngine('neural')} checked={selectedEngines.has('neural')} />
                    <span className="text-sm text-gray-300">Neural (Azure)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedEngines.has('standard') ? 'bg-brand-blue border-brand-blue' : 'border-gray-600 group-hover:border-gray-400'}`}>
                      {selectedEngines.has('standard') && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" onChange={() => toggleEngine('standard')} checked={selectedEngines.has('standard')} />
                    <span className="text-sm text-gray-300">Standard (AWS)</span>
                  </label>
                </div>
              </div>

              {/* Gender Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Gender</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedGenders.has('Male') ? 'bg-brand-blue border-brand-blue' : 'border-gray-600 group-hover:border-gray-400'}`}>
                      {selectedGenders.has('Male') && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" onChange={() => toggleGender('Male')} checked={selectedGenders.has('Male')} />
                    <span className="text-sm text-gray-300">Male</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedGenders.has('Female') ? 'bg-brand-blue border-brand-blue' : 'border-gray-600 group-hover:border-gray-400'}`}>
                      {selectedGenders.has('Female') && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" onChange={() => toggleGender('Female')} checked={selectedGenders.has('Female')} />
                    <span className="text-sm text-gray-300">Female</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 2. RECENT CONVERSIONS HISTORY (Moved Here) */}
            <div className="bg-[#1e293b]/40 border border-white/5 rounded-2xl p-4">
              <h3 className="text-lg font-semibold mb-3">Recent Conversions</h3>
              {history.length === 0 && !loadingHistory ? (
                <p className="text-gray-500 text-sm text-center py-6">
                  No history yet
                </p>
              ) : (
                <div className="space-y-3">
                  {history.slice(0, 5).map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex flex-shrink-0 items-center justify-center text-xs">
                        <Play className="w-3 h-3 text-brand-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate font-medium text-gray-200">{item.text}</p>
                        <p className="text-xs text-gray-500 flex items-center justify-between">
                          <span>{item.voice}</span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => setSearchParams({ view: 'history' })}
                    className="w-full mt-2 py-2 text-xs text-brand-blue hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-2 border border-brand-blue/30"
                  >
                    See All History
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: VOICE DROPDOWN & INPUT (8 COLS) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Voice Selection Dropdown */}
            <div className="bg-[#1e293b]/60 border border-white/10 rounded-2xl p-4 sm:p-6 relative z-30">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-brand-purple" />
                Select Voice
              </h3>

              <div className="relative">
                <button
                  onClick={() => setIsVoiceOpen(!isVoiceOpen)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-brand-purple/50 transition-colors text-left"
                >
                  {voice ? (
                    (() => {
                      const v = allVoices.find(fv => fv.id === voice);
                      if (!v) return <span className="text-gray-400">Select a voice...</span>;
                      return (
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{v.flag}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{v.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide 
                                            ${v.engine === 'neural' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                {v.engine === 'neural' ? 'Neural' : 'Std'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">{v.lang} • {v.style}</p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <span className="text-gray-400">Select a voice...</span>
                  )}
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isVoiceOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* DROPDOWN MENU */}
                <AnimatePresence>
                  {isVoiceOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl p-3 max-h-[400px] overflow-hidden flex flex-col"
                    >
                      {/* Inner Search */}
                      <div className="relative mb-3 flex-shrink-0">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          value={voiceDropdownSearch}
                          onChange={(e) => setVoiceDropdownSearch(e.target.value)}
                          placeholder="Search specific voice..."
                          className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-1 focus:ring-brand-purple outline-none"
                          autoFocus
                        />
                      </div>

                      <div className="overflow-y-auto custom-scrollbar flex-1 space-y-1 pr-1">
                        {filteredVoices
                          .filter(v =>
                            !voiceDropdownSearch ||
                            v.name.toLowerCase().includes(voiceDropdownSearch.toLowerCase()) ||
                            v.style.toLowerCase().includes(voiceDropdownSearch.toLowerCase())
                          )
                          .map(v => (
                            <button
                              key={v.id}
                              onClick={() => {
                                handleVoiceSelect(v.id);
                                setIsVoiceOpen(false);
                                setVoiceDropdownSearch('');
                              }}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                                            ${voice === v.id ? 'bg-brand-purple/20 border border-brand-purple/30' : 'hover:bg-white/5 border border-transparent'}
                                        `}
                            >
                              <span className="text-xl flex-shrink-0">{v.flag}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className={`font-semibold ${voice === v.id ? 'text-white' : 'text-gray-300'}`}>{v.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide 
                                                    ${v.engine === 'neural' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                                    {v.engine === 'neural' ? 'Neural' : 'Std'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{v.lang} • {v.style} • {v.gender}</p>
                              </div>
                              {voice === v.id && <Check className="w-4 h-4 text-brand-purple" />}
                            </button>
                          ))}
                        {filteredVoices.length === 0 && (
                          <div className="text-center text-gray-500 py-4 text-sm">No voices found</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Text Input Area */}
            <div className="bg-[#1e293b]/60 border border-white/10 rounded-2xl p-4 sm:p-6">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Enter text to convert (select a voice above first)..."
                className="w-full h-40 bg-black border border-white/10 rounded-xl p-4 text-lg resize-none focus:ring-2 focus:ring-brand-purple outline-none"
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-500">
                  {text.length} characters
                </span>
                <span className="text-xs text-gray-400">
                  Credits Used: {creditsUsed} / {creditLimit}
                </span>
              </div>

              <button
                onClick={handleConvert}
                disabled={isLoading || !text || !voice}
                className={`w-full mt-4 py-4 rounded-xl font-bold flex justify-center items-center gap-2 text-lg
                      ${isLoading || !text || !voice
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40 transition-shadow'}
                    `}
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin w-5 h-5" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Audio
                  </>
                )}
              </button>
            </div>

            {/* AUDIO PLAYER (IF EXISTS) */}
            <AnimatePresence>
              {audioUrl && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#1e293b] border border-brand-purple/30 rounded-2xl p-4 sm:p-6"
                >
                  <h3 className="flex items-center gap-2 text-brand-purple font-semibold mb-3">
                    <Music className="w-5 h-5" />
                    Result
                  </h3>

                  <AudioVisualizer isPlaying={isPlaying} />

                  <audio
                    ref={audioRef}
                    controls
                    src={audioUrl}
                    className="w-full mt-4"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />

                  {/* Playback Speed Control */}
                  <div className="mt-4 bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-xs text-brand-gray font-medium uppercase tracking-wider">
                      <span>Slower (0.5x)</span>
                      <span className="text-white bg-brand-blue/20 px-2 py-1 rounded-md">Speed: {speed}x</span>
                      <span>Faster (2.0x)</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-blue hover:accent-brand-lightBlue transition-all"
                    />
                  </div>

                  <button
                    onClick={async () => {
                      if (!currentConversionId) {
                        alert("Cannot download: Conversion ID missing. Please regenerate.");
                        return;
                      }

                      setIsLoading(true);

                      try {
                        const token = authAPI.getToken();
                        const response = await fetch(`${API_BASE_URL}/api/download/${currentConversionId}`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.detail || 'Download failed');
                        }

                        let blob = await response.blob();
                        let fileName = `pollyglot_${new Date().getTime()}.mp3`;

                        // --- SPEED PROCESSING ---
                        if (speed !== 1.0) {
                          try {
                            const arrayBuffer = await blob.arrayBuffer();
                            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

                            const newDuration = audioBuffer.duration / speed;
                            const offlineCtx = new OfflineAudioContext(
                              audioBuffer.numberOfChannels,
                              Math.ceil(audioBuffer.sampleRate * newDuration),
                              audioBuffer.sampleRate
                            );

                            const source = offlineCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.playbackRate.value = speed;
                            source.connect(offlineCtx.destination);
                            source.start();

                            const renderedBuffer = await offlineCtx.startRendering();
                            const wavArrayBuffer = toWav(renderedBuffer);
                            blob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
                            fileName = fileName.replace('.mp3', `_${speed}x.wav`);
                          } catch (processError) {
                            console.error("Speed processing failed, downloading original:", processError);
                            alert("Failed to apply speed to download. Downloading original file.");
                          }
                        }

                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);

                      } catch (error) {
                        alert(`Download Error: ${error.message}`);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-brand-purple py-3 rounded-xl font-bold hover:bg-opacity-90 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download MP3
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </main >

      {/* HISTORY MODAL (Keep as overlay if needed) */}
      < AnimatePresence >
        {showHistoryModal && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex justify-end">
            {/* ... (Existing modal content) ... */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="w-full max-w-lg bg-brand-dark h-full shadow-2xl relative"
            >
              <ChatHistory onClose={() => setSearchParams({})} />
            </motion.div>
          </div>
        )
        }
      </AnimatePresence >

      {/* DETAILS MODAL */}
      < AnimatePresence >
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-lg">Conversion Details</h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Full Text</label>
                  <div className="mt-2 text-sm text-gray-200 bg-black/40 p-4 rounded-xl max-h-40 overflow-y-auto border border-white/5 whitespace-pre-wrap">
                    {selectedItem.text}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-xl">
                    <label className="text-xs text-gray-400">Voice</label>
                    <p className="font-semibold">{selectedItem.voice}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl">
                    <label className="text-xs text-gray-400">Engine</label>
                    <p className="font-semibold">{selectedItem.engine || 'Unknown'}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={async () => {
                      const secureUrl = await fetchSecureAudio(selectedItem.audio_url);
                      if (secureUrl) {
                        setAudioUrl(secureUrl);
                        setCurrentConversionId(selectedItem.id);
                        setSelectedItem(null);
                      }
                    }}
                    className="flex-1 bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Play Audio
                  </button>
                  <div className="flex-1"></div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence >
    </div >
  );
}
