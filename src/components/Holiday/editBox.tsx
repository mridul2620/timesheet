import React, { useState, useEffect } from "react";
import { X, Calendar, Clock } from "lucide-react";
import styles from "./editBox.module.css";

interface LeaveRequest {
  _id: string;
  leaveType: string;
  from: string;
  to: string;
  reason: string;
  status: string;
  workingDays: number;
  createdAt: string;
}

interface BankHoliday {
  title: string;
  date: string;
  notes: string;
  bunting: boolean;
}

interface EditLeaveDialogProps {
  show: boolean;
  request: LeaveRequest | null;
  bankHolidays: BankHoliday[];
  onClose: () => void;
  onSubmit: (updatedRequest: Partial<LeaveRequest>) => void;
  calculateWorkingDays: (startDate: Date, endDate: Date | null) => number;
}

const EditLeaveDialog: React.FC<EditLeaveDialogProps> = ({
  show,
  request,
  bankHolidays,
  onClose,
  onSubmit,
  calculateWorkingDays,
}) => {
  const [formData, setFormData] = useState({
    leaveType: "",
    from: "",
    to: "",
    reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workingDays, setWorkingDays] = useState(0);

  useEffect(() => {
    if (request && show) {
      const fromDate = new Date(request.from).toISOString().split('T')[0];
      const toDate = new Date(request.to).toISOString().split('T')[0];
      
      setFormData({
        leaveType: request.leaveType,
        from: fromDate,
        to: toDate,
        reason: request.reason,
      });
    }
  }, [request, show]);

  useEffect(() => {
    if (formData.from && formData.to) {
      const startDate = new Date(formData.from);
      const endDate = new Date(formData.to);
      
      // Special handling for bank holiday leave type
      if (formData.leaveType.toLowerCase() === 'bank holiday') {
        setWorkingDays(1); // Bank holidays are always 1 day
      } else {
        const days = calculateWorkingDays(startDate, endDate);
        setWorkingDays(days);
      }
    }
  }, [formData.from, formData.to, formData.leaveType, calculateWorkingDays]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLeaveTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      leaveType: value
    }));
    
    // If changing to bank holiday, recalculate working days
    if (value.toLowerCase() === 'bank holiday') {
      setWorkingDays(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    setIsSubmitting(true);
    
    const updatedRequest = {
      leaveType: formData.leaveType,
      from: formData.from,
      to: formData.to,
      reason: formData.reason,
      workingDays: workingDays,
    };

    await onSubmit(updatedRequest);
    setIsSubmitting(false);
  };

  const isFormValid = formData.leaveType && formData.from && formData.to && formData.reason.trim();

  const getWorkingDaysLabel = () => {
    if (formData.leaveType.toLowerCase() === 'bank holiday') {
      return 'Days requested';
    }
    return 'Working days';
  };

  const getWorkingDaysNote = () => {
    if (formData.leaveType.toLowerCase() === 'bank holiday') {
      return "(Bank holidays don't count as working days off)";
    }
    return "";
  };

  if (!show || !request) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <Calendar className={styles.icon} size={24} />
            <h2 className={styles.title}>Edit Leave Request</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Leave Type</label>
            <select
              value={formData.leaveType}
              onChange={(e) => handleLeaveTypeChange(e.target.value)}
              className={styles.select}
              required
            >
              <option value="">Select leave type</option>
              <option value="holiday">Holiday</option>
              <option value="sick leave">Sick Leave</option>
              <option value="half day">Half Day</option>
              <option value="work from home">Work From Home</option>
              <option value="bank holiday">Bank Holiday</option>
            </select>
          </div>

          <div className={styles.dateRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>From Date</label>
              <input
                type="date"
                value={formData.from}
                onChange={(e) => handleInputChange('from', e.target.value)}
                className={styles.dateInput}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>To Date</label>
              <input
                type="date"
                value={formData.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                className={styles.dateInput}
                min={formData.from}
                required
              />
            </div>
          </div>

          <div className={styles.workingDaysInfo}>
            <Clock size={16} className={styles.clockIcon} />
            <div className={styles.workingDaysText}>
              <span>
                {workingDays} {getWorkingDaysLabel().toLowerCase()}{workingDays !== 1 ? 's' : ''}
              </span>
              {getWorkingDaysNote() && (
                <div className={styles.bankHolidayNote}>
                  {getWorkingDaysNote()}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Reason for Leave</label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              className={styles.textarea}
              placeholder="Enter the reason for your leave request..."
              rows={4}
              required
            />
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.submitButton} ${!isFormValid ? styles.disabled : ''}`}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLeaveDialog;