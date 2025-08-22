#!/usr/bin/env node

/**
 * Mock Ring Hub Server for Testing Authentication
 * This simulates Ring Hub's authentication verification process
 */

const express = require('express');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Mock Ring Hub endpoints
app.get('/trp/rings', (req, res) => {
  res.json({
    rings: [
      {
        slug: 'test-ring',
        name: 'Test Ring',
        joinPolicy: 'OPEN',
        memberCount: 0,
        postCount: 0
      }
    ],
    total: 1
  });
});

app.post('/trp/join', async (req, res) => {
  try {
    console.log('📝 Mock Ring Hub: Received join request');
    console.log('   Body:', req.body);
    console.log('   Headers:', req.headers);
    
    // Extract signature info
    const signature = req.headers.signature;
    if (!signature) {
      return res.status(401).json({ error: 'Signature header missing' });
    }
    
    console.log('   Signature:', signature);
    
    // Parse signature header
    const sigMatch = signature.match(/keyId="([^"]+)".*signature="([^"]+)"/);
    if (!sigMatch) {
      return res.status(401).json({ error: 'Invalid signature format' });
    }
    
    const [, keyId, signatureB64] = sigMatch;
    console.log('   Key ID:', keyId);
    
    // Extract DID from keyId
    const did = keyId.replace('#key-1', '');
    console.log('   DID:', did);
    
    // Try to fetch DID document (this is what Ring Hub does)
    const didDocUrl = did.replace('did:web:', 'https://').replace('%3A', ':') + '/.well-known/did.json';
    console.log('   Fetching DID document from:', didDocUrl);
    
    try {
      const didResponse = await fetch(didDocUrl);
      if (didResponse.ok) {
        const didDoc = await didResponse.json();
        console.log('✅ DID document fetched successfully');
        console.log('   Public key:', didDoc.verificationMethod[0].publicKeyMultibase);
        
        // In a real implementation, we'd verify the signature here
        // For now, just return success if we can fetch the DID doc
        res.json({
          did: req.body.userDID,
          role: 'member',
          joinedAt: new Date().toISOString()
        });
        
      } else {
        console.log('❌ DID document not accessible:', didResponse.status);
        res.status(401).json({ error: 'Cannot verify DID - document not accessible' });
      }
    } catch (didError) {
      console.log('❌ Failed to fetch DID document:', didError.message);
      res.status(401).json({ error: 'Cannot verify DID - fetch failed' });
    }
    
  } catch (error) {
    console.error('❌ Mock Ring Hub error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 3101;
app.listen(PORT, () => {
  console.log(`🚀 Mock Ring Hub server running on http://localhost:${PORT}`);
  console.log('');
  console.log('To test with this mock server:');
  console.log('1. Update RING_HUB_URL=http://localhost:3101');  
  console.log('2. Start ThreadStead: npm run dev');
  console.log('3. Test Ring Hub operations');
  console.log('');
  console.log('This will help verify:');
  console.log('- HTTP signature generation is working');
  console.log('- DID document is accessible');
  console.log('- Request format is correct');
});

module.exports = app;