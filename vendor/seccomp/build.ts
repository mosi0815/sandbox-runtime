import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const VENDOR = dirname(HERE)
const ROOT = dirname(VENDOR)

const UPSTREAM_PACKAGE = '@anthropic-ai/sandbox-runtime'
const UPSTREAM_VERSION = readUpstreamVersion()
const TARBALL_URL = `https://registry.npmjs.org/${UPSTREAM_PACKAGE}/-/sandbox-runtime-${UPSTREAM_VERSION}.tgz`

type Target = {
  name: 'x64' | 'arm64'
  tarPath: string
}

const TARGETS: Target[] = [
  { name: 'x64', tarPath: 'package/vendor/seccomp/x64/apply-seccomp' },
  { name: 'arm64', tarPath: 'package/vendor/seccomp/arm64/apply-seccomp' },
]

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function readUpstreamVersion(): string {
  const pkgPath = join(ROOT, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    version?: unknown
  }
  if (typeof pkg.version !== 'string' || pkg.version.length === 0) {
    fail(`seccomp build: missing "version" in ${pkgPath}`)
  }
  return pkg.version
}

function run(argv: string[], cwd?: string): void {
  const [cmd, ...args] = argv
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit' })
  if (r.status !== 0) {
    fail(`${argv.join(' ')} exited ${r.status ?? r.signal}`)
  }
}

async function downloadTarball(destPath: string): Promise<void> {
  console.log(`fetching ${TARBALL_URL}`)
  const response = await fetch(TARBALL_URL)
  if (!response.ok) {
    fail(
      `seccomp build: GET ${TARBALL_URL} -> ${response.status} ${response.statusText}`,
    )
  }
  writeFileSync(destPath, new Uint8Array(await response.arrayBuffer()))
}

const workDir = mkdtempSync(join(tmpdir(), 'srt-seccomp-'))
try {
  const tarballPath = join(workDir, 'package.tgz')
  await downloadTarball(tarballPath)

  for (const target of TARGETS) {
    run(['tar', '-xzf', tarballPath, '-C', workDir, target.tarPath])
    const extracted = join(workDir, target.tarPath)
    if (!existsSync(extracted)) {
      fail(
        `seccomp build: ${target.tarPath} not present in ${UPSTREAM_PACKAGE}@${UPSTREAM_VERSION}`,
      )
    }
    const outDir = join(HERE, target.name)
    const outPath = join(outDir, 'apply-seccomp')
    mkdirSync(outDir, { recursive: true })
    copyFileSync(extracted, outPath)
    chmodSync(outPath, 0o755)
    console.log(`extracted ${target.name} -> ${outPath}`)
  }
} finally {
  rmSync(workDir, { recursive: true, force: true })
}
