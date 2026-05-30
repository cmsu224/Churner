import { ExternalLink } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Best Current Offers',
    items: [
      {
        label: 'Best Credit Card Sign-Up Bonuses',
        url: 'https://www.doctorofcredit.com/best-credit-card-sign-up-bonuses/',
        source: 'Doctor of Credit',
        desc: 'Live-ranked list of the best CC sign-up bonuses. Updated daily by the community.',
      },
      {
        label: 'Best Bank Account Bonuses',
        url: 'https://www.doctorofcredit.com/best-bank-account-bonuses/',
        source: 'Doctor of Credit',
        desc: 'Best checking and savings account bonuses with DD requirements, state availability, and hard pull notes.',
      },
      {
        label: 'Best Business Card Offers',
        url: 'https://www.doctorofcredit.com/best-business-credit-card-sign-up-bonuses/',
        source: 'Doctor of Credit',
        desc: 'Business card SUBs — these don\'t count toward Chase 5/24. Great for high earners.',
      },
    ],
  },
  {
    title: 'Issuer-Specific Rules',
    items: [
      {
        label: 'Chase Application Rules (5/24, 2/30, 1/30…)',
        url: 'https://www.doctorofcredit.com/knowledge-base/list-of-chases-application-rules/',
        source: 'Doctor of Credit',
        desc: '5/24, one-Sapphire rule, 2 cards per 30 days, 5 cards per 24 months — all Chase rules in one place.',
      },
      {
        label: 'Amex Application Rules (5/day, 90-day, Lifetime)',
        url: 'https://www.doctorofcredit.com/knowledge-base/amex-credit-card-application-rules/',
        source: 'Doctor of Credit',
        desc: '1 card per 5 days, 2 per 90 days, and the lifetime language popup that blocks repeat bonuses.',
      },
      {
        label: 'Citi Application Rules (1/8, 2/65)',
        url: 'https://www.doctorofcredit.com/knowledge-base/citi-credit-card-application-rules/',
        source: 'Doctor of Credit',
        desc: '1 card per 8 days, 2 per 65 days. Also 24-month bonus cooling period on ThankYou cards.',
      },
      {
        label: 'Bank of America 2/3/4 Rule',
        url: 'https://www.doctorofcredit.com/knowledge-base/bank-of-america-credit-card-application-rules/',
        source: 'Doctor of Credit',
        desc: 'Max 2 BofA cards in 2 months, 3 in 12 months, 4 in 24 months. Preferred Rewards status affects approvals.',
      },
      {
        label: 'Capital One Application Rules',
        url: 'https://www.doctorofcredit.com/knowledge-base/capital-one-credit-card-application-rules/',
        source: 'Doctor of Credit',
        desc: '1 personal card per 6 months. Capital One pulls all 3 credit bureaus on every application.',
      },
      {
        label: 'Barclays Application Rules',
        url: 'https://www.doctorofcredit.com/knowledge-base/barclays-credit-card-application-rules/',
        source: 'Doctor of Credit',
        desc: 'Known for denying churners. They review your history carefully — recent cards are a red flag.',
      },
    ],
  },
  {
    title: 'Strategies & Guides',
    items: [
      {
        label: 'Churning Flowchart (Which Card Next?)',
        url: 'https://www.reddit.com/r/churning/wiki/flowchart/',
        source: 'r/churning',
        desc: 'The community-maintained flowchart for deciding which card to apply for next based on your profile.',
      },
      {
        label: 'r/churning Wiki & Guides',
        url: 'https://www.reddit.com/r/churning/wiki/index/',
        source: 'r/churning',
        desc: 'Comprehensive guides: beginners, referrals, bank bonuses, manufactured spending, and more.',
      },
      {
        label: 'Best Transfer Partners & Point Valuations',
        url: 'https://thepointsguy.com/guide/monthly-valuations/',
        source: 'The Points Guy',
        desc: 'Monthly updated point/mile valuations. Use this to compare "60,000 points" vs "$600 cash back."',
      },
      {
        label: 'Annual Fee Cancel-for-Refund Guide',
        url: 'https://www.doctorofcredit.com/knowledge-base/credit-card-annual-fee-refund-policies/',
        source: 'Doctor of Credit',
        desc: 'Every issuer\'s refund policy. Most give 30 days after the fee posts. Some pro-rate. Know before you cancel.',
      },
    ],
  },
  {
    title: 'Credit Monitoring',
    items: [
      {
        label: 'Free Weekly Credit Reports (All 3 Bureaus)',
        url: 'https://www.annualcreditreport.com/',
        source: 'AnnualCreditReport.com',
        desc: 'The only federally-mandated free credit report site. Check weekly — it\'s free and doesn\'t hurt your score.',
      },
      {
        label: 'Credit Karma (Equifax + TransUnion)',
        url: 'https://www.creditkarma.com/',
        source: 'Credit Karma',
        desc: 'Free real-time Equifax and TransUnion scores. Useful for monitoring inquiries after applications.',
      },
    ],
  },
  {
    title: 'Tools',
    items: [
      {
        label: 'Award Wallet — Track All Point Balances',
        url: 'https://awardwallet.com/',
        source: 'AwardWallet',
        desc: 'Aggregates balances across all your reward programs. See everything in one dashboard.',
      },
      {
        label: 'MaxRewards — Card Optimization',
        url: 'https://maxrewards.com/',
        source: 'MaxRewards',
        desc: 'Tells you which card in your wallet to use for each purchase category to maximize rewards.',
      },
      {
        label: 'Doctor of Credit — Targeted Offers Checker',
        url: 'https://www.doctorofcredit.com/targeted-credit-card-offers/',
        source: 'Doctor of Credit',
        desc: 'Find out if you\'re eligible for targeted (higher) sign-up bonuses by checking offer codes.',
      },
    ],
  },
  {
    title: 'Community',
    items: [
      {
        label: 'r/churning — Main Community',
        url: 'https://www.reddit.com/r/churning/',
        source: 'Reddit',
        desc: 'Daily discussion threads, data points on approvals/denials, and the best community for churning questions.',
      },
      {
        label: 'r/CreditCards',
        url: 'https://www.reddit.com/r/CreditCards/',
        source: 'Reddit',
        desc: 'More beginner-friendly credit card community. Good for general questions and card comparisons.',
      },
      {
        label: 'Frequent Miler Blog',
        url: 'https://frequentmiler.com/',
        source: 'FrequentMiler',
        desc: 'In-depth analysis of transfer bonuses, point values, and complex travel redemptions.',
      },
    ],
  },
]

