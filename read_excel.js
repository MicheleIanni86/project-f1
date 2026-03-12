const xlsx = require('xlsx');

try {
    const workbook = xlsx.readFile('Formula F1NTA 2026.xlsx');
    console.log("Fogli presenti:", workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n\n=== FOGLIO: ${sheetName} ===`);
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        
        // Stampiamo le prime 20 righe del foglio
        for(let i=0; i<Math.min(20, data.length); i++) {
            console.log(JSON.stringify(data[i]));
        }
    });

} catch (error) {
    console.error("Errore durante la lettura:", error);
}
