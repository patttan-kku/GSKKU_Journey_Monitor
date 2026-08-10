
export type Role = 'STAFF' | 'ADVISOR' | 'PROGRAM_CHAIR' | 'PROGRAM_COMMITTEE';

export interface User {
  name: string;
  email: string;
  role: Role;
  secondaryRoles?: Role[];
  faculty?: string;
  facultyname?: string;
  facultyId?: string;
  department?: string;
  prefix?: string;
  academicPositionName?: string;
  sso_data?: any;
}

export type MilestoneStatus = 'done' | 'pending';

export interface Milestone {
  id: string;
  name: string;
  shortName: string;
}

export interface StudentMilestoneStatus {
  milestoneId: string;
  status: MilestoneStatus;
  date?: string;
}

export interface Enrollment {
  courseCode: string;
  courseName?: string;
  semester?: string;
  year?: number;
}

export interface Student {
  id: string;
  studentCode: string;
  name: string;
  curriculum: string;
  plan: string;
  level?: string;
  type?: string;
  system?: string;
  advisor: string;
  scholarship: string;
  papers: number;
  allPublication?: number;
  yearsOfStudy: number;
  studentYear?: number;
  currentSemester?: number;
  admitSemester?: number;
  monthsOfStudy: number;
  gpa?: number;
  enrollments?: Enrollment[];
  studentStatusId?: string;
  studentStatusName?: string;
  milestones: StudentMilestoneStatus[];
}

export const MILESTONES: Milestone[] = [
  { id: 'advisor_gen', name: 'Gen. Advisor', shortName: 'Gen Advisor' },
  { id: 'advisor_thesis', name: 'Thesis Advisor', shortName: 'Thesis Advisor' },
  { id: 'english', name: 'Eng Proficiency', shortName: 'Eng Proficiency' },
  { id: 'qe', name: 'QE / CE', shortName: 'QE / CE' },
  { id: 'proposal', name: 'Thesis Proposal', shortName: 'Proposal' },
  { id: 'publication', name: 'Publication', shortName: 'Publication' },
  { id: 'defense', name: 'Thesis Defense', shortName: 'Defense' },
  { id: 'submission', name: 'Thesis Submission', shortName: 'Submission' },
  { id: 'graduation', name: 'Graduation Check', shortName: 'Grad Check' },
];
