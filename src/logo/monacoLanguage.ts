import type Monaco from 'monaco-editor'

const COMMANDS = [
    'FD', 'FORWARD', 'BK', 'BACK', 'LT', 'LEFT', 'RT', 'RIGHT',
    'PU', 'PENUP', 'PD', 'PENDOWN', 'ARC',
    'SETX', 'SETY', 'SETXY', 'SETH', 'SETHEADING', 'HOME',
    'MAKE', 'REPEAT', 'PRINT',
]

const EXT_COMMANDS = [
    'EXTCOMMENTPOS', 'EXTMARKER', 'EXTSETFN',
    'EXTBEZIERCURVE', 'EXTDEFCONTROLPOINT', 'EXTSCALE',
    'EXTGETX', 'EXTGETY', 'EXTGETH',
]

const FUNCTIONS = ['SQRT', 'LN', 'EXP', 'LOG10']

export function registerLogoLanguage(monaco: typeof Monaco) {
    if (monaco.languages.getLanguages().some((l) => l.id === 'logo')) return

    monaco.languages.register({ id: 'logo' })

    monaco.languages.setMonarchTokensProvider('logo', {
        ignoreCase: true,
        defaultToken: '',
        keywords: COMMANDS,
        extKeywords: EXT_COMMANDS,
        functions: FUNCTIONS,
        tokenizer: {
            root: [
                [/\/\*/, 'comment', '@blockComment'],
                [/#.*$/, 'comment'],
                [/\/\/.*$/, 'comment'],
                // Variable reference: :varname
                [/:[a-zA-Z_][a-zA-Z0-9_]*/, 'logo-variable'],
                // MAKE variable name: "varname
                [/"[a-zA-Z_][a-zA-Z0-9_]*/, 'logo-varname'],
                // Numbers (optional leading minus handled by operator rule)
                [/\d+(\.\d+)?/, 'number'],
                // Commands and identifiers
                [/[a-zA-Z_][a-zA-Z0-9_]*/, {
                    cases: {
                        '@extKeywords': 'logo-ext',
                        '@keywords': 'logo-keyword',
                        '@functions': 'logo-function',
                        '@default': '',
                    },
                }],
                [/[+\-*\/^]/, 'operator'],
                [/[\[\]]/, 'delimiter.bracket'],
                [/[,;]/, 'delimiter'],
            ],
            blockComment: [
                [/[^/*]+/, 'comment'],
                [/\*\//, 'comment', '@pop'],
                [/[/*]/, 'comment'],
            ],
        },
    })

    monaco.editor.defineTheme('logo-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'logo-keyword', foreground: '569CD6', fontStyle: 'bold' },
            { token: 'logo-ext', foreground: '9CDCFE', fontStyle: 'bold' },
            { token: 'logo-function', foreground: 'DCDCAA' },
            { token: 'logo-variable', foreground: '9CDCFE' },
            { token: 'logo-varname', foreground: 'CE9178' },
            { token: 'number', foreground: 'B5CEA8' },
            { token: 'comment', foreground: '6A9955' },
        ],
        colors: {},
    })

    monaco.editor.defineTheme('logo-light', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'logo-keyword', foreground: '0000FF', fontStyle: 'bold' },
            { token: 'logo-ext', foreground: '001080', fontStyle: 'bold' },
            { token: 'logo-function', foreground: '795E26' },
            { token: 'logo-variable', foreground: '001080' },
            { token: 'logo-varname', foreground: 'A31515' },
            { token: 'number', foreground: '098658' },
            { token: 'comment', foreground: '008000' },
        ],
        colors: {},
    })
}
