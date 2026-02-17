import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toWav from 'audiobuffer-to-wav';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Play, Download, Loader, Sparkles, FileText, Music, Trash2, Maximize2, X, ChevronRight } from 'lucide-react';
import { authAPI, axiosInstance as axios } from '../api/auth';
import VoiceSelector from './VoiceSelector';
import AudioVisualizer from './AudioVisualizer';
import ChatHistory from './ChatHistory';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

export default function Dashboard({ userPlan, onNavigate }) {

  // URL Search Params for state sync
  const [searchParams, setSearchParams] = useSearchParams();
  const showHistoryModal = searchParams.get('view') === 'history';

  // Local state
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(null);
  const [engine, setEngine] = useState('neural');
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

  // Engine-voice sync removed to support detailed selection in VoiceSelector

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
      console.log(`Fetched history page ${targetPage}:`, historyData.length, "records");

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

    // --- LANGUAGE VALIDATION ---
    // Check if text contains Devanagari (Hindi) characters
    const hasHindiChars = /[\u0900-\u097F]/.test(text);

    // Check if selected voice is an English voice (starts with 'en-')
    const isEnglishVoice = voice.startsWith('en-');

    if (hasHindiChars && isEnglishVoice) {
      alert("Oops! The voice 'Jenny (US)' (or other English voices) cannot read Hindi text. Please try selecting 'Swara (Hindi)' or 'Madhur (Hindi)' and try again.");
      return; // Stop generation
    }
    // ---------------------------

    setIsLoading(true);
    setAudioUrl(null);
    setError(null);

    try {
      const token = authAPI.getToken();
      const response = await axios.post(
        `${API_BASE_URL}/api/convert`,
        { text, voice_id: voice, engine },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 1800000 // 30 minutes
        }
      );

      // Add to history using the response data
      setCurrentConversionId(response.data.id);

      const newHistoryItem = {
        ...response.data,
        voice: response.data.voice_name || voice, // Use backend voice name or local state
        audio_url: response.data.audio_url // Ensure full URL if needed, though response might have relative
      };

      // Securely fetch the audio blob immediately so it's ready to play
      const secureUrl = await fetchSecureAudio(response.data.audio_url);
      if (secureUrl) {
        setAudioUrl(secureUrl);
      }

      try {
        await fetchHistory(true);
        await fetchUserInfo(); // Refresh credits
      } catch (historyError) {
        console.warn("Conversion successful, but failed to refresh history:", historyError);
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
    authAPI.logout();
    window.location.reload();
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

      {/* MAIN */}
      < main className="max-w-6xl mx-auto px-4 py-6 sm:py-10" >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

          {/* INPUT */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-[#1e293b]/60 border border-white/10 rounded-2xl p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
                <FileText className="text-brand-blue" />
                Text to Speech
              </h2>

              <div className="space-y-5">
                <VoiceSelector
                  selectedVoice={voice}
                  onSelect={setVoice}
                  selectedEngine={engine}
                  onEngineChange={setEngine}
                />

                <div>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Enter text to convert into speech..."
                    className="w-full h-32 sm:h-40 bg-black border border-white/10 rounded-xl p-3 sm:p-4 text-base sm:text-lg resize-none focus:ring-2 focus:ring-brand-purple"
                  />
                  <div className="text-xs text-gray-400 mt-1 text-right">
                    Credits Used: {creditsUsed} / {creditLimit}
                  </div>
                </div>

                <button
                  onClick={handleConvert}
                  disabled={isLoading || !text || !voice}
                  className={`w-full py-3 sm:py-4 rounded-xl font-bold flex justify-center items-center gap-2
                    ${isLoading || !text || !voice
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
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
                      Generate Mp3
                    </>
                  )}
                </button>
              </div >
            </div >
          </motion.div >

          {/* OUTPUT + HISTORY */}
          < div className="space-y-6" >

            {/* AUDIO */}
            < AnimatePresence >
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
              )
              }
            </AnimatePresence >

            {/* HISTORY */}
            < div className="bg-[#1e293b]/40 border border-white/5 rounded-2xl p-4 sm:p-6" >
              <h3 className="text-lg font-semibold mb-3">Recent Conversions</h3>

              {
                history.length === 0 && !loadingHistory ? (
                  <p className="text-gray-500 text-sm text-center py-6">
                    No history yet
                  </p>
                ) : (
                  <div
                    className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"
                    onScroll={(e) => {
                      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                      if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !loadingHistory) {
                        fetchHistory(false);
                      }
                    }}
                  >
                    {history.slice(0, 5).map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                      >
                        <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex flex-shrink-0 items-center justify-center text-xs">
                          MP3
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.text}</p>
                          <p className="text-xs text-gray-400">
                            {item.voice} • {item.created_at}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            const secureUrl = await fetchSecureAudio(item.audio_url);
                            if (secureUrl) {
                              setAudioUrl(secureUrl);
                              setCurrentConversionId(item.id);
                            }
                          }}
                          className="p-2 rounded-lg bg-brand-blue/20 hover:bg-brand-blue/40 transition-colors"
                          title="Play"
                        >
                          <Play className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                          title="View Details"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {loadingHistory && (
                      <div className="py-4 flex justify-center">
                        <Loader className="animate-spin w-5 h-5 text-brand-purple" />
                      </div>
                    )}

                    {!loadingHistory && history.length > 0 && (
                      <button
                        onClick={() => setSearchParams({ view: 'history' })}
                        className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        View All History
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              }
            </div >

          </div >
        </div >
      </main >

      {/* HISTORY MODAL */}
      < AnimatePresence >
        {showHistoryModal && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex justify-end">
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
                    <label className="text-xs text-gray-400">Date</label>
                    <p className="font-semibold">{selectedItem.created_at}</p>
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
