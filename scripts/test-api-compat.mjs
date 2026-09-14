import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const projectDirectory = fileURLToPath(new URL('../', import.meta.url))
const outputDirectory = join(projectDirectory, 'out')
const expectedLegacyExports = [
    'AnimatedArray',
    'AnimatedTable',
    'AnimatedText',
    'Async',
    'DataTypes',
    'DomeComponent',
    'DomeManipulator',
    'DomeRouter',
    'ObservableArray',
    'ObservableLocalStorageVariable',
    'ObservableMap',
    'ObservableValue',
    'React',
    'TypeEvent',
    'checkIfObservable',
    'createObservable',
    'h'
]

function assertExpectedExports(label, exports) {
    const missing = expectedLegacyExports.filter(name => !exports.includes(name))
    assert.deepEqual(missing, [], `${label} is missing legacy exports: ${missing.join(', ')}`)
}

function declarationExports(path) {
    const modernDeclaration = path.endsWith('.d.mts')
    const program = ts.createProgram([path], {
        module: modernDeclaration ? ts.ModuleKind.NodeNext : ts.ModuleKind.ESNext,
        moduleResolution: modernDeclaration
            ? ts.ModuleResolutionKind.NodeNext
            : ts.ModuleResolutionKind.Node10,
        target: ts.ScriptTarget.ESNext,
        skipLibCheck: true
    })
    const sourceFile = program.getSourceFile(path)
    assert(sourceFile, `Unable to load declaration entry point ${path}`)
    const diagnostics = program.getSyntacticDiagnostics(sourceFile)
    assert.deepEqual(diagnostics, [], `Invalid declaration syntax in ${path}`)

    const checker = program.getTypeChecker()
    const symbol = checker.getSymbolAtLocation(sourceFile)
    assert(symbol, `Unable to inspect declaration exports in ${path}`)
    return checker.getExportsOfModule(symbol).map(entry => entry.name)
}

async function outputFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const nestedFiles = await Promise.all(entries.map(async entry => {
        const path = join(directory, entry.name)
        return entry.isDirectory() ? outputFiles(path) : [path]
    }))
    return nestedFiles.flat()
}

globalThis.window = {
    addEventListener() {},
    location: { pathname: '/' },
    history: {
        pushState() {},
        replaceState() {},
        go() {}
    }
}

const esmEntry = await import(new URL('../out/src/index.mjs', import.meta.url))
const require = createRequire(import.meta.url)
const commonJsEntry = require('../out/index.cjs')

assertExpectedExports('ESM entry point', Object.keys(esmEntry))
assertExpectedExports('CommonJS entry point', Object.keys(commonJsEntry))

for (const declarationName of ['index.d.ts', 'index.d.mts']) {
    const declarationPath = join(outputDirectory, 'src', declarationName)
    assertExpectedExports(declarationName, declarationExports(declarationPath))
    const declaration = await readFile(declarationPath, 'utf8')
    assert(!declaration.includes('console-test'), `${declarationName} exposes a console test module`)
}

const publishedTestModules = (await outputFiles(outputDirectory)).filter(path =>
    /(?:\.test|\.console-test|\/temp-test)\./.test(path)
)
assert.deepEqual(
    publishedTestModules,
    [],
    `Build output contains test modules: ${publishedTestModules.map(path => path.slice(outputDirectory.length + 1)).join(', ')}`
)

console.log(`Verified ${expectedLegacyExports.length} legacy exports across ESM, CommonJS, .d.ts, and .d.mts entry points`)
