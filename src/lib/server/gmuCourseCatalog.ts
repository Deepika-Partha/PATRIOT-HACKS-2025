import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Course } from './scrapeGmuCatalog';

let coursesCache: Course[] | null = null;

/**
 * Load all courses from the JSON file.
 * Caches the result for subsequent calls.
 */
export function loadCourses(): Course[] {
  if (coursesCache) {
    return coursesCache;
  }

  try {
    // In SvelteKit, static files are served from the static directory
    // During build/runtime, we need to read from the static directory
    const filePath = join(process.cwd(), 'static', 'gmu_courses.json');
    
    if (!existsSync(filePath)) {
      console.warn('GMU course catalog not found at:', filePath);
      console.warn('Run "npm run scrape" to generate the catalog.');
      coursesCache = [];
      return coursesCache;
    }
    
    const fileContent = readFileSync(filePath, 'utf-8');
    coursesCache = JSON.parse(fileContent) as Course[];
    console.log(`Loaded ${coursesCache.length} courses from catalog.`);
    return coursesCache;
  } catch (error: any) {
    console.error('Failed to load GMU course catalog:', error.message);
    console.warn('Returning empty catalog. Run "npm run scrape" to generate the catalog.');
    coursesCache = [];
    return coursesCache;
  }
}

/**
 * Find a course by its code (e.g., "CS 310").
 */
export function getCourseByCode(code: string): Course | undefined {
  const courses = loadCourses();
  const normalized = code.toUpperCase().trim();
  return courses.find(course => course.code.toUpperCase() === normalized);
}

/**
 * Get all courses for a specific subject (e.g., "CS").
 */
export function getCoursesBySubject(subject: string): Course[] {
  const courses = loadCourses();
  const normalized = subject.toUpperCase().trim();
  return courses.filter(course => course.subject.toUpperCase() === normalized);
}

/**
 * Get all available courses that the user can take based on their completed courses.
 * Returns courses where all prerequisites are met.
 */
export function getAvailableCourses(completedCourses: string[]): Course[] {
  const courses = loadCourses();
  const completedSet = new Set(completedCourses.map(c => c.toUpperCase().trim()));
  
  return courses.filter(course => {
    if (!course.prerequisites || course.prerequisites.length === 0) {
      return true; // No prerequisites, can take it
    }
    
    // Check if all prerequisites are met
    return course.prerequisites.every(prereq => 
      completedSet.has(prereq.toUpperCase().trim())
    );
  });
}

/**
 * Get courses that the user cannot take, along with reasons (missing prerequisites).
 */
export function getUnavailableCourses(completedCourses: string[]): Array<{
  course: Course;
  missingPrerequisites: string[];
}> {
  const courses = loadCourses();
  const completedSet = new Set(completedCourses.map(c => c.toUpperCase().trim()));
  
  const unavailable: Array<{ course: Course; missingPrerequisites: string[] }> = [];
  
  for (const course of courses) {
    if (!course.prerequisites || course.prerequisites.length === 0) {
      continue; // No prerequisites, skip
    }
    
    const missing = course.prerequisites.filter(prereq => 
      !completedSet.has(prereq.toUpperCase().trim())
    );
    
    if (missing.length > 0) {
      unavailable.push({
        course,
        missingPrerequisites: missing
      });
    }
  }
  
  return unavailable;
}

/**
 * Check if a user can take a specific course based on their completed courses.
 * Returns true if all prerequisites are met, false otherwise.
 */
export function canTakeCourse(courseCode: string, completedCourses: string[]): boolean {
  const course = getCourseByCode(courseCode);
  if (!course) {
    return false; // Course doesn't exist
  }
  
  if (!course.prerequisites || course.prerequisites.length === 0) {
    return true; // No prerequisites
  }
  
  const completedSet = new Set(completedCourses.map(c => c.toUpperCase().trim()));
  return course.prerequisites.every(prereq => 
    completedSet.has(prereq.toUpperCase().trim())
  );
}

/**
 * Get missing prerequisites for a specific course.
 * Returns empty array if course can be taken or course doesn't exist.
 */
export function getMissingPrerequisites(courseCode: string, completedCourses: string[]): string[] {
  const course = getCourseByCode(courseCode);
  if (!course || !course.prerequisites || course.prerequisites.length === 0) {
    return [];
  }
  
  const completedSet = new Set(completedCourses.map(c => c.toUpperCase().trim()));
  return course.prerequisites.filter(prereq => 
    !completedSet.has(prereq.toUpperCase().trim())
  );
}

/**
 * Get all courses (for chatbot context).
 */
