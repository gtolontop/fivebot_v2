const fs = require('fs');
const path = require('path');

const protectedDir = path.join(__dirname, 'src', 'app', '(protected)');

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove import statement
  content = content.replace(/import\s+\{\s*DashboardLayout\s*\}\s+from\s+['"]@\/components\/layout\/DashboardLayout['"]\s*;\s*\n/g, '');

  // Remove opening tag
  content = content.replace(/<DashboardLayout>\s*/g, '');

  // Remove closing tag
  content = content.replace(/\s*<\/DashboardLayout>/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Cleaned: ${filePath}`);
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('DashboardLayout')) {
        cleanFile(filePath);
      }
    }
  });
}

console.log('🧹 Cleaning DashboardLayout from all pages...');
walkDir(protectedDir);
console.log('✨ Done!');
