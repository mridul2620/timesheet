import axios from "axios";
import { TimeEntry, Timesheet, User, DraftResponse, DraftTimesheet } from "./timesheetTypes";

class TimesheetService {
  async getTimesheetForWeek(username: string, weekStartDate: string): Promise<Timesheet | null> {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_GET_TIMESHEET_API}/${username}`
      );

      if (!response.data.success) {
        return null;
      }

      const timesheets = response.data.timesheets || [];
      if (timesheets.length === 0) {
        return null;
      }

      // First try to find a timesheet that exactly matches the week start date
      let relevantTimesheet = timesheets.find(
        (timesheet: Timesheet) => timesheet.weekStartDate === weekStartDate
      );

      // If no exact match, try to find a timesheet that has entries for any day in the week
      if (!relevantTimesheet) {
        const weekDaysArray = this.generateWeekDays(weekStartDate);
        relevantTimesheet = timesheets.find((timesheet: Timesheet) => {
          return timesheet.entries.some((entry: TimeEntry) => {
            return Object.keys(entry.hours).some((dateStr) =>
              weekDaysArray.includes(dateStr)
            );
          });
        });
      }

      return relevantTimesheet || null;
    } catch (error) {
      console.error("Error fetching timesheet data:", error);
      return null;
    }
  }

  // New method that implements priority logic for getting the correct data for a week
  async getPriorityDataForWeek(username: string, weekStartDate: string): Promise<{
    dataSource: 'timesheet' | 'draft' | 'empty';
    data: Timesheet | DraftTimesheet | null;
  }> {
    try {
      // First get the submitted timesheet, if any
      const timesheet = await this.getTimesheetForWeek(username, weekStartDate);
      
      // Get drafts for this week
      const draftsResponse = await this.getDraftsForWeek(username, weekStartDate);
      const draftData = draftsResponse.success ? draftsResponse.draft : null;
      
      // Priority logic
      if (timesheet) {
        // Case 1: Timesheet exists with "rejected" status
        if (timesheet.timesheetStatus === "rejected") {
          // If there are drafts, assume they are newer or corrections to the rejected timesheet
          if (draftData) {
            return { dataSource: 'draft', data: draftData };
          }
          // Otherwise use the rejected timesheet
          return { dataSource: 'timesheet', data: timesheet };
        }
        
        // Case 2: Timesheet exists with "approved" or "unapproved" (pending) status
        // Always use the submitted timesheet in these cases
        return { dataSource: 'timesheet', data: timesheet };
      }
      
      // Case 3: No timesheet, but drafts exist
      if (draftData) {
        return { dataSource: 'draft', data: draftData };
      }
      
      // Case 4: No timesheet or drafts
      return { dataSource: 'empty', data: null };
    } catch (error) {
      console.error("Error fetching priority data:", error);
      return { dataSource: 'empty', data: null };
    }
  }

  async submitTimesheet(timesheetData: any): Promise<{ success: boolean; message: string }> {
    try {
      // Pre-submission validation for work description
      if (!timesheetData.workDescription || timesheetData.workDescription.trim() === '') {
        return { success: false, message: "Please add a work description." };
      }
      
      const response = await axios.post(
        process.env.NEXT_PUBLIC_SUBMIT_API as string,
        timesheetData
      );

      if (response.data.message === "Timesheet submitted successfully") {
        // After successful submission, delete all draft entries for this week
        await this.clearDraftsForWeek(timesheetData.username, timesheetData.weekStartDate);
        return { success: true, message: "Timesheet submitted successfully!" };
      } else {
        return { success: false, message: "Failed to submit timesheet. Please try again." };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Return the specific error from the server if available
        return {
          success: false,
          message: error.response?.data?.message || "An unknown error occurred"
        };
      }
      return { success: false, message: "An error occurred while submitting the timesheet." };
    }
  }

  async updateTimesheet(
    timesheetId: string,
    timesheetData: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Pre-submission validation for work description
      if (!timesheetData.workDescription || timesheetData.workDescription.trim() === '') {
        return { success: false, message: "Please add a work description." };
      }
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_UPDATE_TIMESHEET_API || "/api/timesheet/update"}/${timesheetId}`,
        timesheetData
      );

      if (response.data.success) {
        // After successful submission, delete all draft entries for this week
        await this.clearDraftsForWeek(timesheetData.username, 
          this.weekStartDateFromEntries(timesheetData.entries));
        return { success: true, message: "Timesheet updated and resubmitted successfully!" };
      } else {
        return { success: false, message: "Failed to update timesheet. Please try again." };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Return the specific error from the server if available
        return {
          success: false,
          message: error.response?.data?.message || "An unknown error occurred"
        };
      }
      return { success: false, message: "An error occurred while updating the timesheet." };
    }
  }

  // Helper method to get week start date from entries
  weekStartDateFromEntries(entries: TimeEntry[]): string {
    if (!entries || entries.length === 0 || !entries[0].hours) return "";
    
    // Get all date strings from the hours object
    const dateStrings = entries.flatMap(entry => Object.keys(entry.hours));
    
    if (dateStrings.length === 0) return "";
    
    // Sort dates and return the earliest one
    return dateStrings.sort()[0];
  }

