import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users, X, CalendarDays, Clock, TrendingUp } from 'lucide-react';
import { createPortal } from "react-dom";

interface User {
  username: string;
  email: string;
  name: string;
  designation: string;
}

interface LeaveRequest {
  _id: string;
  username?: string;
  email: string;
  leaveType: string;
  from: string;
  to: string;
  reason: string;
  status: string;
  workingDays: number;
  createdAt: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  leaveRequests: LeaveRequest[];
  dayOfWeek: number;
}

interface TooltipData {
  show: boolean;
  x: number;
  y: number;
  content: LeaveRequest[];
  date: Date | null;
}

const LEAVE_TYPE_COLORS = {
  'holiday': { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-blue-100', border: 'border-blue-400/30' },
  'work from home': { bg: 'bg-gradient-to-r from-green-500 to-green-600', text: 'text-green-100', border: 'border-green-400/30' },
  'casual leave': { bg: 'bg-gradient-to-r from-purple-500 to-purple-600', text: 'text-purple-100', border: 'border-purple-400/30' },
  'sick leave': { bg: 'bg-gradient-to-r from-red-500 to-red-600', text: 'text-red-100', border: 'border-red-400/30' },
  'half day': { bg: 'bg-gradient-to-r from-orange-500 to-orange-600', text: 'text-orange-100', border: 'border-orange-400/30' },
  'bank holiday': { bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600', text: 'text-yellow-100', border: 'border-yellow-400/30' }
} as const;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dateUtils = {
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  },
  parseDate(dateString: string): Date {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${dateString}`);
    }
    return date;
  },
  
  isDateInRange: (checkDate: Date, startDate: Date, endDate: Date): boolean => {
    const normalizedCheckDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
    const normalizedStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const normalizedEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    return normalizedCheckDate >= normalizedStartDate && normalizedCheckDate <= normalizedEndDate;
  },
  
  getDaysInMonth: (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  },
  
  getFirstDayOfMonth: (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  }
};

const useCalendarData = (allLeaveRequests: LeaveRequest[], currentDate: Date) => {
  return useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const approvedRequests = allLeaveRequests.filter(request => 
      request.status === 'approved'
    );

    const processedRequests = approvedRequests.map(request => {
      try {
        return {
          ...request,
          fromDate: dateUtils.parseDate(request.from),
          toDate: dateUtils.parseDate(request.to)
        };
      } catch (error) {
        console.error('Error parsing request dates:', error, request);
        return null;
      }
    }).filter(Boolean) as (LeaveRequest & { fromDate: Date; toDate: Date })[];

    const daysInMonth = dateUtils.getDaysInMonth(year, month);
    const firstDayOfMonth = dateUtils.getFirstDayOfMonth(year, month);
    const daysInPrevMonth = dateUtils.getDaysInMonth(year, month - 1);
    
    const calendarDays: CalendarDay[] = [];

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      const dayRequests = processedRequests.filter(request =>
        dateUtils.isDateInRange(date, request.fromDate, request.toDate)
      );
      
      calendarDays.push({
        date,
        isCurrentMonth: false,
        leaveRequests: dayRequests,
        dayOfWeek: date.getDay()
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayRequests = processedRequests.filter(request =>
        dateUtils.isDateInRange(date, request.fromDate, request.toDate)
      );
      
      calendarDays.push({
        date,
        isCurrentMonth: true,
        leaveRequests: dayRequests,
        dayOfWeek: date.getDay()
      });
    }

    const remainingDays = 42 - calendarDays.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dayRequests = processedRequests.filter(request =>
        dateUtils.isDateInRange(date, request.fromDate, request.toDate)
      );
      
      calendarDays.push({
        date,
        isCurrentMonth: false,
        leaveRequests: dayRequests,
        dayOfWeek: date.getDay()
      });
    }

    return calendarDays;
  }, [allLeaveRequests, currentDate]);
};

const LeaveTooltip: React.FC<{ tooltip: TooltipData; onClose: () => void }> = ({ 
  tooltip, 
  onClose 
}) => {
  if (!tooltip.show || !tooltip.content.length) return null;

  const formatDisplayDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div 
      className="fixed z-50 bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-2xl p-4 max-w-80 animate-in slide-in-from-bottom-4 duration-300"
      style={{ 
        left: Math.min(tooltip.x, window.innerWidth - 320),
        top: Math.max(10, tooltip.y - 200)
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Calendar size={14} className="text-orange-400" />
          {tooltip.date?.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          })}
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors hover:bg-gray-700 rounded-full p-1"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="space-y-3">
        {tooltip.content.slice(0,1).map((request, index) => (
          <div key={request._id || index} className="bg-gray-700/40 rounded-lg p-3 border border-gray-600/30 last:border-b-0">
            <div className="flex items-center gap-2 mb-2">
              <Users size={12} className="text-orange-400" />
              <span className="text-white font-medium text-xs">{request.username || 'Unknown'}</span>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <div className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                LEAVE_TYPE_COLORS[request.leaveType as keyof typeof LEAVE_TYPE_COLORS]?.bg || 'bg-gray-500'
              } ${LEAVE_TYPE_COLORS[request.leaveType as keyof typeof LEAVE_TYPE_COLORS]?.text || 'text-white'} ${
                LEAVE_TYPE_COLORS[request.leaveType as keyof typeof LEAVE_TYPE_COLORS]?.border || 'border-gray-500/30'
              }`}>
                {request.leaveType.toUpperCase()}
              </div>
              <span className="text-gray-300 text-xs flex items-center gap-1">
                <Clock size={10} />
                {request.workingDays} day{request.workingDays !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="text-gray-300 text-xs mb-2 flex items-center gap-1">
              <Calendar size={10} className="text-gray-400" />
              {formatDisplayDate(request.from)} - {formatDisplayDate(request.to)}
            </div>
            
            {request.reason && (
              <div className="text-gray-400 text-xs italic bg-gray-800/40 rounded p-2 border-l-2 border-orange-400/50">
                &quot;{request.reason}&quot;
              </div>
            )}
          </div>
        ))}
        {tooltip.content.length > 1 && (
          <div className="text-gray-400 text-xs italic text-center mt-2">+{tooltip.content.length - 1} more&hellip;</div>
        )}
      </div>
    </div>
  );
};

