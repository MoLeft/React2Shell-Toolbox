import { spawn } from 'child_process'
import { join } from 'path'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 执行 POC 检测（直接调用 Python 模块）
 * 使用更可靠的方式调用 Python 代码
 */
export function executePOC(url, command) {
  return new Promise((resolve, reject) => {
    // 项目根目录
    const projectRoot = path.resolve(__dirname, '../../../')

    // 创建一个临时的 Python 脚本来执行 POC
    // 转义 URL 和命令中的特殊字符
    const escapedUrl = url.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"')
    const escapedCommand = command.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"')

    const pythonCode = `
import sys
import os
import json
import threading
import time

# 添加项目路径
project_root = r"${projectRoot.replace(/\\/g, '/')}"
sys.path.insert(0, os.path.join(project_root, 'src'))

from utils.poc_utils import execute_poc

result_container = {'done': False, 'result': None, 'lock': threading.Lock()}

def callback(status_code, response, is_vulnerable, digest_content, command_failed, failure_reason):
    with result_container['lock']:
        result_container['result'] = {
            'status_code': status_code,
            'response': response,
            'is_vulnerable': is_vulnerable,
            'digest_content': digest_content or '',
            'command_failed': command_failed,
            'failure_reason': failure_reason or ''
        }
        result_container['done'] = True

try:
    execute_poc('${escapedUrl}', '${escapedCommand}', callback)
    # 等待回调完成
    timeout = 15
    elapsed = 0
    while not result_container['done'] and elapsed < timeout:
        time.sleep(0.1)
        elapsed += 0.1
    
    if result_container['done']:
        print(json.dumps(result_container['result'], ensure_ascii=False))
    else:
        print(json.dumps({'error': '执行超时'}, ensure_ascii=False))
except Exception as e:
    import traceback
    print(json.dumps({'error': str(e), 'traceback': traceback.format_exc()}, ensure_ascii=False))
    `.trim()

    // 使用 Python 执行代码
    const pythonProcess = spawn('python', ['-c', pythonCode], {
      cwd: projectRoot,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    pythonProcess.on('close', (code) => {
      try {
        const output = stdout.trim()
        if (output) {
          const result = JSON.parse(output)
          if (result.error) {
            reject(new Error(result.error))
          } else {
            resolve(result)
          }
        } else {
          reject(new Error(`Python 执行失败: ${stderr || '无输出'}`))
        }
      } catch (e) {
        reject(new Error(`解析结果失败: ${e.message}\n输出: ${stdout}\n错误: ${stderr}`))
      }
    })

    pythonProcess.on('error', (error) => {
      reject(new Error(`启动 Python 进程失败: ${error.message}`))
    })
  })
}
