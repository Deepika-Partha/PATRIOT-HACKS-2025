<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let profile = $state<any>({});
  let academicHistory = $state<any[]>([]);
  let currentSchedule = $state<any[]>([]);
  let degreeProgress = $state<any>({});
  let credits = $state<any>({});
  let email = $state('');
  let studentYear = $state<number | null>(null);

  let newCourse = $state({ courseId: '', semester: '', grade: '' });
  let courseLookup = $state<any>(null);
  let lookupError = $state('');
  let showAddCourse = $state(false);
  let showRetakeModal = $state(false);
  let duplicateCourse = $state<any>(null);
  let pendingCourseToAdd = $state<any>(null);
  
  // Prerequisites for completed courses
  let coursePrerequisites = $state<string[]>([]);
  let coursePrerequisiteStatus = $state<Record<string, { met: boolean; inHistory: boolean }>>({});
  
  // Autocomplete for course input
  let courseSuggestions = $state<any[]>([]);
  let showSuggestions = $state(false);
  let selectedSuggestionIndex = $state(-1);

  // Potential courses (temporary) - roadmap feature
  let potentialCourses = $state<any[]>([]);
  let showPotentialCourses = $state(false);
  let newPotentialCourse = $state({ courseId: '', grade: 'Planning', semester: '' });
  let potentialCourseLookup = $state<any>(null);
  let potentialLookupError = $state('');
  let potentialPrerequisites = $state<string[]>([]);
  let prerequisiteStatus = $state<Record<string, { met: boolean; inHistory: boolean; inPotential: boolean; semester?: string }>>({});
  
  // Autocomplete for potential course input
  let potentialSuggestions = $state<any[]>([]);
  let showPotentialSuggestions = $state(false);
  let selectedPotentialIndex = $state(-1);

  let error = $state('');
  let loading = $state(true);

  // Chatbot state
  let chatbotOpen = $state(false);
  let chatbotMessage = $state('');
  let chatbotHistory = $state<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  let chatbotLoading = $state(false);
  let chatbotHistoryLoaded = $state(false);

  async function loadChatbotHistory() {
    if (chatbotHistoryLoaded) return;
    try {
      const res = await fetch('/api/chatbot');
      const data = await res.json();
      if (data.conversationHistory && Array.isArray(data.conversationHistory)) {
        chatbotHistory = data.conversationHistory;
        chatbotHistoryLoaded = true;
      }
    } catch (err) {
      console.error('Failed to load chatbot history:', err);
    }
  }

  function toggleChatbot() {
    chatbotOpen = !chatbotOpen;
    if (chatbotOpen && !chatbotHistoryLoaded) {
      loadChatbotHistory();
    }
  }

  async function sendChatbotMessage() {
    if (!chatbotMessage.trim() || chatbotLoading) return;

    const userMessage = chatbotMessage.trim();
    chatbotMessage = '';
    chatbotLoading = true;

    // Add user message to UI immediately
    chatbotHistory = [...chatbotHistory, { role: 'user', content: userMessage }];

    try {
      // Server will load conversation history from database and add the new message
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage
          // Don't send conversationHistory - server loads it from database
        })
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        // Update with complete history from server (includes saved messages)
        chatbotHistory = data.conversationHistory || [
          ...chatbotHistory,
          { role: 'assistant', content: data.reply }
        ];
        // Mark history as loaded and scroll to bottom
        chatbotHistoryLoaded = true;
        setTimeout(() => {
          const chatContainer = document.querySelector('.chatbot-messages');
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 100);
      } else {
        chatbotHistory.push({ role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' });
      }
    } catch (err) {
      chatbotHistory.push({ role: 'assistant', content: 'Network error. Please check your connection.' });
    } finally {
      chatbotLoading = false;
    }
  }

  // Cache for course counts toward degree checks
  let courseCountsCache = $state<Record<string, boolean>>({});

  // Check if a course counts toward degree (recalculate on display)
  async function checkCourseCountsTowardDegree(courseId: string, grade: string): Promise<boolean> {
    const GRADES_BELOW_C = ['C-', 'D+', 'D', 'F'];
    const normalizedGrade = grade?.toUpperCase().trim() || '';
    
    // If grade is below C, it doesn't count regardless
    if (GRADES_BELOW_C.includes(normalizedGrade)) {
      return false;
    }
    
    // Check cache first
    const cacheKey = `${courseId}_${normalizedGrade}`;
    if (courseCountsCache[cacheKey] !== undefined) {
      return courseCountsCache[cacheKey];
    }
    
    try {
      const res = await fetch(`/api/courses/countsTowardDegree/${encodeURIComponent(courseId)}`);
    if (res.ok) {
      const data = await res.json();
        const counts = data.countsTowardDegree === true;
        courseCountsCache[cacheKey] = counts;
        return counts;
      }
    } catch (err) {
      console.error('Error checking if course counts:', err);
    }
    
    // Fallback: assume it counts if we can't check
    return true;
  }

  // Recalculate counts for all courses when academic history changes
  async function recalculateCourseCounts() {
    const newCache: Record<string, boolean> = {};
    // Process all courses in parallel for faster loading
    const promises = academicHistory.map(async (course) => {
      if (course.nullified) {
        const cacheKey = `${course.courseId}_${(course.grade || '').toUpperCase().trim()}`;
        return { key: cacheKey, counts: false };
      }
      const counts = await checkCourseCountsTowardDegree(course.courseId, course.grade || '');
      const cacheKey = `${course.courseId}_${(course.grade || '').toUpperCase().trim()}`;
      return { key: cacheKey, counts };
    });
    
    const results = await Promise.all(promises);
    results.forEach(({ key, counts }) => {
      newCache[key] = counts;
    });
    
    courseCountsCache = newCache;
  }

  async function fetchStudentInfo() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/student/getInfo');
    if (res.ok) {
      const data = await res.json();
        profile = data.profile || {};
        academicHistory = data.academicHistory || [];
        currentSchedule = data.currentSchedule || [];
        degreeProgress = data.degreeProgress || {};
        credits = data.credits || {};
        email = data.email || '';
        studentYear = data.year || data.profile?.year || null;
        
        // Recalculate course counts after fetching
        await recalculateCourseCounts();
        
        // Recheck prerequisite status if we have a course selected
        if (courseLookup && coursePrerequisites.length > 0) {
          checkCoursePrerequisiteStatus();
        }
    } else {
        const errorData = await res.json();
        error = errorData.error || 'Failed to fetch student information';
      }
    } catch (err) {
      error = 'Failed to fetch student information';
      console.error(err);
      } finally {
      loading = false;
      await fetchRemainingCourses();
    }
  }

  function getAvailableSemesters(): string[] {
    if (!studentYear) return [];
    
    const currentYear = new Date().getFullYear();
    const semesters: string[] = [];
    
    // Calculate semesters based on student year
    // Freshman (1): Current year Fall, Spring, Summer
    // Sophomore (2): Previous year Fall, Spring, Summer + Current year Fall, Spring, Summer
    // Junior (3): 2 years back + previous year + current year
    // Senior (4): 3 years back + 2 years back + previous year + current year
    
    const yearsToInclude = studentYear; // Number of years to go back
    
    for (let i = 0; i < yearsToInclude; i++) {
      const year = currentYear - i;
      semesters.push(`Fall ${year}`);
      semesters.push(`Spring ${year}`);
      semesters.push(`Summer ${year}`);
    }
    
    // Reverse to show most recent first
    return semesters.reverse();
  }

  // Search courses for autocomplete
  async function searchCourses(query: string) {
    if (!query || query.trim().length === 0) {
      courseSuggestions = [];
      showSuggestions = false;
      return;
    }

    try {
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        courseSuggestions = data.courses || [];
        showSuggestions = courseSuggestions.length > 0;
        selectedSuggestionIndex = -1;
      }
    } catch (err) {
      console.error('Search error:', err);
      courseSuggestions = [];
      showSuggestions = false;
    }
  }

  // Debounced search function
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;
  function handleCourseInput() {
    if (searchTimeout) clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(async () => {
      await searchCourses(newCourse.courseId);
      // Also do the lookup for exact match
      await lookupCourse();
    }, 200);
  }

  function selectCourse(course: any) {
    newCourse.courseId = course.courseId;
    courseLookup = course;
    courseSuggestions = [];
    showSuggestions = false;
    lookupError = '';
    // Fetch prerequisites when course is selected
    fetchCoursePrerequisites(course.courseId);
  }

  async function lookupCourse() {
    if (!newCourse.courseId) {
      courseLookup = null;
      lookupError = '';
      coursePrerequisites = [];
      coursePrerequisiteStatus = {};
      return;
    }

    // Add a small delay to avoid too many requests while typing
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check if courseId changed during the delay
    if (!newCourse.courseId) {
      courseLookup = null;
      lookupError = '';
      coursePrerequisites = [];
      coursePrerequisiteStatus = {};
      return;
    }

    try {
      const res = await fetch(`/api/courses/lookup?number=${encodeURIComponent(newCourse.courseId)}`);
      if (res.ok) {
        const data = await res.json();
        courseLookup = data;
        lookupError = '';
        
        // Fetch prerequisites
        await fetchCoursePrerequisites(newCourse.courseId);
      } else {
        const errorData = await res.json();
        courseLookup = null;
        lookupError = errorData.error || `Course ${newCourse.courseId} does not exist in the course catalog`;
        coursePrerequisites = [];
        coursePrerequisiteStatus = {};
      }
    } catch (err) {
      console.error('Lookup error:', err);
      courseLookup = null;
      lookupError = 'Failed to lookup course. Please try again.';
      coursePrerequisites = [];
      coursePrerequisiteStatus = {};
    }
  }

  async function fetchCoursePrerequisites(courseId: string) {
    try {
      const res = await fetch(`/api/courses/prerequisites/${encodeURIComponent(courseId)}`);
      if (res.ok) {
        const data = await res.json();
        coursePrerequisites = data.prerequisites || [];
        checkCoursePrerequisiteStatus();
      } else {
        coursePrerequisites = [];
        coursePrerequisiteStatus = {};
      }
    } catch (err) {
      console.error('Error fetching prerequisites:', err);
      coursePrerequisites = [];
      coursePrerequisiteStatus = {};
    }
  }

  function checkCoursePrerequisiteStatus() {
    const status: Record<string, { met: boolean; inHistory: boolean }> = {};
    const GRADES_BELOW_C = ['C-', 'D+', 'D', 'F'];
    
    coursePrerequisites.forEach(prereqId => {
      const normalizedPrereq = prereqId.toUpperCase().trim();
      
      // Check if in academic history with passing grade (C or better)
      const prereqCourse = academicHistory.find(c => {
        const courseId = c.courseId?.toUpperCase().trim();
        return courseId === normalizedPrereq && !c.nullified;
      });
      
      const inHistory = !!prereqCourse;
      
      // Prerequisite is met if:
      // 1. Course exists in academic history
      // 2. Course is not nullified (already checked above)
      // 3. Grade is C or better (not in GRADES_BELOW_C)
      // 4. Course counts toward diploma (check cache)
      let met = false;
      if (prereqCourse) {
        const grade = prereqCourse.grade?.toUpperCase().trim() || '';
        const hasPassingGrade = !GRADES_BELOW_C.includes(grade);
        
        // Check if prerequisite counts toward diploma using cache
        const cacheKey = `${prereqCourse.courseId}_${grade}`;
        const courseCounts = courseCountsCache[cacheKey] ?? (prereqCourse.countsTowardDiploma !== false);
        
        met = hasPassingGrade && courseCounts;
      }
      
      status[prereqId] = {
        met,
        inHistory
      };
    });
    
    coursePrerequisiteStatus = status;
  }

  const VALID_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
  const GRADES_BELOW_C = ['C-', 'D+', 'D', 'F'];

  // Grade to points mapping for comparison
  const gradeToPoints = (grade: string): number => {
    const normalizedGrade = grade.toUpperCase().trim();
    const gradePoints: { [key: string]: number } = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'F': 0.0
    };
    return gradePoints[normalizedGrade] || 0.0;
  };

  // Compare two grades and return which is higher (1 = grade1 higher, -1 = grade2 higher, 0 = equal)
  function compareGrades(grade1: string, grade2: string): number {
    const points1 = gradeToPoints(grade1);
    const points2 = gradeToPoints(grade2);
    if (points1 > points2) return 1;
    if (points1 < points2) return -1;
    return 0;
  }

  function isValidGrade(grade: string): boolean {
    return VALID_GRADES.includes(grade.toUpperCase().trim());
  }

  function isGradeBelowC(grade: string): boolean {
    return GRADES_BELOW_C.includes(grade.toUpperCase().trim());
  }

  function hasCGradeOrBelow(): boolean {
    // Check if student already has a C- or D grade (per catalog: "may not use more than one course with grade C- or D")
    // Note: The catalog says C- or D, not C. C grades are allowed multiple times.
    return academicHistory.some(course => {
      const grade = course.grade?.toUpperCase().trim();
      return (grade === 'C-' || grade === 'D+' || grade === 'D') && !course.nullified;
    });
  }

  function checkForDuplicate(courseId: string): any | null {
    // Check if this course already exists in academic history
    const normalizedCourseId = courseId.toUpperCase().trim();
    return academicHistory.find(course => 
      course.courseId && course.courseId.toUpperCase().trim() === normalizedCourseId &&
      !course.nullified // Don't consider nullified courses as duplicates
    ) || null;
  }

  async function addCompletedCourse() {
    error = ''; // Clear any previous errors
    
    if (!newCourse.courseId) {
      error = 'Please enter a course number';
      return;
    }

    if (!courseLookup) {
      error = 'Please enter a valid course number that exists in the catalog';
      return;
    }

    if (!studentYear) {
      error = 'Please complete your profile with your year in college before adding courses';
      return;
    }

    if (!newCourse.semester || !newCourse.grade) {
      error = 'Please fill in semester and grade';
      return;
    }

    // Validate grade format
    const normalizedGrade = newCourse.grade.toUpperCase().trim();
    if (!isValidGrade(normalizedGrade)) {
      error = `Invalid grade. Valid grades are: ${VALID_GRADES.join(', ')}`;
      return;
    }

    // Check if student already has a C- or D grade and trying to add another C- or D
    // Per catalog: "may not use more than one course with grade C- or D toward departmental requirements"
    // Note: C (not C-) is allowed multiple times. F is also allowed multiple times.
    // Only restrict C- or D grades, not C or F
    if ((normalizedGrade === 'C-' || normalizedGrade === 'D+' || normalizedGrade === 'D') && hasCGradeOrBelow()) {
      error = 'You can only have at most one course with grade C- or D. You already have a C- or D grade in your academic history. Note: C grades (without the minus) and F grades are allowed multiple times.';
      return;
    }
    
    // Validate prerequisites
    const unmetPrerequisites = coursePrerequisites.filter(prereq => {
      const status = coursePrerequisiteStatus[prereq];
      return !status || !status.met;
    });

    if (unmetPrerequisites.length > 0) {
      const prereqList = unmetPrerequisites.join(', ');
      error = `Prerequisites not met: ${prereqList}. Please complete these courses before adding this course to your academic history.`;
      return;
    }
    
    // C grades (without minus) and F grades are always allowed
    // No additional validation needed for these

    const courseToAdd = {
      courseId: courseLookup.courseId,
      semester: newCourse.semester,
      grade: normalizedGrade
    };

    // Check for duplicate
    const duplicate = checkForDuplicate(courseLookup.courseId);
    if (duplicate) {
      duplicateCourse = duplicate;
      pendingCourseToAdd = courseToAdd;
      showRetakeModal = true;
      return;
    }

    // No duplicate, proceed with adding
    await proceedWithAddCourse(courseToAdd);
  }

  async function proceedWithAddCourse(courseToAdd: any, nullifyOld: boolean = false, gradeComparison: number = 0) {
    error = ''; // Clear any previous errors
    try {
    const res = await fetch('/api/student/addCompletedCourse', {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...courseToAdd,
          nullifyOldCourse: nullifyOld,
          oldCourseSemester: nullifyOld ? duplicateCourse?.semester : undefined,
          oldCourseGrade: nullifyOld ? duplicateCourse?.grade : undefined,
          gradeComparison: nullifyOld ? gradeComparison : undefined // 1 = new higher, -1 = old higher, 0 = equal
        })
      });
      
    if (res.ok) {
        // Always clear error on success - retakes are now always added
        error = '';
        await fetchStudentInfo();
        newCourse = { courseId: '', semester: '', grade: '' };
        courseLookup = null;
        lookupError = '';
        coursePrerequisites = [];
        coursePrerequisiteStatus = {};
        showAddCourse = false;
        showRetakeModal = false;
        duplicateCourse = null;
        pendingCourseToAdd = null;
    } else {
        const errorData = await res.json();
        error = errorData.error || 'Failed to add course';
        console.error('Failed to add course:', errorData);
      }
    } catch (err) {
      console.error('Error adding course:', err);
      error = 'Failed to add course. Please check your connection and try again.';
    }
  }

  function handleRetakeYes() {
    if (pendingCourseToAdd && duplicateCourse) {
      // Compare grades to determine which one to keep
      const oldGrade = duplicateCourse.grade || '';
      const newGrade = pendingCourseToAdd.grade || '';
      const comparison = compareGrades(newGrade, oldGrade);
      
      // If new grade is higher, nullify old and add new
      // If old grade is higher or equal, nullify new (don't add it) and keep old
      // But we always want to add the new attempt, so we'll:
      // - If new is higher: nullify old, add new
      // - If old is higher: nullify old, add new (but this means we're replacing with a lower grade, which is unusual but possible)
      // Actually, the user wants to keep the higher grade, so:
      // - If new is higher: nullify old, add new
      // - If old is higher: don't add new, keep old (but this means we don't record the retake)
      
      // Better approach: Always add the new course, but nullify the one with the lower grade
      // If new grade is higher or equal, nullify old
      // If old grade is higher, nullify the new one after adding (but we can't do that easily)
      
      // Simplest: Always nullify old when retaking, but we should compare and potentially warn
      // Actually, let's always nullify the lower grade. We'll determine which to nullify on the backend.
      proceedWithAddCourse(pendingCourseToAdd, true, comparison);
    }
  }

  function handleRetakeNo() {
    showRetakeModal = false;
    duplicateCourse = null;
    pendingCourseToAdd = null;
  }


  let remainingCourses = $state<any[]>([]);

  async function fetchRemainingCourses() {
    try {
      const res = await fetch('/api/courses/remaining');
      if (res.ok) {
        remainingCourses = await res.json();
      }
    } catch (err) {
      console.error('Failed to fetch remaining courses');
    }
  }

  function getRemainingCourses() {
    // Only count non-nullified courses that count toward diploma as completed
    // Include both actual academic history and potential courses
    const allCompletedCourses = [...academicHistory, ...potentialCourses];
    const completedCourseIds = allCompletedCourses
      .filter(c => {
        // Course must not be nullified and must count toward diploma (using cache)
        if (c.nullified) return false;
        
        // Check cache for accurate count (already considers grade and CS degree requirements)
        const cacheKey = `${c.courseId}_${(c.grade || '').toUpperCase().trim()}`;
        const courseCounts = courseCountsCache[cacheKey] ?? (c.countsTowardDiploma !== false);
        
        return courseCounts;
      })
      .map(c => c.courseId.toUpperCase());
    
    return remainingCourses.filter((c: any) => !completedCourseIds.includes(c.courseId.toUpperCase()));
  }

  function getNonCountingCourses() {
    // Courses that don't count: either below C grade or not in CS degree requirements
    // Include both actual and potential courses
    const allCourses = [...academicHistory, ...potentialCourses];
    return allCourses.filter(c => {
      // Check cache first for more accurate counting
      const cacheKey = `${c.courseId}_${(c.grade || '').toUpperCase().trim()}`;
      const courseCounts = courseCountsCache[cacheKey] ?? (c.countsTowardDiploma !== false);
      return !courseCounts && !c.nullified;
    });
  }

  // Search courses for potential course autocomplete
  async function searchPotentialCourses(query: string) {
    if (!query || query.trim().length === 0) {
      potentialSuggestions = [];
      showPotentialSuggestions = false;
      return;
    }

    try {
      const res = await fetch(`/api/courses/search?q=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        potentialSuggestions = data.courses || [];
        showPotentialSuggestions = potentialSuggestions.length > 0;
        selectedPotentialIndex = -1;
      }
    } catch (err) {
      console.error('Search error:', err);
      potentialSuggestions = [];
      showPotentialSuggestions = false;
    }
  }

  // Debounced search function for potential courses
  let potentialSearchTimeout: ReturnType<typeof setTimeout> | null = null;
  function handlePotentialCourseInput() {
    if (potentialSearchTimeout) clearTimeout(potentialSearchTimeout);
    
    potentialSearchTimeout = setTimeout(async () => {
      await searchPotentialCourses(newPotentialCourse.courseId);
      // Also do the lookup for exact match
      await lookupPotentialCourse();
    }, 200);
  }

  function selectPotentialCourse(course: any) {
    newPotentialCourse.courseId = course.courseId;
    potentialCourseLookup = course;
    potentialSuggestions = [];
    showPotentialSuggestions = false;
    potentialLookupError = '';
    // Fetch prerequisites when course is selected
    fetchPrerequisites(course.courseId);
  }

  async function lookupPotentialCourse() {
    if (!newPotentialCourse.courseId) {
      potentialCourseLookup = null;
      potentialLookupError = '';
      potentialPrerequisites = [];
      prerequisiteStatus = {};
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const res = await fetch(`/api/courses/lookup?number=${encodeURIComponent(newPotentialCourse.courseId)}`);
      if (res.ok) {
        potentialCourseLookup = await res.json();
        potentialLookupError = '';
        
        // Fetch prerequisites
        await fetchPrerequisites(newPotentialCourse.courseId);
      } else {
        const errorData = await res.json();
        potentialCourseLookup = null;
        potentialLookupError = errorData.error || `Course ${newPotentialCourse.courseId} does not exist in the course catalog`;
        potentialPrerequisites = [];
        prerequisiteStatus = {};
      }
    } catch (err) {
      potentialCourseLookup = null;
      potentialLookupError = 'Failed to lookup course. Please try again.';
      potentialPrerequisites = [];
      prerequisiteStatus = {};
    }
  }

  async function fetchPrerequisites(courseId: string) {
    try {
      const res = await fetch(`/api/courses/prerequisites/${encodeURIComponent(courseId)}`);
      if (res.ok) {
        const data = await res.json();
        potentialPrerequisites = data.prerequisites || [];
        checkPrerequisiteStatus();
      } else {
        potentialPrerequisites = [];
        prerequisiteStatus = {};
      }
    } catch (err) {
      console.error('Error fetching prerequisites:', err);
      potentialPrerequisites = [];
      prerequisiteStatus = {};
    }
  }

  function checkPrerequisiteStatus() {
    const status: Record<string, { met: boolean; inHistory: boolean; inPotential: boolean; semester?: string }> = {};
    
    potentialPrerequisites.forEach(prereqId => {
      const normalizedPrereq = prereqId.toUpperCase().trim();
      
      // Check if in academic history (completed)
      const inHistory = academicHistory.some(c => {
        const courseId = c.courseId?.toUpperCase().trim();
        return courseId === normalizedPrereq && !c.nullified;
      });
      
      // Check if in potential courses (planned)
      const inPotential = potentialCourses.find(c => {
        const courseId = c.courseId?.toUpperCase().trim();
        return courseId === normalizedPrereq;
      });
      
      // Check if prerequisite is met (either completed or planned in an earlier semester)
      let met = inHistory;
      let semester: string | undefined;
      
      if (inPotential) {
        semester = inPotential.semester;
        // If prerequisite is in potential courses, check if it's in an earlier semester
        if (newPotentialCourse.semester && inPotential.semester) {
          met = compareSemesters(inPotential.semester, newPotentialCourse.semester) < 0;
        } else {
          met = false; // Can't compare if semester not set
        }
      }
      
      status[prereqId] = {
        met: met || inHistory,
        inHistory,
        inPotential: !!inPotential,
        semester
      };
    });
    
    prerequisiteStatus = status;
  }

  // Compare two semesters (e.g., "Fall 2024" vs "Spring 2025")
  // Returns: -1 if sem1 < sem2, 0 if equal, 1 if sem1 > sem2
  function compareSemesters(sem1: string, sem2: string): number {
    const parseSemester = (sem: string) => {
      const parts = sem.split(' ');
      const season = parts[0].toLowerCase();
      const year = parseInt(parts[1]) || 0;
      const seasonOrder = { 'spring': 0, 'summer': 1, 'fall': 2 };
      return { year, season: seasonOrder[season as keyof typeof seasonOrder] ?? 0 };
    };
    
    const s1 = parseSemester(sem1);
    const s2 = parseSemester(sem2);
    
    if (s1.year !== s2.year) {
      return s1.year - s2.year;
    }
    return s1.season - s2.season;
  }

  async function addPotentialCourse() {
    try {
      error = ''; // Clear any previous errors
      
      if (!potentialCourseLookup) {
        error = 'Please enter a valid course number';
        return;
      }

      if (!newPotentialCourse.semester) {
        error = 'Please select a semester for this course';
        return;
      }

      // Check if already in potential courses
      const normalizedCourseId = potentialCourseLookup.courseId.toUpperCase().trim();
      if (potentialCourses.some(c => c.courseId.toUpperCase().trim() === normalizedCourseId)) {
        error = 'This course is already in your potential courses';
        return;
      }

      // Check if already in academic history
      if (academicHistory.some(c => c.courseId.toUpperCase().trim() === normalizedCourseId && !c.nullified)) {
        error = 'This course is already in your academic history';
        return;
      }

      // Validate prerequisites
      // For potential courses (roadmap planning), we allow adding courses even if prerequisites aren't met yet
      // We'll just warn the user - they can plan prerequisites in earlier semesters
      const unmetPrerequisites = potentialPrerequisites.filter(prereq => {
        const status = prerequisiteStatus[prereq];
        return !status || !status.met;
      });

      // Don't block - just warn if prerequisites aren't met
      // This allows students to plan their roadmap flexibly
      if (unmetPrerequisites.length > 0) {
        const prereqList = unmetPrerequisites.join(', ');
        // Set a warning but don't block - allow the course to be added
        console.warn(`Prerequisites not yet met: ${prereqList}. Make sure to complete these courses or add them to an earlier semester in your roadmap.`);
        // Don't return - allow adding the course anyway for planning purposes
      }

      // For potential courses, grade is optional (for planning purposes)
      // Normalize grade if provided, otherwise use "Planning"
      const normalizedGrade = newPotentialCourse.grade && newPotentialCourse.grade !== 'Planning' 
        ? newPotentialCourse.grade.toUpperCase().trim() 
        : 'Planning';

      // Only validate grade format if a specific grade is provided (not "Planning")
      if (normalizedGrade !== 'Planning' && !isValidGrade(normalizedGrade)) {
        error = `Invalid grade. Valid grades are: ${VALID_GRADES.join(', ')}, or leave as "Planning"`;
        return;
      }

      // Check C- or D grade limit only if a real grade is specified (not for "Planning")
      if (normalizedGrade !== 'Planning' && (normalizedGrade === 'C-' || normalizedGrade === 'D+' || normalizedGrade === 'D')) {
        const hasCInHistory = academicHistory.some(c => {
          const grade = c.grade?.toUpperCase().trim();
          return (grade === 'C-' || grade === 'D+' || grade === 'D') && !c.nullified;
        });
        const hasCInPotential = potentialCourses.some(c => {
          const grade = c.grade?.toUpperCase().trim();
          return grade === 'C-' || grade === 'D+' || grade === 'D';
        });
        if (hasCInHistory || hasCInPotential) {
          error = 'You can only have at most one course with grade C- or D. You already have a C- or D grade.';
          return;
        }
      }

      // Determine if counts toward diploma
      // First check if course counts toward CS degree (based on PDF requirements)
      // Then check if grade is acceptable (C or above)
      const GRADES_BELOW_C = ['C-', 'D+', 'D', 'F'];
      
      // Check with server if course counts toward CS degree
      let countsTowardCSDegree = potentialCourseLookup.required; // Default to catalog value
      try {
        const response = await fetch(`/api/courses/countsTowardDegree/${encodeURIComponent(potentialCourseLookup.courseId)}`);
        if (response.ok) {
          const data = await response.json();
          countsTowardCSDegree = data.countsTowardDegree;
        }
      } catch (err) {
        console.error('Error checking if course counts toward degree:', err);
        // Fall back to catalog value
      }
      
      // Course counts if: (1) it counts toward CS degree AND (2) grade is C or above
      // For "Planning" grade, assume it will count (optimistic planning)
      const countsTowardDiploma = normalizedGrade === 'Planning' 
        ? countsTowardCSDegree 
        : (countsTowardCSDegree && !GRADES_BELOW_C.includes(normalizedGrade));

      const potentialCourse = {
        courseId: potentialCourseLookup.courseId,
        title: potentialCourseLookup.title,
        credits: potentialCourseLookup.credits,
        grade: normalizedGrade,
        semester: newPotentialCourse.semester,
        required: potentialCourseLookup.required,
        category: potentialCourseLookup.category,
        countsTowardDiploma: countsTowardDiploma,
        prerequisites: potentialPrerequisites,
        isPotential: true // Mark as potential
      };

      potentialCourses = [...potentialCourses, potentialCourse];
      newPotentialCourse = { courseId: '', grade: 'Planning', semester: '' };
      potentialCourseLookup = null;
      potentialLookupError = '';
      potentialPrerequisites = [];
      prerequisiteStatus = {};
      error = '';
      
      // Recheck prerequisites for all potential courses
      potentialCourses.forEach(course => {
        if (course.prerequisites && course.prerequisites.length > 0) {
          // Recheck prerequisite status for all courses
          checkPrerequisiteStatus();
        }
      });
    } catch (err) {
      console.error('Error adding potential course:', err);
      error = `Failed to add course: ${err instanceof Error ? err.message : 'Unknown error'}`;
    }
  }

  function checkPrerequisiteStatusForCourse(course: any) {
    // This will be called when courses are added/removed to update prerequisite status
    // For now, we'll rely on the main checkPrerequisiteStatus function
  }

  // Derived: sorted semesters for roadmap display
  const sortedSemesters = $derived.by(() => {
    const semesters = [...new Set(potentialCourses.map(c => c.semester).filter(Boolean))];
    return semesters.sort((a, b) => {
      if (!a || !b) return 0;
      return compareSemesters(a, b);
    });
  });

  function removePotentialCourse(courseId: string) {
    potentialCourses = potentialCourses.filter(c => c.courseId !== courseId);
  }

  function clearPotentialCourses() {
    if (confirm('Are you sure you want to clear all potential courses?')) {
      potentialCourses = [];
    }
  }

  // Calculate credits and GPA that count toward degree
  function calculateCreditsAndGPA() {
    const REQUIRED_CREDITS = 120;
    
    // Grade to points mapping
    const gradeToPoints = (grade: string): number => {
      const normalizedGrade = grade.toUpperCase().trim();
      const gradePoints: { [key: string]: number } = {
        'A+': 4.0, 'A': 4.0, 'A-': 3.7,
        'B+': 3.3, 'B': 3.0, 'B-': 2.7,
        'C+': 2.3, 'C': 2.0, 'C-': 1.7,
        'D+': 1.3, 'D': 1.0, 'F': 0.0
      };
      return gradePoints[normalizedGrade] || 0.0;
    };

    // Combine academic history and potential courses
    const allCourses = [...academicHistory, ...potentialCourses];
    
    // Filter courses that count toward diploma
    // Only count courses that:
    // 1. Are not nullified
    // 2. Count toward degree (using cache or recalculated)
    // 3. Have valid grades and credits
    const coursesThatCount = allCourses.filter(course => {
      // Skip nullified courses
      if (course.nullified) return false;
      
      // Must have valid grade and credits
      if (!course.grade || !course.credits) return false;
      
      // Check if course counts toward diploma using cache
      const cacheKey = `${course.courseId}_${(course.grade || '').toUpperCase().trim()}`;
      const countsTowardDiploma = courseCountsCache[cacheKey] ?? (course.countsTowardDiploma !== false);
      
      return countsTowardDiploma;
    });

    // Calculate credits and GPA
    let totalCredits = 0;
    let totalGradePoints = 0;
    let totalCreditsForGPA = 0;

    coursesThatCount.forEach(course => {
      const courseCredits = course.credits || 0;
      const gradePoints = gradeToPoints(course.grade || 'F');
      
      totalCredits += courseCredits;
      totalGradePoints += gradePoints * courseCredits;
      totalCreditsForGPA += courseCredits;
    });

    // Cap credits at 120 (required for degree)
    const creditsEarned = Math.min(totalCredits, REQUIRED_CREDITS);
    
    // Calculate GPA (only for courses that count)
    const gpa = totalCreditsForGPA > 0 
      ? totalGradePoints / totalCreditsForGPA 
      : 0.0;

    // Calculate credits in progress from current schedule
    let creditsInProgress = 0;
    if (currentSchedule && Array.isArray(currentSchedule)) {
      currentSchedule.forEach(course => {
        if (course.credits && typeof course.credits === 'number') {
          creditsInProgress += course.credits;
        }
      });
    }

    // Calculate progress percentage
    const progress = REQUIRED_CREDITS > 0 
      ? Math.min(Math.round((creditsEarned / REQUIRED_CREDITS) * 100), 100)
      : 0;

    return {
      earned: Math.round(creditsEarned * 100) / 100,
      inProgress: creditsInProgress,
      requiredForDegree: REQUIRED_CREDITS,
      gpa: Math.round(gpa * 100) / 100,
      progress: progress
    };
  }

  // Reactive calculation that updates when academic history, potential courses, or current schedule change
  const calculatedCredits = $derived.by(() => {
    try {
      return calculateCreditsAndGPA();
    } catch (err) {
      console.error('Error calculating credits:', err);
      return {
        earned: 0,
        inProgress: 0,
        requiredForDegree: 120,
        gpa: 0.0,
        progress: 0
      };
    }
  });

  async function deleteCourse(course: any) {
    if (!confirm(`Are you sure you want to remove ${course.courseId} - ${course.title}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/student/deleteCourse', {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.courseId,
          semester: course.semester,
          grade: course.grade
        })
      });

    if (res.ok) {
        await fetchStudentInfo();
        error = '';
    } else {
        const errorData = await res.json();
        error = errorData.error || 'Failed to delete course';
      }
    } catch (err) {
      error = 'Failed to delete course';
      console.error(err);
    }
  }

  onMount(fetchStudentInfo);
