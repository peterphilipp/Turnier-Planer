import re
import os

files = [
    'frontend/src/components/selfservice/SelfServiceLayout.tsx',
    'frontend/src/components/layouts/AdminLayout.tsx',
    'frontend/src/components/admin/organisation/Spielplan.tsx',
    'frontend/src/components/admin/organisation/Uebersicht.tsx'
]

css_file = 'frontend/src/styles/components/admin-core.css'
css_rules = []
class_counter = 1

def style_to_css(style_str):
    if '?' in style_str or '`' in style_str or '...' in style_str:
        return None
    
    props = []
    style_str = style_str.replace('\n', ' ')
    
    # Very crude parsing
    pairs = style_str.split(',')
    for pair in pairs:
        pair = pair.strip()
        if not pair:
            continue
        if ':' not in pair:
            return None
        key, val = pair.split(':', 1)
        key = key.strip()
        val = val.strip().strip("'").strip('"')
        
        # ignore variables
        if not key.isidentifier():
            return None
            
        key_kebab = re.sub(r'(?<!^)(?=[A-Z])', '-', key).lower()
        
        if val.isdigit():
            val = val + 'px'
        
        props.append(f"  {key_kebab}: {val};")
        
    return "\n".join(props) if props else None

for file in files:
    try:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file}: {e}")
        continue
    
    def replacer(match):
        global class_counter
        style_content = match.group(1)
        css_props = style_to_css(style_content)
        
        if css_props:
            class_name = f"admin-core-style-{class_counter}"
            class_counter += 1
            css_rules.append(f".{class_name} {{\n{css_props}\n}}")
            # preserve original string if classname replacement isn't what they want
            return f'className="{class_name}"'
        else:
            return match.group(0)
            
    new_content = re.sub(r'style=\{\{\s*([^}]+?)\s*\}\}', replacer, content)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_content)

with open(css_file, 'a', encoding='utf-8') as f:
    f.write("\n\n".join(css_rules))

print(f"Generated {len(css_rules)} rules.")
