# Evidence behind "Light FDE as a service"

Access date for every source: **2026-10-07**. Every figure used on a slide was read on the source page or document itself
(method in the last column). Industry sources are **signals about the market**, not findings about our customers.
Evidence strength labels: *large survey with stated n* (vendor- or consultancy-published, not peer reviewed), *analyst forecast*,
*preliminary report* (not peer reviewed), *investor or practitioner commentary*, *job-posting index*.

## A. The shift from AI adoption to AI outcomes (slides 2 and 3)

| ID | Source | Date | Method | What it shows (verified figure) | What it does not show | Strength |
|---|---|---|---|---|---|---|
| S1 | BCG, [The Widening AI Value Gap](https://www.bcg.com/publications/2025/are-you-generating-value-from-ai-the-widening-gap) ([PDF](https://media-publications.bcg.com/The-Widening-AI-Value-Gap-October-2025.pdf)) | Oct 2025 | Build for the Future 2025 Global Study, n = 1,250 CxOs and senior executives, 25+ sectors | 5% of firms get AI value at scale, 35% are scaling, **60% report hardly any material value** despite substantial investment | Audited financials; our customers | Large survey with stated n (consultancy-published) |
| S2 | IBM Institute for Business Value, [CEO study news release](https://newsroom.ibm.com/2025-05-06-ibm-study-ceos-double-down-on-ai-while-navigating-enterprise-hurdles) | 2025-05-06 | n = 2,000 CEOs, 33 countries, 24 industries, Feb to Apr 2025 | **Only 25% of AI initiatives have delivered expected ROI; only 16% have scaled enterprise wide** | Size of the ROI; per-industry splits | Large survey with stated n (vendor-published) |
| S3 | Gartner press release, [Over 40% of agentic AI projects will be canceled by end of 2027](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-predicts-over-40-percent-of-agentic-ai-projects-will-be-canceled-by-end-of-2027) | 2025-06-25 | Prediction; informed by a Jan 2025 poll of 3,412 webinar attendees (a self-selected sample) | **Over 40% canceled by end of 2027**, citing escalating costs, unclear business value or inadequate risk controls | An observed result: it is a forecast | Analyst forecast |
| S4 | MIT NANDA, *The GenAI Divide: State of AI in Business 2025* ([PDF copy](https://ml4devs.com/pdf/papers/mit-nanda-state-of-ai-in-business-2025-report.pdf)) | Jul 2025 | 300+ public initiatives, interviews with 52 organizations, 153 leaders surveyed at four conferences | Report headline: 95% of organizations getting zero return. Authors' own limits: figures "directionally accurate", selection bias possible | A representative picture of enterprises. The authors call it *Preliminary Findings* and list sample and selection limits; it is not peer reviewed. Treat the 95% as a contested signal | Preliminary report |
| S5 | Stack Overflow, [2025 Developer Survey, AI](https://survey.stackoverflow.co/2025/ai) | 2025-07-29 | 49,000+ responses; trust question n = 33,244 (67.8%) | **84%** use or plan to use AI tools (76% in 2024); **46% distrust** AI output accuracy vs **33% trust** | Business outcomes; it is a self-selected developer community | Large survey with stated n (vendor-published) |

Slide 3 (why engagement must change) is a **hypothesis**, not a sourced finding. S1 to S3 are the context for it.

## B. The forward-deployed engineer (FDE) model and its effectiveness (slides 4 and 15)

| ID | Source | Date | What it shows (verified) | What it does not show | Strength |
|---|---|---|---|---|---|
| S6 | Palantir, [Form S-1/A](https://www.sec.gov/Archives/edgar/data/1321655/000119312520248369/d904406ds1a.htm) (SEC) | 2020-09 | Origin: "Our forward deployed engineers ('FDEs') have travelled to bases in Afghanistan and factories in the industrial Midwest to deploy our platforms." The term appears once, in narrative, with no data | Any effectiveness figure | Vendor-authored regulatory filing |
| S7 | Business Insider, [Forward-deployed engineer jobs are in high demand](https://www.businessinsider.com/forward-deployed-engineer-jobs-in-demand-2026-5), data from Indeed | 2026-05-16 | FDE postings reached **5,230% above Jan 2025 levels by Apr 2026 (roughly 729% year over year)**. The article's correction: these are *indexed values relative to a January 2025 baseline*, not post counts | Absolute volume; effectiveness; whether titles are inflated | Job-posting index |
| S8 | a16z (Joe Schmidt), [Trading Margin for Moat: Why the Forward Deployed Engineer Is the Hottest Job in Startups](https://a16z.com/services-led-growth/) | 2025-06-04 | An investor thesis: services-heavy motions trade lower gross margin for a moat. Cites 22 of 311 open OpenAI roles as FDE or solutions-engineer type. Acknowledges the scalability critique | Outcome data for customers | Investor commentary |
| S9 | SVPG (Marty Cagan), [Forward Deployed Engineers](https://www.svpg.com/forward-deployed-engineers/) | 2025-09-17 (page metadata, per research subagent) | The model "works" only with a platform product organization that generalizes field learnings; otherwise "thousands of large, bespoke solutions" | Any controlled comparison | Practitioner commentary |
| S10 | Gartner, [70% of enterprises will abandon agentic AI built by vendor FDE by 2028](https://www.gartner.com/en/newsroom/press-releases/2026-09-29-gartner-predicts-70-percent-of-enterprises-will-abandon-agentic-ai-built-by-vendor-forward-deployed-engineering-by-2028), as reported by [Channel Dive](https://www.channeldive.com/news/can-forward-deployed-engineers-fdes-fix-ai-gartner/831816/) | 2026-09-29 | Forecast: roughly 70% of vendor-led engagements abandoned by 2028. Analyst quote: "forward deployed" is often a label for implementation or consulting; about 2,000 active FDEs. "If you truly have the right FDE model, we see it bringing good outcomes" | Observed abandonment; Gartner's page blocked automated fetch, so the wording is from Channel Dive's quotes | Analyst forecast |
| S11 | GoodFirms, [Forward Deployed Engineering in 2026: what 133 companies reveal](https://www.goodfirms.co/resources/forward-deployed-engineering-over-it-staff-augmentation) | 2026 | n = 133 AI and software companies: about 70% run a formal or informal FDE function; 78.6% of those measure FDE success by business outcomes | Whether FDEs cause better outcomes. It measures adoption and practice | Vendor-published survey (a directory business) |
| S4 (adjacent) | MIT NANDA, as above | Jul 2025 | In its sample, external partnerships reached deployment about 67% of the time vs about 33% for internal builds ("self-reported outcomes", authors note possible confounding) | It never mentions FDEs; "partnership" includes ordinary vendors and consultancies | Preliminary report |

### Honest conclusion on effectiveness

- **Known:** the model is real and its demand is rising (S6, S7, S11). Investors and product leaders argue it can win
  enterprise deals and discover real problems (S8, S9).
- **Anecdotal or conflicted:** the case that it *works* rests on investor, practitioner and vendor commentary (S6, S8, S9),
  and adoption surveys (S11). The adjacent partner-versus-internal-build gap (S4) is preliminary and does not name FDEs.
- **Skeptical:** Gartner forecasts most vendor-led engagements will be abandoned and notes label inflation (S10). S9 says the
  model needs a platform behind it. S7's index may be inflated by title changes.
- **Not known:** **no controlled, peer-reviewed or otherwise rigorous study of FDE effectiveness was found.** Searches run
  2026-10-07: web searches phrased for arXiv, SSRN and scholarly sources ("forward deployed engineer" effectiveness,
  "embedded engineers customer outcomes", peer-reviewed or controlled evidence). They surfaced
  industry commentary and a few 2026 preprints (SSRN abstracts 6374660 and 7472198, arXiv 2609.29345) that could not be
  read here (SSRN blocked automated fetch; arXiv returned only a title), so none is relied on. A pilot is the way to learn
  whether the idea helps (slide 13).

Bearing's value is therefore a **hypothesis to pilot**. Nothing in this repository measures it.

## C. Platform fact used for the "private Pages workspace" design (slide 11)

| ID | Source | Date | Fact | Strength |
|---|---|---|---|---|
| S12 | GitHub Docs, [Changing the visibility of your GitHub Pages site](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site) | read 2026-10-07 | A privately published site can only be accessed by people with read access to the repository it is published from. Publishing privately needs an organization on GitHub Enterprise Cloud and a private or internal repository. Access control is per project site, so separating customers means separate repositories | Vendor documentation |

## D. Also reviewed, not used on slides

McKinsey *The state of AI in 2025* (Nov 2025; n = 1,993): the live page could not be fetched here, so its figures are not used.
Deloitte *State of Generative AI in the Enterprise* (Jan 2025; data from 2024), Bain *AI Moves From Pilots to Production* (2025),
Forrester *Predictions 2026*, DORA *State of AI-assisted Software Development 2025* (n of about 5,000), The Pragmatic Engineer
(2026) and LeadDev (2026) on FDE role and title inflation, and Ted Mabrey (Palantir) arguing other companies' FDE programs are
"half measures". These were read by a research subagent and are consistent with the signals above; they are not cited.

## Method notes

- Primary pages were read directly where possible. Where a site blocked automated fetches (Gartner, SSRN, McKinsey), the table says
  how the wording was obtained, or the source is left out.
- No number on a slide is an estimate or a customer result. The deck makes no claim of measured time savings, ROI, telemetry or
  customer validation.
