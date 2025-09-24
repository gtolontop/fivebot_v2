// Restart bot using the backend queue service
const http = require('http');

const botId = '5ad66b0d-b8e6-4f81-92e3-b32a518a8764';

// First stop the bot
const stopOptions = {
  hostname: 'localhost',
  port: 8000,
  path: `/api/bots/${botId}/stop`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Add a simple auth header if needed
  }
};

const stopReq = http.request(stopOptions, (res) => {
  console.log(`Stop status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Stop response:', data);
    
    // Wait 2 seconds then start the bot
    setTimeout(() => {
      const startOptions = {
        hostname: 'localhost',
        port: 8000,
        path: `/api/bots/${botId}/start`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const startReq = http.request(startOptions, (res) => {
        console.log(`\nStart status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('Start response:', data);
        });
      });

      startReq.on('error', (error) => {
        console.error('Start error:', error);
      });

      startReq.end();
    }, 2000);
  });
});

stopReq.on('error', (error) => {
  console.error('Stop error:', error);
});

stopReq.end();