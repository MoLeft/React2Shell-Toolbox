/**
 * 密码哈希工具
 * 用于生成密码的哈希值，作为文件混淆的密钥
 */

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
