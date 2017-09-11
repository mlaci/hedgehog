"use strict"

/*import express from 'express';
import { text as textParser } from 'body-parser'
import { spawn } from 'child_process'
import * as fs from 'fs'
import { Buffer } from 'buffer'
import { promisify } from 'util'
import { createHash } from 'crypto'
import del from 'del' */

const express = require('express')
const textParser = require('body-parser').text
const spawn = require('child_process').spawn
const fs = require('fs')
const Buffer = require('buffer').Buffer
const promisify = require('util').promisify
const createHash = require('crypto').createHash
const del = require('del')

const tmp = "/dev/shm/"
const programOut = 'grafika-run: '

const app = express()

app.use(textParser())

app.post('/', async (req, res) => {

  console.log(programOut+'start')
  const hash = createHash('sha256')
  
  //replace glsl version number
  var source = req.body.replace(/#version [0-9]{3}/g, '#version 300 es')
  var dest

  try {
    //for future caching
    source = await normalize(source)
    var id = hash.update(source).digest('base64').replace(/\//g,'_').replace(/\+/g,'-').replace(/\=/g,'#')

    console.log(id)

    //for parallel requests with same source
    const files = await promisify(fs.readdir)(tmp)
    const count = files.filter(file=>file.startsWith(id)).length

    dest = tmp+id+count

    //for compileFromFile
    await promisify(fs.mkdir)(dest) //temporary directory
    await promisify(fs.writeFile)(dest+'/prog.cpp', source)

    try {
      await compileFromFile(dest)
    }
    catch(err){
      console.log(err)
      //user gets back clang++ error(s)
      res.status(400).send(err)
      return
    }

    const binary = await promisify(fs.readFile)(dest+'/prog.wasm')
    res.send(binary)
  }
  catch(err){
    console.log(err)
    res.status(500).send('Internal Server Error')
  }
  finally {
    //delete temporary directory if exists
    if(dest){
      del(dest, {force:true})
      .catch((err)=>console.log(err))
    }
    console.log(programOut+'end')
  }

})

//GET request
app.get('/', (req, res) => {
  res.send('Hello World!')
})

const server = app.listen(8080)

//promisize spawn with stdio communication
function subprocess(command, args, options, message) {
  var child = spawn(command, args, options)

  var stdout = new Buffer('')
  var stderr = ''

  child.stdout.on('data', (data) => {
    stdout = Buffer.concat([stdout, data])
  })

  child.stderr.on('data', (data) => {
    stderr += data.toString()
  })

  if(message){
    child.stdin.write(message)
    child.stdin.end()
  }

  return new Promise(function (resolve, reject) {
    child.on("error", reject)
    child.on("exit", (code)=>{
      if(code==0){
        resolve(stdout)
      }
      else{
        //add frame to error text
        stderr = programOut+command+' stderr:\n'
                   +stderr 
                 +programOut+command+' stderr end'
        reject(stderr)
      }
    })
  })
}

async function normalize(source){
  //delete comments
  source = await subprocess('g++', [ '-std=c++11','-fpreprocessed','-dD','-E', '-P', '-'], undefined, source)
  //format source to LLVM style, settings in .clang-format file
  source = await subprocess('clang-format', ['-style=file', '-'], undefined, source.toString())
  return source.toString()
}

//compile source program (prog.cpp) file-to-file into webassembly binary format
async function compileFromFile(cwd){
  //todo clean args
  var compileArgs = "-target wasm32-unknown-unknown -D__EMSCRIPTEN_major__=1 -D__EMSCRIPTEN_minor__=37 -D__EMSCRIPTEN_tiny__=19 -D_LIBCPP_ABI_VERSION=2 -D__EMSCRIPTEN__ -Dunix -D__unix -D__unix__ -Werror=implicit-function-declaration -nostdinc -Xclang -nobuiltininc -Xclang -nostdsysteminc -Xclang -isystem/emscripten/system/include/libcxx -Xclang -isystem/emscripten/system/lib/libcxxabi/include -Xclang -isystem/emscripten/system/include/compat -Xclang -isystem/emscripten/system/include -Xclang -isystem/emscripten/system/include/SSE -Xclang -isystem/emscripten/system/include/libc -Xclang -isystem/emscripten/system/lib/libc/musl/arch/emscripten -Xclang -isystem/emscripten/system/local/include -std=c++11 -O2 -Xclang -isystem/emscripten/system/include/SDL -emit-llvm -c".split(' ')
  var linkArgs = "/emscripten/system/libcxx_noexcept.bc /emscripten/system/dlmalloc.bc /emscripten/system/libc.bc /emscripten/system/wasm-libc.bc /emscripten/system/libcxxabi.bc".split(' ')
  var optArgs = "-strip-debug -disable-verify -internalize -internalize-public-api-list=main,malloc,free -globaldce -disable-loop-vectorization -disable-slp-vectorization -vectorize-loops=false -vectorize-slp=false".split(' ')
  var llcArgs = "-march=wasm32 -filetype=asm -asm-verbose=false -thread-model=single -combiner-global-alias-analysis=false -enable-emscripten-sjlj".split(' ')
  var wasmArgs = "--emscripten-glue --global-base=1024 --initial-memory=16777216 -l /emscripten/system/wasm_libc_rt.a -l /emscripten/system/wasm_compiler_rt.a".split(' ')
  //compile a program to llvm ir
  await subprocess("clang++", ['prog.cpp', '-o','prog_0.o'].concat(compileArgs), {cwd})
  //link with standard c/c++ libraries 
  await subprocess("llvm-link", ['prog_0.o', '-o', 'prog.bc'].concat(linkArgs), {cwd})
  //optimize, dead code elimination
  await subprocess("opt", ['prog.bc', '-o', 'prog.opt.bc'].concat(optArgs), {cwd})
  //compile to wasm32 architecture
  await subprocess("llc", ['prog.opt.bc', '-o', 'prog.wb.s'].concat(llcArgs), {cwd})
  //compile to S-expr text format 
  await subprocess("s2wasm", ['prog.wb.s', '-o', 'prog.wast'].concat(wasmArgs), {cwd})
  //to wasm binary format
  await subprocess("wasm-as", ['prog.wast', '-o', 'prog.wasm'], {cwd})
}

//compile source program into webassembly binary format
function compileFromStdio(source){

  var compileArgs = "-target wasm32-unknown-unknown -D__EMSCRIPTEN_major__=1 -D__EMSCRIPTEN_minor__=37 -D__EMSCRIPTEN_tiny__=19 -D_LIBCPP_ABI_VERSION=2 -D__EMSCRIPTEN__ -Dunix -D__unix -D__unix__ -Werror=implicit-function-declaration -nostdinc -Xclang -nobuiltininc -Xclang -nostdsysteminc -Xclang -isystem/emscripten/system/include/libcxx -Xclang -isystem/emscripten/system/lib/libcxxabi/include -Xclang -isystem/emscripten/system/include/compat -Xclang -isystem/emscripten/system/include -Xclang -isystem/emscripten/system/include/SSE -Xclang -isystem/emscripten/system/include/libc -Xclang -isystem/emscripten/system/lib/libc/musl/arch/emscripten -Xclang -isystem/emscripten/system/local/include -std=c++11 -O2 -Xclang -isystem/emscripten/system/include/SDL -emit-llvm -c -x c++".split(' ')
  var linkArgs = "/emscripten/system/libcxx_noexcept.bc /emscripten/system/dlmalloc.bc /emscripten/system/libc.bc /emscripten/system/wasm-libc.bc /emscripten/system/libcxxabi.bc".split(' ')
  var optArgs = "-strip-debug -disable-verify -internalize -internalize-public-api-list=main,malloc,free -globaldce -disable-loop-vectorization -disable-slp-vectorization -vectorize-loops=false -vectorize-slp=false".split(' ')
  var llcArgs = "-march=wasm32 -filetype=asm -asm-verbose=false -thread-model=single -combiner-global-alias-analysis=false -enable-emscripten-sjlj".split(' ')
  var wasmArgs = "--emscripten-glue --global-base=1024 --initial-memory=16777216 -l /emscripten/system/wasm_libc_rt.a -l /emscripten/system/wasm_compiler_rt.a".split(' ')

  var compile = spawn("clang++", compileArgs.concat(['-o', '-', '-']))
  var link = spawn("llvm-link", linkArgs.concat(['-o', '-', '-']))
  var opt = spawn("opt", optArgs.concat(['-o', '-', '-']))
  var llc = spawn("llc", llcArgs.concat(['-o', '-', '-']))
  var wasmCompile = spawn("s2wasm", [].concat(wasmArgs)) //does not support source from stdin yet
  var wasmBinary = spawn("wasm-as", []) //does not support source from stdin yet
  var file = fs.createWriteStream('/app/prog.wasm')

  stringStream(source).pipe(compile.stdin)
  compile.stdout.pipe(link.stdin)
  link.stdout.pipe(opt.stdin)
  opt.stdout.pipe(llc.stdin)
  llc.stdout.pipe(wasmCompile.stdin)
  //wasmCompile.stdout.pipe(wasmBinary.stdin)
  //wasmBinary.stdout.pipe(file)
  //incomplete
}