const fs = require('fs')
const path = require('path')
const archiver = require('archiver')

const dist_path = path.join(__dirname, '..', 'dist')
const image_path = path.join(__dirname, '..', 'app', 'images')
const output_path = path.join(__dirname, '..', 'release')

let manifest = require('../app/manifest.json')
let package = require('../package.json')

// Merge package.json to manifest
manifest['version'] = package.version

// Add applications field needed by firefox.
manifest['applications'] = {
  ...manifest.applications,
  ...package.applications,
}

console.dir(manifest)

async function pack_xpi() {
  //  ensure output dir exists.
  await fs.promises.mkdir(output_path, { recursive: true })

  const output = fs.createWriteStream(
    path.join(output_path, 'twitterimagedownloader.xpi'),
  )
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

  // manifest.json
  archive.append(JSON.stringify(manifest), { name: 'manifest.json' })
  archive.directory(dist_path, 'dist')
  archive.directory(image_path, 'images')

  archive.finalize()
}

pack_xpi()
