



document.getElementById("start").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startPagination" }, (response) => {
            console.log("Script lancé :", response);
        });
    });
});



