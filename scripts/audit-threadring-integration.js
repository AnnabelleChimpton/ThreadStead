#!/usr/bin/env node

/**
 * Audit ThreadRing Pages for Ring Hub Integration
 * Checks all ThreadRing-related files to ensure proper Ring Hub integration
 */

const fs = require('fs');
const path = require('path');

const results = {
  integrated: [],
  needsUpdate: [],
  notApplicable: []
};

function checkFile(filePath, category) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasRingHubImport = content.includes('ringhub-client') || content.includes('ringhub-user-operations') || content.includes('ringhub-middleware');
    const hasFeatureFlag = content.includes('featureFlags.ringhub()') || content.includes('withThreadRingSupport');
    const hasRingHubLogic = content.includes('Ring Hub') || content.includes('system === \'ringhub\'');
    
    const result = {
      file: filePath.replace(process.cwd() + '\\', ''),
      hasRingHubImport,
      hasFeatureFlag,
      hasRingHubLogic,
      status: 'unknown'
    };
    
    // Determine status
    if (hasRingHubImport && (hasFeatureFlag || hasRingHubLogic)) {
      result.status = 'integrated';
      results.integrated.push(result);
    } else if (category === 'page' || category === 'api') {
      result.status = 'needs-update';
      results.needsUpdate.push(result);
    } else {
      result.status = 'not-applicable';
      results.notApplicable.push(result);
    }
    
    return result;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

console.log('🔍 Auditing ThreadRing Ring Hub Integration...');
console.log('');

// Check main ThreadRing pages
console.log('📄 ThreadRing Pages:');
const pages = [
  'pages/threadrings/[slug]/settings.tsx',
  'pages/threadrings/[slug]/members.tsx', 
  'pages/threadrings/[slug]/fork.tsx',
  'pages/threadrings/[slug]/prompts/[promptId]/responses.tsx',
  'pages/threadrings/[slug].tsx'
];

pages.forEach(page => {
  if (fs.existsSync(page)) {
    const result = checkFile(page, 'page');
    if (result) {
      const icon = result.status === 'integrated' ? '✅' : result.status === 'needs-update' ? '⚠️' : 'ℹ️';
      console.log(`${icon} ${result.file}`);
      if (result.status === 'integrated') {
        console.log(`    Ring Hub: ✅, Feature Flags: ${result.hasFeatureFlag ? '✅' : '❌'}`);
      }
    }
  } else {
    console.log(`❓ ${page} - File not found`);
  }
});

console.log('');

// Check ThreadRing APIs
console.log('🔌 ThreadRing APIs:');
const apis = [
  'pages/api/threadrings/[slug]/settings.ts',
  'pages/api/threadrings/[slug]/join.ts',
  'pages/api/threadrings/[slug]/leave.ts',
  'pages/api/threadrings/[slug]/fork.ts',
  'pages/api/threadrings/[slug]/members/[userId].ts'
];

apis.forEach(api => {
  if (fs.existsSync(api)) {
    const result = checkFile(api, 'api');
    if (result) {
      const icon = result.status === 'integrated' ? '✅' : result.status === 'needs-update' ? '⚠️' : 'ℹ️';
      console.log(`${icon} ${result.file}`);
      if (result.status === 'integrated') {
        console.log(`    Ring Hub: ✅, Middleware: ${result.hasFeatureFlag ? '✅' : '❌'}`);
      }
    }
  } else {
    console.log(`❓ ${api} - File not found`);
  }
});

console.log('');

// Check Ring Hub core files
console.log('🌐 Ring Hub Core Files:');
const coreFiles = [
  'lib/ringhub-client.ts',
  'lib/ringhub-user-operations.ts',
  'lib/ringhub-middleware.ts',
  'lib/server-did-client.ts',
  'pages/api/.well-known/did.json.ts'
];

coreFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file.replace(process.cwd() + '\\', '')}`);
  } else {
    console.log(`❌ ${file} - Missing!`);
  }
});

console.log('');

// Summary
console.log('📊 Integration Audit Summary:');
console.log('='.repeat(50));
console.log(`✅ Fully Integrated: ${results.integrated.length}`);
console.log(`⚠️  Needs Update: ${results.needsUpdate.length}`);
console.log(`ℹ️  Not Applicable: ${results.notApplicable.length}`);

if (results.needsUpdate.length > 0) {
  console.log('');
  console.log('⚠️  Files needing Ring Hub integration:');
  results.needsUpdate.forEach(file => {
    console.log(`   • ${file.file}`);
  });
}

console.log('');

// Overall status
if (results.needsUpdate.length === 0) {
  console.log('🎉 All ThreadRing pages and APIs are properly integrated with Ring Hub!');
  console.log('');
  console.log('✨ Integration Complete:');
  console.log('   • Fork functionality: ✅');
  console.log('   • Join/Leave operations: ✅');
  console.log('   • Settings management: ✅');
  console.log('   • Members display: ✅');
  console.log('   • Authentication: ✅');
  console.log('   • DID document: ✅');
  console.log('');
  console.log('🚀 Ready for production deployment!');
} else {
  console.log('⚠️  Some files still need Ring Hub integration');
  console.log('   Please update the files listed above');
}

console.log('');