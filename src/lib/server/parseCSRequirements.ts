// Utility to parse CS1.pdf and extract GMU CS requirements
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CSRequirement {
  courseId: string;
  title: string;
  credits: number;
  required: boolean;
  prerequisites?: string[];
  corequisites?: string[];
  category: 'core' | 'elective' | 'math' | 'science' | 'general';
}

let cachedRequirements: CSRequirement[] | null = null;
let cachedText: string | null = null;

/**
 * Parse the CS1.pdf file to extract course requirements
 */
export async function parseCSRequirements(): Promise<CSRequirement[]> {
  if (cachedRequirements) {
    return cachedRequirements;
  }

  try {
    // Try multiple possible paths (dev and production builds)
    const possiblePaths = [
      path.join(__dirname, '../assets/CS1.pdf'), // From src/lib/server/ to src/lib/assets/
      path.join(__dirname, '../../assets/CS1.pdf'), // Alternative path
      path.join(process.cwd(), 'src/lib/assets/CS1.pdf'), // From project root
      path.join(process.cwd(), 'static/CS1.pdf'), // Static folder
    ];
    
    let pdfPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        pdfPath = possiblePath;
        break;
      }
    }
    
    // Check if file exists
    if (!pdfPath) {
      console.warn('CS1.pdf not found at any of these paths:', possiblePaths);
      console.warn('Current __dirname:', __dirname);
      console.warn('Current process.cwd():', process.cwd());
      console.warn('Using default catalog');
      return [];
    }

    // Parse PDF
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const text = textResult.text;
    cachedText = text;
    
    // Parse the PDF text to extract course information
    const requirements = parsePDFText(text);
    
    cachedRequirements = requirements;
    await parser.destroy();
    return requirements;
  } catch (error) {
    console.error('Error parsing CS1.pdf:', error);
    return [];
  }
}

/**
 * Parse PDF text to extract course requirements
 */
function parsePDFText(text: string): CSRequirement[] {
  const requirements: CSRequirement[] = [];
  const lines = text.split('\n').map(line => line.trim());

  // Required courses for CS major (based on GMU CS degree requirements)
  // These are typically the core CS courses
  const requiredCourseIds = new Set([
    'CS 110', 'CS 112', 'CS 211', 'CS 262', 'CS 306', 'CS 310', 
    'CS 321', 'CS 330', 'CS 367', 'CS 471', 'CS 483',
    'MATH 113', 'MATH 114', 'MATH 125', 'MATH 203', 'MATH 213',
    'STAT 344', 'PHYS 160', 'PHYS 161', 'PHYS 260', 'PHYS 261'
  ]);

  // Pattern to match course codes like "CS 110:", "MATH 113:", etc.
  const coursePattern = /^([A-Z]{2,4})\s+(\d{3,4}):\s*(.+?)\.\s*(\d+)\s*credit/i;
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const match = line.match(coursePattern);
    
    if (match) {
      const courseId = `${match[1]} ${match[2]}`;
      const title = match[3].trim();
      const credits = parseInt(match[4]);
      
      // Determine category
      let category: 'core' | 'elective' | 'math' | 'science' | 'general' = 'core';
      if (match[1].startsWith('MATH') || match[1].startsWith('STAT')) {
        category = 'math';
      } else if (match[1].startsWith('PHYS') || match[1].startsWith('CHEM') || match[1].startsWith('BIOL')) {
        category = 'science';
      } else if (match[1].startsWith('CS')) {
        category = requiredCourseIds.has(courseId) ? 'core' : 'elective';
      } else {
        category = 'general';
      }

      // Look ahead for prerequisites
      const prerequisites: string[] = [];
      let j = i + 1;
      while (j < lines.length && j < i + 20) { // Look ahead up to 20 lines
        const nextLine = lines[j];
        
        // Check if we've hit the next course
        if (nextLine.match(/^[A-Z]{2,4}\s+\d{3,4}:/)) {
          break;
        }
        
        // Look for prerequisite patterns
        if (nextLine.includes('Required Prerequisites:') || nextLine.includes('Prerequisites:')) {
          // Extract course codes from the prerequisite line and following lines
          let prereqText = nextLine;
          let k = j + 1;
          while (k < lines.length && k < j + 5 && !lines[k].match(/^[A-Z]{2,4}\s+\d{3,4}:/)) {
            prereqText += ' ' + lines[k];
            k++;
          }
          
          // Extract course codes (e.g., "CS 112C", "MATH 125C")
          const courseCodeMatches = prereqText.matchAll(/\b([A-Z]{2,4})\s+(\d{3,4})[A-Z]*\b/g);
          for (const codeMatch of courseCodeMatches) {
            const prereqId = `${codeMatch[1]} ${codeMatch[2]}`;
            if (!prerequisites.includes(prereqId) && prereqId !== courseId) {
              prerequisites.push(prereqId);
            }
          }
          break;
        }
        j++;
      }

      requirements.push({
        courseId,
        title,
        credits,
        required: requiredCourseIds.has(courseId),
        prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
        category
      });
    }
    
    i++;
  }

  return requirements;
}

