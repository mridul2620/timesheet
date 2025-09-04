import { useState, useEffect } from "react";
import { Trash2, Edit, FileText, Calendar1, CalendarDays } from "lucide-react";
import styles from "./holiday.module.css";
import Header from "../Header/header";
import Loader from "../Loader/loader";
import Calendar from "../payroll/calender";
import Dialog from "../homepage/dialog";
import EditLeaveDialog from "./editBox";
import HolidayPlannerCalendar from "./HolidayPlanner";

interface User {
  username: string;
  email: string;
  name: string;
  designation: string;
}

interface LeaveRequest {
  _id: string;
  username?: string;
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

interface DialogState {
  show: boolean;
  title: string;
  message: string;
  isError: boolean;
}

interface EditDialogState {
  show: boolean;
  request: LeaveRequest | null;
}

interface DashboardMetrics {
  totalRequests: number;
  approvedWorkingDays: number;
}

const EnhancedCalendar = ({ selectedDate, endDate, onChange, isDateRange, bankHolidays }: {
  selectedDate: Date;
  endDate: Date | null;
  onChange: (date: Date) => void;
  isDateRange: boolean;
  bankHolidays: BankHoliday[];
}) => {
  useEffect(() => {
    const addBankHolidayStyles = () => {
      const style = document.getElementById('bank-holiday-styles');
      if (style) return;

      const styleElement = document.createElement('style');
      styleElement.id = 'bank-holiday-styles';
      styleElement.textContent = `
        .bank-holiday-day {
          background-color: #f97316 !important;
          color: white !important;
          position: relative;
        }
        .bank-holiday-day::after {
          content: "🏛";
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 8px;
          opacity: 0.8;
        }
        .bank-holiday-day:hover {
          background-color: #ea580c !important;
        }
      `;
      document.head.appendChild(styleElement);
    };

    addBankHolidayStyles();

    const applyBankHolidayClasses = () => {
      const calendarDays = document.querySelectorAll('.day');
      calendarDays.forEach((dayElement) => {
        const dayText = dayElement.textContent;
        if (dayText && !isNaN(Number(dayText))) {
          const dayNumber = parseInt(dayText);
          
          let currentMonth = selectedDate.getMonth();
          let currentYear = selectedDate.getFullYear();
          
          const dayDate = new Date(currentYear, currentMonth, dayNumber);
          const dateString = dayDate.toISOString().split('T')[0];
          
          const isBankHoliday = bankHolidays.some(holiday => holiday.date === dateString);
          const bankHoliday = bankHolidays.find(holiday => holiday.date === dateString);
          
          if (isBankHoliday && bankHoliday) {
            dayElement.classList.add('bank-holiday-day');
            dayElement.setAttribute('title', bankHoliday.title);
          } else {
            dayElement.classList.remove('bank-holiday-day');
            dayElement.removeAttribute('title');
          }
        }
      });
    };

    const timeoutId = setTimeout(applyBankHolidayClasses, 100);
    const intervalId = setInterval(applyBankHolidayClasses, 500);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [selectedDate, bankHolidays]);

  return <Calendar 
    selectedDate={selectedDate}
    endDate={endDate}
    onChange={onChange}
    isDateRange={isDateRange}
  />;
};

const BankHolidaysList = ({ bankHolidays, selectedDate }: {
  bankHolidays: BankHoliday[];
  selectedDate: Date;
}) => {
  const displayYear = selectedDate.getFullYear();
  
  const yearHolidays = bankHolidays.filter(holiday => 
    new Date(holiday.date).getFullYear() === displayYear
  );

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className={styles.bankHolidaysSection}>
      <h3 className={styles.bankHolidaysTitle}>
        <span className={styles.bankHolidayIndicator}></span>
        UK Bank Holidays {displayYear}
      </h3>
      {yearHolidays.length === 0 ? (
        <p className={styles.noBankHolidays}>
          No bank holidays data available for {displayYear}
        </p>
      ) : (
        <div className={styles.bankHolidaysList}>
          {yearHolidays.map((holiday, index) => (
            <div key={index} className={styles.bankHolidayItem}>
              <div className={styles.bankHolidayName}>
                {holiday.title}
                {holiday.notes && (
                  <span className={styles.bankHolidayNote}>
                    ({holiday.notes})
                  </span>
                )}
              </div>
              <div className={styles.bankHolidayDate}>
                {formatFullDate(holiday.date)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = ({ metrics }: { metrics: DashboardMetrics }) => {
  return (
    <div className={styles.dashboardSection}>
      <h2 className={styles.sectionTitle}>Annual Overview</h2>
      <div className={styles.dashboardGrid}>
        <div className={styles.dashboardCard}>
          <div className={`${styles.dashboardCardIcon} ${styles.requestsIcon}`}>
            <FileText size={32} />
          </div>
          <div className={styles.dashboardCardValue}>
            {metrics.totalRequests}
          </div>
          <div className={styles.dashboardCardLabel}>
            Total Requests
          </div>
          <div className={styles.dashboardCardSubtext}>
            {new Date().getFullYear()} Annual
          </div>
        </div>
        
        <div className={styles.dashboardCard}>
          <div className={`${styles.dashboardCardIcon} ${styles.daysIcon}`}>
            <Calendar1 size={32} />
          </div>
          <div className={styles.dashboardCardValue}>
            {metrics.approvedWorkingDays}
          </div>
          <div className={styles.dashboardCardLabel}>
            Working Days Off
          </div>
          <div className={styles.dashboardCardSubtext}>
            Approved Only
          </div>
        </div>
      </div>
    </div>
  );
};

export default function HolidayApproval() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [allLeaveRequests, setAllLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingRequests, setIsFetchingRequests] = useState(false);
  const [bankHolidays, setBankHolidays] = useState<BankHoliday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [activeTab, setActiveTab] = useState<'leave' | 'planner'>('leave');
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    totalRequests: 0,
    approvedWorkingDays: 0
  });
  
  const [dialog, setDialog] = useState<DialogState>({
    show: false,
    title: "",
    message: "",
    isError: false
  });

  const [editDialog, setEditDialog] = useState<EditDialogState>({
    show: false,
    request: null
  });

  useEffect(() => {
    fetchUser();
    fetchBankHolidays();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLeaveRequests();
      fetchAllLeaveRequests();
    }
  }, [user]);

  useEffect(() => {
    calculateDashboardMetrics();
  }, [leaveRequests]);

  const calculateDashboardMetrics = () => {
    const currentYear = new Date().getFullYear();
    const currentYearRequests = leaveRequests.filter(request => {
      const requestYear = new Date(request.createdAt).getFullYear();
      return requestYear === currentYear;
    });

    const totalRequests = currentYearRequests.length;
    
    const approvedWorkingDays = currentYearRequests
      .filter(request => 
        request.status === 'approved' && 
        request.leaveType.toLowerCase() !== 'work from home' &&
        request.leaveType.toLowerCase() !== 'bank holiday'
      )
      .reduce((total, request) => {
        if (request.leaveType.toLowerCase() === 'half day') {
          return total + 0.5;
        }
        return total + (request.workingDays || 0);
      }, 0);

    setDashboardMetrics({
      totalRequests,
      approvedWorkingDays
    });
  };

  const showDialog = (title: string, message: string, isError: boolean = false) => {
    setDialog({
      show: true,
      title,
      message,
      isError
    });
  };

  const hideDialog = () => {
    setDialog(prev => ({ ...prev, show: false }));
  };

  const showEditDialog = (request: LeaveRequest) => {
    setEditDialog({
      show: true,
      request
    });
  };

  const hideEditDialog = () => {
    setEditDialog({
      show: false,
      request: null
    });
  };

  const calculateWorkingDays = (startDate: Date, endDate: Date | null) => {
    const start = new Date(startDate);
    const end = endDate || startDate;
    
    let workingDays = 0;
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dateString = currentDate.toISOString().split('T')[0];     
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isBankHoliday = bankHolidays.some(holiday => holiday.date === dateString);

      if (!isWeekend && !isBankHoliday) {
        workingDays++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workingDays;
  };

  const calculateDaysForLeaveType = (leaveType: string, startDate: Date, endDate: Date | null) => {
    if (leaveType.toLowerCase() === 'bank holiday') {
      return 1;
    }
    return calculateWorkingDays(startDate, endDate);
  };

  const workingDays = calculateDaysForLeaveType(leaveType, selectedDate, endDate);

  const fetchBankHolidays = async () => {
    setIsLoadingHolidays(true);
    try {
      const response = await fetch('https://www.gov.uk/bank-holidays.json');
      if (response.ok) {
        const data = await response.json();
        setBankHolidays(data['england-and-wales']?.events || []);
      } else {
        throw new Error('Failed to fetch bank holidays');
      }
    } catch (error) {
      console.error("Error fetching bank holidays:", error);
      setBankHolidays([]);
    } finally {
      setIsLoadingHolidays(false);
    }
  };

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const storedData = localStorage.getItem("loginResponse");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData.success) {
          setUser(parsedData.user);
        }
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllLeaveRequests = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_HOLIDAY_ALL_API;
      if (!apiUrl) {
        console.error("API URL not configured");
        return;
      }
      
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        setAllLeaveRequests(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching all leave requests:", error);
      setAllLeaveRequests([]);
    }
  };

  const isFormValid = leaveType && reason.trim() && selectedDate;

  const fetchLeaveRequests = async () => {
    if (!user?.username) return;
    
    setIsFetchingRequests(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_HOLIDAY_API;
      const response = await fetch(`${apiUrl}${user.username}`);
      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setIsFetchingRequests(false);
    }
  };

  const handleDateSelect = (date: Date) => {
     if (!endDate && date >= selectedDate) {
        setEndDate(date);
      } else {
        setSelectedDate(date);
        setEndDate(null);
      }
  };

  const handleLeaveTypeChange = (type: string) => {
    setLeaveType(type);
    setSelectedDate(new Date());
    setEndDate(null);
  };

  const handleSubmit = async () => {
    if (!isFormValid || !user) return;

    setIsSubmitting(true);
    const formatDateForAPI = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    try {
      const requestData = {
        email: Array.isArray(user.email) ? user.email[0] : user.email,
        leaveType,
        from: formatDateForAPI(selectedDate),
        to: formatDateForAPI(endDate || selectedDate), 
        reason,
        workingDays: workingDays
      };

      const apiUrl = process.env.NEXT_PUBLIC_HOLIDAY_API;
      const response = await fetch(`${apiUrl}${user.username}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        try {
          const emailData = {
            userEmail: Array.isArray(user.email) ? user.email[0] : user.email,
            userName: user.name,
            leaveType,
            fromDate: formatDateForAPI(selectedDate), 
            toDate: formatDateForAPI(endDate || selectedDate),
            workingDays,
            reason,
            status: 'pending'
          };

          const emailAPI = process.env.NEXT_PUBLIC_HOLIDAY_MAIL_API;
          const emailResponse = await fetch(`${emailAPI}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(emailData),
          });

          if (emailResponse.ok) {
            console.log("Admin notification email sent successfully");
          } else {
            console.error("Failed to send admin notification email");
          }
        } catch (emailError) {
          console.error("Error sending admin notification email:", emailError);
        }

        setLeaveType("");
        setReason("");
        setSelectedDate(new Date());
        setEndDate(null);
        
        fetchLeaveRequests();
        fetchAllLeaveRequests();
        
        showDialog(
          "Success",
          "Your leave request has been submitted successfully! You will receive a notification once it's reviewed.",
          false
        );
      } else {
        const errorData = await response.json();
        showDialog(
          "Error",
          errorData.message || "Failed to submit leave request. Please try again.",
          true
        );
      }
    } catch (error) {
      console.error("Error submitting leave request:", error);
      showDialog(
        "Error",
        "An unexpected error occurred while submitting your leave request. Please check your connection and try again.",
        true
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setLeaveType("");
    setReason("");
    setSelectedDate(new Date());
    setEndDate(null);
  };

  const handleEdit = (request: LeaveRequest) => {
    if (request.status === 'approved') {
      showDialog(
        "Edit Not Allowed",
        "Sorry, you cannot edit an approved leave request.",
        true
      );
      return;
    }
    
    showEditDialog(request);
  };

  const handleEditSubmit = async (updatedRequest: Partial<LeaveRequest>) => {
    if (!editDialog.request) return;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_HOLIDAY_API?.replace('/api/holiday/', '');
      const response = await fetch(`${baseUrl}/api/holiday/${editDialog.request._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedRequest),
      });

      if (response.ok) {
        hideEditDialog();
        fetchLeaveRequests();
        fetchAllLeaveRequests();
        showDialog(
          "Success",
          "Your leave request has been updated successfully!",
          false
        );
      } else {
        const errorData = await response.json();
        showDialog(
          "Error",
          errorData.message || "Failed to update leave request. Please try again.",
          true
        );
      }
    } catch (error) {
      console.error("Error updating leave request:", error);
      showDialog(
        "Error",
        "An unexpected error occurred while updating your leave request.",
        true
      );
    }
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this leave request?");
    if (!confirmDelete) return;

    setIsFetchingRequests(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_HOLIDAY_API?.replace('/api/holiday/', '');
      const response = await fetch(`${baseUrl}/api/holiday/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchLeaveRequests();
        fetchAllLeaveRequests();
        showDialog(
          "Success",
          "Leave request deleted successfully!",
          false
        );
      } else {
        showDialog(
          "Error",
          "Failed to delete leave request. Please try again.",
          true
        );
      }
    } catch (error) {
      console.error("Error deleting leave request:", error);
      showDialog(
        "Error",
        "An unexpected error occurred while deleting the leave request.",
        true
      );
    } finally {
      setIsFetchingRequests(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateDays = (from: string, to: string, leaveType: string) => {
    if (leaveType.toLowerCase() === 'bank holiday') {
      return 1;
    }
    const startDate = new Date(from);
    const endDate = new Date(to);
    return calculateWorkingDays(startDate, endDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return styles.statusApproved;
      case 'rejected': return styles.statusRejected;
      default: return styles.statusPending;
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Header title="Holiday Requests" user={user} />
      
      <div className={styles.container}>
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-2xl border border-gray-600/50 overflow-hidden mb-6">
          <div className="border-b border-gray-600/50 bg-gradient-to-r from-gray-800/80 to-gray-700/80">
            <nav className="flex relative">
              <div 
                className="absolute bottom-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500 ease-out rounded-t-full"
                style={{
                  left: activeTab === 'leave' ? '0%' : '50%',
                  width: '50%'
                }}
              />
              <button
                onClick={() => setActiveTab('leave')}
                className={`flex-1 px-6 py-4 text-sm font-semibold border-r border-gray-600/50 transition-all duration-300 ease-out relative overflow-hidden group ${
                  activeTab === 'leave'
                    ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-300 shadow-lg'
                    : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Apply for Leave
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              </button>
              <button
                onClick={() => setActiveTab('planner')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-300 ease-out relative overflow-hidden group ${
                  activeTab === 'planner'
                    ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-300 shadow-lg'
                    : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  Team Holiday Planner
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-600/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              </button>
            </nav>
          </div>
          
          <div className="bg-gray-900/95 backdrop-blur-sm">
            <div className={`transition-all duration-500 ease-out ${
              activeTab === 'planner' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 hidden'
            }`}>
              {activeTab === 'planner' && (
                <div className="p-0 h-[calc(100vh-200px)] overflow-hidden">
                  <HolidayPlannerCalendar
                    allLeaveRequests={allLeaveRequests as any}
                    user={user}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <Loader message="Loading user data..." />
      ) : !user ? (
        <div className={styles.errorMessage}>
          Unable to load user data. Please login again.
        </div>
      ) : (
        <>
          {activeTab === 'leave' && (
            <div className={styles.container}>
              <div className={styles.content}>
                <div className={styles.leftSection}>
                  <div className={styles.calendarWrapper}>
                    <EnhancedCalendar 
                      selectedDate={selectedDate}
                      endDate={endDate}
                      onChange={handleDateSelect}
                      isDateRange={true}
                      bankHolidays={bankHolidays}
                    />
                    
                    {isLoadingHolidays ? (
                      <Loader message="Loading bank holidays..." fullScreen={false} />
                    ) : (
                      <BankHolidaysList 
                        bankHolidays={bankHolidays} 
                        selectedDate={selectedDate}
                      />
                    )}
                  </div>
                </div>

                <div className={styles.rightSection}>
                  <div className={styles.formSection}>
                    <h2 className={styles.sectionTitle}>Apply for Leave</h2>
                
                    <div className={styles.formGroup}>
                      <label>Leave Type</label>
                      <select 
                        value={leaveType} 
                        onChange={(e) => handleLeaveTypeChange(e.target.value)}
                        className={styles.select}
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
                        <label>From</label>
                        <input 
                          type="text"
                          value={selectedDate.toLocaleDateString()}
                          readOnly
                          className={styles.dateInput}
                        />
                      </div>
                      
                      <div className={styles.formGroup}>
                        <label>To</label>
                        <input 
                          type="text"
                          value={endDate ? endDate.toLocaleDateString() : selectedDate.toLocaleDateString()}
                          readOnly
                          className={styles.dateInput}
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>
                        {leaveType.toLowerCase() === 'bank holiday' ? 'Days requested' : 'Number of working days'}
                      </label>
                      <p style={{ color: '#fff', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                        {workingDays} {leaveType.toLowerCase() === 'bank holiday' ? 'day' : 'working day'}{workingDays !== 1 ? 's' : ''}
                        {leaveType.toLowerCase() === 'bank holiday' && (
                          <span style={{ color: '#f97316', marginLeft: '8px' }}>
                            (Bank holidays don't count as working days off)
                          </span>
                        )}
                      </p>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Reason</label>
                      <textarea 
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Enter the reason for the leave"
                        className={styles.textarea}
                        rows={3}
                      />
                    </div>

                    <div className={styles.buttonGroup}>
                      <button 
                        onClick={handleCancel}
                        className={styles.cancelButton}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSubmit}
                        disabled={!isFormValid || isSubmitting}
                        className={`${styles.submitButton} ${!isFormValid ? styles.disabled : ''}`}
                      >
                        {isSubmitting ? "Submitting..." : "Submit"}
                      </button>
                    </div>
                  </div>

                  <Dashboard metrics={dashboardMetrics} />
                </div>
              </div>

              <div className={styles.leaveRequestsSection}>
                <h2 className={styles.sectionTitle}>My Leave Requests</h2>
                
                {isFetchingRequests ? (
                  <Loader message="Loading leave requests..." fullScreen={false} />
                ) : leaveRequests.length === 0 ? (
                  <div className={styles.noRequests}>No leave requests found</div>
                ) : (
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Leave Type</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Days</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequests.map((request) => (
                          <tr key={request._id} className={styles.tableRow}>
                            <td className={styles.leaveType}>
                              {request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}
                            </td>
                            <td>{formatDate(request.from)}</td>
                            <td>{formatDate(request.to)}</td>
                            <td>{calculateDays(request.from, request.to, request.leaveType)}</td>
                            <td>
                              <span className={`${styles.status} ${getStatusColor(request.status)}`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </td>
                            <td>
                              <div className={styles.actionButtons}>
                                <button 
                                  onClick={() => handleEdit(request)}
                                  className={`${styles.editButton} ${request.status === 'approved' ? styles.disabledButton : ''}`}
                                  title={request.status === 'approved' ? "Cannot edit approved request" : "Edit leave request"}
                                >
                                  <Edit size={16} />
                                </button>
                                {request.status === 'pending' && (
                                  <button 
                                    onClick={() => handleDelete(request._id)}
                                    className={styles.deleteButton}
                                    title="Delete leave request"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
      
      <Dialog
        show={dialog.show}
        title={dialog.title}
        message={dialog.message}
        isError={dialog.isError}
        onClose={hideDialog}
      />

      <EditLeaveDialog
        show={editDialog.show}
        request={editDialog.request}
        bankHolidays={bankHolidays}
        onClose={hideEditDialog}
        onSubmit={handleEditSubmit}
        calculateWorkingDays={calculateWorkingDays}
      />
      
      {isSubmitting && <Loader message="Submitting leave request..." />}
    </div>
  );
}