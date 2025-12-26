// url-helper.js - Shared URL detection utility for extension
// This will be replaced by build script with http://localhost:3000

const URL_HELPER = {
  // Build-time injected base URL (fallback)
  BASE_URL: 'http://localhost:3000',
  
  // Redirect page path
  REDIRECT_PAGE: '/pages/browserextensions/extension-redirect',
  
  // Main pages
  EXTENSION_PAGE: '/pages/browserextensions',
  DASHBOARD_PAGE: '/pages/test-cases',
  
  /**
   * Detect if a URL is our app
   */
  isAppUrl(url) {
    if (!url) return false
    
    try {
      const urlObj = new URL(url)
      return (
        urlObj.hostname === 'localhost' ||
        urlObj.hostname === '127.0.0.1' ||
        urlObj.hostname.includes('https://dev.synthqa.app/') ||
        urlObj.hostname.includes('https://www.synthqa.app/')
      )
    } catch (e) {
      return false
    }
  },
  
  /**
   * Extract base URL from a URL string
   */
  getBaseUrl(url) {
    try {
      const urlObj = new URL(url)
      return `${urlObj.protocol}//${urlObj.host}`
    } catch (e) {
      return this.BASE_URL
    }
  },
  
  /**
   * Get URL for a page with smart detection
   * Returns direct URL if app detected, otherwise redirect page
   */
  getPageUrl(pagePath, currentTabUrl = null) {
    // If we have a current tab URL and it's our app, use it
    if (currentTabUrl && this.isAppUrl(currentTabUrl)) {
      const baseUrl = this.getBaseUrl(currentTabUrl)
      return `${baseUrl}${pagePath}`
    }
    
    // Otherwise, use redirect page with fallback base URL
    return `${this.BASE_URL}${this.REDIRECT_PAGE}`
  },
  
  /**
   * Find app tab from list of tabs
   */
  findAppTab(tabs) {
    return tabs.find(tab => tab.url && this.isAppUrl(tab.url))
  },
  
  /**
   * Get dashboard URL
   */
  getDashboardUrl(currentTabUrl = null) {
    return this.getPageUrl(this.DASHBOARD_PAGE, currentTabUrl)
  },
  
  /**
   * Get extension page URL
   */
  getExtensionUrl(currentTabUrl = null) {
    return this.getPageUrl(this.EXTENSION_PAGE, currentTabUrl)
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = URL_HELPER
}