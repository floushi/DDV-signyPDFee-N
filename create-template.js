import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createTemplatePDF() {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add a page to the document
  const page = pdfDoc.addPage([595, 842]); // A4 size
  
  // Embed the standard Helvetica font
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Draw title
  page.drawText('DVV-All-Time-Best-Media', {
    x: 50,
    y: 800,
    size: 24,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });
  
  // Draw placeholder text
  page.drawText('This is a placeholder template PDF for testing purposes.', {
    x: 50,
    y: 750,
    size: 12,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });
  
  // Add more pages to match the expected page count in pdfConfig.mjs
  // The config expects at least 4 pages (index 3)
  for (let i = 0; i < 3; i++) {
    const additionalPage = pdfDoc.addPage([595, 842]);
    additionalPage.drawText(`Page ${i + 2}`, {
      x: 50,
      y: 800,
      size: 18,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    
    // Add placeholder text for signature areas on page 4
    if (i === 2) {
      additionalPage.drawText('Signature Area - Contract', {
        x: 50,
        y: 450,
        size: 14,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
      
      additionalPage.drawText('Signature Area - Withdrawal', {
        x: 50,
        y: 300,
        size: 14,
        font: helveticaFont,
        color: rgb(0, 0, 0),
      });
    }
  }
  
  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();
  
  // Ensure the templates directory exists
  const templatesDir = path.join(__dirname, 'templates');
  try {
    await fs.mkdir(templatesDir, { recursive: true });
  } catch (error) {
    console.error('Error creating templates directory:', error);
  }
  
  // Write the PDF to a file
  const outputPath = path.join(templatesDir, 'DVV-All-Time-Best-Media.pdf');
  await fs.writeFile(outputPath, pdfBytes);
  
  console.log(`Template PDF created at: ${outputPath}`);
}

createTemplatePDF().catch(error => {
  console.error('Error creating template PDF:', error);
});
