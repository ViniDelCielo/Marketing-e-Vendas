const fs = require('fs');
let code = fs.readFileSync('src/layouts/MainLayout.jsx', 'utf8');

const newCSS = `
        .sidebar { transition: width 0.3s ease; }
        .sidebar.collapsed { width: 72px !important; }
        .sidebar-brand { flex-direction: row; transition: padding 0.3s ease; }
        .sidebar.collapsed .sidebar-brand { flex-direction: column; padding: 20px 0 16px; }
        .sidebar-nav { overflow-x: hidden; }
        .sidebar.collapsed .sidebar-nav { padding: 16px 8px; }
        .nav-item { white-space: nowrap; overflow: hidden; }
        .sidebar.collapsed .nav-item { padding: 10px; justify-content: center; }
        .sidebar.collapsed .nav-item.active { border-left: none; background: rgba(99, 102, 241, 0.2); padding-left: 10px; }
        .sidebar.collapsed .nav-header { text-align: center; padding: 16px 0 6px; font-size: 0.5rem; letter-spacing: 0; }
        .sidebar.collapsed .nav-item span { display: none; }
        .sidebar.collapsed .user-info { display: none; }
`;

const targetCSS = '      `}</style>';

if (code.includes(targetCSS)) {
    code = code.replace(targetCSS, newCSS + '\n' + targetCSS);
    fs.writeFileSync('src/layouts/MainLayout.jsx', code);
    console.log('Appended CSS to end');
} else {
    // try regex
    const regex = /\s*}\s*\`\}<\/style>/;
    code = code.replace(regex, newCSS + '\n      `}</style>');
    fs.writeFileSync('src/layouts/MainLayout.jsx', code);
    console.log('Appended CSS using Regex');
}
