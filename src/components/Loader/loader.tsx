// Modify your existing Loader.tsx
import React from "react";
import styles from "./loader.module.css";

interface LoaderProps {
  message?: string;
  fullScreen?: boolean; // New prop
}

const Loader: React.FC<LoaderProps> = ({ message, fullScreen = true }) => {
  return (
    <div className={fullScreen ? styles.loaderWrapper : styles.inlineLoaderWrapper}>
      <div className={styles.loader}></div>
      {message && <p className={styles.loaderMessage}>{message}</p>}
    </div>
  );
};

export default Loader;