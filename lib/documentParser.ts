/**
 * Utilitário de parsing e extração de texto de documentos para a Base RAG
 * Suporta PDF, TXT, MD, CSV, JSON e DOCX
 */

export interface ParsedDocument {
  fileName: string;
  fileSize: number;
  fileType: string;
  text: string;
  dataUrl?: string;
  pageCount?: number;
}

export async function parseUploadedDocument(file: File): Promise<ParsedDocument> {
  const fileName = file.name;
  const fileSize = file.size;
  const fileType = file.type || getMimeFromExtension(fileName);

  // Formato Texto Simples, Markdown, CSV, JSON
  if (
    fileType.includes('text') || 
    fileName.endsWith('.txt') || 
    fileName.endsWith('.md') || 
    fileName.endsWith('.csv') || 
    fileName.endsWith('.json')
  ) {
    const text = await file.text();
    return {
      fileName,
      fileSize,
      fileType: fileType || 'text/plain',
      text: text.trim(),
    };
  }

  // Formato PDF
  if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfText = await extractTextFromPdfBuffer(arrayBuffer);
      
      // Também converter para Data URL (para download/visualização futura se <= 5MB)
      let dataUrl: string | undefined = undefined;
      if (fileSize <= 5 * 1024 * 1024) {
        dataUrl = await fileToDataUrl(file);
      }

      return {
        fileName,
        fileSize,
        fileType: 'application/pdf',
        text: pdfText.text,
        pageCount: pdfText.pageCount,
        dataUrl,
      };
    } catch (err: any) {
      console.warn('Erro ao extrair PDF com pdfjs, usando fallback:', err);
      // Fallback básico
      const fallbackText = await extractPdfFallback(file);
      return {
        fileName,
        fileSize,
        fileType: 'application/pdf',
        text: fallbackText,
      };
    }
  }

  // Outros arquivos (tentativa de leitura como texto ou resumo)
  try {
    const text = await file.text();
    if (text && !hasBinaryGarbage(text)) {
      return {
        fileName,
        fileSize,
        fileType,
        text: text.trim(),
      };
    }
  } catch (e) {
    // Ignora
  }

  return {
    fileName,
    fileSize,
    fileType,
    text: `[Documento anexado: ${fileName} (${formatBytes(fileSize)})]`,
  };
}

async function extractTextFromPdfBuffer(arrayBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  try {
    // Importação dinâmica para evitar problemas em SSR
    const pdfjsLib = await import('pdfjs-dist');
    
    // Configurar worker se necessário
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const textPieces: string[] = [];

    for (let pageNum = 1; pageNum <= Math.min(pageCount, 100); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      
      if (pageText.trim()) {
        textPieces.push(`--- Página ${pageNum} ---\n${pageText.trim()}`);
      }
    }

    const fullText = textPieces.join('\n\n');
    return {
      text: fullText || `[PDF sem camada de texto selecionável: ${pageCount} páginas]`,
      pageCount,
    };
  } catch (err) {
    console.error('Falha no pdfjsLib:', err);
    throw err;
  }
}

async function extractPdfFallback(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(arrayBuffer);
    
    // Extrai blocos de texto entre 'BT' e 'ET' ou strings em parênteses
    const matches = raw.match(/\(([^()]{3,})\)/g);
    if (matches && matches.length > 5) {
      const clean = matches
        .map(m => m.replace(/[()]/g, ''))
        .filter(m => /^[a-zA-Z0-9\s.,;:!?-áéíóúãõçÁÉÍÓÚÃÕÇ]+$/.test(m))
        .join(' ');
      if (clean.length > 100) {
        return clean.slice(0, 5000);
      }
    }
  } catch (e) {
    // Ignora
  }
  return `[Documento PDF: ${file.name} - ${formatBytes(file.size)}]`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function hasBinaryGarbage(str: string): boolean {
  let nonPrintable = 0;
  for (let i = 0; i < Math.min(str.length, 500); i++) {
    const code = str.charCodeAt(i);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      nonPrintable++;
    }
  }
  return nonPrintable > 20;
}

function getMimeFromExtension(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'txt': return 'text/plain';
    case 'md': return 'text/markdown';
    case 'csv': return 'text/csv';
    case 'json': return 'application/json';
    case 'doc':
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return 'application/octet-stream';
  }
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
