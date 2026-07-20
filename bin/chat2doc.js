#!/usr/bin/env node

/**
 * Chat to Markdown CLI
 * 启动 Chat to Markdown 服务并在浏览器中打开
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// 解析命令行参数
const args = process.argv.slice(2);
const portArg = args.find(a => a.startsWith('--port='))?.split('=')[1];
const PORT = parseInt(portArg) || 3001;
const noOpen = args.includes('--no-open');

// 设置环境变量
process.env.PORT = String(PORT);

console.log(`
  ╔═══════════════════════════════════════╗
  ║                                       ║
  ║     💬  Chat to Markdown v0.1.0       ║
  ║     Markdown 预览及转换工具            ║
  ║                                       ║
  ╚═══════════════════════════════════════╝
`);

console.log(`正在启动服务 (端口: ${PORT})...`);

// 启动服务器
const serverProcess = exec(`node server.js`, {
  cwd: rootDir,
  env: { ...process.env, PORT: String(PORT) }
});

serverProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) console.log(output);
});

serverProcess.stderr.on('data', (data) => {
  const output = data.toString().trim();
  if (output) console.error(output);
});

serverProcess.on('error', (err) => {
  console.error('启动失败:', err.message);
  process.exit(1);
});

// 等待服务启动后打开浏览器
setTimeout(() => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n✅ Chat to Markdown 已启动: ${url}\n`);

  if (!noOpen) {
    openBrowser(url);
  } else {
    console.log('提示: 使用 --no-open 参数可跳过自动打开浏览器');
  }
}, 2000);

// 打开浏览器的跨平台实现
function openBrowser(url) {
  const platform = process.platform;
  let cmd;

  if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else {
    cmd = `xdg-open "${url}" || sensible-browser "${url}" || x-www-browser "${url}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.log(`请手动在浏览器中打开: ${url}`);
    }
  });
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭 Chat to Markdown...');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
  process.exit(0);
});
