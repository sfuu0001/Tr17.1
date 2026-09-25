// Data Export and Backup Engine for Merchant Portal

/**
 * Convert array of objects to UTF-8 CSV string with BOM for Excel compatibility
 */
export function exportToCsv(filename: string, headers: { label: string; key: string }[], data: Record<string, any>[]): void {
  try {
    const headerRow = headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(',');
    const rows = data.map(row => {
      return headers
        .map(h => {
          const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    const csvContent = '\uFEFF' + [headerRow, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV Export failed:', error);
  }
}

/**
 * Export full system snapshot as JSON backup
 */
export function exportSystemBackup(dataPayload: Record<string, any>, storeName: string = '黑石移动餐车'): void {
  try {
    const exportObject = {
      version: '2.5.0',
      exportedAt: new Date().toISOString(),
      storeName,
      data: dataPayload
    };

    const jsonStr = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${storeName}_全量数据备份_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Backup export failed:', error);
  }
}

/**
 * Read and validate uploaded JSON backup file
 */
export function importSystemBackup(file: File): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && parsed.data) {
          resolve(parsed.data);
        } else {
          resolve(parsed);
        }
      } catch (err) {
        reject(new Error('备份文件格式错误，无法解析 JSON 内容'));
      }
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
}
