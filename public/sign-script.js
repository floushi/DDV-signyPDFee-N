// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

let contractSignaturePad;
let pdfDoc = null;
let pageNum = 1;
let pdfId = null;

// Get the PDF ID from the URL
function getPdfId() {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.indexOf('sign') + 1];
}

// Resize canvas
function resizeCanvas(canvas) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d').scale(ratio, ratio);
}

// Initialize signature pads
function initSignaturePads() {
    // Contract signature pad
    const contractCanvas = document.getElementById('signature-pad');
    resizeCanvas(contractCanvas);
    contractSignaturePad = new SignaturePad(contractCanvas, {
        backgroundColor: 'rgb(255, 255, 255)'
    }); // <-- Corrected closing parenthesis and added semicolon

    // Handle window resize
    window.addEventListener('resize', () => {
        resizeCanvas(contractCanvas);
        contractSignaturePad.clear();
    });

    // Clear signature button
    document.getElementById('clear-signature').addEventListener('click', () => {
        contractSignaturePad.clear();
        updateSignatureStatus(false); // Pass false since it's cleared
    });
}

// Clear signature pad (Simplified)
function clearSignaturePad() {
    contractSignaturePad.clear();
    updateSignatureStatus(false); // Pass false since it's cleared
}

// Enable keyboard signature (Simplified)
function enableKeyboardSignature() {
    const signPadSection = document.getElementById('signature-pad').closest('.signature-group');
    const keyboardSection = document.getElementById('keyboardSignature').closest('.keyboard-signature');

    signPadSection.style.opacity = '0.5';
    signPadSection.style.pointerEvents = 'none';
    keyboardSection.style.opacity = '1';
    keyboardSection.style.pointerEvents = 'auto';
}

// Disable keyboard signature (Simplified)
function disableKeyboardSignature() {
    const keyboardSection = document.getElementById('keyboardSignature').closest('.keyboard-signature');
    keyboardSection.style.opacity = '0.5';
    keyboardSection.style.pointerEvents = 'none';
}

// Enable SignPad (Simplified)
function enableSignPad() {
    const signPadSection = document.getElementById('signature-pad').closest('.signature-group');
    signPadSection.style.opacity = '1';
    signPadSection.style.pointerEvents = 'auto';
}

// Disable SignPad (Simplified)
function disableSignPad() {
    const signPadSection = document.getElementById('signature-pad').closest('.signature-group');
    signPadSection.style.opacity = '0.5';
    signPadSection.style.pointerEvents = 'none';
}

// Reset signature method visibility (Simplified)
function resetSignatureMethodVisibility() {
    const signPadSection = document.getElementById('signature-pad').closest('.signature-group');
    const keyboardSection = document.getElementById('keyboardSignature').closest('.keyboard-signature');

    signPadSection.style.opacity = '1';
    keyboardSection.style.opacity = '1';
    keyboardSection.style.pointerEvents = 'auto';
    keyboardSection.style.pointerEvents = 'auto';
}

// Handle signature status (Simplified - assumes only one pad)
function updateSignatureStatus(isSigned) {
    const canvas = document.getElementById('signature-pad'); // Directly reference the contract pad
    const statusIndicator = canvas.closest('.signature-group').querySelector('.signature-status');

    if (isSigned) {
        statusIndicator.classList.add('signed');
    } else {
        statusIndicator.classList.remove('signed');
    }
}

// Load and render PDF
async function loadPDF() {
    try {
        pdfId = getPdfId();
        if (!pdfId) {
            // If no PDF ID, hide the PDF container
            document.getElementById('pdf-container').style.display = 'none';
            return;
        }

        const response = await fetch(`/api/pdf/${pdfId}`);
        if (!response.ok) {
            throw new Error('Fehler beim Laden des PDFs');
        }
        const pdfData = await response.arrayBuffer();
        
        // Load PDF document
        pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
        
        // Clear PDF container
        const pdfContainer = document.getElementById('pdf-pages');
        pdfContainer.innerHTML = '';
        
        // Render all pages
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            await renderPage(pageNum, pdfContainer);
        }
    } catch (error) {
        console.error('Fehler beim Laden des PDFs:', error);
        document.getElementById('error-message').textContent = 'Fehler beim Laden des PDFs: ' + error.message;
        document.getElementById('error-message').style.display = 'block';
    }
}

