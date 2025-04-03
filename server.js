console.log("[DEBUG] Starting server.js execution..."); // Log start

import express from 'express';
console.log("[DEBUG] Imported express");
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
console.log("[DEBUG] Imported pdf-lib");
import { promises as fs } from 'fs';
console.log("[DEBUG] Imported fs.promises");
import path from 'path';
console.log("[DEBUG] Imported path");
import { fileURLToPath } from 'url';
console.log("[DEBUG] Imported url.fileURLToPath");
import { v4 as uuidv4 } from 'uuid';
console.log("[DEBUG] Imported uuid");
import { dataUriToBuffer } from 'data-uri-to-buffer';
console.log("[DEBUG] Imported data-uri-to-buffer");
import multer from 'multer';
console.log("[DEBUG] Imported multer");
import pdfConfig from './pdfConfig.mjs';
console.log("[DEBUG] Imported pdfConfig.mjs");
import fontkit from '@pdf-lib/fontkit'; // Restored
console.log("[DEBUG] Imported @pdf-lib/fontkit");
import dotenv from 'dotenv';
console.log("[DEBUG] Imported dotenv");
import { Storage } from '@google-cloud/storage'; // Added for GCS
console.log("[DEBUG] Imported @google-cloud/storage");


// --- Global Try/Catch for early errors ---
try {
    console.log("[DEBUG] Entering global try block...");

    // Load environment variables
    try {
        dotenv.config();
        console.log("[DEBUG] dotenv.config() executed");
    } catch (dotenvError) {
        console.error("[DEBUG] Error executing dotenv.config():", dotenvError);
    }

    // --- Google Cloud Storage Configuration ---
    // Make storage and BUCKET_NAME global so they can be accessed from anywhere
    global.storage = null;
    global.BUCKET_NAME = null;
    global.MAKE_PUBLIC = false;
    
    try {
        global.storage = new Storage(); // Assumes authentication is handled by the environment (e.g., Cloud Run Service Account)
        console.log("[DEBUG] Instantiated GCS Storage");
    } catch (gcsError) {
        console.error("[DEBUG] FATAL ERROR instantiating GCS Storage:", gcsError);
        process.exit(1); // Exit if GCS client fails to initialize
    }
    // Corrected environment variable name to match Cloud Run settings
    global.BUCKET_NAME = process.env.GCP_BUCKET_NAME; // Required env var: Your GCS bucket name 
    console.log(`[DEBUG] GCP_BUCKET_NAME: ${global.BUCKET_NAME}`); // Log the correct variable name
    global.MAKE_PUBLIC = process.env.GCS_MAKE_PUBLIC === 'true'; // Optional: Set to 'true' to make files public
    console.log(`[DEBUG] GCS_MAKE_PUBLIC: ${global.MAKE_PUBLIC}`); // This one might be optional or named differently, keeping as is for now

    if (!global.BUCKET_NAME) {
        // Corrected error message
        console.error("[DEBUG] FATAL ERROR: GCP_BUCKET_NAME environment variable is not set."); 
        process.exit(1); // Exit if bucket name is not configured
    }
    // --- End GCS Configuration ---

    // Define __dirname using import.meta.url (standard for ES Modules)
    let __dirname;
    try {
        __dirname = path.dirname(fileURLToPath(import.meta.url));
        console.log(`[DEBUG] __dirname set to: ${__dirname}`);
    } catch (pathSetupError) {
        console.error("[DEBUG] FATAL ERROR setting up __dirname:", pathSetupError);
        process.exit(1);
    }

    let PDF_STORE_PATH;
    try {
        PDF_STORE_PATH = path.join(__dirname, 'pdfStore.json');
        console.log(`[DEBUG] PDF_STORE_PATH set to: ${PDF_STORE_PATH}`);
    } catch(pathError) {
         console.error("[DEBUG] FATAL ERROR setting PDF_STORE_PATH:", pathError);
         process.exit(1);
    }


    // API Key middleware
    const apiKeyAuth = (req, res, next) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== process.env.API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    };
    console.log("[DEBUG] Defined apiKeyAuth middleware");


    /**
     * Adds signature and fields to a PDF page
 * @param {PDFPage} page - The PDF page to add content to
 * @param {Object} signatureConfig - Configuration for signature placement
 * @param {string} signatureData - Base64 encoded signature image data
 * @param {Object} fields - Text fields to add to the page
 * @param {PDFDocument} pdfDoc - The PDF document instance
 * @param {PDFFont} helveticaFont - The embedded Helvetica font
 */
