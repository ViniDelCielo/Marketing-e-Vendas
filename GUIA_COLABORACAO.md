# Guia de Colaboração (Git e GitHub)

Siga este passo a passo para que duas ou mais pessoas possam trabalhar no mesmo projeto (ROI Expert) usando computadores diferentes.

O repositório do projeto no GitHub é:
https://github.com/ViniDelCielo/Marketing-e-Vendas

---

## Passo 1: Dar acesso no GitHub (O dono do projeto faz)
1. Acesse o link do repositório acima pelo navegador.
2. Vá na aba **Settings** (Configurações).
3. No menu lateral, clique em **Collaborators** (Colaboradores).
4. Clique no botão verde **Add people**.
5. Digite o usuário do GitHub ou o e-mail da pessoa que vai ajudar.
6. Ela receberá um e-mail e precisará aceitar o convite para ter permissão de alterar o código.

---

## Passo 2: Configurar o computador novo (O ajudante faz)
No computador do seu ajudante, ele precisará ter o **Node.js** e o **Git** instalados. 
Depois, ele deve abrir o terminal (Pode ser o terminal do VS Code) e rodar os seguintes comandos, um por um:

1. Baixar o código:
```bash
git clone https://github.com/ViniDelCielo/Marketing-e-Vendas.git
```

2. Entrar na pasta do projeto:
```bash
cd Marketing-e-Vendas
```

3. Instalar as dependências do projeto:
```bash
npm install
```

4. Rodar o projeto localmente para testar:
```bash
npm run dev
```

---

## Passo 3: Rotina de Trabalho (O que fazer no dia a dia)

Para que o trabalho de um não apague o do outro, vocês devem usar os seguintes comandos sempre que forem trabalhar.

### Quando você terminar de alterar o código no seu computador:
Salve seu trabalho e envie para o GitHub rodando:
```bash
git add .
git commit -m "Descrição clara do que você alterou"
git push
```

### Antes de começar a trabalhar (Sempre que ligar o PC):
Sempre puxe as últimas alterações feitas pelo outro programador ANTES de começar a mexer no código, rodando:
```bash
git pull
```

---
**Resumo da regra de ouro:** 
Sempre dê `git pull` quando sentar para trabalhar, e sempre dê `git push` quando terminar o dia ou terminar uma funcionalidade!
