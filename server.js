import express from 'express';
import cors from 'cors';
import { execFile } from 'child_process';
import { writeFileSync, unlinkSync, readFileSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 保存 base64 PNG data URL 到文件
function saveDataUrl(dataUrl, outputPath) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  writeFileSync(outputPath, Buffer.from(base64, 'base64'));
}

// 下载网络图片（SVG 自动转 PNG）
async function downloadImage(url, outputPath) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`下载失败: ${url} (${resp.status})`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  // 如果是 SVG，用 sharp 转为 PNG
  if (url.match(/\.svg/i) || buffer.toString('utf-8', 0, 100).includes('<svg')) {
    const pngBuffer = await sharp(buffer, { density: 200 }).png().toBuffer();
    writeFileSync(outputPath.replace(/\.svg$/i, '.png'), pngBuffer);
  } else {
    writeFileSync(outputPath, buffer);
  }
}

// Word 导出 - 使用 pandoc + reference 模板 + 图片处理
app.post('/api/export-word', async (req, res) => {
  const { markdown, images } = req.body;
  if (!markdown) {
    return res.status(400).json({ error: 'markdown 内容为空' });
  }

  // images: { mermaid: [{png}], svg: [{png}] }  — PNG 为 data URL

  const ts = Date.now();
  const workspace = join(tmpdir(), `md-workspace-${ts}`);
  mkdirSync(workspace, { recursive: true });

  const tmpMd = join(workspace, 'document.md');
  const tmpDocx = join(tmpdir(), `md-export-${ts}.docx`);
  const referenceDoc = join(__dirname, 'word_reference.docx');

  try {
    let processedMd = markdown;

    // 0. 规范化 LaTeX 公式分隔符为 pandoc 完全支持的 $ / $$
    // 先处理双反斜杠 \\[...\\] → $$...$$
    processedMd = processedMd.replace(/\\\\\[([\s\S]+?)\\\\\]/g, '$$$$$1$$$$');
    // 再处理单反斜杠 \[...\] → $$...$$
    processedMd = processedMd.replace(/\\\[([\s\S]+?)\\\]/g, '$$$$$1$$$$');
    // 先处理双反斜杠 \\(\\) → $
    processedMd = processedMd.replace(/\\\\\(([\s\S]+?)\\\\\)/g, (_, formula) => `$${formula.trim()}$`);
    // 再处理单反斜杠 \(...\) → $...$
    processedMd = processedMd.replace(/\\\(([\s\S]+?)\\\)/g, (_, formula) => `$${formula.trim()}$`);

    // 0.5 移除 Markdown 水平分隔线（---、***、___），Word 文档中不需要
    processedMd = processedMd.replace(/^[\t ]*(?:---+|\*\*\*+|___+)[\t ]*$/gm, '');

    // 1. 处理 mermaid 代码块 → PNG 图片（前端已转为 PNG data URL）
    if (images?.mermaid && images.mermaid.length > 0) {
      for (let i = 0; i < images.mermaid.length; i++) {
        const item = images.mermaid[i];
        const pngPath = join(workspace, `mermaid-${i}.png`);
        try {
          saveDataUrl(item.png, pngPath);
          const mermaidRegex = new RegExp(
            '```mermaid[\\s\\S]*?```',
            'm'
          );
          processedMd = processedMd.replace(mermaidRegex, `![Mermaid 图表 ${i + 1}](mermaid-${i}.png)`);
        } catch (e) {
          console.error(`mermaid-${i} 保存失败:`, e.message);
        }
      }
    }

    // 2. 处理内联 SVG → PNG 图片（前端已转为 PNG data URL）
    if (images?.svg && images.svg.length > 0) {
      for (let i = 0; i < images.svg.length; i++) {
        const item = images.svg[i];
        const pngPath = join(workspace, `svg-${i}.png`);
        try {
          saveDataUrl(item.png, pngPath);
          const svgRegex = /<svg[\s\S]*?<\/svg>/;
          processedMd = processedMd.replace(svgRegex, `![SVG 图像 ${i + 1}](svg-${i}.png)`);
        } catch (e) {
          console.error(`svg-${i} 保存失败:`, e.message);
        }
      }
    }

    // 3. 下载网络图片到 workspace（SVG 自动转 PNG）
    const networkImgRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
    let imgIndex = 0;
    const downloads = [];
    processedMd = processedMd.replace(networkImgRegex, (match, alt, url) => {
      const isSvg = url.match(/\.svg/i);
      const ext = isSvg ? 'png' : (url.match(/\.(png|jpg|jpeg|gif|webp)/i)?.[1]?.toLowerCase() || 'png');
      const filename = `network-${imgIndex++}.${ext}`;
      downloads.push({ url, filename, isSvg: !!isSvg });
      return `![${alt}](${filename})`;
    });

    for (const dl of downloads) {
      try {
        const resp = await fetch(dl.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = Buffer.from(await resp.arrayBuffer());
        if (dl.isSvg || buf.toString('utf-8', 0, 100).includes('<svg')) {
          // SVG → PNG
          const pngBuf = await sharp(buf, { density: 200 }).png().toBuffer();
          writeFileSync(join(workspace, dl.filename), pngBuf);
        } else {
          writeFileSync(join(workspace, dl.filename), buf);
        }
      } catch (e) {
        console.error(`下载图片失败 ${dl.url}:`, e.message);
      }
    }

    // 4. 写入处理后的 markdown
    writeFileSync(tmpMd, processedMd, 'utf-8');

    // 5. pandoc 转换
    const args = [
      tmpMd,
      '-o', tmpDocx,
      '--from', 'markdown',
      '--to', 'docx',
      `--resource-path=${workspace}`,
    ];

    if (statSync(referenceDoc)) {
      args.push('--reference-doc', referenceDoc);
    }

    await new Promise((resolve, reject) => {
      execFile('pandoc', args, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const buffer = readFileSync(tmpDocx);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="markdown-export.docx"');
    res.send(buffer);
  } catch (e) {
    console.error('导出失败:', e.message);
    res.status(500).json({ error: e.message });
  } finally {
    // 清理
    try { unlinkSync(tmpDocx); } catch {}
    try { unlinkSync(tmpMd); } catch {}
  }
});

// 服务前端静态文件
const distPath = join(__dirname, 'dist');
app.use(express.static(distPath));

// 所有其他请求返回 index.html（支持前端路由）
app.get('/{*splat}', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Chat to Markdown 服务已启动: http://localhost:${PORT}`);
});
