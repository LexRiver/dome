import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const declarationDirectory = fileURLToPath(new URL('../out/src/', import.meta.url))

async function createLegacyDeclarations(directory) {
    const entries = await readdir(directory, { withFileTypes: true })

    await Promise.all(entries.map(async entry => {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) {
            await createLegacyDeclarations(path)
        } else if (entry.name.endsWith('.d.mts')) {
            const declaration = await readFile(path, 'utf8')
            const legacyDeclaration = declaration.replace(/(["'])(\.\.?\/[^"']+)\.mjs\1/g, '$1$2$1')
            await writeFile(path.replace(/\.d\.mts$/, '.d.ts'), legacyDeclaration)
        }
    }))
}

await createLegacyDeclarations(declarationDirectory)

const entryPoint = new URL('../src/index.mts', import.meta.url).pathname
const commonBuildOptions = {
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'browser',
    target: 'es2017',
    logLevel: 'info'
}

await Promise.all([
    build({
        ...commonBuildOptions,
        outfile: new URL('../out/index.mjs', import.meta.url).pathname,
        format: 'esm'
    }),
    build({
        ...commonBuildOptions,
        outfile: new URL('../out/index.cjs', import.meta.url).pathname,
        format: 'cjs',
        packages: 'external'
    })
])
