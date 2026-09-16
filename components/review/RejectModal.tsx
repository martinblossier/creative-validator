'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function RejectModal({
  open,
  submitting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (comment: string) => void;
}) {
  const [comment, setComment] = useState('');

  function handleConfirm() {
    if (!comment.trim()) return;
    onConfirm(comment.trim());
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-asight-dark/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t-4 border-asight-violet bg-white p-6 shadow-card sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <h2 className="mb-1 font-heading text-lg font-bold text-asight-dark">
              À retravailler
            </h2>
            <p className="mb-4 font-body text-sm text-asight-dark/60">
              Décris ce qui doit être modifié
            </p>

            <textarea
              autoFocus
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="Ex : le logo est trop petit, le CTA manque de contraste..."
              className="mb-4 w-full resize-none rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
            />

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={submitting}
                className="flex-1 rounded-full border border-asight-muted px-6 py-3 font-body font-semibold text-asight-dark transition-colors hover:bg-asight-lavande disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting || !comment.trim()}
                className="flex-1 rounded-full bg-asight-red px-6 py-3 font-body font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
