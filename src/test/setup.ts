import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";

export const mockRouter = {
  push: vi.fn(),
  refresh: vi.fn(),
};

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn(),
    },
  });

  Object.defineProperty(window, "confirm", {
    writable: true,
    value: vi.fn(() => true),
  });
});

afterEach(() => {
  cleanup();
  delete (window as Window & { Telegram?: unknown }).Telegram;
  vi.clearAllMocks();
});

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
  }) => {
    const nextImageProps = { ...props };

    delete nextImageProps.fill;
    delete nextImageProps.priority;

    return React.createElement("img", nextImageProps);
  },
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
}));
