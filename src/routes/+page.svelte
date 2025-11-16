<script lang="ts">
  import { goto } from '$app/navigation';
  let email = '';
  let password = '';
  let error = '';

  async function login() {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      goto('/dashboard');
    } else {
      error = data.error;
    }
  }
</script>

<div class="login-container">
  <div class="login-card">
    <div class="login-header">
      <h1>Welcome Back! 👋</h1>
      <p class="subtitle">Sign in to your GMU Academic Portal</p>
    </div>
    
    {#if error}
      <div class="error-message">
        <span class="error-icon">⚠️</span>
        <span>{error}</span>
      </div>
    {/if}
    
    <form on:submit|preventDefault={login} class="login-form">
      <div class="form-group">
        <label for="email">Email</label>
        <input 
          id="email" 
          type="email" 
          bind:value={email}
          placeholder="Enter your email"
          required
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input 
          id="password" 
          type="password" 
          bind:value={password}
          placeholder="Enter your password"
          required
        />
      </div>

      <button type="submit" class="login-btn">
        <span>Log In</span>
        <span class="btn-arrow">→</span>
      </button>
    </form>

    <p class="register-link">
      Don't have an account? <a href="/register">Create one here</a>
    </p>
  </div>
</div>

<style>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  padding: 2rem;
}

.login-card {
  background: white;
  padding: 3rem;
  border-radius: 24px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
  width: 100%;
  max-width: 440px;
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.login-header h1 {
  color: #1a202c;
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #64748b;
  font-size: 0.9375rem;
  margin: 0;
  font-weight: 400;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
  text-align: left;
}

.login-card input {
  padding: 0.875rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 0.9375rem;
  font-family: inherit;
  background: white;
  color: #1a202c;
  transition: all 0.2s ease;
  outline: none;
}

.login-card input::placeholder {
  color: #94a3b8;
}

.login-card input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.login-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  margin-top: 0.5rem;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.login-btn:active {
  transform: translateY(0);
}

.btn-arrow {
  font-size: 1.25rem;
  transition: transform 0.2s ease;
}

.login-btn:hover .btn-arrow {
  transform: translateX(4px);
}

.error-message {
  background: #fef2f2;
  border: 2px solid #fecaca;
  color: #991b1b;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: shake 0.3s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.error-icon {
  font-size: 1.125rem;
}

.register-link {
  margin-top: 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
}

.register-link a {
  color: #667eea;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease;
}

.register-link a:hover {
  color: #764ba2;
  text-decoration: underline;
}
</style>
