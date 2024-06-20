document.getElementById('uploadForm').onsubmit = async function(e) {
    e.preventDefault();
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const reader = new FileReader();

    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('resultContainer').classList.add('hidden');

    reader.onloadend = async function() {
        const image = reader.result;
        const extractedText = await extractTextFromImage(image);
        const ticketInfo = await interpretTicketInfo(extractedText);
        displayTicketInfo(ticketInfo, image);
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
            showError(`Error extracting text from image. ${err}`);
            reject(err);
        });
    });
}

async function interpretTicketInfo(text) {
    const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            content: `Extract the following information from the ticket text and return it in JSON format: 
            Store Information (Name, Address, Phone, Website), 
            Transaction Information (Date, Time, Ticket Number, Cashier ID), 
            Items (Description, Quantity, Unit Price), 
            Pricing Information (Subtotal, Taxes, Total). 
            Here is the text extracted from the ticket: ${text}`
        })
    });

    const data = await response.json();
    const cleanedResponse = data.choices[0].message.content;

    const jsonString = extractJsonString(cleanedResponse);

    try {
        const parsedResponse = JSON.parse(jsonString);
        document.getElementById('jsonOutput').textContent = JSON.stringify(parsedResponse, null, 2);
        return parsedResponse;
    } catch (e) {
        console.error("Error parsing JSON:", e);
        console.error("Cleaned response:", cleanedResponse);
        showError(`Error parsing JSON: ${cleanedResponse} ${e}`);
        throw e;
    }
}

function extractJsonString(text) {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    return text.substring(jsonStart, jsonEnd);
}

function displayTicketInfo(info, image) {
    try{
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('resultContainer').classList.remove('hidden');

    document.getElementById('imageContainer').innerHTML = `<img src="${image}" alt="Ticket Image">`;

    document.getElementById('storeInfo').innerHTML = formatStoreInfo(info["Store Information"]);
    document.getElementById('transactionInfo').innerHTML = formatTransactionInfo(info["Transaction Information"]);
    document.getElementById('itemsInfo').innerHTML = formatItemsInfo(info.Items);
    document.getElementById('pricingInfo').innerHTML = formatPricingInfo(info["Pricing Information"]);
    }
    catch(e){
        showError(`Error parsing JSON: ${e}`);
    }
}

function formatStoreInfo(info) {
    return `
        <h3>Información de la tienda</h3>
        <strong>Nombre de la tienda:</strong> ${info.Name}<br>
        <strong>Dirección:</strong> ${info.Address}<br>
        <strong>Teléfono:</strong> ${info.Phone}<br>
        <strong>Sitio web:</strong> ${info.Website}
    `;
}

function formatTransactionInfo(info) {
    return `
        <h3>Datos de la transacción</h3>
        <strong>Fecha:</strong> ${info.Date}<br>
        <strong>Hora:</strong> ${info.Time}<br>
        <strong>Número de ticket:</strong> ${info["Ticket Number"]}<br>
        <strong>Cajero:</strong> ${info["Cashier ID"]}
    `;
}

function formatItemsInfo(items) {
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
