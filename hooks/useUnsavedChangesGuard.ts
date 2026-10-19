import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useConfirm, type ConfirmOptions } from '@/contexts/ConfirmContext'

const LEAVE_PROMPT: ConfirmOptions = {
  title: 'Leave without saving?',
  message: 'Your changes will be lost.',
  confirmText: 'Leave',
  cancelText: 'Keep editing',
  variant: 'danger',
}

/**
 * Asks before leaving a page with unsaved work, however the visitor leaves:
 * - a link inside the site (intercepted before Next's <Link> sees the click)
 * - Back/Forward (Next's beforePopState)
 * - any other router.push (routeChangeStart; aborting it is the only way and
 *   logs a rejected promise, so links are handled above first)
 * - closing the tab or leaving the site (the browser's own beforeunload prompt)
 *
 * `confirmLeave()` asks the same question for an in-page Cancel button, and
 * `allowLeave()` lets the next navigation through without asking (after a
 * save, or once Cancel was confirmed).
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const router = useRouter()
  const confirm = useConfirm()

  const dirtyRef = useRef(isDirty)
  dirtyRef.current = isDirty
  const bypassRef = useRef(false)
  const askingRef = useRef(false)
  const shouldAsk = () => dirtyRef.current && !bypassRef.current

  const confirmLeave = useCallback(async () => {
    if (!shouldAsk()) return true
    return confirm(LEAVE_PROMPT)
  }, [confirm])

  const allowLeave = useCallback(() => {
    bypassRef.current = true
  }, [])

  // Ask once, then run `proceed` if they chose Leave
  const askThen = useCallback(
    async (proceed: () => void) => {
      if (askingRef.current) return
      askingRef.current = true
      try {
        if (await confirm(LEAVE_PROMPT)) {
          bypassRef.current = true
          proceed()
        }
      } finally {
        askingRef.current = false
      }
    },
    [confirm]
  )

  useEffect(() => {
    const samePage = (url: string) => {
      const target = new URL(url, window.location.href)
      return target.pathname === window.location.pathname && target.search === window.location.search
    }

    const onClick = (e: MouseEvent) => {
      if (!shouldAsk() || e.defaultPrevented || e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return // new tab or window: nothing is lost
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.hasAttribute('download')) return
      if (anchor.target && anchor.target !== '_self') return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return // a full page load; beforeunload asks
      if (samePage(url.href)) return
      e.preventDefault()
      e.stopPropagation()
      void askThen(() => router.push(url.pathname + url.search + url.hash))
    }

    const onRouteChangeStart = (url: string) => {
      if (!shouldAsk() || samePage(url)) return
      void askThen(() => router.push(url))
      throw new Error('Navigation paused: the editor has unsaved changes.')
    }
    const onRouteChangeError = () => {
      bypassRef.current = false
    }

    // The browser has already moved back by the time Next hears of it, so put
    // the editor's entry back on top, then go back for real if they leave.
    const editorState = window.history.state
    const editorUrl = window.location.pathname + window.location.search + window.location.hash
    router.beforePopState(() => {
      if (!shouldAsk()) return true
      window.history.pushState(editorState, '', editorUrl)
      void askThen(() => window.history.back())
      return false
    })

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!shouldAsk()) return
      e.preventDefault()
      e.returnValue = '' // Chrome needs returnValue set
    }

    document.addEventListener('click', onClick, true)
    router.events.on('routeChangeStart', onRouteChangeStart)
    router.events.on('routeChangeError', onRouteChangeError)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('click', onClick, true)
      router.events.off('routeChangeStart', onRouteChangeStart)
      router.events.off('routeChangeError', onRouteChangeError)
      router.beforePopState(() => true)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
    // router is stable for the page's lifetime; re-subscribing on every
    // render would reset the editor's history entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askThen])

  return { confirmLeave, allowLeave }
}
