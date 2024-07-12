document.getElementById('uploadForm').onsubmit = async function(e) {
    e.preventDefault();
    const submitButton = document.querySelector('button[type="submit"]');
    submitButton.disabled = true; // Desactivar el botón "Subir"
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const documentType = document.querySelector('input[name="documentType"]:checked').value;
    const reader = new FileReader();

    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('resultContainer').classList.add('hidden');
    document.getElementById('errorContainer').classList.add('hidden'); // Ocultar error al comenzar
    document.getElementById('newDocument').classList.add('hidden');

    reader.onloadend = async function() {
        try {
            const image = reader.result;
            const extractedText = await extractTextFromImage(image);
            const documentInfo = await interpretDocumentInfo(extractedText, documentType);
            displayDocumentInfo(documentInfo, image);
        } catch (error) {
            console.error('Error processing document:', error);
        } finally {
            submitButton.disabled = false; // Reactivar el botón "Subir"
            document.getElementById('loader').classList.add('hidden');
        }
    };

    reader.readAsDataURL(file);
};

document.getElementById('toggleJson').onclick = function() {
    const jsonOutput = document.getElementById('jsonOutput');
    if (jsonOutput.classList.contains('hidden')) {
        jsonOutput.classList.remove('hidden');
    } else {
        jsonOutput.classList.add('hidden');
    }
};

async function extractTextFromImage(image) {
    return new Promise((resolve, reject) => {
        Tesseract.recognize(
            image,
            'eng',
            {
                logger: m => console.log(m)
            }
        ).then(({ data: { text } }) => {
            resolve(text);
        }).catch(err => {
            console.error(err);
            reject(err);
        });
    });
}

document.getElementById('newDocument').onclick = function() {
    document.getElementById('resultContainer').classList.add('hidden');
    document.getElementById('jsonOutput').classList.add('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('newDocument').classList.add('hidden');
    document.getElementById('fileInput').value = '';
};


async function interpretDocumentInfo(text, documentType) {
    const prompt = documentType === 'factura'
        ? `Extract the following information from the invoice text and return it in JSON format: 
        Header (Title, Invoice Number, Issue Date), 
        Issuer Information (Name, Address, Tax ID, Contact Information), 
        Receiver Information (Name, Address, Tax ID), 
        Item Details (Quantity, Description, Unit Price, Total Amount), 
        Totals and Calculations (Subtotal, Taxes, Discounts, Total Amount Due), 
        Additional Information (Payment Methods, Due Date, Terms of Sale), 
        Footer (Additional Notes, Legal Information). 
        Your response must be just the json, as I am going to directly parse it.
        Here is the text extracted from the invoice: ${text}`
        : `Extract the following information from the ticket text and return it in JSON format: 
        Store Information (Name, Address, Phone, Website), 
        Transaction Information (Date, Time, Ticket Number, Cashier ID), 
        Items (Description, Quantity, Unit Price), 
        Pricing Information (Subtotal, Taxes, Total). 
        Here is the text extracted from the ticket: ${text}`;

    try {
        const response = await fetch('/api/chatgpt', { //http://localhost:3000/api/chatgpt
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: prompt })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const cleanedResponse = data.choices[0].message.content;

        const jsonString = extractJsonString(cleanedResponse);

        try {
            const parsedResponse = JSON.parse(jsonString);
            document.getElementById('jsonOutput').textContent = JSON.stringify(parsedResponse, null, 2);
            document.getElementById('newDocument').classList.remove('hidden'); // Mostrar botón "Nuevo Documento"
            return parsedResponse;
        } catch (e) {
            console.error("Error parsing JSON:", e);
            console.error("Cleaned response:", cleanedResponse);
            showError("Failed to parse the JSON response. Please try again.");
            document.getElementById('newDocument').classList.remove('hidden'); // Mostrar botón "Nuevo Documento" en caso de error
            throw e;
        }
    } catch (error) {
        console.error("Error in interpretDocumentInfo:", error);
        showError("Failed to process the document. Please try again.");
        document.getElementById('newDocument').classList.remove('hidden'); // Mostrar botón "Nuevo Documento" en caso de error
        throw error;
    }
}


function extractJsonString(text) {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    return text.substring(jsonStart, jsonEnd);
}

function displayDocumentInfo(info, image) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('resultContainer').classList.remove('hidden');

    document.getElementById('imageContainer').innerHTML = `<img src="${image}" alt="Ticket Image">`;

    document.getElementById('storeInfo').innerHTML = formatStoreInfo(info["Store Information"]);
    document.getElementById('transactionInfo').innerHTML = formatTransactionInfo(info["Transaction Information"] ?? info);
    document.getElementById('itemsInfo').innerHTML = formatItemsInfo(info.Items);
    document.getElementById('pricingInfo').innerHTML = formatPricingInfo(info["Pricing Information"]);
}

