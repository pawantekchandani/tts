import React, { useRef, useEffect } from 'react';

export default function MoodHighlightOverlay({ text, scrollPos, width }) {
    const containerRef = useRef(null);

    // Sync scroll
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = scrollPos;
        }
    }, [scrollPos]);

    // Regex to parse tags
    // Matches: [style:mood]content[/style] OR [break:...]
    // We need to split the text and wrap parts.

    const renderText = () => {
        if (!text) return null;

        // Split by tags.
        // We want to capture the whole tag block [style:...]...[/style] or [break:...]
        // The previous implementation used simple regex. Let's make it robust.
        // NOTE: Nested tags are not supported by this simple regex, assuming flat structure for now.

        const parts = [];
        let lastIndex = 0;

        // Regex for style blocks: \[style:(\w+)\](.*?)\[/style\]
        // Regex for breaks: \[break:\d+ms\]

        // Combined regex
        const regex = /(\[style:(?:cheerful|sad|angry)\][\s\S]*?\[\/style\])|(\[break:\d+ms\])/gi;

        let match;
        while ((match = regex.exec(text)) !== null) {
            // Push text before match
            if (match.index > lastIndex) {
                parts.push(<span key={lastIndex}>{text.substring(lastIndex, match.index)}</span>);
            }

            const fullMatch = match[0];
            const isBreak = match[2] !== undefined;

            if (isBreak) {
                parts.push(
                    <span key={match.index} className="mood-break mx-1">
                        {fullMatch}
                    </span>
                );
            } else {
                // Style match
                // Extract mood
                const moodMatch = fullMatch.match(/\[style:(\w+)\]/);
                const mood = moodMatch ? moodMatch[1].toLowerCase() : 'default';

                parts.push(
                    <span key={match.index} className={`mood-highlight mood-${mood}`}>
                        {fullMatch}
                    </span>
                );
            }

            lastIndex = regex.lastIndex;
        }

        // Push remaining text
        if (lastIndex < text.length) {
            parts.push(<span key={lastIndex}>{text.substring(lastIndex)}</span>);
        }

        return parts;
    };

    return (
        <div
            ref={containerRef}
            aria-hidden="true"
            className="absolute inset-0 p-4 text-lg font-mono whitespace-pre-wrap break-words pointer-events-none text-transparent overflow-hidden"
            style={{
                zIndex: 0,
                // Ensure styles match the textarea exactly
                lineHeight: '1.5', // Tailwind default for text-lg usually? Check Dashboard.
                // Dashboard uses text-lg, which is 1.125rem line-height 1.75rem usually.
            }}
        >
            {renderText()}
            {/* Add a trailing space to ensure height checks works if ends with newline? */}
            <span className="invisible">.</span>
        </div>
    );
}
