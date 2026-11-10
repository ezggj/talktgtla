import Link from 'next/link'
import './city.css'

/** Old fitness, chat, and meal routes. The product lives on the archive branch. */
export function RetiredNotice() {
  return (
    <main className="retired">
      <p>我座城</p>
      <h1>呢版已經收檔</h1>
      <p>健身同傾偈唔再喺度。而家個網係一座城。</p>
      <Link href="/">返去起城</Link>
    </main>
  )
}
