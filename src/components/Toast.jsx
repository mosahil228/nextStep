import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../lib/store';

export default function Toast() {
  const { toast } = useApp();
  return (
    <div className="toast-wrap">
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} className="toast"
            initial={{ y: 40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
