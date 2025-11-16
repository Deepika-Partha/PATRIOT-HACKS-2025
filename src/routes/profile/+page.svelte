<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from '$app/navigation';

  let profile: any = {};
  let email = '';
  let year = 1;
  let loading = true;
  let error = "";
  let success = "";

  const majors = [
    "Computer Science",
    "Information Technology",
    "Cybersecurity",
    "Data Science",
    "Software Engineering",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Business Administration",
    "Economics",
    "Psychology",
    "Biology",
    "Chemistry",
    "Mathematics",
    "Physics"
  ];

  const years = [
    { label: "Freshman", value: 1 },
    { label: "Sophomore", value: 2 },
    { label: "Junior", value: 3 },
    { label: "Senior", value: 4 }
  ];

  onMount(async () => {
    try {
      const res = await fetch("/api/student/getInfo");
      if (res.ok) {
        const data = await res.json();
        profile = data.profile || {};
        email = data.email || '';
        year = profile.year || 1;
      } else {
        const errorData = await res.json();
        error = errorData.error || "Failed to load profile";
      }
    } catch (err) {
      console.error(err);
      error = "Error loading profile";
    } finally {
      loading = false;
    }
  });

  async function updateProfile() {
    error = '';
    success = '';
    
    if (!profile.name || !profile.gmuId || !email || !profile.major) {
      error = 'Please fill in all required fields';
      return;
    }

    try {
      const res = await fetch("/api/student/updateProfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            name: profile.name,
            gmuId: profile.gmuId,
            major: profile.major,
            minor: profile.minor || null,
            catalogYear: profile.catalogYear || 2024
          },
          email: email,
          year: year
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        success = "Profile updated successfully!";
        setTimeout(() => {
          goto('/dashboard');
        }, 1500);
      } else {
        error = data.error || "Failed to update profile";
      }
    } catch (err) {
      console.error(err);
      error = "Error updating profile";
    }
  }
</script>

<style>
  .container {
    max-width: 800px;
    margin: 2.5rem auto;
    padding: 0 2rem;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  .profile-card {
    background: white;
    border-radius: 24px;
    padding: 3rem;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.04);
  }
  
  .profile-card h1 {
    margin: 0 0 2.5rem 0;
    color: #1a202c;
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: -0.03em;
  }
  
  .form-section {
    margin-bottom: 2.5rem;
  }
  
  .form-section h2 {
    color: #1a202c;
    font-size: 1.5rem;
    margin-bottom: 1.75rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e2e8f0;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  
  .form-group {
    margin-bottom: 1.75rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.625rem;
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
  }
  
  input, select {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 0.9375rem;
    transition: all 0.2s ease;
    font-family: inherit;
    background: white;
    color: #1a202c;
  }
  
  input::placeholder {
    color: #94a3b8;
  }
  
  select {
    cursor: pointer;
  }
  
  select option {
    background: white;
    color: #1a202c;
  }
  
  input:focus, select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  }
  
  .button-group {
    display: flex;
    gap: 1rem;
    margin-top: 2.5rem;
  }
  
  .save-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.2s ease;
    flex: 1;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
  
  .save-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
  }
  
  .cancel-btn {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
    padding: 1rem 2rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.2s ease;
  }
  
  .cancel-btn:hover {
    background: #e2e8f0;
    border-color: #cbd5e0;
  }
  
  .error {
    background: #fef2f2;
    border: 2px solid #fecaca;
    color: #991b1b;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }
  
  .success {
    background: #f0fdf4;
    border: 2px solid #bbf7d0;
    color: #166534;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
  }
  
  .loading {
    text-align: center;
    padding: 5rem;
    color: #64748b;
    font-size: 1.125rem;
  }
</style>

<div style="min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%); padding: 2rem 0;">
  <div class="container">
    <div class="profile-card">
      <h1>Edit Profile</h1>
    
    {#if loading}
      <div class="loading">Loading profile...</div>
    {:else}
      {#if error}
        <div class="error">{error}</div>
      {/if}
      
      {#if success}
        <div class="success">{success}</div>
      {/if}
      
      <div class="form-section">
        <h2>Personal Information</h2>
        
        <div class="form-group">
          <label for="name">Name *</label>
          <input 
            id="name" 
            type="text" 
            bind:value={profile.name} 
            placeholder="Enter your full name"
          />
        </div>
        
        <div class="form-group">
          <label for="gmuId">GMU ID *</label>
          <input 
            id="gmuId" 
            type="text" 
            bind:value={profile.gmuId} 
            placeholder="Enter your GMU ID"
          />
        </div>
        
        <div class="form-group">
          <label for="email">Email *</label>
          <input 
            id="email" 
            type="email" 
            bind:value={email} 
            placeholder="Enter your email"
          />
        </div>
      </div>
      
      <div class="form-section">
        <h2>Academic Information</h2>
        
        <div class="form-group">
          <label for="major">Major *</label>
          <select id="major" bind:value={profile.major}>
            <option value="" disabled>Select your major</option>
            {#each majors as major}
              <option value={major}>{major}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group">
          <label for="minor">Minor (Optional)</label>
          <select id="minor" bind:value={profile.minor}>
            <option value="">None</option>
            {#each majors as major}
              <option value={major}>{major}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group">
          <label for="year">Year in College *</label>
          <select id="year" bind:value={year}>
            {#each years as yearOption}
              <option value={yearOption.value}>{yearOption.label}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group">
          <label for="catalogYear">Catalog Year</label>
          <input 
            id="catalogYear" 
            type="number" 
            bind:value={profile.catalogYear} 
            placeholder="e.g., 2024"
            min="2020"
            max="2030"
          />
        </div>
      </div>
      
      <div class="button-group">
        <button class="save-btn" on:click={updateProfile}>Save Changes</button>
        <button class="cancel-btn" on:click={() => goto('/dashboard')}>Cancel</button>
      </div>
    {/if}
    </div>
  </div>
</div>
