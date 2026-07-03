const fs = require('fs');

let file = fs.readFileSync('src/pages/Administrativo/Clientes.jsx', 'utf8');

// The file has two identical <form onSubmit={handleSave} className="modal-form"> blocks!
// Let's replace the first one with the new split layout.
// I will use regex or string manipulation to extract the contents.

// Dados part
const dadosStart = "{modalTab === 'dados' && (<>";
const dadosEnd = "</>)}";
const acessoStart = "{modalTab === 'acesso' && (";
const acessoEnd = ")}"; // This is hard to find reliably.

function refactor() {
  let content = fs.readFileSync('src/pages/Administrativo/Clientes.jsx', 'utf8');
  
  // Replace max width
  content = content.replace(/max-width: 800px/g, 'max-width: 1200px');
  
  // Remove modal tabs
  content = content.replace(/<div className="modal-tabs">[\s\S]*?<\/div>\s*<form/g, '<form');

  // We have `{modalTab === 'dados' && (<>`
  content = content.replace(/\{modalTab === 'dados' && \(\<\>/g, 
    '<div className="modal-split-layout">\n<div className="modal-col">\n<h3 className="col-title" style={{ marginTop: 0 }}><Users size={16}/> Dados do Cliente</h3>'
  );
  
  content = content.replace(/<\/>\)\}/g, ''); // closes dados
  
  // Acesso
  content = content.replace(/\{modalTab === 'acesso' && \(\s*<div className="access-tab-content">/g, 
    '<div className="access-tab-content" style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24 }}>\n<h3 className="col-title" style={{ marginTop: 0 }}><Key size={16}/> Acesso ao Sistema</h3>'
  );
  
  // We need to find the `)}` that closes acesso. It is followed by `/* Aba Serviços */`
  content = content.replace(/\)\}\s*\{\/\* Aba Serviços \*\/\}/g, 
    '</div>\n{/* Aba Serviços */}'
  );
  
  // Servicos
  content = content.replace(/\{modalTab === 'servicos' && \(/g, 
    '<div className="modal-col" style={{ paddingLeft: 32, borderLeft: "1px solid rgba(255,255,255,0.08)" }}>\n<h3 className="col-title" style={{ marginTop: 0 }}><ShieldCheck size={16}/> Serviços Contratados</h3>'
  );
  
  // The end of Servicos is `)}` followed by `<div className="modal-footer">`
  content = content.replace(/\)\}\s*<div className="modal-footer">/g, 
    '</div>\n</div>\n<div className="modal-footer">'
  );

  // Add the CSS to the bottom
  const css = `
        .modal-split-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 0; min-height: 0; overflow-y: auto; padding-right: 8px; margin-bottom: 24px; }
        .modal-col { display: flex; flex-direction: column; gap: 16px; }
        .col-title { font-size: 1.1rem; color: var(--text-main); display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; margin-bottom: 16px; }
        .modal-form { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
        .modal-footer { flex-shrink: 0; }
  `;
  content = content.replace(/<\/style>/, css + '\n      </style>');

  fs.writeFileSync('src/pages/Administrativo/Clientes.jsx', content);
  console.log('Done refactoring Clientes.jsx');
}

refactor();
