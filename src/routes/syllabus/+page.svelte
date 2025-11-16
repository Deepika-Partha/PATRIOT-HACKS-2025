<script lang="ts">
  import { onMount } from 'svelte';
  
  let syllabi: any[] = [];
  let loading = true;
  let error = '';
  let showUploadModal = false;
  let uploading = false;
  let viewingSyllabus: any = null;
  
  let newSyllabus = {
    courseId: '',
    courseName: '',
    semester: '',
    year: new Date().getFullYear(),
    file: null as File | null
  };

  const semesters = ['Fall', 'Spring', 'Summer'];
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

  onMount(async () => {
    await fetchSyllabi();
  });

  async function fetchSyllabi() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/syllabus/list');
      if (res.ok) {
        syllabi = await res.json();
        // Group by semester
        syllabi.sort((a, b) => {
          const semOrder: { [key: string]: number } = { 'Fall': 3, 'Spring': 2, 'Summer': 1 };
          if (a.year !== b.year) return b.year - a.year;
          return (semOrder[b.semester] || 0) - (semOrder[a.semester] || 0);
        });
      } else {
        error = 'Failed to load syllabi';
      }
    } catch (err) {
      error = 'Failed to load syllabi';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      newSyllabus.file = target.files[0];
    }
  }

  async function uploadSyllabus() {
    if (!newSyllabus.courseId || !newSyllabus.courseName || !newSyllabus.semester || !newSyllabus.file) {
      error = 'Please fill in all fields and select a file';
      return;
    }

    uploading = true;
    error = '';

    try {
      const formData = new FormData();
      formData.append('courseId', newSyllabus.courseId);
      formData.append('courseName', newSyllabus.courseName);
      formData.append('semester', newSyllabus.semester);
      formData.append('year', newSyllabus.year.toString());
      formData.append('file', newSyllabus.file);

      const res = await fetch('/api/syllabus/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        await fetchSyllabi();
        showUploadModal = false;
        newSyllabus = {
          courseId: '',
          courseName: '',
          semester: '',
          year: new Date().getFullYear(),
          file: null
        };
        error = '';
      } else {
        const data = await res.json();
        error = data.error || 'Failed to upload syllabus';
      }
    } catch (err) {
      error = 'Failed to upload syllabus';
      console.error(err);
    } finally {
      uploading = false;
    }
  }

  function getSemesterKey(syllabus: any) {
    return `${syllabus.semester} ${syllabus.year}`;
  }

  function getGroupedSyllabi() {
    const grouped: { [key: string]: any[] } = {};
    syllabi.forEach(s => {
      const key = getSemesterKey(s);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  }

  async function deleteSyllabus(id: string) {
    if (!confirm('Are you sure you want to delete this syllabus?')) return;

    try {
      const res = await fetch(`/api/syllabus/delete/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await fetchSyllabi();
      } else {
        error = 'Failed to delete syllabus';
      }
    } catch (err) {
      error = 'Failed to delete syllabus';
      console.error(err);
    }
  }

  function viewSyllabus(syllabus: any) {
    viewingSyllabus = syllabus;
  }

  function closeViewer() {
    viewingSyllabus = null;
  }
</script>

<style>
  .syllabus-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
    padding: 2.5rem 2rem;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  .page-header {
    background: white;
    border-radius: 20px;
    padding: 2.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.04);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .page-header h1 {
    margin: 0;
    font-size: 2.5rem;
    color: #1a202c;
    font-weight: 700;
    letter-spacing: -0.03em;
  }
  
  .upload-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
  
  .upload-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
  }
  
  .semester-group {
    background: white;
    border-radius: 20px;
    padding: 2.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.04);
  }
  
  .semester-header {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1a202c;
    margin-bottom: 1.75rem;
    padding-bottom: 1.25rem;
    border-bottom: 2px solid #e2e8f0;
    letter-spacing: -0.02em;
  }
  
  .syllabus-list {
    display: grid;
    gap: 1rem;
  }
  
  .syllabus-item {
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 12px;
    border-left: 4px solid #667eea;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s ease;
    border: 1px solid #e2e8f0;
  }
  
  .syllabus-item:hover {
    background: #f1f5f9;
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
  
  .syllabus-info h3 {
    margin: 0 0 0.5rem 0;
    color: #1a202c;
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  
  .syllabus-info p {
    margin: 0;
    color: #64748b;
    font-size: 0.875rem;
  }
  
  .syllabus-actions {
    display: flex;
    gap: 1rem;
  }
  
  .btn {
    padding: 0.625rem 1.25rem;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 0.875rem;
    letter-spacing: 0.01em;
  }
  
  .btn-view {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
  
  .btn-view:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
  }
  
  .btn-delete {
    background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(245, 101, 101, 0.3);
  }
  
  .btn-delete:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(245, 101, 101, 0.4);
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
  
  .viewer-modal {
    background: white;
    border-radius: 24px;
    padding: 0;
    max-width: 90vw;
    width: 90vw;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .viewer-header {
    padding: 1.75rem 2.5rem;
    border-bottom: 2px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .viewer-header h2 {
    margin: 0;
    color: #1a202c;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  
  .viewer-close {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #475569;
    padding: 0.625rem 1.25rem;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .viewer-close:hover {
    background: #e2e8f0;
    border-color: #cbd5e0;
  }
  
  .viewer-content {
    flex: 1;
    overflow: auto;
    padding: 2rem;
    background: #f8fafc;
  }
  
  .viewer-iframe {
    width: 100%;
    height: 70vh;
    border: none;
    border-radius: 12px;
    background: white;
  }
  
  .viewer-fallback {
    text-align: center;
    padding: 4rem;
    color: #64748b;
  }
  
  .viewer-fallback a {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
  }
  
  .viewer-fallback a:hover {
    text-decoration: underline;
  }
  
  .download-link {
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 0.875rem 1.75rem;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }
  
  .download-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
  }
  
  .modal h2 {
    margin: 0 0 2rem 0;
    color: #1a202c;
    font-size: 1.875rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
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
    font-family: inherit;
    background: white;
    color: #1a202c;
    transition: all 0.2s ease;
  }
  
  input::placeholder {
    color: #94a3b8;
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
  
  .file-input {
    padding: 1.25rem;
    border: 2px dashed #cbd5e0;
    border-radius: 12px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #f8fafc;
  }
  
  .file-input:hover {
    border-color: #667eea;
    background: #f1f5f9;
  }
  
  .modal-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
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
  
  .error {
    background: #fef2f2;
    border: 2px solid #fecaca;
    color: #991b1b;
    padding: 1rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
  
  .empty-state {
    text-align: center;
    padding: 4rem;
    color: #94a3b8;
  }
  
  .loading {
    text-align: center;
    padding: 5rem;
    color: #64748b;
    font-size: 1.125rem;
  }
</style>

<div class="syllabus-page">
  <div class="page-header">
    <h1>📚 Syllabus Archive</h1>
    <button class="upload-btn" on:click={() => showUploadModal = true}>+ Upload Syllabus</button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if loading}
    <div class="loading">Loading syllabi...</div>
  {:else if syllabi.length === 0}
    <div class="empty-state">
      <div style="font-size: 4rem; margin-bottom: 1rem;">📄</div>
      <p style="font-size: 1.2rem;">No syllabi uploaded yet</p>
      <p>Click "Upload Syllabus" to get started</p>
    </div>
  {:else}
    {#each Object.entries(getGroupedSyllabi()) as [semesterKey, semesterSyllabi]}
      <div class="semester-group">
        <div class="semester-header">{semesterKey}</div>
        <div class="syllabus-list">
          {#each semesterSyllabi as syllabus}
            <div class="syllabus-item">
              <div class="syllabus-info">
                <h3>{syllabus.courseId} - {syllabus.courseName}</h3>
                <p>Uploaded: {new Date(syllabus.uploadedAt).toLocaleDateString()}</p>
              </div>
              <div class="syllabus-actions">
                <button class="btn btn-view" on:click={() => viewSyllabus(syllabus)}>View</button>
                <button class="btn btn-delete" on:click={() => deleteSyllabus(syllabus._id)}>Delete</button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}

  {#if showUploadModal}
    <div 
      class="modal-overlay" 
      role="button"
      tabindex="0"
      on:click={() => showUploadModal = false}
      on:keydown={(e) => e.key === 'Escape' && (showUploadModal = false)}
      aria-label="Close modal"
    >
      <div 
        class="modal" 
        on:click|stopPropagation
        role="dialog"
        aria-modal="true"
        aria-labelledby="syllabus-modal-title"
        tabindex="0"
        on:keydown={(e) => e.key === 'Escape' && (showUploadModal = false)}
      >
        <h2 id="syllabus-modal-title">Upload Syllabus</h2>
        
        <div class="form-group">
          <label for="course-id">Course ID</label>
          <input id="course-id" type="text" bind:value={newSyllabus.courseId} placeholder="e.g., CS 101" />
        </div>
        
        <div class="form-group">
          <label for="course-name">Course Name</label>
          <input id="course-name" type="text" bind:value={newSyllabus.courseName} placeholder="e.g., Introduction to Computer Science" />
        </div>
        
        <div class="form-group">
          <label for="semester">Semester</label>
          <select id="semester" bind:value={newSyllabus.semester}>
            <option value="">Select semester</option>
            {#each semesters as sem}
              <option value={sem}>{sem}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group">
          <label for="year">Year</label>
          <select id="year" bind:value={newSyllabus.year}>
            {#each years as y}
              <option value={y}>{y}</option>
            {/each}
          </select>
        </div>
        
        <div class="form-group">
          <label for="file-upload">File</label>
          <div class="file-input">
            <input id="file-upload" type="file" accept=".pdf,.doc,.docx" on:change={handleFileSelect} />
            {#if newSyllabus.file}
              <p style="margin-top: 0.5rem; color: #48bb78;">Selected: {newSyllabus.file.name}</p>
            {/if}
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-secondary" on:click={() => showUploadModal = false} disabled={uploading}>Cancel</button>
          <button class="btn btn-primary" on:click={uploadSyllabus} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Syllabus Viewer Modal -->
  {#if viewingSyllabus}
    <div 
      class="modal-overlay" 
      role="button"
      tabindex="0"
      on:click={closeViewer}
      on:keydown={(e) => e.key === 'Escape' && closeViewer()}
      aria-label="Close viewer"
    >
      <div 
        class="viewer-modal" 
        on:click|stopPropagation
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewer-title"
        tabindex="0"
        on:keydown={(e) => e.key === 'Escape' && closeViewer()}
      >
        <div class="viewer-header">
          <h2 id="viewer-title">{viewingSyllabus.courseId} - {viewingSyllabus.courseName}</h2>
          <button class="viewer-close" on:click={closeViewer}>Close</button>
        </div>
        <div class="viewer-content">
          {#if viewingSyllabus.fileType === 'application/pdf' || viewingSyllabus.fileUrl.startsWith('data:application/pdf') || viewingSyllabus.fileName?.endsWith('.pdf')}
            <iframe 
              src={viewingSyllabus.fileUrl} 
              class="viewer-iframe"
              title="Syllabus Viewer"
            ></iframe>
          {:else if viewingSyllabus.fileType?.includes('image') || viewingSyllabus.fileUrl.startsWith('data:image')}
            <img src={viewingSyllabus.fileUrl} alt={viewingSyllabus.courseName} style="max-width: 100%; height: auto;" />
          {:else}
            <div class="viewer-fallback">
              <p style="font-size: 1.2rem; margin-bottom: 1rem;">This file type cannot be previewed in the browser.</p>
              <p style="margin-bottom: 1rem; color: #718096;">File: {viewingSyllabus.fileName || 'Unknown'}</p>
              <a href={viewingSyllabus.fileUrl} download={viewingSyllabus.fileName} class="download-link">
                Download {viewingSyllabus.fileName}
              </a>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

