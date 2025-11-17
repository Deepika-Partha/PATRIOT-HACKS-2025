<script lang="ts">
  import { goto } from '$app/navigation';
  
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    await goto('/login');
  }
</script>

<nav class="navbar">
  <div class="nav-container">
    <div class="nav-brand">
      <a href="/dashboard">GMU Academic Portal</a>
    </div>
    <div class="nav-links">
      <a href="/dashboard" class="nav-link">Dashboard</a>
      <a href="/schedule" class="nav-link">Calendar</a>
      <a href="/syllabus" class="nav-link">Syllabus Archive</a>
      <button class="nav-link logout-btn" on:click={handleLogout}>Log Out</button>
    </div>
  </div>
</nav>

<style>
  .navbar {
    background: white;
    padding: 1.25rem 2rem;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    border-bottom: 1px solid #e2e8f0;
    position: sticky;
    top: 0;
    z-index: 1000;
    backdrop-filter: blur(10px);
    transition: all 0.2s ease;
  }
  
  .nav-container {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .nav-brand a {
    color: #1a202c;
    font-size: 1.5rem;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.2s ease;
    letter-spacing: -0.01em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .nav-brand a:hover {
    color: #667eea;
    transform: translateY(-1px);
  }
  
  .nav-links {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .nav-link {
    color: #475569;
    text-decoration: none;
    font-weight: 500;
    padding: 0.625rem 1.25rem;
    border-radius: 12px;
    transition: all 0.2s ease;
    font-size: 0.9375rem;
    position: relative;
  }
  
  .nav-link:hover {
    background-color: #f1f5f9;
    color: #1a202c;
    transform: translateY(-1px);
  }
  
  .logout-btn {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    cursor: pointer;
    font-family: inherit;
  }
  
  .logout-btn:hover {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #b91c1c;
    transform: translateY(-1px);
  }
</style>