/**
 * Get required courses for CS degree
 */
export async function getRequiredCSCourses(): Promise<CSRequirement[]> {
  const allCourses = await parseCSRequirements();
  return allCourses.filter(course => course.required);
}

/**
 * Check if a course counts toward CS degree
 * Based on Hackathon_CS_CATALOG.pdf requirements:
 * A course counts if:
 * 1. It's a required CS course, OR
 * 2. It's a required math/statistics course, OR
 * 3. It's a required natural science course, OR
 * 4. It's a Mason Core requirement (ENGH 101, ENGH 302, COMM 100/101, etc.), OR
 * 5. It's a CS-related elective (ECE, OR, PHIL, SWE, SYST, STAT 354, MATH >300, CS >300), OR
 * 6. It's a general elective (up to 8 credits)
 */
export async function courseCountsTowardCSDegree(courseId: string): Promise<boolean> {
  const requirements = await parseCSRequirements();
  const normalizedId = courseId.toUpperCase().trim();
  
  // Check if course is in parsed requirements
  const course = requirements.find(c => 
    c.courseId.toUpperCase().trim() === normalizedId
  );
  
  // MASON CORE REQUIREMENTS (24 credits)
  const masonCoreCourses = [
    'ENGH 101', // Composition
    'ENGH 302', // Advanced Composition
    'COMM 100', // Public Speaking
    'COMM 101'  // Fundamentals of Communication
    // Literature, Western Civilization, Social Science, Global Understanding, Arts are satisfied by various courses
    // Information Technology and Quantitative Reasoning are satisfied by major requirements
    // Natural Science is satisfied by major requirements
    // Synthesis is satisfied by CS 306
  ];
  if (masonCoreCourses.some(mc => mc.toUpperCase() === normalizedId)) {
    return true;
  }
  
  // REQUIRED COMPUTER SCIENCE COURSES
  const requiredCSCourses = [
    'CS 110', // Essentials of Computer Science
    'CS 112', // Introduction to Computer Programming
    'CS 211', // Object-Oriented Programming
    'CS 262', // Introduction to Low-Level Programming
    'CS 306', // Synthesis of Ethics and Law for the Computing Professional
    'CS 310', // Data Structures
    'CS 321', // Software Engineering
    'CS 330', // Formal Methods and Models
    'CS 367', // Computer Systems and Programming
    'CS 471', // Operating Systems
    'CS 483'  // Analysis of Algorithms
  ];
  if (requiredCSCourses.some(cs => cs.toUpperCase() === normalizedId)) {
    return true;
  }
  
  // SENIOR CS REQUIREMENTS
  // One of: CS 455, CS 468, CS 475
  const seniorCSRequired = ['CS 455', 'CS 468', 'CS 475'];
  if (seniorCSRequired.some(cs => cs.toUpperCase() === normalizedId)) {
    return true;
  }
  
  // Additional Senior CS courses (4 required)
  const seniorCSAdditional = [
    'CS 425', 'CS 440', 'CS 450', 'CS 451', 'CS 455', 'CS 463', 'CS 465', 
    'CS 468', 'CS 469', 'CS 475', 'CS 477', 'CS 480', 'CS 482', 'CS 484', 
    'CS 485', 'CS 490', 'CS 491', 'CS 499'
  ];
  if (seniorCSAdditional.some(cs => cs.toUpperCase() === normalizedId)) {
    return true;
  }
  
  // MATH 446 (or OR 481) can count toward Senior CS
  if (normalizedId === 'MATH 446' || normalizedId === 'OR 481') {
    return true;
  }
  
  // REQUIRED MATHEMATICS AND STATISTICS
  const requiredMathCourses = [
    'MATH 113', // Calculus I
    'MATH 114', // Calculus II
    'MATH 125', // Discrete Mathematics
    'MATH 203', // Linear Algebra
    'MATH 213', // Calculus III
    'STAT 344'  // Probability and Statistics for Engineers & Scientists I
  ];
  if (requiredMathCourses.some(math => math.toUpperCase() === normalizedId)) {
    return true;
  }
  
  // Alternative to STAT 344: MATH 351 and MATH 352 (also satisfies one CS-related elective)
  if (normalizedId === 'MATH 351' || normalizedId === 'MATH 352') {
    return true;
  }
  
  // CS-RELATED ELECTIVES (Any two required)
  const csRelatedElectives = [
    'ECE 301', 'ECE 331', 'ECE 332', 'ECE 350', 'ECE 446', 'ECE 447', 'ECE 511',
    'OR 335', 'OR 441', 'OR 442',
    'PHIL 371', 'PHIL 376',
    'STAT 354',
    'SWE 432', 'SWE 437', 'SWE 443',
    'SYST 371', 'SYST 470',
    'ENGH 388'
  ];
  if (csRelatedElectives.some(elective => elective.toUpperCase() === normalizedId)) {
    return true;
  }
  
  // Any MATH course > 300 except MATH 351 (already counted above)
  const mathMatch = normalizedId.match(/^MATH\s+(\d+)/);
  if (mathMatch) {
    const mathNum = parseInt(mathMatch[1]);
    if (mathNum > 300 && mathNum !== 351) {
      return true;
    }
  }
  
  // Any CS course > 300 (for Senior CS or electives)
  const csMatch = normalizedId.match(/^CS\s+(\d+)/);
  if (csMatch && parseInt(csMatch[1]) > 300) {
    return true;
  }
  
  // NATURAL SCIENCE REQUIREMENT (12 credits required)
  // Must include a two-course lab sequence from ONE of the following options:
  // - Biology: BIOL 103+106 and BIOL 107
  // - Chemistry: CHEM 211+213 and CHEM 212+214
  // - Geology: GEOL 101 and GEOL 102
  // - Physics: PHYS 160+161 and PHYS 260+261
  const naturalScienceCourses = [
    // Biology sequence
    'BIOL 103', 'BIOL 106', 'BIOL 107',
    // Chemistry sequence
    'CHEM 211', 'CHEM 213', 'CHEM 212', 'CHEM 214',
    // Geology sequence
    'GEOL 101', 'GEOL 102',
    // Physics sequence
    'PHYS 160', 'PHYS 161', 'PHYS 260', 'PHYS 261'
  ];
  if (naturalScienceCourses.some(sci => sci.toUpperCase() === normalizedId)) {
    return true;
  }
  
  // Check course catalog for required courses
  if (course && course.required) {
    return true;
  }
  
  // Math/science courses that are required count
  if (course && (course.category === 'math' || course.category === 'science') && course.required) {
    return true;
  }
  
  // CS electives (CS courses that are electives)
  if (course && course.category === 'elective' && course.courseId.startsWith('CS')) {
    return true;
  }
  
  // General electives - any course that's not explicitly excluded counts (up to 8 credits)
  // Excluded: MATH 104, MATH 105, MATH 108, IT courses, military science, most RECR courses
  const excludedCourses = [
    'MATH 104', 'MATH 105', 'MATH 108'
  ];
  if (excludedCourses.some(excluded => excluded.toUpperCase() === normalizedId)) {
    return false;
  }
  
  // If course is in catalog but not explicitly required, it might be a general elective
  // For now, we'll be conservative and only count courses we know about
  if (course) {
    // If it's in the catalog and not explicitly excluded, it could count as general elective
    return true;
  }
  
  return false;
}

/**
 * Get prerequisites for a course
 */
export async function getPrerequisites(courseId: string): Promise<string[]> {
  const requirements = await parseCSRequirements();
  const normalizedId = courseId.toUpperCase().trim();
  
  const course = requirements.find(c => 
    c.courseId.toUpperCase().trim() === normalizedId
  );
  
  return course?.prerequisites || [];
}
