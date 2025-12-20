/**
 * GitHub OAuth2 处理器
 * 用于验证用户是否 star 了项目
 */
import https from 'https'
import {
  GITHUB_AUTH_IN_PROGRESS,
  GITHUB_AUTH_TIMEOUT,
  GITHUB_NO_PENDING_AUTH,
  GITHUB_AUTH_FAILED,
  GITHUB_NO_AUTH_CODE,
  GITHUB_TOKEN_FETCH_FAILED,
  GITHUB_RESPONSE_PARSE_FAILED,
  GITHUB_STAR_CHECK_FAILED,
  GITHUB_API_REQUEST_FAILED
} from './error-codes.js'

// GitHub OAuth 配置
const GITHUB_CLIENT_ID = 'Ov23li0lknz90juyPI8s' // 需要替换为你的 GitHub OAuth App Client ID
const GITHUB_CLIENT_SECRET = 'e12df93d17c5a9999f35ea667e47a15706b74080' // 需要替换为你的 Client Secret
const REDIRECT_URI = 'r2stb://github/oauth2/callback'
const REPO_OWNER = 'MoLeft'
const REPO_NAME = 'React2Shell-Toolbox'

// 存储待处理的授权请求
let pendingAuthResolve = null

/**
 * 发起 GitHub OAuth 授权
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export async function initiateGitHubAuth() {
  return new Promise((resolve) => {
    // 如果已有待处理的授权，拒绝新的请求
    if (pendingAuthResolve) {
      resolve({ success: false, error: GITHUB_AUTH_IN_PROGRESS })
      return
    }

    // 保存 resolve 函数，等待回调
    pendingAuthResolve = resolve

    // 构建授权 URL
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=user:email`

    // 在默认浏览器中打开授权页面
    const { shell } = require('electron')
    shell.openExternal(authUrl)

    // 设置超时（5分钟）
    setTimeout(
      () => {
        if (pendingAuthResolve) {
          const resolve = pendingAuthResolve
          pendingAuthResolve = null
          resolve({ success: false, error: GITHUB_AUTH_TIMEOUT })
        }
      },
      5 * 60 * 1000
    )
  })
}

/**
 * 处理 OAuth 回调
 * @param {string} callbackUrl - 回调 URL
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export async function handleOAuthCallback(callbackUrl) {
  if (!pendingAuthResolve) {
    return { success: false, error: GITHUB_NO_PENDING_AUTH }
  }

  const resolve = pendingAuthResolve
  pendingAuthResolve = null

  try {
    // 提取授权码
    const urlObj = new URL(callbackUrl)
    const code = urlObj.searchParams.get('code')
    const error = urlObj.searchParams.get('error')

    if (error) {
      resolve({ success: false, error: `${GITHUB_AUTH_FAILED}: ${error}` })
      return { success: false, error: `${GITHUB_AUTH_FAILED}: ${error}` }
    }

    if (!code) {
      resolve({ success: false, error: GITHUB_NO_AUTH_CODE })
      return { success: false, error: GITHUB_NO_AUTH_CODE }
    }

    // 交换访问令牌
    const token = await exchangeCodeForToken(code)
    resolve({ success: true, token })
    return { success: true, token }
  } catch (error) {
    resolve({ success: false, error: error.message })
    return { success: false, error: error.message }
  }
}

/**
 * 交换授权码为访问令牌
 * @param {string} code - 授权码
 * @returns {Promise<string>} 访问令牌
 */
function exchangeCodeForToken(code) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI
    })

    const options = {
      hostname: 'github.com',
      path: '/login/oauth/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        Accept: 'application/json'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          if (response.access_token) {
            resolve(response.access_token)
          } else {
            reject(new Error(response.error_description || GITHUB_TOKEN_FETCH_FAILED))
          }
        } catch (err) {
          reject(new Error(`${GITHUB_RESPONSE_PARSE_FAILED}: ${err.message}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.write(postData)
    req.end()
  })
}

/**
 * 检查用户是否 star 了项目
 * @param {string} token - GitHub 访问令牌
 * @returns {Promise<{success: boolean, starred?: boolean, username?: string, error?: string}>}
 */
export async function checkUserStarred(token) {
  try {
    // 获取用户信息
    const userInfo = await makeGitHubRequest('/user', token)

    // 检查是否 star 了项目
    const starCheckUrl = `/user/starred/${REPO_OWNER}/${REPO_NAME}`
    const starred = await checkStarStatus(starCheckUrl, token)

    return {
      success: true,
      starred,
      username: userInfo.login,
      avatar: userInfo.avatar_url
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * 检查 star 状态
 * @param {string} path - API 路径
 * @param {string} token - 访问令牌
 * @returns {Promise<boolean>}
 */
function checkStarStatus(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'React2Shell-Toolbox',
        Accept: 'application/vnd.github.v3+json'
      }
    }

    const req = https.request(options, (res) => {
      // 204 表示已 star，404 表示未 star
      if (res.statusCode === 204) {
        resolve(true)
      } else if (res.statusCode === 404) {
        resolve(false)
      } else {
        reject(new Error(`${GITHUB_STAR_CHECK_FAILED}: ${res.statusCode}`))
      }
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.end()
  })
}

/**
 * 发起 GitHub API 请求
 * @param {string} path - API 路径
 * @param {string} token - 访问令牌
 * @returns {Promise<any>}
 */
function makeGitHubRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'React2Shell-Toolbox',
        Accept: 'application/vnd.github.v3+json'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data))
          } else {
            reject(new Error(`${GITHUB_API_REQUEST_FAILED}: ${res.statusCode}`))
          }
        } catch (err) {
          reject(new Error(`${GITHUB_RESPONSE_PARSE_FAILED}: ${err.message}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.end()
  })
}

/**
 * 验证访问令牌是否有效
 * @param {string} token - GitHub 访问令牌
 * @returns {Promise<{success: boolean, valid?: boolean, error?: string}>}
 */
export async function validateToken(token) {
  try {
    await makeGitHubRequest('/user', token)
    return { success: true, valid: true }
  } catch (error) {
    return { success: false, valid: false, error: error.message }
  }
}
