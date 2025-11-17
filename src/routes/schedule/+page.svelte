<script lang="ts">
  import { onMount } from 'svelte';

  type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

  type MeetingTime = {
    day: Day;
    start: string; // "09:00"
    end: string;   // "10:15"
  };

  type CourseSection = {
    id: string;
    code: string;
    title: string;
    section: string;
    color: string;
    meetings: MeetingTime[];
  };

  // Available sections to choose from
  let allSections: CourseSection[] = [];
  let coursesLoading = false;
  let searchQuery = '';

  type Task = {
    id: string;
    text: string;
    completed: boolean;
    createdAt: string;
    completedAt?: string;
    dueDate?: string; // ISO date string
  };

  type CalendarEvent = {
    id: string;
    title: string;
    day: Day;
    start: string;
    end: string;
    color: string;
    description?: string;
  };

  let activeSectionIds: string[] = [];
  let sidebarOpen = false;
  let tasksPanelOpen = false;
  let activeTab: 'todo' | 'completed' | 'events' = 'todo';
  let loading = true;
  let saving = false;
  let error = '';

  let tasks: Task[] = [];
  let events: CalendarEvent[] = [];
  let newTaskText = '';
  let newTaskDueDate = '';
  let newEventTitle = '';
  let newEventDay: Day = 'Mon';
  let newEventStart = '09:00';
  let newEventEnd = '10:00';
  let newEventDescription = '';

  // Week navigation state
  let weekOffset = 0; // 0 = current week, positive = future weeks, negative = past weeks
  let calendarBodyElement: HTMLElement | null = null;
  let touchStartX = 0;
  let touchStartY = 0;

  const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const START_HOUR = 0; // 12am (midnight)
  const END_HOUR = 24; // 12am next day (full 24 hours: 12am to 11pm)
  const TOTAL_MIN = (END_HOUR - START_HOUR) * 60;
  const EVENT_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  // Color palette for different subjects
  const SUBJECT_COLORS: Record<string, string> = {
    'CS': '#60a5fa',      // Blue for Computer Science
    'MATH': '#22c55e',    // Green for Mathematics
    'PHYS': '#f59e0b',    // Orange for Physics
    'CHEM': '#ec4899',    // Pink for Chemistry
    'BIOL': '#10b981',    // Emerald for Biology
    'ENGH': '#8b5cf6',    // Purple for English
    'COMM': '#f97316',    // Orange for Communications
    'STAT': '#06b6d4',    // Cyan for Statistics
    'ECE': '#3b82f6',     // Blue for Electrical Engineering
    'SWE': '#14b8a6',     // Teal for Software Engineering
    'SYST': '#a855f7',    // Purple for Systems Engineering
  };

  function getColorForSubject(subject: string): string {
    const normalizedSubject = subject.toUpperCase().trim();
    return SUBJECT_COLORS[normalizedSubject] || EVENT_COLORS[Math.abs(normalizedSubject.charCodeAt(0) || 0) % EVENT_COLORS.length];
  }

  type GMUCourse = {
    subject: string;
    number: string;
    code: string;
    title: string;
    credits: number;
    description?: string;
    url?: string;
  };

  async function loadGMUCourses() {
    try {
      coursesLoading = true;
      const res = await fetch('/gmu_courses.json');
      if (!res.ok) {
        throw new Error('Failed to load courses');
      }
      const courses: GMUCourse[] = await res.json();
      
      // Transform to CourseSection format
      allSections = courses.map((course, index) => {
        const subject = course.subject || course.code.split(' ')[0] || 'UNK';
        // Use "001" as default section (since JSON doesn't have section numbers)
        const sectionNumber = '001';
        // Generate unique ID from course code (normalized)
        // Use course code directly to ensure uniqueness
        const id = `${course.code.toLowerCase().replace(/\s+/g, '')}-${sectionNumber}`;
        
        // Add fake meeting times for demonstration courses (ensuring no overlaps)
        let meetings: MeetingTime[] = [];
        let courseColor = getColorForSubject(subject);
        const normalizedCode = course.code.toUpperCase().trim();
        
        if (normalizedCode === 'CS 110') {
          // Essentials of Computer Science - Mon/Wed 09:00-10:15
          meetings = [
            { day: 'Mon', start: '09:00', end: '10:15' },
            { day: 'Wed', start: '09:00', end: '10:15' }
          ];
          courseColor = '#3b82f6'; // Blue
        } else if (normalizedCode === 'CS 112') {
          // Introduction to Computer Programming - Tue/Thu 10:30-11:45
          meetings = [
            { day: 'Tue', start: '10:30', end: '11:45' },
            { day: 'Thu', start: '10:30', end: '11:45' }
          ];
          courseColor = '#a855f7'; // Purple
        } else if (normalizedCode === 'MATH 124') {
          // Calculus I - Mon/Wed/Fri 12:00-13:15
          meetings = [
            { day: 'Mon', start: '12:00', end: '13:15' },
            { day: 'Wed', start: '12:00', end: '13:15' },
            { day: 'Fri', start: '12:00', end: '13:15' }
          ];
          courseColor = '#22c55e'; // Green
        } else if (normalizedCode === 'AVT 202') {
          // Art and Visual Technology course - Tue/Thu 14:00-16:30
          meetings = [
            { day: 'Tue', start: '14:00', end: '16:30' },
            { day: 'Thu', start: '14:00', end: '16:30' }
          ];
          courseColor = '#f97316'; // Orange
        }
        
        return {
          id,
          code: course.code,
          title: course.title,
          section: sectionNumber,
          color: courseColor,
          meetings
        };
      });
      
      console.log(`Loaded ${allSections.length} courses from GMU catalog`);
    } catch (err) {
      console.error('Error loading GMU courses:', err);
      error = 'Failed to load courses. Using default courses.';
      // Fallback to default courses
      allSections = [
        {
          id: 'cs310-001',
          code: 'CS 310',
          title: 'Data Structures',
          section: '001',
          color: '#60a5fa',
          meetings: [
            { day: 'Mon', start: '09:00', end: '10:15' },
            { day: 'Wed', start: '09:00', end: '10:15' }
          ]
        },
        {
          id: 'cs321-002',
          code: 'CS 321',
          title: 'Software Engineering',
          section: '002',
          color: '#f97316',
          meetings: [
            { day: 'Tue', start: '13:30', end: '14:45' },
            { day: 'Thu', start: '13:30', end: '14:45' }
          ]
        },
        {
          id: 'math203-003',
          code: 'MATH 203',
          title: 'Linear Algebra',
          section: '003',
          color: '#22c55e',
          meetings: [
            { day: 'Mon', start: '11:30', end: '12:45' },
            { day: 'Wed', start: '11:30', end: '12:45' }
          ]
        }
      ];
    } finally {
      coursesLoading = false;
    }
  }

  // Filtered sections based on search query
  $: filteredSections = searchQuery.trim() === '' 
    ? allSections 
    : allSections.filter(sec => 
        sec.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sec.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Date calculation functions
  function getMondayOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d);
    monday.setDate(diff);
    return monday;
  }

  function getWeekDates(offset: number): Date[] {
    const today = new Date();
    const monday = getMondayOfWeek(today);
    monday.setDate(monday.getDate() + (offset * 7));
    
    const weekDates: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  }

  function formatDateShort(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }

  function formatWeekRange(start: Date, end: Date): string {
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const year = start.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()}-${end.getDate()}, ${year}`;
    } else {
      return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
    }
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  function getCurrentHour(): number {
    return new Date().getHours();
  }

  function formatHour(hour: number): string {
    if (hour === 0) return '12:00 AM';
    if (hour === 12) return '12:00 PM';
    if (hour < 12) return `${hour}:00 AM`;
    return `${hour - 12}:00 PM`;
  }

  // Reactive week dates
  $: weekDates = getWeekDates(weekOffset);
  $: weekStart = weekDates[0];
  $: weekEnd = weekDates[4];
  $: weekRangeText = formatWeekRange(weekStart, weekEnd);

  async function loadSchedule() {
    try {
      loading = true;
      error = '';
      const res = await fetch('/api/student/getCurrentSchedule');
      if (res.ok) {
        const data = await res.json();
        // Load saved sections from database
        if (data.currentSchedule && Array.isArray(data.currentSchedule) && data.currentSchedule.length > 0) {
          // Merge saved schedule with loaded courses
          // Match saved courses by ID and preserve meeting times
          const savedCourses = data.currentSchedule as CourseSection[];
          savedCourses.forEach((savedCourse: CourseSection) => {
            const matchingSection = allSections.find(sec => sec.id === savedCourse.id);
            if (matchingSection && savedCourse.meetings && savedCourse.meetings.length > 0) {
              // Preserve meeting times from saved schedule
              matchingSection.meetings = savedCourse.meetings;
            }
          });
          
          // Restore active section IDs from saved schedule
          activeSectionIds = savedCourses
            .map((course: CourseSection) => course.id)
            .filter((id: string) => allSections.some(sec => sec.id === id));
        } else {
          // No saved schedule, start with empty array
          activeSectionIds = [];
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          error = 'Please log in to view your schedule';
        } else {
          error = errorData.error || 'Failed to load schedule';
        }
        console.error('Failed to load schedule:', errorData);
      }
    } catch (err) {
      console.error('Error loading schedule:', err);
      error = 'Error loading schedule. Please refresh the page.';
    } finally {
      loading = false;
    }
  }

  async function saveSchedule() {
    try {
      saving = true;
      error = '';
      // Get all active sections - this ensures we save the complete course data
      const activeSections = allSections.filter(sec => activeSectionIds.includes(sec.id));
      
      const res = await fetch('/api/student/updateCurrentSchedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeSections)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          error = 'Please log in to save your schedule';
        } else {
          error = errorData.error || 'Failed to save schedule';
        }
        console.error('Failed to save schedule:', errorData);
      } else {
        // Success - clear any previous errors
        error = '';
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
      error = 'Error saving schedule. Please try again.';
    } finally {
      saving = false;
    }
  }

  async function toggleSection(id: string) {
    if (activeSectionIds.includes(id)) {
      activeSectionIds = activeSectionIds.filter(x => x !== id);
    } else {
      activeSectionIds = [...activeSectionIds, id];
    }
    // Auto-save when toggling
    await saveSchedule();
  }

  async function deleteSection(id: string) {
    activeSectionIds = activeSectionIds.filter(x => x !== id);
    // Auto-save when deleting
    await saveSchedule();
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function minutesSinceStart(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h - START_HOUR) * 60 + m;
  }

  function blockStyle(meeting: MeetingTime, color: string) {
    const topMin = minutesSinceStart(meeting.start);
    const endMin = minutesSinceStart(meeting.end);
    const duration = endMin - topMin;

    const topPct = (topMin / TOTAL_MIN) * 100;
    const heightPct = (duration / TOTAL_MIN) * 100;

    return `
      top: ${topPct}%;
      height: ${heightPct}%;
      background: ${color};
    `;
  }

  async function loadTasksAndEvents() {
    try {
      const res = await fetch('/api/student/getTasks');
      if (res.ok) {
        const data = await res.json();
        tasks = data.tasks || [];
        events = data.events || [];
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  }

  async function saveTasksAndEvents() {
    try {
      await fetch('/api/student/updateTasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, events })
      });
    } catch (err) {
      console.error('Error saving tasks:', err);
    }
  }

  function addTask() {
    if (!newTaskText.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Ensure unique ID
      text: newTaskText.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      dueDate: newTaskDueDate || undefined
    };
    
    tasks = [...tasks, newTask];
    newTaskText = '';
    newTaskDueDate = '';
    saveTasksAndEvents();
  }

  function toggleTask(id: string) {
    tasks = tasks.map(task => {
      if (task.id === id) {
        const newCompleted = !task.completed;
        return {
          ...task,
          completed: newCompleted,
          completedAt: newCompleted ? new Date().toISOString() : undefined
        };
      }
      return task;
    });
    saveTasksAndEvents();
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  }

  function formatDueDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  function deleteTask(id: string) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasksAndEvents();
  }

  function addEvent() {
    if (!newEventTitle.trim()) return;
    
    const randomColor = EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)];
    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: newEventTitle.trim(),
      day: newEventDay,
      start: newEventStart,
      end: newEventEnd,
      color: randomColor,
      description: newEventDescription.trim() || undefined
    };
    
    events = [...events, newEvent];
    newEventTitle = '';
    newEventDescription = '';
    newEventDay = 'Mon';
    newEventStart = '09:00';
    newEventEnd = '10:00';
    saveTasksAndEvents();
  }

  function deleteEvent(id: string) {
    events = events.filter(event => event.id !== id);
    saveTasksAndEvents();
  }

  function toggleTasksPanel() {
    tasksPanelOpen = !tasksPanelOpen;
  }

  function goToPreviousWeek() {
    weekOffset -= 1;
  }

  function goToNextWeek() {
    weekOffset += 1;
  }

  function goToCurrentWeek() {
    weekOffset = 0;
  }

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    
    // Only trigger if horizontal swipe is greater than vertical (to avoid interfering with scrolling)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swipe left = next week
        goToNextWeek();
      } else {
        // Swipe right = previous week
        goToPreviousWeek();
      }
    }
    
    touchStartX = 0;
    touchStartY = 0;
  }

  function scrollToCurrentTime() {
    if (!calendarBodyElement || weekOffset !== 0) return;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    if (currentHour < START_HOUR || currentHour >= END_HOUR) return;
    
    // Calculate scroll position
    const hourIndex = currentHour - START_HOUR;
    const scrollPosition = (hourIndex / (END_HOUR - START_HOUR)) * calendarBodyElement.scrollHeight;
    
    setTimeout(() => {
      if (calendarBodyElement) {
        calendarBodyElement.scrollTo({
          top: scrollPosition - 100, // Offset to show some context above
          behavior: 'smooth'
        });
      }
    }, 100);
  }

  // Reactive derived values for tasks
  $: activeTasks = tasks.filter(t => !t.completed).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  $: completedTasks = tasks.filter(t => t.completed).sort((a, b) => {
    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bTime - aTime; // Most recently completed first
  });

  onMount(async () => {
    // Load GMU courses first, then load schedule
    await loadGMUCourses();
    await loadSchedule();
    loadTasksAndEvents();
    // Auto-scroll to current time after a short delay
    setTimeout(() => {
      scrollToCurrentTime();
    }, 300);
  });

  // Auto-scroll when returning to current week
  $: if (weekOffset === 0 && calendarBodyElement) {
    setTimeout(() => {
      scrollToCurrentTime();
    }, 100);
  }
</script>

<div class="page">
  <!-- FLOATING SIDEBAR -->
  <aside class="sidebar" class:open={sidebarOpen}>
    <div class="sidebar-header">
      <h2>Pick your sections</h2>
      <button class="close-btn" on:click={toggleSidebar} aria-label="Close sidebar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <p class="hint">Click a class to add/remove it from your schedule.</p>

    <div class="search-box">
      <input 
        type="text" 
        placeholder="Search courses (e.g., CS 310, Data Structures)" 
        bind:value={searchQuery}
        class="search-input"
      />
      {#if coursesLoading}
        <div class="loading-text">Loading courses...</div>
      {/if}
    </div>

    {#if filteredSections.length === 0 && !coursesLoading}
      <div class="empty-state">No courses found. Try a different search.</div>
    {/if}

    {#each filteredSections as sec}
      <button
        class="section-card"
        class:active={activeSectionIds.includes(sec.id)}
        on:click={() => toggleSection(sec.id)}
      >
        <div class="section-header">
          <span class="code">{sec.code} – {sec.section}</span>
          <span class="dot" style={`background:${sec.color}`}></span>
        </div>
        <div class="title">{sec.title}</div>
        {#if sec.meetings.length > 0}
          <div class="times">
            {#each sec.meetings as m}
              <div>{m.day}: {m.start}–{m.end}</div>
            {/each}
          </div>
        {:else}
          <div class="times no-meetings">No meeting times set</div>
        {/if}
      </button>
    {/each}
  </aside>

  <!-- FULLSCREEN CALENDAR -->
  <main class="calendar">
    <div class="calendar-top-bar">
      <button class="toggle-sidebar-btn" on:click={toggleSidebar} aria-label="Toggle sidebar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      {#if error}
        <div class="error-message">{error}</div>
      {/if}
      {#if saving}
        <div class="saving-indicator">Saving...</div>
      {/if}
      {#if loading}
        <div class="loading-indicator">Loading...</div>
      {/if}
    </div>

    <div class="calendar-header">
      <div class="time-col"></div>
      <button class="week-nav-btn week-nav-left" on:click={goToPreviousWeek} aria-label="Previous week">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      {#each weekDates as date, index}
        <div class="day-col-header" class:today={isToday(date)}>
          <div class="day-name">{DAYS[index]}</div>
          <div class="day-date">{formatDateShort(date)}</div>
        </div>
      {/each}
      <button class="week-nav-btn week-nav-right" on:click={goToNextWeek} aria-label="Next week">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>

    <div 
      class="calendar-body"
      bind:this={calendarBodyElement}
      on:touchstart={handleTouchStart}
      on:touchend={handleTouchEnd}
    >
      <!-- time labels -->
      <div class="time-col">
        {#each Array(END_HOUR - START_HOUR) as _, i}
          <div class="time-row">
            {formatHour(START_HOUR + i)}
          </div>
        {/each}
      </div>

      <!-- columns per day -->
      {#each weekDates as date, dayIndex}
        {@const day = DAYS[dayIndex]}
        <div class="day-col" class:today={isToday(date)}>
          {#each Array(END_HOUR - START_HOUR) as _, i}
            <div class="hour-line"></div>
          {/each}

          {#each allSections.filter(sec => activeSectionIds.includes(sec.id)) as sec}
            {#each sec.meetings.filter(m => m.day === day) as m}
              <div class="block" style={blockStyle(m, sec.color)}>
                <button 
                  class="delete-btn" 
                  on:click|stopPropagation={() => deleteSection(sec.id)}
                  aria-label="Delete {sec.code}"
                  title="Delete {sec.code}"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
                <div class="block-code">{sec.code}</div>
                <div class="block-title">{sec.title}</div>
                <div class="block-time">{m.start}–{m.end}</div>
              </div>
            {/each}
          {/each}

          {#each events.filter(e => e.day === day) as event}
            <div class="block event-block" style={blockStyle({ day: event.day, start: event.start, end: event.end }, event.color)}>
              <button 
                class="delete-btn" 
                on:click|stopPropagation={() => deleteEvent(event.id)}
                aria-label="Delete event"
                title="Delete event"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <div class="block-code">Event</div>
              <div class="block-title">{event.title}</div>
              <div class="block-time">{event.start}–{event.end}</div>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </main>

  <!-- TASKS PANEL -->
  <aside class="tasks-panel" class:open={tasksPanelOpen}>
    <div class="tasks-header">
      <h2>Tasks & Events</h2>
      <button class="close-btn" on:click={toggleTasksPanel} aria-label="Close tasks panel">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <div class="tasks-tabs">
      <button 
        class="tab-btn" 
        class:active={activeTab === 'todo'}
        on:click={() => activeTab = 'todo'}
      >
        To-Do ({activeTasks.length})
      </button>
      <button 
        class="tab-btn" 
        class:active={activeTab === 'completed'}
        on:click={() => activeTab = 'completed'}
      >
        Completed ({completedTasks.length})
      </button>
      <button 
        class="tab-btn" 
        class:active={activeTab === 'events'}
        on:click={() => activeTab = 'events'}
      >
        Events ({events.length})
      </button>
    </div>

    <div class="tasks-content">
      {#if activeTab === 'todo'}
        <div class="add-task-form">
          <input 
            type="text" 
            placeholder="Add a new task..." 
            bind:value={newTaskText}
            on:keydown={(e) => e.key === 'Enter' && addTask()}
          />
          <input 
            type="date" 
            placeholder="Due date (optional)" 
            bind:value={newTaskDueDate}
            class="due-date-input"
          />
          <button class="add-btn" on:click={addTask}>Add</button>
        </div>
        <div class="tasks-list">
          {#each activeTasks as task}
            <div class="task-item">
              <input 
                type="checkbox" 
                checked={task.completed}
                on:change={() => toggleTask(task.id)}
              />
              <div class="task-content">
                <span class="task-text">{task.text}</span>
                <div class="task-dates">
                  <span class="task-date">Created {formatDate(task.createdAt)}</span>
                  {#if task.dueDate}
                    <span class="task-date due-date" class:overdue={new Date(task.dueDate) < new Date()}>
                      {formatDueDate(task.dueDate)}
                    </span>
                  {/if}
                </div>
              </div>
              <button class="task-delete-btn" on:click={() => deleteTask(task.id)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          {:else}
            <div class="empty-state">No tasks yet. Add one above!</div>
          {/each}
        </div>
      {:else if activeTab === 'completed'}
        <div class="completed-header">
          <div class="completed-stats">
            <span class="stat-label">Total Completed:</span>
            <span class="stat-value">{completedTasks.length}</span>
          </div>
          {#if completedTasks.length > 0}
            <button class="clear-completed-btn" on:click={() => {
              if (confirm('Delete all completed tasks?')) {
                tasks = tasks.filter(t => !t.completed);
                saveTasksAndEvents();
              }
            }}>
              Clear All
            </button>
          {/if}
        </div>
        <div class="tasks-list completed-list">
          {#each completedTasks as task}
            <div class="task-item completed">
              <input 
                type="checkbox" 
                checked={task.completed}
                on:change={() => toggleTask(task.id)}
              />
              <div class="task-content">
                <span class="task-text">{task.text}</span>
                <div class="task-dates">
                  <span class="task-date">Created {formatDate(task.createdAt)}</span>
                  {#if task.dueDate}
                    <span class="task-date due-date">Due {formatDueDate(task.dueDate)}</span>
                  {/if}
                  {#if task.completedAt}
                    <span class="task-date completed-date">Completed {formatDate(task.completedAt)}</span>
                  {/if}
                </div>
              </div>
              <button class="task-delete-btn" on:click={() => deleteTask(task.id)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          {:else}
            <div class="empty-state">No completed tasks yet. Complete a task to see it here!</div>
          {/each}
        </div>
      {:else}
        <div class="add-event-form">
          <input 
            type="text" 
            placeholder="Event title..." 
            bind:value={newEventTitle}
          />
          <select bind:value={newEventDay}>
            {#each DAYS as day}
              <option value={day}>{day}</option>
            {/each}
          </select>
          <div class="time-inputs">
            <input type="time" bind:value={newEventStart} />
            <span>to</span>
            <input type="time" bind:value={newEventEnd} />
          </div>
          <textarea 
            placeholder="Description (optional)" 
            bind:value={newEventDescription}
            rows="2"
          ></textarea>
          <button class="add-btn" on:click={addEvent}>Add Event</button>
        </div>
        <div class="events-list">
          {#each events as event}
            <div class="event-item">
              <div class="event-color" style={`background: ${event.color}`}></div>
              <div class="event-details">
                <div class="event-title">{event.title}</div>
                <div class="event-time">{event.day} {event.start}–{event.end}</div>
                {#if event.description}
                  <div class="event-description">{event.description}</div>
                {/if}
              </div>
              <button class="event-delete-btn" on:click={() => deleteEvent(event.id)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          {:else}
            <div class="empty-state">No events yet. Add one above!</div>
          {/each}
        </div>
      {/if}
    </div>
  </aside>

  <!-- TASKS PANEL TOGGLE BUTTON -->
  <button class="tasks-toggle-btn" on:click={toggleTasksPanel} aria-label="Toggle tasks panel">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 11l3 3L22 4"></path>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"></path>
    </svg>
  </button>

  <!-- OVERLAY (when sidebar is open) -->
  {#if sidebarOpen}
    <div class="overlay" on:click={toggleSidebar}></div>
  {/if}

  <!-- OVERLAY (when tasks panel is open) -->
  {#if tasksPanelOpen}
    <div class="overlay" on:click={toggleTasksPanel}></div>
  {/if}
</div>

<style>
  .page {
    position: relative;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .sidebar {
    position: fixed;
    top: 70px; /* Start below navbar */
    left: 0;
    width: 320px;
    height: calc(100vh - 70px); /* Account for navbar height */
    background: #ffffff;
    border-right: 1px solid #e5e7eb;
    padding: 1.5rem;
    overflow-y: auto;
    z-index: 999; /* Below navbar (1000) but above content */
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .sidebar-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    transition: background-color 0.2s ease, color 0.2s ease;
  }

  .close-btn:hover {
    background-color: #e5e7eb;
    color: #111827;
  }

  .hint {
    font-size: 0.85rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
  }

  .search-box {
    margin-bottom: 1rem;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-family: inherit;
    box-sizing: border-box;
  }

  .search-input:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .loading-text {
    font-size: 0.75rem;
    color: #6b7280;
    margin-top: 0.5rem;
    text-align: center;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .no-meetings {
    color: #9ca3af;
    font-style: italic;
    font-size: 0.75rem;
  }

  .section-card {
    width: 100%;
    text-align: left;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    padding: 0.6rem 0.75rem;
    margin-bottom: 0.5rem;
    background: white;
    cursor: pointer;
    transition: transform 0.1s ease, box-shadow 0.1s ease, border-color 0.1s ease;
  }

  .section-card:hover {
    transform: translateY(-1px);
  }

  .section-card.active {
    border-color: #2563eb;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
  }

  .title {
    font-size: 0.9rem;
    margin-top: 0.15rem;
  }

  .times {
    margin-top: 0.25rem;
    font-size: 0.8rem;
    color: #4b5563;
  }

  .calendar {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    padding: 2rem;
    box-sizing: border-box;
    background: #fafafa;
  }

  .toggle-sidebar-btn {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    padding: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: background-color 0.2s ease, box-shadow 0.2s ease;
  }

  .toggle-sidebar-btn:hover {
    background-color: #f9fafb;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .calendar-header {
    display: grid;
    grid-template-columns: 60px repeat(5, 1fr);
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    margin-top: 0;
    color: #374151;
    padding: 0.75rem 0;
    border-bottom: 2px solid #e5e7eb;
    position: relative;
  }

  .week-nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  .week-nav-btn:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    color: #111827;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .week-nav-left {
    left: -16px;
  }

  .week-nav-right {
    right: -16px;
  }

  .day-col-header {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .day-col-header.today {
    color: #2563eb;
  }

  .day-name {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .day-date {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
  }

  .day-col-header.today .day-date {
    color: #2563eb;
    font-weight: 600;
  }

  .calendar-body {
    display: grid;
    grid-template-columns: 60px repeat(5, 1fr);
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  .time-col {
    border-right: 1px solid #e5e7eb;
    font-size: 0.75rem;
    color: #6b7280;
    display: flex;
    flex-direction: column;
  }

  .time-row {
    height: 80px; /* Fixed height per hour for better spacing */
    padding-right: 0.5rem;
    padding-top: 0.5rem;
    text-align: right;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    box-sizing: border-box;
    flex-shrink: 0;
  }

  .day-col {
    position: relative;
    border-left: 1px solid #e5e7eb;
    border-right: 1px solid #e5e7eb;
    background: #ffffff;
    transition: background-color 0.2s ease;
    display: flex;
    flex-direction: column;
  }

  .day-col.today {
    background: #eff6ff;
    border-left: 2px solid #2563eb;
    border-right: 2px solid #2563eb;
  }

  .hour-line {
    height: 80px; /* Fixed height per hour for better spacing */
    border-top: 1px solid #e5e7eb;
    box-sizing: border-box;
    flex-shrink: 0;
  }

  .calendar-top-bar {
    position: absolute;
    top: 0; /* Aligned with top of calendar-header */
    left: 4rem; /* Moved right to avoid overlap with left arrow */
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    z-index: 100;
    height: 4rem; /* Match calendar-header height (padding 0.75rem * 2 + content ~2.5rem) */
    pointer-events: none; /* Allow clicks to pass through to header */
  }

  .calendar-top-bar > * {
    pointer-events: auto; /* Re-enable clicks on children */
  }

  .error-message {
    background: #fee2e2;
    color: #991b1b;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    border: 1px solid #fecaca;
  }

  .saving-indicator,
  .loading-indicator {
    background: #dbeafe;
    color: #1e40af;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .block {
    position: absolute;
    left: 6%;
    right: 6%;
    border-radius: 0.5rem;
    color: #111827;
    padding: 0.25rem 0.35rem;
    font-size: 0.7rem;
    overflow: hidden;
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
    cursor: pointer;
    transition: transform 0.1s ease, box-shadow 0.1s ease;
  }

  .block:hover {
    transform: scale(1.02);
    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.18);
  }

  .delete-btn {
    position: absolute;
    top: 0.15rem;
    right: 0.15rem;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 0.25rem;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    color: #dc2626;
    opacity: 0;
    transition: opacity 0.2s ease, background-color 0.2s ease;
    z-index: 10;
  }

  .block:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    background: #fee2e2;
    color: #991b1b;
  }

  .block-code {
    font-weight: 700;
    padding-right: 1.5rem;
  }

  .block-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .block-time {
    margin-top: 0.1rem;
    font-size: 0.65rem;
  }

  .overlay {
    position: fixed;
    top: 70px; /* Start below navbar */
    left: 0;
    width: 100vw;
    height: calc(100vh - 70px); /* Account for navbar height */
    background: rgba(0, 0, 0, 0.3);
    z-index: 998; /* Below panels but above content */
    animation: fadeIn 0.3s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .tasks-panel {
    position: fixed;
    top: 70px; /* Start below navbar */
    right: 0;
    width: 380px;
    height: calc(100vh - 70px); /* Account for navbar height */
    background: #ffffff;
    border-left: 1px solid #e5e7eb;
    padding: 1.5rem;
    overflow-y: auto;
    z-index: 999; /* Below navbar (1000) but above content */
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
    box-shadow: -2px 0 12px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
  }

  .tasks-panel.open {
    transform: translateX(0);
  }

  .tasks-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .tasks-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .tasks-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .tab-btn {
    background: none;
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color 0.2s ease;
  }

  .tab-btn:hover {
    color: #111827;
  }

  .tab-btn.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
  }

  .tasks-content {
    flex: 1;
    overflow-y: auto;
  }

  .add-task-form,
  .add-event-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
  }

  .add-task-form input,
  .add-event-form input,
  .add-event-form select,
  .add-event-form textarea {
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-family: inherit;
  }

  .add-event-form textarea {
    resize: vertical;
  }

  .time-inputs {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .time-inputs input {
    flex: 1;
  }

  .add-btn {
    background: #2563eb;
    color: white;
    border: none;
    padding: 0.625rem 1rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .add-btn:hover {
    background: #1d4ed8;
  }

  .tasks-list,
  .events-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0;
  }

  .task-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    transition: transform 0.1s ease;
  }

  .task-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .task-item.completed {
    background: #f9fafb;
    opacity: 0.9;
  }

  .task-item.completed .task-text {
    text-decoration: line-through;
    color: #9ca3af;
  }

  .task-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .task-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .task-text {
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .task-date {
    font-size: 0.7rem;
    color: #9ca3af;
  }

  .task-dates {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .due-date-input {
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-family: inherit;
  }

  .due-date {
    color: #3b82f6;
    font-weight: 500;
  }

  .due-date.overdue {
    color: #ef4444;
    font-weight: 600;
  }

  .completed-date {
    color: #10b981;
    font-weight: 500;
  }

  .completed-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .completed-stats {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .stat-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: #10b981;
  }

  .clear-completed-btn {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .clear-completed-btn:hover {
    background: #fecaca;
  }

  .completed-list {
    max-height: calc(100vh - 400px);
    overflow-y: auto;
  }

  .task-delete-btn,
  .event-delete-btn {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    transition: background-color 0.2s ease;
  }

  .task-delete-btn:hover,
  .event-delete-btn:hover {
    background: #fee2e2;
  }

  .event-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    transition: transform 0.1s ease;
  }

  .event-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .event-color {
    width: 4px;
    height: 100%;
    min-height: 40px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .event-details {
    flex: 1;
  }

  .event-title {
    font-weight: 600;
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .event-time {
    font-size: 0.75rem;
    color: #6b7280;
    margin-bottom: 0.25rem;
  }

  .event-description {
    font-size: 0.75rem;
    color: #4b5563;
    margin-top: 0.25rem;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: #9ca3af;
    font-size: 0.875rem;
  }

  .tasks-toggle-btn {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 100;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .tasks-toggle-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
  }

  .event-block {
    border-left: 3px solid;
  }
</style>
