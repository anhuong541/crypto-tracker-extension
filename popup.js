// TODO: currently got cache the data but still not manage file run well!!!

document.addEventListener('DOMContentLoaded', () => {
  const cryptoSymbolInput = document.getElementById('cryptoSymbolInput')
  const getPriceButton = document.getElementById('getPriceButton')
  const currentPriceDisplay = document.getElementById('currentPriceDisplay')
  const selectedCryptosList = document.getElementById('selectedCryptosList')
  const skeletonItems = selectedCryptosList.querySelectorAll('.skeleton-item')

  // --- Configuration ---
  const API_KEY = 'YOUR_COINMARKETCAP_API_KEY' // Replace with your actual API key
  const API_URL_QUOTES =
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest'
  const API_URL_INFO =
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/info'
  const CACHE_TIMEOUT = 30 * 1000 // 1 minute in milliseconds

  // --- Caching Functions ---

  // Function to save data to local storage with a timestamp
  function cacheData(key, data) {
    const cacheItem = {
      data: data,
      timestamp: Date.now()
    }
    chrome.storage.local.set({ [key]: cacheItem })
  }

  // Function to retrieve data from local storage and check for validity
  async function getCachedData(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        const cacheItem = result[key]
        if (cacheItem && Date.now() - cacheItem.timestamp < CACHE_TIMEOUT) {
          resolve(cacheItem.data) // Return cached data if valid
        } else {
          resolve(null) // Return null if no valid cache
        }
      })
    })
  }

  // --- Loading UI Functions ---

  // Function to show the skeleton loader
  function showSkeleton() {
    return
    skeletonItems.forEach((item) => {
      item.classList.add('visible')
    })
    // Optional: Hide existing items while loading, only if there are skeletons
    if (skeletonItems.length > 0) {
      selectedCryptosList
        .querySelectorAll('li:not(.skeleton-item)')
        .forEach((item) => {
          item.style.display = 'none'
        })
    }
  }

  // Function to hide the skeleton loader and show actual items
  function hideSkeleton() {
    skeletonItems.forEach((item) => {
      item.classList.remove('visible')
    })
    // Show actual items after hiding skeletons
    selectedCryptosList
      .querySelectorAll('li:not(.skeleton-item)')
      .forEach((item) => {
        item.style.display = 'flex' // Or your desired display type
      })
  }

  // --- API Fetching Functions with Caching ---

  // Function to fetch price and ID from CoinMarketCap API with caching
  async function fetchCryptoDataWithCache(symbol) {
    const cacheKey = `cryptoData_${symbol.toUpperCase()}`
    const cachedData = await getCachedData(cacheKey)

    if (cachedData) {
      console.log(`Using cached data for ${symbol}`)
      return cachedData
    }

    if (!API_KEY || API_KEY === 'YOUR_COINMARKETCAP_API_KEY') {
      currentPriceDisplay.textContent =
        'Error: Please replace "YOUR_COINMARKETCAP_API_KEY" with your actual API key in popup.js'
      return null
    }

    try {
      const response = await fetch(`${API_URL_QUOTES}?symbol=${symbol}`, {
        headers: {
          'X-CMC_PRO_API_KEY': API_KEY
        }
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error (quotes):', error)
        currentPriceDisplay.textContent = `Error fetching data: ${error.status.error_message}`
        return null
      }

      const data = await response.json()
      if (
        !data.data ||
        !data.data[symbol] ||
        !data.data[symbol].quote ||
        !data.data[symbol].quote.USD
      ) {
        console.error(
          'API Response Error: Data not found for symbol',
          symbol,
          data
        )
        currentPriceDisplay.textContent = `Error: Data not found for symbol ${symbol}`
        return null
      }
      const price = data.data[symbol].quote.USD.price
      const id = data.data[symbol].id // Get the crypto ID

      const fetchedData = { price, id }
      cacheData(cacheKey, fetchedData) // Cache the fetched data

      return fetchedData
    } catch (error) {
      console.error('Fetch Error (quotes):', error)
      currentPriceDisplay.textContent =
        'Error fetching data. Check console for details.'
      return null
    }
  }

  // Function to fetch crypto info (including logo) by ID with caching
  async function fetchCryptoInfoWithCache(id) {
    const cacheKey = `cryptoInfo_${id}`
    const cachedLogoUrl = await getCachedData(cacheKey)

    if (cachedLogoUrl) {
      console.log(`Using cached logo for ID ${id}`)
      return cachedLogoUrl
    }

    if (!API_KEY || API_KEY === 'YOUR_COINMARKETCAP_API_KEY') {
      return null
    }
    try {
      const response = await fetch(`${API_URL_INFO}?id=${id}`, {
        headers: {
          'X-CMC_PRO_API_KEY': API_KEY
        }
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('API Error (info):', error)
        return null
      }

      const data = await response.json()
      if (!data.data || !data.data[id] || !data.data[id].logo) {
        console.warn('API Response Warning: Logo not found for ID', id, data)
        return null
      }
      const logoUrl = data.data[id].logo
      cacheData(cacheKey, logoUrl) // Cache the logo URL
      return logoUrl
    } catch (error) {
      console.error('Fetch Error (info):', error)
      return null
    }
  }

  // Function to display price (Less critical now)
  function displayPrice(symbol, price) {
    if (price !== null) {
      currentPriceDisplay.textContent = `${symbol}: $${price.toFixed(2)}`
    } else {
      currentPriceDisplay.textContent = `Could not get price for ${symbol}.`
    }
  }

  // Function to add a selected crypto to the list and fetch its data and icon with caching
  async function addSelectedCrypto(symbol) {
    // The show/hide skeleton logic will be handled by the calling function (initial load or button click)
    const cryptoData = await fetchCryptoDataWithCache(symbol.toUpperCase())
    const existingItem = selectedCryptosList.querySelector(
      `li[data-symbol="${symbol.toUpperCase()}"]`
    )

    if (cryptoData) {
      const { price, id } = cryptoData
      const logoUrl = await fetchCryptoInfoWithCache(id)

      if (existingItem) {
        existingItem.querySelector(
          '.crypto-symbol-price span'
        ).textContent = `${symbol.toUpperCase()}:`
        existingItem.querySelector(
          '.crypto-symbol-price'
        ).lastChild.textContent = `$${price.toFixed(2)}`

        if (logoUrl && !existingItem.querySelector('.crypto-icon')) {
          const iconImg = document.createElement('img')
          iconImg.classList.add('crypto-icon')
          iconImg.src = logoUrl
          existingItem.querySelector('.crypto-info').prepend(iconImg)
        } else if (logoUrl && existingItem.querySelector('.crypto-icon')) {
          existingItem.querySelector('.crypto-icon').src = logoUrl
        } else if (!logoUrl && existingItem.querySelector('.crypto-icon')) {
          existingItem.querySelector('.crypto-icon').remove()
        }
      } else {
        const listItem = document.createElement('li')
        listItem.setAttribute('data-symbol', symbol.toUpperCase())

        const cryptoInfoDiv = document.createElement('div')
        cryptoInfoDiv.classList.add('crypto-info')

        if (logoUrl) {
          const iconImg = document.createElement('img')
          iconImg.classList.add('crypto-icon')
          iconImg.src = logoUrl
          cryptoInfoDiv.appendChild(iconImg)
        } else {
          console.warn(`Logo not available for ${symbol}`)
        }

        const symbolPriceSpan = document.createElement('span')
        symbolPriceSpan.classList.add('crypto-symbol-price')
        symbolPriceSpan.innerHTML = `<span>${symbol.toUpperCase()}:</span> $${price.toFixed(
          2
        )}`

        cryptoInfoDiv.appendChild(symbolPriceSpan)
        listItem.appendChild(cryptoInfoDiv)

        const removeButton = document.createElement('button')
        removeButton.classList.add('remove-button')
        removeButton.innerHTML = '&times;'
        removeButton.addEventListener('click', () => {
          removeSelectedCrypto(symbol.toUpperCase(), listItem)
        })
        listItem.appendChild(removeButton)

        selectedCryptosList.appendChild(listItem)
      }
    } else {
      if (!existingItem) {
        const listItem = document.createElement('li')
        listItem.setAttribute('data-symbol', symbol.toUpperCase())

        const cryptoInfoDiv = document.createElement('div')
        cryptoInfoDiv.classList.add('crypto-info')

        const symbolPriceSpan = document.createElement('span')
        symbolPriceSpan.classList.add('crypto-symbol-price')
        symbolPriceSpan.innerHTML = `<span>${symbol.toUpperCase()}:</span> Error getting price`
        cryptoInfoDiv.appendChild(symbolPriceSpan)
        listItem.appendChild(cryptoInfoDiv)

        const removeButton = document.createElement('button')
        removeButton.classList.add('remove-button')
        removeButton.innerHTML = '&times;'
        removeButton.addEventListener('click', () => {
          removeSelectedCrypto(symbol.toUpperCase(), listItem)
        })
        listItem.appendChild(removeButton)

        selectedCryptosList.appendChild(listItem)
      } else {
        existingItem.querySelector(
          '.crypto-symbol-price span'
        ).textContent = `${symbol.toUpperCase()}:`
        existingItem.querySelector(
          '.crypto-symbol-price'
        ).lastChild.textContent = ` Error getting price`
      }
    }
  }

  // Function to remove a selected crypto from the list and storage
  function removeSelectedCrypto(symbol, listItem) {
    // Remove from the UI
    listItem.remove()

    // Remove from storage
    chrome.storage.sync.get(['selectedCryptos'], (result) => {
      let selectedCryptos = result.selectedCryptos || []
      selectedCryptos = selectedCryptos.filter((crypto) => crypto !== symbol)
      chrome.storage.sync.set({ selectedCryptos }, () => {
        console.log(`${symbol} removed from storage.`)
      })
    })
  }

  // Load selected cryptos from storage on startup
  chrome.storage.sync.get(['selectedCryptos'], async (result) => {
    if (result.selectedCryptos && result.selectedCryptos.length > 0) {
      // Show skeleton before starting the loop
      showSkeleton()
      for (const crypto of result.selectedCryptos) {
        // We don't call hideSkeleton here, it will be called once after the loop
        await addSelectedCrypto(crypto)
      }
      // Hide skeleton only after all cryptos are processed
      hideSkeleton()
    } else {
      // If there are no saved cryptos, just hide the skeleton immediately
      hideSkeleton()
    }
  })

  // Event listener for the "Track" button
  getPriceButton.addEventListener('click', async () => {
    const symbol = cryptoSymbolInput.value.trim().toUpperCase()
    if (symbol) {
      // Show skeleton if the crypto is not already being tracked
      chrome.storage.sync.get(['selectedCryptos'], async (result) => {
        // Added async here
        const selectedCryptos = result.selectedCryptos || []
        const isAlreadyTracking = selectedCryptos.includes(symbol)

        if (!isAlreadyTracking) {
          showSkeleton()
          selectedCryptos.push(symbol)
          chrome.storage.sync.set({ selectedCryptos }, async () => {
            // Added async here
            await addSelectedCrypto(symbol) // Wait for adding and fetching
            hideSkeleton() // Hide after adding the new crypto
          })
        } else {
          // If already in list, just update the display price and logo in the list using cache
          // Check if cache is expired before potentially showing skeleton
          const cachedData = await getCachedData(`cryptoData_${symbol}`)
          if (!cachedData) {
            showSkeleton()
          }
          await addSelectedCrypto(symbol) // This will use cache if valid
          hideSkeleton() // Hide after update (even if from cache)
        }
      })
      cryptoSymbolInput.value = '' // Clear the input field
    }
  })
})
