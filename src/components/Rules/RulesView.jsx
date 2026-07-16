import Chase524Widget from './Chase524Widget'
import AmexWidget from './AmexWidget'
import CitiWidget from './CitiWidget'
import BofAWidget from './BofAWidget'
import CapitalOneWidget from './CapitalOneWidget'
import BankEligibilityWidget from './BankEligibilityWidget'
import CardReeligibilityWidget from './CardReeligibilityWidget'
export default function RulesView() {
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-ink">Rules &amp; Engines</h1>
      <Chase524Widget />
      <AmexWidget />
      <CitiWidget />
      <BofAWidget />
      <CapitalOneWidget />
      <CardReeligibilityWidget />
      <BankEligibilityWidget />

      <div className="bg-surface border border-edge-strong rounded-xl p-5">
        <h3 className="text-base font-semibold text-ink mb-3">Key Churning Rules</h3>
        <div className="space-y-4 text-sm">
          <div className="pb-4 border-b border-edge">
            <div className="font-medium text-ink mb-1">Chase 5/24</div>
            <p className="text-ink-muted text-xs leading-relaxed">
              Chase denies most applications if you&apos;ve opened 5+ personal credit cards across ALL issuers in the past
              24 months. Business cards from non-Chase issuers typically don&apos;t count. Monitor your window carefully.
            </p>
          </div>
          <div className="pb-4 border-b border-edge">
            <div className="font-medium text-ink mb-1">Clawback Windows</div>
            <ul className="text-ink-muted text-xs space-y-1">
              <li><strong className="text-ink-secondary">Chase:</strong> 181 days from account opening</li>
              <li><strong className="text-ink-secondary">Amex:</strong> 12 months (lifetime language on some cards)</li>
              <li><strong className="text-ink-secondary">Citi:</strong> 65-month rule on ThankYou cards</li>
              <li><strong className="text-ink-secondary">Bank accounts:</strong> 90–180 days — check offer terms</li>
            </ul>
          </div>
          <div className="pb-4 border-b border-edge">
            <div className="font-medium text-ink mb-1">AutoPay — Non-Negotiable</div>
            <p className="text-ink-muted text-xs leading-relaxed">
              Set autopay to <strong className="text-ink-secondary">statement balance</strong> (never minimum) on every card.
              One missed payment can cost more than the bonus and trigger penalty APR.
            </p>
          </div>
          <div>
            <div className="font-medium text-ink mb-1">Tax Basis</div>
            <ul className="text-ink-muted text-xs space-y-1">
              <li><strong className="text-ink-secondary">Credit card sign-up bonuses:</strong> Tax-free — IRS treats as purchase rebate. No 1099.</li>
              <li><strong className="text-ink-secondary">Bank account bonuses:</strong> Taxable interest income. Expect 1099-INT if &gt; $10.</li>
              <li><strong className="text-ink-secondary">Referral bonuses:</strong> Generally taxable as ordinary income.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
