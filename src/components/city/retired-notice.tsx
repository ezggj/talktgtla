import Link from 'next/link'
import './city.css'

/** Old city, fitness, chat, and meal routes. The product lives on the home page. */
export function RetiredNotice() {
  return (
    <main className="retired">
      <p>試盤</p>
      <h1>呢版已經收檔</h1>
      <p>我座城同健身都收埋咗。而家個網係模擬盤，用虛擬資金。</p>
      <Link href="/">返去試盤</Link>
    </main>
  )
}
