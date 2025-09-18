import { themeQuartz } from 'ag-grid-community';

// to use myTheme in an application, pass it to the theme grid option
export const myTheme = themeQuartz
	.withParams({
        accentColor: "#62D108",
        backgroundColor: "#FFFFFF",
        borderColor: "#00000047",
        borderRadius: 2,
        browserColorScheme: "light",
        cellHorizontalPaddingScale: 0.7,
        chromeBackgroundColor: {
            ref: "backgroundColor"
        },
        columnBorder: true,
        fontSize: 13,
        foregroundColor: "#3C3C3C",
        headerBackgroundColor: "#0000000D",
        headerFontSize: 13,
        headerFontWeight: 700,
        headerTextColor: "#506FBE",
        rowBorder: true,
        rowVerticalPaddingScale: 0.8,
        sidePanelBorder: true,
        spacing: 6,
        wrapperBorder: true,
        wrapperBorderRadius: 2
    });
