'use client';

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import type { DriveCreative } from '@/lib/drive';

const SWIPE_THRESHOLD = 100;

export function CreativeCard({
  creative,
  onSwipeValidate,
  onSwipeReject,
  disabled,
}: {
  creative: DriveCreative;
  onSwipeValidate: () => void;
  onSwipeReject: () => void;
  disabled: boolean;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-12, 12]);
  const overlayOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD], [0.85, 0, 0.85]);
  const overlayColor = useTransform(x, (value) => (value >= 0 ? '#9CF694' : '#FF4444'));

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (disabled) return;
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipeValidate();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipeReject();
    }
  }

  return (
    <motion.div
      key={creative.id}
      className="relative mx-auto w-full max-w-lg touch-none select-none rounded-2xl bg-white p-4 shadow-card"
      style={{ x, rotate }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
        style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
      />

      <div className="flex h-[55vh] items-center justify-center overflow-hidden rounded-lg bg-asight-lavande/40">
        {creative.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creative.streamUrl}
            alt={creative.name}
            className="h-full w-auto max-w-full object-contain"
            draggable={false}
          />
        ) : (
          <video
            key={creative.streamUrl}
            src={creative.streamUrl}
            className="h-full w-auto max-w-full object-contain"
            controls
            autoPlay
            muted
            loop
            playsInline
          />
        )}
      </div>

      <p className="mt-3 truncate text-center font-body text-sm text-asight-dark/50">
        {creative.name}
      </p>
    </motion.div>
  );
}