async function addSignatureToPage(page, signatureConfig, signatureData, fields, pdfDoc, helveticaFont) {
    try {
        const spacing = 25; // Spacing between fields
        const startY = signatureConfig.textBlockY;
        let currentY = startY;

        // Draw title in bold
        page.drawText(signatureConfig.label.text, {
            x: 150,
            y: currentY,
            size: 12,
            font: helveticaFont,
            color: rgb(0, 0, 0)
        });
        currentY -= spacing;

        // Draw text fields in order
        const fieldOrder = ['fullName', 'email', 'location', 'date'];
        fieldOrder.forEach((fieldName) => {
            const value = fields[fieldName];
            const labelText = pdfConfig.labels[fieldName].text;
            
            // Draw label
            page.drawText(labelText, {
                x: 150,
                y: currentY,
                size: 12,
                font: helveticaFont,
                color: rgb(0, 0, 0)
            });

            // Draw value
            page.drawText(value, {
                x: 250,
                y: currentY,
                size: 12,
                font: helveticaFont,
                color: rgb(0, 0, 0)
            });
            currentY -= spacing;
        });

        // Handle signatures based on what's provided
        if (fields.keyboardSignature?.text) {
            // Draw keyboard signature
            const fontPath = fields.keyboardSignature.font === 'DancingScript-Regular' 
                ? path.join(__dirname, 'public', 'fonts', 'DancingScript-Regular.ttf')
                : path.join(__dirname, 'public', 'fonts', 'BarlowSemiCondensed-Regular.ttf');
            
            const fontBytes = await fs.readFile(fontPath);
            // Restore fontkit usage
            const keyboardFont = await pdfDoc.embedFont(fontBytes, { subset: true }); 

            page.drawText('Unterschrift per Tastatur:', {
                x: 150,
                y: currentY,
                size: 12,
                font: helveticaFont,
                color: rgb(0, 0, 0)
            });
            currentY -= spacing;

            page.drawText(fields.keyboardSignature.text, {
                x: 150,
                y: currentY,
                size: 16,  // Increased from 12 to 16 (approximately 1em)
                font: keyboardFont,
                color: rgb(0, 0, 0)
            });
            currentY -= spacing;
        }
        
        if (signatureData) {
            // Draw signature pad label
            page.drawText('Unterschrift Signaturfeld:', {
                x: 150,
                y: currentY,
                size: 12,
                font: helveticaFont,
                color: rgb(0, 0, 0)
            });
            currentY -= spacing;

            // Draw signature pad image
            const signatureImageBytes = Buffer.from(signatureData.split(',')[1], 'base64');
            const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
            
            page.drawImage(signatureImage, {
                x: signatureConfig.x,
                y: signatureConfig.y,
                width: signatureConfig.width,
                height: signatureConfig.height,
            });
        }
    } catch (error) {
        throw new Error(`Fehler beim Einfügen der Unterschrift: ${error.message}`);
    }
}
console.log("[DEBUG] Defined addSignatureToPage function");

let app;
try {
    app = express();
    console.log("[DEBUG] Initialized express app");
} catch (expressError) {
     console.error("[DEBUG] FATAL ERROR initializing express app:", expressError);
     process.exit(1);
}

// --- Port Configuration ---
// Cloud Run provides the port to listen on via the PORT environment variable.
// Fallback removed to ensure strict adherence to the Cloud Run environment.
const port = process.env.PORT; 
if (!port) {
    console.error("FATAL ERROR: PORT environment variable is not set.");
    process.exit(1); // Exit if port is not configured (required by Cloud Run)
}
// --- End Port Configuration ---
console.log(`[DEBUG] Port configured: ${port}`);

try {
    app.use(express.json());
    console.log("[DEBUG] Applied express.json middleware");
    app.use(express.urlencoded({ extended: true }));
    console.log("[DEBUG] Applied express.urlencoded middleware");
    app.use(express.static('public'));
    console.log("[DEBUG] Applied express.static middleware for 'public' directory");
} catch (middlewareError) {
    console.error("[DEBUG] FATAL ERROR applying base middleware:", middlewareError);
    process.exit(1);
}


