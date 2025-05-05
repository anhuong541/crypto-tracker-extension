document.addEventListener('DOMContentLoaded', () => {
  const cryptoSymbolInput = document.getElementById('cryptoSymbolInput')
  const getPriceButton = document.getElementById('getPriceButton')
  const currentPriceDisplay = document.getElementById('currentPriceDisplay')
  const selectedCryptosList = document.getElementById('selectedCryptosList')

  // --- Configuration ---
  const API_KEY = 'YOUR_COINMARKETCAP_API_KEY' // Replace with your actual API key
  const API_URL_QUOTES =
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest'
  const API_URL_INFO =
    'https://pro-api.coinmarketcap.com/v1/cryptocurrency/info' // New endpoint for info/logos

  // Function to fetch price and ID from CoinMarketCap API
  async function fetchCryptoData(symbol) {
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

      return { price, id }
    } catch (error) {
      console.error('Fetch Error (quotes):', error)
      currentPriceDisplay.textContent =
        'Error fetching data. Check console for details.'
      return null
    }
  }

  // Function to fetch crypto info (including logo) by ID
  async function fetchCryptoInfo(id) {
    if (!API_KEY || API_KEY === 'YOUR_COINMARKETCAP_API_KEY') {
      return null // Should be caught by fetchCryptoData, but good practice
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
      return data.data[id].logo // Return the logo URL
    } catch (error) {
      console.error('Fetch Error (info):', error)
      return null
    }
  }

  // Function to add a selected crypto to the list and fetch its data and icon
  async function addSelectedCrypto(symbol) {
    const cryptoData = await fetchCryptoData(symbol.toUpperCase())
    const existingItem = selectedCryptosList.querySelector(
      `li[data-symbol="${symbol.toUpperCase()}"]`
    )

    if (cryptoData) {
      const { price, id } = cryptoData
      const logoUrl = await fetchCryptoInfo(id) // Fetch the logo URL

      if (existingItem) {
        // Update the existing item's price and potentially logo if needed (though logos rarely change)
        existingItem.querySelector(
          '.crypto-symbol-price span'
        ).textContent = `${symbol.toUpperCase()}:`
        existingItem.querySelector(
          '.crypto-symbol-price'
        ).lastChild.textContent = `$${price.toFixed(2)}`

        if (logoUrl && !existingItem.querySelector('.crypto-icon')) {
          // If logo wasn't there before, add it
          const iconImg = document.createElement('img')
          iconImg.classList.add('crypto-icon')
          iconImg.src = logoUrl
          existingItem.querySelector('.crypto-info').prepend(iconImg) // Add icon before the symbol/price
        } else if (logoUrl && existingItem.querySelector('.crypto-icon')) {
          // If logo exists, ensure the src is correct (less likely to change)
          existingItem.querySelector('.crypto-icon').src = logoUrl
        }
      } else {
        const listItem = document.createElement('li')
        listItem.setAttribute('data-symbol', symbol.toUpperCase())

        const cryptoInfoDiv = document.createElement('div') // Container for icon and symbol/price
        cryptoInfoDiv.classList.add('crypto-info')

        if (logoUrl) {
          const iconImg = document.createElement('img')
          iconImg.classList.add('crypto-icon')
          iconImg.src = logoUrl
          cryptoInfoDiv.appendChild(iconImg)
        } else {
          // Optional: Add a placeholder or default icon if logo not found
          console.warn(`Logo not available for ${symbol}`)
          // You could add a default icon here
        }

        const symbolPriceSpan = document.createElement('span') // Container for symbol and price
        symbolPriceSpan.classList.add('crypto-symbol-price')
        symbolPriceSpan.innerHTML = `<span>${symbol.toUpperCase()}:</span> $${price.toFixed(
          2
        )}` // Use innerHTML for easier formatting

        cryptoInfoDiv.appendChild(symbolPriceSpan)
        listItem.appendChild(cryptoInfoDiv) // Add the info div to the list item

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
        symbolPriceSpan.innerHTML = `<span>${symbol.toUpperCase()}:</span> Error getting price` // Use innerHTML
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
        // If logo fetching failed previously, and it's still not found, we don't do anything with the icon
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
  chrome.storage.sync.get(['selectedCryptos'], (result) => {
    if (result.selectedCryptos) {
      Promise.all(
        result.selectedCryptos.forEach((crypto) => {
          addSelectedCrypto(crypto) // Fetch and display price for saved cryptos
        })
      )
    }
  })

  // Event listener for the "Track" button
  getPriceButton.addEventListener('click', async () => {
    const symbol = cryptoSymbolInput.value.trim().toUpperCase()
    if (symbol) {
      // Add the selected crypto to storage and the list
      chrome.storage.sync.get(['selectedCryptos'], (result) => {
        const selectedCryptos = result.selectedCryptos || []
        if (!selectedCryptos.includes(symbol)) {
          selectedCryptos.push(symbol)
          chrome.storage.sync.set({ selectedCryptos }, () => {
            addSelectedCrypto(symbol) // Add to the list and fetch price
          })
        } else {
          // If already in list, just update the display price and logo in the list
          addSelectedCrypto(symbol)
        }
      })
      cryptoSymbolInput.value = '' // Clear the input field
    }
  })

  // You would typically add logic here to periodically update the prices in the list
  // using chrome.alarms or similar background mechanisms.
  // For a basic update, you could iterate through the selected cryptos in storage
  // and call addSelectedCrypto for each one on an interval.
})
