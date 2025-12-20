/**
 * 获取默认劫持 HTML 模板
 * @returns {string} 默认的劫持页面 HTML
 */
export function getDefaultHijackTemplate() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>安全警告 - CVE-2025-55182</title>
    <script src="https://cdn.jsdelivr.net/npm/vue@3.4.21/dist/vue.global.prod.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
            background-color: #0a0a0a;
            color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            width: 100%;
        }

        .warning-icon {
            display: flex;
            align-items: center;
            margin-right: 15px;
        }

        .warning-icon svg {
            width: 48px;
            height: 48px;
            stroke: #ff3b3b;
            stroke-width: 2;
            fill: none;
            display: block;
        }

        .content {
            position: relative;
            background-color: #1a1a1a;
            border: 1px solid #ff3b3b;
            padding: 60px 50px;
            text-align: center;
            animation: borderPulse 3s ease-in-out infinite;
        }

        @keyframes borderPulse {
            0%, 100% {
                box-shadow: 
                    0 0 10px rgba(255, 59, 59, 0.3),
                    0 0 20px rgba(255, 59, 59, 0.2),
                    0 0 30px rgba(255, 59, 59, 0.1);
            }
            50% {
                box-shadow: 
                    0 0 20px rgba(255, 59, 59, 0.5),
                    0 0 40px rgba(255, 59, 59, 0.3),
                    0 0 60px rgba(255, 59, 59, 0.2),
                    0 0 80px rgba(255, 59, 59, 0.1);
            }
        }

        .title-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 20px;
        }

        h1 {
            font-size: 48px;
            font-weight: 700;
            color: #ff3b3b;
            margin: 0;
            letter-spacing: -1px;
            display: inline-block;
        }

        .cve-id {
            font-size: 32px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 40px;
            font-family: 'Courier New', monospace;
        }

        .description {
            font-size: 18px;
            line-height: 1.8;
            color: #b0b0b0;
            margin-bottom: 20px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .notice-text {
            font-size: 13px;
            line-height: 1.6;
            color: #777;
            margin-bottom: 50px;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
            font-style: italic;
        }

        .info-grid {
            display: flex;
            justify-content: center;
            align-items: stretch;
            gap: 30px;
            margin-bottom: 50px;
        }

        .info-item {
            flex: 1;
            padding: 25px;
            background-color: #0a0a0a;
            border: 1px solid #333;
            text-align: center;
        }

        .info-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #666;
            margin-bottom: 10px;
        }

        .info-value {
            font-size: 24px;
            font-weight: 600;
            color: #ffffff;
        }

        .critical {
            color: #ff3b3b;
        }

        .actions {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }

        .btn {
            padding: 16px 40px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            border: 2px solid;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .btn-primary {
            background-color: #ff3b3b;
            color: #ffffff;
            border-color: #ff3b3b;
        }

        .btn-primary:hover {
            background-color: #ffffff;
            color: #ff3b3b;
        }

        .btn-secondary {
            background-color: transparent;
            color: #ffffff;
            border-color: #ffffff;
        }

        .btn-secondary:hover {
            background-color: #ffffff;
            color: #0a0a0a;
        }

        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #666;
        }

        .footer-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #888;
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .footer-link:hover {
            color: #ffffff;
        }

        .github-icon {
            width: 18px;
            height: 18px;
            fill: currentColor;
        }

        .lang-selector {
            position: fixed;
            top: 30px;
            right: 30px;
            z-index: 1000;
        }

        .lang-button {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 16px;
            background-color: #1a1a1a;
            border: 1px solid #333;
            color: #ffffff;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .lang-button:hover {
            border-color: #666;
            background-color: #222;
        }

        .flag-icon {
            width: 24px;
            height: 16px;
            object-fit: cover;
            border: 1px solid #333;
        }

        .lang-dropdown {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background-color: #1a1a1a;
            border: 1px solid #333;
            min-width: 200px;
            max-height: 400px;
            overflow-y: auto;
        }

        .lang-option {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            cursor: pointer;
            transition: background-color 0.2s ease;
            border-bottom: 1px solid #222;
        }

        .lang-option:last-child {
            border-bottom: none;
        }

        .lang-option:hover {
            background-color: #222;
        }

        .lang-option.active {
            background-color: #2a2a2a;
        }

        .lang-name {
            font-size: 14px;
            color: #ffffff;
        }

        @media (max-width: 768px) {
            .lang-selector {
                top: 20px;
                right: 20px;
            }

            .lang-button {
                padding: 8px 12px;
                font-size: 13px;
            }
            .content {
                padding: 40px 30px;
            }

            h1 {
                font-size: 36px;
            }

            .cve-id {
                font-size: 24px;
            }

            .description {
                font-size: 16px;
            }

            .info-grid {
                flex-direction: column;
                gap: 20px;
                padding: 20px;
            }

            .title-wrapper {
                flex-direction: column;
            }

            .warning-icon {
                margin-right: 0;
                margin-bottom: 15px;
            }
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="lang-selector">
            <button class="lang-button" @click="toggleDropdown">
                <img :src="\`https://flagcdn.com/w40/\${currentLang.flag}.png\`" :alt="currentLang.name" class="flag-icon">
                <span>{{ currentLang.name }}</span>
                <span>{{ dropdownOpen ? '▲' : '▼' }}</span>
            </button>
            <div v-if="dropdownOpen" class="lang-dropdown">
                <div 
                    v-for="lang in languages" 
                    :key="lang.code"
                    class="lang-option"
                    :class="{ active: lang.code === currentLang.code }"
                    @click="changeLang(lang.code)"
                >
                    <img :src="\`https://flagcdn.com/w40/\${lang.flag}.png\`" :alt="lang.name" class="flag-icon">
                    <span class="lang-name">{{ lang.name }}</span>
                </div>
            </div>
        </div>

        <div class="container">
        <div class="content">
            <div class="title-wrapper">
                <div class="warning-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2L2 20h20L12 2z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <circle cx="12" cy="17" r="0.5" stroke-width="1" fill="#ff3b3b"/>
                    </svg>
                </div>
                <h1>{{ t.title }}</h1>
            </div>
            <div class="cve-id">CVE-2025-55182</div>
            
            <p class="description">
                {{ t.description }}
            </p>

            <p class="notice-text">
                {{ t.notice }}
            </p>

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">{{ t.severity }}</div>
                    <div class="info-value critical">{{ t.severityValue }}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">{{ t.cvssScore }}</div>
                    <div class="info-value critical">10.0</div>
                </div>
                <div class="info-item">
                    <div class="info-label">{{ t.discoveryDate }}</div>
                    <div class="info-value">2025-12-03</div>
                </div>
            </div>

            <div class="actions">
                <a href="https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components" class="btn btn-primary">{{ t.fixButton }}</a>
                <a href="https://www.cve.org/CVERecord?id=CVE-2025-55182" class="btn btn-secondary">{{ t.detailsButton }}</a>
            </div>
        </div>

        <div class="footer">
            <a href="https://github.com/MoLeft/React2Shell-Toolbox" target="_blank" rel="noopener noreferrer" class="footer-link">
                <svg class="github-icon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                <span>{{ t.footer }}</span>
            </a>
        </div>
    </div>
    </div>

    <script>
        const { createApp } = Vue;

        createApp({
            data() {
                return {
                    dropdownOpen: false,
                    selectedLang: 'zh-CN',
                    languages: [
                        { code: 'zh-CN', name: '简体中文', flag: 'cn' },
                        { code: 'en-US', name: 'English', flag: 'us' },
                        { code: 'ja-JP', name: '日本語', flag: 'jp' },
                        { code: 'ko-KR', name: '한국어', flag: 'kr' },
                        { code: 'es-ES', name: 'Español', flag: 'es' },
                        { code: 'fr-FR', name: 'Français', flag: 'fr' },
                        { code: 'de-DE', name: 'Deutsch', flag: 'de' },
                        { code: 'ru-RU', name: 'Русский', flag: 'ru' },
                        { code: 'ar-SA', name: 'العربية', flag: 'sa' },
                        { code: 'pt-BR', name: 'Português', flag: 'br' },
                        { code: 'it-IT', name: 'Italiano', flag: 'it' },
                        { code: 'nl-NL', name: 'Nederlands', flag: 'nl' },
                        { code: 'tr-TR', name: 'Türkçe', flag: 'tr' },
                        { code: 'pl-PL', name: 'Polski', flag: 'pl' },
                        { code: 'vi-VN', name: 'Tiếng Việt', flag: 'vn' }
                    ],
                    translations: {
                        'zh-CN': {
                            title: '安全警告',
                            description: '检测到当前应用存在已知的安全漏洞。该漏洞可能导致未经授权的访问、敏感数据泄露或系统完整性受损。建议立即采取行动修复此问题。',
                            severity: '严重程度',
                            severityValue: '严重',
                            cvssScore: 'CVSS评分',
                            discoveryDate: '发现日期',
                            fixButton: '查看修复方案',
                            detailsButton: '漏洞详情',
                            notice: '* 此警告页面通过自定义 React 框架的路由拦截机制实现，不会影响您的应用程序或服务器的正常运行。',
                            footer: '该页面由 MoLeft/React2Shell-Toolbox 工具自动检测发出'
                        },
                        'en-US': {
                            title: 'Security Warning',
                            description: 'A known security vulnerability has been detected in the current application. This vulnerability may lead to unauthorized access, sensitive data breaches, or compromised system integrity. Immediate action is recommended to fix this issue.',
                            severity: 'Severity',
                            severityValue: 'Critical',
                            cvssScore: 'CVSS Score',
                            discoveryDate: 'Discovery Date',
                            fixButton: 'View Fix',
                            detailsButton: 'Details',
                            notice: '* This warning page is implemented through a custom React framework route interception and will not affect your application or server.',
                            footer: 'This page is automatically generated by MoLeft/React2Shell-Toolbox'
                        },
                        'ja-JP': {
                            title: 'セキュリティ警告',
                            description: '現在のアプリケーションに既知のセキュリティ脆弱性が検出されました。この脆弱性により、不正アクセス、機密データ漏洩、またはシステムの整合性が損なわれる可能性があります。直ちに対処することをお勧めします。',
                            severity: '深刻度',
                            severityValue: '重大',
                            cvssScore: 'CVSSスコア',
                            discoveryDate: '発見日',
                            fixButton: '修正方法を見る',
                            detailsButton: '詳細',
                            noticeTitle: 'このページについて',
                            noticeText: 'この警告ページは、カスタムReactフレームワークのルート傍受メカニズムによって実装されており、アプリケーションやサーバーの正常な動作には影響しません。これはフロントエンドレベルのセキュリティ通知であり、開発者に潜在的なセキュリティ問題を適時に修正するよう促すものです。',
                            footer: 'このページは MoLeft/React2Shell-Toolbox ツールによって自動生成されました'
                        },
                        'ko-KR': {
                            title: '보안 경고',
                            description: '이 웹사이트에는 알려진 보안 취약점이 있습니다. 이 취약점으로 인해 무단 액세스, 데이터 유출 또는 시스템 무결성 손상이 발생할 수 있습니다. 즉시 조치를 취하십시오.',
                            severity: '심각도',
                            severityValue: '치명적',
                            cvssScore: 'CVSS 점수',
                            discoveryDate: '발견 날짜',
                            fixButton: '수정 방법 보기',
                            detailsButton: '세부정보',
                            footer: '이 페이지는 MoLeft/React2Shell-Toolbox 도구에 의해 자동 생성되었습니다'
                        },
                        'es-ES': {
                            title: 'Advertencia de Seguridad',
                            description: 'Este sitio web tiene una vulnerabilidad de seguridad conocida. Esta vulnerabilidad puede conducir a acceso no autorizado, filtraciones de datos o integridad del sistema comprometida. Por favor, tome medidas inmediatas para solucionar este problema.',
                            severity: 'Gravedad',
                            severityValue: 'Crítico',
                            cvssScore: 'Puntuación CVSS',
                            discoveryDate: 'Fecha de Descubrimiento',
                            fixButton: 'Ver Solución',
                            detailsButton: 'Detalles',
                            footer: 'Esta página es generada automáticamente por MoLeft/React2Shell-Toolbox'
                        },
                        'fr-FR': {
                            title: 'Avertissement de Sécurité',
                            description: 'Ce site web présente une vulnérabilité de sécurité connue. Cette vulnérabilité peut entraîner un accès non autorisé, des fuites de données ou une intégrité système compromise. Veuillez prendre des mesures immédiates pour résoudre ce problème.',
                            severity: 'Gravité',
                            severityValue: 'Critique',
                            cvssScore: 'Score CVSS',
                            discoveryDate: 'Date de Découverte',
                            fixButton: 'Voir la Solution',
                            detailsButton: 'Détails',
                            footer: 'Cette page est générée automatiquement par MoLeft/React2Shell-Toolbox'
                        },
                        'de-DE': {
                            title: 'Sicherheitswarnung',
                            description: 'Diese Website weist eine bekannte Sicherheitslücke auf. Diese Schwachstelle kann zu unbefugtem Zugriff, Datenlecks oder beeinträchtigter Systemintegrität führen. Bitte ergreifen Sie sofort Maßnahmen zur Behebung dieses Problems.',
                            severity: 'Schweregrad',
                            severityValue: 'Kritisch',
                            cvssScore: 'CVSS-Score',
                            discoveryDate: 'Entdeckungsdatum',
                            fixButton: 'Lösung Anzeigen',
                            detailsButton: 'Details',
                            footer: 'Diese Seite wird automatisch von MoLeft/React2Shell-Toolbox generiert'
                        },
                        'ru-RU': {
                            title: 'Предупреждение о Безопасности',
                            description: 'На этом веб-сайте обнаружена известная уязвимость безопасности. Эта уязвимость может привести к несанкционированному доступу, утечке данных или нарушению целостности системы. Пожалуйста, немедленно примите меры для устранения этой проблемы.',
                            severity: 'Серьезность',
                            severityValue: 'Критическая',
                            cvssScore: 'Оценка CVSS',
                            discoveryDate: 'Дата Обнаружения',
                            fixButton: 'Посмотреть Решение',
                            detailsButton: 'Подробности',
                            footer: 'Эта страница автоматически создана MoLeft/React2Shell-Toolbox'
                        },
                        'ar-SA': {
                            title: 'تحذير أمني',
                            description: 'يحتوي هذا الموقع على ثغرة أمنية معروفة. قد تؤدي هذه الثغرة إلى وصول غير مصرح به أو تسرب البيانات أو اختراق سلامة النظام. يرجى اتخاذ إجراء فوري لإصلاح هذه المشكلة.',
                            severity: 'الخطورة',
                            severityValue: 'حرجة',
                            cvssScore: 'درجة CVSS',
                            discoveryDate: 'تاريخ الاكتشاف',
                            fixButton: 'عرض الحل',
                            detailsButton: 'التفاصيل',
                            footer: 'تم إنشاء هذه الصفحة تلقائيًا بواسطة MoLeft/React2Shell-Toolbox'
                        },
                        'pt-BR': {
                            title: 'Aviso de Segurança',
                            description: 'Este site possui uma vulnerabilidade de segurança conhecida. Esta vulnerabilidade pode levar a acesso não autorizado, vazamento de dados ou integridade do sistema comprometida. Por favor, tome medidas imediatas para corrigir este problema.',
                            severity: 'Gravidade',
                            severityValue: 'Crítico',
                            cvssScore: 'Pontuação CVSS',
                            discoveryDate: 'Data de Descoberta',
                            fixButton: 'Ver Solução',
                            detailsButton: 'Detalhes',
                            footer: 'Esta página é gerada automaticamente por MoLeft/React2Shell-Toolbox'
                        },
                        'it-IT': {
                            title: 'Avviso di Sicurezza',
                            description: 'Questo sito web presenta una vulnerabilità di sicurezza nota. Questa vulnerabilità può portare ad accesso non autorizzato, perdite di dati o integrità del sistema compromessa. Si prega di prendere provvedimenti immediati per risolvere questo problema.',
                            severity: 'Gravità',
                            severityValue: 'Critico',
                            cvssScore: 'Punteggio CVSS',
                            discoveryDate: 'Data di Scoperta',
                            fixButton: 'Vedi Soluzione',
                            detailsButton: 'Dettagli',
                            footer: 'Questa pagina è generata automaticamente da MoLeft/React2Shell-Toolbox'
                        },
                        'nl-NL': {
                            title: 'Beveiligingswaarschuwing',
                            description: 'Deze website heeft een bekende beveiligingskwetsbaarheid. Deze kwetsbaarheid kan leiden tot ongeautoriseerde toegang, datalekken of gecompromitteerde systeemintegriteit. Neem onmiddellijk actie om dit probleem op te lossen.',
                            severity: 'Ernst',
                            severityValue: 'Kritiek',
                            cvssScore: 'CVSS-score',
                            discoveryDate: 'Ontdekkingsdatum',
                            fixButton: 'Oplossing Bekijken',
                            detailsButton: 'Details',
                            footer: 'Deze pagina is automatisch gegenereerd door MoLeft/React2Shell-Toolbox'
                        },
                        'tr-TR': {
                            title: 'Güvenlik Uyarısı',
                            description: 'Bu web sitesinde bilinen bir güvenlik açığı bulunmaktadır. Bu güvenlik açığı yetkisiz erişime, veri sızıntısına veya sistem bütünlüğünün tehlikeye girmesine yol açabilir. Lütfen bu sorunu düzeltmek için derhal harekete geçin.',
                            severity: 'Önem Derecesi',
                            severityValue: 'Kritik',
                            cvssScore: 'CVSS Puanı',
                            discoveryDate: 'Keşif Tarihi',
                            fixButton: 'Çözümü Görüntüle',
                            detailsButton: 'Detaylar',
                            footer: 'Bu sayfa MoLeft/React2Shell-Toolbox tarafından otomatik olarak oluşturulmuştur'
                        },
                        'pl-PL': {
                            title: 'Ostrzeżenie Bezpieczeństwa',
                            description: 'Ta strona internetowa ma znaną lukę w zabezpieczeniach. Ta luka może prowadzić do nieautoryzowanego dostępu, wycieku danych lub naruszonej integralności systemu. Proszę podjąć natychmiastowe działania w celu rozwiązania tego problemu.',
                            severity: 'Powaga',
                            severityValue: 'Krytyczny',
                            cvssScore: 'Wynik CVSS',
                            discoveryDate: 'Data Odkrycia',
                            fixButton: 'Zobacz Rozwiązanie',
                            detailsButton: 'Szczegóły',
                            footer: 'Ta strona jest automatycznie generowana przez MoLeft/React2Shell-Toolbox'
                        },
                        'vi-VN': {
                            title: 'Cảnh Báo Bảo Mật',
                            description: 'Trang web này có lỗ hổng bảo mật đã biết. Lỗ hổng này có thể dẫn đến truy cập trái phép, rò rỉ dữ liệu hoặc tính toàn vẹn hệ thống bị xâm phạm. Vui lòng hành động ngay lập tức để khắc phục vấn đề này.',
                            severity: 'Mức Độ Nghiêm Trọng',
                            severityValue: 'Nghiêm Trọng',
                            cvssScore: 'Điểm CVSS',
                            discoveryDate: 'Ngày Phát Hiện',
                            fixButton: 'Xem Giải Pháp',
                            detailsButton: 'Chi Tiết',
                            footer: 'Trang này được tạo tự động bởi MoLeft/React2Shell-Toolbox'
                        }
                    }
                };
            },
            computed: {
                currentLang() {
                    return this.languages.find(lang => lang.code === this.selectedLang);
                },
                t() {
                    return this.translations[this.selectedLang] || this.translations['en-US'];
                }
            },
            methods: {
                toggleDropdown() {
                    this.dropdownOpen = !this.dropdownOpen;
                },
                changeLang(code) {
                    this.selectedLang = code;
                    this.dropdownOpen = false;
                    localStorage.setItem('preferredLang', code);
                    document.documentElement.lang = code;
                    document.title = this.t.title + ' - CVE-2025-55182';
                },
                detectBrowserLang() {
                    const savedLang = localStorage.getItem('preferredLang');
                    if (savedLang) {
                        this.selectedLang = savedLang;
                        return;
                    }

                    const browserLang = navigator.language || navigator.userLanguage;
                    const langCode = this.languages.find(lang => 
                        browserLang.startsWith(lang.code.split('-')[0])
                    );
                    
                    if (langCode) {
                        this.selectedLang = langCode.code;
                    } else {
                        this.selectedLang = 'en-US';
                    }
                }
            },
            mounted() {
                this.detectBrowserLang();
                document.documentElement.lang = this.selectedLang;
                document.title = this.t.title + ' - CVE-2025-55182';
                
                document.addEventListener('click', (e) => {
                    if (!e.target.closest('.lang-selector')) {
                        this.dropdownOpen = false;
                    }
                });
            }
        }).mount('#app');
    </script>
</body>
</html>`
}