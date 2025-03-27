import React from "react";
import { CheckCircle, AlertTriangle, X } from "lucide-react";
import styles from "./dialog.module.css";

type DialogProps = {
  show: boolean;
  title: string;
  message: string;
  isError?: boolean;
  onClose: () => void;
};

const Dialog: React.FC<DialogProps> = ({
  show,
  title,
  message,
  isError = false,
  onClose,
}) => {
  if (!show) return null;

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialogContent}>
        <div className={styles.dialogHeader}>
          <div className={styles.dialogTitle}>
            {isError ? (
              <AlertTriangle size={24} className={styles.dialogIconError} />
            ) : (
              <CheckCircle size={24} className={styles.dialogIconSuccess} />
            )}
            <h3>{title}</h3>
          </div>
          <button className={styles.dialogCloseButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.dialogBody}>
          <p>{message}</p>
        </div>
        <div className={styles.dialogFooter}>
          <button
            className={`${styles.dialogButton} ${
              isError ? styles.dialogButtonError : styles.dialogButtonSuccess
            }`}
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dialog;