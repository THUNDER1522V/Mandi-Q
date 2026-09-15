import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeToggle } from '../components/ThemeToggle';

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ThemeToggle (Sun & Moon Flip Button)', () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
  });

  it('renders switch role and indicates current day state', async () => {
    const handleThemeChange = vi.fn();
    const root = createRoot(container!);

    await act(async () => {
      root.render(<ThemeToggle theme="day" onThemeChange={handleThemeChange} />);
    });

    const button = container!.querySelector('button[role="switch"]');
    expect(button).not.toBeNull();
    expect(button!.getAttribute('aria-checked')).toBe('false');
    expect(button!.classList.contains('is-day')).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });

  it('renders switch role and indicates current night state', async () => {
    const handleThemeChange = vi.fn();
    const root = createRoot(container!);

    await act(async () => {
      root.render(<ThemeToggle theme="night" onThemeChange={handleThemeChange} />);
    });

    const button = container!.querySelector('button[role="switch"]');
    expect(button).not.toBeNull();
    expect(button!.getAttribute('aria-checked')).toBe('true');
    expect(button!.classList.contains('is-night')).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });

  it('toggles from day to night on click', async () => {
    const handleThemeChange = vi.fn();
    const root = createRoot(container!);

    await act(async () => {
      root.render(<ThemeToggle theme="day" onThemeChange={handleThemeChange} />);
    });

    const button = container!.querySelector('button[role="switch"]') as HTMLButtonElement;
    await act(async () => {
      button.click();
    });

    expect(handleThemeChange).toHaveBeenCalledTimes(1);
    expect(handleThemeChange).toHaveBeenCalledWith('night');

    await act(async () => {
      root.unmount();
    });
  });

  it('toggles from night to day on click', async () => {
    const handleThemeChange = vi.fn();
    const root = createRoot(container!);

    await act(async () => {
      root.render(<ThemeToggle theme="night" onThemeChange={handleThemeChange} />);
    });

    const button = container!.querySelector('button[role="switch"]') as HTMLButtonElement;
    await act(async () => {
      button.click();
    });

    expect(handleThemeChange).toHaveBeenCalledTimes(1);
    expect(handleThemeChange).toHaveBeenCalledWith('day');

    await act(async () => {
      root.unmount();
    });
  });

  it('supports keyboard toggle using Space and Enter keys', async () => {
    const handleThemeChange = vi.fn();
    const root = createRoot(container!);

    await act(async () => {
      root.render(<ThemeToggle theme="day" onThemeChange={handleThemeChange} />);
    });

    const button = container!.querySelector('button[role="switch"]') as HTMLButtonElement;

    await act(async () => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(handleThemeChange).toHaveBeenCalledWith('night');

    await act(async () => {
      button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(handleThemeChange).toHaveBeenCalledTimes(2);

    await act(async () => {
      root.unmount();
    });
  });
});