// Render PDF page
async function renderPage(num, container) {
    try {
        const page = await pdfDoc.getPage(num);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas dimensions to match PDF page
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Add margin between pages
        canvas.style.marginBottom = '20px';
        
        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        container.appendChild(canvas);
        await page.render(renderContext).promise;
    } catch (error) {
        console.error('Fehler beim Rendern der PDF-Seite:', error);
        document.getElementById('error-message').textContent = 'Fehler beim Rendern der PDF-Seite: ' + error.message;
        document.getElementById('error-message').style.display = 'block';
    }
}

// Handle keyboard signatures (Simplified)
function initKeyboardSignatures() {
    const contractInput = document.getElementById('keyboardSignature');

    function updatePreview(input, previewLabels) {
        const name = input.value || " ";
        previewLabels.forEach(label => {
            label.innerHTML = `
                <span class="preview-title">Diese Unterschrift wählen</span>
                <span class="preview-signature">${name}</span>
            `;
        });
    }

    // No validation needed between signatures anymore
    function validateSignatures() {
        return true; // Always valid as there's only one
    }

    function handleKeyboardInput(input, dancingLabel, barlowLabel) {
        input.addEventListener('input', () => {
            if (input.value.trim() !== '') {
                // If keyboard signature is being used, disable SignPad
                disableSignPad();
                // Clear SignPad and update status
                contractSignaturePad.clear();
                updateSignatureStatus(false);
            } else {
                // If input is cleared, re-enable both methods potentially
                resetSignatureMethodVisibility();
            }
            updatePreview(input, [dancingLabel, barlowLabel]);
            // No need to call validateSignatures() anymore
        });
    }

    // Contract signature previews
    const contractDancingLabel = document.querySelector('label[for="contract-dancing"]');
    const contractBarlowLabel = document.querySelector('label[for="contract-barlow"]');
    handleKeyboardInput(contractInput, contractDancingLabel, contractBarlowLabel);

    // Set initial preview text
    updatePreview(contractInput, [contractDancingLabel, contractBarlowLabel]);

    // No return needed as validateSignatures is removed/simplified
}

// Initialize keyboard signatures
initKeyboardSignatures(); // No need to store the return value

// Handle signature method selection (Simplified)
function handleSignatureMethodSelection(method) {
    // Get the buttons
    const signpadButton = document.getElementById('signpad-button');
    const keyboardButton = document.getElementById('keyboard-button');

    // Update button active states
    if (method === 'signpad') {
        signpadButton.classList.add('active');
        keyboardButton.classList.remove('active');

        // Enable SignPad and disable keyboard
        enableSignPad();
        disableKeyboardSignature();

        // Check if there's content in the keyboard signature
        const keyboardInput = document.getElementById('keyboardSignature');
        if (keyboardInput.value.trim() !== '') {
            // Clear keyboard signature when switching to SignPad
            keyboardInput.value = '';

            // Update preview labels
            const dancingLabel = document.querySelector('label[for="contract-dancing"]');
            const barlowLabel = document.querySelector('label[for="contract-barlow"]');
            if (dancingLabel && barlowLabel) {
                [dancingLabel, barlowLabel].forEach(label => {
                    label.innerHTML = `
                        <span class="preview-title">Diese Unterschrift wählen</span>
                        <span class="preview-signature"> </span>
                    `;
                });
            }
        }
    } else if (method === 'keyboard') {
        keyboardButton.classList.add('active');
        signpadButton.classList.remove('active');

        // Enable keyboard and disable SignPad
        enableKeyboardSignature();
        disableSignPad();

        // Clear SignPad when switching to keyboard
        contractSignaturePad.clear();
        updateSignatureStatus(false);
    }
}

// Helper function to get keyboard signature data (Simplified)
function getKeyboardSignatureData() {
    const input = document.getElementById('keyboardSignature');
    const selectedFontInput = document.querySelector('input[name="contract-font"]:checked');
    // Handle case where no font might be selected initially or due to error
    const selectedFont = selectedFontInput ? selectedFontInput.value : 'DancingScript-Regular'; // Default font
    return {
        text: input.value,
        font: selectedFont
    };
}

// Helper function to check if any signature method is used (Simplified)
function hasValidSignature() {
    const hasSignPad = !contractSignaturePad.isEmpty();
    const hasKeyboard = document.getElementById('keyboardSignature').value.trim() !== '';
    return hasSignPad || hasKeyboard;
}

