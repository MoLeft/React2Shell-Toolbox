/**
 * 国家代码到中文名称和国旗 emoji 的映射
 */
export const countryMap = {
  // 亚洲
  CN: { name: '中国', flag: '🇨🇳' },
  JP: { name: '日本', flag: '🇯🇵' },
  KR: { name: '韩国', flag: '🇰🇷' },
  IN: { name: '印度', flag: '🇮🇳' },
  SG: { name: '新加坡', flag: '🇸🇬' },
  TH: { name: '泰国', flag: '🇹🇭' },
  VN: { name: '越南', flag: '🇻🇳' },
  MY: { name: '马来西亚', flag: '🇲🇾' },
  ID: { name: '印度尼西亚', flag: '🇮🇩' },
  PH: { name: '菲律宾', flag: '🇵🇭' },
  PK: { name: '巴基斯坦', flag: '🇵🇰' },
  BD: { name: '孟加拉国', flag: '🇧🇩' },
  HK: { name: '香港', flag: '🇭🇰' },
  TW: { name: '台湾', flag: '🇹🇼' },
  MO: { name: '澳门', flag: '🇲🇴' },

  // 北美
  US: { name: '美国', flag: '🇺🇸' },
  CA: { name: '加拿大', flag: '🇨🇦' },
  MX: { name: '墨西哥', flag: '🇲🇽' },

  // 南美
  BR: { name: '巴西', flag: '🇧🇷' },
  AR: { name: '阿根廷', flag: '🇦🇷' },
  CL: { name: '智利', flag: '🇨🇱' },
  CO: { name: '哥伦比亚', flag: '🇨🇴' },
  PE: { name: '秘鲁', flag: '🇵🇪' },

  // 欧洲
  GB: { name: '英国', flag: '🇬🇧' },
  DE: { name: '德国', flag: '🇩🇪' },
  FR: { name: '法国', flag: '🇫🇷' },
  IT: { name: '意大利', flag: '🇮🇹' },
  ES: { name: '西班牙', flag: '🇪🇸' },
  NL: { name: '荷兰', flag: '🇳🇱' },
  RU: { name: '俄罗斯', flag: '🇷🇺' },
  PL: { name: '波兰', flag: '🇵🇱' },
  SE: { name: '瑞典', flag: '🇸🇪' },
  NO: { name: '挪威', flag: '🇳🇴' },
  FI: { name: '芬兰', flag: '🇫🇮' },
  DK: { name: '丹麦', flag: '🇩🇰' },
  CH: { name: '瑞士', flag: '🇨🇭' },
  AT: { name: '奥地利', flag: '🇦🇹' },
  BE: { name: '比利时', flag: '🇧🇪' },
  IE: { name: '爱尔兰', flag: '🇮🇪' },
  PT: { name: '葡萄牙', flag: '🇵🇹' },
  GR: { name: '希腊', flag: '🇬🇷' },
  CZ: { name: '捷克', flag: '🇨🇿' },
  RO: { name: '罗马尼亚', flag: '🇷🇴' },
  UA: { name: '乌克兰', flag: '🇺🇦' },

  // 大洋洲
  AU: { name: '澳大利亚', flag: '🇦🇺' },
  NZ: { name: '新西兰', flag: '🇳🇿' },

  // 非洲
  ZA: { name: '南非', flag: '🇿🇦' },
  EG: { name: '埃及', flag: '🇪🇬' },
  NG: { name: '尼日利亚', flag: '🇳🇬' },
  KE: { name: '肯尼亚', flag: '🇰🇪' },

  // 中东
  AE: { name: '阿联酋', flag: '🇦🇪' },
  SA: { name: '沙特阿拉伯', flag: '🇸🇦' },
  IL: { name: '以色列', flag: '🇮🇱' },
  TR: { name: '土耳其', flag: '🇹🇷' },
  IR: { name: '伊朗', flag: '🇮🇷' },

  // 其他
  UNKNOWN: { name: '未知', flag: '🏳️' }
}

/**
 * 获取国家的中文名称和国旗
 * @param {string} countryCode - 国家代码（如 CN, US）
 * @returns {{name: string, flag: string, flagUrl: string, code: string}}
 */
export function getCountryInfo(countryCode) {
  if (!countryCode) {
    return { ...countryMap.UNKNOWN, flagUrl: '', code: 'UNKNOWN' }
  }

  const code = countryCode.toUpperCase()
  const info = countryMap[code] || { name: countryCode, flag: '🏳️' }

  return {
    ...info,
    code,
    flagUrl: code !== 'UNKNOWN' ? `https://flagcdn.com/112x84/${code.toLowerCase()}.png` : ''
  }
}

/**
 * 根据国家名称（中文或英文）获取国家信息
 * @param {string} countryName - 国家名称
 * @returns {{name: string, flag: string, flagUrl: string, code: string}}
 */
export function getCountryInfoByName(countryName) {
  if (!countryName) {
    return { ...countryMap.UNKNOWN, code: 'UNKNOWN', flagUrl: '' }
  }

  // 先尝试作为代码查找
  const upperName = countryName.toUpperCase()
  if (countryMap[upperName]) {
    return {
      ...countryMap[upperName],
      code: upperName,
      flagUrl: `https://flagcdn.com/112x84/${upperName.toLowerCase()}.png`
    }
  }

  // 尝试作为中文名称查找
  for (const [code, info] of Object.entries(countryMap)) {
    if (info.name === countryName) {
      return {
        ...info,
        code,
        flagUrl: `https://flagcdn.com/112x84/${code.toLowerCase()}.png`
      }
    }
  }

  // 尝试模糊匹配
  const lowerName = countryName.toLowerCase()
  for (const [code, info] of Object.entries(countryMap)) {
    if (info.name.includes(countryName) || code.toLowerCase() === lowerName) {
      return {
        ...info,
        code,
        flagUrl: `https://flagcdn.com/112x84/${code.toLowerCase()}.png`
      }
    }
  }

  return { name: countryName, flag: '🏳️', code: 'UNKNOWN', flagUrl: '' }
}
