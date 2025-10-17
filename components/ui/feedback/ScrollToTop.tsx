import React, { useState, useEffect } from 'react'

/**
 * ScrollToTop Button
 *
 * A fixed button that appears when the user scrolls down the page.
 * Clicking it smoothly scrolls back to the top.
 * Styled with ThreadStead's cozy design system.
 */
export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false)

  // Show button when page is scrolled down 300px
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)

    return () => {
      window.removeEventListener('scroll', toggleVisibility)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) {
    return null
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 bg-thread-sage hover:bg-thread-pine text-thread-paper p-3 rounded-full shadow-cozy hover:shadow-thread transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-thread-sunset focus:ring-offset-2"
      aria-label="Scroll to top"
      title="Back to top"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  )
}
