/**
 * POC 响应查看功能 Composable
 * 负责响应内容的查看和高亮
 */
import { ref, computed } from 'vue'
import hljs from 'highlight.js/lib/common'

export function usePocResponse() {
  const responseViewMode = ref('source')

  // 高亮响应内容
  const getHighlightedResponse = (responseText) => {
    if (!responseText) return ''
    try {
      const res = hljs.highlightAuto(responseText)
      return res.value
    } catch {
      return responseText
    }
  }

  return {
    responseViewMode,
    getHighlightedResponse
  }
}
