import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Play, Download, Loader, Maximize2, Music, X, Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { authAPI, axiosInstance as axios } from '../api/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;

export default function ChatHistory({ onClose }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [audioUrl, setAudioUrl] = useState(null);

    // Initialize local state from URL params
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || '');

    // Re-use secure fetch helper
    const fetchSecureAudio = async (url) => {
        if (!url) return null;
        if (url.startsWith('blob:')) return url;

        try {
            const token = authAPI.getToken();
            const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

            const response = await fetch(fullUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!response.ok) {
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

    const fetchHistory = async (reset = false) => {
        if (isLoading) return; // Prevent double fetch
        if (!reset && !hasMore) return;

        try {
            if (reset) setIsLoading(true);
            const token = authAPI.getToken();
            const targetPage = reset ? 1 : page + 1;
            const limit = 20;

            // Get current filters from URL directly
            const currentSearch = searchParams.get('search') || '';
            const currentDate = searchParams.get('date') || '';

            const params = { page: targetPage, limit };
            if (currentSearch) params.search = currentSearch;
            if (currentDate) params.date = currentDate;

            const response = await axios.get(`${API_BASE_URL}/api/history`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            const historyData = Array.isArray(response.data) ? response.data : [];
            const formattedHistory = historyData.map(item => ({
                ...item,
                voice: item.voice_name || item.voice
            }));

            if (reset) {
                setHistory(formattedHistory);
                setPage(1); // Reset to page 1
            } else {
                setHistory(prev => [...prev, ...formattedHistory]);
                setPage(targetPage); // Update to new page
            }

            setHasMore(historyData.length === limit);

        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Sync state with URL params when they change (e.g. back button navigation)
    useEffect(() => {
        const s = searchParams.get('search') || '';
        const d = searchParams.get('date') || '';

        // Update inputs if they don't match URL (e.g. external navigation)
        // We only do this check to avoid overwriting user typing if debounce was used, 
        // but here we submit explicitly so it's fine.
        setSearchQuery(s);
        setSelectedDate(d);

        fetchHistory(true);
    }, [searchParams.get('search'), searchParams.get('date')]);

    // Handle Search Submit - Updates URL
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const current = Object.fromEntries(searchParams.entries());
        if (searchQuery) {
            current.search = searchQuery;
        } else {
            delete current.search;
        }
        // Ensure view is kept
        current.view = 'history';
        setSearchParams(current);
    };

    // Handle Date Change - Updates URL
    const handleDateChange = (e) => {
        const newDate = e.target.value;
        const current = Object.fromEntries(searchParams.entries());
        if (newDate) {
            current.date = newDate;
        } else {
            delete current.date;
        }
        current.view = 'history';
        setSearchParams(current);
    };


    return (
        <div className="fixed inset-0 z-50 bg-brand-dark overflow-y-auto w-full h-full flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-brand-dark/95 backdrop-blur-md border-b border-white/5 px-4 py-4 sm:px-8 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Music className="text-brand-purple w-5 h-5" />
                        Full History
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 py-8 w-full flex-1">

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search text..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#1e293b]/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-brand-purple outline-none transition-all placeholder:text-gray-500"
                        />
                    </form>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={handleDateChange}
                            className="bg-[#1e293b]/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-brand-purple outline-none transition-all text-gray-200 uppercase"
                        />
                        {selectedDate && (
                            <button
                                onClick={() => {
                                    const current = Object.fromEntries(searchParams.entries());
                                    delete current.date;
                                    current.view = 'history';
                                    setSearchParams(current);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-gray-400"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>


                {/* Audio Player Sticky */}
                {audioUrl && (
                    <div className="sticky top-4 z-20 mb-6 bg-[#1e293b] border border-brand-purple/30 rounded-2xl p-4 shadow-2xl animate-fade-in-up">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-brand-purple flex items-center gap-2">
                                <Music className="w-4 h-4" />
                                Now Playing
                            </h3>
                            <button onClick={() => setAudioUrl(null)} className="text-gray-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <audio controls src={audioUrl} className="w-full h-8" autoPlay />
                    </div>
                )}

                {/* List */}
                <div className="grid grid-cols-1 gap-4">
                    {isLoading && page === 1 && (
                        <div className="text-center py-10 text-gray-500">Loading history...</div>
                    )}

                    {!isLoading && history.length === 0 && (
                        <div className="text-center py-10 text-gray-500">No conversions found matching your filters.</div>
                    )}

                    {history.map((item) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={item.id}
                            className="bg-[#1e293b]/40 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-base text-gray-200 line-clamp-2 mb-1 text-left">{item.text}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded">
                                        <span className="w-2 h-2 rounded-full bg-brand-blue"></span>
                                        {item.voice}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(item.created_at).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <button
                                    onClick={async () => {
                                        const secureUrl = await fetchSecureAudio(item.audio_url);
                                        if (secureUrl) setAudioUrl(secureUrl);
                                    }}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue font-medium text-sm transition-colors"
                                >
                                    <Play className="w-4 h-4" />
                                    Play
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            const token = authAPI.getToken();
                                            const fullUrl = item.audio_url.startsWith('http') ? item.audio_url : `${API_BASE_URL}${item.audio_url}`;
                                            const response = await fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } });
                                            if (!response.ok) throw new Error("Download failed");
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.style.display = 'none';
                                            a.href = url;
                                            a.download = `download_${Date.now()}.mp3`;
                                            document.body.appendChild(a);
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                            document.body.removeChild(a);
                                        } catch (e) {
                                            alert("Download failed: " + e.message);
                                        }
                                    }}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    Download
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Load More */}
                {hasMore && !isLoading && history.length > 0 && (
                    <div className="mt-8 text-center pb-8 border-t border-white/5 pt-8">
                        <button
                            onClick={() => fetchHistory(false)}
                            className="bg-white/5 hover:bg-white/10 px-8 py-3 rounded-full text-sm font-medium transition-colors"
                        >
                            Load More History
                        </button>
                    </div>
                )}

                {isLoading && page > 1 && (
                    <div className="mt-8 text-center pb-8">
                        <span className="text-gray-500 text-sm">Loading more...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
