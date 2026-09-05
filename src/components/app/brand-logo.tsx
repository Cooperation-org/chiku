import { useEffect, useState } from "react"

// The workersvc leaf only on the workers.vc deployment; every other host
// (linkedtrust.us, localhost, …) keeps the Taiga mark. Same DNS-safe rule as
// the favicon swap in index.html. Read in an effect so SSR-less first paint
// stays consistent and hostnames are only touched in the browser.
export function BrandLogo({ className = "" }: { className?: string }) {
  const [isWorkersVc, setIsWorkersVc] = useState(false)

  useEffect(() => {
    setIsWorkersVc(/(^|\.)workers\.vc$/.test(location.hostname))
  }, [])

  return isWorkersVc ? (
    <img src="/favicon.svg" alt="workers.vc" className={className} />
  ) : (
    <img src="/favicon.ico" alt="Taiga" className={className} />
  )
}
