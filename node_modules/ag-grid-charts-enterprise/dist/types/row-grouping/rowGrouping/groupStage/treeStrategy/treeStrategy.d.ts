import type { BeanCollection, ChangedPath, GetDataPath, IRowNodeStage, InitialGroupOrderComparatorParams, IsGroupOpenByDefaultParams, StageExecuteParams, WithoutGridCommon } from 'ag-grid-community';
import { BeanStub } from 'ag-grid-community';
export type IsGroupOpenByDefaultCallback = ((params: WithoutGridCommon<IsGroupOpenByDefaultParams>) => boolean) | undefined;
export type InitialGroupOrderComparatorCallback = ((params: WithoutGridCommon<InitialGroupOrderComparatorParams>) => number) | undefined;
export interface TreeExecutionDetails {
    changedPath: ChangedPath | undefined;
    expandByDefault: number;
    suppressGroupMaintainValueType: boolean;
    getDataPath: GetDataPath | undefined;
    isGroupOpenByDefault: IsGroupOpenByDefaultCallback;
    initialGroupOrderComparator: InitialGroupOrderComparatorCallback;
}
export declare class TreeStrategy extends BeanStub implements IRowNodeStage {
    private beans;
    private showRowGroupColsService;
    private oldGroupDisplayColIds;
    /** Rows that are pending deletion, this.commitDeletedRows() will finalize removal. */
    private rowsPendingDestruction;
    /** The root node of the tree. */
    private readonly root;
    wireBeans(beans: BeanCollection): void;
    destroy(): void;
    execute(params: StageExecuteParams): void;
    private handleRowData;
    private handleTransaction;
    private handleRowNodesOrderChanged;
    private checkAllGroupDataAfterColsChanged;
    /** Transactional add/update */
    private addOrUpdateRows;
    /** Transactional removal */
    private removeRows;
    private getDataPath;
    /**
     * Gets the last node of a path. Inserts filler nodes where needed.
     * Note that invalidate() is not called, is up to the caller to call it if needed.
     */
    private upsertPath;
    /** Add or updates the row to a non-root node, preparing the tree correctly for the commit. */
    private addOrUpdateRow;
    /**
     * Overwrites the row property of a non-root node to null.
     * @returns The previous row, if any, that was overwritten.
     */
    private removeRow;
    /** Commit the changes performed to the tree */
    private commitTree;
    /** Calls commitChild for each invalidated child, recursively. We commit only the invalidated paths. */
    private commitInvalidatedChildren;
    /** Commit the changes performed to a node and its children */
    private commitChild;
    private commitNodePreOrder;
    private commitNodePostOrder;
    private createFillerRow;
    private setGroupData;
    private getExpandedInitialValue;
    /** Called to clear a subtree. */
    private clearTree;
    /** Called by the destructor, to the destroy the whole tree. */
    private destroyTree;
    /**
     * Finalizes the deletion of a row.
     * @param immediate If true, the row is deleted immediately.
     * If false, the row is marked for deletion, and will be deleted later with this.deleteDeletedRows()
     */
    private destroyRow;
    /**
     * destroyRow can defer the deletion to the end of the commit stage.
     * This method finalizes the deletion of rows that were marked for deletion.
     */
    private commitDestroyedRows;
}
