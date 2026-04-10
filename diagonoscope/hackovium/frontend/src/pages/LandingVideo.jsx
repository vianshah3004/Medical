import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingVideo.css';

const LandingVideo = () => {
    const navigate = useNavigate();
    const videoRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const resetPlayback = () => {
            video.playbackRate = 1;
            video.defaultPlaybackRate = 1;
        };

        const handleLoaded = () => {
            resetPlayback();
            video.currentTime = 0;
        };

        const handlePlay = () => {
            resetPlayback();
        };

        const handleEnded = () => {
            navigate('/home', { replace: true });
        };

        resetPlayback();
        video.addEventListener('loadedmetadata', handleLoaded);
        video.addEventListener('play', handlePlay);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoaded);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('ended', handleEnded);
        };
    }, [navigate]);

    return (
        <div className="landing-video">
            <video
                ref={videoRef}
                className="landing-video__media"
                src="/landingPage.mp4"
                autoPlay
                muted
                playsInline
                preload="auto"
            />
        </div>
    );
};

export default LandingVideo;
