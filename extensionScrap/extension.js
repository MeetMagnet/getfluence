let scrapedData = []; // Stocke toutes les données récupérées

async function scrapePageData() {
    console.log("Scraping en cours...");

    const rows = document.querySelectorAll('table tbody tr'); // Sélectionne les lignes du tableau


    //boucler sur chaque ligne row pour recup son index 
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td'); // Sélectionne les cellules de chaque ligne

        console.log(`Ligne ${rowIndex + 1} - Nombre de cellules trouvées :`, cells.length);
        cells.forEach((cell, index) => {
            console.log(`Cellule ${index}:`, cell.innerText.trim());
        });

        // Vérifie que le nombre de cellules est suffisant pour éviter les décalages
        if (cells.length < 11) return;

        let data = {
            //cellBuy: cells[0]?.innerText.trim() || "DEBUG // 1 ",
            price: cells[1]?.innerText.replace(/Buy/g, '').trim() || "N/A",
            domainAuthority: cells[2]?.innerText.trim() || "N/A",
            media: cells[3]?.querySelector('p')?.innerText.trim() || "N/A", // Correction pour extraire correctement le media
            domainRating: cells[4]?.innerText.trim() || "N/A",
            authorityScore: cells[5]?.innerText.trim() || "N/A",
            organicTraffic: cells[6]?.innerText.trim() || "N/A",
            categories: cells[7]?.innerText.replace(/\n/g, ' | ').trim() || "N/A",
            country: cells[8]?.querySelector('div[class*="me-"] svg')?.outerHTML || "N/A",
            language: cells[9]?.innerText.replace(/\n/g, ' | ').trim() || "N/A",
            referringDomains: cells[10]?.innerText.trim() || "N/A",
            spamScore: cells[11]?.innerText.trim() || "N/A", // Correction de la colonne Spam Score
        };

        scrapedData.push(data); // Ajoute les données à la liste
    });

    console.log(`Données extraites : ${scrapedData.length} entrées.`);
}

async function waitForTableUpdate() {

    //return la promise pour attendre l'event 
    return new Promise((resolve) => {
        const tableContainer = document.querySelector('table tbody'); // Observe le tbody du tableau
        if (!tableContainer) {
            console.log("Tableau introuvable, résolution immédiate.");
            resolve();
            return;
        }
        
        //detection des modifs dans le DOM 
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


//detecte cb de page existent INTO parcourt chaque page  - click suivant - attend le load - extrait la data 
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
