import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntroAnimationProps {
    onComplete: () => void;
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
    const [phase, setPhase] = useState(0);

    useEffect(() => {
        // Phase 0: LEO CLUB PRESENTS (0s - 2.5s)
        const t1 = setTimeout(() => setPhase(1), 2500);
        // Phase 1: RISE AS ONE explosion (2.5s - 5.5s)
        const t2 = setTimeout(() => setPhase(2), 5500);
        // Complete intro (5.5s - 6s)
        const t3 = setTimeout(() => {
            onComplete();
        }, 6000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [onComplete]);

    // Ambient floating dust
    const particles = Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 2 + 2,
        delay: Math.random() * 1,
    }));

    // Dramatic explosion particles for "RISE AS ONE"
    // Creating a more intense burst with more particles
    const burstParticles = Array.from({ length: 60 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        // Pushing particles further out for a bigger explosion
        const distance = Math.random() * 80 + 30;
        return {
            id: i,
            x: 50 + Math.cos(angle) * distance,
            y: 50 + Math.sin(angle) * distance,
            size: Math.random() * 8 + 2,
            delay: Math.random() * 0.2, // slight random delay for organic feel
        };
    });

    return (
        <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black font-sans"
            initial={{ opacity: 1 }}
            animate={{ opacity: phase === 2 ? 0 : 1 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{ perspective: '1200px' }}
        >
            {/* Deep Space Background gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black opacity-90" />

            {/* Volumetric Top Lights */}
            <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] opacity-50 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at top, rgba(255,183,77,0.4) 0%, transparent 60%)',
                    filter: 'blur(50px)',
                    mixBlendMode: 'screen'
                }}
                animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.4, 0.6, 0.4],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Ambient floating particles */}
            {particles.map((p) => (
                <motion.div
                    key={`part-${p.id}`}
                    className="absolute rounded-full bg-yellow-500/50"
                    style={{
                        width: p.size,
                        height: p.size,
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        boxShadow: '0 0 8px 2px rgba(255, 183, 77, 0.5)',
                    }}
                    animate={{
                        y: [0, -40, 0],
                        x: [0, Math.random() * 30 - 15, 0],
                        opacity: [0, 0.9, 0],
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
                        initial={{ scale: 0.85, opacity: 0, filter: 'blur(15px)', rotateX: 25 }}
                        animate={{ scale: 1.05, opacity: 1, filter: 'blur(0px)', rotateX: 0 }}
                        exit={{ scale: 1.4, opacity: 0, filter: 'blur(12px)', transition: { duration: 0.8 } }}
                        transition={{ duration: 2, ease: 'easeOut' }}
                    >
                        <h1
                            className="text-4xl md:text-7xl font-black tracking-[0.25em] uppercase text-transparent bg-clip-text"
                            style={{
                                backgroundImage: 'linear-gradient(to bottom, #fffde7, #ffd700, #b8860b)',
                                WebkitBackgroundClip: 'text',
                                filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.9)) drop-shadow(0px 0px 30px rgba(255,215,0,0.5))',
                            }}
                        >
                            Leo Club <br className="md:hidden" />
                            <span className="text-2xl md:text-3xl tracking-[0.6em] font-light text-yellow-100/90 block mt-6 text-center" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                                PRESENTS
                            </span>
                        </h1>
                    </motion.div>
                )}

                {/* PHASE 1: RISE AS ONE */}
                {phase === 1 && (
                    <motion.div
                        key="rise"
                        className="relative z-20 flex items-center justify-center w-full h-full"
                        // Start much smaller and tilted back for a dramatic "fly in" effect
                        initial={{ scale: 0.3, rotateX: -40, opacity: 0, filter: 'blur(20px)' }}
                        // Overshoot scale slightly then settle, level out the rotation
                        animate={{ scale: [0.3, 1.15, 1.1], rotateX: [-40, 5, 0], opacity: 1, filter: 'blur(0px)' }}
                        exit={{ scale: 1.5, opacity: 0, filter: 'blur(15px)' }}
                        transition={{ duration: 2.2, times: [0, 0.6, 1], ease: 'circOut' }}
                    >
                        {/* Intense Background Flare */}
                        <motion.div
                            className="absolute w-[80vw] h-[80vw] md:w-[1000px] md:h-[500px] rounded-[100%] -z-10 mix-blend-screen"
                            style={{
                                background: 'radial-gradient(ellipse at center, rgba(56,189,248,0.4) 0%, rgba(37,99,235,0.1) 40%, transparent 70%)',
                                filter: 'blur(60px)'
                            }}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: [0, 1, 0.8], scale: [0.5, 1.2, 1] }}
                            transition={{ duration: 2 }}
                        />

                        <h1
                            className="text-6xl md:text-9xl font-black tracking-[0.15em] uppercase text-transparent bg-clip-text text-center leading-tight"
                            style={{
                                backgroundImage: 'linear-gradient(to bottom, #ffffff, #7dd3fc, #0284c7)',
                                WebkitTextStroke: '1.5px rgba(255,255,255,0.3)',
                                filter: 'drop-shadow(0px 15px 25px rgba(0,0,0,0.9)) drop-shadow(0px 0px 50px rgba(2,132,199,0.8)) drop-shadow(0px 0px 100px rgba(125,211,252,0.4))',
                            }}
                        >
                            RISE AS<br />ONE
                        </h1>

                        {/* High-impact explosion particles */}
                        {burstParticles.map((p) => (
                            <motion.div
                                key={`burst-${p.id}`}
                                className="absolute rounded-full shadow-[0_0_20px_4px_rgba(56,189,248,0.8)]"
                                style={{
                                    width: p.size,
                                    height: p.size,
                                    top: '50%',
                                    left: '50%',
                                    background: Math.random() > 0.5 ? '#7dd3fc' : '#ffffff' // Mix of bright blue and white
                                }}
                                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                                animate={{
                                    x: `${p.x - 50}vw`,
                                    y: `${p.y - 50}vh`,
                                    opacity: [1, 1, 0], // Stay visible longer before fading
                                    scale: [0, 2, 0.5],
                                }}
                                transition={{
                                    duration: 2.8,
                                    ease: "easeOut",
                                    delay: p.delay
                                }}
                            />
                        ))}

                        {/* Secondary Shockwave Ring */}
                        <motion.div
                            className="absolute top-1/2 left-1/2 rounded-full border-2 border-sky-400/50 -z-0"
                            initial={{ width: 0, height: 0, x: '-50%', y: '-50%', opacity: 1 }}
                            animate={{ width: '150vw', height: '150vw', opacity: 0, borderWidth: '0px' }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
