const xlsx = require('xlsx');
const fs = require('fs');

try {
    const workbook = xlsx.readFile('Formula F1NTA 2026.xlsx');
    let out = {};
    out.sheets = workbook.SheetNames;
    
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        out[sheetName] = data.slice(0, 50); // prime 50 righe
    });

    fs.writeFileSync('excel_structure.json', JSON.stringify(out, null, 2));
    console.log("Fatto. salvato in excel_structure.json");
} catch (error) {
    console.error("Errore:", error);
}
