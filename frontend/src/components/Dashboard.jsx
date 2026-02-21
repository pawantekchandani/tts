import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import toWav from 'audiobuffer-to-wav';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Play, Download, Loader, Sparkles, FileText, Music, Trash2, Maximize2, X, ChevronRight, ChevronDown, Filter, Search, Check, Mic, Sliders, Settings, Clock, Menu } from 'lucide-react';
import { authAPI, axiosInstance as axios } from '../api/auth';
import AudioVisualizer from './AudioVisualizer';
import ChatHistory from './ChatHistory';
import { getAllVoicesFlat } from '../data/voiceData';
import MoodHighlightOverlay from './MoodHighlightOverlay';
import { getSelectionCoords } from '../utils/textUtils';

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

  // --- ADVANCED EDITOR STATE ---
  const textareaRef = useRef(null);
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });
  const [activeDropdown, setActiveDropdown] = useState(null); // 'style', 'voice', 'break'
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- PDF UPLOAD STATE ---
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pdfDragActive, setPdfDragActive] = useState(false);
  const pdfFileRef = useRef(null);
  const actionBarRef = useRef(null);

  // --- FLOATING MENU / SCROLL STATE ---
  const [textScrollPos, setTextScrollPos] = useState(0);

  // --- GLOBAL PROSODY STATE ---
  const [globalRate, setGlobalRate] = useState(0); // -50 to +50 (%)
  const [globalPitch, setGlobalPitch] = useState(0); // -12 to +12 (semitones)
  const [styleIntensity, setStyleIntensity] = useState(1.0); // 0.01 to 2.0
  const [isTuningOpen, setIsTuningOpen] = useState(false);

  // --- FILTERS STATE ---
  const [languageSearch, setLanguageSearch] = useState('');
  const [selectedEngines, setSelectedEngines] = useState('neural'); // Changed to single string for Radio behavior
  const [selectedGenders, setSelectedGenders] = useState(new Set(['Female', 'Male']));

  // --- VOICE DATA ---
  const allVoices = useMemo(() => getAllVoicesFlat(), []);

  // --- 1. VOICE STYLE CONFIGURATION MAP ---
  // Maps Azure Voice IDs to their supported styles
  const VOICE_CONFIG = {
    // English (US)
    'en-US-JennyNeural': ['assistant', 'chat', 'customerservice', 'newscast', 'angry', 'cheerful', 'sad', 'excited', 'friendly', 'terrified', 'shouting', 'whispering', 'hopeful'],
    'en-US-GuyNeural': ['newscast', 'angry', 'cheerful', 'sad', 'excited', 'friendly', 'terrified', 'shouting', 'whispering', 'hopeful'],
    'en-US-AriaNeural': ['chat', 'customerservice', 'narration-professional', 'newscast-casual', 'newscast-formal', 'cheerful', 'empathetic', 'angry', 'sad', 'excited', 'friendly', 'terrified', 'shouting', 'whispering', 'hopeful'],
    'en-US-DavisNeural': ['chat', 'angry', 'cheerful', 'sad', 'excited', 'friendly', 'terrified', 'shouting', 'whispering', 'hopeful'],
    'en-US-JaneNeural': ['angry', 'cheerful', 'sad', 'excited', 'friendly', 'terrified', 'shouting', 'whispering', 'hopeful'],
    'en-US-JasonNeural': ['angry', 'cheerful', 'sad', 'excited', 'friendly', 'terrified', 'shouting', 'whispering', 'hopeful'],
    'en-US-NancyNeural': ['angry', 'cheerful', 'sad', 'excited', 'friendly', 'terrified', 'shouting', 'whispering', 'hopeful'],
    'en-US-SaraNeural': ['angry', 'cheerful', 'sad', 'excited', 'friendly', 'terrified', 'shouting', 'whispering', 'hopeful'],
    'en-US-TonyNeural': ['angry', 'cheerful', 'sad', 'excited', 'friendly', 'terrified', 'shouting', 'whispering', 'hopeful'],

    // English (UK)
    'en-GB-SoniaNeural': ['cheerful', 'sad'],
    'en-GB-RyanNeural': ['cheerful', 'sad', 'chat'],

    // English (India)
    'en-IN-NeerjaNeural': ['empathetic', 'news', 'cheerful', 'sad'],
    'en-IN-PrabhatNeural': ['empathetic', 'news', 'cheerful', 'sad'],

    // Hindi (India)
    'hi-IN-SwaraNeural': ['cheerful', 'sad'],
    'hi-IN-MadhurNeural': ['cheerful', 'sad'],
  };

  const [availableStyles, setAvailableStyles] = useState([]);

  // --- UPDATE AVAILABLE STYLES WHEN VOICE CHANGES ---
  useEffect(() => {
    if (voice && VOICE_CONFIG[voice]) {
      setAvailableStyles(VOICE_CONFIG[voice]);
    } else {
      setAvailableStyles([]);
    }
  }, [voice]);

  // Computed Filtered Voices
  const filteredVoices = useMemo(() => {
    return allVoices.filter(v => {
      const matchLang = v.lang.toLowerCase().includes(languageSearch.toLowerCase()) ||
        v.name.toLowerCase().includes(languageSearch.toLowerCase());
      const matchEngine = selectedEngines === v.engine;
      const matchGender = selectedGenders.has(v.gender);
      return matchLang && matchEngine && matchGender;
    });
  }, [allVoices, languageSearch, selectedEngines, selectedGenders]);

  // Handle textarea scroll for overlay sync
  const handleTextareaScroll = (e) => {
    setTextScrollPos(e.target.scrollTop);
  };

  // Handle Selection Change (Update selection bounds)
  const handleSelectionChange = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    setSelectionRange({
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    });
  };

  // Handle Voice Selection
  const handleVoiceSelect = (voiceId) => {
    setVoice(voiceId);
  };

  // Toggle Filters (Now behaves as Radio)
  const toggleEngine = (engine) => {
    setSelectedEngines(engine);
  };

  const toggleGender = (gender) => {
    const newSet = new Set(selectedGenders);
    if (newSet.has(gender)) newSet.delete(gender);
    else newSet.add(gender);
    setSelectedGenders(newSet);
  };

  // Helper to render filters (used in both Sidebar and Mobile Drawer)
  const renderFilters = () => (
    <>
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Filter className="w-5 h-5 text-brand-blue" />
        Filters
      </h3>

      {/* Quality Radios */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quality (Engine)</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedEngines === 'neural' ? 'bg-brand-blue border-brand-blue' : 'border-gray-600 group-hover:border-gray-400'}`}>
              {selectedEngines === 'neural' && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
            </div>
            <input type="radio" name="engine" className="hidden" onChange={() => toggleEngine('neural')} checked={selectedEngines === 'neural'} />
            <span className="text-sm text-gray-300">Human Voice</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedEngines === 'standard' ? 'bg-brand-blue border-brand-blue' : 'border-gray-600 group-hover:border-gray-400'}`}>
              {selectedEngines === 'standard' && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
            </div>
            <input type="radio" name="engine" className="hidden" onChange={() => toggleEngine('standard')} checked={selectedEngines === 'standard'} />
            <span className="text-sm text-gray-300">Standard</span>
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
    </>
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionBarRef.current && !actionBarRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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



  // Insert Break from Toolbar (at cursor)
  const insertBreakAtCursor = (durationStr) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Use current cursor position or end of text if not focused/selected
    const start = textarea.selectionStart || text.length;
    const end = textarea.selectionEnd || text.length;

    const tag = ` [break:${durationStr}] `;

    // Insert at cursor
    const newText = text.substring(0, start) + tag + text.substring(end);

    setText(newText);
    setActiveDropdown(null);

    // Restore focus and move cursor after tag
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = start + tag.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle Inline Voice Change (at selection)
  const handleInlineVoiceChange = (voiceId) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = selectionRange.start;
    const end = selectionRange.end;
    const selectedText = text.substring(start, end);

    let newText;
    if (start === end) {
      // No selection: Wrap entire text
      if (!text) {
        newText = `[voice:${voiceId}]text here[/voice]`;
      } else {
        newText = `[voice:${voiceId}]${text}[/voice]`;
      }
    } else {
      // Wrap selection
      newText = text.substring(0, start) + `[voice:${voiceId}]` + selectedText + `[/voice]` + text.substring(end);
    }

    setText(newText);
    setActiveDropdown(null);

    // Focus back
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
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

    // DEBUG: Log payload to ensure tags are present
    console.log("Sending Conversion Payload:", {
      text,
      voice_id: selectedVoiceObj.voice_id || voice,
      engine: selectedVoiceObj.engine,
      style_degree: styleIntensity
    });

    try {
      const token = authAPI.getToken();

      const response = await axios.post(
        `${API_BASE_URL}/api/convert`,
        {
          text, // This state already contains [style:...] tags
          voice_id: selectedVoiceObj.voice_id || voice,
          engine: selectedVoiceObj.engine,
          style_degree: styleIntensity,
          prosody: {
            rate: `${globalRate >= 0 ? '+' : ''}${globalRate}%`,
            pitch: `${globalPitch >= 0 ? '+' : ''}${globalPitch}st`
          }
        },
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

  // --- PDF UPLOAD HANDLER ---
  const handlePdfUpload = async (file) => {
    if (!file) return;

    // If text area already has content, ask user
    if (text.trim()) {
      const replace = window.confirm(
        'Your text area already has content.\n\nClick OK to REPLACE it with the PDF text.\nClick Cancel to APPEND the PDF text to the end.'
      );
      setIsExtracting(true);
      try {
        const token = authAPI.getToken();
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(
          `${API_BASE_URL}/api/extract-pdf`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        const extracted = response.data.extracted_text;
        if (replace) {
          setText(extracted);
        } else {
          setText(prev => prev + '\n\n' + extracted);
        }
        setIsPdfModalOpen(false);
      } catch (err) {
        const msg = err.response?.data?.detail || 'Failed to extract PDF. Please try another file.';
        alert(`PDF Error: ${msg}`);
      } finally {
        setIsExtracting(false);
        if (pdfFileRef.current) pdfFileRef.current.value = '';
      }
    } else {
      setIsExtracting(true);
      try {
        const token = authAPI.getToken();
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(
          `${API_BASE_URL}/api/extract-pdf`,
          formData,
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
        );
        setText(response.data.extracted_text);
        setIsPdfModalOpen(false);
      } catch (err) {
        const msg = err.response?.data?.detail || 'Failed to extract PDF. Please try another file.';
        alert(`PDF Error: ${msg}`);
      } finally {
        setIsExtracting(false);
        if (pdfFileRef.current) pdfFileRef.current.value = '';
      }
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

          {/* Desktop Logout */}
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>

          {/* Mobile Hamburger Menu */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav >

      {/* MAIN LAYOUT (3 COLUMNS) */}
      <main className="max-w-[1600px] mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: FILTERS + HISTORY (4 COLS) */}
          <div className="lg:col-span-4 space-y-6">

            {/* 1. FILTERS SECTION */}
            {/* 1. FILTERS SECTION (Hidden on mobile) */}
            <div className="hidden md:block bg-[#1e293b]/60 border border-white/10 rounded-2xl p-5">
              {renderFilters()}
            </div>

            {/* 2. RECENT CONVERSIONS HISTORY (Moved Here) */}
            {/* 2. RECENT CONVERSIONS HISTORY (Moved Here) - Hidden on mobile, shown in drawer */}
            <div className="hidden md:block bg-[#1e293b]/40 border border-white/5 rounded-2xl p-4">
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

            {/* MOBILE FILTERS TOGGLE */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileFiltersOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1e293b] border border-white/10 rounded-xl w-full text-brand-blue font-bold shadow-lg"
              >
                <Filter className="w-5 h-5" />
                Filters ⚙️
              </button>
            </div>

            {/* Voice Selection Dropdown */}
            <div className="bg-[#1e293b]/60 border border-white/10 rounded-2xl p-4 sm:p-6 relative z-50">
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
                      className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl p-3 max-h-[400px] overflow-hidden flex flex-col z-[100]"
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

            {/* Text Input Area with Advanced Controls */}
            <div className="bg-[#1e293b]/60 border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">

              {/* Toolbar */}
              <div className="flex items-center justify-center gap-3 pb-3 border-b border-white/5 relative z-30">
                <div ref={actionBarRef} className="flex flex-wrap items-center justify-center gap-3 w-full pb-2 sm:pb-0 relative">
                  <div className="relative flex-shrink-0 w-32 sm:w-auto snap-start">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === 'style' ? null : 'style')}
                      disabled={!voice || availableStyles.length === 0}
                      className={`w-full flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors
                        ${!voice || availableStyles.length === 0
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-brand-purple/20 text-brand-purple hover:bg-brand-purple/30'}
                      `}
                    >
                      <Sparkles className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">Style</span>
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    </button>

                    {/* Style Dropdown */}
                    <AnimatePresence>
                      {activeDropdown === 'style' && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute top-full left-0 mt-2 w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                        >
                          {availableStyles.map((style) => (
                            <button
                              key={style}
                              onClick={() => {
                                const start = selectionRange.start;
                                const end = selectionRange.end;

                                // Clean style name for display (uppercase first letter)
                                const displayStyle = style.charAt(0).toUpperCase() + style.slice(1);

                                let newText = '';
                                if (start === end) {
                                  // No selection: Wrap entire text
                                  if (!text) {
                                    newText = `[style:${style}]text here[/style]`;
                                  } else {
                                    newText = `[style:${style}]${text}[/style]`;
                                  }
                                } else {
                                  // Wrap selection
                                  const selectedText = text.substring(start, end);
                                  newText = text.substring(0, start) + `[style:${style}]` + selectedText + `[/style]` + text.substring(end);
                                }

                                setText(newText);
                                setActiveDropdown(null);

                                // Focus back
                                setTimeout(() => {
                                  if (textareaRef.current) {
                                    textareaRef.current.focus();
                                  }
                                }, 0);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white capitalize transition-colors"
                            >
                              {style}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Change Voice Dropdown */}
                  <div className="relative flex-shrink-0 w-32 sm:w-auto snap-start">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === 'voice' ? null : 'voice')}
                      className="w-full flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                    >
                      <span className="flex-shrink-0">🗣️</span>
                      <span className="truncate">Voice</span>
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    </button>

                    <AnimatePresence>
                      {activeDropdown === 'voice' && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute top-full left-0 mt-2 w-56 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                        >
                          {filteredVoices.length > 0 ? (
                            filteredVoices.map((v) => (
                              <button
                                key={v.id}
                                onClick={() => handleInlineVoiceChange(v.id)}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex items-center justify-between"
                              >
                                <span>{v.name} ({v.gender})</span>
                                {voice === v.id && <span className="text-[10px] bg-brand-purple/20 text-brand-purple px-1.5 py-0.5 rounded uppercase font-bold">Current</span>}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-xs text-gray-500 text-center">No voices found</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Break Dropdown */}
                  <div className="relative flex-shrink-0 w-32 sm:w-auto snap-start">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === 'break' ? null : 'break')}
                      className="w-full flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                    >
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">Break</span>
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    </button>

                    <AnimatePresence>
                      {activeDropdown === 'break' && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute top-full left-0 mt-2 w-32 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                        >
                          {['1000ms', '2000ms', '3000ms', '4000ms', '5000ms'].map((duration) => (
                            <button
                              key={duration}
                              onClick={() => insertBreakAtCursor(duration)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors flex justify-between"
                            >
                              {parseInt(duration) / 1000}s
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Upload PDF Button */}
                  <button
                    onClick={() => setIsPdfModalOpen(true)}
                    className="flex-shrink-0 w-32 sm:w-auto flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 snap-start"
                  >
                    <FileText className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">PDF</span>
                  </button>

                  <span className="text-[10px] text-gray-500 uppercase tracking-widest hidden sm:inline">
                    {availableStyles.length > 0 ? "Select text to apply styles" : "Styles not available for this voice"}
                  </span>
                </div>
              </div>

              {/* Text Area Container with Overlay */}
              <div className="relative w-full h-40 group z-10">
                {/* Visual Feedback Overlay */}
                <MoodHighlightOverlay
                  text={text}
                  scrollPos={textScrollPos}
                />

                {/* Main Textarea */}
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onScroll={handleTextareaScroll}
                  onMouseUp={handleSelectionChange}
                  onKeyUp={handleSelectionChange}
                  onBlur={() => {
                    // check if clicking menu? handled by mousedown preventDefault on menu
                    // small delay to allow click events to register if needed
                    setTimeout(() => {
                      // checks document.activeElement? 
                      // Actually we rely on the menu logic to not steal focus.
                      // But if user clicks 'background', we want to hide.
                    }, 100);
                  }}
                  onSelect={(e) => {
                    // This is redundant with onMouseUp/KeyUp but good for safety
                    setSelectionRange({
                      start: e.target.selectionStart,
                      end: e.target.selectionEnd
                    });
                  }}
                  placeholder="Enter text to convert (select a voice above first)..."
                  className="absolute inset-0 w-full h-full bg-transparent border border-white/10 rounded-xl p-4 text-lg resize-none focus:ring-2 focus:ring-brand-purple outline-none font-mono text-white caret-pink-500 z-10 leading-normal"
                  style={{ lineHeight: '1.5' }} // Explicit line height to match overlay
                />
              </div>

              {/* Character & Credit Counts (Moved below Text Area) */}
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-gray-500 font-medium">
                  {text.length} characters
                </span>
                <span className="text-xs text-gray-400 font-medium bg-black/20 px-2 py-1 rounded-md border border-white/5">
                  Credits: {creditsUsed} / {creditLimit}
                </span>
              </div>



              {/* Audio Tuning Section */}
              <div className="space-y-3 pt-2">
                {/* Mobile Tuning Toggle */}
                <button
                  onClick={() => setIsTuningOpen(!isTuningOpen)}
                  className="w-full flex md:hidden items-center justify-between p-3 bg-black/30 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <Sliders className="w-4 h-4 text-brand-blue" />
                    ⚙️ Advanced Audio Tuning
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isTuningOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Sliders Container */}
                <div className={`${isTuningOpen ? 'block' : 'hidden'} md:grid grid-cols-1 sm:grid-cols-3 gap-4`}>
                  {/* Style Intensity Slider */}
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-pink-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Intensity
                      </label>
                      <span className="text-xs font-mono text-white bg-pink-500/10 px-1.5 py-0.5 rounded">
                        {styleIntensity}
                      </span>
                    </div>
                    <input
                      type="range" min="0.1" max="2.0" step="0.1"
                      value={styleIntensity}
                      onChange={(e) => setStyleIntensity(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-pink-500"
                    />
                  </div>

                  {/* Speed Slider */}
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-brand-blue font-bold uppercase tracking-wider flex items-center gap-1">
                        <Sliders className="w-3 h-3" /> Rate
                      </label>
                      <span className="text-xs font-mono text-white bg-brand-blue/10 px-1.5 py-0.5 rounded">
                        {globalRate >= 0 ? '+' : ''}{globalRate}%
                      </span>
                    </div>
                    <input
                      type="range" min="-50" max="50" step="1"
                      value={globalRate}
                      onChange={(e) => setGlobalRate(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-brand-blue"
                    />
                  </div>

                  {/* Pitch Slider */}
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-brand-purple font-bold uppercase tracking-wider flex items-center gap-1">
                        <Music className="w-3 h-3" /> Pitch
                      </label>
                      <span className="text-xs font-mono text-white bg-brand-purple/10 px-1.5 py-0.5 rounded">
                        {globalPitch >= 0 ? '+' : ''}{globalPitch}st
                      </span>
                    </div>
                    <input
                      type="range" min="-12" max="12" step="1"
                      value={globalPitch}
                      onChange={(e) => setGlobalPitch(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-brand-purple"
                    />
                  </div>
                </div>
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

      {/* MOBILE FILTERS DRAWER */}
      <AnimatePresence>
        {isMobileFiltersOpen && (
          <div className="fixed inset-0 z-[60] flex md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFiltersOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-[300px] h-full bg-[#1e293b] border-r border-white/10 p-6 overflow-y-auto shadow-2xl z-10"
            >
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {renderFilters()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE MENU DRAWER (History + Logout) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[60] flex justify-end md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-[300px] h-full bg-[#1e293b] border-l border-white/10 p-6 overflow-y-auto shadow-2xl z-10 flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-purple">
                  Menu
                </h3>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* User Info Mobile */}
              <div className="mb-6 pb-6 border-b border-white/10">
                <p className="text-sm text-gray-400 mb-2">Signed in as</p>
                <p className="font-semibold text-white break-all mb-2">{authAPI.getUserEmail()}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="uppercase font-bold tracking-wider">Plan: {userPlan}</span>
                </div>
              </div>

              {/* Mobile History */}
              <div className="flex-1 overflow-y-auto custom-scrollbar mb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Conversions</h3>
                {history.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No history yet</p>
                ) : (
                  <div className="space-y-3">
                    {history.slice(0, 10).map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedItem(item);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex flex-shrink-0 items-center justify-center text-xs">
                          <Play className="w-3 h-3 text-brand-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate font-medium text-gray-200">{item.text}</p>
                          <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setSearchParams({ view: 'history' });
                  }}
                  className="w-full mt-4 py-2 text-xs text-brand-blue hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-2 border border-brand-blue/30"
                >
                  See All History
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Mobile Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-colors font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* PDF UPLOAD MODAL */}
      <AnimatePresence>
        {isPdfModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  PDF to Text
                </h3>
                <button
                  onClick={() => { setIsPdfModalOpen(false); setPdfDragActive(false); }}
                  disabled={isExtracting}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {isExtracting ? (
                  /* Loading State */
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                    <p className="text-gray-300 font-medium">Extracting text from PDF...</p>
                    <p className="text-gray-500 text-xs">This may take a moment for large files</p>
                  </div>
                ) : (
                  /* Drag & Drop Zone */
                  <div
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setPdfDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setPdfDragActive(false); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setPdfDragActive(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handlePdfUpload(file);
                    }}
                    onClick={() => pdfFileRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-4 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                      ${pdfDragActive
                        ? 'border-emerald-400 bg-emerald-500/10 scale-[1.02]'
                        : 'border-white/20 bg-white/5 hover:border-emerald-400/50 hover:bg-emerald-500/5'
                      }
                    `}
                  >
                    {/* Hidden file input */}
                    <input
                      ref={pdfFileRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file);
                      }}
                    />

                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${pdfDragActive ? 'bg-emerald-500/20' : 'bg-white/5'
                      }`}>
                      <FileText className={`w-8 h-8 transition-colors ${pdfDragActive ? 'text-emerald-400' : 'text-gray-400'
                        }`} />
                    </div>

                    <div className="text-center">
                      <p className={`font-semibold text-base transition-colors ${pdfDragActive ? 'text-emerald-300' : 'text-gray-200'
                        }`}>
                        {pdfDragActive ? 'Drop it here!' : 'Drag & Drop your PDF here'}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">or <span className="text-emerald-400 underline underline-offset-2">Click to Browse</span></p>
                    </div>

                    <p className="text-gray-600 text-xs">Supported format: PDF only</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div >
  );
}
