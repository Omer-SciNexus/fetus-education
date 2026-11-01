import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFile, stat, mkdir } from 'node:fs/promises'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
import assert from 'node:assert/strict'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const original = process.argv.includes('--original')
const short = process.argv.includes('--short')
const cinematic = !original && process.argv.includes('--hearing')
const name = short ? 'a-little-sun-hearing-43s' : original ? 'a-little-sun' : cinematic ? 'a-little-sun-hearing' : 'a-little-sun-bonding'
const duration = short ? 43 : original ? 68 : 86
const width = cinematic ? 1920 : 1280, height = cinematic ? 1080 : 720
const video = path.join(root, 'public/videos', `${name}.mp4`)
await mkdir(path.join(root, '.video-render'), { recursive: true })
const ffmpeg = execFileSync('python', ['-c', "import sys;sys.path.insert(0,'.video-tools');import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"], { cwd: root, encoding: 'utf8' }).trim()
// Decode both streams from beginning to end; fail on any decoding error.
execFileSync(ffmpeg, ['-v', 'error', '-xerror', '-i', video, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-'], { stdio: 'inherit' })
const captions = await readFile(path.join(root, 'public/videos', `${name}.en.vtt`), 'utf8')
const seconds = value => value.split(':').reduce((total, part) => total * 60 + Number(part), 0)
const cues = [...captions.matchAll(/((?:\d{2}:)?\d{2}:\d{2}\.\d{3}) --> ((?:\d{2}:)?\d{2}:\d{2}\.\d{3})/g)]
assert.ok(captions.startsWith('WEBVTT') && cues.length > 0)
let end = 0
for (const cue of cues) {
  const start = seconds(cue[1]), next = seconds(cue[2])
  assert.equal(start, end, 'Captions should cover the film without gaps or overlaps')
  assert.ok(next > start && next <= duration)
  end = next
}
assert.equal(end, duration)
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(pathToFileURL(path.join(root, 'scripts/video/scene.html')).href)
  await page.setContent('<style>body{margin:0;background:#000}video{width:100vw;height:100vh}</style><video></video>')
  const info = await page.evaluate(async src => {
    const v = document.querySelector('video')
    await new Promise((resolve, reject) => {
      v.onloadedmetadata = resolve
      v.onerror = () => reject(new Error(v.error?.message))
      v.src = src
    })
    v.muted = true
    await v.play()
    await new Promise(resolve => setTimeout(resolve, 1200))
    v.pause()
    return { duration: v.duration, width: v.videoWidth, height: v.videoHeight, played: v.currentTime > 0 }
  }, pathToFileURL(video).href)
  assert.equal(info.duration, duration)
  assert.equal(info.width, width)
  assert.equal(info.height, height)
  assert.ok(info.played)
  for (const time of short ? [3, 8.5, 16.5, 22.5, 25, 33.5, 41] : original ? [20, 55, 64] : cinematic ? [6, 17, 33, 45, 50, 55, 67, 75, 82] : [20, 48, 54, 60, 62, 67, 82]) {
    await page.evaluate(time => new Promise((resolve, reject) => {
      const v = document.querySelector('video')
      v.onseeked = resolve
      v.onerror = () => reject(new Error(v.error?.message))
      v.currentTime = time
    }), time)
    await page.screenshot({ path: path.join(root, '.video-render', `${name}-playback-${time}.png`) })
  }
  console.log(JSON.stringify({ file: `${name}.mp4`, ...info, captions: cues.length, bytes: (await stat(video)).size, fullDecode: 'passed' }))
} finally {
  await browser.close()
}
