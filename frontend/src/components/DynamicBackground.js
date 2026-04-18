import React, { useEffect, useRef } from 'react';
import './DynamicBackground.css';

const DynamicBackground = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    let animationFrame;
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;

        const blobs = containerRef.current.querySelectorAll('.blob');
        blobs.forEach((blob, i) => {
          const depth = (i + 1) * 8;
          blob.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
        });

        const aurora = containerRef.current.querySelector('.bg-aurora');
        if (aurora) {
          aurora.style.transform = `translate(${x * 15}px, ${y * 15}px)`;
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="dynamic-bg-container" ref={containerRef}>
      <div className="bg-base"></div>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>
      <div className="bg-aurora"></div>
      <div className="bg-grid"></div>
      <div className="stars stars-small"></div>
      <div className="stars stars-medium"></div>
      <div className="stars stars-large"></div>
      <div className="bg-grain"></div>
      <div className="bg-vignette"></div>
    </div>
  );
};

export default DynamicBackground;
