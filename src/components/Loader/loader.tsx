import React from "react";
import styles from "./loader.module.css";

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className={styles.loaderWrapper}>
      <div className={styles.loader}></div>
      {message && <p className={styles.loaderMessage}>{message}</p>}
    </div>
  );
};

export default Loader;
