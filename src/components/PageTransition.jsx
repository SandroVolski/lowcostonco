// PageTransition.jsx
import { motion } from "framer-motion";

const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }} // Começa invisível
      animate={{ opacity: 1 }} // Aparece gradualmente
      exit={{ opacity: 0 }} // Desaparece gradualmente
      transition={{ duration: 0.5 }} // Duração da animação
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;