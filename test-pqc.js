const fs = require('fs');
const path = require('path');

async function testUpload() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'proponent@example.com', password: 'Proponent@1234' })
    });
    
    if(!loginRes.ok) {
        console.error('Login Failed', await loginRes.text());
        return;
    }
    
    const { data } = await loginRes.json();
    const token = data.token;
    console.log("Got token!", token.substring(0, 15) + '...');

    const filePath = path.join(__dirname, 'README.md');
    const fileBuffer = fs.readFileSync(filePath);
    
    const blob = new Blob([fileBuffer], { type: 'text/markdown' });
    const formData = new FormData();
    formData.append('file', blob, 'README.md');
    formData.append('docType', 'OTHER');

    const res = await fetch('http://localhost:3000/api/documents/e99c0b68-51f9-48d1-b4c8-58392502932b', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    const resData = await res.json();
    console.log("Upload response:");
    console.log(JSON.stringify(resData, null, 2));
  } catch(e) {
    console.error(e);
  }
}

testUpload();
