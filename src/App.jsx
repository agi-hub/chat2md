import { useState, useRef, useEffect, useCallback } from 'react';
import { renderMarkdown, renderMermaidBlocks } from './utils/markdownRenderer';
import { exportToPDF, exportToWord, exportToMarkdown, exportToHTML } from './utils/exportUtils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import './App.css';

const DEMO_MD = `# Markdown 综合测试文档

欢迎使用 **Chat to Markdown** — 一个功能完整的 Markdown 预览及转换工具。

> 本文档包含：复杂公式、Mermaid 图、SVG 图、网络图片、表格、代码、URL 链接等元素。

---

## 1. URL 链接

- [GitHub](https://github.com)
- [MDN Web Docs](https://developer.mozilla.org/zh-CN/)
- [React 官方文档](https://react.dev/)
- 行内链接示例：访问 [Wikipedia](https://zh.wikipedia.org/wiki/Markdown) 了解 Markdown 语法。

---

## 2. 复杂数学公式

### 行内公式

质能方程 $E = mc^2$，欧拉公式 $e^{i\\pi} + 1 = 0$，二次方程求根 $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$。

### 块级公式

**麦克斯韦方程组（微分形式）：**

$$
\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}
$$

$$
\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
$$

**薛定谔方程：**

$$
i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\left[ -\\frac{\\hbar^2}{2m} \\nabla^2 + V(\\mathbf{r}) \\right] \\Psi(\\mathbf{r}, t)
$$

**傅里叶变换：**

$$
\\hat{f}(\\xi) = \\int_{-\\infty}^{\\infty} f(x) \\, e^{-2\\pi i x \\xi} \\, dx
$$

---

## 3. Mermaid 图表

### 流程图

\`\`\`mermaid
graph TD
    A[用户输入 Markdown] --> B{输入方式}
    B -->|粘贴文本| C[剪贴板读取]
    B -->|打开文件| D[FileReader 读取]
    C --> E[marked 解析]
    D --> E
    E --> F{内容类型}
    F -->|代码块| G[highlight.js 高亮]
    F -->|mermaid| H[mermaid 渲染]
    F -->|公式| I[KaTeX 渲染]
    F -->|普通文本| J[HTML 输出]
    G --> K[预览区展示]
    H --> K
    I --> K
    J --> K
\`\`\`

### 时序图

\`\`\`mermaid
sequenceDiagram
    participant U as 用户
    participant E as 编辑器
    participant R as 渲染引擎
    participant P as 预览区
    U->>E: 输入 Markdown
    E->>R: 触发渲染
    R->>R: 解析 KaTeX
    R->>R: 解析 Mermaid
    R->>R: 代码高亮
    R->>P: 输出 HTML
    P-->>U: 展示结果
\`\`\`

### 饼图

\`\`\`mermaid
pie title 功能完成度
    "Markdown 渲染" : 100
    "Mermaid 图表" : 100
    "KaTeX 公式" : 100
    "PDF 导出" : 90
    "Word 导出" : 85
    "代码格式化" : 95
\`\`\`

---

## 4. SVG 图像

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="380" height="180" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
  <circle cx="80" cy="100" r="50" fill="url(#grad1)" opacity="0.9"/>
  <text x="80" y="108" text-anchor="middle" fill="white" font-size="24" font-weight="bold">MD</text>
  <text x="220" y="70" text-anchor="middle" fill="#1e293b" font-size="22" font-weight="bold">Preview</text>
  <text x="220" y="100" text-anchor="middle" fill="#64748b" font-size="14">Markdown 预览及转换</text>
  <rect x="160" y="120" width="120" height="32" rx="8" fill="#4f46e5"/>
  <text x="220" y="141" text-anchor="middle" fill="white" font-size="13">开始使用 →</text>
</svg>

---

## 5. 网络图片

![仙女座星系](https://commons.wikimedia.org/wiki/Special:FilePath/Andromeda_galaxy.jpg?width=800)

---

## 6. 复杂表格

| 类别 | 功能 | 技术实现 | 状态 | 备注 |
|:------|:------|:------|:------:|:------|
| 渲染 | Markdown 解析 | [marked](https://marked.js.org/) | ✅ | GFM 支持 |
| 渲染 | 数学公式 | [KaTeX](https://katex.org/) | ✅ | 行内 + 块级 |
| 渲染 | 流程图/时序图 | [Mermaid](https://mermaid.js.org/) | ✅ | 多种图表类型 |
| 渲染 | 代码高亮 | [highlight.js](https://highlightjs.org/) | ✅ | 多语言 |
| 导出 | PDF | jsPDF + html2canvas | ✅ | 纯前端 |
| 导出 | Word | docx 库 | ✅ | 纯前端 |
| 工具 | 代码格式化 | prettier | ✅ | 多语言 |
| 交互 | 拖拽分栏 | 原生 Drag | ✅ | 20%~80% |

---

## 7. 多语言代码

\`\`\`python
# Python 示例：斐波那契数列
def fibonacci(n: int) -> list[int]:
    """生成前 n 个斐波那契数"""
    if n <= 0:
        return []
    seq = [0, 1]
    for i in range(2, n):
        seq.append(seq[i-1] + seq[i-2])
    return seq[:n]

if __name__ == "__main__":
    print(fibonacci(10))
    # 输出: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\`

\`\`\`typescript
// TypeScript 示例：泛型工具函数
type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

function tryParse<T>(json: string): Result<T> {
  try {
    const value = JSON.parse(json) as T;
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

const result = tryParse<{ name: string }>('"name": "test"');
if (result.ok) {
  console.log(result.value.name);
}
\`\`\`

\`\`\`sql
-- SQL 示例：复杂查询
SELECT 
    u.name,
    u.email,
    COUNT(o.id) AS order_count,
    COALESCE(SUM(o.amount), 0) AS total_amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 5
ORDER BY total_amount DESC
LIMIT 10;
\`\`\`

\`\`\`json
{
  "name": "chat2doc",
  "version": "1.0.0",
  "features": [
    "markdown-rendering",
    "mermaid-diagrams",
    "katex-formulas",
    "pdf-export",
    "word-export"
  ],
  "settings": {
    "theme": "light",
    "autoSave": true,
    "fontSize": 14
  }
}
\`\`\`

---

## 8. 嵌套列表与任务列表

1. **前端技术栈**
   - React 18
   - Vite 5
   - 纯前端实现
2. **渲染能力**
   - [x] Markdown 基础语法
   - [x] GFM 扩展语法
   - [x] Mermaid 图表
   - [x] KaTeX 数学公式
   - [ ] 实时协作编辑
3. **导出能力**
   - [x] PDF 导出
   - [x] Word 导出
   - [ ] Markdown 源文件导出

---

*本文档用于测试 Chat to Markdown 的各项渲染能力。*
`;

