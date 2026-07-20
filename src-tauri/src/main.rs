#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::process::Command;
use tempfile::TempDir;
use uuid::Uuid;

#[derive(Deserialize, Clone)]
struct ImageItem {
    png: String, // data URL: data:image/png;base64,xxxx
}

#[derive(Deserialize)]
struct ExportWordArgs {
    markdown: String,
    images: Option<ImageSets>,
}

#[derive(Deserialize)]
struct ImageSets {
    mermaid: Option<Vec<ImageItem>>,
    svg: Option<Vec<ImageItem>>,
}

#[derive(Serialize)]
struct ExportResult {
    success: bool,
    data: Option<String>, // base64 encoded docx
    error: Option<String>,
}

/// 将 data URL 解码为字节
fn decode_data_url(data_url: &str) -> Result<Vec<u8>, String> {
    let base64_part = data_url
        .split(',')
        .nth(1)
        .ok_or("无效的 data URL 格式")?;
    BASE64
        .decode(base64_part)
        .map_err(|e| format!("Base64 解码失败: {}", e))
}

/// 保存 PNG 数据到文件
fn save_png_to_file(data_url: &str, path: &std::path::Path) -> Result<(), String> {
    let bytes = decode_data_url(data_url)?;
    fs::write(path, &bytes).map_err(|e| format!("写入文件失败: {}", e))
}

#[tauri::command]
fn export_word(args: ExportWordArgs) -> ExportResult {
    let tmp_dir = TempDir::new().map_err(|e| ExportResult {
        success: false,
        data: None,
        error: Some(format!("创建临时目录失败: {}", e)),
    });

    let tmp_dir = match tmp_dir {
        Ok(d) => d,
        Err(e) => return e,
    };

    let mut processed_md = args.markdown.clone();
    let workspace = tmp_dir.path();

    // 处理 mermaid 图片
    if let Some(mermaid_images) = &args.images.as_ref().and_then(|i| i.mermaid.as_ref()) {
        for (i, item) in mermaid_images.iter().enumerate() {
            let filename = format!("mermaid-{}.png", i);
            let png_path = workspace.join(&filename);
            if let Err(e) = save_png_to_file(&item.png, &png_path) {
                eprintln!("mermaid-{} 保存失败: {}", i, e);
                continue;
            }
            // 替换对应的 mermaid 代码块
            let regex_pattern = format!(r"```mermaid[\s\S]*?```");
            if let Ok(re) = regex_lite::Regex::new(&regex_pattern) {
                let replacement = format!("![Mermaid 图表 {}]({})", i + 1, filename);
                processed_md = re.replace(&processed_md, replacement).to_string();
            }
        }
    }

    // 处理内联 SVG 图片
    if let Some(svg_images) = &args.images.as_ref().and_then(|i| i.svg.as_ref()) {
        for (i, item) in svg_images.iter().enumerate() {
            let filename = format!("svg-{}.png", i);
            let png_path = workspace.join(&filename);
            if let Err(e) = save_png_to_file(&item.png, &png_path) {
                eprintln!("svg-{} 保存失败: {}", i, e);
                continue;
            }
            // 替换内联 SVG
            if let Ok(re) = regex_lite::Regex::new(r"<svg[\s\S]*?</svg>") {
                let replacement = format!("![SVG 图像 {}]({})", i + 1, filename);
                processed_md = re.replace(&processed_md, replacement).to_string();
            }
        }
    }

    // 写入处理后的 markdown
    let md_path = workspace.join("document.md");
    if let Err(e) = fs::write(&md_path, &processed_md) {
        return ExportResult {
            success: false,
            data: None,
            error: Some(format!("写入 Markdown 失败: {}", e)),
        };
    }

    // 输出文件路径
    let output_filename = format!("export-{}.docx", Uuid::new_v4());
    let output_path = workspace.join(&output_filename);

    // 查找 reference doc（打包后在资源目录中）
    let reference_doc = std::path::Path::new("word_reference.docx");
    let has_reference = reference_doc.exists();

    // 执行 pandoc
    let mut cmd = Command::new("pandoc");
    cmd.arg(&md_path)
        .arg("-o")
        .arg(&output_path)
        .arg("--from")
        .arg("markdown")
        .arg("--to")
        .arg("docx")
        .arg(format!("--resource-path={}", workspace.display()));

    if has_reference {
        cmd.arg("--reference-doc").arg(reference_doc);
    }

    let output = cmd.output();

    match output {
        Ok(result) => {
            if !result.status.success() {
                let stderr = String::from_utf8_lossy(&result.stderr);
                return ExportResult {
                    success: false,
                    data: None,
                    error: Some(format!("pandoc 执行失败: {}", stderr)),
                };
            }

            // 读取生成的 docx
            match fs::read(&output_path) {
                Ok(docx_bytes) => {
                    let base64_data = BASE64.encode(&docx_bytes);
                    ExportResult {
                        success: true,
                        data: Some(base64_data),
                        error: None,
                    }
                }
                Err(e) => ExportResult {
                    success: false,
                    data: None,
                    error: Some(format!("读取导出文件失败: {}", e)),
                },
            }
        }
        Err(e) => ExportResult {
            success: false,
            data: None,
            error: Some(format!("无法执行 pandoc: {}。请确保已安装 pandoc。", e)),
        },
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![export_word])
        .run(tauri::generate_context!())
        .expect("启动 Chat to Markdown 失败");
}
