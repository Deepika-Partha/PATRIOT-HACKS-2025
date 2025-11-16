<script lang="ts">
    import { onMount } from 'svelte';
    
    let currentSchedule: any[] = [];
    let loading = true;
    let error = '';
  
    onMount(async () => {
      await fetchSchedule();
    });
  
    async function fetchSchedule() {
      loading = true;
      error = '';
      try {
        const res = await fetch('/api/student/getInfo');
        if (res.ok) {
          const data = await res.json();
          currentSchedule = data.currentSchedule || [];
        } else {
          error = 'Failed to load schedule';
        }
      } catch (err) {
        error = 'Failed to load schedule';
        console.error(err);
      } finally {
        loading = false;
      }
    }
  
    function getDayAbbreviation(day: string) {
      const dayMap: { [key: string]: string } = {
        'Monday': 'Mon',
        'Tuesday': 'Tue',
        'Wednesday': 'Wed',
        'Thursday': 'Thu',
        'Friday': 'Fri',
        'Saturday': 'Sat',
        'Sunday': 'Sun',
        'M': 'Mon',
        'T': 'Tue',
        'W': 'Wed',
        'R': 'Thu',
        'F': 'Fri',
        'MWF': 'Mon/Wed/Fri',
        'TR': 'Tue/Thu'
      };
      return dayMap[day] || day;
    }
  </script>
  
  <style>
    .calendar-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 2rem;
      font-family: 'Inter', sans-serif;
    }
    
    .page-header {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    
    .page-header h1 {
      margin: 0;
      font-size: 2.5rem;
      color: #2d3748;
      font-weight: 700;
    }
    
    .calendar-container {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    
    .schedule-list {
      display: grid;
      gap: 1rem;
    }
    
    .schedule-item {
      background: #f7fafc;
      padding: 1.5rem;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }
    
    .schedule-item h3 {
      margin: 0 0 0.5rem 0;
      color: #2d3748;
      font-size: 1.2rem;
    }
    
    .schedule-item p {
      margin: 0.25rem 0;
      color: #718096;
    }
    
    .empty-state {
      text-align: center;
      padding: 4rem;
      color: #a0aec0;
    }
    
    .loading {
      text-align: center;
      padding: 4rem;
      color: #718096;
      font-size: 1.2rem;
    }
    
    .error {
      background: #fed7d7;
      color: #c53030;
      padding: 1rem;
      border-radius: 10px;
      margin-bottom: 1rem;
    }
  </style>
  
  <div class="calendar-page">
    <div class="page-header">
      <h1>📅 Calendar</h1>
    </div>
  
    {#if error}
      <div class="error">{error}</div>
    {/if}
  
    {#if loading}
      <div class="loading">Loading your schedule...</div>
    {:else}
      <div class="calendar-container">
        {#if currentSchedule.length > 0}
          <div class="schedule-list">
            {#each currentSchedule as course}
              <div class="schedule-item">
                <h3>{course.courseId} - {course.title || 'N/A'}</h3>
                <p><strong>Days:</strong> {course.days || 'N/A'}</p>
                <p><strong>Time:</strong> {course.time || 'N/A'}</p>
                <p><strong>Credits:</strong> {course.credits || 0}</p>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty-state">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📅</div>
            <p style="font-size: 1.2rem;">No courses in your schedule</p>
            <p>Go to Dashboard to add courses to your schedule</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>