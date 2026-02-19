import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Smile, Frown, Angry, Clock, X } from 'lucide-react';

export default function FloatingSelectionMenu({ visible, position, onMood, availableStyles = [] }) {
    if (!visible) return null;

    const menuRef = React.useRef(null);

    // Prevent menu from closing when clicking inside it
    const handleMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const style = {
        top: Math.max(10, position.top - 60) + 'px',
        left: position.left + 'px',
    };

    // Helper to get icon
    const getMoodIcon = (mood) => {
        const lower = mood.toLowerCase();
        if (lower.includes('cheerful') || lower.includes('happy') || lower.includes('excited')) return '😊';
        if (lower.includes('sad') || lower.includes('depress') || lower.includes('cry')) return '😢';
        if (lower.includes('angry') || lower.includes('shout')) return '😠';
        if (lower.includes('terrified') || lower.includes('fear')) return '😱';
        if (lower.includes('whisper')) return '🤫';
        if (lower.includes('hopeful')) return '🙏';
        if (lower.includes('empathetic') || lower.includes('friendly')) return '🤗';
        if (lower.includes('chat') || lower.includes('customer')) return '💬';
        if (lower.includes('news')) return '📰';
        return '✨'; // Default
    };

    return createPortal(
        <div
            ref={menuRef}
            onMouseDown={handleMouseDown}
            style={{
                ...style,
                zIndex: 9999,
                position: 'absolute',
            }}
            className="flex items-center gap-1 p-1.5 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in duration-200 max-w-[90vw] overflow-x-auto custom-scrollbar"
        >
            <div className="flex bg-black/20 rounded-lg p-1 gap-1">
                {availableStyles.length > 0 ? (
                    availableStyles.map(mood => (
                        <button
                            key={mood}
                            onClick={() => onMood(mood)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors group relative flex-shrink-0"
                            title={mood}
                        >
                            <span className="text-xl">{getMoodIcon(mood)}</span>
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none capitalize">
                                {mood}
                            </span>
                        </button>
                    ))
                ) : (
                    <span className="text-xs text-gray-500 px-2 py-1 flex items-center">No styles</span>
                )}
            </div>

        </div>,
        document.body
    );
}
