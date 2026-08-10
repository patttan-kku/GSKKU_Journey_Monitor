
import { Student, MILESTONES, MilestoneStatus } from '../types';

const curriculums = ['วิทยาการคอมพิวเตอร์', 'เทคโนโลยีสารสนเทศ', 'วิศวกรรมไฟฟ้า', 'ทันตแพทยศาสตร์ (นานาชาติ)', 'บริหารธุรกิจ'];
const plans = ['ป.โท แบบ ก 1', 'ป.โท แบบ ก 2', 'ป.โท แบบ ข', 'ป.เอก แบบ 1.1', 'ป.เอก แบบ 1.2', 'ป.เอก แบบ 2'];
const advisors = ['ผศ.ดร.นนทวัฒน์ สมพงษ์', 'รศ.ดร.นิรันดร์ วงศ์พงษ์คำ', 'ผศ.ดร.วิชัย วงศ์กันนันท์วัฒนา', 'ศ.ดร.สมเกียรติ ตั้งกิจวานิชกุล', 'รศ.ดร.สมหวัง มาลี'];

const generateMilestones = (progress: number) => {
  return MILESTONES.map((m, index) => ({
    milestoneId: m.id,
    status: (index < progress ? 'done' : 'pending') as MilestoneStatus,
    date: index < progress ? '01/2026' : undefined
  }));
};

const firstNames = ['สิตธิรา', 'พรพิชญ์', 'จิราพร', 'สมชาย', 'กิตติพงษ์', 'นภาพร', 'พีรพล', 'ธนพล', 'วราภรณ์', 'ไพศาล', 'สุรศักดิ์', 'นงลักษณ์', 'ชลธร', 'ศิริรัตน์', 'เกียรติศักดิ์'];
const lastNames = ['สมสร', 'วิเศษศรี', 'ใจดี', 'รักเรียน', 'สุขใจ', 'มีสุข', 'ตระกูลชัย', 'รัตนพาณิชย์', 'ตั้งมั่นคง', 'ประสพโชค', 'ศิลปสวัสดิ์', 'เลิศวิจิตร', 'รังสรรค์พัฒนา', 'มณีกุล', 'พิบูลย์ศิลป์'];

// Generate 45 students total
export const MOCK_STUDENTS: Student[] = Array.from({ length: 45 }, (_, i) => {
  const planIndex = i % plans.length;
  const advisorIndex = i % 5;
  const scholars = ['ทุนอัจฉริยะ', 'ทุน กยศ.', 'ทุนเรียนดี', 'ไม่มีทุน'];
  const firstName = firstNames[i % firstNames.length];
  const lastName = lastNames[(i * 3) % lastNames.length];
  
  // Create varied test cases for study duration warnings:
  // i=1: Master's Year 2 Sem 1 (Total sem 3) -> Orange warning (Plan 2 yrs = 4 sem)
  // i=2: Master's Year 5 Sem 1 (Total sem 9) -> Red warning (Max 5 yrs = 10 sem)
  // i=3: PhD 1.1 Year 3 Sem 1 (Total sem 5) -> Orange warning (Plan 3 yrs = 6 sem)
  // i=4: PhD 1.2 Year 4 Sem 1 (Total sem 7) -> Orange warning (Plan 4 yrs = 8 sem)
  // i=5: PhD 1.2 Year 8 Sem 1 (Total sem 15) -> Red warning (Max 8 yrs = 16 sem)
  let yearVal = 1 + (i % 3);
  let semVal = 1;
  let admitSemVal = 1;

  if (i === 1) {
    yearVal = 2; semVal = 1; // Master's Year 2 Term 1 -> Total sem 3 (1 sem before 4)
  } else if (i === 2) {
    yearVal = 5; semVal = 1; // Master's Year 5 Term 1 -> Total sem 9 (1 sem before 10)
  } else if (i === 3) {
    yearVal = 3; semVal = 1; // PhD 1.1 Year 3 Term 1 -> Total sem 5 (1 sem before 6)
  } else if (i === 4) {
    yearVal = 4; semVal = 1; // PhD 1.2 Year 4 Term 1 -> Total sem 7 (1 sem before 8)
  } else if (i === 5) {
    yearVal = 8; semVal = 1; // PhD 1.2 Year 8 Term 1 -> Total sem 15 (1 sem before 16)
  }

  // Create sample enrollments for proposal warning testing
  const isDocPlan = plans[planIndex].includes('เอก');
  let mockEnrollments: { courseCode: string; courseName?: string }[] = [];

  if (isDocPlan) {
    if (i % 2 === 0) {
      // Doctoral student with 3 thesis course enrollments (ends with 998 or 997) -> triggers warning
      mockEnrollments = [
        { courseCode: 'CP351998', courseName: 'Dissertation' },
        { courseCode: 'CP351998', courseName: 'Dissertation' },
        { courseCode: 'CP351998', courseName: 'Dissertation' }
      ];
    }
  } else {
    if (i % 2 === 1) {
      // Master's student with 1 thesis course enrollment (ends with 899 or 898) -> triggers warning
      mockEnrollments = [
        { courseCode: 'CP351899', courseName: 'Thesis' }
      ];
    }
  }

  return {
    id: `${i + 1}`,
    studentCode: `663410${127 + i}-${i % 9}`,
    name: `${firstName} ${lastName}`,
    curriculum: curriculums[i % curriculums.length],
    plan: plans[planIndex],
    level: isDocPlan ? 'ปริญญาเอก' : 'ปริญญาโท',
    advisor: advisors[advisorIndex],
    scholarship: scholars[i % scholars.length],
    papers: (i % 3),
    allPublication: (i % 3),
    yearsOfStudy: yearVal,
    studentYear: yearVal,
    currentSemester: semVal,
    admitSemester: admitSemVal,
    monthsOfStudy: (i % 12),
    gpa: parseFloat((2.5 + (i % 15) * 0.1).toFixed(2)),
    enrollments: mockEnrollments,
    milestones: generateMilestones(3 + (i % 7))
  };
});

export const MOCK_ADVISORS = advisors;
export const MOCK_CURRICULUMS = curriculums;
export const MOCK_PLANS = plans;
