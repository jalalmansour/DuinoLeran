'use client';

import React from 'react';
import Link from 'next/link';

// This component is responsible for rendering the 404 error page
// using the same styling as the previous FuturisticError404 component

const FuturisticError404: React.FC = () => {
    const hologramStyle: React.CSSProperties = {
        position: 'relative',
        width: '400px',
        height: '300px',
        border: '2px solid rgba(0, 255, 255, 0.5)',
        borderRadius: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        boxShadow: '0 0 30px rgba(0, 255, 255, 0.7)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    };

    const hologramBeforeAfterStyle: React.CSSProperties = {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0) 2px, rgba(0, 255, 255, 0.1) 2px, rgba(0, 255, 255, 0.1) 4px)',
        opacity: 0.3,
        pointerEvents: 'none',
    };

    const scanlineDriftAnimation: React.CSSProperties = {
        animation: 'scanline-drift 5s linear infinite',
    };

    const errorCodeStyle: React.CSSProperties = {
        fontSize: '8em',
        fontWeight: 'bold',
        color: '#00ffff',
        textShadow: '0 0 20px #00ffff',
        animation: 'glitch-text 1s steps(1) infinite',
    };

    const errorMessageStyle: React.CSSProperties = {
        fontSize: '1.5em',
        color: '#ff4081',
        textShadow: '0 0 10px #ff4081',
        marginTop: '10px',
        lineHeight: '1.2',
        animation: 'flicker-text 0.5s steps(2) infinite, scanline-distortion 0.3s linear infinite alternate',
    };

    const scanlinesStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'repeating-linear-gradient(to bottom, transparent 0%, rgba(0, 255, 255, 0.1) 1px, transparent 2px)',
        pointerEvents: 'none',
        animation: 'scanline-animate 0.1s steps(2) infinite',
        opacity: 0.5,
    };

    const returnHomeStyle: React.CSSProperties = {
        marginTop: '30px',
    };

    const returnHomeLinkStyle: React.CSSProperties = {
        display: 'inline-block',
        padding: '12px 25px',
        backgroundColor: '#00ffff',
        color: '#111',
        textDecoration: 'none',
        borderRadius: '5px',
        fontWeight: 'bold',
        transition: 'background-color 0.3s ease, color 0.3s ease',
        boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
    };

    const returnHomeLinkHoverStyle: React.CSSProperties = {
        backgroundColor: '#ff4081',
        color: '#fff',
        boxShadow: '0 0 15px rgba(255, 64, 129, 0.7)',
    };

    const bodyStyle: React.CSSProperties = {
        margin: 0,
        fontFamily: `'futuristic-font', sans-serif`, /* Make sure to load your font, see notes below */
        backgroundColor: '#111',
        color: '#fff',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
    };

    // Inline style for the container to center content
    const errorContainerStyle: React.CSSProperties = {
        textAlign: 'center',
    };


    return (
        <div style={bodyStyle}>
            <style jsx global>{`
                @font-face { /* Example of importing a font if you don't have one locally */
                    font-family: 'futuristic-font';
                    src: url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap'); /* Example Roboto Mono (monospace, futuristic) */
                }

                @keyframes scanline-drift {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(10px); }
                }

                @keyframes scanline-animate {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(1px); }
                }

                @keyframes glitch-text {
                    0%, 10%, 90%, 100% {
                        clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
                    }
                    15%, 25%, 75%, 85% {
                        clip-path: polygon(0 0, 100% 0, 0% 100%, 0 100%);
                        transform: translate(-5px, 5px);
                        text-shadow: -5px 0 #00ffff, 5px 0 #ff4081, 0 0 15px #00ffff;
                    }
                    50%, 60% {
                        clip-path: polygon(0 0, 0% 0, 0% 100%, 0 100%);
                        transform: translate(10px, -10px);
                        text-shadow: 5px 0 #00ffff, -5px 0 #ff4081, 0 0 15px #ff4081;
                    }
                }

                @keyframes flicker-text {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }

                @keyframes scanline-distortion {
                    0%, 100% { transform: skewY(0deg); }
                    50% { transform: skewY(2deg); }
                }

                .return-home a:hover { /* Hover style needs to be global or inline for proper effect in this setup */
                    background-color: #ff4081;
                    color: #fff;
                    box-shadow: 0 0 15px rgba(255, 64, 129, 0.7);
                }
            `}</style>
            <div style={errorContainerStyle} className="error-container">
                <div style={hologramStyle} className="hologram">
                    <div style={errorCodeStyle} className="error-code">404</div>
                    <div style={errorMessageStyle} className="error-message">
                        <span className="line1">SECTOR UNREACHABLE</span>
                        <span className="line2">NAVIGATION FAILURE</span>
                        <span className="line3">SYSTEM OFFLINE</span>
                    </div>
                    <div style={scanlinesStyle} className="scanlines"></div>
                </div>
                <div style={returnHomeStyle} className="return-home">
                  <Link href="/" style={returnHomeLinkStyle}>Return to Main Sector</Link>
                </div>
            </div>
        </div>
    );
};

export default FuturisticError404;
