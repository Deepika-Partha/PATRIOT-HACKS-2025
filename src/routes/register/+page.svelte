<script lang="ts">
  import { goto } from '$app/navigation';
  let name = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let error = '';
  let success = '';

  async function register() {
    error = '';
    success = '';
    
    if (password !== confirmPassword) {
      error = "Passwords do not match";
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();

      if (data.success) {
        success = "Registration successful! Redirecting to login...";
        setTimeout(() => goto('/login'), 1500);
      } else {
        error = data.error || "Registration failed";
      }
    } catch (err) {
      console.error(err);
      error = "Server error";
    }
  }
</script>

<div class="register-container">
  <div class="register-card">
    <h2>Register</h2>
    
    {#if error}
      <p class="error">{error}</p>
    {/if}
    {#if success}
      <p class="success">{success}</p>
    {/if}
    
    <form on:submit|preventDefault={register}>
      <label for="name">Full Name</label>
      <input id="name" type="text" placeholder="Enter your full name" bind:value={name} required />

      <label for="email">Email</label>
      <input id="email" type="email" placeholder="Enter your email" bind:value={email} required />

      <label for="password">Password</label>
      <input id="password" type="password" placeholder="Enter your password" bind:value={password} required />

      <label for="confirmPassword">Confirm Password</label>
      <input id="confirmPassword" type="password" placeholder="Confirm your password" bind:value={confirmPassword} required />

      <button type="submit" class="register-btn">Register</button>
    </form>

    <p class="login-link">
      Already have an account? <a href="/">Log In</a>
    </p>
  </div>
</div>

<style>
/* Container */
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #f4f4f9, #e0e5f2);
  font-family: 'Inter', sans-serif;
}

/* Card */
.register-card {
  background-color: #ffffff;
  padding: 40px;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 450px;
  text-align: center;
}

.register-card h2 {
  color: #2E3440;
  margin-bottom: 25px;
  font-size: 1.8rem;
}

.register-card form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.register-card label {
  text-align: left;
  font-weight: 600;
  color: #555;
}

.register-card input {
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 10px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.register-card input:focus {
  border-color: #4DB6AC;
}

/* Buttons */
button.register-btn {
  padding: 12px;
  border-radius: 10px;
  border: none;
  background-color: #FF6F61;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

button.register-btn:hover {
  background-color: #E85C51;
  transform: translateY(-2px);
}

/* Messages */
.error {
  color: #FF6F61;
  margin-bottom: 10px;
  font-weight: 600;
}

.success {
  color: #4DB6AC;
  margin-bottom: 10px;
  font-weight: 600;
}

/* Links */
.login-link {
  margin-top: 15px;
  color: #555;
}

.login-link a {
  color: #4DB6AC;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
}

.login-link a:hover {
  color: #3A9189;
}
</style>
