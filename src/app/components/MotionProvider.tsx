"use client";

import { MotionConfig } from "framer-motion";

// Framer Motion skips transform and layout animations when the OS asks for reduced motion
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
