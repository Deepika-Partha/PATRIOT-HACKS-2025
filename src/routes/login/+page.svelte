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
    <h2>Log In</h2>
    {#if error}
      <p class="error">{error}</p>
    {/if}
    <form on:submit|preventDefault={login}>
      <label for="email">Email</label>
      <input id="email" type="email" bind:value={email} />

      <!-- <input type="email" placeholder="Enter your email" bind:value={email} required /> -->

      <label for="password">Password</label>
      <input id="password" type="password" bind:value={password} />

      <!-- <input type="password" placeholder="Enter your password" bind:value={password} required /> -->

      <button type="submit" class="login-btn">Log In</button>
    </form>

    <p class="register-link">
      Don't have an account? <a href="/register">Register</a>

    </p>
  </div>
</div>

<style>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #f4f4f9, #e0e5f2);
  font-family: 'Inter', sans-serif;
}

.login-card {
  background-color: #ffffff;
  padding: 40px;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.login-card h2 {
  color: #2E3440;
  margin-bottom: 25px;
  font-size: 1.8rem;
}

.login-card form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.login-card label {
  text-align: left;
  font-weight: 600;
  color: #555;
}

.login-card input {
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 10px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.login-card input:focus {
  border-color: #4DB6AC; /* teal accent */
}

button.login-btn {
  padding: 12px;
  border-radius: 10px;
  border: none;
  background-color: #4DB6AC; /* teal */
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

button.login-btn:hover {
  background-color: #43A19A;
  transform: translateY(-2px);
}

.error {
  color: #FF6F61;
  margin-bottom: 10px;
  font-weight: 600;
}

.register-link {
  margin-top: 15px;
  color: #555;
}

.register-link a {
  color: #FF6F61;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
}

.register-link a:hover {
  color: #E85C51;
}
</style>