async function testThrottler() {
  for (let i = 1; i <= 7; i++) {
    const res = await fetch('http://localhost:4000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kunalwaghmare2005@gmail.com',
        password: 'wrongpassword',
        role: 'TRAVELER',
      }),
    });
    console.log(`Req ${i}: status = ${res.status}`);
    const data = await res.json();
    console.log(`Req ${i} body:`, data);
  }
}
testThrottler().catch(console.error);