// Multer configuration for file uploads
let upload;
try {
    const multerStorage = multer.memoryStorage(); // Store the file in memory
    upload = multer({ storage: multerStorage });
    console.log("[DEBUG] Configured multer middleware");
} catch (multerError) {
    console.error("[DEBUG] FATAL ERROR configuring multer:", multerError);
    process.exit(1);
}


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for Google Cloud Run
app.get('/_health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Server is running'
    });
});

// Add route for base sign page (no PDF)
app.get('/sign', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sign.html'));
});

// Serve the signing page with PDF
app.get('/sign/:pdfId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sign.html'));
});

// Add a new endpoint to get PDF URL by ID
app.get('/api/pdf/:pdfId', async (req, res) => {
    try {
        const pdfId = req.params.pdfId;
        const pdfData = pdfStore[pdfId];
        
        if (!pdfData || !pdfData.pdfUrl) {
            return res.status(404).json({ error: 'PDF nicht gefunden oder ungültige ID.' });
        }
        
        // Download the PDF from GCS
        const pdfBytes = await downloadPdfFromGcs(pdfData.pdfUrl);
        
        // Send the PDF directly
        res.contentType('application/pdf');
        res.send(pdfBytes);
    } catch (error) {
        console.error('Error serving PDF:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve the initial template PDF
app.get('/template', async (req, res) => {
    try {
        const templatePath = path.join(__dirname, 'templates', 'DVV-All-Time-Best-Media.pdf');
        
        // Check if file exists locally first
        try {
            await fs.access(templatePath);
            const templateBytes = await fs.readFile(templatePath);
            res.contentType('application/pdf');
            res.send(templateBytes);
        } catch (fileError) {
            // If template doesn't exist locally, check if it exists in GCS
            try {
                if (!global.BUCKET_NAME) {
                    throw new Error('GCP_BUCKET_NAME environment variable is not set');
                }
                
                const templateGcsPath = 'templates/DVV-All-Time-Best-Media.pdf';
                const [exists] = await global.storage.bucket(global.BUCKET_NAME).file(templateGcsPath).exists();
                
                if (exists) {
                    const [templateBytes] = await global.storage.bucket(global.BUCKET_NAME).file(templateGcsPath).download();
                    res.contentType('application/pdf');
                    res.send(templateBytes);
                    console.log(`Served template PDF from GCS: ${templateGcsPath}`);
                } else {
                    // Neither local nor GCS template exists
                    throw new Error('Template PDF not found in local filesystem or GCS');
                }
            } catch (gcsError) {
                console.error('Error accessing template in GCS:', gcsError);
                res.status(404).json({ error: 'Template PDF not found' });
            }
        }
    } catch (error) {
        console.error('Error serving template PDF:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fixed webhook URL
const WEBHOOK_URL = 'https://hook.eu2.make.com/shqssx7au2d7m7fu4hz86qiojoh65k40';

// Initialize pdfStore globally - it will be populated asynchronously after server start
let pdfStore = {};

// Async function to load the initial PDF store data
async function loadInitialPdfStore() {
    try {
        // Try to load from local file first (for development/fallback)
        try {
            const data = await fs.readFile(PDF_STORE_PATH, 'utf8');
            pdfStore = JSON.parse(data);
            console.log('PDF store loaded successfully from local file.');
            return;
        } catch (localError) {
            // If local file doesn't exist or can't be read, try GCS
            if (localError.code !== 'ENOENT') {
                console.warn('Warning: Error reading local pdfStore.json:', localError.message);
            }
        }

        // Try to load from GCS
        if (global.BUCKET_NAME) {
            const storeFile = global.storage.bucket(global.BUCKET_NAME).file('config/pdfStore.json');
            const [exists] = await storeFile.exists();
            
            if (exists) {
                const [content] = await storeFile.download();
                pdfStore = JSON.parse(content.toString('utf8'));
                console.log('PDF store loaded successfully from GCS.');
            } else {
                console.log('pdfStore.json not found in GCS, starting with an empty store.');
                pdfStore = {};
                // Create the initial file in GCS
                await storeFile.save(JSON.stringify({}), {
                    contentType: 'application/json'
                });
            }
        } else {
            console.warn('GCP_BUCKET_NAME not set, cannot load pdfStore from GCS.');
            pdfStore = {};
        }
    } catch (error) {
        // Log critical error, but allow server to continue running
        console.error('CRITICAL: Error loading PDF store on startup:', error);
        pdfStore = {}; // Start with empty store as fallback
    }
}

// Function to save the PDF store
async function savePdfStore() {
    const storeContent = JSON.stringify(pdfStore, null, 2);
    
    try {
        // Try to save to GCS first
        if (global.BUCKET_NAME) {
            const storeFile = global.storage.bucket(global.BUCKET_NAME).file('config/pdfStore.json');
            await storeFile.save(storeContent, {
                contentType: 'application/json'
            });
            console.log('PDF store saved to GCS successfully.');
        }
        
        // Also try to save locally as fallback/for development
        try {
            await fs.writeFile(PDF_STORE_PATH, storeContent, 'utf8');
            console.log('PDF store saved to local file successfully.');
        } catch (localError) {
            console.warn('Warning: Could not save pdfStore to local file:', localError.message);
            // Not critical if GCS save succeeded
        }
    } catch (error) {
        console.error('Error saving PDF store:', error);
        
        // If GCS save failed but we haven't tried local save yet, try local save as fallback
        if (error.message.includes('GCS') || error.code) {
            try {
                await fs.writeFile(PDF_STORE_PATH, storeContent, 'utf8');
                console.log('PDF store saved to local file as fallback.');
            } catch (localError) {
                console.error('CRITICAL: Failed to save PDF store to both GCS and local file.');
            }
        }
    }
}

app.post('/api/pdf-upload', apiKeyAuth, upload.single('pdf'), async (req, res) => {
    try {
        let pdfBytes;
        if (req.file) {
            // PDF file uploaded
            pdfBytes = req.file.buffer;
        } else if (req.body.base64) {
            // Base64 data provided
            pdfBytes = dataUriToBuffer(req.body.base64);
        } else {
            return res.status(400).send("No PDF file or base64 data provided");
        }

        const pdfId = uuidv4();
        // Define a destination path within the bucket (e.g., in an 'uploads' folder)
        const destinationFilename = `uploads/uploaded_${pdfId}.pdf`; 

        // Upload to GCS using the new function
        const pdfUrl = await storePdfInBucket(pdfBytes, destinationFilename); 

        const signUrl = `/sign/${pdfId}`;

        // Parse die webhookUrl aus den formData-Feldern
        const webhookUrlField = req.body.webhookUrl;
        
        // Parse die URL um die Parameter zu extrahieren
        const webhookUrl = new URL(webhookUrlField);
        const vorname = webhookUrl.searchParams.get('vorname');
        const card_id = webhookUrl.searchParams.get('card_id');
        const email = webhookUrl.searchParams.get('email');

        // Store the GCS URL/URI and other relevant data. No need for local filename.
        pdfStore[pdfId] = {
            pdfUrl, // This now holds the GCS URL/URI
            signUrl,
            webhookUrl: WEBHOOK_URL,
            vorname: vorname || null,
            card_id: card_id || null,
            email: email || null
        };

        await savePdfStore(); // Save updated store to file

        res.json({ pdfUrl, signUrl });

    } catch (error) {
        console.error('Error processing PDF upload:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/pdf-config', async (req, res) => {
    try {
        const {
            fullName,
            location,
            email,
            signature,
            withdrawalSignature,
            withdrawalAccepted,
            date
        } = req.body;

        if (!fullName || !location || !email || !signature) {
            return res.status(400).json({ error: 'Alle Felder müssen ausgefüllt werden.' });
        }

        if (withdrawalAccepted && !withdrawalSignature) {
            return res.status(400).json({ error: 'Unterschrift für das Erlöschen des Widerrufsrechts fehlt.' });
        }

        // Load the template PDF
        let templateBytes;
        const templatePath = path.join(__dirname, 'templates', 'DVV-All-Time-Best-Media.pdf');
        
        try {
            // Try to load from local file first
            templateBytes = await fs.readFile(templatePath);
            console.log('Template PDF loaded from local file');
        } catch (fileError) {
            // If local file doesn't exist, try to load from GCS
            console.log('Template not found locally, trying GCS...');
            try {
                const templateGcsPath = 'templates/DVV-All-Time-Best-Media.pdf';
                const [exists] = await global.storage.bucket(global.BUCKET_NAME).file(templateGcsPath).exists();
                
                if (exists) {
                    [templateBytes] = await global.storage.bucket(global.BUCKET_NAME).file(templateGcsPath).download();
                    console.log(`Template PDF loaded from GCS: ${templateGcsPath}`);
                } else {
                    throw new Error('Template PDF not found in local filesystem or GCS');
                }
            } catch (gcsError) {
                console.error('Error accessing template in GCS:', gcsError);
                throw new Error('Template PDF not found in local filesystem or GCS');
            }
        }
        
        const pdfDoc = await PDFDocument.load(templateBytes);
        pdfDoc.registerFontkit(fontkit); // Restored
        const pages = pdfDoc.getPages();
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const textFields = {
            fullName,
            email,
            location,
            date: date || new Date().toLocaleDateString('de-DE')
        };

        // Add withdrawal signature to page 9
        if (withdrawalAccepted && withdrawalSignature) {
            try {
                await addSignatureToPage(
                    pages[pdfConfig.withdrawalSignature.page],
                    pdfConfig.withdrawalSignature,
                    withdrawalSignature,
                    textFields,
                    pdfDoc,
                    helveticaFont
                );
            } catch (error) {
                console.error("Fehler beim Einfügen der Widerrufsunterschrift:", error);
                res.status(500).json({ error: "Fehler beim Einfügen der Widerrufsunterschrift: " + error.message });
                return;
            }
        }

        // Add contract signature to page 10
        if (signature) {
            try {
                await addSignatureToPage(
                    pages[pdfConfig.contractSignature.page],
                    pdfConfig.contractSignature,
                    signature,
                    textFields,
                    pdfDoc,
                    helveticaFont
                );
            } catch (error) {
                console.error("Fehler beim Einfügen der Vertragsunterschrift:", error);
                res.status(500).json({ error: "Fehler beim Einfügen der Vertragsunterschrift: " + error.message });
                return;
            }
        }

        const pdfBytes = await pdfDoc.save();
        // Define a destination path within the bucket (e.g., in a 'contracts' folder)
        const destinationFilename = `contracts/ausbildungsvertrag_${uuidv4()}.pdf`; 

        // Upload to GCS using the new function
        const pdfUrl = await storePdfInBucket(pdfBytes, destinationFilename); 
        
        res.json({ pdfUrl }); // Return the GCS URL/URI

        // Send webhook notification
        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'signed',
                    pdfUrl,
                    timestamp: new Date().toISOString()
                }),
            });
            
            if (!response.ok) {
                console.error(`Webhook failed: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error sending webhook:', error);
        }

    } catch (error) {
        console.error('Fehler bei der PDF-Konfiguration:', error);
        res.status(500).json({ error: error.message });
    }
});

// Handle PDF signing
// Note: The '/api/pdf/:pdfId' GET route has been removed as PDFs are now served directly from GCS URLs/URIs
app.post('/api/sign', async (req, res) => {
    try {
        const {
            fullName,
            location,
            email,
            signature,
            withdrawalAccepted,
            withdrawalSignature,
            pdfId,
            contractKeyboardSignature,
            withdrawalKeyboardSignature
        } = req.body;

        if (!fullName || !location || !email) {
            return res.status(400).json({ error: 'Alle Felder müssen ausgefüllt werden.' });
        }

        // For testing without PDF
        if (!pdfId) {
            return res.json({ 
                success: true, 
                message: 'Signature data received successfully',
                data: {
                    fullName,
                    location,
                    email,
                    signature,
                    contractKeyboardSignature,
                    withdrawalAccepted,
                    withdrawalSignature,
                    withdrawalKeyboardSignature
                }
            });
        }

        const pdfData = pdfStore[pdfId]; // Read from the loaded store object
        if (!pdfData) {
            return res.status(404).json({ error: 'PDF nicht gefunden oder ungültige ID.' });
        }
        if (!pdfData.pdfUrl) {
             console.error(`PDF data for ID ${pdfId} is missing the pdfUrl property.`);
             return res.status(500).json({ error: 'Interner Serverfehler: PDF-Speicherort nicht gefunden.' });
        }

        // Download the original PDF from GCS
        const originalPdfBytes = await downloadPdfFromGcs(pdfData.pdfUrl);
        const pdfDoc = await PDFDocument.load(originalPdfBytes);
        pdfDoc.registerFontkit(fontkit); // Restored
        const pages = pdfDoc.getPages();
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Base fields for both signatures
        const baseFields = {
            fullName,
            email,
            location,
            date: new Date().toLocaleDateString('de-DE')
        };

        // Add contract signature
        try {
            const contractFields = {
                ...baseFields,
                ...(contractKeyboardSignature?.text ? { keyboardSignature: contractKeyboardSignature } : {})
            };

            await addSignatureToPage(
                pages[pdfConfig.contractSignature.page],
                pdfConfig.contractSignature,
                contractKeyboardSignature?.text ? null : signature,
                contractFields,
                pdfDoc,
                helveticaFont
            );
        } catch (error) {
            console.error("Fehler beim Einfügen der Vertragsunterschrift:", error);
            res.status(500).json({ error: "Fehler beim Einfügen der Vertragsunterschrift: " + error.message });
            return;
        }

        // Add withdrawal signature if accepted
        if (withdrawalAccepted) {
            const withdrawalFields = {
                ...baseFields,
                ...(withdrawalKeyboardSignature?.text ? { keyboardSignature: withdrawalKeyboardSignature } : {})
            };

            try {
                await addSignatureToPage(
                    pages[pdfConfig.withdrawalSignature.page],
                    pdfConfig.withdrawalSignature,
                    withdrawalKeyboardSignature?.text ? null : withdrawalSignature,
                    withdrawalFields,
                    pdfDoc,
                    helveticaFont
                );
            } catch (error) {
                console.error("Fehler beim Einfügen der Widerrufsunterschrift:", error);
                res.status(500).json({ error: "Fehler beim Einfügen der Widerrufsunterschrift: " + error.message });
                return;
            }
        }

        // Save the signed PDF bytes
        const signedPdfBytes = await pdfDoc.save();
        
        // Define destination for the signed PDF in GCS (e.g., in a 'signed' folder)
        const signedDestinationFilename = `signed/signed_${pdfId}.pdf`;

        // Upload the signed PDF to GCS
        const signedPdfUrl = await storePdfInBucket(signedPdfBytes, signedDestinationFilename);

        // Optionally: Update pdfStore with the signed URL? 
        // pdfStore[pdfId].signedPdfUrl = signedPdfUrl; 
        // await savePdfStore(); // Consider if needed

        // Send webhook notification with stored data and the new signed GCS URL
        try {
            const fetch = (await import('node-fetch')).default;
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'signed',
                    pdfUrl: signedPdfUrl,
                    signedBy: {
                        name: fullName,
                        email: email,
                        location: location
                    },
                    vorname: pdfData.vorname,
                    card_id: pdfData.card_id,
                    email: pdfData.email,
                    withdrawalAccepted: withdrawalAccepted,
                    timestamp: new Date().toISOString()
                }),
            });
        } catch (error) {
            console.error('Error sending webhook:', error);
        }

        res.json({ pdfUrl: signedPdfUrl });

    } catch (error) {
        console.error('Error signing PDF:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start the server listening on the specified port and host
const server = app.listen(port, '0.0.0.0', () => {
    // This callback confirms the server *attempted* to listen.
    console.log(`Server attempting to listen on host 0.0.0.0, port ${port}`);
    console.log(`Aktuelles Verzeichnis: ${__dirname}`);
});

// Handle potential server errors (e.g., port already in use)
server.on('error', (error) => {
    console.error('FATAL SERVER ERROR:', error);
    if (error.syscall !== 'listen') {
        throw error;
    }
    // Specific listen errors
    switch (error.code) {
        case 'EACCES':
            console.error(`Port ${port} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`Port ${port} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});

// Load the initial PDF store data asynchronously after initiating the listen process
loadInitialPdfStore().catch(err => {
    // Log errors during async loading but don't necessarily crash the server
    console.error("[DEBUG] Error during async PDF store loading:", err);
});

console.log("[DEBUG] Server setup complete, attempting to listen...");

} catch (globalError) {
    // --- Catch errors during the main setup phase ---
    console.error("[DEBUG] FATAL ERROR during initial script setup:", globalError);
    process.exit(1); // Exit if any setup step fails critically
}


/**
 * Downloads PDF content from a GCS URL/URI.
 * @param {string} gcsPathOrUrl - The GCS URI (gs://...) or public URL (https://...).
 * @returns {Promise<Buffer>} - The PDF content as a Buffer.
 */
async function downloadPdfFromGcs(gcsPathOrUrl) {
    try {
        let bucketName, filePath;
        // Extract bucket and file path from gs:// URI or https:// URL
        if (gcsPathOrUrl.startsWith('gs://')) {
            const match = gcsPathOrUrl.match(/^gs:\/\/([^\/]+)\/(.+)$/);
            if (!match) throw new Error(`Invalid GCS URI format: ${gcsPathOrUrl}`);
            bucketName = match[1];
            filePath = match[2];
        } else if (gcsPathOrUrl.startsWith('https://storage.googleapis.com/')) {
            const match = gcsPathOrUrl.match(/^https:\/\/storage\.googleapis\.com\/([^\/]+)\/(.+)$/);
            if (!match) throw new Error(`Invalid GCS public URL format: ${gcsPathOrUrl}`);
            bucketName = match[1];
            filePath = match[2];
            // Security check: Ensure the bucket matches the configured one if downloading via public URL
            if (bucketName !== global.BUCKET_NAME) {
                 console.warn(`Attempted download from unexpected bucket via public URL: ${bucketName}`);
                 throw new Error(`Invalid bucket in public URL.`);
            }
        } else {
            throw new Error(`Unsupported PDF URL format for download: ${gcsPathOrUrl}`);
        }

        // Check if the bucket we are downloading from is the configured one
        if (bucketName !== global.BUCKET_NAME) {
             console.warn(`Attempted download from unexpected bucket: ${bucketName}`);
             throw new Error(`Cannot download from bucket ${bucketName}, expected ${global.BUCKET_NAME}.`);
        }

        const [contents] = await global.storage.bucket(bucketName).file(filePath).download();
        console.log(`Downloaded PDF from gs://${bucketName}/${filePath}`);
        return contents; // contents is a Buffer
    } catch (error) {
        console.error(`ERROR downloading PDF from GCS "${gcsPathOrUrl}":`, error);
        // Improve error message based on common GCS errors
        if (error.code === 404 || error.message.includes('Not Found')) {
             throw new Error(`PDF not found at GCS location: ${gcsPathOrUrl}.`);
        } else if (error.code === 403 || error.message.includes('does not have storage.objects.get access')) {
             throw new Error(`Permission denied to download PDF from GCS: ${gcsPathOrUrl}. Check Cloud Run service account permissions.`);
        }
        throw new Error(`Failed to download PDF from GCS: ${gcsPathOrUrl}.`);
    }
}


/**
 * Uploads PDF bytes to Google Cloud Storage.
 * @param {Buffer} pdfBytes - The PDF content as a Buffer.
 * @param {string} destinationFilename - The desired filename in the GCS bucket (e.g., 'pdfs/document.pdf').
 * @returns {Promise<string>} - The GCS URI (gs://...) or public URL (https://...) of the uploaded file.
 */
async function storePdfInBucket(pdfBytes, destinationFilename) {
    const file = global.storage.bucket(global.BUCKET_NAME).file(destinationFilename);

    try {
        await file.save(pdfBytes, {
            metadata: {
                contentType: 'application/pdf',
                // Add any other metadata here if needed
            },
            // Optionally set predefined ACL if making public immediately
            // predefinedAcl: global.MAKE_PUBLIC ? 'publicRead' : undefined, // Alternative to calling makePublic() later
        });
        console.log(`PDF uploaded to gs://${global.BUCKET_NAME}/${destinationFilename}`);

        if (global.MAKE_PUBLIC) {
            // Make the file public if configured
            await file.makePublic();
            const publicUrl = `https://storage.googleapis.com/${global.BUCKET_NAME}/${destinationFilename}`;
            console.log(`PDF made public at: ${publicUrl}`);
            return publicUrl;
        } else {
            // Return the GCS URI for private files
            const gcsUri = `gs://${global.BUCKET_NAME}/${destinationFilename}`;
            return gcsUri;
        }
    } catch (error) {
        console.error(`ERROR uploading PDF to GCS bucket "${global.BUCKET_NAME}":`, error);
        // Re-throw the error to be handled by the calling route
        throw new Error(`Failed to upload PDF to bucket ${global.BUCKET_NAME}.`);
    }
}
