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
  let allSections: CourseSection[] = [
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

  type Task = {
    id: string;
    text: string;
    completed: boolean;
    createdAt: string;
    completedAt?: string;
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
  let newEventTitle = '';
  let newEventDay: Day = 'Mon';
  let newEventStart = '09:00';
  let newEventEnd = '10:00';
  let newEventDescription = '';

  const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const START_HOUR = 8;
  const END_HOUR = 21;
  const TOTAL_MIN = (END_HOUR - START_HOUR) * 60;
  const EVENT_COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  async function loadSchedule() {
    try {
      loading = true;
      error = '';
      const res = await fetch('/api/student/getCurrentSchedule');
      if (res.ok) {
        const data = await res.json();
        // Load saved sections from database
        if (data.currentSchedule && Array.isArray(data.currentSchedule) && data.currentSchedule.length > 0) {
          // Restore active section IDs from saved schedule
          // The database stores the full CourseSection objects, so we extract the IDs
          activeSectionIds = data.currentSchedule
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
      id: Date.now().toString(),
      text: newTaskText.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    tasks = [...tasks, newTask];
    newTaskText = '';
    saveTasksAndEvents();
  }

  function toggleTask(id: string) {
    tasks = tasks.map(task => {
      if (task.id === id) {
        const wasCompleted = task.completed;
        return {
          ...task,
          completed: !task.completed,
          completedAt: !wasCompleted ? new Date().toISOString() : undefined
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

  const activeTasks = tasks.filter(t => !t.completed).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const completedTasks = tasks.filter(t => t.completed).sort((a, b) => {
    const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bTime - aTime; // Most recently completed first
  });

  onMount(() => {
    loadSchedule();
    loadTasksAndEvents();
  });
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

    {#each allSections as sec}
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
        <div class="times">
          {#each sec.meetings as m}
            <div>{m.day}: {m.start}–{m.end}</div>
          {/each}
        </div>
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
      {#each DAYS as d}
        <div class="day-col-header">{d}</div>
      {/each}
    </div>

    <div class="calendar-body">
      <!-- time labels -->
      <div class="time-col">
        {#each Array(END_HOUR - START_HOUR) as _, i}
          <div class="time-row">
            {START_HOUR + i}:00
          </div>
        {/each}
      </div>

      <!-- columns per day -->
      {#each DAYS as day}
        <div class="day-col">
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
                <span class="task-date">Created {formatDate(task.createdAt)}</span>
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
    top: 0;
    left: 0;
    width: 320px;
    height: 100vh;
    background: #f9fafb;
    border-right: 1px solid #e5e7eb;
    padding: 1rem;
    overflow-y: auto;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
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
    font-size: 1.5rem;
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
    padding: 1rem;
    box-sizing: border-box;
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
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    margin-top: 3rem;
  }

  .day-col-header {
    text-align: center;
  }

  .calendar-body {
    display: grid;
    grid-template-columns: 60px repeat(5, 1fr);
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .time-col {
    border-right: 1px solid #e5e7eb;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .time-row {
    height: calc(100% / 13); /* 21 - 8 = 13 hours */
    padding-right: 0.25rem;
    text-align: right;
  }

  .day-col {
    position: relative;
    border-left: 1px solid #f3f4f6;
    border-right: 1px solid #f3f4f6;
  }

  .hour-line {
    height: calc(100% / 13);
    border-top: 1px solid #f3f4f6;
  }

  .calendar-top-bar {
    position: absolute;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    z-index: 100;
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
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999;
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
    top: 0;
    right: 0;
    width: 380px;
    height: 100vh;
    background: #f9fafb;
    border-left: 1px solid #e5e7eb;
    padding: 1rem;
    overflow-y: auto;
    z-index: 1000;
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
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
    font-size: 1.5rem;
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
