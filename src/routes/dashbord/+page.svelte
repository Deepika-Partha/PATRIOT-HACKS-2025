<script lang="ts">
  import { onMount } from 'svelte';
  let profile = {};
  let academicHistory = [];
  let currentSchedule = [];
  let degreeProgress = {};
  let credits = {};

  let newCourse = { courseId:'', title:'', credits:0, semester:'', grade:'' };
  let newSchedule = [];

  let error = '';

  async function fetchProfile() {
    const res = await fetch('/api/student/getProfile');
    if (res.ok) {
      const data = await res.json();
      profile = data.profile;
      academicHistory = data.academicHistory;
      currentSchedule = data.currentSchedule;
      degreeProgress = data.degreeProgress;
      credits = data.credits;
    } else {
      error = 'Failed to fetch profile';
    }
  }

  async function addCourse() {
    const res = await fetch('/api/student/addCompletedCourse', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCourse)
    });
    if (res.ok) {
      academicHistory.push({...newCourse});
      newCourse = { courseId:'', title:'', credits:0, semester:'', grade:'' };
    } else {
      error = 'Failed to add course';
    }
  }

  async function updateSchedule() {
    const res = await fetch('/api/student/updateCurrentSchedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSchedule)
    });
    if (res.ok) {
      currentSchedule = [...newSchedule];
      newSchedule = [];
    } else {
      error = 'Failed to update schedule';
    }
  }

  onMount(fetchProfile);
</script>

<h1>Dashboard</h1>
{#if error}<p style="color:red">{error}</p>{/if}

<h2>Profile</h2>
<p>Name: {profile.name}</p>
<p>GMU ID: {profile.gmuId}</p>
<p>Major: {profile.major}</p>

<h2>Credits</h2>
<p>Earned: {credits.earned}</p>
<p>In Progress: {credits.inProgress}</p>
<p>Required: {credits.requiredForDegree}</p>
<p>GPA: {credits.gpa}</p>

<h2>Academic History</h2>
<ul>
  {#each academicHistory as course}
    <li>{course.courseId} - {course.title} - {course.semester} - {course.grade}</li>
  {/each}
</ul>

<h3>Add Completed Course</h3>
<input placeholder="Course ID" bind:value={newCourse.courseId}/>
<input placeholder="Title" bind:value={newCourse.title}/>
<input type="number" placeholder="Credits" bind:value={newCourse.credits}/>
<input placeholder="Semester" bind:value={newCourse.semester}/>
<input placeholder="Grade" bind:value={newCourse.grade}/>
<button on:click={addCourse}>Add Course</button>

<h2>Current Schedule</h2>
<ul>
  {#each currentSchedule as c}
    <li>{c.courseId} - {c.title} - {c.days} {c.time}</li>
  {/each}
</ul>

<h3>Edit Current Schedule</h3>
<!-- Simple example to add one course -->
<input placeholder="Course ID" bind:value={newCourse.courseId}/>
<input placeholder="Title" bind:value={newCourse.title}/>
<input placeholder="Days" bind:value={newCourse.days}/>
<input placeholder="Time" bind:value={newCourse.time}/>
<input type="number" placeholder="Credits" bind:value={newCourse.credits}/>
<button on:click={() => newSchedule.push({...newCourse})}>Add to Schedule</button>
<button on:click={updateSchedule}>Save Schedule</button>

<h2>Degree Progress</h2>
<ul>
  {#each degreeProgress.requiredCourses as c}
    <li>{c}</li>
  {/each}
  <li>Electives Remaining: {degreeProgress.electivesRemaining}</li>
  <li>Writing Intensive: {degreeProgress.writingIntensive ? 'Yes' : 'No'}</li>
</ul>
