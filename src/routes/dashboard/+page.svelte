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

  // Potential courses (temporary)
  let potentialCourses = $state<any[]>([]);
  let showPotentialCourses = $state(false);
  let newPotentialCourse = $state({ courseId: '', grade: 'A' });
  let potentialCourseLookup = $state<any>(null);
  let potentialLookupError = $state('');

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

  async function lookupCourse() {
    if (!newCourse.courseId) {
      courseLookup = null;
      lookupError = '';
      return;
    }

    // Add a small delay to avoid too many requests while typing
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check if courseId changed during the delay
    if (!newCourse.courseId) {
      courseLookup = null;
      lookupError = '';
      return;
    }

    try {
      const res = await fetch(`/api/courses/lookup?number=${encodeURIComponent(newCourse.courseId)}`);
      if (res.ok) {
        const data = await res.json();
        courseLookup = data;
        lookupError = '';
      } else {
        const errorData = await res.json();
        courseLookup = null;
        lookupError = errorData.error || `Course ${newCourse.courseId} does not exist in the course catalog`;
      }
    } catch (err) {
      console.error('Lookup error:', err);
      courseLookup = null;
      lookupError = 'Failed to lookup course. Please try again.';
    }
  }

  const VALID_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];
  const GRADES_BELOW_C = ['C-', 'D+', 'D', 'F'];

  function isValidGrade(grade: string): boolean {
    return VALID_GRADES.includes(grade.toUpperCase().trim());
  }

  function isGradeBelowC(grade: string): boolean {
    return GRADES_BELOW_C.includes(grade.toUpperCase().trim());
  }

  function hasCGrade(): boolean {
    // Check if student already has a C grade (not C+ or C-)
    return academicHistory.some(course => 
      course.grade && course.grade.toUpperCase().trim() === 'C' && !course.nullified
    );
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

    // Check if student already has a C grade and trying to add another C
    if (normalizedGrade === 'C' && hasCGrade()) {
      error = 'You can only have at most one C grade. You already have a C grade in your academic history.';
      return;
    }

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

  async function proceedWithAddCourse(courseToAdd: any, nullifyOld: boolean = false) {
    error = ''; // Clear any previous errors
    try {
    const res = await fetch('/api/student/addCompletedCourse', {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...courseToAdd,
          nullifyOldCourse: nullifyOld,
          oldCourseSemester: nullifyOld ? duplicateCourse?.semester : undefined,
          oldCourseGrade: nullifyOld ? duplicateCourse?.grade : undefined
        })
      });
      
    if (res.ok) {
        await fetchStudentInfo();
        newCourse = { courseId: '', semester: '', grade: '' };
        courseLookup = null;
        lookupError = '';
        showAddCourse = false;
        showRetakeModal = false;
        duplicateCourse = null;
        pendingCourseToAdd = null;
        error = '';
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
    if (pendingCourseToAdd) {
      proceedWithAddCourse(pendingCourseToAdd, true);
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
    // Only count non-nullified required courses that count toward diploma as completed
    // Include both actual academic history and potential courses
    const allCompletedCourses = [...academicHistory, ...potentialCourses];
    const completedCourseIds = allCompletedCourses
      .filter(c => {
        // Course must be required, not nullified, and count toward diploma
        const countsTowardDiploma = c.countsTowardDiploma !== false; // Default to true if not set
        return c.required && !c.nullified && countsTowardDiploma;
      })
      .map(c => c.courseId.toUpperCase());
    
    return remainingCourses.filter((c: any) => !completedCourseIds.includes(c.courseId.toUpperCase()));
  }

  function getNonCountingCourses() {
    // Courses that don't count: not required, or below C grade, or explicitly marked as not counting
    // Include both actual and potential courses
    const allCourses = [...academicHistory, ...potentialCourses];
    return allCourses.filter(c => {
      const countsTowardDiploma = c.countsTowardDiploma !== false; // Default to true if not set
      return !c.required || !countsTowardDiploma;
    });
  }

  async function lookupPotentialCourse() {
    if (!newPotentialCourse.courseId) {
      potentialCourseLookup = null;
      potentialLookupError = '';
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const res = await fetch(`/api/courses/lookup?number=${encodeURIComponent(newPotentialCourse.courseId)}`);
      if (res.ok) {
        potentialCourseLookup = await res.json();
        potentialLookupError = '';
      } else {
        const errorData = await res.json();
        potentialCourseLookup = null;
        potentialLookupError = errorData.error || `Course ${newPotentialCourse.courseId} does not exist in the course catalog`;
      }
    } catch (err) {
      potentialCourseLookup = null;
      potentialLookupError = 'Failed to lookup course. Please try again.';
    }
  }

  function addPotentialCourse() {
    if (!potentialCourseLookup) {
      error = 'Please enter a valid course number';
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

    // Validate grade
    const normalizedGrade = newPotentialCourse.grade.toUpperCase().trim();
    if (!isValidGrade(normalizedGrade)) {
      error = `Invalid grade. Valid grades are: ${VALID_GRADES.join(', ')}`;
      return;
    }

    // Check C grade limit (including potential courses)
    if (normalizedGrade === 'C') {
      const hasCInHistory = academicHistory.some(c => 
        c.grade && c.grade.toUpperCase().trim() === 'C' && !c.nullified
      );
      const hasCInPotential = potentialCourses.some(c => 
        c.grade && c.grade.toUpperCase().trim() === 'C'
      );
      if (hasCInHistory || hasCInPotential) {
        error = 'You can only have at most one C grade. You already have a C grade.';
        return;
      }
    }

    // Determine if counts toward diploma
    const GRADES_BELOW_C = ['C-', 'D+', 'D', 'F'];
    const countsTowardDiploma = potentialCourseLookup.required && !GRADES_BELOW_C.includes(normalizedGrade);

    const potentialCourse = {
      courseId: potentialCourseLookup.courseId,
      title: potentialCourseLookup.title,
      credits: potentialCourseLookup.credits,
      grade: normalizedGrade,
      required: potentialCourseLookup.required,
      category: potentialCourseLookup.category,
      countsTowardDiploma: countsTowardDiploma,
      isPotential: true // Mark as potential
    };

    potentialCourses = [...potentialCourses, potentialCourse];
    newPotentialCourse = { courseId: '', grade: 'A' };
    potentialCourseLookup = null;
    potentialLookupError = '';
    error = '';
  }

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
    // 2. Have countsTowardDiploma === true (or not explicitly false)
    // 3. Have valid grades and credits
    const coursesThatCount = allCourses.filter(course => {
      // Skip nullified courses
      if (course.nullified) return false;
      
      // Check if course counts toward diploma
      const countsTowardDiploma = course.countsTowardDiploma !== false;
      
      // Must have valid grade and credits
      if (!course.grade || !course.credits) return false;
      
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
            <div class="course-item" class:non-counting={!course.required || course.countsTowardDiploma === false} class:nullified={course.nullified}>
              <div style="flex: 1;">
                <div class="course-code">{course.courseId || 'N/A'}</div>
                <div class="course-title">{course.title || 'N/A'}</div>
                <div class="course-meta">
                  {course.semester || 'N/A'} • {course.credits || 0} credits • Grade: {course.grade || 'N/A'}
                  {#if course.nullified}
                    <span style="color: #dc2626; margin-left: 0.5rem; font-weight: 500;">(Nullified - Retaken)</span>
                  {:else if !course.required || course.countsTowardDiploma === false}
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
              <div style="flex: 1;">
                <label for="potential-course-number" style="display: block; font-weight: 500; color: #374151; font-size: 0.875rem; margin-bottom: 0.5rem;">Course Number</label>
                <input 
                  id="potential-course-number"
                  type="text" 
                  placeholder="e.g., CS 310"
                  bind:value={newPotentialCourse.courseId}
                  on:input={lookupPotentialCourse}
                  style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 0.9375rem;"
                />
              </div>
              <div style="width: 120px;">
                <label for="potential-grade" style="display: block; font-weight: 500; color: #374151; font-size: 0.875rem; margin-bottom: 0.5rem;">Grade</label>
                <select 
                  id="potential-grade"
                  bind:value={newPotentialCourse.grade}
                  style="width: 100%; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 0.9375rem;"
                >
                  {#each VALID_GRADES as grade}
                    <option value={grade}>{grade}</option>
  {/each}
                </select>
              </div>
              <button class="btn btn-primary" on:click={addPotentialCourse} disabled={!potentialCourseLookup}>
                Add Potential
              </button>
            </div>

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
              <h3 style="font-size: 1.125rem; font-weight: 600; color: #1a202c; margin-bottom: 1rem;">Your Potential Courses:</h3>
              {#each potentialCourses as course}
                <div class="course-item" style="border-left-color: #3b82f6; background: #eff6ff;">
                  <div style="flex: 1;">
                    <div class="course-code">{course.courseId}</div>
                    <div class="course-title">{course.title}</div>
                    <div class="course-meta">
                      {course.credits} credits • Grade: {course.grade}
                      <span style="color: #3b82f6; margin-left: 0.5rem; font-weight: 500;">(Potential)</span>
                      {#if !course.countsTowardDiploma}
                        <span style="color: #d97706; margin-left: 0.5rem; font-weight: 500;">(Does not count toward degree)</span>
                      {/if}
                    </div>
                  </div>
                  <button class="btn btn-danger" on:click={() => removePotentialCourse(course.courseId)} style="margin-left: 1rem;">Remove</button>
                </div>
  {/each}
            </div>
          {:else}
            <div class="empty-state">
              <p>No potential courses added yet. Add courses above to see how they would affect your progress.</p>
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
            
            <div class="form-group">
              <label for="course-number">Course Number</label>
              <input 
                id="course-number"
                type="text" 
                placeholder="e.g., CS 310"
                bind:value={newCourse.courseId}
                on:input={lookupCourse}
              />
            </div>

            {#if lookupError}
              <div class="error-msg">{lookupError}</div>
            {/if}

            {#if courseLookup}
              <div class="course-info">
                <h3>{courseLookup.courseId} - {courseLookup.title}</h3>
                <p>{courseLookup.credits} credits • {courseLookup.required ? 'Required' : 'Elective'}</p>
              </div>

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
                  Valid grades: A+, A, A-, B+, B, B-, C+, C, C-, D+, D, F. Grades below C (C-, D+, D, F) do not count toward diploma. You can have at most one C grade.
                </small>
              </div>
            {/if}

            <div class="form-actions">
              <button 
                class="btn btn-primary" 
                on:click={addCompletedCourse} 
                disabled={!courseLookup || !newCourse.semester || !newCourse.grade}
              >
                Add Course
              </button>
              <button class="btn btn-secondary" on:click={() => {
                showAddCourse = false;
                newCourse = { courseId: '', semester: '', grade: '' };
                courseLookup = null;
                lookupError = '';
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
              <p>Are you retaking this course?</p>
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
