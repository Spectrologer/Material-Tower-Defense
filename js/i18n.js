// js/i18n.js

let translations = {};
let currentLang = 'en';

/**
 * Loads a language file from the locales directory.
 * @param {string} lang - The language code (e.g., 'en', 'es').
 */
async function loadLanguage(lang = 'en') {
    try {
        const response = await fetch(`js/locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Could not load ${lang}.json`);
        }
        translations = await response.json();
        currentLang = lang;
        console.log(`Loaded language: ${lang}`);
        localStorage.setItem('language', lang);
    } catch (error) {
        console.error('Error loading language file:', error);
        // Fallback to English if the chosen language fails to load
        if (lang !== 'en') {
            await loadLanguage('en');
        }
    }
}

/**
 * Gets a translated string for the given key.
 * @param {string} key - The key for the translation string (e.g., 'buttons.start_wave').
 * @param {object} options - An object with values to replace placeholders in the string.
 * @returns {string} The translated string or the key if not found.
 */
function t(key, options = {}) {
    const keys = key.split('.');
    let result = translations;

    for (const k of keys) {
        result = result?.[k];
        if (result === undefined) {
            console.warn(`Translation not found for key: ${key} in language ${currentLang}`);
            // Optionally, you could try to get the key from a fallback language (e.g., English) here
            return key; // Return the key itself as a fallback
        }
    }

    if (typeof result === 'string' && options) {
        // Replace placeholders like {cost} with values from the options object
        return result.replace(/{(\w+)}/g, (match, word) => {
            return options[word] !== undefined ? options[word] : match;
        });
    }

    return result;
}

/**
 * Applies translations to all elements in the DOM with a `data-i18n` attribute.
 */
function applyHtmlTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = t(key);
        if (typeof translation === 'string') {
            // Using textContent is safer as it prevents XSS attacks.
            // It handles only text and doesn't parse HTML.
            element.textContent = translation;
        }
    });
}

/**
 * Initializes the internationalization system.
 * Loads the saved language or defaults to English, then applies translations to the page.
 */
async function initI18n() {
    const savedLang = localStorage.getItem('language') || 'en';
    await loadLanguage(savedLang);
    applyHtmlTranslations();
    document.title = t('gameTitle');
    // We will need to update dynamic text elsewhere
}

export { loadLanguage, t, applyHtmlTranslations, initI18n, currentLang };
