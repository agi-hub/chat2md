import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

// 预处理外部图片：尝试转为 data URL，失败则替换为占位符
async function preprocessImages(container) {
  const imgs = container.querySelectorAll('img[src^="http"]');
  await Promise.all(Array.from(imgs).map(async (img) => {
    const src = img.getAttribute('src');
    try {
      // 尝试通过 canvas 转为 data URL
      const proxyImg = new Image();
      proxyImg.crossOrigin = 'anonymous';
      proxyImg.src = src;
      await new Promise((resolve, reject) => {
        proxyImg.onload = resolve;
        proxyImg.onerror = reject;
        setTimeout(reject, 5000); // 5秒超时
      });
      const canvas = document.createElement('canvas');
      canvas.width = proxyImg.naturalWidth || img.clientWidth || 200;
      canvas.height = proxyImg.naturalHeight || img.clientHeight || 150;
      canvas.getContext('2d').drawImage(proxyImg, 0, 0);
      img.setAttribute('src', canvas.toDataURL('image/png'));
    } catch (e) {
      // CORS 失败，替换为占位 div
      const placeholder = document.createElement('div');
      placeholder.style.cssText = 'display:inline-block;padding:20px;background:#f1f5f9;border:1px dashed #94a3b8;border-radius:8px;color:#64748b;font-size:14px;';
      placeholder.textContent = `[图片: ${img.getAttribute('alt') || src}]`;
      img.replaceWith(placeholder);
    }
  }));
}

// 带超时的 html2canvas
async function html2canvasWithTimeout(element, options = {}, timeoutMs = 30000) {
  return Promise.race([
    html2canvas(element, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('html2canvas 超时')), timeoutMs)
    ),
  ]);
}

// PDF 导出 - 截图后分页
export async function exportToPDF(element, filename = 'document.pdf') {
  const origOverflow = element.style.overflow;
  const origHeight = element.style.height;
  const origMaxHeight = element.style.maxHeight;

  element.style.overflow = 'visible';
  element.style.height = 'auto';
  element.style.maxHeight = 'none';

  try {
    // 预处理外部图片，避免 CORS 导致 html2canvas 挂起
    await preprocessImages(element);

    const canvas = await html2canvasWithTimeout(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 15;
    const contentWidth = pdfWidth - margin * 2;   // 180mm
    const contentHeight = pdfHeight - margin * 2;  // 267mm

    // 按宽度比例缩放，计算整体像素高度
    const scale = canvas.width / contentWidth;
    const totalPxHeight = canvas.height;
    const totalMmHeight = totalPxHeight / scale;

    // 每页能显示的最大像素高度
    const pagePxHeight = contentHeight * scale;

    let srcY = 0;     // 源图裁剪起始 Y（像素）
    let isFirst = true;

    while (srcY < totalPxHeight) {
      // 当前页实际内容高度（像素）
      const slicePxH = Math.min(pagePxHeight, totalPxHeight - srcY);
      const sliceMmH = slicePxH / scale;

      // 裁剪出当前页对应的画布区域
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.ceil(slicePxH);
      const ctx = pageCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, canvas.width, slicePxH, 0, 0, canvas.width, slicePxH);

      const pageImg = pageCanvas.toDataURL('image/jpeg', 0.92);

      if (!isFirst) pdf.addPage();
      isFirst = false;

      // 将裁剪后的图片放入页面，宽度撑满内容区，高度按比例
      pdf.addImage(pageImg, 'JPEG', margin, margin, contentWidth, sliceMmH);

      srcY += pagePxHeight;
    }

    pdf.save(filename);
  } finally {
    element.style.overflow = origOverflow;
    element.style.height = origHeight;
    element.style.maxHeight = origMaxHeight;
  }
}

// 提取节点中的纯文本内容（递归）
function extractTextRuns(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    if (!text) return [];
    return [new TextRun(text)];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const tag = node.tagName.toLowerCase();
  const kids = Array.from(node.childNodes).flatMap(extractTextRuns);

  switch (tag) {
    case 'strong':
    case 'b':
      return kids.map(r => new TextRun({ ...r.root[1], bold: true }));
    case 'em':
    case 'i':
      return kids.map(r => new TextRun({ ...r.root[1], italics: true }));
    case 'code':
      return [new TextRun({ children: kids, font: 'Courier New', size: 20 })];
    case 'a': {
      const href = node.getAttribute('href') || '';
      return [new TextRun({ children: kids, color: '4f46e5', underline: {} })];
    }
    case 'br':
      return [new TextRun({ break: 1 })];
    default:
      return kids;
  }
}