export function getAllCourses(): Course[] {
  return loadCourses();
}

/**
 * Search courses by title or code.
 */
export function searchCourses(query: string): Course[] {
  const courses = loadCourses();
  const normalizedQuery = query.toUpperCase().trim();
  
  return courses.filter(course => 
    course.code.toUpperCase().includes(normalizedQuery) ||
    course.title.toUpperCase().includes(normalizedQuery) ||
    course.description.toUpperCase().includes(normalizedQuery)
  );
}

/**
 * Extract course codes from a message (e.g., "CS 310", "MATH 113").
 */
function extractCourseCodes(message: string): string[] {
  const courseCodePattern = /\b([A-Z]{2,4})\s+(\d{3,4}[A-Z]?)\b/g;
  const codes: string[] = [];
  let match;
  
  while ((match = courseCodePattern.exec(message.toUpperCase())) !== null) {
    const code = `${match[1]} ${match[2]}`;
    if (!codes.includes(code)) {
      codes.push(code);
    }
  }
  
  return codes;
}

/**
 * Extract subject codes from a message (e.g., "CS", "MATH").
 */
function extractSubjects(message: string): string[] {
  const subjectPattern = /\b([A-Z]{2,4})\s+(?:courses?|classes?|subjects?)\b/i;
  const subjects: string[] = [];
  const words = message.toUpperCase().split(/\s+/);
  
  // Look for 2-4 letter codes that might be subjects
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (/^[A-Z]{2,4}$/.test(word) && word.length >= 2 && word.length <= 4) {
      // Common subject codes
      if (!subjects.includes(word)) {
        subjects.push(word);
      }
    }
  }
  
  // Also check for explicit subject mentions
  const match = subjectPattern.exec(message);
  if (match) {
    const subject = match[1].toUpperCase();
    if (!subjects.includes(subject)) {
      subjects.push(subject);
    }
  }
  
  return subjects;
}

/**
 * Extract keywords from a message for course search.
 */
function extractKeywords(message: string): string[] {
  const keywords: string[] = [];
  const commonTerms = [
    'data structures', 'algorithms', 'programming', 'database', 'networking',
    'operating systems', 'software engineering', 'web development', 'machine learning',
    'artificial intelligence', 'computer graphics', 'security', 'cybersecurity',
    'calculus', 'linear algebra', 'statistics', 'physics', 'chemistry', 'biology'
  ];
  
  const lowerMessage = message.toLowerCase();
  for (const term of commonTerms) {
    if (lowerMessage.includes(term)) {
      keywords.push(term);
    }
  }
  
  return keywords;
}

/**
 * Find relevant courses based on a user message.
 * Extracts course codes, subjects, and keywords, then searches for matching courses.
 */
export function findRelevantCourses(message: string, completedCourses: string[] = []): Course[] {
  const courses = loadCourses();
  const courseCodes = extractCourseCodes(message);
  const subjects = extractSubjects(message);
  const keywords = extractKeywords(message);
  
  const relevant: Course[] = [];
  const seen = new Set<string>();
  
  // Priority 1: Exact course code matches
  for (const code of courseCodes) {
    const course = courses.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (course && !seen.has(course.code)) {
      relevant.push(course);
      seen.add(course.code);
    }
  }
  
  // Priority 2: Subject matches
  for (const subject of subjects) {
    const subjectCourses = courses.filter(c => 
      c.subject.toUpperCase() === subject.toUpperCase() && !seen.has(c.code)
    );
    relevant.push(...subjectCourses);
    subjectCourses.forEach(c => seen.add(c.code));
  }
  
  // Priority 3: Keyword matches in title or description
  for (const keyword of keywords) {
    const keywordCourses = courses.filter(c => {
      if (seen.has(c.code)) return false;
      const searchText = `${c.title} ${c.description}`.toLowerCase();
      return searchText.includes(keyword);
    });
    relevant.push(...keywordCourses);
    keywordCourses.forEach(c => seen.add(c.code));
  }
  
  // Priority 4: General text search if no specific matches
  if (relevant.length === 0 && message.trim().length > 3) {
    const searchTerms = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const generalMatches = courses.filter(c => {
      if (seen.has(c.code)) return false;
      const searchText = `${c.code} ${c.title} ${c.description}`.toLowerCase();
      return searchTerms.some(term => searchText.includes(term));
    });
    relevant.push(...generalMatches.slice(0, 20)); // Limit general matches
  }
  
  // Limit total results
  return relevant.slice(0, 30);
}

/**
 * Get a summary of courses by subject (just counts).
 */
