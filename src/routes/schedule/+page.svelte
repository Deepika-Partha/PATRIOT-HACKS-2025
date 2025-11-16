<script lang="ts">
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

  // TEMP: hard-coded sections just to demo
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

  let activeSectionIds: string[] = [];

  const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const START_HOUR = 8;
  const END_HOUR = 21;
  const TOTAL_MIN = (END_HOUR - START_HOUR) * 60;

  function toggleSection(id: string) {
    if (activeSectionIds.includes(id)) {
      activeSectionIds = activeSectionIds.filter(x => x !== id);
    } else {
      activeSectionIds = [...activeSectionIds, id];
    }
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
</script>

<div class="page">
  <!-- LEFT SIDEBAR -->
  <aside class="sidebar">
    <h2>Pick your sections</h2>
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

  <!-- RIGHT CALENDAR -->
  <main class="calendar">
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
                <div class="block-code">{sec.code}</div>
                <div class="block-title">{sec.title}</div>
                <div class="block-time">{m.start}–{m.end}</div>
              </div>
            {/each}
          {/each}
        </div>
      {/each}
    </div>
  </main>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: 320px 1fr;
    height: 100%;
    max-height: calc(100vh - 80px);
  }

  .sidebar {
    border-right: 1px solid #e5e7eb;
    padding: 1rem;
    overflow-y: auto;
    background: #f9fafb;
  }

  .sidebar h2 {
    margin-bottom: 0.25rem;
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
    display: flex;
    flex-direction: column;
    padding: 0.75rem;
  }

  .calendar-header {
    display: grid;
    grid-template-columns: 60px repeat(5, 1fr);
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .day-col-header {
    text-align: center;
  }

  .calendar-body {
    display: grid;
    grid-template-columns: 60px repeat(5, 1fr);
    flex: 1;
    min-height: 0;
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
  }

  .block-code {
    font-weight: 700;
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
</style>
