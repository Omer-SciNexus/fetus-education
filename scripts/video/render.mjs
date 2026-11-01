import { chromium } from '@playwright/test'
import { spawn, execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { once } from 'node:events'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out=path.join(root,'public','videos')
await mkdir(out,{recursive:true})
await mkdir(path.join(root,'.video-render'),{recursive:true})
const original = process.argv.includes('--original')
const width = 1280, height = 720
const scene=pathToFileURL(path.join(root,'scripts/video/scene.html'))
scene.searchParams.set('edition', original ? 'original' : 'bonding')
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1})
page.on('pageerror', error=>console.error('Scene error:',error.message))
await page.goto(scene.href)
await page.waitForFunction(()=>window.film&&window.renderFrame,{},{timeout:60000})
await page.evaluate(()=>document.fonts.ready)
const { duration, name, poster, previews } = await page.evaluate(()=>window.film)
for(const t of previews){await page.evaluate(t=>window.renderFrame(t),t);await page.screenshot({path:path.join(root,'.video-render',`${name}-${t}.png`)})}
await page.evaluate(t=>window.renderFrame(t),poster)
await page.screenshot({path:path.join(out,`${name}-poster.jpg`),type:'jpeg',quality:92})
if(process.argv.includes('--preview')){await browser.close();process.exit(0)}
const ffmpeg=execFileSync('python',['-c',"import sys;sys.path.insert(0,'.video-tools');import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"],{cwd:root,encoding:'utf8'}).trim()
execFileSync('python',[path.join(root,'scripts/video/soundtrack.py'),...(original ? [] : ['--bonding'])],{cwd:root,stdio:'inherit'})
const encoder=spawn(ffmpeg,['-y','-hide_banner','-loglevel','warning','-f','image2pipe','-vcodec','mjpeg','-r','24','-i','pipe:0','-i',path.join(root,'.video-render',`${name}-soundtrack.wav`),'-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-t',String(duration),'-movflags','+faststart',path.join(out,`${name}.mp4`)],{cwd:root,stdio:['pipe','ignore','inherit']})
const finished=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(new Error(`Encoder exited ${code}`)))})
encoder.stdin.on('error',e=>console.error('Encoder input error:',e.message))
try{
 for(let i=0;i<duration*24;i++){
  const jpeg=await page.evaluate(t=>{window.renderFrame(t);return document.querySelector('canvas').toDataURL('image/jpeg',.95).split(',')[1]},i/24)
  if(!encoder.stdin.write(Buffer.from(jpeg,'base64')))await once(encoder.stdin,'drain')
  if(i%240===0)console.log(`Rendered ${(i/24).toFixed(0)} / ${duration} seconds`)
 }
 encoder.stdin.end();await finished
 console.log(`Created public/videos/${name}.mp4 (${width}×${height}, 24 fps, ${duration} seconds)`)
}finally{await browser.close()}
