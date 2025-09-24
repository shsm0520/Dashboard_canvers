import { useLanguage } from '../contexts/LanguageContext';
import './LoadingScreen.css';

interface LoadingScreenProps {
  stage?: 'initial' | 'authenticating' | 'loading-data' | 'complete';
  progress?: number;
  message?: string;
}

export default function LoadingScreen({
  stage = 'initial',
  progress = 0,
  message
}: LoadingScreenProps) {
  const { t } = useLanguage();

  const getStageMessage = () => {
    switch (stage) {
      case 'initial':
        return t('initializing');
      case 'authenticating':
        return t('authenticating');
      case 'loading-data':
        return t('loading_data');
      case 'complete':
        return 'Ready!';
      default:
        return t('loading');
    }
  };

  const getStageProgress = () => {
    switch (stage) {
      case 'initial':
        return 25;
      case 'authenticating':
        return 50;
      case 'loading-data':
        // Ensure progress only increases from 75% to 100%
        return Math.max(75, 75 + Math.min(25, (progress || 0) * 0.25));
      case 'complete':
        return 100;
      default:
        return Math.max(0, Math.min(100, progress || 0));
    }
  };

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <div className="logo-ring">
            <div className="logo-inner">
              <div className="logo-text">📊</div>
            </div>
          </div>
        </div>

        <h1 className="loading-title">Dashboard</h1>

        <div className="loading-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${getStageProgress()}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {Math.round(getStageProgress())}%
          </div>
        </div>

        <div className="loading-message">
          {message || getStageMessage()}
        </div>

        <div className="loading-dots">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>

        <div className="loading-features">
          <div className={`feature ${stage !== 'initial' ? 'loaded' : ''}`}>
            <span className="feature-icon">🔐</span>
            <span>Authentication</span>
          </div>
          <div className={`feature ${stage === 'loading-data' || stage === 'complete' ? 'loaded' : ''}`}>
            <span className="feature-icon">📚</span>
            <span>Courses</span>
          </div>
          <div className={`feature ${stage === 'complete' ? 'loaded' : ''}`}>
            <span className="feature-icon">📈</span>
            <span>Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
}