function App() {
  const [markdown, setMarkdown] = useState(DEMO_MD);
  const [html, setHtml] = useState('');
  const [exporting, setExporting] = useState('');
  const [editorVisible, setEditorVisible] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const exportMenuRef = useRef(null);
  const pasteTextareaRef = useRef(null);
  const [splitRatio, setSplitRatio] = useState(50); // 编辑器宽度百分比
  const [dragging, setDragging] = useState(false);
  const mainRef = useRef(null);
  const previewRef = useRef(null);
  const fileInputRef = useRef(null);

  // 拖拽分隔条
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e) => {
      if (!mainRef.current) return;
      const rect = mainRef.current.getBoundingClientRect();
      const ratio = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(80, Math.max(20, ratio)));
    };
    const handleMouseUp = () => setDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  // 渲染 markdown
  useEffect(() => {
    const rendered = renderMarkdown(markdown);
    setHtml(rendered);
  }, [markdown]);

  // 渲染 mermaid
  useEffect(() => {
    if (previewRef.current) {
      renderMermaidBlocks(previewRef.current);
    }
  }, [html]);

  // 打开文件
  const handleFileOpen = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setMarkdown(ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  // 粘贴处理 - 显示粘贴弹窗
  const handlePaste = useCallback(() => {
    setShowPasteModal(true);
  }, []);

  // 确认粘贴
  const confirmPaste = useCallback(() => {
    const text = pasteTextareaRef.current?.value || '';
    if (text.trim()) {
      setMarkdown(text);
    }
    setShowPasteModal(false);
  }, []);

  // 取消粘贴
  const cancelPaste = useCallback(() => {
    setShowPasteModal(false);
  }, []);

  // 点击外部关闭导出菜单
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportMenuOpen]);

  // 导出 PDF
  const handleExportPDF = useCallback(async () => {
    if (!previewRef.current) return;
    setExportMenuOpen(false);
    setExporting('pdf');
    try {
      await exportToPDF(previewRef.current, 'markdown-export.pdf');
    } catch (err) {
      alert('PDF 导出失败: ' + err.message);
    }
    setExporting('');
  }, []);

  // 从预览区提取渲染后的 mermaid 和内联 SVG，转为 PNG
  const extractImages = useCallback(async () => {
    if (!previewRef.current) return { mermaid: [], svg: [] };
    const mermaidPngs = [];
    const inlinePngs = [];

    const html2canvasMod = await import('html2canvas');
    const html2canvas = html2canvasMod.default;

    // 带超时的 html2canvas 截图
    async function captureWithTimeout(el, timeoutMs = 15000) {
      return Promise.race([
        html2canvas(el, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('截图超时')), timeoutMs)
        ),
      ]);
    }

    // SVG 序列化转 PNG（适用于普通 SVG，非 mermaid）
    async function svgElementToPng(svgEl, timeoutMs = 10000) {
      const clone = svgEl.cloneNode(true);
      const rect = svgEl.getBoundingClientRect();
      const w = rect.width || svgEl.clientWidth || svgEl.width?.baseVal?.value || 400;
      const h = rect.height || svgEl.clientHeight || svgEl.height?.baseVal?.value || 300;
      clone.setAttribute('width', w);
      clone.setAttribute('height', h);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const svgData = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      try {
        return await new Promise((resolve, reject) => {
          const img = new Image();
          const timer = setTimeout(() => {
            URL.revokeObjectURL(url);
            reject(new Error('SVG 加载超时'));
          }, timeoutMs);

          img.onload = () => {
            clearTimeout(timer);
            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = w * scale;
            canvas.height = h * scale;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => {
            clearTimeout(timer);
            URL.revokeObjectURL(url);
            reject(new Error('SVG 加载失败'));
          };
          img.src = url;
        });
      } catch (e) {
        // 序列化失败，降级为 html2canvas
        const canvas = await captureWithTimeout(svgEl.parentElement || svgEl, 10000);
        return canvas.toDataURL('image/png');
      }
    }

    // 提取 mermaid 块 → html2canvas 截图
    const mermaidBlocks = previewRef.current.querySelectorAll('.mermaid-block');
    for (const block of mermaidBlocks) {
      try {
        const canvas = await captureWithTimeout(block);
        mermaidPngs.push({ png: canvas.toDataURL('image/png') });
      } catch (e) {
        console.error('mermaid 截图失败:', e.message);
      }
    }

    // 提取内联 SVG → SVG 序列化转 PNG（排除 mermaid 和 KaTeX 内的）
    const allSvgs = previewRef.current.querySelectorAll('svg');
    const seen = new Set();
    for (const svg of allSvgs) {
      if (svg.closest('.mermaid-block') || svg.closest('.katex')) continue;
      if (seen.has(svg)) continue;
      seen.add(svg);
      try {
        const png = await svgElementToPng(svg);
        inlinePngs.push({ png });
      } catch (e) {
        console.error('内联 SVG 转 PNG 失败:', e.message);
      }
    }

    return { mermaid: mermaidPngs, svg: inlinePngs };
  }, []);

  // 检测是否在 Tauri 环境中运行
