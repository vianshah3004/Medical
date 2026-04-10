import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { ArrowRight, Terminal, Lock, Unlock } from 'lucide-react';
import { useMedicalAudio } from '../hooks/useMedicalAudio';
import './Home.css';

const StickySection = ({ title, subtitle, icon, color, direction = 'left', children, message, onHover }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end end"]
    });

    const opacity = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [0.5, 1, 1, 1]);
    const scale = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [0.95, 1, 1, 1]);
    const rotateX = useTransform(scrollYProgress, [0, 1], [direction === 'left' ? 10 : -10, 0]);

    return (
        <div ref={ref} className="sticky-section-container">
            <motion.div 
                className="sticky-content-wrap"
                style={{ opacity, scale, rotateX }}
            >
                <div className="story-content container">
                    <div className={`story-visual-wrap ${direction}`}>
                        <div className="story-glow" style={{ background: `radial-gradient(circle, ${color}44 0%, transparent 70%)` }}></div>
                        <motion.div 
                            className="story-icon-box"
                            onHoverStart={onHover}
                            animate={{ 
                                y: [0, -20, 0],
                                rotateY: [0, 180, 360],
                                boxShadow: [`0 0 20px ${color}44`, `0 0 50px ${color}88`, `0 0 20px ${color}44`]
                            }}
                            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                            style={{ color: color, borderColor: color }}
                        >
                            {icon}
                        </motion.div>
                    </div>
                    <div className="story-text-wrap">
                        <div className="section-meta" style={{ color: color }}>
                            <Terminal size={12} /> {message}
                        </div>
                        <h2 className="story-title" style={{ '--accent': color }}>{title}</h2>
                        <p className="story-subtitle">{subtitle}</p>
                        <div className="story-details">
                            {children}
                        </div>
                        <motion.button 
                            className="section-cta"
                            style={{ '--accent': color }}
                            onHoverStart={onHover}
                            whileHover={{ x: 10, backgroundColor: color, color: '#000' }}
                        >
                            {title.includes('Neuro') ? 'ANALYZE MRI' : 
                             title.includes('Retina') ? 'SCAN RETINA' : 
                             title.includes('Fracture') ? 'SKELETAL SCAN' : 'RUN ECG ANALYSIS'} 
                            <ArrowRight size={16} />
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const NeuralVisual = ({ color }) => (
    <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.img src="/assets/img/brain.png" alt="3D Brain Scan" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: `drop-shadow(0 0 15px ${color}) opacity(0.8) brightness(1.2)`, position: 'absolute', zIndex: 1 }} animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
        <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
            <motion.circle cx="150" cy="110" r="14" fill="#ff0055" filter="drop-shadow(0 0 15px #ff0055)" animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} />
            <motion.line x1="20" y1="20" x2="200" y2="20" stroke={color} strokeWidth="3" opacity="0.6" animate={{ y: [0, 180, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        </svg>
    </div>
);

const RetinaVisual = ({ color }) => (
    <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.img src="/assets/img/eye.png" alt="3D Retina Scan" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: `drop-shadow(0 0 15px ${color}) opacity(0.8) brightness(1.2)`, position: 'absolute', zIndex: 1 }} animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }} />
        <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
            <motion.circle cx="145" cy="110" r="8" fill="#ff0055" filter="drop-shadow(0 0 10px #ff0055)" animate={{ scale: [1, 2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity }} />
            <motion.path d="M 110 110 L 110 30 A 80 80 0 0 1 190 110 Z" fill={color} opacity="0.3" animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "110px 110px" }} />
        </svg>
    </div>
);

const BoneVisual = ({ color }) => (
    <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.img src="/assets/img/bone.png" alt="3D Bone Scan" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: `drop-shadow(0 0 15px ${color}) opacity(0.8) brightness(1.2)`, position: 'absolute', zIndex: 1 }} animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }} />
        <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
            <motion.path d="M 70 100 L 90 105 L 85 115 L 120 110" fill="none" stroke="#ff0055" strokeWidth="4" filter="drop-shadow(0 0 10px #ff0055)" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <motion.rect x="40" y="10" width="140" height="4" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} animate={{ y: [0, 180, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
        </svg>
    </div>
);

const LungsVisual = ({ color }) => (
    <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.img src="/assets/img/lungs.png" alt="3D Lungs Scan" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: `drop-shadow(0 0 15px ${color}) opacity(0.8) brightness(1.2)`, position: 'absolute', zIndex: 1 }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
        <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
            <motion.circle cx="110" cy="110" r="80" stroke={color} strokeWidth="1" fill="none" opacity="0.2" animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.1, 0.2] }} transition={{ duration: 3, repeat: Infinity }} />
            <motion.path d="M 60 110 Q 110 60 160 110" fill="none" stroke="#ff0055" strokeWidth="3" filter="drop-shadow(0 0 8px #ff0055)" animate={{ opacity: [0, 1, 0], pathLength: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} />
        </svg>
    </div>
);

