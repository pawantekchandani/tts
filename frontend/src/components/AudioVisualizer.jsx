import React from 'react';
import { motion } from 'framer-motion';

export default function AudioVisualizer({ isPlaying }) {
    // Generate random heights for the bars
    const bars = Array.from({ length: 40 }).map((_, i) => i);

    return (
        <div className="flex items-center justify-center gap-[2px] h-16 w-full overflow-hidden mask-linear-fade">
            {bars.map((i) => (
                <motion.div
                    key={i}
                    className="w-1 bg-gradient-to-t from-brand-blue to-brand-purple rounded-full"
                    animate={{
                        height: isPlaying ? [10, Math.random() * 40 + 20, 10] : 4,
                        opacity: isPlaying ? 1 : 0.3,
                    }}
                    transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: i * 0.05,
                    }}
                />
            ))}
        </div>
    );
}
