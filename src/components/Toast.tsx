import React, { useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, duration = 4000 }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [remainingTime, setRemainingTime] = useState(duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (isVisible && !isPaused) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        onClose();
      }, remainingTime);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [isVisible, isPaused, remainingTime, onClose]);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      const elapsed = Date.now() - startTimeRef.current;
      setRemainingTime(Math.max(0, remainingTime - elapsed));
    }
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="notification" 
      style={{
        color: 'rgba(0, 0, 0, 0.8)',
        position: 'fixed',
        display: 'flex',
        fontSize: '0.9rem',
        letterSpacing: '0.5px',
        lineHeight: 1.3,
        gap: '12px',
        top: 0,
        right: 0,
        margin: '1rem',
        width: '18rem',
        backgroundColor: 'white',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        borderRadius: '8px',
        maxWidth: 'calc(100% - 2rem)',
        zIndex: 1000,
        padding: '12px 16px',
        overflow: 'hidden',
        transform: isVisible ? 'translateX(0)' : 'translateX(calc(100% + 1rem))',
        animation: isVisible ? `slideInOut 4s cubic-bezier(0.33, 0, 0.66, 1.33)` : 'none',
        animationPlayState: isPaused ? 'paused' : 'running'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Progress bar */}
      <div 
        style={{
          content: '',
          display: 'block',
          position: 'absolute',
          inset: '0 0 auto',
          height: '0.3rem',
          backgroundColor: '#49a87d',
          transformOrigin: 'left',
          animation: isVisible ? 'countdown 4s linear' : 'none',
          animationPlayState: isPaused ? 'paused' : 'running'
        }}
      />

      {/* Icon */}
      <div 
        style={{
          borderRadius: '50%',
          display: 'block',
          aspectRatio: '1',
          backgroundSize: '1.5rem',
          backgroundColor: '#49a87d',
          backgroundImage: `url("data:image/svg+xml,%0A%3Csvg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 -960 960 960' width='24' fill='%23ffffff'%3E%3Cpath d='M400-314.46 250.46-464 296-509.54l104 104 264-264L709.54-624 400-314.46Z'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          width: '2rem',
          height: '2rem',
          marginBottom: 'auto',
          flexShrink: 0
        }}
      />

      {/* Content */}
      <div style={{ flex: 1 }}>
        <h2 style={{
          color: 'black',
          margin: 0,
          fontSize: '1rem',
          fontWeight: 600
        }}>
          Success
        </h2>
        <p style={{
          margin: '0.2rem 0 0',
          fontSize: '0.85rem'
        }}>
          {message}
        </p>
      </div>

      {/* Close button */}
      <div style={{ marginLeft: 'auto' }}>
        <button
          onClick={onClose}
          style={{
            appearance: 'none',
            background: 'none',
            border: 'none',
            font: 'inherit',
            margin: 0,
            color: 'currentColor',
            padding: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          aria-label="dismiss this notification"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      <style>{`
        @keyframes slideInOut {
          15%, 66% {
            transform: translateX(0);
          }
        }

        @keyframes countdown {
          66%, 100% {
            transform: scaleX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Toast;