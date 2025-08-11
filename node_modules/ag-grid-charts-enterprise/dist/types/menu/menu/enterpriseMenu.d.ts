import type { AgColumn, AgEvent, AgProvidedColumnGroup, BeanCollection, ContainerType, IMenuFactory, NamedBean } from 'ag-grid-community';
import { BeanStub } from 'ag-grid-community';
export interface TabSelectedEvent extends AgEvent<'tabSelected'> {
    key: string;
}
export declare class EnterpriseMenuFactory extends BeanStub implements NamedBean, IMenuFactory {
    beanName: "enterpriseMenuFactory";
    private popupService;
    private focusService;
    private ctrlsService;
    private visibleColsService;
    private filterManager?;
    private menuUtils;
    private menuService;
    private columnMenuFactory;
    wireBeans(beans: BeanCollection): void;
    private lastSelectedTab;
    private activeMenu;
    hideActiveMenu(): void;
    showMenuAfterMouseEvent(columnOrGroup: AgColumn | AgProvidedColumnGroup | undefined, mouseEvent: MouseEvent | Touch, containerType: ContainerType, filtersOnly?: boolean): void;
    private splitColumnOrGroup;
    showMenuAfterButtonClick(columnOrGroup: AgColumn | AgProvidedColumnGroup | undefined, eventSource: HTMLElement, containerType: ContainerType, filtersOnly?: boolean): void;
    private showMenu;
    private addStopAnchoring;
    private getMenuParams;
    private createMenu;
    private dispatchVisibleChangedEvent;
    isMenuEnabled(column: AgColumn): boolean;
    showMenuAfterContextMenuEvent(column: AgColumn | AgProvidedColumnGroup | undefined, mouseEvent?: MouseEvent | null, touchEvent?: TouchEvent | null): void;
}
