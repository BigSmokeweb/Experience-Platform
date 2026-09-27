async function testRenderEndpoints() {
  const base = 'https://experience-backend-k4aw.onrender.com/api/v1';

  const expRes = await fetch(`${base}/experiences/catalog`);
  console.log('Catalog status:', expRes.status);

  const regRes = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Test User',
      role: 'TRAVELER',
    }),
  });
  console.log('Register status:', regRes.status);
  const regData = await regRes.json();
  console.log('Register body:', regData);
}

testRenderEndpoints().catch(console.error);