const isTauri = () => typeof window !== 'undefined' && window.__TAURI_INTERNALS__;

// 导出 Word
  const handleExportWord = useCallback(async () => {
    setExportMenuOpen(false);
    setExporting('word');
    try {
      const images = await extractImages();

      if (isTauri()) {
        // Tauri 环境：使用 Rust 后端
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke('export_word', { args: { markdown, images } });
        if (result.success && result.data) {
          // 将 base64 转为 Blob 并下载
          const byteCharacters = atob(result.data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'markdown-export.docx';
          a.click();
          URL.revokeObjectURL(url);
        } else {
          alert('Word 导出失败: ' + (result.error || '未知错误'));
        }
      } else {
        // 浏览器环境：使用 HTTP API
        const resp = await fetch('/api/export-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markdown, images }),
        });
        if (resp.ok) {
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'markdown-export.docx';
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const err = await resp.json();
          alert('Word 导出失败: ' + (err.error || '未知错误'));
        }
      }
    } catch (err) {
      if (isTauri()) {
        alert('Word 导出失败: 请确保已安装 pandoc');
      } else {
        alert('Word 导出失败: 请确保导出服务已启动 (npm run server)');
      }
    }
    setExporting('');
  }, [markdown, extractImages]);

  // 导出 Markdown
  const handleExportMarkdown = useCallback(() => {
    setExportMenuOpen(false);
    exportToMarkdown(markdown, 'markdown-export.md');
  }, [markdown]);

  // 导出 HTML — 用预览区 DOM（含已渲染的 mermaid SVG）
  const handleExportHTML = useCallback(() => {
    setExportMenuOpen(false);
    if (previewRef.current) {
      exportToHTML(previewRef.current.innerHTML, 'markdown-export.html');
    } else {
      exportToHTML(html, 'markdown-export.html');
    }
  }, [html]);

  // 导出所有图片（打包为 zip）
  const handleExportImages = useCallback(async () => {
    setExportMenuOpen(false);
    setExporting('images');
    try {
      if (!previewRef.current) return;
      const zip = new JSZip();
      let count = 0;

      // 1. mermaid SVG
      const mermaidSvgs = previewRef.current.querySelectorAll('.mermaid-block svg');
      for (const svg of mermaidSvgs) {
        const name = `mermaid-${count + 1}`;
        const svgStr = new XMLSerializer().serializeToString(svg);
        zip.file(`${name}.svg`, svgStr);
        count++;
      }

      // 2. 内联 SVG
      const allSvgs = previewRef.current.querySelectorAll('svg');
      let svgIdx = 0;
      const seen = new Set();
      for (const svg of allSvgs) {
        if (svg.closest('.mermaid-block') || svg.closest('.katex')) continue;
        if (seen.has(svg)) continue;
        seen.add(svg);
        const name = `svg-${svgIdx + 1}`;
        const svgStr = new XMLSerializer().serializeToString(svg);
        zip.file(`${name}.svg`, svgStr);
        svgIdx++;
        count++;
      }

      // 3. 网络图片
      const imgs = previewRef.current.querySelectorAll('img[src^="http"]');
      let imgIdx = 0;
      await Promise.all(Array.from(imgs).map(async (img) => {
        const src = img.getAttribute('src');
        try {
          const resp = await fetch(src);
          if (!resp.ok) return;
          const blob = await resp.blob();
          const ext = src.match(/\.(png|jpg|jpeg|gif|webp|svg)/i)?.[1]?.toLowerCase() || 'png';
          const name = `image-${imgIdx + 1}`;
          zip.file(`${name}.${ext}`, blob);
          imgIdx++;
          count++;
        } catch (e) {
          // CORS 失败则跳过
        }
      }));

      if (count === 0) {
        alert('未找到可导出的图片');
      } else {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'images-export.zip');
      }
    } catch (err) {
      alert('图片导出失败: ' + err.message);
    }
    setExporting('');
  }, []);

  return (
    <div className="app">
      {/* 顶部工具栏 */}
      <header className="toolbar">
        <div className="toolbar-left">
          <svg className="logo-icon" viewBox="0 0 48 48" width="32" height="32" aria-hidden="true">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            {/* 聊天气泡 */}
            <path
              d="M8 9 h32 a6 6 0 0 1 6 6 v18 a6 6 0 0 1 -6 6 h-24 l-9 8 v-32 a6 6 0 0 1 6 -6 z"
              fill="url(#logoGrad)"
            />
            {/* Markdown M↓ 标记 */}
            <path
              d="M14 18 v11 h2.8 v-6.2 l3.2 4.2 3.2 -4.2 v6.2 h2.8 v-11 h-2.8 l-3.2 4.2 -3.2 -4.2 z"
              fill="#ffffff"
            />
            <path d="M27 24 l3.5 3.5 l3.5 -3.5 v8 h-7 z" fill="#ffffff" />
          </svg>
          <h1 className="logo">Chat to Markdown</h1>
        </div>
        <div className="toolbar-center"></div>
        <div className="toolbar-right">
          {!editorVisible && (
            <button
              className="btn btn-show-editor"
              onClick={() => setEditorVisible(true)}
              title="显示编辑器"
            >
              ▶ 显示编辑器
            </button>
          )}
          <button className="btn btn-open" onClick={handleFileOpen}>
            📂 打开文件
          </button>
          <button className="btn btn-paste" onClick={handlePaste}>
            📥 如何导入
          </button>
          <div className="export-group" ref={exportMenuRef}>
            <button
              className="btn btn-export"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={!!exporting}
            >
              {exporting ? '导出中...' : '📥 导出'}
              <span className={`export-arrow ${exportMenuOpen ? 'open' : ''}`}>▾</span>
            </button>
            {exportMenuOpen && (
              <div className="export-dropdown">
                <button className="export-item" onClick={handleExportMarkdown}>
                  <span className="export-icon">📄</span> Markdown (.md)
                </button>
                <button className="export-item" onClick={handleExportHTML}>
                  <span className="export-icon">🌐</span> HTML (.html)
                </button>
                <button className="export-item" onClick={handleExportPDF}>
                  <span className="export-icon">📕</span> PDF (.pdf)
                </button>
                <button className="export-item" onClick={handleExportWord}>
                  <span className="export-icon">📘</span> Word (.docx)
                </button>
                <div className="export-divider"></div>
                <button className="export-item" onClick={handleExportImages}>
                  <span className="export-icon">🖼️</span> 图片 (.zip)
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </header>


      {/* 主内容区 */}
      <main
        ref={mainRef}
        className={`main-content ${editorVisible ? 'mode-split' : 'mode-preview'} ${dragging ? 'is-dragging' : ''}`}
        style={editorVisible ? { '--split-ratio': splitRatio } : undefined}
      >
        {/* 编辑器面板 */}
        {editorVisible && (
          <div className="editor-panel" style={{ flex: `0 0 ${splitRatio}%` }}>
            <div className="panel-header">
              <span>Markdown 编辑</span>
              <span className="panel-header-right">
                <span className="char-count">{markdown.length} 字符</span>
                <button
                  className="btn-collapse"
                  onClick={() => setEditorVisible(false)}
                  title="隐藏编辑器"
                >✕</button>
              </span>
            </div>
            <textarea
              className="editor"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="请粘贴 Markdown 或加载 Markdown 文件..."
              spellCheck={false}
            />
          </div>
        )}


        {/* 可拖拽分隔条 */}
        {editorVisible && (
          <div
            className="divider"
            onMouseDown={handleMouseDown}
            title="拖动调整宽度"
          >
            <div className="divider-handle"></div>
          </div>
        )}

        {/* 预览面板 */}
        <div className="preview-panel">
          <div className="panel-header">
            <span>预览</span>
          </div>
          <div
            ref={previewRef}
            className="preview markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </main>

      {/* 导入弹窗 */}
      {showPasteModal && (
        <div className="modal-overlay" onClick={cancelPaste}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img src="/demo.gif" alt="导入演示" className="modal-demo-gif" />
            <h3>如何导入 Markdown</h3>
            <p className="modal-hint">请点击 Deepseek/豆包的聊天下方的「复制」按钮，之后在本处或 Markdown 编辑框内粘贴。</p>
            <div className="modal-tip">
              <span className="modal-tip-icon">💡</span>
              <span><strong>提示：</strong>与 AI 聊天时，可让大模型用 <code>Mermaid</code> 输出流程图，用 <code>SVG 源码</code> 绘制示意图。</span>
            </div>
            <textarea
              ref={pasteTextareaRef}
              className="modal-textarea"
              placeholder="在此粘贴 Markdown 内容..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  confirmPaste();
                } else if (e.key === 'Escape') {
                  cancelPaste();
                }
              }}
            />
            <div className="modal-buttons">
              <button className="btn btn-cancel" onClick={cancelPaste}>取消</button>
              <button className="btn btn-confirm" onClick={confirmPaste}>确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