async saveDraftEntry(
  username: string,
  weekStartDate: string,
  entry: TimeEntry,
  workDescription: string = "",
  dayStatus: { [key: string]: string } = {}
): Promise<DraftResponse> {
  try {
    const response = await axios.post(
      process.env.NEXT_PUBLIC_DRAFT_SAVE_API as string,
      {
        username,
        weekStartDate,
        entry,
        workDescription, // Make sure this is always included
        dayStatus
      }
    );

    if (response.data.success) {
      return {
        success: true,
        message: "Entry saved as draft.",
        draftId: response.data.draftId
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Failed to save draft entry."
      };
    }
  } catch (error) {
    console.error("Error saving draft entry:", error);
    return {
      success: false,
      message: "An error occurred while saving the draft entry."
    };
  }
}

  // New method to delete a draft entry
  async deleteDraftEntry(
    username: string,
    weekStartDate: string,
    entryId: string
  ): Promise<{ success: boolean; message: string; draftDeleted?: boolean }> {
    try {
      const response = await axios.delete(
        process.env.NEXT_PUBLIC_DRAFT_DELETE_API as string,
        {
          data: {
            username,
            weekStartDate,
            entryId
          }
        }
      );

      return {
        success: response.data.success,
        message: response.data.message,
        draftDeleted: response.data.draftDeleted
      };
    } catch (error) {
      console.error("Error deleting draft entry:", error);
      return {
        success: false,
        message: "An error occurred while deleting the draft entry."
      };
    }
  }

  // New method to fetch all draft entries for a week
  async getDraftsForWeek(
    username: string,
    weekStartDate: string
  ): Promise<{ success: boolean; draft?: any }> {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_DRAFT_GET_API}/${username}?weekStart=${weekStartDate}`
      );

      return {
        success: response.data.success,
        draft: response.data.draft
      };
    } catch (error) {
      // Don't log error for 404s (no drafts found is normal)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { success: false };
      }
      
      console.error("Error fetching drafts:", error);
      return { success: false };
    }
  }

  // New method to clear all drafts for a week
  async clearDraftsForWeek(
    username: string,
    weekStartDate: string
  ): Promise<boolean> {
    try {
      // First get all drafts for the week
      const draftsResponse = await this.getDraftsForWeek(username, weekStartDate);
      
      if (!draftsResponse.success || !draftsResponse.draft) {
        return true; // No drafts to clear
      }
      
      // Delete each entry
      for (const entry of draftsResponse.draft.entries) {
        await this.deleteDraftEntry(username, weekStartDate, entry.id);
      }
      
      return true;
    } catch (error) {
      console.error("Error clearing drafts for week:", error);
      return false;
    }
  }

  // Helper method to get the start date of the current week
  getWeekStartDate(date: Date): string {
    // Create a copy of the input date to avoid mutations
    const selectedDate = new Date(date);
    
    // Reset the time to midnight to avoid time zone issues
    selectedDate.setHours(0, 0, 0, 0);
    
    // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = selectedDate.getDay();
    
    // Calculate the Sunday (start of the week)
    const sunday = new Date(selectedDate);
    sunday.setDate(selectedDate.getDate() - dayOfWeek);
    
    // Ensure we're working with midnight local time
    sunday.setHours(0, 0, 0, 0);
    
    // Format to YYYY-MM-DD (ISO date string, but just the date part)
    return sunday.toISOString().split('T')[0];
  }

  async fetchClients(): Promise<any[]> {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_CLIENT_API as string);
      return response.data?.clients ? response.data.clients : [];
    } catch (error) {
      console.error("Error fetching clients:", error);
      return [];
    }
  }

  async fetchProjects(): Promise<any[]> {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_PROJECTS_API as string);
      return response.data?.success && response.data?.projects
        ? response.data.projects
        : [];
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
  }

  async fetchSubjects(): Promise<any[]> {
    try {
      const response = await axios.get(process.env.NEXT_PUBLIC_SUBJECTS_API as string);
      return response.data?.subjects ? response.data.subjects : [];
    } catch (error) {
      console.error("Error fetching subjects:", error);
      return [];
    }
  }

  generateWeekDays(startDateStr: string): string[] {
    const startDate = new Date(startDateStr);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }

  getWeekDates(date: Date): Date[] {
    const selectedDate = new Date(date);
    const dayOfWeek = selectedDate.getDay();
    const sunday = new Date(selectedDate);
    sunday.setDate(selectedDate.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(sunday);
      day.setDate(sunday.getDate() + i);
      return day;
    });
  }

  formatDate(date: Date): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }

  formatHoursAndMinutes(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }

  getUserFromLocalStorage(): User | null {
    try {
      const storedData = localStorage.getItem("loginResponse");
      if (!storedData) return null;
      
      const parsedData = JSON.parse(storedData);
      return parsedData.success ? parsedData.user : null;
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
      return null;
    }
  }

  initializeDayStatus(weekDates: Date[]): { [key: string]: string } {
    const newDayStatus: { [key: string]: string } = {};
    weekDates.forEach((date) => {
      const dayStr = date.toISOString().split("T")[0];
      const dayOfWeek = date.getDay();
      
      // Set Saturday (6) and Sunday (0) as "not-working"
      // All other days (including Friday which is 5) as "working" by default
      newDayStatus[dayStr] = (dayOfWeek === 0 || dayOfWeek === 6) 
        ? "not-working" 
        : "working";
    });
    return newDayStatus;
  }
  
  getFinancialYear(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed, so 0 = January, 3 = April
    
    // If date is from January to March, it belongs to the previous financial year
    if (month < 3) {
      return (year - 1).toString();
    }
    
    // If date is from April to December, it belongs to the current financial year
    return year.toString();
  }
  
  // Get the financial year start date (April 1st) for a given date
  getFinancialYearStartDate(date: Date): string {
    const financialYear = this.getFinancialYear(date);
    return `${financialYear}-04-01`;
  }
  
  // Get the financial year end date (March 31st) for a given date
  getFinancialYearEndDate(date: Date): string {
    const financialYear = this.getFinancialYear(date);
    const endYear = parseInt(financialYear) + 1;
    return `${endYear}-03-31`;
  }
  
  // Get allocated hours for a specific date from the user data
  getAllocatedHoursForDate(date: Date, userData: User): number {
    if (!userData || !userData.allocatedHours || userData.allocatedHours.length === 0) {
      return 0;
    }
  
    const financialYear = this.getFinancialYear(date);
    
    // Find the allocated hours for the financial year
    const allocatedHoursEntry = userData.allocatedHours.find(
      entry => entry.year === financialYear
    );
    
    if (allocatedHoursEntry) {
      return parseFloat(allocatedHoursEntry.hours);
    }
    
    return 0;
  }
  
  // Fetch timesheets within a date range to calculate hours used
  async fetchTimesheetsInDateRange(
    username: string,
    startDate: string,
    endDate: string
  ): Promise<Timesheet[]> {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_GET_TIMESHEET_API}/${username}`
      );
      
      if (!response.data.success) {
        return [];
      }
      
      const timesheets = response.data.timesheets || [];
      
      // Filter timesheets within the date range
      return timesheets.filter((timesheet: Timesheet) => {
        // Skip rejected timesheets
        if (timesheet.timesheetStatus === "rejected") {
          return false;
        }
        
        // Get the week end date (6 days after the start date)
        const weekStartDate = new Date(timesheet.weekStartDate);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekStartDate.getDate() + 6);
        
        // Check if the timesheet falls within the date range
        return (
          weekStartDate >= new Date(startDate) && 
          weekEndDate <= new Date(endDate)
        ) || (
          // Or if the timesheet overlaps with the date range
          (weekStartDate <= new Date(endDate) && weekEndDate >= new Date(startDate))
        );
      });
    } catch (error) {
      console.error("Error fetching timesheets in date range:", error);
      return [];
    }
  }
  
  // Calculate hours used in the current financial year
  async calculateHoursUsedInFinancialYear(
    username: string,
    date: Date,
    currentTimesheetId?: string
  ): Promise<number> {
    try {
      const startDate = this.getFinancialYearStartDate(date);
      const today = new Date().toISOString().split('T')[0];
      
      // Get all timesheets in the financial year up to today
      const timesheets = await this.fetchTimesheetsInDateRange(username, startDate, today);
      
      let totalHours = 0;
      
      // Calculate total hours from all timesheets in the financial year
      for (const timesheet of timesheets) {
        // Skip the current timesheet we're viewing to avoid double-counting
        if (currentTimesheetId && timesheet._id === currentTimesheetId) {
          continue;
        }
        
        // Only count approved and pending timesheets
        if (timesheet.timesheetStatus === "approved" || timesheet.timesheetStatus === "unapproved") {
          // Sum up hours from all entries
          for (const entry of timesheet.entries) {
            for (const hoursValue of Object.values(entry.hours)) {
              const hours = Number.parseFloat(hoursValue || "0");
              if (!isNaN(hours)) {
                totalHours += hours;
              }
            }
          }
        }
      }
      
      return totalHours;
    } catch (error) {
      console.error("Error calculating hours used in financial year:", error);
      return 0;
    }
  }
  
}

export default new TimesheetService();