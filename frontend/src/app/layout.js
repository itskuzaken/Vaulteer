// src/app/layout.js
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css"; // Import global styles
import Login from "../services/auth/login";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { usePathname } from "next/navigation";
import { signup } from "../services/auth/signup";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Inter({
  variable: "--font-poppins",
  subsets: ["latin"],
});

// Header component moved here
function Header() {
  const [isLoginVisible, setLoginVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const isVolunteerSignup = pathname.startsWith("/volunteer/signup");

  const handleLoginClose = () => setLoginVisible(false);

  // Hide header on dashboard routes and volunteer signup page
  if (isDashboard || isVolunteerSignup) return null;

  // Navigation links
  const navLinks = [
    { href: "#home", label: "Home" },
    { href: "#news", label: "News" },
    { href: "#services", label: "Services" },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <header
      className={`${
        isDashboard ? "bg-[var(--primary-red)]" : "bg-[var(--light)]"
      } sticky top-0 text-white flex justify-between items-center p-2 shadow-md z-50`}
    >
      {/* Left: Hamburger (mobile) + Logo */}
      <div className="flex items-center gap-2">
        <button
          className="sm:hidden flex items-center justify-center p-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary-red)]"
          aria-label={
            mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {/* Hamburger icon */}
          <svg
            className={`h-7 w-7 text-[var(--primary-red)] transition-transform duration-200 ${
              mobileMenuOpen ? "rotate-90" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {mobileMenuOpen ? (
              // X icon
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              // Hamburger icon
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
        <img src="/bagani-logo.png" alt="Logo" className="h-10 mx-4" />
      </div>

      {/* Desktop/Tablet Navigation */}
      <nav className="hidden sm:flex space-x-8">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-[var(--primary-red)] hover:text-[var(--dark)]"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* Desktop/Tablet Auth Buttons */}
      <div className="hidden sm:flex items-center space-x-4 px-4">
        <button
          onClick={() => setLoginVisible(true)}
          className="text-[var(--primary-red)] px-1 py-1 hover:text-[var(--dark)] transition"
        >
          Log in
        </button>
        <button
          onClick={async () => {
            try {
              await signup();
            } catch (err) {
              alert("Signup failed: " + (err.message || err));
            }
          }}
          className="bg-white text-[var(--primary-red)] px-2 py-1 rounded border border-[var(--primary-red)] hover:bg-[var(--primary-red)] hover:text-white transition"
        >
          Sign up
        </button>
      </div>

      {/* Mobile Auth Buttons (right side) */}
      <div className="flex sm:hidden items-center space-x-2">
        <button
          onClick={() => setLoginVisible(true)}
          className="text-[var(--primary-red)] px-2 py-1 hover:text-[var(--dark)] transition font-medium"
        >
          Log in
        </button>
        <button
          onClick={async () => {
            try {
              await signup();
            } catch (err) {
              alert("Signup failed: " + (err.message || err));
            }
          }}
          className="bg-white text-[var(--primary-red)] px-3 py-1 rounded border border-[var(--primary-red)] hover:bg-[var(--primary-red)] hover:text-white transition font-medium"
        >
          Sign up
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} sm:hidden`}
        style={{ willChange: "transform" }}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <img src="/bagani-logo.png" alt="Logo" className="h-10" />
          <button
            className="p-2 rounded focus:outline-none focus:ring-2 focus:ring-[var(--primary-red)]"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg
              className="h-7 w-7 text-[var(--primary-red)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col mt-4 space-y-2 px-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[var(--primary-red)] text-lg py-2 px-2 rounded hover:bg-[var(--light)]"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {isLoginVisible && <Login onClose={handleLoginClose} />}
    </header>
  );
}

function Footer() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");
  const isVolunteerSignup = pathname.startsWith("/volunteer/signup");

  // Hide footer on dashboard routes and volunteer signup page
  if (isDashboard || isVolunteerSignup) return null;

  return (
    <footer className="w-full bg-[var(--primary-red)] text-white py-6 mt-8">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img src="/bagani-logo.png" alt="Bagani Logo" className="h-8" />
          <span className="font-bold text-lg">Bagani Community Center</span>
        </div>
        <div className="text-sm text-white/90 text-center md:text-right">
          &copy; {new Date().getFullYear()} Bagani Community Center. All rights
          reserved.
        </div>
        <div className="flex gap-4">
          <a
            href="mailto:info@baganiph.org"
            className="hover:underline text-white"
            aria-label="Email"
          >
            info@baganiph.org
          </a>
          <a
            href="https://www.facebook.com/baganiBCD"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-white"
            aria-label="Facebook"
          >
            <svg
              className="inline h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M22 12c0-5.522-4.477-10-10-10S2 6.478 2 12c0 5 3.657 9.127 8.438 9.877v-6.987h-2.54v-2.89h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.242 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.89h-2.33v6.987C18.343 21.127 22 17 22 12" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }) {
  // Use usePathname for SSR/CSR compatibility
  const pathname =
    typeof window !== "undefined"
      ? window.location.pathname
      : (typeof globalThis !== "undefined" &&
          globalThis.__NEXT_ROUTER_PATHNAME__) ||
        ""; // fallback for SSR

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="bg-white text-[var(--primary-red)] font-sans"
        suppressHydrationWarning={true}
      >
        <Header />
        <main>{children}</main>
        <Footer />
        <script
          type="module"
          src="https://cdn.jsdelivr.net/npm/ionicons@latest/dist/ionicons/ionicons.esm.js"
        ></script>
      </body>
    </html>
  );
}
