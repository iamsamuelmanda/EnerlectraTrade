import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface EnerlectraLogoProps {
  size?: 'small' | 'medium' | 'large';
  animated?: boolean;
  showTagline?: boolean;
  className?: string;
}

const EnerlectraLogo: React.FC<EnerlectraLogoProps> = ({ 
  size = 'medium', 
  animated = true, 
  showTagline = true,
  className = '' 
}) => {
  const logoRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48'
  };

  const textSizes = {
    small: { logo: 'text-lg', tagline: 'text-xs' },
    medium: { logo: 'text-2xl', tagline: 'text-sm' },
    large: { logo: 'text-4xl', tagline: 'text-lg' }
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const logoVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.2,
        ease: "easeOut"
      }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.4,
        ease: "easeOut"
      }
    }
  };

  const circuitVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 0.6,
      transition: {
        duration: 1.2,
        delay: 0.6,
        ease: "easeOut"
      }
    }
  };

  const nodeVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({ 
      scale: 1, 
      opacity: 0.9,
      transition: {
        duration: 0.4,
        delay: 0.8 + (i * 0.1),
        ease: "easeOut"
      }
    })
  };

  const energyFlowVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({ 
      pathLength: 1, 
      opacity: 0.8,
      transition: {
        duration: 0.8,
        delay: 1.0 + (i * 0.1),
        ease: "easeOut"
      }
    })
  };

  // Add subtle floating animation
  useEffect(() => {
    if (animated && logoRef.current) {
      const logo = logoRef.current;
      logo.style.animation = 'float 6s ease-in-out infinite';
    }
  }, [animated]);

  return (
    <motion.div
      ref={logoRef}
      className={`relative flex flex-col items-center justify-center ${sizeClasses[size]} ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background with circuit board pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 rounded-2xl shadow-2xl" />
      
      {/* Circuit board lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 128 128">
        <motion.line
          x1="64" y1="112" x2="64" y2="24"
          stroke="#3b82f6" strokeWidth="2" opacity="0.8"
          variants={circuitVariants}
          initial="hidden"
          animate="visible"
        />
        <motion.line
          x1="32" y1="64" x2="96" y2="64"
          stroke="#3b82f6" strokeWidth="1.5" opacity="0.7"
          variants={circuitVariants}
          initial="hidden"
          animate="visible"
        />
        <motion.line
          x1="48" y1="80" x2="80" y2="80"
          stroke="#3b82f6" strokeWidth="1.5" opacity="0.7"
          variants={circuitVariants}
          initial="hidden"
          animate="visible"
        />
      </svg>

      {/* Energy nodes */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-orange-500 rounded-full shadow-lg"
          style={{
            left: `${32 + (i % 3) * 16}px`,
            top: `${24 + Math.floor(i / 3) * 16}px`
          }}
          variants={nodeVariants}
          initial="hidden"
          animate="visible"
          custom={i}
        />
      ))}

      {/* Main Logo - Stylized 3D "E" */}
      <motion.div
        className="relative z-10"
        variants={logoVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="relative">
          {/* Front face */}
          <div className="w-16 h-12 bg-gradient-to-br from-white via-blue-50 to-blue-100 rounded-lg shadow-lg border border-white/20" />
          
          {/* 3D depth effect */}
          <div className="absolute -left-1 top-0 w-1 h-12 bg-slate-400 rounded-l-lg opacity-80" />
          <div className="absolute -right-1 top-0 w-1 h-12 bg-slate-400 rounded-r-lg opacity-80" />
          <div className="absolute -top-1 left-0 w-16 h-1 bg-slate-300 rounded-t-lg opacity-60" />
          
          {/* Energy flow lines within the E */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 48">
            <motion.line
              x1="8" y1="12" x2="56" y2="12"
              stroke="#3b82f6" strokeWidth="2"
              variants={energyFlowVariants}
              initial="hidden"
              animate="visible"
              custom={0}
            />
            <motion.line
              x1="8" y1="24" x2="48" y2="24"
              stroke="#3b82f6" strokeWidth="2"
              variants={energyFlowVariants}
              initial="hidden"
              animate="visible"
              custom={1}
            />
            <motion.line
              x1="8" y1="36" x2="56" y2="36"
              stroke="#3b82f6" strokeWidth="2"
              variants={energyFlowVariants}
              initial="hidden"
              animate="visible"
              custom={2}
            />
          </svg>
        </div>
      </motion.div>

      {/* Company Name */}
      <motion.div
        className="relative z-10 mt-4"
        variants={textVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 className={`font-bold text-white tracking-wider ${textSizes[size].logo}`}>
          ENERLECTRA
        </h1>
      </motion.div>

      {/* Tagline */}
      {showTagline && (
        <motion.div
          className="relative z-10 mt-2"
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          <p className={`text-slate-400 tracking-wide ${textSizes[size].tagline}`}>
            THE ENERGY INTERNET
          </p>
        </motion.div>
      )}

      {/* Subtle energy waves */}
      <motion.div
        className="absolute bottom-2 left-0 right-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <svg className="w-full h-4" viewBox="0 0 128 16">
          <path
            d="M0,12 Q16,8 32,12 T64,12 T96,12 T128,12"
            stroke="#3b82f6"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M0,14 Q16,10 32,14 T64,14 T96,14 T128,14"
            stroke="#1e40af"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>
      </motion.div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </motion.div>
  );
};

export default EnerlectraLogo; 