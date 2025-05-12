export type TimeEntry = {
  id: string;
  client: string;
  project: string;
  subject: string;
  hours: { [key: string]: string };
  isDraft?: boolean;
  draftId?: string;
};

export type Timesheet = {
  _id: string;
  username: string;
  weekStartDate: string;
  entries: TimeEntry[];
  workDescription: string;
  timesheetStatus?: string;
  dayStatus?: { [key: string]: string };
};

export type User = {
  name: string;
  username: string;
  email: string | string[];
  role: string;
  designation: string;
  active?: boolean;
  allocatedHours: Array<{
    year: string;
    hours: string;
  }>;
  remainingHours?: number;
};

export type DialogData = {
  show: boolean;
  title: string;
  message: string;
  isError: boolean;
};

export type DailyHours = {
  day: string;
  abbreviation: string;
  hours: number;
};

export type ProjectHours = {
  project: string;
  hours: number;
  color: string;
};

export type Client = {
  _id: string;
  name: string;
  assignedTo: string[];
};

export type Project = {
  _id: string;
  name: string;
  assignedTo: string[];
};

export type Subject = {
  _id: string;
  name: string;
  assignedTo: string[];
};

export type DraftResponse = {
  success: boolean;
  message: string;
  draftId?: string;
};

export type DraftTimesheet = {
  _id: string;
  username: string;
  weekStartDate: string;
  entries: TimeEntry[];
  workDescription: string;
  dayStatus: { [key: string]: string };
  lastUpdated: Date;
};