function formatStoreInfo(info) {
    if(!info) return '';
    return `
        <h3>Información del negocio</h3>
        <strong>Nombre de la tienda:</strong> ${info["Name"] ?? 'N/A'}<br>
        <strong>Dirección:</strong> ${info["Address"] ?? 'N/A'}<br>
        <strong>Teléfono:</strong> ${info["Phone"] ?? 'N/A'}<br>
        <strong>Sitio web:</strong> ${info["Website"] ?? 'N/A'}
    `;
}

function formatTransactionInfo(info) {
    if (info && info["Ticket Number"]) {
        return `
            <h3>Datos de la transacción</h3>
            <strong>Fecha:</strong> ${info.Date ?? 'N/A'}<br>
            <strong>Hora:</strong> ${info.Time ?? 'N/A'}<br>
            <strong>Número de ticket:</strong> ${info["Ticket Number"] ?? 'N/A'}<br>
            <strong>Cajero:</strong> ${info["Cashier ID"] ?? 'N/A'}
        `;
    } else if (info) {
        return `
            <h3>Encabezado</h3>
            <strong>Título:</strong> ${info["Header"]?.Title ?? 'N/A'}<br>
            <strong>Número de factura:</strong> ${info["Header"]?.["Invoice Number"] ?? 'N/A'}<br>
            <strong>Fecha de emisión:</strong> ${info["Header"]?.["Issue Date"] ?? 'N/A'}<br>

            <h3>Datos del emisor</h3>
            <strong>Nombre o razón social:</strong> ${info["Issuer Information"]?.Name ?? 'N/A'}<br>
            <strong>Dirección:</strong> ${info["Issuer Information"]?.Address ?? 'N/A'}<br>
            <strong>Número de identificación fiscal:</strong> ${info["Issuer Information"]?.["Tax ID"] ?? 'N/A'}<br>
            <strong>Teléfono y/o correo electrónico:</strong> ${info["Issuer Information"]?.["Contact Information"] ?? 'N/A'}<br>

            <h3>Datos del receptor</h3>
            <strong>Nombre o razón social:</strong> ${info["Receiver Information"]?.Name ?? 'N/A'}<br>
            <strong>Dirección:</strong> ${info["Receiver Information"]?.Address ?? 'N/A'}<br>
            <strong>Número de identificación fiscal:</strong> ${info["Receiver Information"]?.["Tax ID"] ?? 'N/A'}<br>

            <h3>Detalles de los bienes o servicios</h3>
            ${info["Item Details"]?.map(item => `
                <div>
                    <strong>Cantidad:</strong> ${item.Quantity ?? 'N/A'}<br>
                    <strong>Descripción detallada:</strong> ${item.Description ?? 'N/A'}<br>
                    <strong>Precio unitario:</strong> ${item["Unit Price"] ?? 'N/A'}<br>
                    <strong>Importe total:</strong> ${item["Total Amount"] ?? 'N/A'}
                </div>
            `).join('') ?? 'N/A'}

            <h3>Totales y cálculos</h3>
            <strong>Subtotal:</strong> ${info["Totals and Calculations"]?.Subtotal ?? 'N/A'}<br>
            <strong>Impuestos aplicables:</strong> ${info["Totals and Calculations"]?.Taxes ?? 'N/A'}<br>
            <strong>Descuentos:</strong> ${info["Totals and Calculations"]?.Discounts ?? 'N/A'}<br>
            <strong>Total a pagar:</strong> ${info["Totals and Calculations"]?.["Total Amount Due"] ?? 'N/A'}<br>

            <h3>Información adicional</h3>
            <strong>Métodos de pago:</strong> ${info["Additional Information"]?.["Payment Methods"] ?? 'N/A'}<br>
            <strong>Fecha de vencimiento:</strong> ${info["Additional Information"]?.["Due Date"] ?? 'N/A'}<br>
            <strong>Condiciones de venta:</strong> ${info["Additional Information"]?.["Terms of Sale"] ?? 'N/A'}<br>

            <h3>Pie de página</h3>
            <strong>Notas adicionales:</strong> ${info["Footer"]?.["Additional Notes"] ?? 'N/A'}<br>
            <strong>Información legal:</strong> ${info["Footer"]?.["Legal Information"] ?? 'N/A'}
        `;
    }
}


function formatItemsInfo(items) {
    if(!items) return '';

    return `
        <h3>Detalles de los productos</h3>
        ${items.map(item => `
            <div>
                <strong>Descripción:</strong> ${item.Description}<br>
                <strong>Cantidad:</strong> ${item.Quantity}<br>
                <strong>Precio unitario:</strong> ${item["Unit Price"]}
            </div>
        `).join('')}
    `;
}

function formatPricingInfo(info) {
    if(!info) return '';
    return `
        <h3>Información de precios y pagos</h3>
        <strong>Subtotal:</strong> ${info.Subtotal}<br>
        <strong>Impuestos:</strong> ${info.Taxes}<br>
        <strong>Total:</strong> ${info.Total}
    `;
}

function showError(message) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('resultContainer').classList.add('hidden');
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.textContent = message;
    errorContainer.classList.remove('hidden');
}
