import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Play, Download, Loader, Sparkles, FileText, Music, Trash2, Maximize2, X } from 'lucide-react';
import { authAPI } from '../api/auth';
import VoiceSelector from './VoiceSelector';
import AudioVisualizer from './AudioVisualizer';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

export default function Dashboard() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('Kajal');
  const [engine, setEngine] = useState('neural');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloads, setDownloads] = useState([]);
  const [showDownloads, setShowDownloads] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    fetchDownloads();
    fetchHistory();
  }, []);

  const fetchDownloads = async () => {
    try {
      const token = authAPI.getToken();
      const response = await axios.get(`${API_BASE_URL}/api/downloads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDownloads(response.data);
    } catch (error) {
      console.error("Failed to fetch downloads:", error);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = authAPI.getToken();
      const response = await axios.get(`${API_BASE_URL}/api/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fix: Ensure data is an array before mapping
      const historyData = Array.isArray(response.data) ? response.data : [];
      console.log("Fetched history from DB:", historyData.length, "records");


      const formattedHistory = historyData.map(item => ({
        ...item,
        voice: item.voice_name || item.voice // fallback
      }));

      setHistory(formattedHistory);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      // Optional: setHistory([]) on error to be safe?
      // setHistory([]); // Let's keep existing history if fetch fails? Or clear it?
      // User says "populate exclusively from fetch", so maybe clear it.
    }
  };

  const [history, setHistory] = useState([]);

  useEffect(() => {
    setVoice(engine === 'neural' ? 'Kajal' : 'Aditi');
  }, [engine]);

  const handleConvert = async () => {
    if (!text) return;
    setIsLoading(true);
    setAudioUrl(null);

    try {
      const token = authAPI.getToken();
      const response = await axios.post(
        `${API_BASE_URL}/api/convert`,
        { text, voice_id: voice, engine },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Add to history using the response data
      const newHistoryItem = {
        ...response.data,
        voice: response.data.voice_name || voice, // Use backend voice name or local state
        audio_url: response.data.audio_url // Ensure full URL if needed, though response might have relative
      };

      setAudioUrl(response.data.audio_url); // Use the audio_url from the new history item

      try {
        await fetchHistory();
      } catch (historyError) {
        console.warn("Conversion successful, but failed to refresh history:", historyError);
        // Do NOT alert the user, as the main task (speech) worked.
      }

    } catch (error) {
      console.error("Dashboard handleConvert Error:", error);
      const errorMessage = error.response?.data?.detail || 'Conversion failed. Please try again.';

      // Don't alert if the conversion actually worked but history fetch failed
      // Check if we have a valid response despite the catch block?
      // Actually, if await fetchHistory() fails, it throws here.
      // We should isolate the history fetch error from the conversion error.

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
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <span className="text-lg sm:text-xl font-bold">PollyGlot</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <span className="hidden sm:block text-sm text-gray-400">
            {authAPI.getUserEmail()}
          </span>


          {/* DOWNLOADS DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setShowDownloads(!showDownloads)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:block">Downloads</span>
            </button>

            <AnimatePresence>
              {showDownloads && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-72 sm:w-80 bg-gray-800 border border-white/10 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto"
                >
                  <div className="p-3 border-b border-white/5 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
                    <h4 className="font-semibold text-sm">Downloaded Files</h4>
                    <span className="text-xs text-brand-purple">{downloads.length} files</span>
                  </div>

                  {downloads.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      No downloads yet
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {downloads.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg group">
                          <div className="w-8 h-8 rounded-full bg-brand-purple/20 flex flex-shrink-0 items-center justify-center text-xs">
                            MP3
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate text-white/90">{item.filename}</p>
                            <p className="text-[10px] text-gray-500">
                              {new Date(item.downloaded_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const fullUrl = item.audio_url.startsWith('http')
                                  ? item.audio_url
                                  : `${API_BASE_URL}${item.audio_url}`;

                                const response = await fetch(fullUrl);
                                if (!response.ok) throw new Error('Download failed');
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);

                                const a = document.createElement('a');
                                a.style.display = 'none';
                                a.href = url;
                                a.download = item.filename;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch (error) {
                                alert('Failed to download file.');
                              }
                            }}
                            className="p-1.5 rounded-md text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 opacity-0 group-hover:opacity-100 transition-all"
                            title="Download Again"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm('Are you sure you want to delete this file?')) return;
                              try {
                                const token = authAPI.getToken();
                                await axios.delete(`${API_BASE_URL}/api/downloads/${item.id}`, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                setDownloads(prev => prev.filter(d => d.id !== item.id));
                              } catch (error) {
                                alert('Failed to delete file.');
                              }
                            }}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
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

                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Enter text to convert into speech..."
                  className="w-full h-32 sm:h-40 bg-black border border-white/10 rounded-xl p-3 sm:p-4 text-base sm:text-lg resize-none focus:ring-2 focus:ring-brand-purple"
                />

                <button
                  onClick={handleConvert}
                  disabled={isLoading || !text}
                  className={`w-full py-3 sm:py-4 rounded-xl font-bold flex justify-center items-center gap-2
                    ${isLoading || !text
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gradient-to-r from-brand-blue to-brand-purple text-white'}
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
                      Generate Speech
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* OUTPUT + HISTORY */}
          <div className="space-y-6">

            {/* AUDIO */}
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
                    controls
                    src={audioUrl}
                    className="w-full mt-4"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />

                  <button
                    onClick={async () => {
                      if (!audioUrl) return;
                      try {
                        const response = await fetch(audioUrl);
                        if (!response.ok) throw new Error('Download failed');
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);

                        // Generate filename: Month-Date_Time (e.g., Feb-02_10-50-22.mp3)
                        const now = new Date();
                        const month = now.toLocaleString('en-US', { month: 'short' });
                        const date = String(now.getDate()).padStart(2, '0');
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        const seconds = String(now.getSeconds()).padStart(2, '0');
                        const fileName = `${month}-${date}_${hours}-${minutes}-${seconds}.mp3`;

                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);

                        // Save to backend
                        const token = authAPI.getToken();
                        await axios.post(`${API_BASE_URL}/downloads`, {
                          filename: fileName,
                          audio_url: audioUrl
                        }, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        fetchDownloads();

                      } catch (error) {
                        alert('Failed to download audio file. Please try again.');
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

            {/* HISTORY */}
            <div className="bg-[#1e293b]/40 border border-white/5 rounded-2xl p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-3">Recent Conversions</h3>

              {history.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">
                  No history yet
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center text-xs">
                        MP3
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.text}</p>
                        <p className="text-xs text-gray-400">
                          {item.voice} • {item.created_at}
                        </p>
                      </div>
                      <button
                        onClick={() => setAudioUrl(item.audio_url)}
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
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* DETAILS MODAL */}
      <AnimatePresence>
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
                    onClick={() => {
                      setAudioUrl(selectedItem.audio_url);
                      setSelectedItem(null);
                    }}
                    className="flex-1 bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Play Audio
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const fullUrl = selectedItem.audio_url.startsWith('http')
                          ? selectedItem.audio_url
                          : `${API_BASE_URL}${selectedItem.audio_url}`;
                        const response = await fetch(fullUrl);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = `detailed_download_${Date.now()}.mp3`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (e) {
                        alert('Download failed');
                      }
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
