async function testLogin() {
  const res = await fetch('http://localhost:4000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'kunalwaghmare2005@gmail.com',
      password: 'wrongpassword123',
      role: 'TRAVELER',
    }),
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Body:', data);
}
testLogin().catch(console.error);
