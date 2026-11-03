import { Transition, Variants } from 'framer-motion';

export const SPRING_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 22,
  mass: 0.8,
};

export const SOFT_SPRING_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 310,
  damping: 25,
  mass: 0.9,
};

export const BUTTON_HOVER_PROPS = {
  whileHover: { scale: 1.05, y: -1.5 },
  whileTap: { scale: 0.96 },
  transition: SPRING_TRANSITION,
};

export const CARD_HOVER_PROPS = {
  whileHover: {
    scale: 1.05,
    y: -5,
    boxShadow:
      '0 20px 38px -12px rgba(37, 99, 235, 0.18), 0 8px 18px -6px rgba(15, 23, 42, 0.1)',
  },
  whileTap: { scale: 0.99 },
  transition: SPRING_TRANSITION,
};

export const SECTION_CARD_HOVER_PROPS = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  whileHover: {
    scale: 1.015,
    y: -3,
    boxShadow:
      '0 18px 34px -12px rgba(37, 99, 235, 0.14), 0 6px 16px -6px rgba(15, 23, 42, 0.08)',
  },
  transition: SOFT_SPRING_TRANSITION,
};

export const fadeSlideUpVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 25,
      delay,
    },
  }),
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.18 },
  },
};

export const staggerGridVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.03,
    },
  },
};

export const interactiveCardVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.975 },
  visible: (idx: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 24,
      delay: Math.min((typeof idx === 'number' ? idx : 0) * 0.045, 0.25),
    },
  }),
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.96,
    transition: { duration: 0.16 },
  },
  hover: {
    scale: 1.05,
    y: -5,
    boxShadow:
      '0 20px 38px -12px rgba(37, 99, 235, 0.18), 0 8px 18px -6px rgba(15, 23, 42, 0.1)',
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 22,
    },
  },
};
