import React, { useState, useEffect } from "react";
import { Search, Filter, Eye, Check, X, Clock, Calendar, User, Mail, FileText, Timer, AlertTriangle, Loader2 } from "lucide-react";
import styles from "./approvals.module.css";
import Header from "../Header/header";

interface User {
  username: string;
  email: string;
  name: string;
  designation: string;
}

interface LeaveRequest {
  _id: string;
  username: string;
  email: string;
  leaveType: string;
  from: string;
  to: string;
  reason: string;
  workingDays: number;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface DialogState {
  show: boolean;
  request: LeaveRequest | null;
}

interface RejectionDialogState {
  show: boolean;
  request: LeaveRequest | null;
  reason: string;
}

interface LoadingState {
  [key: string]: boolean;
}

const AdminLeaveRequests: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ show: false, request: null });
  const [rejectionDialog, setRejectionDialog] = useState<RejectionDialogState>({ 
    show: false, 
    request: null, 
    reason: "" 
  });
  
  // Loading states for individual buttons
  const [loadingStates, setLoadingStates] = useState<LoadingState>({});
  const [isRejectionSubmitting, setIsRejectionSubmitting] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchRequests();
  }, []);

  useEffect(() => {
    let filtered = requests;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Filter by search term (username)
    if (searchTerm) {
      filtered = filtered.filter(request => 
        request.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter]);

  const setButtonLoading = (requestId: string, action: string, isLoading: boolean) => {
    const key = `${requestId}_${action}`;
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }));
  };

  const isButtonLoading = (requestId: string, action: string) => {
    const key = `${requestId}_${action}`;
    return loadingStates[key] || false;
  };

  const fetchUser = async () => {
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
    }
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_ADMIN_HOLIDAY_API;
      const response = await fetch(`${apiUrl}`);
      
      if (response.ok) {
        const data = await response.json();
        setRequests(data.data || []);
      } else {
        console.error("Failed to fetch leave requests");
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return styles.statusApproved;
      case 'rejected': return styles.statusRejected;
      default: return styles.statusPending;
    }
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'sick leave': return styles.leaveTypeSick;
      case 'casual leave': return styles.leaveTypeCasual;
      case 'work from home': return styles.leaveTypeWfh;
      case 'half day': return styles.leaveTypeHalfDay;
      default: return styles.leaveTypeDefault;
    }
  };

  const handleApprove = async (requestId: string) => {
    setButtonLoading(requestId, 'approve', true);
    await handleStatusChange(requestId, 'approved');
    setButtonLoading(requestId, 'approve', false);
  };

  const handleReject = (request: LeaveRequest) => {
    setRejectionDialog({ 
      show: true, 
      request, 
      reason: "" 
    });
  };

  const handleStatusChange = async (requestId: string, newStatus: string, rejectionReason?: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_HOLIDAY_UPDATE_API;
      const body: any = { status: newStatus };
      
      if (newStatus === 'rejected' && rejectionReason) {
        body.rejectionReason = rejectionReason;
      }

      const response = await fetch(`${apiUrl}${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        // Find the request to get user details for email
        const updatedRequest = requests.find(req => req._id === requestId);
        
        if (updatedRequest) {
          // Send email notification to user
          try {
            const emailData = {
              userEmail: updatedRequest.email,
              userName: updatedRequest.username,
              leaveType: updatedRequest.leaveType,
              fromDate: updatedRequest.from.split('T')[0], // Convert to YYYY-MM-DD format
              toDate: updatedRequest.to.split('T')[0],
              workingDays: updatedRequest.workingDays,
              reason: updatedRequest.reason,
              status: newStatus,
              rejectionReason: newStatus === 'rejected' ? rejectionReason : undefined
            };

            const emailAPI = process.env.NEXT_PUBLIC_HOLIDAY_USER_MAIL_API;
            const emailResponse = await fetch(`${emailAPI}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(emailData),
            });

            if (emailResponse.ok) {
              console.log("User notification email sent successfully");
            } else {
              console.error("Failed to send user notification email");
              const emailError = await emailResponse.json();
              console.error("Email error details:", emailError);
            }
          } catch (emailError) {
            console.error("Error sending user notification email:", emailError);
            // Don't fail the main request if email fails
          }
        }

        // Update local state
        setRequests(prev => prev.map(req => 
          req._id === requestId ? { 
            ...req, 
            status: newStatus,
            rejectionReason: newStatus === 'rejected' ? rejectionReason : undefined,
            updatedAt: new Date().toISOString()
          } : req
        ));
      } else {
        console.error("Failed to update status");
        const errorData = await response.json();
        console.error("Status update error:", errorData);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleRejectionSubmit = async () => {
    if (!rejectionDialog.request || !rejectionDialog.reason.trim()) return;

    setIsRejectionSubmitting(true);
    setButtonLoading(rejectionDialog.request._id, 'reject', true);
    
    await handleStatusChange(
      rejectionDialog.request._id, 
      'rejected', 
      rejectionDialog.reason.trim()
    );
    
    setButtonLoading(rejectionDialog.request._id, 'reject', false);
    setIsRejectionSubmitting(false);
    hideRejectionDialog();
  };

  const showDetails = (request: LeaveRequest) => {
    setDialog({ show: true, request });
  };

  const hideDetails = () => {
    setDialog({ show: false, request: null });
  };

  const hideRejectionDialog = () => {
    setRejectionDialog({ show: false, request: null, reason: "" });
  };

  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <Header title="Leave Requests" user={user} />
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading leave requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Header title="Leave Requests" user={user} />
      <div className={styles.container}>
        <div className={styles.searchFilterContainer}>
          {/* Search Bar */}
          <div className={styles.searchContainer}>
            <Search className={styles.searchIcon} size={20} />
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Status Filter */}
          <div className={styles.filterContainer}>
            <Filter className={styles.filterIcon} size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Status</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className={styles.resultsCount}>
          <p className={styles.resultsText}>
            Showing {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''}
            {searchTerm && ` for "${searchTerm}"`}
            {statusFilter !== 'all' && ` with status "${statusFilter}"`}
          </p>
        </div>

        {/* Request Cards */}
        <div className={styles.cardsGrid}>
          {filteredRequests.map((request) => (
            <div key={request._id} className={styles.requestCard}>
              {/* User Info */}
              <div className={styles.userInfo}>
                <div className={styles.userAvatar}>
                  <User className={styles.userIcon} size={20} />
                </div>
                <div className={styles.userDetails}>
                  <h3 className={styles.username}>{request.username}</h3>
                  <p className={styles.userEmail}>
                    <Mail size={14} />
                    {request.email}
                  </p>
                </div>
              </div>

              {/* Leave Type */}
              <div className={styles.leaveTypeContainer}>
                <span className={`${styles.leaveTypeBadge} ${getLeaveTypeColor(request.leaveType)}`}>
                  {request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}
                </span>
              </div>

              {/* Dates */}
              <div className={styles.datesContainer}>
                <div className={styles.dateRange}>
                  <Calendar size={16} />
                  <span>{formatDate(request.from)} - {formatDate(request.to)}</span>
                </div>
                <div className={styles.workingDays}>
                  <Timer size={14} />
                  <span>{request.workingDays} working day{request.workingDays !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Status */}
              <div className={styles.statusContainer}>
                <span className={`${styles.statusBadge} ${getStatusColor(request.status)}`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
              </div>

              {/* Actions */}
              <div className={styles.cardActions}>
                <button
                  onClick={() => showDetails(request)}
                  className={styles.detailsButton}
                  disabled={isButtonLoading(request._id, 'approve') || isButtonLoading(request._id, 'reject')}
                >
                  <Eye size={16} />
                  More Details
                </button>
                
                {request.status === 'pending' && (
                  <div className={styles.actionButtons}>
                    <button
                      onClick={() => handleApprove(request._id)}
                      className={`${styles.approveButton} ${isButtonLoading(request._id, 'approve') ? styles.loading : ''}`}
                      title="Approve"
                      disabled={isButtonLoading(request._id, 'approve') || isButtonLoading(request._id, 'reject')}
                    >
                      {isButtonLoading(request._id, 'approve') ? (
                        <Loader2 size={16} className={styles.spinner} />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(request)}
                      className={`${styles.rejectButton} ${isButtonLoading(request._id, 'reject') ? styles.loading : ''}`}
                      title="Reject"
                      disabled={isButtonLoading(request._id, 'approve') || isButtonLoading(request._id, 'reject')}
                    >
                      {isButtonLoading(request._id, 'reject') ? (
                        <Loader2 size={16} className={styles.spinner} />
                      ) : (
                        <X size={16} />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredRequests.length === 0 && (
          <div className={styles.emptyState}>
            <FileText className={styles.emptyIcon} size={48} />
            <h3 className={styles.emptyTitle}>No requests found</h3>
            <p className={styles.emptyMessage}>
              {searchTerm 
                ? `No leave requests found for "${searchTerm}"`
                : `No ${statusFilter} leave requests at the moment`
              }
            </p>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      {dialog.show && dialog.request && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialogContent}>
            <div className={styles.dialogHeader}>
              <h2 className={styles.dialogTitle}>
                <FileText className={styles.dialogIcon} size={24} />
                Leave Request Details
              </h2>
              <button onClick={hideDetails} className={styles.closeButton}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.dialogBody}>
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Username</label>
                  <p className={styles.detailValue}>{dialog.request.username}</p>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Email</label>
                  <p className={styles.detailValue}>{dialog.request.email}</p>
                </div>
              </div>

              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Leave Type</label>
                  <p className={styles.detailValue}>{dialog.request.leaveType}</p>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Status</label>
                  <span className={`${styles.statusBadge} ${getStatusColor(dialog.request.status)}`}>
                    {dialog.request.status.charAt(0).toUpperCase() + dialog.request.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>From Date</label>
                  <p className={styles.detailValue}>{formatDate(dialog.request.from)}</p>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>To Date</label>
                  <p className={styles.detailValue}>{formatDate(dialog.request.to)}</p>
                </div>
              </div>

              <div className={styles.detailItem}>
                <label className={styles.detailLabel}>Working Days</label>
                <p className={styles.detailValue}>{dialog.request.workingDays} day{dialog.request.workingDays !== 1 ? 's' : ''}</p>
              </div>

              <div className={styles.detailItem}>
                <label className={styles.detailLabel}>Reason</label>
                <p className={styles.reasonText}>{dialog.request.reason}</p>
              </div>

              {dialog.request.status === 'rejected' && dialog.request.rejectionReason && (
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Rejection Reason</label>
                  <p className={styles.rejectionReasonText}>{dialog.request.rejectionReason}</p>
                </div>
              )}

              <div className={styles.timestampContainer}>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Submitted</label>
                  <p className={styles.timestampValue}>{formatDate(dialog.request.createdAt)}</p>
                </div>
                <div className={styles.detailItem}>
                  <label className={styles.detailLabel}>Last Updated</label>
                  <p className={styles.timestampValue}>{formatDate(dialog.request.updatedAt)}</p>
                </div>
              </div>

              {dialog.request.status === 'pending' && (
                <div className={styles.dialogActions}>
                  <button
                    onClick={() => {
                      const requestId = dialog.request!._id;
                      setButtonLoading(requestId, 'approve', true);
                      handleApprove(requestId).finally(() => {
                        setButtonLoading(requestId, 'approve', false);
                      });
                      hideDetails();
                    }}
                    className={`${styles.dialogApproveButton} ${isButtonLoading(dialog.request._id, 'approve') ? styles.loading : ''}`}
                    disabled={isButtonLoading(dialog.request._id, 'approve') || isButtonLoading(dialog.request._id, 'reject')}
                  >
                    {isButtonLoading(dialog.request._id, 'approve') ? (
                      <>
                        <Loader2 size={16} className={styles.spinner} />
                        Approving...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      hideDetails();
                      handleReject(dialog.request!);
                    }}
                    className={styles.dialogRejectButton}
                    disabled={isButtonLoading(dialog.request._id, 'approve') || isButtonLoading(dialog.request._id, 'reject')}
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Dialog */}
      {rejectionDialog.show && rejectionDialog.request && (
        <div className={styles.dialogOverlay}>
          <div className={styles.rejectionDialogContent}>
            <div className={styles.dialogHeader}>
              <h2 className={styles.dialogTitle}>
                <AlertTriangle className={styles.rejectionIcon} size={24} />
                Reject Leave Request
              </h2>
              <button 
                onClick={hideRejectionDialog} 
                className={styles.closeButton}
                disabled={isRejectionSubmitting}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.dialogBody}>
              <div className={styles.rejectionInfo}>
                <p className={styles.rejectionMessage}>
                  You are about to reject <strong>{rejectionDialog.request.username}&apos;s</strong> leave request for <strong>{rejectionDialog.request.leaveType}</strong>.
                </p>
                <p className={styles.rejectionSubMessage}>
                  Please provide a reason for rejection:
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.detailLabel}>Rejection Reason</label>
                <textarea
                  value={rejectionDialog.reason}
                  onChange={(e) => setRejectionDialog(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Enter the reason for rejecting this leave request..."
                  className={styles.rejectionTextarea}
                  rows={4}
                  disabled={isRejectionSubmitting}
                />
              </div>

              <div className={styles.rejectionActions}>
                <button
                  onClick={hideRejectionDialog}
                  className={styles.cancelRejectionButton}
                  disabled={isRejectionSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectionSubmit}
                  disabled={!rejectionDialog.reason.trim() || isRejectionSubmitting}
                  className={`${styles.confirmRejectionButton} ${(!rejectionDialog.reason.trim() || isRejectionSubmitting) ? styles.disabled : ''}`}
                >
                  {isRejectionSubmitting ? (
                    <>
                      <Loader2 size={16} className={styles.spinner} />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <X size={16} />
                      Reject Request
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeaveRequests;
