/**
 * 错误码常量
 * 主进程返回这些错误码，渲染进程通过 i18n 翻译
 */

// FOFA 相关错误
export const FOFA_NOT_CONFIGURED = 'messages.fofaNotConfigured'
export const FOFA_RATE_LIMIT = 'messages.fofaRateLimitExceeded'
export const FOFA_SERVER_ERROR = 'messages.fofaServerError'
export const FOFA_REQUEST_ERROR = 'messages.fofaRequestError'
export const FOFA_API_ERROR = 'messages.fofaApiError'
export const FOFA_CONNECTION_SUCCESS = 'messages.fofaConnectionSuccess'
export const FOFA_FAVICON_NOT_FOUND = 'messages.fofaFaviconNotFound'
export const FOFA_FETCH_FAILED = 'messages.fofaFetchFailed'

// 存储相关错误
export const HISTORY_FORMAT_ERROR = 'messages.historyFormatError'
export const HISTORY_MUST_BE_ARRAY = 'messages.historyMustBeArray'

// 代理相关错误
export const PROXY_CONNECTION_REFUSED = 'messages.proxyConnectionRefused'
export const PROXY_TIMEOUT = 'messages.proxyTimeout'
export const PROXY_HOST_NOT_FOUND = 'messages.proxyHostNotFound'
export const PROXY_IP_INFO_PARSE_FAILED = 'messages.proxyIpInfoParseFailed'

// POC 相关错误
export const POC_NETWORK_ERROR = 'messages.pocNetworkError'
export const POC_NO_RESPONSE = 'messages.pocNoResponse'
export const POC_REQUEST_ERROR = 'messages.pocRequestError'

// 终端相关错误
export const TERMINAL_INJECT_FAILED = 'messages.terminalInjectFailed'
export const TERMINAL_SESSION_NOT_EXIST = 'messages.terminalSessionNotExist'
export const TERMINAL_NOT_CONNECTED = 'messages.terminalNotConnected'
export const TERMINAL_CONNECTION_NOT_EXIST = 'messages.terminalConnectionNotExist'
export const TERMINAL_REQUEST_FAILED = 'messages.terminalRequestFailed'
export const TERMINAL_REQUEST_ERROR = 'messages.terminalRequestError'
export const TERMINAL_CONNECTION_FAILED = 'messages.terminalConnectionFailed'
export const TERMINAL_CONNECTION_ERROR = 'messages.terminalConnectionError'
export const TERMINAL_INJECT_SUCCESS = 'messages.terminalInjectSuccess'
export const TERMINAL_TARGET_NOT_VULNERABLE = 'messages.terminalTargetNotVulnerable'

// GitHub 相关错误
export const GITHUB_AUTH_IN_PROGRESS = 'messages.githubAuthInProgress'
export const GITHUB_AUTH_TIMEOUT = 'messages.githubAuthTimeout'
export const GITHUB_NO_PENDING_AUTH = 'messages.githubNoPendingAuth'
export const GITHUB_AUTH_FAILED = 'messages.githubAuthFailed'
export const GITHUB_NO_AUTH_CODE = 'messages.githubNoAuthCode'
export const GITHUB_TOKEN_FETCH_FAILED = 'messages.githubTokenFetchFailed'
export const GITHUB_RESPONSE_PARSE_FAILED = 'messages.githubResponseParseFailed'
export const GITHUB_STAR_CHECK_FAILED = 'messages.githubStarCheckFailed'
export const GITHUB_API_REQUEST_FAILED = 'messages.githubApiRequestFailed'

// 更新相关
export const UPDATE_ALREADY_LATEST = 'messages.updateAlreadyLatest'
export const UPDATE_CHECK_FAILED = 'messages.updateCheckFailed'

// 通用错误
export const OPERATION_SUCCESS = 'messages.operationSuccess'
export const OPERATION_FAILED = 'messages.operationFailed'
export const SAVE_SUCCESS = 'messages.saveSuccess'
export const SAVE_FAILED = 'messages.saveFailed'
export const DELETE_SUCCESS = 'messages.deleteSuccess'
export const DELETE_FAILED = 'messages.deleteFailed'
export const CONNECTION_FAILED = 'messages.connectionFailed'
export const AUTH_FAILED = 'messages.authFailed'
export const TIMEOUT = 'messages.timeout'
export const UNKNOWN_ERROR = 'messages.unknownError'
