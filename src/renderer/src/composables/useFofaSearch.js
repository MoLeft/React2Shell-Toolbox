/**
 * FOFA 搜索功能 Composable
 * 负责搜索、分页、缓存管理
 */
import { ref, computed } from 'vue'
import { getCountryInfoByName } from '../utils/countryMap'

export function useFofaSearch(batchSettings) {
  const searchQuery = ref('')
  const searching = ref(false)
  const hasSearched = ref(false)
  const searchResults = ref([])
  const totalResults = ref(0)
  const searchResultsCache = ref({})
  const loadingPages = ref(new Set())
  const loadingPage = ref(false)
  const resultsBodyRef = ref(null)

  // 分页相关
  const currentPage = ref(1)
  const itemsPerPage = ref(50)
  const pageInput = ref(1)

  // 队列系统
  const queryQueue = ref([])
  const pageMapping = ref([])
  const queueTotalCount = ref(0)

  // 每页数量选项
  const itemsPerPageOptions = computed(() => {
    const presetSizes = [20, 50, 100, 200]
    const currentSize = itemsPerPage.value

    if (!presetSizes.includes(currentSize)) {
      return [...presetSizes, currentSize].sort((a, b) => a - b)
    }

    return presetSizes
  })

  // 计算分页后的结果
  const paginatedResults = computed(() => {
    return searchResults.value
  })

  // 总页数
  const totalPages = computed(() => {
    return Math.ceil(totalResults.value / itemsPerPage.value)
  })

  // 已加载的条数
  const loadedCount = computed(() => {
    let count = 0
    Object.values(searchResultsCache.value).forEach((pageData) => {
      if (Array.isArray(pageData)) {
        count += pageData.length
      }
    })
    return count
  })

  // 构建完整的URL
  const buildFullUrl = (host, protocol) => {
    if (host.startsWith('http://') || host.startsWith('https://')) {
      return host
    }

    const proto = protocol.toLowerCase()

    if (proto.includes('https')) {
      return `https://${host}`
    } else if (proto.includes('http')) {
      return `http://${host}`
    } else if (proto.includes('ftp')) {
      return `ftp://${host}`
    }

    return `http://${host}`
  }

  // 生成查询队列和页码映射
  const buildQueryQueue = (selectedFilters, stats) => {
    queryQueue.value = []
    pageMapping.value = []
    queueTotalCount.value = 0

    const maxResults = batchSettings.value.maxFofaResults || 10000

    if (selectedFilters.length === 0) {
      queryQueue.value.push({
        query: searchQuery.value,
        totalCount: 0
      })
    } else {
      selectedFilters.forEach((filter) => {
        const query = `${searchQuery.value} && ${filter.field}="${filter.value}"`
        const fieldData = stats[filter.field]
        const item = fieldData?.find((i) => i.value === filter.value)
        const count = Math.min(item?.count || 0, maxResults)

        queryQueue.value.push({
          query,
          totalCount: count
        })

        queueTotalCount.value += count
      })
    }

    buildPageMapping()

    console.log('生成查询队列:', queryQueue.value)
    console.log('队列总数据量:', queueTotalCount.value)
  }

  // 构建页码映射表
  const buildPageMapping = () => {
    pageMapping.value = []
    const pageSize = itemsPerPage.value
    let globalIndex = 0

    queryQueue.value.forEach((queueItem, queryIndex) => {
      const queryTotalCount = queueItem.totalCount
      let queryDataIndex = 0

      while (queryDataIndex < queryTotalCount) {
        const queryStartIndex = queryDataIndex
        const queryEndIndex = Math.min(queryDataIndex + pageSize, queryTotalCount)
        const itemCount = queryEndIndex - queryStartIndex

        const queryPage = Math.floor(queryDataIndex / pageSize) + 1

        const pageStartOffset = queryDataIndex % pageSize
        const pageEndOffset = pageStartOffset + itemCount

        pageMapping.value.push({
          queryIndex,
          queryPage,
          pageStartOffset,
          pageEndOffset,
          globalStartIndex: globalIndex,
          globalEndIndex: globalIndex + itemCount,
          itemCount
        })

        globalIndex += itemCount
        queryDataIndex += itemCount
      }
    })

    console.log(`构建了 ${pageMapping.value.length} 个页面映射`)
  }

  // 根据全局页码获取页面映射信息
  const getPageMappings = (pageNum) => {
    const pageSize = itemsPerPage.value
    const startIndex = (pageNum - 1) * pageSize
    const endIndex = startIndex + pageSize

    const mappings = pageMapping.value.filter((mapping) => {
      return mapping.globalStartIndex < endIndex && mapping.globalEndIndex > startIndex
    })

    return mappings.map((mapping) => {
      const needStart = Math.max(startIndex, mapping.globalStartIndex)
      const needEnd = Math.min(endIndex, mapping.globalEndIndex)
      const offsetInMapping = needStart - mapping.globalStartIndex

      return {
        ...mapping,
        needStart: mapping.pageStartOffset + offsetInMapping,
        needEnd: mapping.pageStartOffset + offsetInMapping + (needEnd - needStart)
      }
    })
  }

  // 从队列中加载指定页的数据
  const loadPageFromQueue = async (pageNum) => {
    console.log(`加载第 ${pageNum} 页`)

    const mappings = getPageMappings(pageNum)

    if (mappings.length === 0) {
      console.log('没有找到页面映射')
      return []
    }

    console.log(`该页需要从 ${mappings.length} 个查询中获取数据`)

    const pageData = []

    for (const mapping of mappings) {
      const queueItem = queryQueue.value[mapping.queryIndex]

      console.log(`从查询 ${mapping.queryIndex} 的第 ${mapping.queryPage} 页加载数据`)

      try {
        const result = await window.api.fofa.search(
          queueItem.query,
          mapping.queryPage,
          itemsPerPage.value,
          false,
          [
            'host',
            'ip',
            'port',
            'protocol',
            'title',
            'domain',
            'country',
            'country_name',
            'region',
            'city',
            'os',
            'server'
          ]
        )

        if (result.success && result.data.results.length > 0) {
          const items = result.data.results.map((item) => {
            const host = item[0] || ''
            const protocol = item[3] || 'http'
            const fullUrl = buildFullUrl(host, protocol)
            const countryCode = item[6] || ''
            const countryName = item[7] || ''
            const region = item[8] || ''
            const city = item[9] || ''

            return {
              host: host,
              fullUrl: fullUrl,
              ip: item[1] || '',
              port: item[2] || '',
              protocol: protocol,
              title: item[4] || '无标题',
              domain: item[5] || '',
              country: countryCode,
              countryName: countryName,
              region: region,
              city: city,
              countryInfo: getCountryInfoByName(countryName || countryCode),
              os: item[10] || '-',
              server: item[11] || '-',
              icon: null,
              iconError: false,
              checkingStatus: false,
              latency: undefined,
              accessible: undefined,
              pocStatus: 'pending'
            }
          })

          const neededItems = items.slice(mapping.needStart, mapping.needEnd)
          console.log(`从该查询获取了 ${neededItems.length} 条数据`)

          pageData.push(...neededItems)
        } else if (!result.success) {
          // 如果搜索失败，抛出错误
          console.error('FOFA 搜索失败:', result.error)
          throw new Error(result.error || '搜索失败')
        } else {
          console.log('该查询没有返回数据')
        }
      } catch (error) {
        console.error(`加载查询 ${mapping.queryIndex} 失败:`, error)
        // 重新抛出错误，让调用方知道加载失败
        throw error
      }
    }

    console.log(`第 ${pageNum} 页最终数据量: ${pageData.length}`)
    return pageData
  }

  // 加载结果的元数据
  const loadResultsMetadata = async () => {
    for (let i = 0; i < searchResults.value.length; i++) {
      const item = searchResults.value[i]

      if (item.icon !== null && item.latency !== undefined) continue

      item.checkingStatus = true

      Promise.all([
        window.api.fofa
          .fetchRealIcon(item.fullUrl)
          .then((iconResult) => {
            if (iconResult.success) {
              item.icon = iconResult.dataUrl
            }
          })
          .catch(() => {}),

        window.api.fofa
          .checkSiteStatus(item.fullUrl)
          .then((statusResult) => {
            if (statusResult.success) {
              item.accessible = statusResult.accessible
              item.latency = statusResult.latency
            } else {
              item.accessible = false
              item.latency = 0
            }
          })
          .catch(() => {
            item.accessible = false
            item.latency = 0
          })
      ]).finally(() => {
        item.checkingStatus = false
      })

      if (i < searchResults.value.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }
  }

  // 加载指定页的数据
  const loadPageData = async (pageNum) => {
    if (searchResultsCache.value[pageNum]) {
      searchResults.value = searchResultsCache.value[pageNum]
      await loadResultsMetadata()
      return
    }

    if (loadingPages.value.has(pageNum)) {
      return
    }

    loadingPages.value.add(pageNum)
    loadingPage.value = true

    try {
      const pageData = await loadPageFromQueue(pageNum)

      if (pageData && pageData.length > 0) {
        searchResultsCache.value[pageNum] = pageData

        if (pageNum === currentPage.value) {
          searchResults.value = pageData
          await loadResultsMetadata()
        }
      }
    } catch (error) {
      console.error(`加载第${pageNum}页数据失败:`, error)
      throw error
    } finally {
      loadingPages.value.delete(pageNum)
      loadingPage.value = false
    }
  }

  // 跳转到输入的页码
  const goToInputPage = () => {
    if (pageInput.value && pageInput.value >= 1 && pageInput.value <= totalPages.value) {
      currentPage.value = pageInput.value
      return true
    } else {
      pageInput.value = currentPage.value
      return false
    }
  }

  return {
    // 状态
    searchQuery,
    searching,
    hasSearched,
    searchResults,
    totalResults,
    searchResultsCache,
    loadingPages,
    loadingPage,
    resultsBodyRef,
    currentPage,
    itemsPerPage,
    pageInput,
    queryQueue,
    pageMapping,
    queueTotalCount,

    // 计算属性
    itemsPerPageOptions,
    paginatedResults,
    totalPages,
    loadedCount,

    // 方法
    buildQueryQueue,
    buildPageMapping,
    getPageMappings,
    loadPageFromQueue,
    loadResultsMetadata,
    loadPageData,
    goToInputPage
  }
}
