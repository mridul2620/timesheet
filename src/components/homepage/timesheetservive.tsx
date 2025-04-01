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

  // New method to save a draft entry
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
          workDescription,
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
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const diff = date.getDate() - day; // Subtract the day of week to get to Sunday
    const weekStart = new Date(date);
    weekStart.setDate(diff);
    return weekStart.toISOString().split('T')[0];
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
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - date.getDay() + 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
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
      newDayStatus[dayStr] = dayOfWeek === 0 || dayOfWeek === 6 ? "holiday" : "working";
    });
    return newDayStatus;
  }
}

export default new TimesheetService();