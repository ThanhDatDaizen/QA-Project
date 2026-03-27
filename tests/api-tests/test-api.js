// tests/api-tests/test-api.js
// API Client Tests

const BASE_URL = 'http://localhost:8080/api/v1';

async function testAPI() {
    console.log('🧪 Starting API Tests...');

    // Test Health
    try {
        const health = await fetch(`${BASE_URL}/health`);
        const result = await health.text();
        console.log('✅ Health Check:', result);
    } catch (e) {
        console.error('❌ Health Check Failed:', e);
    }

    // Test Register
    try {
        const registerRes = await fetch(`${BASE_URL}/identity/enroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                academic_designation: 'Test User',
                institutional_email: 'test@example.com',
                access_secret: 'password123'
            })
        });
        const registerData = await registerRes.json();
        console.log('✅ Registration:', registerData);
    } catch (e) {
        console.error('❌ Registration Failed:', e);
    }

    console.log('🎉 API Tests Completed!');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { testAPI };
}
