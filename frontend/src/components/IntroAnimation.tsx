import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntroAnimationProps {
    onComplete: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        // Phase 0: Black screen -> Leo Club Presents (0s - 3s)
        const t1 = setTimeout(() => setPhase(1), 3000);
        // Phase 1: Dissolve to Particles -> Together We can (3s - 5.5s)
        const t2 = setTimeout(() => setPhase(2), 5500);
        // Phase 2: Rise As One (5.5s - 8s)
        const t3 = setTimeout(() => setPhase(3), 8000);
        // Phase 3: Fade out and complete intro (8s - 8.5s)
        const t4 = setTimeout(() => {
            onComplete();
        }, 8500);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, [onComplete]);

    // Generate random particles
    const particles = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 2,
    }));

    // Generate dramatic "explosion" particles for the finale
    const burstParticles = Array.from({ length: 40 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 50 + 20;
        return {
            id: i,
            x: 50 + Math.cos(angle) * distance,
            y: 50 + Math.sin(angle) * distance,
            size: Math.random() * 6 + 2,
        };
    });

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black font-sans"
            initial={{ opacity: 1 }}
            animate={{ opacity: phase === 3 ? 0 : 1 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
            style={{ perspective: '1000px' }}
        >
            {/* Deep Space Background gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black opacity-80" />

            {/* Volumetric Top Lights */}
            <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-40 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at top, rgba(255,183,77,0.3) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                }}
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Ambient floating particles */}
            {particles.map((p) => (
                <motion.div
                    key={`part-${p.id}`}
                    className="absolute rounded-full bg-yellow-500/40"
                    style={{
                        width: p.size,
                        height: p.size,
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        boxShadow: '0 0 10px 2px rgba(255, 183, 77, 0.4)',
                    }}
                    animate={{
                        y: [0, -30, 0],
                        x: [0, Math.random() * 20 - 10, 0],
                        opacity: [0, 0.8, 0],
                    }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        delay: p.delay,
                        ease: 'easeInOut',
                    }}
                />
            ))}

            <AnimatePresence mode="wait">
                {/* PHASE 0: LEO CLUB PRESENTS */}
                {phase === 0 && (
                    <motion.div
                        key="leo"
                        className="relative z-10 flex flex-col items-center justify-center"
                        initial={{ scale: 0.8, opacity: 0, filter: 'blur(20px)', rotateX: 20 }}
                        animate={{ scale: 1.1, opacity: 1, filter: 'blur(0px)', rotateX: 0 }}
                        exit={{ scale: 1.5, opacity: 0, filter: 'blur(10px)', transition: { duration: 1 } }}
                        transition={{ duration: 2.5, ease: 'easeOut' }}
                    >
                        <h1
                            className="text-4xl md:text-6xl font-black tracking-[0.3em] uppercase text-transparent bg-clip-text"
                            style={{
                                backgroundImage: 'linear-gradient(to bottom, #fff7d6, #d4af37, #997a00)',
                                textShadow: `
                  0 4px 10px rgba(0,0,0,0.8),
                  0 10px 20px rgba(212,175,55,0.4),
                  0 0 40px rgba(212,175,55,0.2)
                `,
                            }}
                        >
                            Leo Club <br className="md:hidden" />
                            <span className="text-2xl md:text-4xl tracking-[0.5em] font-light text-yellow-100/80 block mt-4 text-center">
                                Presents
                            </span>
                        </h1>
                    </motion.div>
                )}

                {/* PHASE 1: TOGETHER WE CAN */}
                {phase === 1 && (
                    <motion.div
                        key="together"
                        className="absolute z-10 text-center"
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, filter: 'blur(10px)', scale: 1.2 }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                    >
                        <h2 className="text-3xl md:text-5xl font-bold tracking-[0.2em] text-white/90"
                            style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
                            TOGETHER WE CAN
                        </h2>
                    </motion.div>
                )}

                {/* PHASE 2: RISE AS ONE */}
                {phase === 2 && (
                    <motion.div
                        key="rise"
                        className="relative z-20 flex items-center justify-center w-full h-full"
                        initial={{ scale: 0.8, rotateX: -20, opacity: 0 }}
                        animate={{ scale: 1.05, rotateX: 5, opacity: 1 }}
                        exit={{ scale: 1.2, opacity: 0 }}
                        transition={{ duration: 2.5, ease: 'easeOut' }}
                    >
                        {/* Background Flare */}
                        <motion.div
                            className="absolute w-[60vw] h-[60vw] md:w-[800px] md:h-[400px] bg-blue-500/20 rounded-[100%] blur-[80px] -z-10"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1 }}
                        />

                        <h1
                            className="text-5xl md:text-8xl font-black tracking-widest uppercase text-transparent bg-clip-text"
                            style={{
                                backgroundImage: 'linear-gradient(to bottom, #ffffff, #80d4ff, #0088cc)',
                                textShadow: `
                  0px 10px 20px rgba(0,0,0,0.8),
                  0px 0px 40px rgba(0, 136, 204, 0.6),
                  0px 0px 80px rgba(212, 175, 55, 0.4)
                `,
                                WebkitTextStroke: '1px rgba(255,255,255,0.2)'
                            }}
                        >
                            RISE AS ONE
                        </h1>

                        {/* Slow motion explosion particles */}
                        {burstParticles.map((p) => (
                            <motion.div
                                key={`burst-${p.id}`}
                                className="absolute rounded-full bg-blue-400/80 shadow-[0_0_15px_3px_rgba(59,130,246,0.5)]"
                                style={{ width: p.size, height: p.size, top: '50%', left: '50%' }}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                                animate={{
                                    x: `${p.x - 50}vw`,
                                    y: `${p.y - 50}vh`,
                                    opacity: 0,
                                    scale: 1.5,
                                }}
                                transition={{ duration: 2.5, ease: 'easeOut' }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
