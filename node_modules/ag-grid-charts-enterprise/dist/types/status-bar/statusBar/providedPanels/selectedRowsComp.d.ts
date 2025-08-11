import type { BeanCollection, IStatusPanelComp } from 'ag-grid-community';
import { AgNameValue } from './agNameValue';
export declare class SelectedRowsComp extends AgNameValue implements IStatusPanelComp {
    private selectionService;
    wireBeans(beans: BeanCollection): void;
    postConstruct(): void;
    private onRowSelectionChanged;
    init(): void;
    refresh(): boolean;
    destroy(): void;
}
