import React, { useState, useEffect, useRef } from 'react';
import styles from './calculator.module.css';
import Calendar from './calender';

interface User {
  _id: string;
  email: string;
  name: string;
  designation: string;
  active: boolean;
  username: string;
  role?: string;
  payrate?: number;
}

interface PayrollCalculatorProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
}

interface Timesheet {
  _id: string;
  username: string;
  weekStartDate: string;
  entries: {
    id: string;
    project: string;
    subject: string;
    hours: {
      [date: string]: string;
    };
  }[];
  workDescription: string;
  timesheetStatus: string;
  dayStatus: {
    [date: string]: string;
  };
}

interface PayrollData {
  employee: string;
  timePeriod: string;
  hourlyRate: string;
  workingDays: number;
  totalTime: number;
  averageTimePerDay: number;
  netPay: number;
  status: string;
  recordId?: string;
}

const PayrollCalculator: React.FC<PayrollCalculatorProps> = ({
  users,
  selectedUser,
  onSelectUser
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isMonthlyView, setIsMonthlyView] = useState<boolean>(true);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [payrollData, setPayrollData] = useState<PayrollData>({
    employee: 'N/A',
    timePeriod: 'N/A',
    hourlyRate: 'N/A',
    workingDays: 0,
    totalTime: 0,
    averageTimePerDay: 0,
    netPay: 0,
    status: 'Unpaid'
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [statusPaid, setStatusPaid] = useState<boolean>(false);
  const [noDataMessage, setNoDataMessage] = useState<string | null>(null);
  const [checkingPayrollStatus, setCheckingPayrollStatus] = useState<boolean>(false);
  const [fetchTrigger, setFetchTrigger] = useState<number>(0);
  
  const isApiCallInProgress = useRef<boolean>(false);

  const handleDateChange = (date: Date) => {
    if (isMonthlyView) {
      setSelectedDate(date);
      setEndDate(null);
    } else {
      if (!endDate && date >= selectedDate) {
        setEndDate(date);
      } else {
        setSelectedDate(date);
        setEndDate(null);
      }
    }
  };

  const toggleViewMode = (isMonthly: boolean) => {
    setIsMonthlyView(isMonthly);
    setEndDate(null);
  };

  const getTimePeriod = () => {
    let startDateObj = new Date(selectedDate);
    let endDateObj = endDate ? new Date(endDate) : new Date(startDateObj);
    
    if (isMonthlyView) {
      startDateObj = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      endDateObj = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      const monthYear = startDateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      
      return monthYear;
    } else {
      return `${formatDate(startDateObj, 'd MMM yyyy')} - ${formatDate(endDateObj, 'd MMM yyyy')}`;
    }
  };

  const formatDate = (date: Date, format: string): string => {
    const d = date.getDate();
    const m = date.toLocaleString('en-GB', { month: 'short' });
    const y = date.getFullYear();
    
    return format
      .replace('d', d.toString())
      .replace('MMM', m)
      .replace('yyyy', y.toString());
  };

  useEffect(() => {
    const fetchData = async () => {
      if (isApiCallInProgress.current || !selectedUser) return;
      
      try {
        isApiCallInProgress.current = true;
        setLoading(true);
        setNoDataMessage(null);
        
        const timePeriod = getTimePeriod();
        const apiUrl = `${process.env.NEXT_PUBLIC_PAYROLL_URL}/${selectedUser.username}`;
        
        const payrollResponse = await fetch(apiUrl);
        let recordExists = false;
        let existingRecord = null;
        
        if (payrollResponse.ok) {
          const payrollData = await payrollResponse.json();
          
          if (payrollData.success && payrollData.data && payrollData.data.payroll && Array.isArray(payrollData.data.payroll)) {
            const exactMatch = payrollData.data.payroll.find(
              (record: any) => record.timePeriod === timePeriod
            );
            
            const trimmedMatch = payrollData.data.payroll.find(
              (record: any) => record.timePeriod.trim() === timePeriod.trim()
            );
            
            existingRecord = exactMatch || trimmedMatch;
            recordExists = !!existingRecord;
          }
        }
        
        if (recordExists && existingRecord) {
          const isPaid = existingRecord.status === 'Paid';
          
          setStatusPaid(isPaid);
          setPayrollData(prev => ({
            ...prev,
            status: existingRecord.status,
            recordId: existingRecord._id
          }));
        } else {
          setStatusPaid(false);
          setPayrollData(prev => ({
            ...prev,
            status: 'Unpaid',
            recordId: undefined
          }));
        }
        
        const timesheetUrl = `${process.env.NEXT_PUBLIC_GET_TIMESHEET_API}/${selectedUser.username}`;
        const timesheetResponse = await fetch(timesheetUrl);
        
        if (!timesheetResponse.ok) {
          if (timesheetResponse.status === 404) {
            setNoDataMessage(`No timesheet data available for ${selectedUser.name}`);
            setBasicUserData(selectedUser);
            return;
          }
          throw new Error(`Timesheet API responded with status: ${timesheetResponse.status}`);
        }
        
        const timesheetData = await timesheetResponse.json();
        
        if (timesheetData.message && timesheetData.message.includes("No timesheets found")) {
          setNoDataMessage(`No timesheet data available for ${selectedUser.name}`);
          setBasicUserData(selectedUser);
          return;
        }
        
        if (timesheetData.success) {
          setTimesheets(timesheetData.timesheets);
          calculatePayroll(timesheetData.timesheets, selectedUser);
        } else {
          throw new Error('Timesheet API returned unsuccessful response');
        }
      } catch (error) {
        if (selectedUser) {
          setBasicUserData(selectedUser);
        }
        setNoDataMessage(`Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
        isApiCallInProgress.current = false;
      }
    };

    if (selectedUser) {
      fetchData();
    } else {
      setPayrollData({
        employee: 'N/A',
        timePeriod: 'N/A',
        hourlyRate: 'N/A',
        workingDays: 0,
        totalTime: 0,
        averageTimePerDay: 0,
        netPay: 0,
        status: 'Unpaid'
      });
      setStatusPaid(false);
    }
  }, [selectedUser?.username, selectedDate, endDate, isMonthlyView, fetchTrigger]);

  const setBasicUserData = (user: User) => {
    setPayrollData(prev => ({
      employee: user.name,
      timePeriod: getTimePeriod(),
      hourlyRate: `£${Math.round(user.payrate || 0)}`,
      workingDays: 0,
      totalTime: 0,
      averageTimePerDay: 0,
      netPay: 0,
      status: prev.status || 'Unpaid',
      recordId: prev.recordId
    }));
  };

  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculatePayroll = (timesheetData: Timesheet[], user: User) => {
    let startDateObj = new Date(selectedDate);
    let endDateObj = endDate ? new Date(endDate) : new Date(startDateObj);
    
    if (isMonthlyView) {
      startDateObj = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      endDateObj = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    }
    
    const startDateStr = formatDateToYYYYMMDD(startDateObj);
    const endDateStr = formatDateToYYYYMMDD(endDateObj);
    
    const uniqueDays = new Set<string>();
    let totalHours = 0;
    
    timesheetData.forEach(timesheet => {
      timesheet.entries.forEach(entry => {
        Object.keys(entry.hours).forEach(date => {
          if (date >= startDateStr && date <= endDateStr) {
            uniqueDays.add(date);
            const hours = parseFloat(entry.hours[date]);
            if (!isNaN(hours)) {
              totalHours += hours;
            }
          }
        });
      });
    });
    
    const workingDays = uniqueDays.size;
    
    const hourlyRate = typeof user.payrate === 'number' ? user.payrate : 
                      (typeof user.payrate === 'string' ? parseFloat(user.payrate) : 0);
    
    const averageTimePerDay = workingDays > 0 ? totalHours / workingDays : 0;
    const netPay = hourlyRate * totalHours;
    
    const timePeriod = getTimePeriod();
    
    setPayrollData(prev => ({
      employee: user.name,
      timePeriod,
      hourlyRate: `£${Math.round(hourlyRate)}`,
      workingDays,
      totalTime: totalHours,
      averageTimePerDay: parseFloat(averageTimePerDay.toFixed(2)),
      netPay: parseFloat(netPay.toFixed(2)),
      status: prev.status || 'Unpaid',
      recordId: prev.recordId
    }));
  };

  const savePayrollRecord = async () => {
    if (!selectedUser || payrollData.totalTime === 0) {
      return;
    }
    
    if (isApiCallInProgress.current) return;
    
    try {
      isApiCallInProgress.current = true;
      setLoading(true);
      
      const newStatus = statusPaid ? 'Unpaid' : 'Paid';
      
      const payrollRecord = {
        username: selectedUser.username,
        name: selectedUser.name,
        timePeriod: payrollData.timePeriod,
        payrate: parseInt(payrollData.hourlyRate.replace('£', '')),
        netPay: payrollData.netPay,
        totalTime: payrollData.totalTime,
        workingDays: payrollData.workingDays,
        status: newStatus
      };
      
      let url = `${process.env.NEXT_PUBLIC_PAYROLL_URL}`;
      let method = 'POST';
      
      if (payrollData.recordId) {
        url = `${process.env.NEXT_PUBLIC_PAYROLL_URL}/${selectedUser.username}/${payrollData.recordId}`;
        method = 'PUT';
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payrollRecord),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatusPaid(newStatus === 'Paid');
        setPayrollData(prev => ({
          ...prev,
          status: newStatus,
          recordId: data.data?._id || prev.recordId
        }));
        
        setNoDataMessage(`Payment record ${payrollData.recordId ? 'updated' : 'saved'} successfully.`);
        
        setTimeout(() => {
          setNoDataMessage(null);
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to save payment record');
      }
    } catch (error) {
      setNoDataMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      isApiCallInProgress.current = false;
    }
  };

  const togglePaymentStatus = () => {
    savePayrollRecord();
  };

  const SkeletonLoader = () => (
    <div className={styles.skeletonLoader}>
      <div className={styles.skeletonWave}></div>
    </div>
  );

  return (
    <div className={styles.payrollContainer}>
      <div className={styles.payrollTitle}>
        <h2>Payroll Calculator</h2>
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.viewToggleBtn} ${isMonthlyView ? styles.active : ''}`}
            onClick={() => toggleViewMode(true)}
          >
            Monthly
          </button>
          <button 
            className={`${styles.viewToggleBtn} ${!isMonthlyView ? styles.active : ''}`}
            onClick={() => toggleViewMode(false)}
          >
            Date Range
          </button>
        </div>
      </div>
      
      <div className={styles.payrollContent}>
        <div className={styles.calendarSection}>
          <Calendar 
            selectedDate={selectedDate}
            endDate={endDate}
            onChange={handleDateChange}
            isDateRange={!isMonthlyView}
          />
          
          {noDataMessage && (
            <div className={styles.infoMessage}>
              {noDataMessage}
            </div>
          )}
          
          {!selectedUser && (
            <div className={styles.infoMessage}>
              Please select a user from the team list below
            </div>
          )}
        </div>
        
        <div className={styles.gridSection}>
          <div className={styles.gridContainer}>
            <div className={styles.gridItem}>
              <h3>Employee</h3>
              {loading || checkingPayrollStatus ? <SkeletonLoader /> : <p>{payrollData.employee}</p>}
            </div>
            <div className={styles.gridItem}>
              <h3>Time Period</h3>
              {loading || checkingPayrollStatus ? <SkeletonLoader /> : <p>{payrollData.timePeriod}</p>}
            </div>
            <div className={styles.gridItem}>
              <h3>Hourly Rate</h3>
              {loading || checkingPayrollStatus ? <SkeletonLoader /> : <p>{payrollData.hourlyRate}</p>}
            </div>
            <div className={styles.gridItem}>
              <h3>Working Days</h3>
              {loading || checkingPayrollStatus ? <SkeletonLoader /> : <p>{payrollData.workingDays}</p>}
            </div>
            <div className={styles.gridItem}>
              <h3>Total Time (hrs)</h3>
              {loading || checkingPayrollStatus ? <SkeletonLoader /> : <p>{payrollData.totalTime}</p>}
            </div>
            <div className={styles.gridItem}>
              <h3>Avg Time/Day</h3>
              {loading || checkingPayrollStatus ? <SkeletonLoader /> : <p>{payrollData.averageTimePerDay}</p>}
            </div>
            <div className={styles.gridItem}>
              <h3>Net Pay</h3>
              {loading || checkingPayrollStatus ? <SkeletonLoader /> : <p>£{payrollData.netPay}</p>}
            </div>
            <div className={styles.gridItem}>
              <h3>Status</h3>
              {loading || checkingPayrollStatus ? (
                <SkeletonLoader />
              ) : (
                <p className={payrollData.status === 'Paid' ? styles.paidStatus : styles.unpaidStatus}>
                  {payrollData.status}
                </p>
              )}
            </div>
            <div className={styles.gridItem}>
              <button 
                className={`${styles.paymentButton} ${statusPaid ? styles.unpaidButton : styles.paidButton}`}
                onClick={togglePaymentStatus}
                disabled={loading || checkingPayrollStatus || !selectedUser || payrollData.totalTime === 0}
              >
                {loading || checkingPayrollStatus ? 'Processing...' : (statusPaid ? 'Mark as Unpaid' : 'Mark as Paid')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollCalculator;