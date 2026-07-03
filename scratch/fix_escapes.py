import re
import os

file_path = r'c:\Users\HP\.gemini\antigravity\scratch\marketing-app\src\layouts\MainLayout.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace \` with `
content = content.replace(r'\`', '`')

# Replace \$ with $
content = content.replace(r'\$', '$')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Escapes fixed.")
