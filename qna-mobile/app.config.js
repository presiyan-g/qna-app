const fs = require('node:fs');
const path = require('node:path');

const qnaApiUrl =
  process.env.QNA_API_URL ?? readEnvValue('QNA_API_URL') ?? 'http://localhost:3000/api';

module.exports = {
  expo: {
    name: 'qna-mobile',
    slug: 'qna-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'qnamobile',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: ['expo-router', 'expo-secure-store'],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      qnaApiUrl,
    },
  },
};

function readEnvValue(name) {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return null;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  const prefix = `${name}=`;
  const line = lines.find((entry) => entry.trim().startsWith(prefix));
  if (!line) return null;

  return line.slice(prefix.length).trim().replace(/^['"]|['"]$/g, '');
}
