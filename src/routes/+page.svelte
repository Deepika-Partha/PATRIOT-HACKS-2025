<script lang="ts">
  import { goto } from '$app/navigation';
</script>

<div class="container">
  <!-- Sidebar -->
  <aside class="sidebar">
    <h1>GMU Academic Portal</h1>
    <nav>
        <ul>
        <li><a href="/" class="sidebar-link">Home</a></li>
        <li><a href="/dashboard" class="sidebar-link">Dashboard</a></li>
        <li><a href="/courses" class="sidebar-link">Courses</a></li>
        <li><a href="/profile" class="sidebar-link">Profile</a></li>
        </ul>
    </nav>
    <div class="sidebar-buttons">
      <button class="login-btn" on:click={() => goto('/login')}>Log In</button>
      <button class="register-btn" on:click={() => goto('/register')}>Register</button>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="main-content">
    <div class="intro">
      <h2>Welcome to Your GMU Academic Dashboard</h2>
      <p>Track your courses, view your academic history, manage your current semester schedule, and check your degree progress—all in one place. Designed to help you succeed academically and stay organized.</p>
      <div class="main-buttons">
        <button class="login-btn" on:click={() => goto('/login')}>Log In</button>
        <button class="register-btn" on:click={() => goto('/register')}>Register</button>
      </div>
    </div>

    <!-- Feature Cards -->
    <div class="cards">
      <div class="card">
        <h3>Track Courses</h3>
        <p>View your completed courses, grades, and GPA progress in a clear, organized layout.</p>
      </div>
      <div class="card">
        <h3>Semester Schedule</h3>
        <p>Manage your current semester classes, see upcoming lectures, and plan your time efficiently.</p>
      </div>
      <div class="card">
        <h3>Degree Progress</h3>
        <p>Check remaining required courses, elective credits, and writing-intensive requirements at a glance.</p>
      </div>
    </div>
  </main>
</div>

<style>
/* General Container */
/* General Container */
.container {
  display: flex;
  height: 100vh;
  font-family: 'Inter', sans-serif;
  background-color: #F4F4F9;
}

/* Sidebar */
.sidebar {
  width: 250px;
  background-color: #2E3440; /* Dark charcoal */
  color: #ECEFF4;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-shadow: 2px 0 10px rgba(0,0,0,0.1);
}

.sidebar h1 {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 30px;
  line-height: 1.2;
  color: #FFFFFF;
}

.sidebar ul {
  list-style: none;
  padding: 0;
  flex: 1;
}

.sidebar li {
  margin-bottom: 15px;
  padding: 10px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.3s, transform 0.2s;
}

.sidebar li:hover {
  background-color: #3B4252;
  transform: translateX(3px);
}

.sidebar-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Buttons */
button {
  cursor: pointer;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  padding: 12px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.login-btn {
  background-color: #4DB6AC; /* muted teal */
  color: white;
}

.login-btn:hover {
  background-color: #43A19A;
  transform: translateY(-2px);
}

.register-btn {
  background-color: #FF6F61; /* soft coral */
  color: white;
}

.register-btn:hover {
  background-color: #E85C51;
  transform: translateY(-2px);
}

/* Main content */
.main-content {
  flex: 1;
  padding: 50px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.intro {
  text-align: center;
  margin-bottom: 40px;
}

.intro h2 {
  font-size: 2.5rem;
  color: #2E3440; /* charcoal heading */
  margin-bottom: 20px;
}

.intro p {
  color: #555; /* dark gray text */
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 20px;
}

.main-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
}

/* Cards */
.cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

@media(min-width: 768px) {
  .cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media(min-width: 1024px) {
  .cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

.card {
  background-color: #FFFFFF;
  padding: 22px;
  border-radius: 14px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.08);
  transition: all 0.3s;
}

.card:hover {
  box-shadow: 0 8px 16px rgba(0,0,0,0.12);
  transform: translateY(-4px);
}

.card h3 {
  color: #2E3440; /* heading color */
  font-size: 1.25rem;
  margin-bottom: 10px;
}

.card p {
  color: #666; /* muted gray text */
  font-size: 0.95rem;
  line-height: 1.4;
}

</style>