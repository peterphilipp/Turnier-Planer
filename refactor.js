const fs = require('fs');

const files = [
  'c:/Users/peter.PHILIPP/Documents/GitHub/TSV Holm Planungs Tool/frontend/src/components/admin/stammdaten/Vereine.tsx',
  'c:/Users/peter.PHILIPP/Documents/GitHub/TSV Holm Planungs Tool/frontend/src/components/admin/stammdaten/WorkAreaCategories.tsx',
  'c:/Users/peter.PHILIPP/Documents/GitHub/TSV Holm Planungs Tool/frontend/src/components/admin/stammdaten/WorkAreas.tsx'
];

let globalCss = '';

function toKebabCase(str) {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase().replace(/^-/, '');
}

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let prefix = file.includes('Vereine') ? 'vereine' : file.includes('WorkAreaCategories') ? 'wa-categories' : 'work-areas';
  
  let counter = 1;
  const styleRegex = /style=\{\{([^}]+)\}\}/g;
  
  content = content.replace(styleRegex, (match, inner) => {
    // Attempt to handle dynamic variables, spreads, and ternaries by ignoring them for now
    if (inner.includes('...') || inner.match(/[a-zA-Z]+\./) || inner.includes('?') || inner.includes('adminPrimary') || inner.includes('club.')) {
      return match;
    }
    
    // Parse simple styles
    const styles = inner.split(',').map(s => s.trim()).filter(Boolean);
    const cssRules = [];
    let isValid = true;
    for (const style of styles) {
      const parts = style.split(':');
      if (parts.length < 2) {
        isValid = false; break;
      }
      const key = parts[0].trim();
      let value = parts.slice(1).join(':').trim();
      
      // Remove quotes
      if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      } else if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (!isNaN(value)) {
        value = value + 'px'; // assume px for numbers
      } else {
        isValid = false; break;
      }
      cssRules.push(`  ${toKebabCase(key)}: ${value};`);
    }
    
    if (isValid && cssRules.length > 0) {
      const className = `${prefix}-style-${counter++}`;
      globalCss += `.${className} {\n${cssRules.join('\n')}\n}\n\n`;
      return `className="${className}"`;
    }
    
    return match;
  });
  
  fs.writeFileSync(file, content, 'utf8');
});

fs.writeFileSync('c:/Users/peter.PHILIPP/Documents/GitHub/TSV Holm Planungs Tool/frontend/src/components/admin/stammdaten/generated.css', globalCss, 'utf8');
console.log('CSS Generated Successfully');
