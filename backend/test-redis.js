const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('🔄 Testing Redis connection...');
  console.log('Host:', '83.150.218.42');
  console.log('Port:', 40121);
  console.log('Password:', 'REDACTED_PASSWORD');

  const client = new Redis({
    host: '83.150.218.42',
    port: 40121,
    password: 'REDACTED_PASSWORD',
    retryStrategy: (times) => {
      if (times > 3) {
        console.error('❌ Failed to connect after 3 retries');
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      console.log(`⏳ Retry ${times}, waiting ${delay}ms...`);
      return delay;
    },
  });

  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err.message);
  });

  client.on('connect', () => {
    console.log('✅ Redis connected successfully!');
  });

  client.on('ready', () => {
    console.log('✅ Redis is ready to accept commands');
  });

  try {
    // Test PING
    console.log('\n📡 Testing PING...');
    const pong = await client.ping();
    console.log('✅ PING response:', pong);

    // Test SET
    console.log('\n📝 Testing SET...');
    await client.set('test_key', 'Hello from FiveBot!');
    console.log('✅ SET successful');

    // Test GET
    console.log('\n📖 Testing GET...');
    const value = await client.get('test_key');
    console.log('✅ GET result:', value);

    // Test DELETE
    console.log('\n🗑️  Testing DEL...');
    await client.del('test_key');
    console.log('✅ DEL successful');

    // Get server info
    console.log('\n📊 Getting Redis server info...');
    const info = await client.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    console.log('✅ Redis version:', version);

    console.log('\n🎉 All tests passed! Redis is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await client.quit();
    console.log('\n👋 Connection closed');
    process.exit(0);
  }
}

testRedisConnection();
