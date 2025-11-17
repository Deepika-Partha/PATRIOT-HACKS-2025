// CS Major Course Catalog - Based on GMU 2019-2020 Catalog
export interface Course {
  courseId: string;
  title: string;
  credits: number;
  required: boolean; // Required for CS major
  prerequisites?: string[];
  category: 'core' | 'elective' | 'general' | 'math' | 'science';
}

export const csCourseCatalog: Course[] = [
  // Required Computer Science Courses
  { courseId: 'CS 100', title: 'Principles of Computing', credits: 3, required: false, category: 'core' },
  { courseId: 'CS 105', title: 'Computer Ethics and Society', credits: 1, required: false, category: 'core' },
  { courseId: 'CS 110', title: 'Essentials of Computer Science', credits: 3, required: true, category: 'core' },
  { courseId: 'CS 112', title: 'Introduction to Computer Programming', credits: 4, required: true, category: 'core' },
  { courseId: 'CS 211', title: 'Object-Oriented Programming', credits: 3, required: true, prerequisites: ['CS 112'], category: 'core' },
  { courseId: 'CS 222', title: 'Computer Programming for Engineers', credits: 3, required: false, prerequisites: ['CS 112'], category: 'core' },
  { courseId: 'CS 262', title: 'Introduction to Low-Level Programming', credits: 3, required: true, prerequisites: ['CS 211', 'CS 222'], category: 'core' },
  { courseId: 'CS 306', title: 'Synthesis of Ethics and Law for the Computing Professional', credits: 3, required: true, prerequisites: ['CS 105', 'CS 110'], category: 'core' },
  { courseId: 'CS 310', title: 'Data Structures', credits: 3, required: true, prerequisites: ['CS 211', 'MATH 113'], category: 'core' },
  { courseId: 'CS 321', title: 'Software Engineering', credits: 3, required: true, prerequisites: ['CS 310', 'ENGH 302'], category: 'core' },
  { courseId: 'CS 325', title: 'Introduction to Game Design', credits: 3, required: false, prerequisites: ['CS 211'], category: 'elective' },
  { courseId: 'CS 330', title: 'Formal Methods and Models', credits: 3, required: true, prerequisites: ['CS 211', 'MATH 125'], category: 'core' },
  { courseId: 'CS 332', title: 'Object-Oriented Software Design and Implementation', credits: 3, required: false, prerequisites: ['CS 310', 'MATH 125'], category: 'elective' },
  { courseId: 'CS 351', title: 'Visual Computing', credits: 3, required: false, prerequisites: ['CS 262', 'CS 310'], category: 'elective' },
  { courseId: 'CS 367', title: 'Computer Systems and Programming', credits: 4, required: true, prerequisites: ['CS 110', 'CS 262', 'CS 222', 'MATH 125'], category: 'core' },
  { courseId: 'CS 390', title: 'Research and Project Design Principles in Computing', credits: 3, required: false, prerequisites: ['CS 262'], category: 'elective' },
  { courseId: 'CS 391', title: 'Advanced Programming Lab', credits: 1, required: false, prerequisites: ['CS 310'], category: 'elective' },
  { courseId: 'CS 425', title: 'Game Programming I', credits: 3, required: false, prerequisites: ['CS 310', 'CS 351'], category: 'elective' },
  { courseId: 'CS 426', title: 'Game Programming II', credits: 3, required: false, prerequisites: ['CS 325', 'CS 425'], category: 'elective' },
  { courseId: 'CS 440', title: 'Language Processors and Programming Environments', credits: 3, required: false, prerequisites: ['CS 310', 'CS 330', 'CS 367'], category: 'elective' },
  { courseId: 'CS 450', title: 'Database Concepts', credits: 3, required: false, prerequisites: ['CS 310', 'CS 330'], category: 'elective' },
  { courseId: 'CS 451', title: 'Computer Graphics', credits: 3, required: false, prerequisites: ['CS 310', 'CS 367', 'MATH 203'], category: 'elective' },
  { courseId: 'CS 455', title: 'Computer Communications and Networking Systems', credits: 3, required: false, prerequisites: ['CS 310', 'CS 367', 'STAT 344'], category: 'elective' },
  { courseId: 'CS 463', title: 'Comparative Programming Languages', credits: 3, required: false, prerequisites: ['CS 310', 'CS 330', 'CS 367'], category: 'elective' },
  { courseId: 'CS 465', title: 'Computer Systems Architecture', credits: 3, required: false, prerequisites: ['CS 367'], category: 'elective' },
  { courseId: 'CS 468', title: 'Secure Programming and Systems', credits: 3, required: false, prerequisites: ['CS 310', 'CS 367'], category: 'elective' },
  { courseId: 'CS 469', title: 'Secure Engineering', credits: 3, required: false, prerequisites: ['CS 330', 'CS 367', 'STAT 344'], category: 'elective' },
  { courseId: 'CS 471', title: 'Operating Systems', credits: 3, required: true, prerequisites: ['CS 310', 'CS 367'], category: 'core' },
  { courseId: 'CS 475', title: 'Concurrent and Distributed Systems', credits: 3, required: false, prerequisites: ['CS 310', 'CS 367'], category: 'elective' },
  { courseId: 'CS 477', title: 'Mobile Application Development', credits: 3, required: false, prerequisites: ['CS 310', 'CS 367'], category: 'elective' },
  { courseId: 'CS 480', title: 'Introduction to Artificial Intelligence', credits: 3, required: false, prerequisites: ['CS 310', 'CS 330'], category: 'elective' },
  { courseId: 'CS 482', title: 'Computer Vision', credits: 3, required: false, prerequisites: ['MATH 203', 'STAT 344', 'CS 310'], category: 'elective' },
  { courseId: 'CS 483', title: 'Analysis of Algorithms', credits: 3, required: true, prerequisites: ['MATH 125', 'CS 310', 'CS 330'], category: 'core' },
  { courseId: 'CS 484', title: 'Data Mining', credits: 3, required: false, prerequisites: ['CS 310', 'STAT 344', 'STAT 334'], category: 'elective' },
  { courseId: 'CS 485', title: 'Autonomous Robotics', credits: 3, required: false, prerequisites: ['CS 262', 'CS 310', 'MATH 203'], category: 'elective' },
  { courseId: 'CS 490', title: 'Design Exhibition', credits: 3, required: false, prerequisites: ['CS 321', 'CS 483'], category: 'elective' },
  { courseId: 'CS 491', title: 'Industry-Sponsored Senior Design Project', credits: 6, required: false, prerequisites: ['CS 367'], category: 'elective' },
  { courseId: 'CS 498', title: 'Independent Study in Computer Science', credits: 3, required: false, category: 'elective' },
  { courseId: 'CS 499', title: 'Special Topics in Computer Science', credits: 3, required: false, prerequisites: ['CS 310', 'CS 330'], category: 'elective' },
  
  // Mathematics Requirements
  { courseId: 'MATH 113', title: 'Analytic Geometry and Calculus I', credits: 4, required: true, category: 'math' },
  { courseId: 'MATH 114', title: 'Analytic Geometry and Calculus II', credits: 4, required: true, prerequisites: ['MATH 113'], category: 'math' },
  { courseId: 'MATH 125', title: 'Discrete Mathematics I', credits: 3, required: true, category: 'math' },
  { courseId: 'MATH 203', title: 'Linear Algebra', credits: 3, required: true, prerequisites: ['MATH 114'], category: 'math' },
  { courseId: 'MATH 213', title: 'Calculus III', credits: 3, required: true, prerequisites: ['MATH 114'], category: 'math' },
  { courseId: 'MATH 351', title: 'Probability', credits: 3, required: false, prerequisites: ['MATH 114'], category: 'math' },
  { courseId: 'MATH 352', title: 'Mathematical Statistics', credits: 3, required: false, prerequisites: ['MATH 351'], category: 'math' },
  { courseId: 'MATH 446', title: 'Numerical Analysis', credits: 3, required: false, category: 'math' },
  
  // Statistics
  { courseId: 'STAT 344', title: 'Probability and Statistics for Engineers & Scientists I', credits: 3, required: true, category: 'math' },
  { courseId: 'STAT 354', title: 'Probability and Statistics for Engineers & Scientists II', credits: 3, required: false, category: 'math' },
  { courseId: 'STAT 334', title: 'Introduction to Data Science', credits: 3, required: false, category: 'math' },
  
  // Natural Science Requirements (12 credits required)
  // Students must complete a two-course lab sequence from ONE of the following:
  // - Biology: BIOL 103+106 and BIOL 107
  // - Chemistry: CHEM 211+213 and CHEM 212+214
  // - Geology: GEOL 101 and GEOL 102
  // - Physics: PHYS 160+161 and PHYS 260+261
  { courseId: 'PHYS 160', title: 'University Physics I', credits: 3, required: false, category: 'science' },
  { courseId: 'PHYS 161', title: 'University Physics I Laboratory', credits: 1, required: false, category: 'science' },
  { courseId: 'PHYS 260', title: 'University Physics II', credits: 3, required: false, prerequisites: ['PHYS 160'], category: 'science' },
  { courseId: 'PHYS 261', title: 'University Physics II Laboratory', credits: 1, required: false, prerequisites: ['PHYS 161'], category: 'science' },
  { courseId: 'BIOL 103', title: 'Contemporary Biology', credits: 4, required: false, category: 'science' },
  { courseId: 'BIOL 106', title: 'Biology Laboratory I', credits: 1, required: false, category: 'science' },
  { courseId: 'BIOL 107', title: 'Biology Laboratory II', credits: 3, required: false, category: 'science' },
  { courseId: 'CHEM 211', title: 'General Chemistry I', credits: 3, required: false, category: 'science' },
  { courseId: 'CHEM 213', title: 'General Chemistry Laboratory I', credits: 1, required: false, category: 'science' },
  { courseId: 'CHEM 212', title: 'General Chemistry II', credits: 3, required: false, category: 'science' },
  { courseId: 'CHEM 214', title: 'General Chemistry Laboratory II', credits: 1, required: false, category: 'science' },
  { courseId: 'GEOL 101', title: 'Physical Geology', credits: 4, required: false, category: 'science' },
  { courseId: 'GEOL 102', title: 'Historical Geology', credits: 4, required: false, category: 'science' },
  
  // Mason Core Requirements
  { courseId: 'ENGH 101', title: 'Composition', credits: 3, required: false, category: 'general' },
  { courseId: 'ENGH 302', title: 'Advanced Composition', credits: 3, required: false, category: 'general' },
  { courseId: 'COMM 100', title: 'Public Speaking', credits: 3, required: false, category: 'general' },
  { courseId: 'COMM 101', title: 'Fundamentals of Communication', credits: 3, required: false, category: 'general' },
  
  // CS-Related Electives
  { courseId: 'ECE 301', title: 'Digital Electronics', credits: 3, required: false, category: 'elective' },
  { courseId: 'ECE 331', title: 'Digital System Design', credits: 3, required: false, category: 'elective' },
  { courseId: 'ECE 332', title: 'Digital Electronics Laboratory', credits: 1, required: false, category: 'elective' },
  { courseId: 'ECE 350', title: 'Introduction to Computer Engineering', credits: 3, required: false, category: 'elective' },
  { courseId: 'ECE 446', title: 'Computer Architecture', credits: 3, required: false, category: 'elective' },
  { courseId: 'ECE 447', title: 'Computer Architecture Laboratory', credits: 1, required: false, category: 'elective' },
  { courseId: 'ECE 511', title: 'Computer Architecture', credits: 3, required: false, category: 'elective' },
  { courseId: 'OR 335', title: 'Operations Research', credits: 3, required: false, category: 'elective' },
  { courseId: 'OR 441', title: 'Optimization', credits: 3, required: false, category: 'elective' },
  { courseId: 'OR 442', title: 'Stochastic Models', credits: 3, required: false, category: 'elective' },
  { courseId: 'OR 481', title: 'Operations Research Methods', credits: 3, required: false, category: 'elective' },
  { courseId: 'PHIL 371', title: 'Philosophy of Science', credits: 3, required: false, category: 'elective' },
  { courseId: 'PHIL 376', title: 'Philosophy of Technology', credits: 3, required: false, category: 'elective' },
  { courseId: 'SWE 432', title: 'Software Engineering', credits: 3, required: false, category: 'elective' },
  { courseId: 'SWE 437', title: 'Software Testing', credits: 3, required: false, category: 'elective' },
  { courseId: 'SWE 443', title: 'Software Architecture', credits: 3, required: false, category: 'elective' },
  { courseId: 'SYST 371', title: 'Systems Engineering', credits: 3, required: false, category: 'elective' },
  { courseId: 'SYST 470', title: 'Systems Design', credits: 3, required: false, category: 'elective' },
];

export function getCourseByNumber(courseNumber: string): Course | undefined {
  const normalized = courseNumber.toUpperCase().trim();
  return csCourseCatalog.find(course => 
    course.courseId.toUpperCase() === normalized
  );
}

export function getAllRequiredCourses(): Course[] {
  return csCourseCatalog.filter(course => course.required);
}

export function getElectiveCourses(): Course[] {
  return csCourseCatalog.filter(course => !course.required && course.category === 'elective');
}

export function getAllCourses(): Course[] {
  return csCourseCatalog;
}
