let scrapedData = []; // Stocke toutes les données récupérées

async function scrapePageData() {
    console.log("Scraping en cours...");

    let attempts = 0; 
    while (document.querySelectorAll('table tbody tr')[0]?.querySelectorAll('td').length < 11 && attempts < 10) {
        console.log("En attente du chargement des données...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
    }



    const rows = document.querySelectorAll('table tbody tr'); // Sélectionne les lignes du tableau

    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td'); // Sélectionne les cellules de chaque ligne

        if (cells.length < 11) return; // Vérifie que le nombre de cellules est suffisant

        let data = {
            price: cells[1]?.innerText.replace(/Buy/g, '').trim() || "N/A",
            domainAuthority: cells[2]?.innerText.trim() || "N/A",
            media: cells[3]?.querySelector('p')?.innerText.trim() || "N/A",
            domainRating: cells[4]?.innerText.trim() || "N/A",
            authorityScore: cells[5]?.innerText.trim() || "N/A",
            organicTraffic: cells[6]?.innerText.trim() || "N/A",
            categories: cells[7]?.innerText.replace(/\n/g, ' | ').trim() || "N/A",
            country: cells[8]?.querySelector('div[class*="me-"] svg')?.outerHTML || "N/A",
            language: cells[9]?.innerText.replace(/\n/g, ' | ').trim() || "N/A",
            referringDomains: cells[10]?.innerText.trim() || "N/A",
            spamScore: cells[11]?.innerText.trim() || "N/A",
        };

        scrapedData.push(data);
    });

    console.log(`Données extraites : ${scrapedData.length} entrées.`);
}

async function waitForTableUpdate() {
    return new Promise((resolve) => {
        const tableContainer = document.querySelector('table tbody');
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

async function waitForPaginationButtons(pageNumber) {
  let attempts = 0;
  while (attempts < 15) {
      let buttons = [...document.querySelectorAll("button.mantine-Pagination-control")];
      let btn = buttons.find(b => b.textContent.trim() == pageNumber);

      if (btn && btn.offsetParent !== null && !btn.disabled) {
          return; // bouton trouvé, visible et cliquable
      }

      console.log(`Attente du bouton visible pour la page ${pageNumber}...`);
      await new Promise(res => setTimeout(res, 1000));
      attempts++;
  }

  console.log(`Page ${pageNumber} introuvable ou bouton non cliquable après attente.`);
}



async function paginate() {
    let pageScrapped = 0; // Compteur de pages scrappées

    console.log("Début de l'automatisation...");

    let pages = document.querySelectorAll("button.mantine-Pagination-control");
    let lastPage = parseInt(pages[pages.length - 2]?.textContent.trim()) || 1;
    console.log("Nombre total de pages :", lastPage);

    let startPage = 1
    for (let i = startPage; i <= lastPage; i++) {
        await waitForPaginationButtons(i);
        let pageButton = [...document.querySelectorAll("button.mantine-Pagination-control")].find(b => b.textContent.trim() == i);

        if (!pageButton) {
            console.log(`Bouton pour la page ${i} toujours introuvable, on skip.`);
            continue;
        }


        console.log(`Passage à la page ${i}...`);
        pageButton.click();

        await waitForTableUpdate();
        await new Promise(resolve => setTimeout(resolve, 8000));

        console.log(`Page ${i} chargée. Scraping...`);
        await scrapePageData();

        pageScrapped++; // Incrémente le compteur de pages

        if (pageScrapped % 100 === 0) { 
            console.log("100 pages atteintes, génération du JSON...");
            generateJSON();
            scrapedData = []; // Vide les données après la sauvegarde
        }
    }

    // Générer un dernier JSON pour les pages restantes
    if (scrapedData.length > 0) {
        console.log("Fin de la pagination. Génération du dernier JSON...");
        generateJSON();
    }
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