export function getSubjectSummary(): Record<string, number> {
  const courses = loadCourses();
  const summary: Record<string, number> = {};
  
  for (const course of courses) {
    summary[course.subject] = (summary[course.subject] || 0) + 1;
  }
  
  return summary;
}

/**
 * Search courses by keywords (extracts course codes, subjects, and keywords).
 */
export function searchCoursesByKeywords(query: string): Course[] {
  return findRelevantCourses(query);
}

/**
 * Extract major subject code from major name.
 * E.g., "Computer Science" -> "CS", "Electrical and Computer Engineering" -> "ECE"
 */
function extractMajorSubject(major: string): string[] {
  const majorUpper = major.toUpperCase();
  const subjectMap: Record<string, string[]> = {
    'COMPUTER SCIENCE': ['CS', 'IT', 'CYSE'],
    'CS': ['CS', 'IT', 'CYSE'],
    'SOFTWARE ENGINEERING': ['CS', 'SWE', 'IT'],
    'INFORMATION TECHNOLOGY': ['IT', 'CS', 'CYSE'],
    'IT': ['IT', 'CS', 'CYSE'],
    'CYBERSECURITY': ['CYSE', 'CS', 'IT'],
    'CYSE': ['CYSE', 'CS', 'IT'],
    'ELECTRICAL ENGINEERING': ['ECE', 'PHYS', 'MATH'],
    'ECE': ['ECE', 'PHYS', 'MATH'],
    'COMPUTER ENGINEERING': ['ECE', 'CS', 'PHYS'],
    'MECHANICAL ENGINEERING': ['ME', 'PHYS', 'MATH'],
    'CIVIL ENGINEERING': ['CE', 'PHYS', 'MATH'],
    'MATHEMATICS': ['MATH', 'STAT', 'CS'],
    'MATH': ['MATH', 'STAT', 'CS'],
    'PHYSICS': ['PHYS', 'MATH'],
    'BIOLOGY': ['BIOL', 'CHEM'],
    'CHEMISTRY': ['CHEM', 'BIOL'],
    'BUSINESS': ['MBUS', 'ACCT', 'ECON', 'FNAN'],
    'ACCOUNTING': ['ACCT', 'MBUS', 'FNAN'],
    'ECONOMICS': ['ECON', 'MBUS', 'MATH'],
    'PSYCHOLOGY': ['PSYC', 'NEUR'],
    'ENGLISH': ['ENGH', 'WRIT'],
  };
  
  // Check for direct match
  for (const [key, subjects] of Object.entries(subjectMap)) {
    if (majorUpper.includes(key)) {
      return subjects;
    }
  }
  
  // Extract potential subject codes from major name (2-4 uppercase letters)
  const matches = major.match(/\b[A-Z]{2,4}\b/g);
  if (matches && matches.length > 0) {
    return matches;
  }
  
  return []; // Return empty if no match
}

/**
 * Get related subjects for a major (subjects that are commonly taken as prerequisites or electives).
 */
function getRelatedSubjects(major: string): string[] {
  const majorSubjects = extractMajorSubject(major);
  const related = new Set<string>(majorSubjects);
  
  // Add common prerequisites for all engineering/science majors
  const majorUpper = major.toUpperCase();
  if (majorUpper.includes('ENGINEERING') || majorUpper.includes('COMPUTER') || majorUpper.includes('SCIENCE')) {
    related.add('MATH');
    related.add('PHYS');
  }
  
  // Add general education subjects
  related.add('ENGH'); // English
  related.add('HNRS'); // Honors
  
  return Array.from(related);
}

/**
 * Get the prerequisite chain for a course (what courses lead to this one).
 * Returns a map of course code -> list of courses that require it.
 */
export function getPrerequisiteChain(courseCode: string): {
  course: Course | undefined;
  directPrerequisites: Course[];
  indirectPrerequisites: Course[];
  unlockedCourses: Course[];
} {
  const course = getCourseByCode(courseCode);
  if (!course) {
    return {
      course: undefined,
      directPrerequisites: [],
      indirectPrerequisites: [],
      unlockedCourses: []
    };
  }
  
  const courses = loadCourses();
  const directPrereqs: Course[] = [];
  const indirectPrereqs: Course[] = [];
  const seen = new Set<string>();
  
  // Get direct prerequisites
  if (course.prerequisites && course.prerequisites.length > 0) {
    for (const prereqCode of course.prerequisites) {
      const prereq = getCourseByCode(prereqCode);
      if (prereq) {
        directPrereqs.push(prereq);
        seen.add(prereq.code);
        
        // Get prerequisites of prerequisites (indirect)
        if (prereq.prerequisites && prereq.prerequisites.length > 0) {
          for (const indirectPrereqCode of prereq.prerequisites) {
            if (!seen.has(indirectPrereqCode)) {
              const indirectPrereq = getCourseByCode(indirectPrereqCode);
              if (indirectPrereq) {
                indirectPrereqs.push(indirectPrereq);
                seen.add(indirectPrereq.code);
              }
            }
          }
        }
      }
    }
  }
  
  // Find courses that this course unlocks (courses that have this as a prerequisite)
  const unlockedCourses = courses.filter(c => 
    c.prerequisites && c.prerequisites.some(prereq => 
      prereq.toUpperCase().trim() === course.code.toUpperCase().trim()
    )
  );
  
  return {
    course,
    directPrerequisites: directPrereqs,
    indirectPrerequisites: indirectPrereqs,
    unlockedCourses
  };
}