// Handle form submission
document.getElementById('signature-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear all previous error messages
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });

    let hasErrors = false;

    // Validate required fields
    const requiredFields = {
        'fullName': 'Bitte geben Sie Ihren Namen ein',
        'location': 'Bitte geben Sie Ihren Ort ein',
        'email': 'Bitte geben Sie Ihre E-Mail-Adresse ein'
    };

    for (const [fieldId, errorMessage] of Object.entries(requiredFields)) {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            const errorElement = field.parentElement.querySelector('.error-message');
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
            if (!hasErrors) {
                field.focus();
                hasErrors = true;
            }
        }
    }

    // Validate terms checkbox
    const termsCheckbox = document.getElementById('terms');
    if (!termsCheckbox.checked) {
        // Find the correct error message element associated with the terms checkbox
        const errorElement = termsCheckbox.closest('.checkbox-group').querySelector('.error-message');
        if (errorElement) {
             errorElement.textContent = 'Bitte stimmen Sie den Vertragsbedingungen zu.';
             errorElement.style.display = 'block';
        }
        hasErrors = true;
    }

    // Validate contract signature (either SignPad or keyboard)
    if (!hasValidSignature()) {
        const errorElement = document.getElementById('signature-pad').closest('.signature-group').querySelector('.error-message');
        errorElement.textContent = 'Bitte unterschreiben Sie entweder per SignPad oder Tastatur';
        errorElement.style.display = 'block';
        hasErrors = true;
    }

    // No need to validate withdrawal signature or matching keyboard signatures

    if (hasErrors) {
        return;
    }

    // Determine which signature method is being used for contract
    const hasContractSignPad = !contractSignaturePad.isEmpty();
    const hasContractKeyboard = document.getElementById('keyboardSignature').value.trim() !== '';

    // Base form data
    const formData = {
        fullName: document.getElementById('fullName').value,
        location: document.getElementById('location').value,
        email: document.getElementById('email').value,
        // withdrawalAccepted is removed
        pdfId: pdfId
    };

    // Add contract signature based on method used
    if (hasContractSignPad) {
        formData.signature = contractSignaturePad.toDataURL();
    } else if (hasContractKeyboard) {
        formData.contractKeyboardSignature = getKeyboardSignatureData(); // Simplified call
    }

    // No withdrawal signature logic needed

    try {
        const response = await fetch('/api/sign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Fehler beim Signieren des PDFs');
        }

        const result = await response.json();
        
        // Hide PDF container and form
        document.getElementById('pdf-container').style.display = 'none';
        document.getElementById('signature-form').style.display = 'none';
        
        // Create success view
        const container = document.createElement('div');
        container.className = 'success-view';
        container.innerHTML = `
            <h2>Geschafft! Das war's. 🎉</h2>
            
            <div class="success-message">
                PDF erfolgreich signiert! <a href="${result.pdfUrl}" target="_blank">PDF herunterladen</a>
            </div>
            
            <p class="email-notice">Eine Kopie wird dir per E-Mail zugesendet.</p>
        `;
        
        // Insert after header
        const header = document.querySelector('.header');
        header.insertAdjacentElement('afterend', container);
        
        // Hide error message if visible
        document.getElementById('error-message').style.display = 'none';

    } catch (error) {
        console.error('Fehler beim Signieren:', error);
        document.getElementById('error-message').textContent = 'Fehler beim Signieren: ' + error.message;
        document.getElementById('error-message').style.display = 'block';
    }
});

// Initialize when page loads
window.addEventListener('load', () => {
    initSignaturePads();
    loadPDF();

    // Monitor the contract signature pad for changes
    contractSignaturePad.addEventListener('endStroke', () => {
        if (!contractSignaturePad.isEmpty()) {
            // If SignPad is being used, disable keyboard signature
            disableKeyboardSignature();
            document.getElementById('keyboardSignature').value = '';

            // Clear preview text
            const dancingLabel = document.querySelector('label[for="contract-dancing"]');
            const barlowLabel = document.querySelector('label[for="contract-barlow"]');
            [dancingLabel, barlowLabel].forEach(label => {
                if (label) {
                    label.innerHTML = `
                        <span class="preview-title">Diese Unterschrift wählen</span>
                        <span class="preview-signature"> </span>
                    `;
                }
            });
        }
        updateSignatureStatus(!contractSignaturePad.isEmpty());
    });

    // Set initial radio button state for contract font
    const contractDancingRadio = document.getElementById('contract-dancing');
    if (contractDancingRadio) {
        contractDancingRadio.checked = true;
    }


    // Set initial signature method selection for contract
    handleSignatureMethodSelection('signpad');

    // Disable keyboard signature on load for contract
    disableKeyboardSignature();

    // Set event listeners for contract signature method selection buttons
    document.getElementById('signpad-button').addEventListener('click', () => {
        handleSignatureMethodSelection('signpad');
    });

    document.getElementById('keyboard-button').addEventListener('click', () => {
        handleSignatureMethodSelection('keyboard');
    });

    // No event listeners needed for withdrawal buttons
});
