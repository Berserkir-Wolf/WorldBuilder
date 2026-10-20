import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';

function Root() {
  const [mode, setMode] = React.useState(() => localStorage.getItem('worldbuilder-theme') || 'light');
  const theme = React.useMemo(() => createTheme({ palette: { mode } }), [mode]);

  const toggleMode = () => {
    setMode((currentMode) => {
      const nextMode = currentMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('worldbuilder-theme', nextMode);
      return nextMode;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App mode={mode} onToggleMode={toggleMode} />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