/**
 * Get next-level courses based on completed courses.
 * Returns courses that are one level above the student's completed courses.
 */
export function getNextLevelCourses(completedCourses: string[]): Course[] {
  const courses = loadCourses();
  const completedSet = new Set(completedCourses.map(c => c.toUpperCase().trim()));
  const nextLevel: Course[] = [];
  
  // Find courses where at least one prerequisite has been completed
  // but the student can now take (all prerequisites met)
  for (const course of courses) {
    // Skip if already completed
    if (completedSet.has(course.code.toUpperCase().trim())) {
      continue;
    }
    
    // Check if has prerequisites and can take it
    if (course.prerequisites && course.prerequisites.length > 0) {
      const allPrereqsMet = course.prerequisites.every(prereq =>
        completedSet.has(prereq.toUpperCase().trim())
      );
      
      if (allPrereqsMet) {
        // Check if at least one prereq was from completed courses
        const hasCompletedPrereq = course.prerequisites.some(prereq =>
          completedSet.has(prereq.toUpperCase().trim())
        );
        
        if (hasCompletedPrereq) {
          nextLevel.push(course);
        }
      }
    }
  }
  
  return nextLevel;
}

/**
 * Calculate a relevance score for a course based on:
 * - Number of courses it unlocks
 * - Whether it's in the student's major
 * - Course level (higher level = higher score for upperclassmen)
 */
function calculateCourseRelevance(
  course: Course, 
  major: string, 
  year: number,
  allCourses: Course[]
): number {
  let score = 0;
  
  const majorSubjects = extractMajorSubject(major);
  
  // Major relevance (high priority)
  if (majorSubjects.some(subj => course.subject.toUpperCase() === subj.toUpperCase())) {
    score += 100;
  }
  
  // Related subject bonus
  const relatedSubjects = getRelatedSubjects(major);
  if (relatedSubjects.some(subj => course.subject.toUpperCase() === subj.toUpperCase())) {
    score += 50;
  }
  
  // Count how many courses this unlocks
  const unlockedCount = allCourses.filter(c =>
    c.prerequisites && c.prerequisites.some(prereq =>
      prereq.toUpperCase().trim() === course.code.toUpperCase().trim()
    )
  ).length;
  score += unlockedCount * 10;
  
  // Course level alignment with student year
  const courseNumberMatch = course.code.match(/\d{3,4}/);
  if (courseNumberMatch) {
    const courseNumber = parseInt(courseNumberMatch[0]);
    const courseLevel = Math.floor(courseNumber / 100); // 1xx -> 1, 2xx -> 2, etc.
    
    // Prefer courses at or slightly above student's year level
    const levelDiff = courseLevel - year;
    if (levelDiff === 0 || levelDiff === 1) {
      score += 30; // Perfect level match
    } else if (levelDiff === 2) {
      score += 15; // Slightly ahead
    } else if (levelDiff < 0) {
      score -= Math.abs(levelDiff) * 10; // Penalize lower-level courses
    }
  }
  
  return score;
}

/**
 * Get recommended courses for a student based on their major, year, and completed courses.
 * Returns courses where prerequisites are met, prioritized by relevance.
 */