</script>

<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  .dashboard {
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
    padding: 2.5rem 2rem;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  .container {
    max-width: 1400px;
    margin: 0 auto;
  }
  
  .header {
    background: white;
    border-radius: 20px;
    padding: 3rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.04);
  }
  
  .header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a202c;
    margin-bottom: 0.5rem;
    letter-spacing: -0.03em;
  }
  
  .header p {
    color: #64748b;
    font-size: 1.125rem;
    font-weight: 400;
  }
  
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .card {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.06);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid #e2e8f0;
  }
  
  .card-header h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1a202c;
    letter-spacing: -0.02em;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 12px;
    font-weight: 500;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
  
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
  }
  
  .btn-secondary {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
  }
  
  .btn-secondary:hover {
    background: #e2e8f0;
    border-color: #cbd5e0;
  }
  
  .btn-danger {
    background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(245, 101, 101, 0.3);
  }
  
  .btn-danger:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(245, 101, 101, 0.4);
  }
  
  .stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
  }
  
  .stat-label {
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .stat-value {
    color: #1a202c;
    font-size: 2.25rem;
    font-weight: 700;
    letter-spacing: -0.03em;
  }
  
  .course-item {
    padding: 1.5rem;
    background: #f8fafc;
    border-radius: 12px;
    margin-bottom: 0.75rem;
    border-left: 4px solid #667eea;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s ease;
    border: 1px solid #e2e8f0;
  }
  
  .course-item:hover {
    background: #f1f5f9;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
  
  .course-item.non-counting {
    border-left-color: #f59e0b;
    background: #fffbeb;
  }

  .course-item.nullified {
    border-left-color: #dc2626;
    background: #fef2f2;
    opacity: 0.7;
  }

  .course-item.nullified .course-code,
  .course-item.nullified .course-title {
    text-decoration: line-through;
    color: #9ca3af;
  }
  
  .course-code {
    font-weight: 600;
    color: #1a202c;
    font-size: 1.0625rem;
    margin-bottom: 0.375rem;
    letter-spacing: -0.01em;
  }
  
  .course-title {
    color: #475569;
    font-size: 0.9375rem;
    margin-bottom: 0.375rem;
    line-height: 1.6;
  }
  
  .course-meta {
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 400;
  }
  
  .empty-state {
    text-align: center;
    padding: 4rem 1rem;
    color: #94a3b8;
  }
  
  .empty-state-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.4;
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal {
    background: white;
    border-radius: 24px;
    padding: 2.5rem;
    max-width: 540px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .modal h2 {
    font-size: 1.875rem;
    font-weight: 700;
    color: #1a202c;
    margin-bottom: 2rem;
    letter-spacing: -0.02em;
  }
  
  .autocomplete-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    margin-top: 0.25rem;
  }

  .autocomplete-item {
    padding: 0.75rem 1rem;
    cursor: pointer;
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.15s ease;
  }

  .autocomplete-item:last-child {
    border-bottom: none;
  }

  .autocomplete-item:hover,
  .autocomplete-item.selected {
    background-color: #f0f9ff;
  }

  .autocomplete-course-id {
    font-weight: 600;
    color: #1a202c;
    font-size: 0.9375rem;
    margin-bottom: 0.25rem;
  }

  .autocomplete-course-title {
    color: #475569;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .autocomplete-course-meta {
    color: #64748b;
    font-size: 0.75rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    display: block;
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
    margin-bottom: 0.625rem;
  }
  
  .form-group input {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 0.9375rem;
    font-family: inherit;
    transition: all 0.2s ease;
    background: white;
    color: #1a202c;
  }
  
  .form-group input::placeholder {
    color: #94a3b8;
  }
  
  .form-group input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  }

  .form-group select {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 0.9375rem;
    font-family: inherit;
    transition: all 0.2s ease;
    background: white;
    color: #1a202c;
    cursor: pointer;
  }

  .form-group select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  }

  .form-group select option {
    background: white;
    color: #1a202c;
    padding: 0.5rem;
  }

  .profile-prompt {
    background: #fffbeb;
    border: 2px solid #fde68a;
    border-radius: 12px;
    padding: 1rem;
    margin-top: 0.5rem;
  }

  .profile-prompt p {
    margin: 0;
    color: #92400e;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .profile-link {
    color: #667eea;
    font-weight: 600;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .profile-link:hover {
    color: #764ba2;
    text-decoration: underline;
  }

  .retake-info {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: #f8fafc;
    border-radius: 12px;
    border-left: 4px solid #667eea;
  }

  .retake-info p {
    margin: 0 0 1rem 0;
    color: #1a202c;
    font-size: 0.9375rem;
    line-height: 1.6;
  }

  .retake-info p:last-child {
    margin-bottom: 0;
    font-weight: 600;
    color: #475569;
  }

  .retake-info strong {
    color: #1a202c;
    font-weight: 600;
  }

  .retake-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }
  
  .course-info {
    background: linear-gradient(135deg, #eef2ff 0%, #e9d5ff 100%);
    border: 2px solid #c7d2fe;
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1.25rem;
  }
  
  .course-info h3 {
    font-size: 1.0625rem;
    font-weight: 600;
    color: #4c1d95;
    margin-bottom: 0.375rem;
  }
  
  .course-info p {
    font-size: 0.875rem;
    color: #6b21a8;
  }
  
  .error-msg {
    background: #fef2f2;
    border: 2px solid #fecaca;
    color: #991b1b;
    padding: 1rem;
    border-radius: 12px;
    font-size: 0.875rem;
    margin-bottom: 1.25rem;
  }
  
  .form-actions {
    display: flex;
    gap: 0.875rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }
  
  .loading {
    text-align: center;
    padding: 5rem;
    color: #64748b;
    font-size: 1.125rem;
  }
  
  .section {
    background: white;
    border-radius: 20px;
    padding: 2.5rem;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.04);
    margin-bottom: 1.5rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .section:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  }

  /* Chatbot Styles */
  .chatbot-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
  }

  .chatbot-toggle {
    background-color: #4DB6AC;
    color: white;
    border: none;
    border-radius: 50px;
    padding: 16px 32px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    min-width: 120px;
  }

  .chatbot-toggle:hover {
    background-color: #43A19A;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .chatbot-window {
    position: absolute;
    bottom: 70px;
    right: 0;
    width: 380px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .chatbot-header {
    background: linear-gradient(135deg, #4DB6AC, #43A19A);
    color: white;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .chatbot-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .chatbot-close {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s;
  }

  .chatbot-close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .chatbot-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #f8f9fa;
  }

  .chatbot-welcome {
    text-align: center;
    color: #666;
    padding: 20px;
  }

  .chatbot-welcome p {
    margin: 8px 0;
  }

  .chatbot-message {
    display: flex;
    margin-bottom: 8px;
  }

  .chatbot-message.user {
    justify-content: flex-end;
  }

  .chatbot-message.assistant {
    justify-content: flex-start;
  }

  .message-content {
    max-width: 75%;
    padding: 10px 14px;
    border-radius: 12px;
    word-wrap: break-word;
    white-space: pre-wrap;
  }

  .chatbot-message.user .message-content {
    background: #4DB6AC;
    color: white;
    border-bottom-right-radius: 4px;
  }

  .chatbot-message.assistant .message-content {
    background: white;
    color: #333;
    border: 1px solid #e0e0e0;
    border-bottom-left-radius: 4px;
  }

  .typing-indicator {
    font-style: italic;
    color: #999;
  }

  .chatbot-input-container {
    padding: 16px;
    border-top: 1px solid #e0e0e0;
    background: white;
  }

  .chatbot-input-container form {
    display: flex;
    gap: 8px;
  }

  .chatbot-input {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #e0e0e0;
    border-radius: 20px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }

  .chatbot-input:focus {
    border-color: #4DB6AC;
  }

  .chatbot-input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .chatbot-send {
    padding: 10px 20px;
    background: #4DB6AC;
    color: white;
    border: none;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .chatbot-send:hover:not(:disabled) {
    background: #43A19A;
  }

  .chatbot-send:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  /* Scrollbar styling */
  .chatbot-messages::-webkit-scrollbar {
    width: 6px;
  }

  .chatbot-messages::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .chatbot-messages::-webkit-scrollbar-thumb {
    background: #4DB6AC;
    border-radius: 3px;
  }

  .chatbot-messages::-webkit-scrollbar-thumb:hover {
    background: #43A19A;
  }
</style>

<div class="dashboard">
  <div class="container">
    {#if loading}
      <div class="loading">Loading your dashboard...</div>
    {:else}
      <!-- Header -->
      <div class="header">
        <h1>Welcome back, {profile.name || 'Student'}</h1>
        <p>{profile.major || 'Major not set'} • {email || 'Email not set'}</p>
      </div>

      {#if error}
        <div class="error-msg">{error}</div>
      {/if}

      <!-- Stats Grid -->
      <div class="grid">
        <div class="card">
          <div class="stat">
            <span class="stat-label">Credits Earned</span>
            <span class="stat-value">{calculatedCredits.earned}</span>
            {#if potentialCourses.length > 0}
              <span style="font-size: 0.75rem; color: #3b82f6; margin-top: 0.25rem; display: block; font-weight: 400;">
                (includes {potentialCourses.length} potential)
              </span>
            {/if}
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <span class="stat-label">Credits In Progress</span>
            <span class="stat-value">{calculatedCredits.inProgress}</span>
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <span class="stat-label">GPA</span>
            <span class="stat-value">{(calculatedCredits.gpa || 0).toFixed(2)}</span>
            {#if potentialCourses.length > 0}
              <span style="font-size: 0.75rem; color: #3b82f6; margin-top: 0.25rem; display: block; font-weight: 400;">
                (with potential)
              </span>
            {/if}
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <span class="stat-label">Progress</span>
            <span class="stat-value">
              {calculatedCredits.progress}%
            </span>
            {#if potentialCourses.length > 0}
              <span style="font-size: 0.75rem; color: #3b82f6; margin-top: 0.25rem; display: block; font-weight: 400;">
                (with potential)
              </span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Profile Section -->
      <div class="section">
        <div class="card-header">
          <h2>Profile Information</h2>
          <button class="btn btn-secondary" on:click={() => goto('/profile')}>Edit Profile</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem;">
          <div>
            <div style="color: #64748b; font-size: 0.8125rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">GMU ID</div>
            <div style="color: #1a202c; font-weight: 600; font-size: 1.25rem;">{profile.gmuId || 'Not set'}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 0.8125rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">Major</div>
            <div style="color: #1a202c; font-weight: 600; font-size: 1.25rem;">{profile.major || 'Not set'}</div>
          </div>
          <div>
            <div style="color: #64748b; font-size: 0.8125rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">Year</div>
            <div style="color: #1a202c; font-weight: 600; font-size: 1.25rem;">
              {#if studentYear === 1}
                Freshman
              {:else if studentYear === 2}
                Sophomore
              {:else if studentYear === 3}
                Junior
              {:else if studentYear === 4}
                Senior
              {:else if studentYear}
                Year {studentYear}
              {:else}
                Not set
              {/if}
            </div>
          </div>
          {#if profile.minor}
            <div>
              <div style="color: #64748b; font-size: 0.8125rem; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500;">Minor</div>
              <div style="color: #1a202c; font-weight: 600; font-size: 1.25rem;">{profile.minor}</div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Academic History -->
      <div class="section">
        <div class="card-header">
<h2>Academic History</h2>
          <button class="btn btn-primary" on:click={() => showAddCourse = true}>Add Course</button>
        </div>
        {#if academicHistory.length > 0}
  {#each academicHistory as course}
            {@const cacheKey = `${course.courseId}_${(course.grade || '').toUpperCase().trim()}`}
            {@const courseCounts = course.nullified ? false : (courseCountsCache[cacheKey] ?? true)}
            <div class="course-item" class:non-counting={!courseCounts} class:nullified={course.nullified}>
              <div style="flex: 1;">
                <div class="course-code">{course.courseId || 'N/A'}</div>
                <div class="course-title">{course.title || 'N/A'}</div>
                <div class="course-meta">
                  {course.semester || 'N/A'} • {course.credits || 0} credits • Grade: {course.grade || 'N/A'}
                  {#if course.nullified}
                    <span style="color: #dc2626; margin-left: 0.5rem; font-weight: 500;">(Nullified - Retaken)</span>
                  {:else if !courseCounts}
                    <span style="color: #d97706; margin-left: 0.5rem; font-weight: 500;">(Does not count toward degree)</span>
                  {/if}
                </div>
              </div>
              <button class="btn btn-danger" on:click={() => deleteCourse(course)} style="margin-left: 1rem;">Remove</button>
            </div>
  {/each}
        {:else}
          <div class="empty-state">
            <div class="empty-state-icon">📚</div>
            <p>No completed courses yet</p>
          </div>
        {/if}
      </div>

      <!-- Potential Courses Section -->
      <div class="section">
        <div class="card-header">
          <h2>Potential Courses (Temporary)</h2>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-secondary" on:click={() => showPotentialCourses = !showPotentialCourses}>
              {showPotentialCourses ? 'Hide' : 'Show'} Potential Courses
            </button>
            {#if potentialCourses.length > 0}
              <button class="btn btn-danger" on:click={clearPotentialCourses}>Clear All</button>
            {/if}
          </div>
        </div>
        
        {#if showPotentialCourses}
          <div style="margin-bottom: 1.5rem; padding: 1.5rem; background: #f0f9ff; border-radius: 12px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0 0 1rem 0; color: #1e40af; font-size: 0.875rem;">
              💡 <strong>Potential Courses</strong> let you see how taking certain classes would affect your degree progress. These are temporary and won't be saved to your academic history.
            </p>
            
            <div style="display: flex; gap: 1rem; align-items: flex-end;">
              <div style="flex: 1; position: relative;">
                <label for="potential-course-number" style="display: block; font-weight: 500; color: #374151; font-size: 0.875rem; margin-bottom: 0.5rem;">Course Number</label>
                <input 
                  id="potential-course-number"
                  type="text" 
                  placeholder="e.g., CS 310"
                  bind:value={newPotentialCourse.courseId}
                  on:input={handlePotentialCourseInput}
                  on:focus={() => {
                    if (newPotentialCourse.courseId && potentialSuggestions.length > 0) {
                      showPotentialSuggestions = true;
                    }
                  }}
                  on:blur={() => {
                    setTimeout(() => {
                      showPotentialSuggestions = false;
                    }, 200);
                  }}
                  on:keydown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      selectedPotentialIndex = Math.min(selectedPotentialIndex + 1, potentialSuggestions.length - 1);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      selectedPotentialIndex = Math.max(selectedPotentialIndex - 1, -1);
                    } else if (e.key === 'Enter' && selectedPotentialIndex >= 0) {
                      e.preventDefault();
                      selectPotentialCourse(potentialSuggestions[selectedPotentialIndex]);
                    } else if (e.key === 'Escape') {
                      showPotentialSuggestions = false;
                    }
                  }}
                  autocomplete="off"
                  style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 0.9375rem;"
                />
                
                {#if showPotentialSuggestions && potentialSuggestions.length > 0}
                  <div class="autocomplete-dropdown" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 1000;">
                    {#each potentialSuggestions as course, index}
                      <div 
                        class="autocomplete-item"
                        class:selected={index === selectedPotentialIndex}
                        on:click={() => selectPotentialCourse(course)}
                        on:mouseenter={() => selectedPotentialIndex = index}
                      >
                        <div class="autocomplete-course-id">{course.courseId}</div>
                        <div class="autocomplete-course-title">{course.title}</div>
                        <div class="autocomplete-course-meta">
                          {course.credits} credits • {course.required ? 'Required' : 'Elective'}
                        </div>
                      </div>
  {/each}
                  </div>
                {/if}
              </div>
              <div style="width: 180px;">
                <label for="potential-semester" style="display: block; font-weight: 500; color: #374151; font-size: 0.875rem; margin-bottom: 0.5rem;">Semester</label>
                {#if !studentYear}
                  <div class="profile-prompt">
                    <p>Please complete your profile with your year in college to plan semesters.</p>
                    <a href="/profile" class="profile-link">Complete Profile →</a>
                  </div>
                {:else}
                  <select 
                    id="potential-semester"
                    bind:value={newPotentialCourse.semester}
                    on:change={() => checkPrerequisiteStatus()}
                    style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 0.9375rem;"
                  >
                    <option value="">Select Semester</option>
                    {#each getAvailableSemesters() as semester}
                      <option value={semester}>{semester}</option>
                    {/each}
                  </select>
                {/if}
              </div>
              <div style="width: 140px;">
                <label for="potential-grade" style="display: block; font-weight: 500; color: #374151; font-size: 0.875rem; margin-bottom: 0.5rem;">Grade (Optional)</label>
                <select 
                  id="potential-grade"
                  bind:value={newPotentialCourse.grade}
                  style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 0.9375rem;"
                >
                  <option value="Planning">Planning</option>
                  {#each VALID_GRADES as grade}
                    <option value={grade}>{grade}</option>
                  {/each}
                </select>
              </div>
              <button class="btn btn-primary" on:click={addPotentialCourse} disabled={!potentialCourseLookup || !newPotentialCourse.semester}>
                Add to Roadmap
              </button>
            </div>
            
            {#if potentialPrerequisites.length > 0}
              <div style="margin-top: 1.5rem; padding: 1rem; background: white; border-radius: 12px; border: 2px solid #e2e8f0;">
                <div style="font-weight: 600; color: #1a202c; margin-bottom: 0.75rem; font-size: 0.9375rem;">Prerequisites:</div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  {#each potentialPrerequisites as prereq}
                    {@const status = prerequisiteStatus[prereq]}
                    <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: {status?.met ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px; border-left: 3px solid {status?.met ? '#10b981' : '#ef4444'};">
                      <span style="font-size: 1.125rem;">{status?.met ? '✓' : '✗'}</span>
                      <span style="font-weight: 500; color: #1a202c;">{prereq}</span>
                      {#if status?.inHistory}
                        <span style="font-size: 0.75rem; color: #059669; margin-left: auto;">(Completed)</span>
                      {:else if status?.inPotential}
                        <span style="font-size: 0.75rem; color: #3b82f6; margin-left: auto;">(Planned: {status.semester || 'TBD'})</span>
                        {#if status.semester && newPotentialCourse.semester && compareSemesters(status.semester, newPotentialCourse.semester) >= 0}
                          <span style="font-size: 0.75rem; color: #dc2626; font-weight: 600;">⚠️ Must be earlier</span>
                        {/if}
                      {:else}
                        <span style="font-size: 0.75rem; color: #dc2626; margin-left: auto;">(Not met)</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if potentialLookupError}
              <div class="error-msg" style="margin-top: 1rem;">{potentialLookupError}</div>
            {/if}

            {#if potentialCourseLookup}
              <div class="course-info" style="margin-top: 1rem;">
                <h3>{potentialCourseLookup.courseId} - {potentialCourseLookup.title}</h3>
                <p>{potentialCourseLookup.credits} credits • {potentialCourseLookup.required ? 'Required' : 'Elective'}</p>
              </div>
            {/if}
          </div>

          {#if potentialCourses.length > 0}
            <div style="margin-top: 1.5rem;">
              <h3 style="font-size: 1.125rem; font-weight: 600; color: #1a202c; margin-bottom: 1rem;">📅 Your Roadmap:</h3>
              
              {#each sortedSemesters as semester}
                {@const semesterCourses = potentialCourses.filter(c => c.semester === semester)}
                <div style="margin-bottom: 2rem; padding: 1.5rem; background: #f8fafc; border-radius: 12px; border-left: 4px solid #3b82f6;">
                  <h4 style="font-size: 1rem; font-weight: 600; color: #1a202c; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>📆</span>
                    <span>{semester}</span>
                    <span style="font-size: 0.875rem; font-weight: 400; color: #64748b;">
                      ({semesterCourses.length} course{semesterCourses.length !== 1 ? 's' : ''})
                    </span>
                  </h4>
                  {#each semesterCourses as course}
                    <div class="course-item" style="border-left-color: #3b82f6; background: white; margin-bottom: 0.75rem;">
                      <div style="flex: 1;">
                        <div class="course-code">{course.courseId}</div>
                        <div class="course-title">{course.title}</div>
                        <div class="course-meta">
                          {course.credits} credits • Grade: {course.grade === 'Planning' ? 'TBD' : course.grade}
                          <span style="color: #3b82f6; margin-left: 0.5rem; font-weight: 500;">(Planned)</span>
                          {#if !course.countsTowardDiploma}
                            <span style="color: #d97706; margin-left: 0.5rem; font-weight: 500;">(Does not count toward degree)</span>
                          {/if}
                        </div>
                        {#if course.prerequisites && course.prerequisites.length > 0}
                          <div style="margin-top: 0.5rem; font-size: 0.75rem; color: #64748b;">
                            <strong>Prerequisites:</strong> {course.prerequisites.join(', ')}
                          </div>
                        {/if}
                      </div>
                      <button class="btn btn-danger" on:click={() => removePotentialCourse(course.courseId)} style="margin-left: 1rem;">Remove</button>
                    </div>
  {/each}
                </div>
              {/each}
              
              {#if potentialCourses.some(c => !c.semester)}
                <div style="margin-top: 1.5rem; padding: 1rem; background: #fffbeb; border-radius: 12px; border-left: 4px solid #f59e0b;">
                  <h4 style="font-size: 0.9375rem; font-weight: 600; color: #92400e; margin-bottom: 0.75rem;">⚠️ Courses without semester:</h4>
                  {#each potentialCourses.filter(c => !c.semester) as course}
                    <div class="course-item" style="border-left-color: #f59e0b; background: white; margin-bottom: 0.5rem;">
                      <div style="flex: 1;">
                        <div class="course-code">{course.courseId}</div>
                        <div class="course-title">{course.title}</div>
                      </div>
                      <button class="btn btn-danger" on:click={() => removePotentialCourse(course.courseId)} style="margin-left: 1rem;">Remove</button>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {:else}
            <div class="empty-state">
              <p>No potential courses added yet. Add courses above to create your semester roadmap.</p>
            </div>
          {/if}
        {:else}
          <p style="color: #64748b; font-size: 0.875rem; text-align: center; padding: 1rem;">
            Click "Show Potential Courses" to add temporary courses and see their impact on your degree progress.
          </p>
        {/if}
      </div>

      <!-- Remaining Required Courses -->
      <div class="section">
        <div class="card-header">
          <h2>Remaining Required Courses</h2>
        </div>
        {#if getRemainingCourses().length > 0}
          {#each getRemainingCourses() as course}
            <div class="course-item">
              <div class="course-code">{course.courseId}</div>
              <div class="course-title">{course.title}</div>
              <div class="course-meta">{course.credits} credits</div>
            </div>
  {/each}
        {:else}
          <div class="empty-state">
            <p>All required courses completed! 🎉</p>
          </div>
        {/if}
      </div>

      <!-- Add Course Modal -->
      {#if showAddCourse}
        <div 
          class="modal-overlay" 
          role="button"
          tabindex="0"
          on:click={() => showAddCourse = false}
          on:keydown={(e) => e.key === 'Escape' && (showAddCourse = false)}
          aria-label="Close modal"
        >
          <div 
            class="modal" 
            on:click|stopPropagation
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabindex="0"
            on:keydown={(e) => e.key === 'Escape' && (showAddCourse = false)}
          >
            <h2 id="modal-title">Add Completed Course</h2>
            
            <div class="form-group" style="position: relative;">
              <label for="course-number">Course Number</label>
              <input 
                id="course-number"
                type="text" 
                placeholder="e.g., CS 310"
                bind:value={newCourse.courseId}
                on:input={handleCourseInput}
                on:focus={() => {
                  if (newCourse.courseId && courseSuggestions.length > 0) {
                    showSuggestions = true;
                  }
                }}
                on:blur={() => {
                  // Delay hiding to allow click on suggestion
                  setTimeout(() => {
                    showSuggestions = false;
                  }, 200);
                }}
                on:keydown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, courseSuggestions.length - 1);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                  } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    selectCourse(courseSuggestions[selectedSuggestionIndex]);
                  } else if (e.key === 'Escape') {
                    showSuggestions = false;
                  }
                }}
                autocomplete="off"
              />
              
              {#if showSuggestions && courseSuggestions.length > 0}
                <div class="autocomplete-dropdown">
                  {#each courseSuggestions as course, index}
                    <div 
                      class="autocomplete-item"
                      class:selected={index === selectedSuggestionIndex}
                      on:click={() => selectCourse(course)}
                      on:mouseenter={() => selectedSuggestionIndex = index}
                    >
                      <div class="autocomplete-course-id">{course.courseId}</div>
                      <div class="autocomplete-course-title">{course.title}</div>
                      <div class="autocomplete-course-meta">
                        {course.credits} credits • {course.required ? 'Required' : 'Elective'}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            {#if lookupError}
              <div class="error-msg">{lookupError}</div>
            {/if}

            {#if courseLookup}
              <div class="course-info">
                <h3>{courseLookup.courseId} - {courseLookup.title}</h3>
                <p>{courseLookup.credits} credits • {courseLookup.required ? 'Required' : 'Elective'}</p>
              </div>

              {#if coursePrerequisites.length > 0}
                <div style="margin-top: 1.5rem; padding: 1rem; background: white; border-radius: 12px; border: 2px solid #e2e8f0;">
                  <div style="font-weight: 600; color: #1a202c; margin-bottom: 0.75rem; font-size: 0.9375rem;">Prerequisites:</div>
                  <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    {#each coursePrerequisites as prereq}
                      {@const status = coursePrerequisiteStatus[prereq]}
                      <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: {status?.met ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px; border-left: 3px solid {status?.met ? '#10b981' : '#ef4444'};">
                        <span style="font-size: 1.125rem;">{status?.met ? '✓' : '✗'}</span>
                        <span style="font-weight: 500; color: #1a202c;">{prereq}</span>
                        {#if status?.met}
                          <span style="font-size: 0.75rem; color: #059669; margin-left: auto;">(Completed)</span>
                        {:else}
                          <span style="font-size: 0.75rem; color: #dc2626; margin-left: auto;">(Not met)</span>
                        {/if}
                      </div>
                    {/each}
                  </div>
                  {#if coursePrerequisites.some(prereq => !coursePrerequisiteStatus[prereq]?.met)}
                    <div style="margin-top: 0.75rem; padding: 0.75rem; background: #fffbeb; border-radius: 8px; border-left: 3px solid #f59e0b;">
                      <p style="margin: 0; font-size: 0.875rem; color: #92400e;">
                        ⚠️ You must complete all prerequisites before adding this course to your academic history.
                      </p>
                    </div>
                  {/if}
                </div>
              {/if}

              <div class="form-group">
                <label for="semester">Semester</label>
                {#if !studentYear}
                  <div class="profile-prompt">
                    <p>⚠️ Please complete your profile to add courses. <a href="/profile" class="profile-link">Update Profile</a></p>
                  </div>
                {:else}
                  <select 
                    id="semester"
                    bind:value={newCourse.semester}
                    required
                  >
                    <option value="">Select semester</option>
                    {#each getAvailableSemesters() as semester}
                      <option value={semester}>{semester}</option>
  {/each}
                  </select>
                {/if}
              </div>

              <div class="form-group">
                <label for="grade">Grade</label>
                <input 
                  id="grade"
                  type="text" 
                  placeholder="e.g., A, B+, C (Valid: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, F)"
                  bind:value={newCourse.grade}
                  on:input={(e) => {
                    // Auto-uppercase the grade
                    newCourse.grade = e.currentTarget.value.toUpperCase();
                  }}
                />
                <small style="color: #64748b; font-size: 0.75rem; margin-top: 0.25rem; display: block;">
                  Valid grades: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, F. Grades below C (C-, D+, D, F) do not count toward diploma. You can have at most one course with grade C- or D. <strong>C grades (without minus) and F grades can be added multiple times.</strong>
                </small>
              </div>
            {/if}

            <div class="form-actions">
              <button 
                class="btn btn-primary" 
                on:click={addCompletedCourse} 
                disabled={!courseLookup || !newCourse.semester || !newCourse.grade || coursePrerequisites.some(prereq => !coursePrerequisiteStatus[prereq]?.met)}
              >
                Add Course
              </button>
              <button class="btn btn-secondary" on:click={() => {
                showAddCourse = false;
                newCourse = { courseId: '', semester: '', grade: '' };
                courseLookup = null;
                lookupError = '';
                coursePrerequisites = [];
                coursePrerequisiteStatus = {};
                error = '';
              }}>Cancel</button>
            </div>
          </div>
        </div>
      {/if}

      <!-- Retake Confirmation Modal -->
      {#if showRetakeModal && duplicateCourse}
        <div 
          class="modal-overlay" 
          role="button"
          tabindex="0"
          on:click={handleRetakeNo}
          on:keydown={(e) => e.key === 'Escape' && handleRetakeNo()}
          aria-label="Close modal"
        >
          <div 
            class="modal" 
            on:click|stopPropagation
            role="dialog"
            aria-modal="true"
            aria-labelledby="retake-modal-title"
            tabindex="0"
            on:keydown={(e) => e.key === 'Escape' && handleRetakeNo()}
          >
            <h2 id="retake-modal-title">Duplicate Course Detected</h2>
            
            <div class="retake-info">
              <p>You've already taken <strong>{duplicateCourse.courseId} - {duplicateCourse.title}</strong> in <strong>{duplicateCourse.semester}</strong> with a grade of <strong>{duplicateCourse.grade}</strong>.</p>
              <p>You're now adding this course with a grade of <strong>{pendingCourseToAdd?.grade || 'N/A'}</strong>.</p>
              {#if pendingCourseToAdd && duplicateCourse}
                {@const oldGrade = duplicateCourse.grade || ''}
                {@const newGrade = pendingCourseToAdd.grade || ''}
                {@const comparison = compareGrades(newGrade, oldGrade)}
                {@const oldBelowC = isGradeBelowC(oldGrade)}
                {@const newBelowC = isGradeBelowC(newGrade)}
                
                {#if oldBelowC}
                  <p style="color: #059669; font-weight: 500; margin-top: 0.5rem;">
                    ✓ Your previous grade ({oldGrade}) is below C, so it will be nullified and the new grade ({newGrade}) will be kept.
                  </p>
                {:else if newBelowC && !oldBelowC}
                  <p style="color: #f59e0b; font-weight: 500; margin-top: 0.5rem;">
                    ⚠️ Your new grade ({newGrade}) is below C, but your previous grade ({oldGrade}) is C or above. The retake will be recorded, but only your previous grade ({oldGrade}) will count toward your degree.
                  </p>
                {:else if comparison > 0}
                  <p style="color: #059669; font-weight: 500; margin-top: 0.5rem;">
                    ✓ Your new grade ({newGrade}) is higher than your previous grade ({oldGrade}). The previous grade will be nullified and the new grade will be kept.
                  </p>
                {:else if comparison < 0}
                  <p style="color: #f59e0b; font-weight: 500; margin-top: 0.5rem;">
                    ⚠️ Your previous grade ({oldGrade}) is higher than your new grade ({newGrade}). The retake will be recorded, but only your previous grade ({oldGrade}) will count toward your degree.
                  </p>
                {:else}
                  <p style="color: #64748b; font-weight: 500; margin-top: 0.5rem;">
                    Your new grade ({newGrade}) is the same as your previous grade ({oldGrade}). The previous grade will be nullified and the new grade will be kept.
                  </p>
                {/if}
              {/if}
              <p style="margin-top: 1rem;">Are you retaking this course?</p>
            </div>

            <div class="retake-actions">
              <button class="btn btn-primary" on:click={handleRetakeYes}>
                Yes, I'm retaking it
              </button>
              <button class="btn btn-secondary" on:click={handleRetakeNo}>
                No, cancel
              </button>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Chatbot Component - Bottom Right -->
  <div class="chatbot-container">
    {#if chatbotOpen}
      <div class="chatbot-window">
        <div class="chatbot-header">
          <h3>Academic Advisor Chatbot</h3>
          <button class="chatbot-close" on:click={toggleChatbot}>×</button>
        </div>
        <div class="chatbot-messages">
          {#if chatbotHistory.length === 0}
            <div class="chatbot-welcome">
              <p>👋 Hi! I'm your GMU academic advisor chatbot.</p>
              <p>Ask me about courses, scheduling, or degree requirements!</p>
            </div>
          {/if}
          {#each chatbotHistory as msg}
            <div class="chatbot-message {msg.role}">
              <div class="message-content">
                {msg.content}
              </div>
            </div>
  {/each}
          {#if chatbotLoading}
            <div class="chatbot-message assistant">
              <div class="message-content">
                <span class="typing-indicator">Thinking...</span>
              </div>
            </div>
          {/if}
        </div>
        <div class="chatbot-input-container">
          <form on:submit|preventDefault={sendChatbotMessage}>
            <input
              type="text"
              bind:value={chatbotMessage}
              placeholder="Ask about courses, schedules, or requirements..."
              disabled={chatbotLoading}
              class="chatbot-input"
            />
            <button type="submit" disabled={chatbotLoading || !chatbotMessage.trim()} class="chatbot-send">
              Send
            </button>
          </form>
        </div>
      </div>
    {/if}
    <button class="chatbot-toggle" on:click={toggleChatbot}>
      {#if chatbotOpen}
        ×
      {:else}
        💬 Chat
      {/if}
    </button>
  </div>
</div>