const SkinVisual = ({ color }) => (
    <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.img src="/assets/img/skin.png" alt="3D Skin Scan" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: `drop-shadow(0 0 15px ${color}) opacity(0.8) brightness(1.2)`, position: 'absolute', zIndex: 1 }} animate={{ rotate: [0, 5, 0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} />
        <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute', top: 0, left: 0, zIndex: 2 }}>
            <motion.rect x="80" y="80" width="60" height="60" rx="10" fill="none" stroke="#ff0055" strokeWidth="2" animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
            <motion.line x1="0" y1="110" x2="220" y2="110" stroke={color} strokeWidth="2" opacity="0.4" animate={{ y: [-90, 90, -90] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
        </svg>
    </div>
);

const Home = () => {
    const navigate = useNavigate();
    const { playHeartbeat, playBeep } = useMedicalAudio();
    const [isBooted, setIsBooted] = useState(true);
    const [consoleMsg, setConsoleMsg] = useState("SYSTEM READY // IDLE");
    
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll();
    const scaleProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

    useEffect(() => {
        if (!isBooted) return;
        const heartTimer = setInterval(() => playHeartbeat(), 1500);
        return () => clearInterval(heartTimer);
    }, [isBooted, playHeartbeat]);

    useEffect(() => {
        const unsubscribe = scrollYProgress.on('change', v => {
            if (v < 0.15) setConsoleMsg("SYSTEM READY // IDLE");
            else if (v < 0.3) setConsoleMsg("ANALYZING NEURAL CORTEX... 94% CONFIDENCE");
            else if (v < 0.45) setConsoleMsg("MAPPING OCULAR VASCULATURE... SUCCESS");
            else if (v < 0.6) setConsoleMsg("DETECTING SKELETAL TRAUMA... SCANNING");
            else if (v < 0.75) setConsoleMsg("DECODING RHYTHM LOGIC... OPERATIONAL");
            else if (v < 0.9) setConsoleMsg("SCANNING PULMONARY TISSUE... ANALYZING");
            else setConsoleMsg("DERMATOSCOPIC CLASSIFICATION... READY");
        });
        return () => unsubscribe();
    }, [scrollYProgress]);

    const handleEntry = () => {
        if (isBooted) {
            playBeep(880, 0.2);
            navigate('/login');
        }
    };

    return (
        <div className={`home-page cinematic-theme ${!isBooted ? 'booting' : 'active'}`} ref={containerRef}>
            <section className="cinematic-hero">
                <div className="hero-bg-fx">
                    <div className="ecg-grid"></div>
                    <AnimatePresence>
                        <svg className="ecg-wave-svg takeover" viewBox="0 0 1000 200">
                            <motion.path
                                d="M 0 100 L 100 100 L 120 40 L 140 160 L 160 100 L 300 100 L 320 20 L 340 180 L 360 100 L 500 100 L 520 60 L 540 140 L 560 100 L 700 100 L 720 30 L 740 170 L 760 100 L 1000 100"
                                fill="transparent"
                                stroke="var(--primary)"
                                strokeWidth="3"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1, opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                        </svg>
                    </AnimatePresence>
                </div>

                <div className="hero-content container">
                    <motion.div animate={isBooted ? { opacity: 1, y: 0 } : { opacity: 0.5, y: 0 }} transition={{ duration: 1 }}>
                        <div className={`system-badge ${isBooted ? 'active' : ''}`}>
                            {isBooted ? <Unlock size={14} /> : <Lock size={14} />} 
                            {isBooted ? 'BIOMETRIC HANDSHAKE COMPLETE' : 'WAITING FOR SYSTEM STABILITY...'}
                        </div>
                        <h1 className="cinematic-title">
                            {"DIAGNO-SCOPE".split("").map((char, index) => (
                                <motion.span key={index} initial={{ opacity: 0, y: 20 }} animate={isBooted ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }} transition={{ delay: index * 0.05 }}>
                                    {char}
                                </motion.span>
                            ))}
                        </h1>
                        <motion.p className="cinematic-subtitle" animate={isBooted ? { opacity: 1 } : { opacity: 0 }}>
                            Advanced clinical diagnostics powered by distributed neural intelligence.
                        </motion.p>
                        <div className="hero-actions">
                            <motion.button 
                                className={`btn-glow-cyan ${!isBooted ? 'disabled' : ''}`}
                                onClick={handleEntry}
                                onHoverStart={() => isBooted && playBeep(660, 0.05)}
                                whileHover={isBooted ? { scale: 1.05, boxShadow: '0 0 30px #00f2ff' } : {}}
                                whileTap={isBooted ? { scale: 0.95 } : {}}
                                style={{ pointerEvents: isBooted ? 'auto' : 'none', cursor: isBooted ? 'pointer' : 'default' }}
                            >
                                SYSTEM ENTRY <ArrowRight size={18} />
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            </section>

            <StickySection title="NeuroScan AI" subtitle="Deep Neural Cortex Mapping" icon={<NeuralVisual color="#0066ff" />} color="#0066ff" direction="left" message="SEGMENTING CEREBRAL VOLUMES..." onHover={() => playBeep(220, 0.05)}>
                <div className="feature-pill">Glioblastoma ID</div><div className="feature-pill">Lobe Mapping</div>
                <p className="feature-description">Volumetric analysis localizing abnormalities with sub-millimeter precision.</p>
            </StickySection>

            <StickySection title="RetinaScan AI" subtitle="Ocular Vessel Architecture" icon={<RetinaVisual color="#ee00ff" />} color="#ee00ff" direction="right" message="MAPPING RETINAL LANDSCAPE..." onHover={() => playBeep(330, 0.05)}>
                <div className="feature-pill">DR Grades 0-4</div><div className="feature-pill">Aneurysm Detection</div>
                <p className="feature-description">Autonomous screening of fundus imaging for diabetic retinopathy indicators.</p>
            </StickySection>

            <StickySection title="Fracture AI" subtitle="Structural Integrity Scan" icon={<BoneVisual color="#00f2ff" />} color="#00f2ff" direction="left" message="SCANNING SKELETAL ALIGNMENT..." onHover={() => playBeep(550, 0.05)}>
                <div className="feature-pill">Trauma Localization</div><div className="feature-pill">Macro Fissure ID</div>
                <p className="feature-description">Rapid skeletal trauma detection across multi-axial X-ray captures.</p>
            </StickySection>

            <StickySection 
                title="CardiacScan AI" 
                subtitle="Rhythm Logic Engine" 
                icon={
                    <svg width="200" height="200" viewBox="0 0 200 200" className="ai-visual">
                        <motion.path
                            d="M 0 100 L 40 100 L 50 40 L 60 160 L 70 100 L 130 100 L 140 20 L 150 180 L 160 100 L 200 100"
                            fill="transparent"
                            stroke="#00ffa3"
                            strokeWidth="3"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                    </svg>
                } 
                color="#00ffa3" 
                direction="right" 
                message="DECODING RHYTHM LOGIC..." 
                onHover={() => playBeep(770, 0.05)}
            >
                <div className="feature-pill">Arrhythmia Logic</div><div className="feature-pill">PVC/LBBB Sync</div>
                <p className="feature-description">Turning raw ECG waveforms into structured clinical diagnostics instantly.</p>
            </StickySection>

            <StickySection title="PulmoScan AI" subtitle="Pulmonary Tissue Analysis" icon={<LungsVisual color="#00ffcc" />} color="#00ffcc" direction="left" message="SCANNING PULMONARY TISSUE..." onHover={() => playBeep(440, 0.05)}>
                <div className="feature-pill">Pneumonia Detection</div><div className="feature-pill">Opacity Scoring</div>
                <p className="feature-description">Automated detection of pulmonary abnormalities across standard chest radiographs.</p>
            </StickySection>

            <StickySection title="DermScan AI" subtitle="Dermatoscopic Classification" icon={<SkinVisual color="#ff6b00" />} color="#ff6b00" direction="right" message="DERMATOSCOPIC FOCUS..." onHover={() => playBeep(550, 0.05)}>
                <div className="feature-pill">Melanoma Screening</div><div className="feature-pill">Malignancy Risk</div>
                <p className="feature-description">High-precision skin lesion analysis using advanced dermatoscopic visual intelligence.</p>
            </StickySection>

            <section className="system-footer">
                <div className="container footer-grid">
                    <motion.div className="footer-brand" whileInView={{ opacity: 1, scale: 1 }} initial={{ opacity: 0, scale: 0.9 }}>
                        <h2>DIAGNO-SCOPE</h2><p>Clinical Intelligence, Redefined.</p>
                    </motion.div>
                    <div className="footer-cta">
                        <motion.button className="btn-primary large" onClick={() => navigate('/login')} whileHover={{ scale: 1.1, boxShadow: '0 0 50px #0066ff' }}>INITIALIZE SYSTEM</motion.button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
