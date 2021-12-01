const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

const project_root = path.join(__dirname, '..')
const dist_path = path.join(project_root, 'app', 'dist')
const image_path = path.join(project_root, 'app', 'images')
const output_path = path.join(project_root, 'release')

let manifest = require('../app/manifest.json')
let package = require('../package.json')

// Merge package.json to manifest
manifest['version'] = package.version

// Add applications field needed by firefox.
manifest['applications'] = {
  ...manifest.applications,
  ...package.applications,
}

// Firefox did not support event background page yet.
manifest['background']['persistent'] = true

console.dir(manifest)

function make_archive(output) {
  const archive = archiver('zip', {
    zlib: { level: 9 },
  })

  output.on('close', () => {
    console.log(`${archive.pointer()} total bytes`)
  })

  archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
      // log warning
      console.warn(err)
    } else {
      // throw error
      throw err
    }
  })

  // good practice to catch this error explicitly
  archive.on('error', function (err) {
    console.error(err)
    throw err
  })

  archive.pipe(output)

  return archive
}

async function prepend_build_env() {
  //  ensure output dir exists.
  await fs.promises.mkdir(output_path, { recursive: true })
}

async function pack_xpi() {
  const output = fs.createWriteStream(
    path.join(output_path, `twitterimagedownloader-${package.version}.xpi`),
  )

  const archive = make_archive(output)

  // manifest.json
  archive.append(JSON.stringify(manifest), { name: 'manifest.json' })
  archive.directory(dist_path, 'dist')
  archive.directory(image_path, 'images')

  archive.finalize()
}

// Package source code for review.
async function pack_source() {
  const output = fs.createWriteStream(
    path.join(output_path, `source-${package.version}.zip`),
  )
  const archive = make_archive(output)

  archive.file(path.join(project_root, 'README.md'), { name: 'README.md' })
  archive.file(path.join(project_root, 'CHANGELOG.md'), { name: 'CHANGELOG.md' })
  archive.file(path.join(project_root, 'package.json'), { name: 'package.json' })
  archive.file(path.join(project_root, 'package-lock.json'), { name: 'package-lock.json' })
  archive.file(path.join(project_root, 'LICENSE'), { name: 'LICENSE' })
  archive.file(path.join(project_root, 'tsconfig.json'), { name: 'tsconfig.json' })
  archive.file(path.join(project_root, 'webpack.config.js'), { name: 'webpack.config.js' })
  archive.glob('app/**', { ignore: ['app/dist/**'] })
  archive.directory(path.join(project_root, 'bin'), 'bin')

  archive.finalize()
}

prepend_build_env()
pack_xpi()
pack_source()
