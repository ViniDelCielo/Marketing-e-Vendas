const fs = require('fs');
let c = fs.readFileSync('src/layouts/MainLayout.jsx', 'utf8');

c = c.replace(
  'Menu, X, Package, Settings, Bell, HelpCircle',
  'Menu, X, Package, Settings, Bell, HelpCircle, Cloud'
);

const target = "{ name: 'Cadastro de Clientes e Colaboradores', path: '/administrativo', icon: <Shield size={20} />, service: null, managerAccessible: true },";
const replacement = target + "\n  { name: 'Conectividade de APIs', path: '/conectividade-apis', icon: <Cloud size={20} />, service: null, ownerOnly: true },";

c = c.replace(target, replacement);

fs.writeFileSync('src/layouts/MainLayout.jsx', c, 'utf8');
