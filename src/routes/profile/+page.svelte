<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from '$app/navigation';

  let student: any = { name: "", email: "", major: "", year: 1 };
  let loading = true;
  let error = "";

  const majors = [
    "Computer Science",
  ];

  const years = [
    { label: "Freshman", value: 1 },
    { label: "Sophomore", value: 2 },
    { label: "Junior", value: 3 },
    { label: "Senior", value: 4 }
  ];

    onMount(async () => {
        try {
        const res = await fetch("/api/student/getInfo"); // ✅ correct route URL
        if (res.ok) {
            student = await res.json();
            console.log("Loaded student:", student);
        } else {
            const data = await res.json();
            error = data.error || "Failed to load profile";
        }
        } catch (err) {
        console.error(err);
        error = "Error loading profile";
        } finally {
        loading = false;
        }
    });


  async function updateProfile() {
    console.log("Updating with:", { major: student.major, year: student.year });
    
    try {
      const res = await fetch("/api/student/updateProfile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ major: student.major, year: student.year })
      });
      
      const data = await res.json();
      console.log("Response:", data);
      
      if (res.ok) {
        alert("Profile updated successfully!");
      } else {
        alert("Failed to update: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error updating profile");
    }
  }
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
        <li><a href="/profile" class="sidebar-link active">Profile</a></li>
      </ul>
    </nav>
  </aside>

  <!-- Main Content -->
  <main class="main-content">
    {#if loading}
      <p>Loading profile...</p>
    {:else if error}
      <p class="error">{error}</p>
    {:else}
      <div class="profile-card">
        <h2>Edit Your Profile</h2>
        
        <div class="info-section">
          <h3>Account Information</h3>
          <div class="info-item">
            <span class="label">Name:</span>
            <span class="value">{student.name}</span>
          </div>
          <div class="info-item">
            <span class="label">Email:</span>
            <span class="value">{student.email}</span>
          </div>
        </div>

        <div class="form-section">
          <h3>Academic Information</h3>
          
          <div class="form-group">
            <label for="major">Major</label>
            <select id="major" bind:value={student.major}>
              <option value="" disabled>Select your major</option>
              {#each majors as major}
                <option value={major}>{major}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label for="year">Year</label>
            <select id="year" bind:value={student.year}>
              <option value="" disabled>Select your year</option>
              {#each years as yearOption}
                <option value={yearOption.value}>{yearOption.label}</option>
              {/each}
            </select>
          </div>

          <button class="save-btn" on:click={updateProfile}>Save Changes</button>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
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
    background-color: #2E3440;
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

  .sidebar-link {
    color: #ECEFF4;
    text-decoration: none;
  }

  .sidebar-link.active {
    font-weight: 700;
  }

  /* Main content */
  .main-content {
    flex: 1;
    padding: 50px;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .error {
    color: #FF6F61;
    font-size: 1.1rem;
  }

  /* Profile Card */
  .profile-card {
    background-color: #FFFFFF;
    padding: 40px;
    border-radius: 14px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.08);
    max-width: 700px;
  }

  .profile-card h2 {
    font-size: 2rem;
    color: #2E3440;
    margin-bottom: 30px;
  }

  .info-section {
    background-color: #F4F4F9;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 30px;
  }

  .info-section h3 {
    color: #2E3440;
    font-size: 1.2rem;
    margin-bottom: 15px;
  }

  .info-item {
    display: flex;
    margin-bottom: 10px;
  }

  .info-item .label {
    font-weight: 600;
    color: #555;
    width: 80px;
  }

  .info-item .value {
    color: #2E3440;
  }

  .form-section h3 {
    color: #2E3440;
    font-size: 1.2rem;
    margin-bottom: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #555;
  }

  select {
    width: 100%;
    padding: 12px;
    font-size: 1rem;
    border: 2px solid #ddd;
    border-radius: 10px;
    background-color: white;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  select:hover {
    border-color: #999;
  }

  select:focus {
    outline: none;
    border-color: #4DB6AC;
  }

  /* Button */
  .save-btn {
    cursor: pointer;
    font-weight: 600;
    border: none;
    border-radius: 10px;
    padding: 12px 30px;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    background-color: #4DB6AC;
    color: white;
    width: 100%;
    font-size: 1rem;
    margin-top: 10px;
  }

  .save-btn:hover {
    background-color: #43A19A;
    transform: translateY(-2px);
  }
</style>
