const xlsx = require('xlsx');
const path = require('path');

const exportExcel = (data, workSheetColumnNames, workSheetName, filePath) => {
    const workBook = xlsx.utils.book_new();
    const workSheetData = [
        workSheetColumnNames,
        ...data
    ];

    //console.log(workSheetData);

    const workSheet = xlsx.utils.aoa_to_sheet(workSheetData);
    xlsx.utils.book_append_sheet(workBook, workSheet, workSheetName);
    xlsx.writeFile(workBook, path.resolve(filePath));
}

const exportUsersToExcel = (transactions, workSheetColumnNames, workSheetName, filePath) => {
    const data = transactions.map(transaction => {
        return [
            transaction.Account,
            transaction.BEFORE_TOS,
            transaction.BEFORE_STOS,
            transaction.AFTER_TOS,
            transaction.AFTER_STOS
            ];
    });
    exportExcel(data, workSheetColumnNames, workSheetName, filePath);
}

module.exports = exportUsersToExcel;