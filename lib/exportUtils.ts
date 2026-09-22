import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

function convertCssLabColors(value: string): string | null {
  const labPattern = /lab\(\s*([\d.+-]+)%?\s+([\d.+-]+)%?\s+([\d.+-]+)%?(?:\s*\/\s*([\d.]+%?))?\s*\)/gi;
  if (!labPattern.test(value)) return null;
  labPattern.lastIndex = 0;

  return value.replace(labPattern, (_match, lightnessValue, aValue, bValue, alphaValue) => {
    const lightness = Math.max(0, Math.min(100, Number(lightnessValue)));
    const a = Number(aValue);
    const b = Number(bValue);
    const alpha = alphaValue ? (alphaValue.endsWith('%') ? Number(alphaValue.slice(0, -1)) / 100 : Number(alphaValue)) : 1;

  // CSS Lab uses a D50 white point. Convert Lab -> XYZ D50 -> D65 -> sRGB.
  const fy = (lightness + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;
  const finv = (value: number) => (value ** 3 > epsilon ? value ** 3 : (116 * value - 16) / kappa);
  const x = 0.96422 * finv(fx);
  const y = 1.0 * finv(fy);
  const z = 0.82521 * finv(fz);

  const d65X =  0.9555766 * x - 0.0230393 * y + 0.0631636 * z;
  const d65Y = -0.0282895 * x + 1.0099416 * y + 0.0210077 * z;
  const d65Z =  0.0122982 * x - 0.0204830 * y + 1.3299098 * z;
  const linearR =  3.2404542 * d65X - 1.5371385 * d65Y - 0.4985314 * d65Z;
  const linearG = -0.9692660 * d65X + 1.8760108 * d65Y + 0.0415560 * d65Z;
  const linearB =  0.0556434 * d65X - 0.2040259 * d65Y + 1.0572252 * d65Z;
  const toSrgb = (channel: number) => Math.round(255 * (channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055));
  const clamp = (channel: number) => Math.max(0, Math.min(255, toSrgb(channel)));

    return `rgba(${clamp(linearR)}, ${clamp(linearG)}, ${clamp(linearB)}, ${Math.max(0, Math.min(1, alpha))})`;
  });
}

function srgbFromLinear(red: number, green: number, blue: number, alpha: number) {
  const encode = (channel: number) => Math.round(255 * (channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055));
  const clamp = (channel: number) => Math.max(0, Math.min(255, encode(channel)));
  return `rgba(${clamp(red)}, ${clamp(green)}, ${clamp(blue)}, ${Math.max(0, Math.min(1, alpha))})`;
}

function convertCssOklabColors(value: string): string | null {
  const pattern = /oklab\(\s*([\d.+-]+%?)\s+([\d.+-]+%?)\s+([\d.+-]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)/gi;
  if (!pattern.test(value)) return null;
  pattern.lastIndex = 0;

  return value.replace(pattern, (_match, lightnessValue, aValue, bValue, alphaValue) => {
    const lightness = String(lightnessValue).endsWith("%") ? Number.parseFloat(lightnessValue) / 100 : Number(lightnessValue);
    const a = String(aValue).endsWith("%") ? Number.parseFloat(aValue) * 0.004 : Number(aValue);
    const b = String(bValue).endsWith("%") ? Number.parseFloat(bValue) * 0.004 : Number(bValue);
    const alpha = alphaValue ? (String(alphaValue).endsWith("%") ? Number.parseFloat(alphaValue) / 100 : Number(alphaValue)) : 1;
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return srgbFromLinear(
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
      alpha,
    );
  });
}

function convertCssOklchColors(value: string): string | null {
  const pattern = /oklch\(\s*([\d.+-]+%?)\s+([\d.+-]+%?)\s+([\d.+-]+)(?:deg)?(?:\s*\/\s*([\d.]+%?))?\s*\)/gi;
  if (!pattern.test(value)) return null;
  pattern.lastIndex = 0;

  return value.replace(pattern, (_match, lightnessValue, chromaValue, hueValue, alphaValue) => {
    const lightness = String(lightnessValue).endsWith("%") ? Number.parseFloat(lightnessValue) / 100 : Number(lightnessValue);
    const chroma = String(chromaValue).endsWith("%") ? Number.parseFloat(chromaValue) * 0.004 : Number(chromaValue);
    const hue = (Number(hueValue) * Math.PI) / 180;
    const a = chroma * Math.cos(hue);
    const b = chroma * Math.sin(hue);
    const alpha = alphaValue ? (String(alphaValue).endsWith("%") ? Number.parseFloat(alphaValue) / 100 : Number(alphaValue)) : 1;
    return convertCssOklabColors(`oklab(${lightness} ${a} ${b} / ${alpha})`) || "transparent";
  });
}

function normalizeUnsupportedColors(document: Document, root: HTMLElement) {
  const properties = [
    'color', 'backgroundColor', 'backgroundImage', 'borderTopColor', 'borderRightColor',
    'borderBottomColor', 'borderLeftColor', 'outlineColor', 'textDecorationColor',
    'fill', 'stroke', 'caretColor', 'columnRuleColor', 'textShadow', 'boxShadow',
  ] as const;

  [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))].forEach((element) => {
    const computed = document.defaultView?.getComputedStyle(element);
    if (!computed) return;

    properties.forEach((property) => {
      const value = computed[property];
      if (!value || !/lab\(/i.test(value)) return;
      const converted = convertCssOklabColors(value) || convertCssOklchColors(value) || convertCssLabColors(value);
      if (converted) element.style.setProperty(property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), converted);
    });
  });
}

