import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Target, Shield, Cpu, Activity, Link, Users, Terminal } from 'lucide-react';
import './About.css';

const AboutStickySection = ({ title, subtitle, icon, color, direction = 'left', children }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end end"]
    });

    const opacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0.95, 1, 1, 0.95]);
    const rotateX = useTransform(scrollYProgress, [0, 1], [direction === 'left' ? 10 : -10, direction === 'left' ? -10 : 10]);

    return (
        <div ref={ref} className="about-sticky-container">
            <motion.div className="sticky-content-wrap" style={{ opacity, scale, rotateX }}>
                <div className={`about-story-content ${direction}`}>
                    <div className="story-visual">
                        <div className="story-glow" style={{ background: `radial-gradient(circle, ${color}44 0%, transparent 70%)` }}></div>
                        <motion.div 
                            className="story-icon"
                            animate={{ y: [0, -20, 0], rotateY: [0, 180, 360], boxShadow: [`0 0 20px ${color}44`, `0 0 50px ${color}88`, `0 0 20px ${color}44`] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                            style={{ color: color, borderColor: color }}
                        >
                            {icon}
                        </motion.div>
                    </div>
                    <div className="story-text">
                        <div className="section-meta" style={{ color: color }}><Terminal size={14} style={{marginRight: 6}}/> SYSTEM RECORD</div>
                        <h2 style={{ color: color }}>{title}</h2>
                        <h3>{subtitle}</h3>
                        <div className="story-desc">{children}</div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const About = () => {
    return (
        <div className="about-page">
            <div className="about-hero">
                <h1 className="about-title">PROJECT ORIGIN</h1>
                <p className="about-subtitle">The genesis of Diagno-Scope Core Online</p>
            </div>
            
            <div className="about-story-wrapper">
                <AboutStickySection 
                    title="CASE MANAGEMENT" 
                    subtitle="Structured Data Ingestion" 
                    icon={<Target size={60} />} 
                    color="#00f2ff" 
                    direction="left"
                >
                    The platform enables users to create and manage diagnostic cases, upload medical images, and view detailed analysis results through a structured array interface.
                </AboutStickySection>

                <AboutStickySection 
                    title="AI INFERENCE ENGINE" 
                    subtitle="Neural Cognitive Subsystem" 
                    icon={<Cpu size={60} />} 
                    color="#b000ff" 
                    direction="right"
                >
                    AI-assisted predictions are presented alongside visual explainability features, confidence scores, and differential diagnosis indicators to support clinical interpretation while maintaining operational transparency.
                </AboutStickySection>

                <AboutStickySection 
                    title="SYSTEM SECURITY" 
                    subtitle="Encrypted Data Vault" 
                    icon={<Shield size={60} />} 
                    color="#00ff88" 
                    direction="left"
                >
                    All diagnostic data, case metadata, and reports are securely stored using heavily encrypted cloud infrastructure, ensuring reliable data management, scalability, and controlled access.
                </AboutStickySection>

                <AboutStickySection 
                    title="DIAGNOSTIC BREADTH" 
                    subtitle="Multi-Modality Analysis" 
                    icon={<Activity size={60} />} 
                    color="#ff6b00" 
                    direction="right"
                >
                    From Neuronal analysis and Cardiac rhythm logic to Pulmonary tissue scanning and Dermatoscopic classification, the system provides a unified interface for diverse clinical pathologies.
                </AboutStickySection>
            </div>

            <section className="mission-section">
                <div className="mission-content">
                    <h2>SYSTEM APPROACH</h2>
                    <p>Designed with a privacy-first and role-aware approach, the system focuses on assisting healthcare workflows without replacing clinical judgment. The platform operates continuously, offering a balance of automation, clarity, and operational efficiency.</p>
                </div>
            </section>
        </div>
    );
};

export default About;
