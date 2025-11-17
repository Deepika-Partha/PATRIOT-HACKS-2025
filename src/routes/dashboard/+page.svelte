<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let profile: any = {};
  let academicHistory: any[] = [];
  let currentSchedule: any[] = [];
  let degreeProgress: any = {};
  let credits: any = {};
  let email = '';

  let newCourse = { courseId: '', semester: '', grade: '' };
  let courseLookup: any = null;
  let lookupError = '';
  let showAddCourse = false;

  let error = '';
  let loading = true;

  // Chatbot state
  let chatbotOpen = false;
  let chatbotMessage = '';
  let chatbotHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let chatbotLoading = false;
  let chatbotHistoryLoaded = false;

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

  async function clearChatHistory() {
    if (!confirm('Are you sure you want to clear the chat history?')) {
      return;
    }

    try {
      const res = await fetch('/api/chatbot/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        chatbotHistory = [];
        chatbotHistoryLoaded = true;
      } else {
        alert('Failed to clear chat history. Please try again.');
      }
    } catch (err) {
      alert('Network error. Please try again.');
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

  async function lookupCourse() {
    if (!newCourse.courseId) {
      courseLookup = null;
      lookupError = '';
      return;
    }

    // Add a small delay to avoid too many requests while typing
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const res = await fetch(`/api/courses/lookup?number=${encodeURIComponent(newCourse.courseId)}`);
      if (res.ok) {
        courseLookup = await res.json();
        lookupError = '';
    } else {
        const errorData = await res.json();
        courseLookup = null;
        lookupError = errorData.error || `Course ${newCourse.courseId} does not exist in the course catalog`;
      }
    } catch (err) {
      courseLookup = null;
      lookupError = 'Failed to lookup course. Please try again.';
    }
  }

  async function addCompletedCourse() {
    if (!newCourse.courseId) {
      error = 'Please enter a course number';
      return;
    }

    if (!courseLookup) {
      error = 'Please enter a valid course number that exists in the catalog';
      return;
    }

    if (!newCourse.semester || !newCourse.grade) {
      error = 'Please fill in semester and grade';
      return;
    }

    const courseToAdd = {
      courseId: courseLookup.courseId,
      semester: newCourse.semester,
      grade: newCourse.grade
    };

    try {
    const res = await fetch('/api/student/addCompletedCourse', {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseToAdd)
    });
    if (res.ok) {
        await fetchStudentInfo();
        newCourse = { courseId: '', semester: '', grade: '' };
        courseLookup = null;
        lookupError = '';
        showAddCourse = false;
        error = '';
    } else {
        const errorData = await res.json();
        error = errorData.error || 'Failed to add course';
      }
    } catch (err) {
      error = 'Failed to add course';
      console.error(err);
    }
  }


  let remainingCourses: any[] = [];

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
    const completedCourseIds = academicHistory
      .filter(c => c.required)
      .map(c => c.courseId.toUpperCase());
    
    return remainingCourses.filter((c: any) => !completedCourseIds.includes(c.courseId.toUpperCase()));
  }

  function getNonCountingCourses() {
    return academicHistory.filter(c => !c.required);
  }

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

  .chatbot-header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .chatbot-clear {
    background: none;
    border: none;
    color: white;
    font-size: 14px;
    cursor: pointer;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background 0.2s;
    font-weight: 500;
  }

  .chatbot-clear:hover {
    background: rgba(255, 255, 255, 0.2);
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
            <span class="stat-value">{credits.earned || 0}</span>
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <span class="stat-label">Credits In Progress</span>
            <span class="stat-value">{credits.inProgress || 0}</span>
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <span class="stat-label">GPA</span>
            <span class="stat-value">{credits.gpa ? credits.gpa.toFixed(2) : '0.00'}</span>
          </div>
        </div>
        <div class="card">
          <div class="stat">
            <span class="stat-label">Progress</span>
            <span class="stat-value">
              {credits.requiredForDegree ? Math.round((credits.earned / credits.requiredForDegree) * 100) : 0}%
            </span>
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
            <div class="course-item" class:non-counting={!course.required}>
              <div style="flex: 1;">
                <div class="course-code">{course.courseId || 'N/A'}</div>
                <div class="course-title">{course.title || 'N/A'}</div>
                <div class="course-meta">
                  {course.semester || 'N/A'} • {course.credits || 0} credits • Grade: {course.grade || 'N/A'}
                  {#if !course.required}
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
                <input 
                  id="semester"
                  type="text" 
                  placeholder="e.g., Fall 2024"
                  bind:value={newCourse.semester}
                />
              </div>

              <div class="form-group">
                <label for="grade">Grade</label>
                <input 
                  id="grade"
                  type="text" 
                  placeholder="e.g., A, B+, C"
                  bind:value={newCourse.grade}
                />
              </div>
            {/if}

            <div class="form-actions">
              <button class="btn btn-primary" on:click={addCompletedCourse} disabled={!courseLookup}>Add Course</button>
              <button class="btn btn-secondary" on:click={() => {
                showAddCourse = false;
                newCourse = { courseId: '', semester: '', grade: '' };
                courseLookup = null;
              }}>Cancel</button>
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
          <div class="chatbot-header-actions">
            <button class="chatbot-clear" on:click={clearChatHistory}>Clear</button>
            <button class="chatbot-close" on:click={toggleChatbot}>×</button>
          </div>
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
