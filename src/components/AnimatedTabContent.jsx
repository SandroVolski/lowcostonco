// src/components/AnimatedTabContent.jsx
import React from 'react';
import { motion } from 'framer-motion';

const AnimatedTabContent = ({ children }) => {
  // Variantes para animações
  const pageTransition = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        delay: 0.1
      }
    }
  };

  return (
    <motion.div 
      className="animated-tab-content"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageTransition}
    >
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default AnimatedTabContent;