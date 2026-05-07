import { chmodSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.platform !== 'linux') {
  console.error('build:executables: Linux only')
  process.exit(1)
}

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DIST = join(ROOT, 'dist')
const ENTRYPOINT = join(ROOT, 'src', 'cli.ts')

type ExecutableTarget = {
  name: 'amd64' | 'arm64'
  bunTarget: 'bun-linux-x64' | 'bun-linux-arm64'
  seccompPath: string
}

const TARGETS: ExecutableTarget[] = [
  {
    name: 'amd64',
    bunTarget: 'bun-linux-x64',
    seccompPath: join(ROOT, 'vendor', 'seccomp', 'x64', 'apply-seccomp'),
  },
  {
    name: 'arm64',
    bunTarget: 'bun-linux-arm64',
    seccompPath: join(ROOT, 'vendor', 'seccomp', 'arm64', 'apply-seccomp'),
  },
]

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function requireExecutable(path: string): void {
  if (!existsSync(path)) {
    fail(`${path} is missing; run bun run build:seccomp first`)
  }
  if ((statSync(path).mode & 0o111) === 0) {
    fail(`${path} is not executable; run bun run build:seccomp again`)
  }
}

for (const target of TARGETS) {
  requireExecutable(target.seccompPath)
}

mkdirSync(DIST, { recursive: true })

for (const target of TARGETS) {
  const outfile = join(DIST, `srt-linux-${target.name}`)
  const result = await Bun.build({
    entrypoints: [ENTRYPOINT],
    compile: {
      target: target.bunTarget,
      outfile,
    },
    minify: true,
  })

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log)
    }
    fail(`failed to build ${target.name} executable`)
  }

  chmodSync(outfile, 0o755)
  console.log(`built ${target.name} ${outfile}`)
}
