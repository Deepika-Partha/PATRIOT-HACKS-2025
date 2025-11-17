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
  
  // Mason Core requirements (required for degree)
  const masonCoreCourses = [
    'ENGH 101', 'ENGH 302', 'COMM 100', 'COMM 101'
  ];
  if (masonCoreCourses.some(mc => mc.toUpperCase() === normalizedId)) {
    return true;
  }
  
  // Required courses always count
  if (course && course.required) {
    return true;
  }
  
  // CS-related electives (from Hackathon catalog)
  // ECE 301, 331, 332, 350, 446, 447, 511
  // OR 335, 441, 442
  // PHIL 371, 376
  // STAT 354
  // SWE 432, 437, 443
  // SYST 371, 470
  // Any MATH course > 300 except MATH 351
  // Any CS course > 300
  const csRelatedElectives = [
    'ECE 301', 'ECE 331', 'ECE 332', 'ECE 350', 'ECE 446', 'ECE 447', 'ECE 511',
    'OR 335', 'OR 441', 'OR 442',
    'PHIL 371', 'PHIL 376',
    'STAT 354',
    'SWE 432', 'SWE 437', 'SWE 443',
    'SYST 371', 'SYST 470'
  ];
  
  // Check if it's a CS-related elective
  if (csRelatedElectives.some(elective => elective.toUpperCase() === normalizedId)) {
    return true;
  }
  
  // Check if it's a CS course above 300
  const csMatch = normalizedId.match(/^CS\s+(\d+)/);
  if (csMatch && parseInt(csMatch[1]) > 300) {
    return true;
  }
  
  // Check if it's a MATH course above 300 (except MATH 351)
  const mathMatch = normalizedId.match(/^MATH\s+(\d+)/);
  if (mathMatch) {
    const mathNum = parseInt(mathMatch[1]);
    if (mathNum > 300 && mathNum !== 351) {
      return true;
    }
  }
  
  // CS electives (CS courses that are electives)
  if (course && course.category === 'elective' && course.courseId.startsWith('CS')) {
    return true;
  }
  
  // Math/science courses that are required count
  if (course && (course.category === 'math' || course.category === 'science') && course.required) {
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
  // In a full implementation, we'd track general elective credits separately
  if (course) {
    // If it's in the catalog and not explicitly excluded, it could count as general elective
    // But we need to be careful - let's check if it's a reasonable course
    return true; // If it's in our catalog, it likely counts
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
