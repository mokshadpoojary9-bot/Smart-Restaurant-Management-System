import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Universal 3D flip card primitive.
 * Front and back are two children. Pass className and dimensions via wrapper.
 */
export function FlipCard({ front, back, className = "", flippedControl, onFlipChange }) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = flippedControl !== undefined ? flippedControl : internalFlipped;
  const handleFlip = () => {
    if (flippedControl === undefined) setInternalFlipped((f) => !f);
    onFlipChange && onFlipChange(!flipped);
  };
  return (
    <div className={cn("perspective-1000", className)}>
      <motion.div
        className="relative w-full h-full preserve-3d cursor-pointer"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        onClick={handleFlip}
        data-testid="flip-card"
      >
        <div className="absolute inset-0 backface-hidden">{front}</div>
        <div className="absolute inset-0 backface-hidden rotate-y-180">{back}</div>
      </motion.div>
    </div>
  );
}
