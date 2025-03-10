let scrapedData = []; // Stocke toutes les données récupérées

async function scrapePageData() {
    console.log("Scraping en cours...");

    const rows = document.querySelectorAll('table tbody tr'); // Sélectionne les lignes du tableau

    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td'); // Sélectionne les cellules de chaque ligne

        console.log(`Ligne ${rowIndex + 1} - Nombre de cellules trouvées :`, cells.length);
        cells.forEach((cell, index) => {
            console.log(`Cellule ${index}:`, cell.innerText.trim());
        });

        // Vérifie que le nombre de cellules est suffisant pour éviter les décalages
        if (cells.length < 11) return;

        let data = {
            price: cells[0]?.innerText.replace(/Buy/g, '').trim() || "N/A",
            media: cells[1]?.querySelector('a')?.innerText.trim() || "N/A", // Correction pour extraire correctement le media
            domainRating: cells[2]?.innerText.trim() || "N/A",
            domainAuthority: cells[2]?.innerText.trim() || "N/A",
            authorityScore: cells[3]?.innerText.trim() || "N/A",
            organicTraffic: cells[4]?.innerText.trim() || "N/A",
            categories: cells[5]?.innerText.replace(/\n/g, ' | ').trim() || "N/A",
            language: cells[6]?.innerText.replace(/\n/g, ' | ').trim() || "N/A",
            referringDomains: cells[7]?.innerText.trim() || "N/A",
            spamScore: cells[8]?.innerText.trim() || "N/A", // Correction de la colonne Spam Score
        };

        scrapedData.push(data); // Ajoute les données à la liste
    });

    console.log(`Données extraites : ${scrapedData.length} entrées.`);
}

async function waitForTableUpdate() {
    return new Promise((resolve) => {
        const tableContainer = document.querySelector('table tbody'); // Observe le tbody du tableau
        if (!tableContainer) {
            console.log("Tableau introuvable, résolution immédiate.");
            resolve();
            return;
        }

        const observer = new MutationObserver((mutationsList, observer) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    console.log("Changement détecté dans le tableau.");
                    observer.disconnect();
                    resolve();
                    return;
                }
            }
        });

        observer.observe(tableContainer, { childList: true, subtree: true });

        setTimeout(() => {
            console.log("Timeout : Aucun changement détecté, continuation...");
            observer.disconnect();
            resolve();
        }, 3000);
    });
}

async function paginate() {
    console.log("Début de l'automatisation...");

    let pages = document.querySelectorAll("button.mantine-Pagination-control");
    let lastPage = parseInt(pages[pages.length - 2]?.textContent.trim()) || 1;
    console.log("Nombre total de pages :", lastPage);

    for (let i = 2; i <= lastPage; i++) {
        let pageButton = [...document.querySelectorAll("button.mantine-Pagination-control")].find(b => b.textContent.trim() == i);

        if (!pageButton) {
            console.log(`Bouton pour la page ${i} introuvable, arrêt du script.`);
            break;
        }

        console.log(`Passage à la page ${i}...`);
        pageButton.click();

        await waitForTableUpdate();
        await new Promise(resolve => setTimeout(resolve, 8000));

        console.log(`Page ${i} chargée. Scraping...`);
        await scrapePageData();
    }

    console.log("Fin de la pagination. Génération du JSON...");
    generateJSON();
}

function generateJSON() {
    const jsonData = JSON.stringify(scrapedData, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "scraped_data.json";
    document.body.appendChild(link);
    link.click();

    console.log("JSON téléchargé !");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startPagination") {
        paginate();
        sendResponse({ status: "started" });
    }
});