// 处理表格
function processTable(tableEl) {
  const rows = [];
  const trElements = tableEl.querySelectorAll('tr');

  trElements.forEach(tr => {
    const cells = [];
    const cellEls = tr.querySelectorAll('th, td');
    cellEls.forEach(cellEl => {
      const isHeader = cellEl.tagName.toLowerCase() === 'th';
      const textRuns = extractTextRuns(cellEl);
      if (textRuns.length === 0) {
        textRuns.push(new TextRun(cellEl.textContent || ''));
      }
      cells.push(new TableCell({
        children: [new Paragraph({
          children: isHeader
            ? textRuns.map(r => new TextRun({ children: [r], bold: true }))
            : textRuns,
        })],
        shading: isHeader ? { fill: 'f1f5f9' } : undefined,
      }));
    });
    if (cells.length > 0) {
      rows.push(new TableRow({ children: cells }));
    }
  });

  if (rows.length === 0) return null;
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

// 将 HTML 转换为 docx 段落
function htmlToDocxChildren(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements = [];

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim()) {
        return [new TextRun(node.textContent)];
      }
      return [];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return [];

    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes).flatMap(processNode);

    switch (tag) {
      case 'h1':
        elements.push(new Paragraph({ children, heading: HeadingLevel.HEADING_1 }));
        return [];
      case 'h2':
        elements.push(new Paragraph({ children, heading: HeadingLevel.HEADING_2 }));
        return [];
      case 'h3':
        elements.push(new Paragraph({ children, heading: HeadingLevel.HEADING_3 }));
        return [];
      case 'h4':
        elements.push(new Paragraph({ children, heading: HeadingLevel.HEADING_4 }));
        return [];
      case 'p':
        if (children.length > 0) {
          elements.push(new Paragraph({ children }));
        }
        return [];
      case 'hr':
        // 跳过水平分隔线，一般文档不需要
        return [];
      case 'strong':
      case 'b':
        return [new TextRun({ children, bold: true })];
      case 'em':
      case 'i':
        return [new TextRun({ children, italics: true })];
      case 'code':
        return [new TextRun({ children, font: 'Courier New', size: 20 })];
      case 'br':
        return [new TextRun({ break: 1 })];
      case 'li':
        elements.push(new Paragraph({ children, bullet: { level: 0 } }));
        return [];
      case 'ul':
      case 'ol':
        // 子 li 已在递归中处理
        return children;
      case 'blockquote':
        elements.push(new Paragraph({
          children: [new TextRun({ children, italics: true, color: '666666' })],
          indent: { left: 720 },
        }));
        return [];
      case 'table': {
        const table = processTable(node);
        if (table) {
          elements.push(table);
          elements.push(new Paragraph({ children: [] })); // 表后空行
        }
        return [];
      }
      case 'thead':
      case 'tbody':
        return children;
      case 'pre': {
        // 代码块
        const codeEl = node.querySelector('code');
        const codeText = codeEl ? codeEl.textContent : node.textContent;
        const lines = codeText.split('\n');
        lines.forEach((line, i) => {
          elements.push(new Paragraph({
            children: [new TextRun({ text: line || ' ', font: 'Courier New', size: 18 })],
            spacing: { before: 0, after: 0, line: 260 },
            indent: { left: 360 },
          }));
        });
        elements.push(new Paragraph({ children: [] }));
        return [];
      }
      case 'div':
        // mermaid 等图表跳过
        if (node.classList.contains('mermaid-block')) {
          elements.push(new Paragraph({
            children: [new TextRun({ text: '[图表]', italics: true, color: '999999' })],
          }));
          return [];
        }
        return children;
      case 'img':
        // 图片占位
        elements.push(new Paragraph({
          children: [new TextRun({ text: `[图片: ${node.getAttribute('alt') || ''}]`, italics: true, color: '999999' })],
        }));
        return [];
      case 'svg':
        elements.push(new Paragraph({
          children: [new TextRun({ text: '[SVG 图像]', italics: true, color: '999999' })],
        }));
        return [];
      default:
        return children.length ? [new TextRun({ children })] : [];
    }
  }

  Array.from(doc.body.childNodes).forEach(processNode);
  return elements;
}

// Word 导出 - 应用参考模板样式
export async function exportToWord(htmlContent, filename = 'document.docx') {
  const children = htmlToDocxChildren(htmlContent);

  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun('空文档')] }));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 }, // 11pt
          paragraph: { spacing: { line: 276, after: 120 } },
        },
        heading1: {
          run: { font: 'Calibri', size: 32, bold: true, color: '2E74B5' },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        heading2: {
          run: { font: 'Calibri', size: 26, bold: true, color: '2E74B5' },
          paragraph: { spacing: { before: 200, after: 80 } },
        },
        heading3: {
          run: { font: 'Calibri', size: 24, bold: true, color: '1F4D78' },
          paragraph: { spacing: { before: 160, after: 60 } },
        },
        heading4: {
          run: { font: 'Calibri', size: 22, bold: true, color: '1F4D78' },
          paragraph: { spacing: { before: 120, after: 40 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

// 导出 Markdown 源文件
export function exportToMarkdown(markdownText, filename = 'markdown-export.md') {
  const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, filename);
}

// 导出 HTML 文件
export function exportToHTML(htmlContent, filename = 'markdown-export.html') {
  const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; color: #1e293b; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
    h2 { border-bottom: 1px solid #e2e8f0; padding-bottom: 0.2em; }
    pre { background: #1e1e2e; color: #cdd6f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
    p > code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #e11d48; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    blockquote { margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid #4f46e5; background: #f1f5f9; }
    img { max-width: 100%; height: auto; }
    a { color: #4f46e5; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
  const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
  saveAs(blob, filename);
}
