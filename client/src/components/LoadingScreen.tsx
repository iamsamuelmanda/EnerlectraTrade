import React from 'react';
import { motion } from 'framer-motion';
import EnerlectraLogo from './EnerlectraLogo';

interface LoadingScreenProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Initializing The Energy Internet...",
  showProgress = true,
  progress = 0
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  const progressVariants = {
    hidden: { width: 0 },
    visible: { 
      width: `${progress}%`,
      transition: {
        duration: 1.5,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center z-50"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#3b82f6_1px,transparent_1px)] bg-[length:20px_20px]" />
      </div>

      {/* Main Logo */}
      <motion.div variants={itemVariants}>
        <EnerlectraLogo size="large" animated={true} showTagline={true} />
      </motion.div>

      {/* Loading Message */}
      <motion.div 
        className="mt-8 text-center"
        variants={itemVariants}
      >
        <h2 className="text-xl font-medium text-white mb-2">
          {message}
        </h2>
        <p className="text-slate-400 text-sm">
          Connecting to the future of energy trading
        </p>
      </motion.div>

      {/* Progress Bar */}
      {showProgress && (
        <motion.div 
          className="mt-8 w-80 max-w-md"
          variants={itemVariants}
        >
          <div className="bg-slate-700 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full"
              variants={progressVariants}
              initial="hidden"
              animate="visible"
            />
          </div>
          <div className="mt-2 text-center">
            <span className="text-slate-400 text-sm">
              {progress}% Complete
            </span>
          </div>
        </motion.div>
      )}

      {/* Energy flow animation */}
      <motion.div
        className="absolute bottom-8 left-0 right-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <svg className="w-full h-8" viewBox="0 0 400 32">
          <motion.path
            d="M0,24 Q50,16 100,24 T200,24 T300,24 T400,24"
            stroke="#3b82f6"
            strokeWidth="2"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 1.5 }}
          />
          <motion.path
            d="M0,28 Q50,20 100,28 T200,28 T300,28 T400,28"
            stroke="#1e40af"
            strokeWidth="1"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, delay: 1.8 }}
          />
        </svg>
      </motion.div>

      {/* Floating energy particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-orange-500 rounded-full"
          style={{
            left: `${20 + (i * 60)}px`,
            top: `${100 + Math.sin(i) * 20}px`
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 1, 0.3]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Company tagline at bottom */}
      <motion.div
        className="absolute bottom-4 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ delay: 2, duration: 0.8 }}
      >
        <p className="text-slate-500 text-xs tracking-wide">
          © 2024 Enerlectra • The Energy Internet
        </p>
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen; 