import React, { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Sliders, Image as ImageIcon, Sparkles, Check, X, FileDown, Activity, AlertCircle, Info, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { saveCaseToFirestore } from '../utils/uploadService';
import { analyzeDisease, diseaseTypeToModality, generateUnifiedReport, resultVisualToDataUrl, generateAITreatmentPlan } from '../utils/unifiedApi';
import './AdvancedAnalysis.css';

// Using the same blue/glassmorphic aesthetic as the rest of the app
const AdvancedAnalysis = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const diseaseType = location.state?.diseaseType || 'Fracture';

    // Image source passed from Detect page or placeholder
    const [imageSrc, setImageSrc] = useState(null);
    const [fileBlob, setFileBlob] = useState(null); // To store the actual file/blob for API
    const [fileName, setFileName] = useState("No file selected");
    const [showFilters, setShowFilters] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Store API results: { brightness: "base64...", clahe: "base64...", ... }
    const [apiResults, setApiResults] = useState({});

    // Filters requested by user
    const FILTERS = [
        { id: 'original', label: 'ORIGINAL' },
        { id: 'brightness', label: 'BRIGHTNESS' },
        { id: 'clahe', label: 'CLAHE' },
        { id: 'jet_colormap', label: 'JET_COLORMAP' },
        { id: 'retinex', label: 'RETINEX' }
    ];


    // State for Tumor Details
    const [tumorDetails, setTumorDetails] = useState(null);
    // State for DR Details
    const [drDetails, setDrDetails] = useState(null);
    // State for ECG Details
    const [ecgDetails, setEcgDetails] = useState(null);
    // State for Pneumonia Details
    const [pneumoniaDetails, setPneumoniaDetails] = useState(null);
    // State for Skin Details
    const [skinDetails, setSkinDetails] = useState(null);
    const [aiInsight, setAiInsight] = useState(null);

    // Smart Detection & Validation State
    const [smartResult, setSmartResult] = useState(null);
    const [smartConfidence, setSmartConfidence] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [activeAnalysisMode, setActiveAnalysisMode] = useState(null);
    const [accepted, setAccepted] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [currentDocId, setCurrentDocId] = useState(null);
    
    // Doctor Notes & AI Treatment
    const [doctorNotes, setDoctorNotes] = useState('');
    const [treatmentPlan, setTreatmentPlan] = useState('');
    const [generatingPlan, setGeneratingPlan] = useState(false);
    
    // Refs for Waveform Capture
    const ecgChartRef = useRef(null);

    // ECG Waveform & Processing State
    const [waveformData, setWaveformData] = useState([]);
    const [signalStatus, setSignalStatus] = useState("Pending");
    const [totalSamples, setTotalSamples] = useState(0);

    // Robust ECG Signal Parsing
    const processECGSignal = (file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split(/\r?\n/);
                const points = [];
                let numericSamples = [];

                for (let line of lines) {
                    // Try splitting by comma, space, or tab
                    const parts = line.trim().split(/[,\s\t]+/);
                    // Find the first valid numeric column
                    for (let part of parts) {
                        const val = parseFloat(part);
                        if (!isNaN(val)) {
                            numericSamples.push(val);
                            break; // Take the first column per line
                        }
                    }
                }

                if (numericSamples.length === 0) {
                    throw new Error("No valid numeric signal found");
                }

                setTotalSamples(numericSamples.length);

                // Normalization (0 to 1 range)
                const min = Math.min(...numericSamples);
                const max = Math.max(...numericSamples);
                const range = max - min || 1;

                // Smart Sampling: If signal is massive, take 2000 points for performance
                const sampleRate = Math.max(1, Math.floor(numericSamples.length / 2000));

                for (let i = 0; i < numericSamples.length; i += sampleRate) {
                    const normalized = (numericSamples[i] - min) / range;
                    points.push({
                        time: i,
                        amplitude: parseFloat(normalized.toFixed(3))
                    });
                }

                setWaveformData(points);
                setSignalStatus("Processed");
            } catch (err) {
                console.error("ECG Parsing Error:", err);
                setSignalStatus("Invalid File");
                setWaveformData([]);
            }
        };
        reader.readAsText(file);
    };

    // Clinical Logic Mapper
    const getClinicalDetails = (prediction) => {
        const mapping = {
            'Normal': {
                diagnosis: "Normal Sinus Rhythm",
                meaning: "Standard electrical heart activity with regular patterns.",
                recommendation: "Regular monitoring advised. No immediate intervention required.",
                risk: "Low",
                color: "#00d4ff"
            },
            'PVC': {
                diagnosis: "Premature Ventricular Contraction",
                meaning: "Extra heartbeats initiated in the ventricles, disrupting regular rhythm.",
                recommendation: "Consult cardiologist. Further evaluation (Holter monitor) may be advised.",
                risk: "Moderate",
                color: "#00d4ff"
            },
            'Atrial': {
                diagnosis: "Atrial Arrhythmia / Flutter",
                meaning: "Rapid, irregular heart rhythm starting in the top chambers (atria).",
                recommendation: "URGENT evaluation required. Risk of stroke or heart complications.",
                risk: "High",
                color: "#00d4ff"
            },
            'LBBB': {
                diagnosis: "Left Bundle Branch Block",
                meaning: "Delay or blockage of electrical impulses on the left side of the heart.",
                recommendation: "Clinical correlation required. May indicate underlying structural heart disease.",
                risk: "High",
                color: "#00d4ff"
            }
        };
        return mapping[prediction] || mapping['Normal'];
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setImageSrc(url);
            setFileBlob(file);
            setFileName(file.name);
            setShowFilters(false);

            setApiResults({});
            setSmartResult(null);
            setTumorDetails(null);
            setDrDetails(null);
            setEcgDetails(null);
            setAnalysisResult(null);
            setActiveAnalysisMode(null);
            setAccepted(null);
            setCurrentDocId(null);
        }
    };

    const handleAnalyze = async () => {
        if (!fileBlob) {
            alert("Please select an image first.");
            return;
        }

        setIsLoading(true);
        setShowFilters(false);
        setActiveAnalysisMode('analyze');
        setTumorDetails(null);
        setDrDetails(null);
        setEcgDetails(null);
        setSmartResult(null);
        setSmartConfidence(null);

        try {
            const options = diseaseType === 'Fracture'
                ? { analysisMode: 'advanced' }
                : diseaseType === 'Tumor'
                    ? { preferredEngine: 'atlas' }
                    : {};

            const resultData = await analyzeDisease(diseaseType, [fileBlob], options);
            if (resultData.results && resultData.results.length > 0) {
                const res = resultData.results[0];
                setAnalysisResult(res);
                setAiInsight(res.ai_insight);
                const visualMap = {};
                (res.visuals || []).forEach((visual) => {
                    visualMap[visual.key] = visual.base64_data;
                });
                setApiResults(visualMap);

                if (diseaseType === 'Diabetic Retinopathy Scan') {
                    setDrDetails({
                        ...res.details,
                        severity_insight: res.ai_insight || res.details?.severity_insight
                    });
                }

                if (diseaseType === 'ECG') {
                    setEcgDetails({
                        prediction: res.prediction,
                        confidence: Math.round((res.confidence || 0) * 1000) / 10,
                        insight: res.ai_insight || res.details?.insight || `Analysis indicates ${res.prediction} rhythm.`,
                        sample_count: res.details?.sample_count
                    });
                }
            }
            setShowFilters(true);
        } catch (error) {
            console.error(error);
            alert("Could not connect to AI Engine. Using local preview mode.");
            setShowFilters(true); // Fallback to showing CSS version if any, or just fail gracefully
        } finally {
            setIsLoading(false);
        }
    };

    const handleSmartAnalysis = async (manualFile = null, manualFileName = null) => {
        const fileToUse = manualFile || fileBlob;
        const nameToUse = manualFileName || fileName;

        if (!fileToUse) {
            alert("Please select an image first.");
            return;
        }
        setIsLoading(true);
        setTumorDetails(null); // Reset
        setDrDetails(null); // Reset
        setEcgDetails(null); // Reset
        setSmartResult(null);
        setAnalysisResult(null);
        setShowFilters(false);
        setActiveAnalysisMode('smart');

        try {
            const options = diseaseType === 'Tumor'
                ? { preferredEngine: 'diagno' }
                : diseaseType === 'Fracture'
                    ? { analysisMode: 'smart' }
                    : {};

            const resultData = await analyzeDisease(diseaseType, [fileToUse], options);

            if (resultData.results && resultData.results.length > 0) {
                const res = resultData.results[0];
                setAnalysisResult(res);
                setAiInsight(res.ai_insight);
                setSmartResult(resultVisualToDataUrl(res.visuals?.[0]) || imageSrc);
                setSmartConfidence(Math.round((res.confidence || 0) * 1000) / 10);

                const visualMap = {};
                (res.visuals || []).forEach((visual) => {
                    visualMap[visual.key] = visual.base64_data;
                });
                setApiResults(visualMap);

                if (diseaseType === 'Tumor' && res.details?.tumor_found !== undefined) {
                    setTumorDetails(res.details);
                }

                if (diseaseType === 'Diabetic Retinopathy Scan') {
                    setDrDetails({
                        ...res.details,
                        severity_insight: res.ai_insight || res.details?.severity_insight
                    });
                }

                if (diseaseType === 'ECG') {
                    setEcgDetails({
                        prediction: res.prediction,
                        confidence: Math.round((res.confidence || 0) * 1000) / 10,
                        insight: res.ai_insight || res.details?.insight || `Analysis indicates ${res.prediction} rhythm.`,
                        sample_count: res.details?.sample_count
                    });
                }
            }
        } catch (error) {
            console.error(error);
            alert("Smart Detection Failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadReport = async () => {
        setIsLoading(true);
        try {
            const modality = diseaseTypeToModality(diseaseType);

            let metrics = {};
            let diagnosis = analysisResult?.prediction || diseaseType;
            let confidence = smartConfidence || 0;

            if (tumorDetails) {
                metrics = { size: tumorDetails.tumor_size_pixels, coverage: tumorDetails.brain_coverage_percent };
                diagnosis = tumorDetails.prediction;
                confidence = tumorDetails.confidence;
            } else if (drDetails) {
                metrics = { affected: drDetails.affected_percent, insight: drDetails.severity_insight };
                diagnosis = drDetails.prediction;
                confidence = drDetails.confidence;
            } else if (ecgDetails) {
                metrics = { rhythm: ecgDetails.prediction, interpretation: ecgDetails.insight };
                diagnosis = ecgDetails.prediction;
                confidence = ecgDetails.confidence;
            } else if (analysisResult) {
                metrics = analysisResult.details || {};
                diagnosis = analysisResult.prediction;
                confidence = Math.round((analysisResult.confidence || 0) * 1000) / 10;
            }

            const images = {};
            if (tumorDetails) {
                images.segmentation = tumorDetails.segmented_base64;
                images.heatmap = tumorDetails.heatmap_base64;
                images.crop = tumorDetails.cropped_base64;
            } else if (drDetails) {
                images.segmentation = drDetails.vessel_base64;
                images.heatmap = drDetails.lesion_base64;
                images.original = drDetails.original_base64;
            } else if (diseaseType === 'ECG' && ecgChartRef.current) {
                // Use html2canvas to capture the waveform chart
                try {
                    const canvas = await html2canvas(ecgChartRef.current, {
                        backgroundColor: '#000',
                        scale: 2 // Higher resolution
                    });
                    const b64 = canvas.toDataURL('image/png').split(',')[1];
                    images.original = b64;
                } catch (captureErr) {
                    console.error("Chart Capture Error:", captureErr);
                }
            }
            if (analysisResult?.visuals?.length) {
                analysisResult.visuals.forEach((visual) => {
                    images[visual.key] = visual.base64_data;
                });
            }

            if (!images.original && imageSrc && imageSrc.startsWith('data:')) {
                images.original = imageSrc.split(',')[1];
            } else if (!images.original && imageSrc && imageSrc.startsWith('blob:')) {
                const resp = await fetch(imageSrc);
                const blob = await resp.blob();
                const b64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                });
                images.original = b64;
            }

            const reportReq = {
                patient_name: location.state?.formData?.name || "Patient",
                doctor_name: currentUser.doctor_name || "Dr. User",
                diagnosis: diagnosis,
                confidence: confidence / 100,
                metrics: metrics,
                images: images,
                modality: modality,
                ai_insight: aiInsight
            };

            const blob = await generateUnifiedReport(reportReq);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Report_${reportReq.patient_name}_${modality.replace(" ", "_")}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("Report Error:", error);
            alert("Failed to download report. Make sure the backend is running.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleValidation = async (status) => {
        if (status === null || status === undefined) return;
        if (!fileBlob) {
            alert("No scan file available to save.");
            return;
        }

        setAccepted(status);
        setIsSaving(true);

        try {
            if (currentDocId) {
                const docRef = doc(db, "cases", currentDocId);
                await updateDoc(docRef, { accepted: status });
                alert("Status Updated Successfully!");
            } else {
                const metadata = {
                    doctor_id: currentUser?.id || 'unknown',
                    doctor_name: currentUser?.doctor_name || 'Unknown',
                    hospital_name: currentUser?.hospital_name || 'Unknown',
                    report_type: location.state?.formData?.reportType || diseaseTypeToModality(diseaseType),
                    disease: diseaseType,
                    accepted: status,
                    ai_prediction: analysisResult?.prediction || diseaseType,
                    ai_confidence: analysisResult?.confidence || smartConfidence || 0
                };

                const result = await saveCaseToFirestore(
                    location.state?.formData?.name || 'Case',
                    metadata,
                    [fileBlob]
                );
                if (result?.id) {
                    setCurrentDocId(result.id);
                    alert("DATA STORED SUCCESSFULLY");
                }
            }
        } catch (error) {
            console.error("Validation Save Error:", error);
            alert("Failed to save data: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGeneratePlan = async () => {
        setGeneratingPlan(true);
        try {
            // Figure out the current prediction Details
            const currentDetails = tumorDetails || drDetails || ecgDetails || pneumoniaDetails || skinDetails || analysisResult || smartResult;
            
            const req = {
                disease: location.state?.formData?.reportType || diseaseTypeToModality(diseaseType) || diseaseType,
                predicted_class: currentDetails?.prediction || diseaseType,
                confidence: currentDetails?.confidence || smartConfidence || 90.0,
                doctor_notes: doctorNotes
            };
            const response = await generateAITreatmentPlan(req);
            if (response.treatment_plan) {
                const cleanedPlan = String(response.treatment_plan)
                    .replace(/[*_`]+/g, '')
                    .replace(/^[\s>#-]+/gm, '')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
                setTreatmentPlan(cleanedPlan);
            }
        } catch (error) {
            console.error("AI Plan Generation Error", error);
            alert("Failed to generate AI Treatment Plan.");
        } finally {
            setGeneratingPlan(false);
        }
    };

    // Initialize from Navigation State
    useEffect(() => {
        if (location.state) {
            if (location.state.image) setImageSrc(location.state.image);
            if (location.state.fileName) setFileName(location.state.fileName);

            if (location.state.fileData) {
                setFileBlob(location.state.fileData);

                // If ECG, start local parsing too
                if (diseaseType === 'ECG') {
                    processECGSignal(location.state.fileData);
                }

                // Only tumor keeps the smart auto-run flow.
                const autoRunTypes = ['Tumor'];
                if (autoRunTypes.includes(diseaseType)) {
                    // Slight delay to ensure UI renders first
                    setTimeout(() => {
                        handleSmartAnalysis(location.state.fileData, location.state.fileName);
                    }, 500);
                }
            }
        }
    }, [location.state, diseaseType]);

    // ... (validation logic) ...

    const renderValidationAndNotes = () => {
        if (!(showFilters || smartResult || tumorDetails || drDetails || ecgDetails || pneumoniaDetails || skinDetails || analysisResult)) return null;
        
        return (
            <div className="glass-panel" style={{ marginTop: '30px', padding: '20px' }}>
                <div className="section-label" style={{ marginBottom: '15px', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Physician Validation</div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <button
                        className={`btn-outline ${accepted === true ? 'active-accept' : ''}`}
                        style={{
                            borderColor: accepted === true ? '#00ff88' : 'var(--border-color)',
                            color: accepted === true ? '#00ff88' : 'var(--text-secondary)',
                            flex: 1,
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                            opacity: isSaving ? 0.7 : 1
                        }}
                        onClick={() => !isSaving && handleValidation(true)}
                        disabled={isSaving}
                    >
                        <Check size={18} /> {isSaving && accepted === true ? "Saving..." : "Accept Results"}
                    </button>
                    <button
                        className={`btn-outline ${accepted === false ? 'active-reject' : ''}`}
                        style={{
                            borderColor: accepted === false ? '#ff4d4d' : 'var(--border-color)',
                            color: accepted === false ? '#ff4d4d' : 'var(--text-secondary)',
                            flex: 1,
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                            opacity: isSaving ? 0.7 : 1
                        }}
                        onClick={() => !isSaving && handleValidation(false)}
                        disabled={isSaving}
                    >
                        <X size={18} /> {isSaving && accepted === false ? "Saving..." : "Reject Results"}
                    </button>
                </div>
                
                <div style={{ marginTop: '20px' }}>
                    <div className="section-label" style={{ marginBottom: '10px' }}>Doctor's Notes</div>
                    <textarea
                        className="form-input"
                        rows="3"
                        placeholder="Add notes to include in the AI Treatment Plan..."
                        value={doctorNotes}
                        onChange={(e) => setDoctorNotes(e.target.value)}
                        style={{ width: '100%', resize: 'vertical' }}
                    ></textarea>
                    <button
                        className="btn-outline"
                        style={{ marginTop: '10px', width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)' }}
                        onClick={handleGeneratePlan}
                        disabled={generatingPlan}
                    >
                        {generatingPlan ? "Generating Plan..." : "Generate AI Treatment Plan"}
                    </button>
                    
                    {treatmentPlan && (
                        <div className="treatment-plan-result" style={{ marginTop: '15px', background: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="section-label" style={{ marginBottom: '10px', color: 'var(--primary)' }}>AI Treatment Plan</div>
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                {treatmentPlan}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderAIInsights = () => {
        if (!aiInsight) return null;

        // Ensure we handle object format from backend
        const insights = typeof aiInsight === 'string' ? { "AI Summary": aiInsight } : aiInsight;

        return (
            <div className="glass-panel ai-insights-container" style={{
                marginTop: '24px',
                padding: '24px',
                borderLeft: '4px solid var(--primary)',
                background: 'linear-gradient(90deg, rgba(0, 212, 255, 0.08) 0%, rgba(0, 0, 0, 0.2) 100%)',
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                borderRadius: '0 12px 12px 0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(0, 212, 255, 0.15)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                        <Sparkles size={22} color="var(--primary)" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '0.5px', color: '#fff' }}>AI Clinical Insights</h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--primary)', opacity: 0.8 }}>Advanced Radiological Analysis Pipeline</p>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ padding: '4px 10px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '20px', fontSize: '0.65rem', color: 'var(--primary)', border: '1px solid rgba(0, 212, 255, 0.2)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            Llama 3.2 11B Vision
                        </span>
                        {insights.clinical_significance && (
                            <span style={{ padding: '4px 10px', background: insights.clinical_significance.toLowerCase().includes('pathological') ? 'rgba(255, 77, 77, 0.15)' : 'rgba(0, 255, 136, 0.1)', borderRadius: '20px', fontSize: '0.65rem', color: insights.clinical_significance.toLowerCase().includes('pathological') ? '#ff4d4d' : '#00ff88', border: '1px solid currentColor', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                {insights.clinical_significance.split(' ')[0]} Priority
                            </span>
                        )}
                    </div>
                </div>

                <div className="ai-insight-content">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        {Object.entries(insights).map(([key, value]) => {
                            if (key === 'clinical_significance' && typeof value === 'string') return null; // Already shown in badge partially, or simple skip if we want it in main content too

                            return (
                                <div key={key} className="insight-block" style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>{key.replace(/_/g, ' ')}</div>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255,255,255,0.92)', lineHeight: '1.6', fontWeight: '400' }}>{value}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Info size={12} /> This AI insight is for clinical assistance and should be verified by a certified radiologist.
                </div>
            </div>
        );
    };

    // RENDER LOGIC UPDATE
    // If tumorDetails exists, show specialized Tumor Dashboard instead of generic Grid
    if (tumorDetails) {
        return (
            <div className="advanced-page page-transition container">
                {/* Header & Controls Reuse */}
                <div className="advanced-header">
                    <div>
                        <h1 className="advanced-title"><span style={{ color: 'var(--primary)' }}>NeuroScan AI</span></h1>
                        <p className="advanced-subtitle">Brain Tumor Analysis</p>
                    </div>
                    <button className="btn-outline" onClick={() => navigate('/detect', { state: { formData: location.state?.formData } })}><ArrowLeft size={16} /> Back</button>
                </div>

                <div className="control-bar glass-panel">
                    <div className="control-group"><span className="file-status">{fileName}</span></div>
                    <div className="control-group right">
                        <button className="btn-primary small" onClick={handleDownloadReport} disabled={isLoading} style={{ background: 'var(--primary)', color: '#000' }}>
                            <FileDown size={16} style={{ marginRight: '5px' }} /> Download Report
                        </button>
                        <button className="btn-outline small" onClick={handleAnalyze} disabled={isLoading} style={{ marginLeft: '10px', borderColor: '#60a5fa', color: '#60a5fa' }}>
                            <Sliders size={16} style={{ marginRight: '5px' }} /> Standard Analysis
                        </button>
                        <button className="btn-outline small" onClick={handleSmartAnalysis} disabled={isLoading} style={{ marginLeft: '10px', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                            <Sparkles size={16} style={{ marginRight: '5px' }} /> Re-Run Analysis
                        </button>
                    </div>
                </div>

                {/* Tumor Results */}
                <div className="tumor-dashboard" style={{ marginTop: '20px' }}>
                    {/* Metrics Banner */}
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', color: '#888' }}>Diagnosis</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: tumorDetails.tumor_found ? '#ff4d4d' : '#00ff88' }}>{tumorDetails.prediction}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', color: '#888' }}>Confidence</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{tumorDetails.confidence}%</div>
                        </div>
                        {tumorDetails.tumor_found && (
                            <>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#888' }}>Size (px)</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{tumorDetails.tumor_size_pixels}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#888' }}>Coverage</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{tumorDetails.brain_coverage_percent}%</div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Image Grid */}
                    <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        {/* 1. Original / Segmentation */}
                        <div className="filter-card glass-panel">
                            <div className="filter-header">Segmentation Analysis</div>
                            <div className="filter-image-container">
                                <img src={`data:image/png;base64,${tumorDetails.segmented_base64}`} className="filter-img" />
                            </div>
                        </div>

                        {/* 2. Heatmap */}
                        <div className="filter-card glass-panel">
                            <div className="filter-header">AI Heatmap</div>
                            <div className="filter-image-container">
                                <img src={`data:image/png;base64,${tumorDetails.heatmap_base64}`} className="filter-img" />
                            </div>
                        </div>

                        {/* 3. Crop */}
                        <div className="filter-card glass-panel">
                            <div className="filter-header">Focused Region</div>
                            <div className="filter-image-container">
                                <img src={`data:image/png;base64,${tumorDetails.cropped_base64}`} className="filter-img" style={{ objectFit: 'contain' }} />
                            </div>
                        </div>
                    </div>
                </div>
                {renderAIInsights()}
                {renderValidationAndNotes()}
            </div>
        );
    }

    // RENDER LOGIC: DR DASHBOARD
    if (drDetails) {
        return (
            <div className="advanced-page page-transition container">
                <div className="advanced-header">
                    <div>
                        <h1 className="advanced-title"><span style={{ color: 'var(--primary)' }}>NeuroScan AI</span></h1>
                        <p className="advanced-subtitle">Retinopathy Analysis</p>
                    </div>
                    <button className="btn-outline" onClick={() => navigate('/detect', { state: { formData: location.state?.formData } })}><ArrowLeft size={16} /> Back</button>
                </div>

                <div className="control-bar glass-panel">
                    <div className="control-group"><span className="file-status">{fileName}</span></div>
                    <div className="control-group right">
                        <button className="btn-primary small" onClick={handleDownloadReport} disabled={isLoading} style={{ background: 'var(--primary)', color: '#000' }}>
                            <FileDown size={16} style={{ marginRight: '5px' }} /> Download Report
                        </button>
                        <button className="btn-outline small" onClick={handleAnalyze} disabled={isLoading} style={{ marginLeft: '10px', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                            <Sliders size={16} style={{ marginRight: '5px' }} /> Re-Run Analysis
                        </button>
                    </div>
                </div>

                <div className="tumor-dashboard" style={{ marginTop: '20px' }}>
                    {/* Metrics Banner */}
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', color: '#888' }}>Diagnosis</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: drDetails.is_no_dr ? '#00ff88' : '#ff4d4d' }}>{drDetails.prediction}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', color: '#888' }}>Confidence</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{drDetails.confidence}%</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '0.9rem', color: '#888' }}>Affected Area</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{drDetails.affected_percent}%</div>
                        </div>
                    </div>

                    {/* Severity Insight Banner */}
                    <div className="glass-panel" style={{ padding: '15px', marginBottom: '20px', textAlign: 'center', background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)' }}>
                        <span style={{ color: '#aaa', marginRight: '10px', fontWeight: 'bold' }}>CLINICAL INSIGHT:</span>
                        <span style={{ color: '#fff', fontSize: '1.1rem' }}>{drDetails.severity_insight}</span>
                    </div>

                    {/* Image Grid */}
                    <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="filter-card glass-panel">
                            <div className="filter-header">Original</div>
                            <div className="filter-image-container">
                                <img src={`data:image/png;base64,${drDetails.original_base64}`} className="filter-img" />
                            </div>
                        </div>
                        <div className="filter-card glass-panel">
                            <div className="filter-header">Retinal Vessels</div>
                            <div className="filter-image-container">
                                <img src={`data:image/png;base64,${drDetails.vessel_base64}`} className="filter-img" />
                            </div>
                        </div>
                        <div className="filter-card glass-panel">
                            <div className="filter-header">Lesion Analysis</div>
                            <div className="filter-image-container">
                                <img src={`data:image/png;base64,${drDetails.lesion_base64}`} className="filter-img" />
                            </div>
                        </div>
                    </div>
                </div>
                {renderAIInsights()}
                {renderValidationAndNotes()}
            </div>
        );
    }

    // RENDER LOGIC: ECG DASHBOARD (CardiacScan AI)
    if (ecgDetails) {
        const clinical = getClinicalDetails(ecgDetails.prediction);

        return (
            <div className="advanced-page page-transition container">
                <div className="advanced-header">
                    <div>
                        <h1 className="advanced-title"><span style={{ color: clinical.color }}>CardiacScan AI</span></h1>
                        <p className="advanced-subtitle">Advanced Clinical ECG Analysis</p>
                    </div>
                    <button className="btn-outline" onClick={() => navigate('/detect', { state: { formData: location.state?.formData } })}><ArrowLeft size={16} /> Back</button>
                </div>

                <div className="control-bar glass-panel">
                    <div className="control-group"><span className="file-status">{fileName}</span></div>
                    <div className="control-group right">
                        <button className="btn-primary small" onClick={handleDownloadReport} disabled={isLoading} style={{ background: clinical.color, color: '#000' }}>
                            <FileDown size={16} style={{ marginRight: '5px' }} /> Download Report
                        </button>
                        <button className="btn-outline small" onClick={handleAnalyze} disabled={isLoading} style={{ marginLeft: '10px', borderColor: clinical.color, color: clinical.color }}>
                            <Sliders size={16} style={{ marginRight: '5px' }} /> Re-Run Analysis
                        </button>
                    </div>
                </div>

                <div className="ecg-dashboard" style={{ marginTop: '20px' }}>

                    {/* Primary Medical Metrics Row */}
                    <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                        <div className="glass-panel" style={{ padding: '15px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>Diagnosis</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: clinical.color, marginTop: '5px' }}>{clinical.diagnosis}</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '15px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>Clinical Risk</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: clinical.color, marginTop: '5px' }}>{clinical.risk} Risk</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '15px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>AI Confidence</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', marginTop: '5px' }}>{ecgDetails.confidence}%</div>
                        </div>
                        <div className="glass-panel" style={{ padding: '15px', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>Signal Status</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: signalStatus === 'Processed' ? '#00ff88' : '#ff4d4d', marginTop: '5px' }}>{signalStatus}</div>
                        </div>
                    </div>

                    {/* ECG Waveform Visualization */}
                    <div ref={ecgChartRef} className="glass-panel" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(0,0,0,0.4)', minHeight: '350px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                            <div className="filter-header" style={{ color: clinical.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Heart size={18} className="pulse-icon" style={{ color: clinical.color }} /> Waveform Analysis (Amplitude vs Time)
                            </div>
                            <div style={{ color: '#666', fontSize: '0.8rem' }}>Total Samples: {totalSamples} | Type: {fileName.split('.').pop().toUpperCase()}</div>
                        </div>

                        {waveformData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={waveformData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="time" hide />
                                    <YAxis domain={['auto', 'auto']} hide />
                                    <Tooltip
                                        contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: clinical.color }}
                                        labelStyle={{ display: 'none' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="amplitude"
                                        stroke="#00FFA3"
                                        strokeWidth={2}
                                        dot={false}
                                        isAnimationActive={true}
                                        className="ecg-line-glow"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
                                <AlertCircle size={48} />
                                <p style={{ marginTop: '10px' }}>Invalid ECG signal data or parsing failed.</p>
                            </div>
                        )}
                    </div>

                    {/* Structured Clinical Report */}
                    <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                        <div className="glass-panel" style={{ padding: '20px', borderLeft: `4px solid ${clinical.color}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#888', fontSize: '0.9rem' }}>
                                <Info size={16} /> CLINICAL MEANING
                            </div>
                            <p style={{ color: '#fff', fontSize: '1.1rem', margin: 0, lineHeight: '1.6' }}>{clinical.meaning}</p>
                        </div>
                        <div className="glass-panel" style={{ padding: '20px', borderLeft: `4px solid #00d4ff` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#888', fontSize: '0.9rem' }}>
                                <AlertCircle size={16} /> RECOMMENDATION
                            </div>
                            <p style={{ color: '#fff', fontSize: '1.1rem', margin: 0, lineHeight: '1.6' }}>{clinical.recommendation}</p>
                        </div>
                    </div>
                </div>
                {renderAIInsights()}
                {renderValidationAndNotes()}
            </div>
        );
    }

    // Default Return (Fracture Mode)
    return (
        <div className="advanced-page page-transition container">
            {/* ... existing generic JSX ... */}
            {/* We will splice this correctly in the file using context */}
            <div className="advanced-header">
                <div>
                    <h1 className="advanced-title">
                        <span style={{ color: 'var(--primary)' }}>
                            {diseaseType === 'Tumor' ? 'NeuroScan AI' :
                                diseaseType === 'Diabetic Retinopathy Scan' ? 'RetinaScan AI' :
                                diseaseType === 'ECG' ? 'CardiacScan AI' :
                                    diseaseType === 'Pneumonia' ? 'PulmoScan AI' :
                                        diseaseType === 'Skin Lesion' ? 'DermScan AI' :
                                            'Fracture Detection AI'}
                        </span>
                    </h1>
                    {/* ... rest of original render ... */}
                    <p className="advanced-subtitle">
                        {diseaseType === 'Tumor' ? 'Brain Tumor Analysis' :
                            diseaseType === 'Diabetic Retinopathy Scan' ? 'Retinopathy Analysis' :
                                diseaseType === 'ECG' ? 'Heart Rhythm Analysis' :
                                    diseaseType === 'Pneumonia' ? 'Pulmonary Tissue Analysis' :
                                        diseaseType === 'Skin Lesion' ? 'Dermatoscopic Analysis' :
                                            'Advanced Analysis'}
                    </p>
                </div>
                <button className="btn-outline" onClick={() => navigate('/detect', { state: { formData: location.state?.formData } })}>
                    <ArrowLeft size={16} /> Back to Detect
                </button>
            </div>

            {/* Main Control Bar */}
            <div className="control-bar glass-panel">
                <div className="control-group">
                    <span className="file-status" style={{ marginLeft: 0 }}>{fileName}</span>
                </div>

                <div className="control-group right">
                    <button className="btn-primary small" onClick={handleDownloadReport} disabled={isLoading} style={{ background: 'var(--primary)', color: '#000' }}>
                        <FileDown size={16} style={{ marginRight: '5px' }} /> Download Report
                    </button>
                    <button className="btn-primary small" onClick={handleAnalyze} disabled={isLoading} style={{ marginLeft: '10px' }}>
                            {isLoading ? "Processing..." : "Analyze"}
                    </button>
                    {(diseaseType === 'Fracture' || diseaseType === 'Tumor') && (
                        <button className="btn-outline small" onClick={() => handleSmartAnalysis()} disabled={isLoading} style={{ marginLeft: '10px', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                            <Sparkles size={16} style={{ marginRight: '5px' }} /> Smart Auto Detection
                        </button>
                    )}
                </div>
            </div>

            {/* Smart Detection Result Section - Only for non-ECG */}
            {activeAnalysisMode === 'smart' && smartResult && diseaseType !== 'ECG' && (
                <div className="glass-panel" style={{ marginBottom: '20px', padding: '20px', border: '1px solid var(--primary)' }}>
                    <div className="filter-header" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sparkles size={20} /> Smart AI Detection Result {smartConfidence && `(${smartConfidence}% Confidence)`}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px', marginBottom: '15px' }}>
                        <img src={smartResult} alt="Smart Detection" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </div>
                    {renderAIInsights()}
                </div>
            )}

            {activeAnalysisMode === 'analyze' && diseaseType === 'Tumor' && analysisResult && (
                <div className="glass-panel" style={{ marginBottom: '20px', padding: '20px' }}>
                    <div className="filter-header" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sliders size={20} /> Standard Tumor Analysis {analysisResult.confidence ? `(${Math.round(analysisResult.confidence * 1000) / 10}% Confidence)` : ''}
                    </div>
                    <div style={{ color: '#cbd5e1', marginTop: '10px', marginBottom: '16px' }}>
                        Prediction: <strong>{analysisResult.prediction}</strong>
                    </div>
                    <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        {(analysisResult.visuals || []).map((visual) => (
                            <div key={visual.key} className="filter-card glass-panel">
                                <div className="filter-header">{visual.label}</div>
                                <div className="filter-image-container">
                                    <img
                                        src={resultVisualToDataUrl(visual)}
                                        alt={visual.label}
                                        className="filter-img"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeAnalysisMode === 'analyze' && analysisResult && diseaseType !== 'Fracture' && diseaseType !== 'Tumor' && diseaseType !== 'ECG' && (
                <div className="glass-panel" style={{ marginBottom: '20px', padding: '20px' }}>
                    <div className="filter-header" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sliders size={20} /> Analysis Result {analysisResult.confidence ? `(${Math.round(analysisResult.confidence * 1000) / 10}% Confidence)` : ''}
                    </div>
                    <div style={{ color: '#cbd5e1', marginTop: '10px', marginBottom: '16px' }}>
                        Prediction: <strong>{analysisResult.prediction}</strong>
                    </div>
                    {analysisResult.probabilities?.length > 0 && (
                        <div style={{ color: '#94a3b8', marginBottom: '16px' }}>
                            Top scores: {analysisResult.probabilities.slice(0, 3).map((item) => `${item.label} (${Math.round(item.score * 1000) / 10}%)`).join(', ')}
                        </div>
                    )}
                    <div className="analysis-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        {(analysisResult.visuals || []).map((visual) => (
                            <div key={visual.key} className="filter-card glass-panel">
                                <div className="filter-header">{visual.label}</div>
                                <div className="filter-image-container">
                                    <img
                                        src={resultVisualToDataUrl(visual)}
                                        alt={visual.label}
                                        className="filter-img"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeAnalysisMode === 'analyze' && diseaseType === 'Fracture' && (
                <>
                    {analysisResult && (
                        <div className="glass-panel" style={{ marginBottom: '20px', padding: '20px' }}>
                            <div className="filter-header" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Sliders size={20} /> Fracture Detection Summary {analysisResult.confidence ? `(${Math.round(analysisResult.confidence * 1000) / 10}% Confidence)` : ''}
                            </div>
                            <div style={{ color: '#cbd5e1', marginTop: '10px', marginBottom: '10px' }}>
                                Prediction: <strong>{analysisResult.prediction || 'No prediction returned'}</strong>
                            </div>
                            {analysisResult.probabilities?.length > 0 ? (
                                <div style={{ color: '#94a3b8' }}>
                                    Top scores: {analysisResult.probabilities.slice(0, 3).map((item) => `${item.label} (${Math.round(item.score * 1000) / 10}%)`).join(', ')}
                                </div>
                            ) : null}
                        </div>
                    )}

                    <div className="analysis-grid">
                        {showFilters && FILTERS.map((filter) => {
                        // ... existing filter logic ...
                        let displaySrc = imageSrc;
                        let customStyle = {};

                        if (filter.id !== 'original') {
                            if (apiResults[filter.id]) {
                                displaySrc = `data:image/png;base64,${apiResults[filter.id]}`;
                            } else {
                                customStyle = {
                                    filter:
                                        filter.id === 'brightness' ? 'brightness(1.5)' :
                                            filter.id === 'clahe' ? 'contrast(1.5) grayscale(100%)' :
                                                filter.id === 'retinex' ? 'brightness(1.2) contrast(1.1) saturate(1.2)' :
                                                    filter.id === 'jet_colormap' ? 'hue-rotate(180deg) invert(1)' :
                                                        'none'
                                }
                            }
                        }

                            return (
                                <div key={filter.id} className="filter-card glass-panel">
                                    <div className="filter-header">{filter.label}</div>
                                    <div className="filter-image-container">
                                        {displaySrc ? (
                                            <img
                                                src={displaySrc}
                                                alt={filter.label}
                                                className="filter-img"
                                                style={customStyle}
                                            />
                                        ) : (
                                            <div className="placeholder-box">
                                                <ImageIcon size={48} color="var(--text-muted)" />
                                                <p>No Image</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {diseaseType === 'ECG' && !ecgDetails && !isLoading && (
                <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
                    <Activity size={64} color="#00d4ff" style={{ marginBottom: '20px', opacity: 0.3 }} />
                    <h3>ECG Signal Ready</h3>
                    <p style={{ color: '#888' }}>Click "Analyze" to analyze the heart rhythm data.</p>
                </div>
            )}

            {isLoading && (
                <div className="glass-panel" style={{ padding: '80px', textAlign: 'center' }}>
                    <div className="heart-loader">
                        <Heart size={64} color="#00d4ff" fill="rgba(0, 212, 255, 0.2)" />
                    </div>
                    <h3 style={{ marginTop: '30px' }}>
                        {diseaseType === 'ECG' ? 'Analyzing ECG Signal...' : 'Analyzing Scan...'}
                    </h3>
                    <p style={{ color: '#888' }}>
                        {diseaseType === 'ECG'
                            ? 'Our AI is detecting rhythm patterns and cardiovascular abnormalities.'
                            : 'Our AI is processing the uploaded scan and preparing detection results.'}
                    </p>
                </div>
            )}


            {renderAIInsights()}
            {/* Validation Section */}
            {renderValidationAndNotes()}
        </div >
    );
};

export default AdvancedAnalysis;