const QUICK_TIPS = [
  'Always set AutoPay to "Statement Balance" — never minimum. One missed payment can void a $1,000 bonus.',
  'Bank bonuses are taxable (1099-INT). Credit card sign-up bonuses are NOT (IRS rebate treatment).',
  'Capital One pulls all 3 credit bureaus. Apply for Capital One before Chase to avoid hitting Chase 5/24 early.',
  'Let the annual fee post, then call to cancel within 30 days for a full refund — uses the card\'s benefits first.',
  'Chase Sapphire: you can only hold one Sapphire card at a time, and the 48-month rule applies across the family.',
  'Business cards from most issuers (except Chase) don\'t appear on personal credit reports and don\'t count toward 5/24.',
  '"Authorized user" cards from others DO count toward your Chase 5/24 — remove yourself if needed before applying.',
  'For seniors on Social Security: use "Total Accessible Income" on applications — includes investment accounts.',
]

export default function ResourcesView() {
  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Resources</h1>
        <p className="text-sm text-zinc-400">Everything you need — no Googling required.</p>
      </div>

      {/* Quick Tips */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3">Quick Rules to Never Forget</h2>
        <div className="space-y-2">
          {QUICK_TIPS.map((tip, i) => (
            <div key={i} className="flex gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
              <span className="text-blue-400 font-bold text-sm flex-shrink-0">{i + 1}.</span>
              <p className="text-sm text-zinc-300 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Link sections */}
      {SECTIONS.map(section => (
        <section key={section.title}>
          <h2 className="text-base font-semibold text-white mb-3">{section.title}</h2>
          <div className="space-y-2">
            {section.items.map(item => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">{item.label}</span>
                    <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{item.source}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                </div>
                <ExternalLink size={14} className="text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 mt-1 transition-colors" />
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
