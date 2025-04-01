import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import styles from "./homepage.module.css";

type DraftBannerProps = {
  message: string;
  onClose: () => void;
  isPersistent?: boolean;
};

const DraftBanner: React.FC<DraftBannerProps> = ({ 
  message, 
  onClose, 
  isPersistent = false 
}) => {
  const bannerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Set auto-dismiss timer (for both persistent and temporary banners)
    timerRef.current = setTimeout(() => {
      handleClose();
    }, 5000);
    
    // Cleanup on unmount or when component re-renders
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [message]); // Depend on message to reset timer when message changes
  
  const handleClose = () => {
    // Clear the timeout if it exists
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (bannerRef.current) {
      bannerRef.current.classList.add(styles.fadeOut);
      
      // Wait for animation to complete before calling onClose
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };
  
  return (
    <div ref={bannerRef} className={styles.draftBanner}>
      <div className={styles.draftBannerContent}>{message}</div>
      <button className={styles.closeBanner} onClick={handleClose} aria-label="Close banner">
        <X size={16} />
      </button>
    </div>
  );
};

export default DraftBanner;