import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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