/**
 * Renders an HTML element to a high-resolution Canvas.
 */
export const generateCanvasFromDOM = async (elementId: string): Promise<HTMLCanvasElement | null> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return null;
  }

  // Pre-process ECharts or specific animations if needed before capture
  const liquidBars = element.getElementsByClassName('liquid-bar');
  const originalTransitions: string[] = [];
  for (let i = 0; i < liquidBars.length; i++) {
    originalTransitions.push((liquidBars[i] as HTMLElement).style.transition);
    (liquidBars[i] as HTMLElement).style.transition = 'none';
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution (retina equivalent)
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDocument, clonedElement) => {
        normalizeUnsupportedColors(clonedDocument, clonedElement as HTMLElement);
      },
    });
    return canvas;
  } catch (error) {
    console.error('Failed to generate canvas', error);
    return null;
  } finally {
    // Restore transitions
    for (let i = 0; i < liquidBars.length; i++) {
      (liquidBars[i] as HTMLElement).style.transition = originalTransitions[i];
    }
  }
};

/**
 * Downloads a canvas as a PNG image.
 */
export const exportAsPNG = (canvas: HTMLCanvasElement, filename: string) => {
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
};

/**
 * Downloads a canvas as a JPEG image.
 */
export const exportAsJPEG = (canvas: HTMLCanvasElement, filename: string) => {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95); // High quality
  const link = document.createElement('a');
  link.download = `${filename}.jpg`;
  link.href = dataUrl;
  link.click();
};

/**
 * Generates and downloads a PDF from an array of canvas elements.
 */
export const exportAsPDF = (canvases: HTMLCanvasElement[], filename: string, orientation: 'portrait' | 'landscape' = 'portrait') => {
  if (canvases.length === 0) return;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const a4Width = orientation === 'portrait' ? 210 : 297;
  const a4Height = orientation === 'portrait' ? 297 : 210;

  canvases.forEach((canvas, index) => {
    if (index > 0) doc.addPage();
    
    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    // Calculate aspect ratio to fit into A4
    const imgProps = doc.getImageProperties(imgData);
    const pdfWidth = doc.internal.pageSize.getWidth();
    let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    // Check if it exceeds page height, adjust to fit height instead
    if (pdfHeight > a4Height) {
      pdfHeight = a4Height;
      const adjustedWidth = (imgProps.width * pdfHeight) / imgProps.height;
      // Center horizontally if scaling by height
      const xOffset = (a4Width - adjustedWidth) / 2;
      doc.addImage(imgData, 'JPEG', xOffset, 0, adjustedWidth, pdfHeight);
    } else {
      doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }
  });

  doc.save(`${filename}.pdf`);
};

/**
 * Opens a print dialog specifically rendering the canvas content.
 * This guarantees 100% fidelity since the browser is only asked to print a static image.
 */
export const printCanvas = (canvas: HTMLCanvasElement, orientation: 'portrait' | 'landscape' = 'portrait') => {
  const dataUrl = canvas.toDataURL('image/png');
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print.');
    return;
  }
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Document</title>
        <style>
          @page { size: A4 ${orientation}; margin: 0; }
          html, body { 
            margin: 0; 
            padding: 0; 
            background: white; 
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
          }
          img { 
            max-width: 100%;
            max-height: 100%;
            width: ${orientation === 'portrait' ? '210mm' : '297mm'};
            height: ${orientation === 'portrait' ? '262.5mm' : '210mm'};
            object-fit: contain; 
            display: block; 
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="setTimeout(() => { window.print(); window.close(); }, 200);" />
      </body>
    </html>
  `);
  printWindow.document.close();
};
