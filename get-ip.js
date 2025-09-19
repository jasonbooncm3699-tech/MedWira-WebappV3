#!/usr/bin/env node

const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return null;
}

const ip = getLocalIPAddress();

if (ip) {
  console.log('🌐 Your computer\'s IP address is:', ip);
  console.log('📱 For mobile testing, use: http://' + ip + ':3000');
  console.log('💡 Make sure to run: npm run dev:mobile');
} else {
  console.log('❌ Could not find IP address. Make sure you\'re connected to WiFi.');
}
