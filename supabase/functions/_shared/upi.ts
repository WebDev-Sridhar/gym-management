// Build a UPI deep link per NPCI spec.
//   upi://pay?pa=<vpa>&pn=<payee_name>&am=<amount>&cu=INR&tn=<note>
// Tapping this on Android opens the user's UPI app with the payment pre-filled.

export interface UpiLinkParams {
  vpa: string                  // e.g. "gymname@upi"
  payeeName: string            // displayed in the UPI app
  amount: number               // in rupees (decimal)
  note?: string                // optional transaction note
}

export function buildUpiLink(p: UpiLinkParams): string {
  if (!p.vpa) throw new Error('UPI VPA is required')
  if (!p.amount || p.amount <= 0) throw new Error('UPI amount must be > 0')

  const params = new URLSearchParams()
  params.set('pa', p.vpa)
  params.set('pn', p.payeeName)
  params.set('am', p.amount.toFixed(2))
  params.set('cu', 'INR')
  if (p.note) params.set('tn', p.note.slice(0, 80))   // UPI note has length limit

  return `upi://pay?${params.toString()}`
}