export function getRecommendedCourses(
  completedCourses: string[],
  major: string,
  year: number,
  limit: number = 20
): Course[] {
  const courses = loadCourses();
  const completedSet = new Set(completedCourses.map(c => c.toUpperCase().trim()));
  const majorSubjects = extractMajorSubject(major);
  const relatedSubjects = getRelatedSubjects(major);
  
  // Get available courses (prerequisites met, not already completed)
  const available = courses.filter(course => {
    // Skip if already completed
    if (completedSet.has(course.code.toUpperCase().trim())) {
      return false;
    }
    
    // Check prerequisites
    if (!course.prerequisites || course.prerequisites.length === 0) {
      return true; // No prerequisites, available
    }
    
    return course.prerequisites.every(prereq =>
      completedSet.has(prereq.toUpperCase().trim())
    );
  });
  
  // Filter by major and related subjects first
  const majorCourses = available.filter(c =>
    majorSubjects.some(subj => c.subject.toUpperCase() === subj.toUpperCase()) ||
    relatedSubjects.some(subj => c.subject.toUpperCase() === subj.toUpperCase())
  );
  
  // Calculate relevance scores
  const scoredCourses = majorCourses.map(course => ({
    course,
    score: calculateCourseRelevance(course, major, year, courses)
  }));
  
  // Sort by score (highest first)
  scoredCourses.sort((a, b) => b.score - a.score);
  
  // Return top N courses
  return scoredCourses.slice(0, limit).map(sc => sc.course);
}

/**
 * Get alternative courses to a specific course.
 * Returns similar courses in the same subject or related subjects that the student can take.
 */
export function getCourseAlternatives(
  courseCode: string,
  completedCourses: string[],
  major: string
): {
  targetCourse: Course | undefined;
  sameSubjectAlternatives: Course[];
  relatedSubjectAlternatives: Course[];
  prerequisiteAlternatives: Course[];
} {
  const targetCourse = getCourseByCode(courseCode);
  if (!targetCourse) {
    return {
      targetCourse: undefined,
      sameSubjectAlternatives: [],
      relatedSubjectAlternatives: [],
      prerequisiteAlternatives: []
    };
  }
  
  const courses = loadCourses();
  const completedSet = new Set(completedCourses.map(c => c.toUpperCase().trim()));
  const majorSubjects = extractMajorSubject(major);
  const relatedSubjects = getRelatedSubjects(major);
  
  // Get course number for level comparison
  const targetNumberMatch = targetCourse.code.match(/\d{3,4}/);
  const targetLevel = targetNumberMatch ? parseInt(targetNumberMatch[0]) : 0;
  
  // Same subject alternatives (similar level, can take)
  const sameSubjectAlternatives = courses.filter(c => {
    if (c.code === targetCourse.code) return false;
    if (completedSet.has(c.code.toUpperCase().trim())) return false;
    if (c.subject.toUpperCase() !== targetCourse.subject.toUpperCase()) return false;
    
    // Check if can take it
    if (c.prerequisites && c.prerequisites.length > 0) {
      const canTake = c.prerequisites.every(prereq =>
        completedSet.has(prereq.toUpperCase().trim())
      );
      if (!canTake) return false;
    }
    
    // Check similar level (within 100)
    const numMatch = c.code.match(/\d{3,4}/);
    if (numMatch) {
      const level = parseInt(numMatch[0]);
      return Math.abs(level - targetLevel) <= 100;
    }
    
    return true;
  }).slice(0, 5);
  
  // Related subject alternatives
  const relatedSubjectAlternatives = courses.filter(c => {
    if (c.code === targetCourse.code) return false;
    if (completedSet.has(c.code.toUpperCase().trim())) return false;
    if (c.subject.toUpperCase() === targetCourse.subject.toUpperCase()) return false;
    
    // Must be in related subjects
    const isRelated = relatedSubjects.some(subj => 
      c.subject.toUpperCase() === subj.toUpperCase()
    );
    if (!isRelated) return false;
    
    // Check if can take it
    if (c.prerequisites && c.prerequisites.length > 0) {
      const canTake = c.prerequisites.every(prereq =>
        completedSet.has(prereq.toUpperCase().trim())
      );
      if (!canTake) return false;
    }
    
    // Check similar level
    const numMatch = c.code.match(/\d{3,4}/);
    if (numMatch) {
      const level = parseInt(numMatch[0]);
      return Math.abs(level - targetLevel) <= 100;
    }
    
    return true;
  }).slice(0, 5);
  
  // Prerequisite alternatives (courses that could be taken instead to build toward target)
  const prerequisiteAlternatives: Course[] = [];
  if (targetCourse.prerequisites && targetCourse.prerequisites.length > 0) {
    const missingPrereqs = targetCourse.prerequisites.filter(prereq =>
      !completedSet.has(prereq.toUpperCase().trim())
    );
    
    for (const prereqCode of missingPrereqs) {
      const prereq = getCourseByCode(prereqCode);
      if (prereq) {
        prerequisiteAlternatives.push(prereq);
      }
    }
  }
  
  return {
    targetCourse,
    sameSubjectAlternatives,
    relatedSubjectAlternatives,
    prerequisiteAlternatives
  };
}

