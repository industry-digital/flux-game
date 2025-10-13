import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTheme } from '@flux/ui';
import { routes } from './routes';

function Navigation() {
  const { currentTheme, setTheme, availableThemes } = useTheme();

  return (
    <nav style={{
      padding: '1rem',
      borderBottom: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface)',
      display: 'flex',
      gap: '1rem',
      alignItems: 'center'
    }}>
      <h1 style={{
        margin: 0,
        marginRight: '2rem',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-family-heading)',
        fontSize: 'var(--font-size-xl)',
        fontWeight: 'var(--font-weight-semibold)'
      }}>
        Flux Tools
      </h1>

      {routes.map(route => (
        <Link
          key={route.path}
          to={route.path}
          style={{
            textDecoration: 'none',
            padding: '0.5rem 1rem',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            color: 'var(--color-text)',
            backgroundColor: 'var(--color-background)',
            transition: 'all 0.2s ease',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--font-size-sm)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-hover)';
            e.currentTarget.style.borderColor = 'var(--color-border-focus)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-background)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          {route.name}
        </Link>
      ))}

      {/* Theme Switcher */}
      <select
        value={currentTheme}
        onChange={(e) => setTheme(e.target.value as any)}
        style={{
          marginLeft: 'auto',
          padding: '0.5rem',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          backgroundColor: 'var(--color-background)',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--font-size-sm)'
        }}
      >
        {availableThemes.map((theme: any) => (
          <option key={theme} value={theme}>
            {theme.charAt(0).toUpperCase() + theme.slice(1)} Theme
          </option>
        ))}
      </select>
    </nav>
  );
}

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px',
      color: 'var(--color-text)',
      fontFamily: 'var(--font-family)'
    }}>
      Loading...
    </div>
  );
}

export function App() {
  // Initialize theme system
  useTheme('dark');

  return (
    <BrowserRouter>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text)'
      }}>
        <Navigation />
        <main style={{
          flex: 1,
          padding: '1rem',
          backgroundColor: 'var(--color-background)'
        }}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to={routes[0].path} replace />} />
              {routes.map(route => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={<route.component />}
                />
              ))}
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}
