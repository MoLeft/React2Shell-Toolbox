/**
 * 魔改的 AES 加密工具
 * 使用 Web Crypto API 实现 AES-GCM 加密
 */

// 魔改：使用自定义的盐值和迭代次数
const CUSTOM_SALT = 'R2STB_SECURITY_SALT_2024'
const ITERATIONS = 100000 // PBKDF2 迭代次数

/**
 * 简单的哈希函数（魔改的 SHA-256）
 * @param {string} text - 要哈希的文本
 * @returns {Promise<string>} Hex 编码的哈希值
 */
export async function hashPassword(text) {
  const encoder = new TextEncoder()
  // 添加自定义前缀和后缀进行魔改
  const data = encoder.encode(`R2STB_HASH_PREFIX_${text}_SUFFIX_2024`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * 从密码派生密钥
 */
async function deriveKey(password, salt) {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  const saltBuffer = encoder.encode(salt)

  // 导入密码作为密钥材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  // 使用 PBKDF2 派生密钥
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 加密数据
 * @param {string} data - 要加密的数据（JSON 字符串）
 * @param {string} password - 密码
 * @returns {Promise<string>} Base64 编码的加密数据
 */
export async function encryptData(data, password) {
  try {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)

    // 派生密钥
    const key = await deriveKey(password, CUSTOM_SALT)

    // 生成随机 IV（初始化向量）
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // 加密数据
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    )

    // 将 IV 和加密数据合并
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(encryptedBuffer), iv.length)

    // 转换为 Base64（分块处理以避免栈溢出）
    let binaryString = ''
    const chunkSize = 8192 // 每次处理 8KB
    for (let i = 0; i < combined.length; i += chunkSize) {
      const chunk = combined.slice(i, i + chunkSize)
      binaryString += String.fromCharCode(...chunk)
    }
    return btoa(binaryString)
  } catch (error) {
    console.error('加密失败:', error)
    throw new Error('Encryption failed')
  }
}

/**
 * 解密数据
 * @param {string} encryptedData - Base64 编码的加密数据
 * @param {string} password - 密码
 * @returns {Promise<string>} 解密后的数据（JSON 字符串）
 */
export async function decryptData(encryptedData, password) {
  try {
    // 从 Base64 解码
    const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

    // 提取 IV 和加密数据
    const iv = combined.slice(0, 12)
    const encryptedBuffer = combined.slice(12)

    // 派生密钥
    const key = await deriveKey(password, CUSTOM_SALT)

    // 解密数据
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedBuffer
    )

    // 转换为字符串
    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (error) {
    console.error('解密失败:', error)
    throw new Error('Incorrect password or corrupted data')
  }
}

/**
 * 验证密码是否正确（通过尝试解密测试数据）
 */
export async function verifyPassword(password, testData) {
  try {
    await decryptData(testData, password)
    return true
  } catch {
    return false
  }
}
