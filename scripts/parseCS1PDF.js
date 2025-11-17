// Script to parse CS1.pdf and extract course requirements
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfPath = path.join(__dirname, '../src/lib/assets/CS1.pdf');

async function parsePDF() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const textResult = await parser.getText();
    const text = textResult.text;
    
    console.log('PDF Text (first 10000 chars):');
    console.log(text.substring(0, 10000));
    console.log('\n\n--- Full text length:', text.length);
    
    // Save to a text file for easier inspection
    fs.writeFileSync(path.join(__dirname, '../CS1_extracted.txt'), text);
    console.log('\nExtracted text saved to CS1_extracted.txt');
    
    await parser.destroy();
  } catch (error) {
    console.error('Error:', error);
  }
}

parsePDF();

