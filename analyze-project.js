// Project Analysis Script - Run this in your project root directory
// This will help us understand your current setup

const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing your project structure...\n');

// Function to safely read JSON files
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

// Function to check if file/directory exists
function exists(filePath) {
  return fs.existsSync(filePath);
}

// Function to get directory contents
function getDirectoryContents(dirPath, maxDepth = 2, currentDepth = 0) {
  if (!exists(dirPath) || currentDepth >= maxDepth) return [];
  
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(dirent => !dirent.name.startsWith('.') && dirent.name !== 'node_modules')
      .map(dirent => {
        const fullPath = path.join(dirPath, dirent.name);
        if (dirent.isDirectory()) {
          return {
            name: dirent.name,
            type: 'directory',
            children: getDirectoryContents(fullPath, maxDepth, currentDepth + 1)
          };
        }
        return { name: dirent.name, type: 'file' };
      });
  } catch (error) {
    return [];
  }
}

// 1. Check package.json for framework clues
console.log('📦 PACKAGE.JSON ANALYSIS:');
const packageJson = readJsonFile('package.json');
if (packageJson) {
  console.log(`  Project Name: ${packageJson.name || 'Unknown'}`);
  console.log(`  Version: ${packageJson.version || 'Unknown'}`);
  
  // Detect frontend framework
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const frameworks = {
    'react': 'React',
    'vue': 'Vue.js',
    'angular': 'Angular',
    'svelte': 'Svelte',
    'next': 'Next.js',
    'nuxt': 'Nuxt.js',
    'gatsby': 'Gatsby'
  };
  
  console.log('\n  🎨 Frontend Framework Detection:');
  const detectedFrameworks = Object.keys(frameworks).filter(key => 
    Object.keys(deps).some(dep => dep.includes(key))
  );
  
  if (detectedFrameworks.length > 0) {
    detectedFrameworks.forEach(fw => console.log(`    ✅ ${frameworks[fw]} detected`));
  } else {
    console.log('    ❓ No major frontend framework detected (might be vanilla JS/HTML)');
  }
  
  // Check for backend frameworks
  console.log('\n  🔧 Backend Framework Detection:');
  const backendFrameworks = {
    'express': 'Express.js',
    'fastify': 'Fastify',
    'koa': 'Koa.js',
    'nest': 'NestJS'
  };
  
  const detectedBackend = Object.keys(backendFrameworks).filter(key => 
    Object.keys(deps).some(dep => dep.includes(key))
  );
  
  if (detectedBackend.length > 0) {
    detectedBackend.forEach(fw => console.log(`    ✅ ${backendFrameworks[fw]} detected`));
  } else {
    console.log('    ❓ No major backend framework detected');
  }
  
  // Check for database libraries
  console.log('\n  🗄️ Database Library Detection:');
  const dbLibraries = {
    'mongoose': 'MongoDB (Mongoose)',
    'pg': 'PostgreSQL',
    'mysql': 'MySQL',
    'sqlite3': 'SQLite',
    'prisma': 'Prisma ORM',
    'sequelize': 'Sequelize ORM',
    'typeorm': 'TypeORM'
  };
  
  const detectedDB = Object.keys(dbLibraries).filter(key => 
    Object.keys(deps).some(dep => dep.includes(key))
  );
  
  if (detectedDB.length > 0) {
    detectedDB.forEach(db => console.log(`    ✅ ${dbLibraries[db]} detected`));
  } else {
    console.log('    ❓ No database libraries detected');
  }
  
  console.log('\n  📜 Scripts available:');
  if (packageJson.scripts) {
    Object.keys(packageJson.scripts).forEach(script => {
      console.log(`    ${script}: ${packageJson.scripts[script]}`);
    });
  }
} else {
  console.log('  ❌ package.json not found');
}

// 2. Check for Replit-specific files
console.log('\n🔍 REPLIT ARTIFACTS DETECTION:');
const replitFiles = ['.replit', 'replit.nix', '.upm', 'replit.json'];
const foundReplitFiles = replitFiles.filter(exists);

if (foundReplitFiles.length > 0) {
  console.log('  ⚠️ Replit artifacts found:');
  foundReplitFiles.forEach(file => console.log(`    - ${file}`));
} else {
  console.log('  ✅ No Replit artifacts detected');
}

// 3. Project structure overview
console.log('\n📁 PROJECT STRUCTURE:');
const structure = getDirectoryContents('.');
function printStructure(items, indent = '  ') {
  items.forEach(item => {
    console.log(`${indent}${item.type === 'directory' ? '📁' : '📄'} ${item.name}`);
    if (item.children && item.children.length > 0) {
      printStructure(item.children, indent + '  ');
    }
  });
}
printStructure(structure);

// 4. Check for environment files
console.log('\n🔐 ENVIRONMENT CONFIGURATION:');
const envFiles = ['.env', '.env.local', '.env.example', 'config.json'];
envFiles.forEach(file => {
  if (exists(file)) {
    console.log(`  ✅ ${file} found`);
  }
});

// 5. Check for database files
console.log('\n🗄️ DATABASE FILES:');
const dbFiles = ['database.db', 'database.sqlite', 'database.sqlite3', 'data.db'];
dbFiles.forEach(file => {
  if (exists(file)) {
    console.log(`  ✅ ${file} found`);
    try {
      const stats = fs.statSync(file);
      console.log(`    Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`    Modified: ${stats.mtime.toISOString()}`);
    } catch (error) {
      console.log(`    Could not read file stats`);
    }
  }
});

// 6. Check for Docker files
console.log('\n🐳 CONTAINERIZATION:');
const dockerFiles = ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'];
dockerFiles.forEach(file => {
  if (exists(file)) {
    console.log(`  ✅ ${file} found`);
  }
});

console.log('\n✨ Analysis complete! Use this information to plan your migration.');
console.log('\n📋 SUMMARY FOR MIGRATION PLANNING:');
console.log('1. Copy the framework detection results above');
console.log('2. Note any database files found');
console.log('3. Check if you have any .env files with important configurations');
console.log('4. Look at the project structure to understand the layout');