const CalendarDay: React.FC<{
  day: CalendarDay;
  onDayHover: (event: React.MouseEvent, day: CalendarDay) => void;
  onDayClick: (day: CalendarDay) => void; 
}> = React.memo(({ day, onDayHover, onDayClick }) => {
  const isToday = useMemo(() => {
    const today = new Date();
    return day.date.toDateString() === today.toDateString();
  }, [day.date]);

  const hasLeaveRequests = day.leaveRequests.length > 0;
  const uniqueLeaveTypes = useMemo(() => {
    const types: string[] = [];
    for (const req of day.leaveRequests) {
      if (!types.includes(req.leaveType)) {
        types.push(req.leaveType);
      }
    }
    return types;
  }, [day.leaveRequests]);

  return (
    <div
      className={`
        relative h-full p-1 border border-gray-600/40 cursor-pointer transition-all duration-200 group
        ${day.isCurrentMonth ? 'bg-gray-800/60 hover:bg-gray-700/60' : 'bg-gray-900/60 opacity-50 hover:opacity-70'}
        ${isToday ? 'ring-1 ring-orange-500/70 bg-orange-500/10' : ''}
        ${hasLeaveRequests ? 'hover:shadow-sm hover:shadow-black/20' : ''}
      `}
      onMouseEnter={(e) => onDayHover(e, day)}
      onClick={() => onDayClick(day)}  
    >
      <div className={`
        text-xs font-bold mb-0.5 transition-colors
        ${day.isCurrentMonth ? 'text-white' : 'text-gray-500'}
        ${isToday ? 'text-orange-400' : ''}
      `}>
        {day.date.getDate()}
      </div>

      {hasLeaveRequests && (
        <div className="space-y-0.5 overflow-hidden">
          {uniqueLeaveTypes.slice(0, 1).map((leaveType, index) => {
            const requestsOfType = day.leaveRequests.filter(req => req.leaveType === leaveType);
            const colors = LEAVE_TYPE_COLORS[leaveType as keyof typeof LEAVE_TYPE_COLORS] || { bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-500/30' };
            
            return (
              <div
                key={leaveType}
                className={`
                  px-1 py-0.5 rounded text-xs font-medium truncate border
                  ${colors.bg} ${colors.text} ${colors.border}
                  opacity-90 hover:opacity-100 transition-all duration-200
                `}
                title={`${requestsOfType.length} ${leaveType} request${requestsOfType.length > 1 ? 's' : ''}`}
              >
                {requestsOfType.length > 1 
                  ? `${requestsOfType.length} ${leaveType.split(' ')[0]}`
                  : (requestsOfType[0].username || 'User').substring(0, 8)
                }
              </div>
            );
          })}
          
          {uniqueLeaveTypes.length > 1 && (
            <div className="text-xs text-gray-400 font-bold bg-gray-700/50 px-1 py-0.5 rounded border border-gray-600/30">
              +{uniqueLeaveTypes.length - 1}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Add display name to fix ESLint warning
CalendarDay.displayName = 'CalendarDay';

const LeaveDetailsModal: React.FC<{ 
  show: boolean; 
  onClose: () => void; 
  date: Date | null; 
  requests: LeaveRequest[];
}> = ({ show, onClose, date, requests }) => {
  if (!show || !date) return null;

  const formatDisplayDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
          <h2 className="text-white font-semibold">
            {date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {requests.map((req, idx) => (
            <div key={req._id || idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{req.username}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  LEAVE_TYPE_COLORS[req.leaveType as keyof typeof LEAVE_TYPE_COLORS]?.bg || 'bg-gray-500'
                }`}>
                  {req.leaveType.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-300 text-xs">
                {formatDisplayDate(req.from)} &rarr; {formatDisplayDate(req.to)} ({req.workingDays} day{req.workingDays !== 1 ? 's' : ''})
              </p>
              {req.reason && (
                <p className="text-gray-400 text-xs italic mt-2">&quot;{req.reason}&quot;</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

const HolidayPlannerCalendar: React.FC<{ 
  allLeaveRequests: LeaveRequest[];
  user: User | null;
}> = ({ allLeaveRequests, user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tooltip, setTooltip] = useState<TooltipData>({
    show: false,
    x: 0,
    y: 0,
    content: [],
    date: null
  });

  const calendarDays = useCalendarData(allLeaveRequests, currentDate);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
    setTooltip(prev => ({ ...prev, show: false }));
  }, []);

  const navigateToToday = useCallback(() => {
    setCurrentDate(new Date());
    setTooltip(prev => ({ ...prev, show: false }));
  }, []);

  const handleDayHover = useCallback((event: React.MouseEvent, day: CalendarDay) => {
    if (day.leaveRequests.length > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltip({
        show: true,
        x: rect.left + rect.width / 2,
        y: rect.top,
        content: day.leaveRequests,
        date: day.date
      });
    } else {
      setTooltip(prev => ({ ...prev, show: false }));
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, show: false }));
  }, []);

  const [modal, setModal] = useState<{ show: boolean; date: Date | null; requests: LeaveRequest[] }>({
    show: false,
    date: null,
    requests: []
  });

  const handleDayClick = (day: CalendarDay) => {
    if (day.leaveRequests.length > 0) {
      setModal({ show: true, date: day.date, requests: day.leaveRequests });
    }
  };

  const monthStats = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const monthRequests = allLeaveRequests.filter(request => {
      if (request.status !== 'approved') return false;
      
      try {
        const fromDate = dateUtils.parseDate(request.from);
        const toDate = dateUtils.parseDate(request.to);
        return fromDate <= monthEnd && toDate >= monthStart;
      } catch {
        return false;
      }
    });

    const uniqueEmployees = new Set(monthRequests.map(req => req.username)).size;

    return {
      totalRequests: monthRequests.length,
      uniqueEmployees
    };
  }, [allLeaveRequests, currentDate]);

  return (
    <div className="bg-gray-900 border-0 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border-b border-gray-600/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-xl border border-orange-400/30">
              <CalendarDays className="text-orange-400" size={16} />
            </div>
            <h3 className="text-lg font-semibold text-white">Team Holiday Overview</h3>
          </div>
          <button
            onClick={navigateToToday}
            className="px-3 py-1.5 text-xs bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all duration-300 font-medium shadow-lg hover:shadow-orange-500/25 hover:scale-105"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1.5 hover:bg-gray-700/50 rounded-xl transition-all duration-300 hover:scale-110 border border-gray-600/30 hover:border-gray-500/50"
          >
            <ChevronLeft className="text-gray-300 hover:text-white transition-colors" size={16} />
          </button>
          
          <h4 className="text-lg font-semibold text-white min-w-48 text-center bg-gray-800/50 py-1.5 px-4 rounded-xl border border-gray-600/30">
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h4>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-1.5 hover:bg-gray-700/50 rounded-xl transition-all duration-300 hover:scale-110 border border-gray-600/30 hover:border-gray-500/50"
          >
            <ChevronRight className="text-gray-300 hover:text-white transition-colors" size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 py-2 bg-gradient-to-r from-gray-800/30 to-gray-700/30 border-b border-gray-600/50 flex-shrink-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-500/10 rounded-xl p-2 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-blue-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Requests</span>
              </div>
              <div className="text-lg font-bold text-blue-400">{monthStats.totalRequests}</div>
            </div>
          </div>
          <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-green-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">On Leave</span>
              </div>
              <div className="text-lg font-bold text-green-400">{monthStats.uniqueEmployees}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-3 flex flex-col min-h-0">
        <div className="grid grid-cols-7 gap-1 mb-3 flex-shrink-0">
          {DAY_NAMES.map(day => (
            <div key={day} className="text-center py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-800/30 rounded-lg">
              {day}
            </div>
          ))}
        </div>

        <div 
          className="grid grid-cols-7 gap-1 bg-gray-800/20 p-1.5 rounded-xl border border-gray-600/30 flex-1 min-h-0"
          onMouseLeave={handleMouseLeave}
          style={{ gridTemplateRows: 'repeat(6, 1fr)' }}
        >
          {calendarDays.map((day, index) => (
            <CalendarDay
              key={index}
              day={day}
              onDayHover={handleDayHover}
              onDayClick={handleDayClick} 
            />
          ))}
        </div>
      </div>

      {createPortal(
        <LeaveTooltip 
          tooltip={tooltip} 
          onClose={() => setTooltip(prev => ({ ...prev, show: false }))} 
        />,
        document.body
      )}

      <LeaveDetailsModal 
        show={modal.show} 
        date={modal.date} 
        requests={modal.requests} 
        onClose={() => setModal({ show: false, date: null, requests: [] })}
      />
    </div>
  );
};

export default HolidayPlannerCalendar;