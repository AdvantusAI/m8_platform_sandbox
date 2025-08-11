import { LicenseManager, ModuleRegistry, AllEnterpriseModule } from 'ag-grid-enterprise';

// Configure AG Grid Enterprise License and Modules
// Replace with your actual license key
export const configureAGGridLicense = () => {
  // Register all enterprise modules
  ModuleRegistry.registerModules([AllEnterpriseModule]);
  
  // You can set your license key here or via environment variable
  const licenseKey = 'DownloadDevTools_COM_NDEwMjM0NTgwMDAwMA==59158b5225400879a12a96634544f5b6';
  LicenseManager.setLicenseKey(licenseKey);
 
};

// Default grid options that match the application theme
export const defaultGridOptions = {
  pagination: true,
  paginationPageSize: 20,
  suppressMenuHide: true,
  enableCellTextSelection: true,
  ensureDomOrder: true,
  animateRows: true,
  rowSelection: 'single' as const,
  suppressRowClickSelection: true,
  enableRangeSelection: true,
  suppressCopyRowsToClipboard: false,
  enableCharts: false,
  enableRangeHandle: true,
  enableFillHandle: true,

  // ✅ Row classes: alternate rows + highlight on focus or selection
  getRowClass: (params: any) => {
    const classes = [];

    // Alternate row coloring
    if (params.node.rowIndex % 2 === 0) {
      classes.push('ag-row-even');
    } else {
      classes.push('ag-row-odd');
    }

    // Highlight if selected
    if (params.node.isSelected()) {
      classes.push('ag-row-selected');
    }

    // Highlight if focused (keyboard or click focus)
    if (
      params.api.getFocusedCell() &&
      params.api.getFocusedCell()!.rowIndex === params.node.rowIndex
    ) {
      classes.push('ag-row-focused');
    }

    return classes;
  },

  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: false,
    suppressMenu: false,
  },
  onCellFocused: (params: any) => {
  params.api.refreshCells({ force: true });
}
};

