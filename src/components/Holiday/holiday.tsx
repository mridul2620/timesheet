import { useState, useEffect } from "react";
import { Trash2, Edit, FileText, Calendar1 } from "lucide-react";
import styles from "./holiday.module.css";
import Header from "../Header/header";
import Loader from "../Loader/loader";
import Calendar from "../payroll/calender";
import Dialog from "../homepage/dialog";
import EditLeaveDialog from "./editBox";

interface User {
  username: string;
  email: string;
  name: string;
  designation: string;
}

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

// Enhanced Calendar wrapper to add bank holiday styling
const EnhancedCalendar = ({ selectedDate, endDate, onChange, isDateRange, bankHolidays }: {
  selectedDate: Date;
  endDate: Date | null;
  onChange: (date: Date) => void;
  isDateRange: boolean;
  bankHolidays: BankHoliday[];
}) => {
  useEffect(() => {
    // Add custom styles for bank holidays after calendar renders
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
          content: "🏦";
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

    // Apply bank holiday classes to calendar days
    const applyBankHolidayClasses = () => {
      const calendarDays = document.querySelectorAll('.day');
      calendarDays.forEach((dayElement) => {
        const dayText = dayElement.textContent;
        if (dayText && !isNaN(Number(dayText))) {
          const dayNumber = parseInt(dayText);
          
          // Get the current month/year being displayed in the calendar
          // We need to get this from the calendar's current state
          const calendarContainer = dayElement.closest('.calendar');
          const monthYearElement = calendarContainer?.querySelector('.monthYear');
          
          let currentMonth = selectedDate.getMonth();
          let currentYear = selectedDate.getFullYear();
          
          // Try to parse the month/year from the calendar display if available
          if (monthYearElement?.textContent) {
            const monthYearText = monthYearElement.textContent.trim();
            const [monthName, yearStr] = monthYearText.split(' ');
            const monthNames = [
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"
            ];
            const monthIndex = monthNames.indexOf(monthName);
            if (monthIndex !== -1 && yearStr) {
              currentMonth = monthIndex;
              currentYear = parseInt(yearStr);
            }
          }
          
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

    // Apply classes after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(applyBankHolidayClasses, 100);
    
    // Also apply when the calendar changes (for navigation)
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

// Bank Holidays List Component
const BankHolidaysList = ({ bankHolidays, selectedDate }: {
  bankHolidays: BankHoliday[];
  selectedDate: Date;
}) => {
  // Get the year from the currently selected date instead of current year
  const displayYear = selectedDate.getFullYear();
  
  // Filter holidays for the selected year
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

// Dashboard Component
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingRequests, setIsFetchingRequests] = useState(false);
  const [bankHolidays, setBankHolidays] = useState<BankHoliday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
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
      request.leaveType.toLowerCase() !== 'work from home'
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

  // Edit dialog helper functions
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

  const workingDays = calculateWorkingDays(selectedDate, endDate);

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
    // Reset dates when changing leave type
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
        workingDays: workingDays // Include working days in the request
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
        // Send email notification to admin
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
          // Don't fail the main request if email fails
        }

        // Reset form
        setLeaveType("");
        setReason("");
        setSelectedDate(new Date());
        setEndDate(null);
        
        // Refresh leave requests
        fetchLeaveRequests();
        
        // Show success dialog
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
    // Show confirmation dialog instead of confirm()
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

  const calculateDays = (from: string, to: string) => {
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
      
      {isLoading ? (
        <Loader message="Loading user data..." />
      ) : !user ? (
        <div className={styles.errorMessage}>
          Unable to load user data. Please login again.
        </div>
      ) : (
        <>
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
                    <label>Number of working days</label>
                    <p style={{ color: '#fff', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                      {workingDays} working day{workingDays !== 1 ? 's' : ''}
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
                          <td>{calculateDays(request.from, request.to)}</td>
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
        </>
      )}
      
      {/* Dialog Component */}
      <Dialog
        show={dialog.show}
        title={dialog.title}
        message={dialog.message}
        isError={dialog.isError}
        onClose={hideDialog}
      />

      {/* Edit Leave Dialog */}
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