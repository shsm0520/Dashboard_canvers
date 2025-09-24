import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import './SettingsDropdown.css';

export default function SettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (newLanguage: 'en' | 'ko') => {
    setLanguage(newLanguage);
    setIsOpen(false);
  };

  return (
    <div className="settings-dropdown" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="settings-trigger"
        title="Settings"
      >
        ⚙️
      </button>

      {isOpen && (
        <div className="settings-menu">
          <div className="settings-section">
            <h4>{t('theme')}</h4>
            <div className="settings-option">
              <button
                onClick={toggleTheme}
                className="theme-toggle"
              >
                <span className="theme-icon">
                  {theme === 'light' ? '🌙' : '☀️'}
                </span>
                <span>{theme === 'light' ? t('dark_mode') : t('light_mode')}</span>
              </button>
            </div>
          </div>

          <div className="settings-divider"></div>

          <div className="settings-section">
            <h4>{t('language')}</h4>
            <div className="settings-option">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`language-option ${language === 'en' ? 'active' : ''}`}
              >
                <span className="flag">🇺🇸</span>
                <span>{t('english')}</span>
                {language === 'en' && <span className="checkmark">✓</span>}
              </button>
            </div>
            <div className="settings-option">
              <button
                onClick={() => handleLanguageChange('ko')}
                className={`language-option ${language === 'ko' ? 'active' : ''}`}
              >
                <span className="flag">🇰🇷</span>
                <span>{t('korean')}</span>
                {language === 'ko' && <span className="checkmark">✓</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}