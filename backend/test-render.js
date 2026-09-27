async function testRenderBackend() {
  try {
    const res = await fetch('https://experience-backend-k4aw.onrender.com/api/v1/health', { method: 'GET' });
    console.log('Health status:', res.status);
    const text = await res.text();
    console.log('Health body:', text);
  } catch (e) {
    console.log('Render health failed:', e.message);
  }

  try {
    const res = await fetch('https://experience-backend-k4aw.onrender.com/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kunalwaghmare2005@gmail.com',
        password: 'wrongpassword',
        role: 'TRAVELER',
      }),
    });
    console.log('Render login status:', res.status);
    const data = await res.json();
    console.log('Render login body:', data);
  } catch (e) {
    console.log('Render login failed:', e.message);
  }
}

testRenderBackend().catch(console.error);
